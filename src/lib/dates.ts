export const MONTH_NAMES = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
]

/** Неделя начинается с понедельника */
export const WEEKDAYS_SHORT = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd']

export const pad = (n: number) => String(n).padStart(2, '0')

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parseISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function todayISO(): string {
  return toISO(new Date())
}

/** Ключ дня недели в формате настроек: '0' (вс) ... '6' (сб) */
export function dayKey(iso: string): string {
  return String(parseISO(iso).getDay())
}

export const isWeekend = (iso: string) => {
  const k = dayKey(iso)
  return k === '5' || k === '6'
}

export function monthKey(year: number, month: number): string {
  return `${year}-${pad(month + 1)}`
}

export function monthDays(year: number, month: number): string[] {
  const count = new Date(year, month + 1, 0).getDate()
  const prefix = monthKey(year, month)
  return Array.from({ length: count }, (_, i) => `${prefix}-${pad(i + 1)}`)
}

/** Сетка месяца: null — пустые ячейки перед 1-м числом (неделя с понедельника) */
export function monthGrid(year: number, month: number): (string | null)[] {
  const offset = (new Date(year, month, 1).getDay() + 6) % 7
  return [...Array<null>(offset).fill(null), ...monthDays(year, month)]
}

// Форматтеры создаются один раз — это быстрее, чем toLocaleDateString на каждый рендер
const fLong = new Intl.DateTimeFormat('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })
const fMonthShort = new Intl.DateTimeFormat('pl-PL', { month: 'short' })
const fWeekday = new Intl.DateTimeFormat('pl-PL', { weekday: 'long' })

export const formatLong = (iso: string) => fLong.format(parseISO(iso))
export const formatMonthShort = (iso: string) => fMonthShort.format(parseISO(iso)).replace('.', '')
export const formatWeekday = (iso: string) => fWeekday.format(parseISO(iso))
export const dayNum = (iso: string) => Number(iso.slice(8))
