import { useCallback, useMemo, useState } from 'react'
import { doc, setDoc, updateDoc, writeBatch } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { dayKey, formatLong, monthDays, todayISO } from '../../lib/dates'
import { fullName, pl, sv } from '../../lib/utils'
import MonthNav, { currentYM, type YM } from '../../components/MonthNav'
import { Avatar, EmptyState, Icon, PageHeader, Spinner, useAction, useUI } from '../../components/ui'
import { getRequirement, useData } from '../data/DataContext'
import type { BarAssignment, ScheduleDay } from '../../types'
import { generateSchedule } from './algorithm'
import DayCard from './DayCard'

export default function ManagerSchedule() {
  const { dates, schedules, settings, bartenders, byDate, names } = useData()
  const { busy, run } = useAction()
  const { notify, confirm } = useUI()
  const [ym, setYm] = useState<YM>(currentYM)
  const today = todayISO()

  const days = useMemo(() => monthDays(ym.y, ym.m), [ym])
  const visibleDays = useMemo(() => days.filter((d) => dates[d] || schedules[d]), [days, dates, schedules])
  const monthSchedules = useMemo(
    () => days.map((d) => schedules[d]).filter((s): s is ScheduleDay => !!s),
    [days, schedules],
  )
  const drafts = monthSchedules.filter((s) => s.status === 'draft')
  const published = monthSchedules.filter((s) => s.status === 'published')
  const warnings = monthSchedules.filter((s) => s.missing > 0)

  // Нагрузка за месяц (черновики + опубликованное)
  const load = useMemo(() => {
    const m = new Map<string, { total: number; fri: number; sat: number }>()
    bartenders.forEach((b) => m.set(b.uid, { total: 0, fri: 0, sat: 0 }))
    for (const s of monthSchedules) {
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
    const rows = bartenders.map((b) => ({ b, ...m.get(b.uid)! })).sort((a, b) => b.total - a.total)
    return { rows, max: Math.max(1, ...rows.map((r) => r.total)) }
  }, [bartenders, monthSchedules])

  /** Строит черновики. Опубликованные дни не трогает никогда. */
  async function generate() {
    const targets = days.filter((d) => dates[d] && d >= today && schedules[d]?.status !== 'published')
    if (targets.length === 0) {
      notify('Brak dat do ułożenia: otwórz przyszłe daty w kalendarzu.', 'info')
      return
    }
    const replacing = targets.filter((d) => schedules[d]?.status === 'draft').length
    if (
      replacing > 0 &&
      !(await confirm({
        title: 'Zastąpić szkice?',
        text: `Istniejące szkice (${replacing}) zostaną ułożone od nowa. Opublikowane dni pozostaną bez zmian.`,
        ok: 'Wygeneruj',
      }))
    )
      return

    run(async () => {
      const baseline = Object.values(schedules).filter((s) => s.status === 'published')
      const result = generateSchedule({
        dates: targets,
        availability: byDate,
        bartenders: bartenders.map((b) => ({ uid: b.uid, name: fullName(b) })),
        settings,
        baseline,
      })
      const batch = writeBatch(db)
      result.forEach((day) => batch.set(doc(db, 'schedules', day.date), day))
      // Даты, на которые по настройкам персонал не нужен, но остался старый черновик
      targets
        .filter((d) => !result.some((r) => r.date === d) && schedules[d]?.status === 'draft')
        .forEach((d) => batch.delete(doc(db, 'schedules', d)))
      await batch.commit()
      const lacking = result.filter((r) => r.missing > 0).length
      notify(
        `Szkic gotowy: ${pl(result.length, ['dzień', 'dni', 'dni'])}` + (lacking ? ` · z brakami: ${lacking}` : ''),
        lacking ? 'info' : 'ok',
      )
    })
  }

  const saveDay = useCallback(
    (date: string, bars: BarAssignment[]) =>
      run(async () => {
        const total = getRequirement(settings, date).total
        const filled = bars.reduce((n, b) => n + b.staff.length, 0)
        await setDoc(doc(db, 'schedules', date), {
          date,
          status: 'draft',
          bars,
          missing: Math.max(0, total - filled),
        })
      }),
    [run, settings],
  )

  const setStatus = useCallback(
    (date: string, status: 'draft' | 'published') =>
      run(
        () => updateDoc(doc(db, 'schedules', date), { status }),
        status === 'published' ? 'Dzień opublikowany' : 'Publikacja cofnięta',
      ),
    [run],
  )

  async function publishAll() {
    if (drafts.length === 0) return
    const lacking = drafts.filter((d) => d.missing > 0).length
    const ok = await confirm({
      title: `Opublikować ${pl(drafts.length, ['szkic', 'szkice', 'szkiców'])}?`,
      text:
        (lacking > 0 ? `W ${pl(lacking, ['dniu', 'dniach', 'dniach'])} zostały wolne miejsca. ` : '') +
        'Barmani od razu zobaczą te zmiany.',
      ok: 'Opublikuj',
    })
    if (!ok) return
    run(async () => {
      const batch = writeBatch(db)
      drafts.forEach((d) => batch.update(doc(db, 'schedules', d.date), { status: 'published' }))
      await batch.commit()
    }, 'Grafik opublikowany')
  }

  return (
    <>
      <PageHeader
        eyebrow="Grafik zmian"
        title="Układanie grafiku"
        sub={`Szkice: ${drafts.length} · opublikowane: ${published.length} · z brakami: ${warnings.length}`}
        actions={
          <>
            <button className="btn primary lg" onClick={generate} disabled={busy}>
              {busy ? <Spinner /> : <Icon name="sparkles" />}Wygeneruj szkic
            </button>
            <button className="btn ghost lg" onClick={publishAll} disabled={busy || drafts.length === 0}>
              <Icon name="send" />Opublikuj szkice ({drafts.length})
            </button>
          </>
        }
      />

      <div className="toolbar glass enter" style={sv({ '--d': '80ms' })}>
        <MonthNav value={ym} onChange={setYm} />
        <div className="toolbar-stats">
          <span><i className="lg-sq open" />{visibleDays.length} dni</span>
          <span><i className="lg-sq draft" />{drafts.length} szkiców</span>
          <span><i className="lg-sq" />{published.length} opubl.</span>
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="alert enter" style={sv({ '--d': '120ms' })}>
          <Icon name="alert" size={18} />
          <div>
            <b>Brakuje pracowników</b>
            <small>
              {warnings.map((s) => `${formatLong(s.date)} (−${s.missing})`).join(' · ')}
            </small>
          </div>
        </div>
      )}

      {visibleDays.length === 0 ? (
        <div className="glass card enter">
          <EmptyState icon="calendar">W tym miesiącu nie ma otwartych dat. Otwórz je w zakładce „Kalendarz”.</EmptyState>
        </div>
      ) : (
        <div className="day-grid" key={ym.y + '-' + ym.m}>
          {visibleDays.map((d, i) => (
            <DayCard
              key={d}
              i={i}
              date={d}
              schedule={schedules[d]}
              req={getRequirement(settings, d)}
              applicants={byDate[d] ?? EMPTY}
              bartenders={bartenders}
              names={names}
              open={dates[d]?.open === true}
              busy={busy}
              onSave={saveDay}
              onStatus={setStatus}
            />
          ))}
        </div>
      )}

      {bartenders.length > 0 && monthSchedules.length > 0 && (
        <section className="glass card enter load-card">
          <div className="card-head">
            <h3>Obciążenie w miesiącu</h3>
            <span className="muted small">szkice + opublikowane</span>
          </div>
          {load.rows.map((r, i) => (
            <div className="bar-row" key={r.b.uid} style={sv({ '--i': i })}>
              <Avatar name={fullName(r.b)} size={30} />
              <span className="name">{fullName(r.b)}</span>
              <div className="bar"><i style={{ width: (r.total / load.max) * 100 + '%' }} /></div>
              <span className="mini-stats"><b>{r.total}</b><small>pt {r.fri} · sb {r.sat}</small></span>
            </div>
          ))}
        </section>
      )}
    </>
  )
}

const EMPTY: string[] = []
