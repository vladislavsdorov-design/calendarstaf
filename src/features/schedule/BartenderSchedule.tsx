import { useMemo, useState } from 'react'
import { formatLong, monthDays, todayISO } from '../../lib/dates'
import { cx, pl, sv } from '../../lib/utils'
import MonthNav, { currentYM, type YM } from '../../components/MonthNav'
import { EmptyState, Icon, PageHeader, Segmented } from '../../components/ui'
import { useAuth } from '../auth/AuthContext'
import { isAssigned, useData } from '../data/DataContext'
import type { ScheduleDay } from '../../types'

type Filter = 'all' | 'mine'

export default function BartenderSchedule() {
  const { user } = useAuth()
  const { schedules } = useData()
  const [ym, setYm] = useState<YM>(currentYM)
  const [filter, setFilter] = useState<Filter>('all')
  const today = todayISO()

  const published = useMemo(
    () =>
      monthDays(ym.y, ym.m)
        .map((d) => schedules[d])
        .filter((s): s is ScheduleDay => !!s && s.status === 'published'),
    [ym, schedules],
  )
  const mineCount = published.filter((s) => isAssigned(s, user?.uid)).length
  const days = filter === 'mine' ? published.filter((s) => isAssigned(s, user?.uid)) : published

  return (
    <>
      <PageHeader
        eyebrow="Grafik zmian"
        title="Opublikowany grafik"
        sub={mineCount ? `W tym miesiącu masz ${pl(mineCount, ['zmianę', 'zmiany', 'zmian'])}` : 'Tu pojawią się opublikowane zmiany'}
      />

      <div className="toolbar glass enter" style={sv({ '--d': '80ms' })}>
        <MonthNav value={ym} onChange={setYm} />
        <Segmented
          items={[
            { id: 'all', label: `Wszystkie (${published.length})` },
            { id: 'mine', label: `Moje (${mineCount})` },
          ]}
          value={filter}
          onChange={setFilter}
        />
      </div>

      {days.length === 0 ? (
        <div className="glass card enter">
          <EmptyState icon="clipboard">
            {filter === 'mine'
              ? 'W tym miesiącu nie masz opublikowanych zmian.'
              : 'Grafik na ten miesiąc nie został jeszcze opublikowany.'}
          </EmptyState>
        </div>
      ) : (
        <div className="day-grid" key={`${ym.y}-${ym.m}-${filter}`}>
          {days.map((s, i) => {
            const myDay = isAssigned(s, user?.uid)
            return (
              <article
                key={s.date}
                className={cx('glass card daycard enter', myDay && 'my', s.date < today && 'past-card')}
                style={sv({ '--d': Math.min(i, 8) * 50 + 'ms' })}
              >
                <div className="dc-head">
                  <div>
                    <h3>{formatLong(s.date)}</h3>
                    {s.date === today && <p className="muted small">Dziś</p>}
                  </div>
                  {myDay && <span className="tag published"><Icon name="martini" size={12} />Twoja zmiana</span>}
                </div>
                <div className="bars">
                  {s.bars.map((bar) => (
                    <div className="bar-block" key={bar.bar}>
                      <div className="bar-label"><Icon name="martini" size={13} />Bar {bar.bar}</div>
                      <div className="chips">
                        {bar.staff.length === 0 && <span className="muted small">—</span>}
                        {bar.staff.map((p) => (
                          <span key={p.uid} className={cx('chip', p.uid === user?.uid && 'me')}>{p.name}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </>
  )
}
