import { useMemo, useState } from 'react'
import { deleteDoc, doc, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { WEEKDAYS_SHORT, dayNum, formatLong, monthDays, monthGrid, monthKey, todayISO } from '../../lib/dates'
import { Link } from '../../lib/router'
import { cx, pl, plural, sv } from '../../lib/utils'
import MonthNav, { currentYM, type YM } from '../../components/MonthNav'
import { Avatar, EmptyState, Icon, PageHeader, Spinner, useAction, useUI } from '../../components/ui'
import { useAuth } from '../auth/AuthContext'
import { barOf, getRequirement, isAssigned, useData } from '../data/DataContext'

export default function CalendarPage() {
  const { user, isManager } = useAuth()
  const { dates, schedules, settings, byDate, names, mine } = useData()
  const { busy, run } = useAction()
  const { notify, confirm } = useUI()
  const today = todayISO()

  const [ym, setYm] = useState<YM>(currentYM)
  const [dir, setDir] = useState(0)
  const [selected, setSelected] = useState(today)
  const [pending, setPending] = useState<Set<string>>(() => new Set())

  const key = monthKey(ym.y, ym.m)
  const grid = useMemo(() => monthGrid(ym.y, ym.m), [ym])
  const days = useMemo(() => monthDays(ym.y, ym.m), [ym])

  const changeMonth = (v: YM) => {
    setDir(monthKey(v.y, v.m) > key ? 1 : -1)
    setYm(v)
  }

  // Сводка по месяцу
  const stats = useMemo(() => {
    let open = 0, applied = 0, lacking = 0, shifts = 0
    const openFuture: string[] = []
    for (const d of days) {
      const isOpen = dates[d]?.open === true
      if (isOpen) open++
      if (isOpen && d >= today) {
        openFuture.push(d)
        if (mine.has(d)) applied++
        if ((byDate[d]?.length ?? 0) < getRequirement(settings, d).total) lacking++
      }
      if (schedules[d]?.status === 'published' && isAssigned(schedules[d], user?.uid)) shifts++
    }
    return { open, applied, lacking, shifts, openFuture }
  }, [days, dates, mine, byDate, settings, schedules, user, today])

  /* ───── Действия менеджера ───── */
  const openMonth = () =>
    run(async () => {
      const list = days.filter((d) => d >= today && getRequirement(settings, d).total > 0 && !dates[d]?.open)
      if (!list.length) return notify('Wszystkie daty tego miesiąca są już otwarte', 'info')
      const batch = writeBatch(db)
      list.forEach((d) => batch.set(doc(db, 'dates', d), { date: d, open: true }))
      await batch.commit()
      notify(`Otwarto ${pl(list.length, ['datę', 'daty', 'dat'])}`)
    })

  const closeMonth = async () => {
    const list = days.filter((d) => dates[d]?.open)
    if (!list.length) return notify('Brak otwartych dat w tym miesiącu', 'info')
    const ok = await confirm({
      title: 'Zamknąć zgłoszenia?',
      text: `Barmani nie będą mogli zgłaszać się ani wycofywać zgłoszeń na ${pl(list.length, ['datę', 'daty', 'dat'])} w tym miesiącu.`,
      ok: 'Zamknij',
      danger: true,
    })
    if (!ok) return
    run(async () => {
      const batch = writeBatch(db)
      list.forEach((d) => batch.set(doc(db, 'dates', d), { date: d, open: false }))
      await batch.commit()
    }, 'Zgłoszenia zamknięte')
  }

  const setOpen = (iso: string, open: boolean) =>
    run(() => setDoc(doc(db, 'dates', iso), { date: iso, open }), open ? 'Data otwarta dla zgłoszeń' : 'Zgłoszenia zamknięte')

  /* ───── Действия бармена ───── */
  const mark = (iso: string, on: boolean) =>
    setPending((p) => {
      const n = new Set(p)
      if (on) n.add(iso)
      else n.delete(iso)
      return n
    })

  async function toggleMine(iso: string) {
    if (!user || pending.has(iso)) return
    if (iso < today || !dates[iso]?.open) return notify('Zgłoszenia na ten dzień są zamknięte', 'info')
    const ref = doc(db, 'availability', `${iso}_${user.uid}`)
    const had = mine.has(iso)
    mark(iso, true)
    try {
      if (had) await deleteDoc(ref)
      else await setDoc(ref, { date: iso, uid: user.uid, createdAt: serverTimestamp() })
      notify(had ? 'Zgłoszenie wycofane' : 'Zgłoszenie wysłane', had ? 'info' : 'ok')
    } catch (e) {
      console.error(e)
      notify('Nie udało się zapisać zgłoszenia', 'err')
    } finally {
      mark(iso, false)
    }
  }

  const applyAll = () =>
    run(async () => {
      if (!user) return
      const list = stats.openFuture.filter((d) => !mine.has(d))
      const batch = writeBatch(db)
      list.forEach((d) =>
        batch.set(doc(db, 'availability', `${d}_${user.uid}`), { date: d, uid: user.uid, createdAt: serverTimestamp() }),
      )
      await batch.commit()
      notify(`Zgłoszono ${pl(list.length, ['datę', 'daty', 'dat'])}`)
    })

  function onCell(iso: string) {
    setSelected(iso)
    if (!isManager) toggleMine(iso)
  }

  /* ───── Рендер ───── */
  const sel = selected
  const selReq = getRequirement(settings, sel)
  const selApps = byDate[sel] ?? []
  const selSch = schedules[sel]
  const selOpen = dates[sel]?.open === true

  return (
    <>
      <PageHeader
        eyebrow="Kalendarz"
        title={isManager ? 'Otwieranie dat' : 'Twoja dostępność'}
        sub={
          isManager
            ? 'Otwórz daty, na które barmani mogą się zgłaszać, i sprawdzaj obsadę.'
            : 'Kliknij otwartą datę, aby się zgłosić. Kliknij ponownie — aby wycofać.'
        }
        actions={
          isManager && (
            <>
              <button className="btn primary lg" onClick={openMonth} disabled={busy}>
                {busy ? <Spinner /> : <Icon name="unlock" />}Otwórz daty miesiąca
              </button>
              <button className="btn ghost lg" onClick={closeMonth} disabled={busy}>
                <Icon name="lock" />Zamknij zgłoszenia
              </button>
            </>
          )
        }
      />

      <div className="split">
        <section className="glass card cal enter" style={sv({ '--d': '100ms' })}>
          <div className="cal-head">
            <MonthNav value={ym} onChange={changeMonth} />
          </div>
          <div className="cal-meta" key={'m' + key}>
            <span><b>{stats.open}</b> otwartych</span>
            {isManager ? (
              <span><b>{stats.lacking}</b> z brakami zgłoszeń</span>
            ) : (
              <>
                <span><b>{stats.applied}</b>/{stats.openFuture.length} zgłoszonych</span>
                <span><b>{stats.shifts}</b> twoich zmian</span>
              </>
            )}
          </div>

          <div className="grid wd">
            {WEEKDAYS_SHORT.map((w, i) => <span key={w} className={i > 3 ? 'we' : ''}>{w}</span>)}
          </div>

          <div key={key} className={cx('grid days', dir > 0 && 'from-r', dir < 0 && 'from-l')}>
            {grid.map((iso, i) => {
              if (!iso) return <span key={'e' + i} className="cell-empty" />
              const past = iso < today
              const isOpen = dates[iso]?.open === true
              const known = !!dates[iso]
              const sch = schedules[iso]
              const req = getRequirement(settings, iso)
              const apps = byDate[iso]?.length ?? 0
              const applied = mine.has(iso)
              const shift = !isManager && sch?.status === 'published' && isAssigned(sch, user?.uid)
              const busyCell = pending.has(iso)
              const need = isManager && isOpen && !past && apps < req.total

              return (
                <button
                  key={iso}
                  type="button"
                  style={sv({ '--i': i })}
                  onClick={() => onCell(iso)}
                  aria-pressed={isManager ? sel === iso : applied}
                  aria-label={formatLong(iso)}
                  className={cx(
                    'cell',
                    iso === today && 'today',
                    isManager && sel === iso && 'sel',
                    isOpen && 'open',
                    known && !isOpen && 'closed',
                    past && 'past',
                    applied && 'applied',
                    shift && 'mine',
                    req.total === 0 && 'off',
                  )}
                >
                  <span className="cell-top">
                    <b className="num">{dayNum(iso)}</b>
                    {busyCell ? <Spinner /> : applied && !shift ? <Icon name="check" size={14} className="cell-check" /> : null}
                  </span>
                  {need && <i className="pulse" />}

                  {isManager ? (
                    <span className="mini">
                      {isOpen && <em><Icon name="users" size={11} />{apps}/{req.total}</em>}
                      {known && !isOpen && <em className="muted-em">zamknięte</em>}
                      {sch && (
                        <em className={cx('st', sch.status)}>
                          {sch.status === 'published' ? 'opubl.' : 'szkic'}
                          {sch.missing > 0 && ` · −${sch.missing}`}
                        </em>
                      )}
                    </span>
                  ) : (
                    <span className="mini">
                      {shift ? (
                        <em className="strong">Zmiana · bar {barOf(sch!, user?.uid)}</em>
                      ) : applied ? (
                        <em>zgłoszono</em>
                      ) : isOpen && !past ? (
                        <em className="muted-em">otwarte</em>
                      ) : null}
                    </span>
                  )}

                  {isManager && isOpen && req.total > 0 && (
                    <span className="fill"><i style={{ width: Math.min(1, apps / req.total) * 100 + '%' }} /></span>
                  )}
                </button>
              )
            })}
          </div>

          <div className="legend">
            {isManager ? (
              <>
                <span><i className="pulse" /> za mało zgłoszeń</span>
                <span><i className="lg-sq open" /> otwarte</span>
                <span><i className="lg-bar" /> zgłoszenia / potrzeba</span>
              </>
            ) : (
              <>
                <span><i className="lg-sq open" /> otwarte</span>
                <span><i className="lg-sq applied" /> zgłoszono</span>
                <span><i className="lg-sq" /> twoja zmiana</span>
              </>
            )}
          </div>
        </section>

        {isManager ? (
          <aside className="glass card panel" key={sel}>
            <div className="panel-head">
              <div>
                <p className="eyebrow">{sel === today ? 'Dziś' : sel < today ? 'Miniony dzień' : 'Nadchodzący dzień'}</p>
                <h3>{formatLong(sel)}</h3>
              </div>
              {dates[sel] && <span className={cx('pill', selOpen && 'on')}>{selOpen ? 'Otwarte' : 'Zamknięte'}</span>}
            </div>

            <div className="req">
              {selReq.total > 0 ? (
                <>
                  <div><b>{selReq.bars}</b><small>{plural(selReq.bars, ['bar', 'bary', 'barów'])}</small></div>
                  <Icon name="x" size={14} />
                  <div><b>{selReq.perBar}</b><small>na bar</small></div>
                  <span className="eq">=</span>
                  <div className="total"><b>{selReq.total}</b><small>{plural(selReq.total, ['osoba', 'osoby', 'osób'])}</small></div>
                </>
              ) : (
                <p className="muted">Według ustawień klub w ten dzień nie pracuje.</p>
              )}
            </div>

            <button
              className={cx('btn wide', selOpen ? 'ghost' : 'primary')}
              disabled={busy || sel < today || selReq.total === 0}
              onClick={() => setOpen(sel, !selOpen)}
            >
              <Icon name={selOpen ? 'lock' : 'unlock'} />
              {selOpen ? 'Zamknij zgłoszenia' : 'Otwórz dla zgłoszeń'}
            </button>
            {sel < today && <p className="muted small">Minionych dat nie można zmieniać.</p>}

            <div className="sect">
              <h4><span>Zgłoszenia</span><span className="count">{selApps.length}/{selReq.total}</span></h4>
              {selApps.length === 0 ? (
                <EmptyState icon="hand">Nikt się jeszcze nie zgłosił</EmptyState>
              ) : (
                <ul className="list">
                  {selApps.map((uid, i) => {
                    const assigned = isAssigned(selSch, uid)
                    return (
                      <li className="resp" key={uid} style={sv({ '--i': i })}>
                        <Avatar name={names[uid] ?? '?'} size={30} />
                        <div className="resp-body"><b>{names[uid] ?? 'Nieznany barman'}</b></div>
                        {assigned && <span className="tag published">Bar {barOf(selSch!, uid)}</span>}
                      </li>
                    )
                  })}
                </ul>
              )}
              {selReq.total > 0 && selApps.length < selReq.total && (
                <p className="warn-line">
                  <Icon name="alert" size={14} />
                  Za mało zgłoszeń: brakuje {pl(selReq.total - selApps.length, ['osoby', 'osób', 'osób'])}.
                </p>
              )}
            </div>

            <div className="sect">
              <h4><span>Grafik</span></h4>
              {selSch ? (
                <div className="row">
                  <span className={cx('tag', selSch.status)}>{selSch.status === 'published' ? 'Opublikowany' : 'Szkic'}</span>
                  {selSch.missing > 0 ? (
                    <span className="warn-line">Wolne miejsca: {selSch.missing}</span>
                  ) : (
                    <span className="muted small">Pełna obsada</span>
                  )}
                </div>
              ) : (
                <p className="muted small">Grafik dla tej daty jeszcze nie powstał.</p>
              )}
              <Link to="/schedule" className="btn ghost wide">Przejdź do grafiku<Icon name="arrowR" /></Link>
            </div>
          </aside>
        ) : (
          <aside className="glass card panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Ten miesiąc</p>
                <h3>Twoje zgłoszenia</h3>
              </div>
            </div>
            <div className="progress-block">
              <div className="progress-top">
                <b><span className="big">{stats.applied}</span> / {stats.openFuture.length}</b>
                <small>otwartych dat</small>
              </div>
              <div className="bar">
                <i style={{ width: stats.openFuture.length ? (stats.applied / stats.openFuture.length) * 100 + '%' : '0%' }} />
              </div>
            </div>
            <button
              className="btn primary wide"
              onClick={applyAll}
              disabled={busy || stats.openFuture.every((d) => mine.has(d))}
            >
              {busy ? <Spinner /> : <Icon name="hand" />}
              {stats.openFuture.length && stats.openFuture.every((d) => mine.has(d))
                ? 'Zgłoszono na wszystkie'
                : 'Zgłoś się na wszystkie otwarte'}
            </button>

            <div className="sect">
              <h4><span>Zgłoszone daty</span><span className="count">{stats.applied}</span></h4>
              {stats.applied === 0 ? (
                <EmptyState icon="hand">Kliknij otwartą datę w kalendarzu</EmptyState>
              ) : (
                <div className="chips">
                  {stats.openFuture.filter((d) => mine.has(d)).map((d) => (
                    <button key={d} className="chip" onClick={() => toggleMine(d)} title="Wycofaj zgłoszenie">
                      {dayNum(d)}.{d.slice(5, 7)} <Icon name="x" size={12} />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="sect">
              <h4><span>Jak to działa</span></h4>
              <ol className="steps">
                <li>Zaznacz dni, w które możesz pracować.</li>
                <li>Menedżer układa grafik — równo dla wszystkich.</li>
                <li>Po publikacji zmiana pojawi się na biało w kalendarzu.</li>
              </ol>
            </div>
          </aside>
        )}
      </div>
    </>
  )
}
