import type { ReactNode } from 'react'
import { dayNum, formatMonthShort, formatWeekday } from '../lib/dates'
import { cx, sv } from '../lib/utils'
import { Icon } from './ui'

/** Строка дня: плашка с датой + текст + правая часть. Кликабельна, если передан onClick. */
export default function DayRow({
  date,
  sub,
  right,
  hot,
  i = 0,
  onClick,
}: {
  date: string
  sub?: ReactNode
  right?: ReactNode
  hot?: boolean
  i?: number
  onClick?: () => void
}) {
  const body = (
    <>
      <span className="date-chip">
        <b>{dayNum(date)}</b>
        <small>{formatMonthShort(date)}</small>
      </span>
      <span className="day-row-body">
        <b>{formatWeekday(date)}</b>
        {sub && <small>{sub}</small>}
      </span>
      {right}
      {onClick && <Icon name="chevR" className="chev" />}
    </>
  )
  const cls = cx('day-row', hot && 'hot', onClick && 'clickable')
  return onClick ? (
    <button type="button" className={cls} style={sv({ '--i': i })} onClick={onClick}>{body}</button>
  ) : (
    <div className={cls} style={sv({ '--i': i })}>{body}</div>
  )
}
