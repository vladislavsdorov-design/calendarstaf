import { useMemo, useState, type FormEvent } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { formatLong, todayISO } from '../../lib/dates'
import { Link, navigate } from '../../lib/router'
import { cx, firstWord, pl, sv } from '../../lib/utils'
import { useAuth } from '../auth/AuthContext'
import { barOf, getRequirement, isAssigned, useData } from '../data/DataContext'
import DayRow from '../../components/DayRow'
import { EmptyState, Icon, Kpi, PageHeader, Spinner, useAction, type IconName } from '../../components/ui'

const greet = () => {
  const h = new Date().getHours()
  return h >= 5 && h < 18 ? 'Dzień dobry' : 'Dobry wieczór'
}

function QuickLink({ to, icon, title, text, i }: { to: string; icon: IconName; title: string; text: string; i: number }) {
  return (
    <Link to={to} className="glass card quick enter" style={sv({ '--d': 200 + i * 60 + 'ms' })}>
      <span className="quick-ico"><Icon name={icon} size={20} /></span>
      <span className="quick-body"><b>{title}</b><small>{text}</small></span>
      <Icon name="arrowR" className="quick-arrow" />
    </Link>
  )
}

function ProfileCard() {
  const { profile, user } = useAuth()
  const [first, setFirst] = useState(profile?.firstName ?? '')
  const [last, setLast] = useState(profile?.lastName ?? '')
  const { busy, run } = useAction()
  const dirty = first.trim() !== (profile?.firstName ?? '') || last.trim() !== (profile?.lastName ?? '')

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user || !first.trim() || !last.trim()) return
    run(
      () => updateDoc(doc(db, 'users', user.uid), { firstName: first.trim(), lastName: last.trim() }),
      'Profil zapisany',
    )
  }

  return (
    <form onSubmit={onSubmit} className="glass card enter" style={sv({ '--d': '320ms' })}>
      <div className="card-head"><h3>Mój profil</h3><span className="muted">{profile?.email}</span></div>
      <div className="field-row">
        <input className="input" placeholder="Imię" maxLength={50} required value={first} onChange={(e) => setFirst(e.target.value)} />
        <input className="input" placeholder="Nazwisko" maxLength={50} required value={last} onChange={(e) => setLast(e.target.value)} />
      </div>
      <div className="row mt">
        <span className="muted small">Imię i nazwisko widzi menedżer w grafiku.</span>
        <button className="btn primary" disabled={busy || !dirty}>
          {busy ? <Spinner /> : <Icon name="save" />}Zapisz
        </button>
      </div>
    </form>
  )
}

function ManagerDashboard() {
  const { dates, schedules, settings, bartenders, byDate } = useData()
  const today = todayISO()

  const s = useMemo(() => {
    const all = Object.values(schedules)
    const openUpcoming = Object.values(dates).filter((d) => d.open && d.date >= today)
    const lacking = all.filter((x) => x.date >= today && x.missing > 0).sort((a, b) => a.date.localeCompare(b.date))
    const upcoming = [...new Set([...openUpcoming.map((d) => d.date), ...all.filter((x) => x.date >= today).map((x) => x.date)])]
      .sort()
      .slice(0, 6)
    return {
      openUpcoming: openUpcoming.length,
      drafts: all.filter((x) => x.status === 'draft').length,
      lacking,
      upcoming,
    }
  }, [schedules, dates, today])

  return (
    <>
      <div className="kpis">
        <Kpi i={0} label="Barmani" value={bartenders.length} icon="users" />
        <Kpi i={1} label="Otwarte daty" value={s.openUpcoming} icon="unlock" />
        <Kpi i={2} label="Szkice" value={s.drafts} icon="layers" />
        <Kpi i={3} label="Dni z brakami" value={s.lacking.length} icon="alert" warn />
      </div>

      {s.lacking.length > 0 && (
        <div className="alert enter" style={sv({ '--d': '160ms' })}>
          <Icon name="alert" size={18} />
          <div>
            <b>Brakuje ludzi w {pl(s.lacking.length, ['dniu', 'dniach', 'dniach'])}</b>
            <small>{s.lacking.slice(0, 3).map((x) => formatLong(x.date)).join(' · ')}{s.lacking.length > 3 ? ' …' : ''}</small>
          </div>
          <Link to="/schedule" className="btn sm">Grafik</Link>
        </div>
      )}

      <div className="quick-grid">
        <QuickLink i={0} to="/calendar" icon="calendar" title="Kalendarz" text="Otwieraj daty i przeglądaj zgłoszenia" />
        <QuickLink i={1} to="/schedule" icon="sparkles" title="Grafik" text="Wygeneruj, popraw i opublikuj" />
      </div>

      <div className="two-col">
        <section className="glass card enter" style={sv({ '--d': '260ms' })}>
          <div className="card-head"><h3>Najbliższe dni</h3><span className="count">{s.upcoming.length}</span></div>
          {s.upcoming.length === 0 ? (
            <EmptyState>Brak otwartych dat. Otwórz je w kalendarzu.</EmptyState>
          ) : (
            <div className="list">
              {s.upcoming.map((d, i) => {
                const req = getRequirement(settings, d)
                const sch = schedules[d]
                const apps = byDate[d]?.length ?? 0
                return (
                  <DayRow
                    key={d}
                    i={i}
                    date={d}
                    onClick={() => navigate('/calendar')}
                    sub={`Zgłoszenia: ${apps} / ${req.total}`}
                    right={
                      sch ? (
                        <span className={cx('tag', sch.status)}>{sch.status === 'published' ? 'Opublikowany' : 'Szkic'}</span>
                      ) : (
                        <span className="tag">{dates[d]?.open ? 'Otwarte' : 'Zamknięte'}</span>
                      )
                    }
                  />
                )
              })}
            </div>
          )}
        </section>
        <ProfileCard />
      </div>
    </>
  )
}

function BartenderDashboard() {
  const { user } = useAuth()
  const { dates, schedules, mine } = useData()
  const today = todayISO()
  const month = today.slice(0, 7)

  const s = useMemo(() => {
    const myShifts = Object.values(schedules)
      .filter((x) => x.status === 'published' && isAssigned(x, user?.uid))
      .sort((a, b) => a.date.localeCompare(b.date))
    const upcoming = myShifts.filter((x) => x.date >= today)
    const openUpcoming = Object.values(dates).filter((d) => d.open && d.date >= today)
    return {
      upcoming,
      monthCount: myShifts.filter((x) => x.date.startsWith(month)).length,
      toApply: openUpcoming.filter((d) => !mine.has(d.date)).length,
      applied: openUpcoming.filter((d) => mine.has(d.date)).length,
    }
  }, [schedules, dates, mine, user, today, month])

  return (
    <>
      <div className="kpis three">
        <Kpi i={0} label="Najbliższe zmiany" value={s.upcoming.length} icon="martini" />
        <Kpi i={1} label="W tym miesiącu" value={s.monthCount} icon="calendar" />
        <Kpi i={2} label="Daty bez zgłoszenia" value={s.toApply} icon="hand" warn />
      </div>

      {s.toApply > 0 && (
        <div className="cta enter" style={sv({ '--d': '160ms' })}>
          <div>
            <b>Masz {pl(s.toApply, ['otwartą datę', 'otwarte daty', 'otwartych dat'])} bez zgłoszenia</b>
            <small>Zaznacz dni, w które możesz pracować — menedżer ułoży grafik.</small>
          </div>
          <Link to="/calendar" className="btn primary"><Icon name="hand" />Zgłoś dostępność</Link>
        </div>
      )}

      <div className="two-col">
        <section className="glass card enter" style={sv({ '--d': '240ms' })}>
          <div className="card-head"><h3>Twoje najbliższe zmiany</h3><span className="count">{s.upcoming.length}</span></div>
          {s.upcoming.length === 0 ? (
            <EmptyState icon="martini">Brak opublikowanych zmian.</EmptyState>
          ) : (
            <div className="list">
              {s.upcoming.slice(0, 6).map((x, i) => {
                const bar = barOf(x, user?.uid)
                const mates = x.bars
                  .find((b) => b.bar === bar)
                  ?.staff.filter((p) => p.uid !== user?.uid)
                  .map((p) => firstWord(p.name))
                return (
                  <DayRow
                    key={x.date}
                    i={i}
                    hot={i === 0}
                    date={x.date}
                    onClick={() => navigate('/schedule')}
                    sub={mates?.length ? `z: ${mates.join(', ')}` : x.date === today ? 'Dziś!' : 'Zmiana potwierdzona'}
                    right={<span className="tag published">Bar {bar}</span>}
                  />
                )
              })}
            </div>
          )}
        </section>
        <ProfileCard />
      </div>
    </>
  )
}

export default function DashboardPage() {
  const { profile, isManager } = useAuth()
  const { schedules, dates } = useData()
  const today = todayISO()

  const sub = useMemo(() => {
    if (isManager) {
      const n = Object.values(dates).filter((d) => d.open && d.date >= today).length
      return n ? `Otwarte zgłoszenia na ${pl(n, ['dzień', 'dni', 'dni'])}` : 'Przegląd klubu'
    }
    const next = Object.values(schedules)
      .filter((x) => x.status === 'published' && x.date >= today && isAssigned(x, profile?.uid))
      .sort((a, b) => a.date.localeCompare(b.date))[0]
    return next ? `Następna zmiana: ${formatLong(next.date)}` : 'Twoje zgłoszenia i zmiany'
  }, [isManager, dates, schedules, today, profile])

  return (
    <>
      <PageHeader
        eyebrow={formatLong(today)}
        title={`${greet()}, ${profile?.firstName ?? ''}`}
        sub={<><i className="dot" />{sub}</>}
      />
      {isManager ? <ManagerDashboard /> : <BartenderDashboard />}
    </>
  )
}
