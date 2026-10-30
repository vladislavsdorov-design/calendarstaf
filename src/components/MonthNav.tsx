import { MONTH_NAMES, monthKey, todayISO } from '../lib/dates'
import { Icon } from './ui'

export interface YM {
  y: number
  m: number
}

export const currentYM = (): YM => {
  const n = new Date()
  return { y: n.getFullYear(), m: n.getMonth() }
}

export const shiftYM = ({ y, m }: YM, delta: number): YM => {
  const d = new Date(y, m + delta, 1)
  return { y: d.getFullYear(), m: d.getMonth() }
}

export default function MonthNav({ value, onChange }: { value: YM; onChange: (v: YM) => void }) {
  const key = monthKey(value.y, value.m)
  const isCurrent = todayISO().startsWith(key)
  return (
    <div className="month-nav">
      {!isCurrent && (
        <button className="btn ghost sm pop" onClick={() => onChange(currentYM())}>Dziś</button>
      )}
      <button className="btn icon" onClick={() => onChange(shiftYM(value, -1))} aria-label="Poprzedni miesiąc">
        <Icon name="chevL" />
      </button>
      <div className="month-title" key={key}>
        {MONTH_NAMES[value.m]} <span>{value.y}</span>
      </div>
      <button className="btn icon" onClick={() => onChange(shiftYM(value, 1))} aria-label="Następny miesiąc">
        <Icon name="chevR" />
      </button>
    </div>
  )
}
