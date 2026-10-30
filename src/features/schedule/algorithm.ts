import { dayKey } from '../../lib/dates'
import type { ClubSettings, ScheduleDay, StaffRef } from '../../types'

export interface GenerateInput {
  /** Даты, для которых нужно построить черновик */
  dates: string[]
  /** Заявки: дата -> список uid */
  availability: Record<string, string[]>
  bartenders: StaffRef[]
  /** Настройки клуба из Firebase (ничего не зашито в алгоритм) */
  settings: ClubSettings
  /** Уже опубликованные смены — учитываются как текущая нагрузка */
  baseline: ScheduleDay[]
}

interface Load {
  total: number
  fri: number
  sat: number
}

/**
 * Равномерное распределение:
 * 1. Даты обрабатываются от самых «трудных» (мало заявок относительно нужды) к лёгким.
 * 2. Кандидаты на дату — те, кто подал заявку.
 * 3. Сортировка: меньше всего смен → (пт/сб) меньше пятниц+суббот →
 *    меньше смен именно этого дня → по имени (для стабильности).
 * 4. Берём нужное число и раскладываем по барам по кругу.
 * 5. Один бармен — одно место в день.
 */
export function generateSchedule(input: GenerateInput): ScheduleDay[] {
  const { dates, availability, bartenders, settings, baseline } = input
  const known = new Map(bartenders.map((b) => [b.uid, b]))
  const load = new Map<string, Load>(bartenders.map((b) => [b.uid, { total: 0, fri: 0, sat: 0 }]))

  const count = (uid: string, k: string) => {
    const l = load.get(uid)
    if (!l) return
    l.total++
    if (k === '5') l.fri++
    if (k === '6') l.sat++
  }

  for (const day of baseline) {
    const k = dayKey(day.date)
    for (const bar of day.bars) for (const s of bar.staff) count(s.uid, k)
  }

  const plan = dates
    .map((date) => {
      const k = dayKey(date)
      const cfg = settings.days[k]
      const bars = cfg?.bars ?? 0
      const perBar = cfg?.bartendersPerBar ?? 0
      const avail = [...new Set(availability[date] ?? [])].filter((uid) => known.has(uid))
      return { date, k, bars, total: bars * perBar, avail }
    })
    .filter((d) => d.total > 0)
    .sort((a, b) => a.avail.length - a.total - (b.avail.length - b.total) || a.date.localeCompare(b.date))

  const result: ScheduleDay[] = []

  for (const day of plan) {
    const { k } = day
    const weekend = k === '5' || k === '6'

    const candidates = [...day.avail].sort((a, b) => {
      const la = load.get(a)!
      const lb = load.get(b)!
      if (la.total !== lb.total) return la.total - lb.total
      if (weekend) {
        const wa = la.fri + la.sat
        const wb = lb.fri + lb.sat
        if (wa !== wb) return wa - wb
        const sa = k === '5' ? la.fri : la.sat
        const sb = k === '5' ? lb.fri : lb.sat
        if (sa !== sb) return sa - sb
      }
      return known.get(a)!.name.localeCompare(known.get(b)!.name, 'pl')
    })

    const chosen = candidates.slice(0, day.total)
    const bars = Array.from({ length: day.bars }, (_, i) => ({ bar: i + 1, staff: [] as StaffRef[] }))
    chosen.forEach((uid, j) => {
      bars[j % day.bars].staff.push(known.get(uid)!)
      count(uid, k)
    })

    result.push({ date: day.date, status: 'draft', bars, missing: day.total - chosen.length })
  }

  return result.sort((a, b) => a.date.localeCompare(b.date))
}
