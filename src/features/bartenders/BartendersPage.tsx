import { useDeferredValue, useMemo, useState } from 'react'
import { dayKey } from '../../lib/dates'
import { fullName, pl, sv } from '../../lib/utils'
import { Avatar, EmptyState, Icon, PageHeader, Segmented } from '../../components/ui'
import { useData } from '../data/DataContext'

type Sort = 'name' | 'shifts' | 'apps'

const SORTS = [
  { id: 'name' as const, label: 'Nazwisko' },
  { id: 'shifts' as const, label: 'Zmiany' },
  { id: 'apps' as const, label: 'Zgłoszenia' },
]

export default function BartendersPage() {
  const { bartenders, schedules, availability } = useData()
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<Sort>('name')
  const query = useDeferredValue(q.trim().toLowerCase())

  // Смены считаются по опубликованному расписанию
  const stats = useMemo(() => {
    const m = new Map<string, { total: number; fri: number; sat: number; apps: number }>()
    bartenders.forEach((b) => m.set(b.uid, { total: 0, fri: 0, sat: 0, apps: 0 }))
    for (const s of Object.values(schedules)) {
      if (s.status !== 'published') continue
      const k = dayKey(s.date)
      for (const bar of s.bars)
        for (const p of bar.staff) {
          const x = m.get(p.uid)
          if (!x) continue
          x.total++
          if (k === '5') x.fri++
          if (k === '6') x.sat++
        }
    }
    for (const a of availability) {
      const x = m.get(a.uid)
      if (x) x.apps++
    }
    return m
  }, [bartenders, schedules, availability])

  const rows = useMemo(() => {
    const list = bartenders
      .filter((b) => `${fullName(b)} ${b.email}`.toLowerCase().includes(query))
      .map((b) => ({ b, s: stats.get(b.uid)! }))
    if (sort === 'shifts') list.sort((a, b) => b.s.total - a.s.total)
    if (sort === 'apps') list.sort((a, b) => b.s.apps - a.s.apps)
    return list
  }, [bartenders, stats, query, sort])

  const max = Math.max(1, ...rows.map((r) => r.s.total))
  const totalShifts = [...stats.values()].reduce((n, s) => n + s.total, 0)

  return (
    <>
      <PageHeader
        eyebrow="Zespół"
        title="Barmani"
        sub={`${pl(bartenders.length, ['osoba', 'osoby', 'osób'])} · ${pl(totalShifts, ['opublikowana zmiana', 'opublikowane zmiany', 'opublikowanych zmian'])}`}
      />

      <div className="toolbar glass enter" style={sv({ '--d': '80ms' })}>
        <label className="field search">
          <Icon name="search" />
          <input className="input" placeholder="Szukaj po imieniu lub emailu" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <Segmented items={SORTS} value={sort} onChange={setSort} />
      </div>

      <section className="glass card enter table-card" style={sv({ '--d': '140ms' })}>
        {rows.length === 0 ? (
          <EmptyState icon="users">{bartenders.length ? 'Nikogo nie znaleziono.' : 'Brak zarejestrowanych barmanów.'}</EmptyState>
        ) : (
          <>
            <div className="t-head">
              <span>Barman</span>
              <span>Obciążenie</span>
              <span>Zmiany</span>
              <span>Pt</span>
              <span>Sb</span>
              <span>Zgłoszenia</span>
            </div>
            {rows.map(({ b, s }, i) => (
              <div className="t-row" key={b.uid} style={sv({ '--i': Math.min(i, 12) })}>
                <div className="t-person">
                  <Avatar name={fullName(b)} size={36} />
                  <div className="t-name"><b>{fullName(b)}</b><small>{b.email}</small></div>
                </div>
                <div className="bar"><i style={{ width: (s.total / max) * 100 + '%' }} /></div>
                <Cell label="Zmiany" value={s.total} strong />
                <Cell label="Pt" value={s.fri} />
                <Cell label="Sb" value={s.sat} />
                <Cell label="Zgłoszenia" value={s.apps} />
              </div>
            ))}
          </>
        )}
      </section>
    </>
  )
}

function Cell({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className={strong ? 't-cell strong' : 't-cell'}>
      <b>{value}</b>
      <small>{label}</small>
    </div>
  )
}
