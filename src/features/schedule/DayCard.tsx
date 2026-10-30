import { memo, useMemo } from 'react'
import { formatLong, isWeekend } from '../../lib/dates'
import { cx, fullName, pl, sv } from '../../lib/utils'
import { Icon } from '../../components/ui'
import type { Requirement } from '../data/DataContext'
import type { BarAssignment, ScheduleDay, UserProfile } from '../../types'

interface Props {
  date: string
  i: number
  schedule?: ScheduleDay
  req: Requirement
  /** uid барменов, подавших заявку на эту дату */
  applicants: string[]
  bartenders: UserProfile[]
  names: Record<string, string>
  open: boolean
  busy: boolean
  onSave: (date: string, bars: BarAssignment[]) => void
  onStatus: (date: string, status: 'draft' | 'published') => void
}

function DayCard({ date, i, schedule, req, applicants, bartenders, names, open, busy, onSave, onStatus }: Props) {
  const locked = schedule?.status === 'published'
  const status = locked ? 'published' : schedule ? 'draft' : 'none'

  // Матрица мест: бары × места. Если настройки поменялись после создания черновика,
  // берём максимум из настроек и сохранённых данных, чтобы ничего не потерять.
  const slots = useMemo(() => {
    const barsCount = Math.max(req.bars, schedule?.bars.length ?? 0)
    return Array.from({ length: barsCount }, (_, bi) => {
      const staff = schedule?.bars.find((b) => b.bar === bi + 1)?.staff ?? []
      const size = Math.max(req.perBar, staff.length)
      return Array.from({ length: size }, (_, si) => staff[si]?.uid ?? '')
    })
  }, [req, schedule])

  const assigned = useMemo(() => new Set(slots.flat().filter(Boolean)), [slots])
  const applicantSet = useMemo(() => new Set(applicants), [applicants])
  const withApp = useMemo(() => bartenders.filter((b) => applicantSet.has(b.uid)), [bartenders, applicantSet])
  const others = useMemo(() => bartenders.filter((b) => !applicantSet.has(b.uid)), [bartenders, applicantSet])
  const known = useMemo(() => new Set(bartenders.map((b) => b.uid)), [bartenders])

  const missing = Math.max(0, req.total - assigned.size)
  const nameOf = (uid: string) => names[uid] ?? uid

  function change(bi: number, si: number, uid: string) {
    const next = slots.map((row) => [...row])
    next[bi][si] = uid
    onSave(
      date,
      next.map((row, idx) => ({
        bar: idx + 1,
        staff: row.filter(Boolean).map((u) => ({ uid: u, name: nameOf(u) })),
      })),
    )
  }

  return (
    <article className={cx('glass card daycard enter', status)} style={sv({ '--d': Math.min(i, 8) * 50 + 'ms' })}>
      <div className="dc-head">
        <div>
          <h3>{formatLong(date)}</h3>
          <p className="muted small">
            Zgłoszenia: {applicants.length} · potrzeba: {req.total}
            {!open && ' · zgłoszenia zamknięte'}
          </p>
        </div>
        <div className="dc-tags">
          {isWeekend(date) && <span className="tag">weekend</span>}
          <span className={cx('tag', status)}>
            {status === 'published' ? 'Opublikowany' : status === 'draft' ? 'Szkic' : 'Brak grafiku'}
          </span>
        </div>
      </div>

      {missing > 0 && (schedule || req.total > 0) && (
        <p className="warn-line"><Icon name="alert" size={14} />Brakuje: {pl(missing, ['osoby', 'osób', 'osób'])}</p>
      )}

      {slots.length === 0 ? (
        <p className="muted small">Według ustawień klub w ten dzień nie pracuje.</p>
      ) : (
        <div className="bars">
          {slots.map((row, bi) => (
            <div className="bar-block" key={bi}>
              <div className="bar-label"><Icon name="martini" size={13} />Bar {bi + 1}</div>
              <div className="bar-slots">
                {row.map((uid, si) => {
                  const orphan = uid && !known.has(uid)
                  const avail = (list: UserProfile[]) => list.filter((b) => !assigned.has(b.uid) || b.uid === uid)
                  const a = avail(withApp)
                  const o = avail(others)
                  return (
                    <label key={si} className={cx('select slot-select', uid && 'filled', uid && !applicantSet.has(uid) && 'noapp')}>
                      <select
                        className="input"
                        disabled={locked || busy}
                        value={uid}
                        onChange={(e) => change(bi, si, e.target.value)}
                      >
                        <option value="">— wolne miejsce —</option>
                        {orphan && <option value={uid}>{nameOf(uid)}</option>}
                        {a.length > 0 && (
                          <optgroup label="Zgłosili się">
                            {a.map((b) => <option key={b.uid} value={b.uid}>{fullName(b)}</option>)}
                          </optgroup>
                        )}
                        {o.length > 0 && (
                          <optgroup label="Bez zgłoszenia">
                            {o.map((b) => <option key={b.uid} value={b.uid}>{fullName(b)}</option>)}
                          </optgroup>
                        )}
                      </select>
                      <Icon name={locked ? 'lock' : 'chevD'} />
                    </label>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {schedule && (
        <div className="dc-foot">
          {locked ? (
            <button className="btn ghost sm" onClick={() => onStatus(date, 'draft')} disabled={busy}>
              <Icon name="undo" size={14} />Cofnij publikację
            </button>
          ) : (
            <button className="btn primary sm" onClick={() => onStatus(date, 'published')} disabled={busy}>
              <Icon name="send" size={14} />Opublikuj dzień
            </button>
          )}
        </div>
      )}
    </article>
  )
}

export default memo(DayCard)
