export type Role = 'manager' | 'bartender'

export interface UserProfile {
  uid: string
  firstName: string
  lastName: string
  email: string
  role: Role
}

/** Ключ дня недели — JS getDay(): 0 = воскресенье ... 6 = суббота */
export interface DayConfig {
  bars: number
  bartendersPerBar: number
}

export interface ClubSettings {
  days: Record<string, DayConfig>
}

/** Только начальное значение при первом создании settings/club.
 *  Алгоритм всегда читает настройки из Firebase. */
export const DEFAULT_SETTINGS: ClubSettings = {
  days: {
    '1': { bars: 2, bartendersPerBar: 1 },
    '2': { bars: 2, bartendersPerBar: 1 },
    '3': { bars: 2, bartendersPerBar: 1 },
    '4': { bars: 2, bartendersPerBar: 1 },
    '5': { bars: 3, bartendersPerBar: 2 },
    '6': { bars: 3, bartendersPerBar: 2 },
    '0': { bars: 2, bartendersPerBar: 1 },
  },
}

export const DAY_NAMES: Record<string, string> = {
  '1': 'Poniedziałek',
  '2': 'Wtorek',
  '3': 'Środa',
  '4': 'Czwartek',
  '5': 'Piątek',
  '6': 'Sobota',
  '0': 'Niedziela',
}

/** Порядок отображения: Пн..Вс */
export const DAY_ORDER = ['1', '2', '3', '4', '5', '6', '0']

export interface DateDoc {
  date: string
  open: boolean
}

export interface AvailabilityDoc {
  id: string
  date: string
  uid: string
}

export interface StaffRef {
  uid: string
  name: string
}

export interface BarAssignment {
  bar: number
  staff: StaffRef[]
}

export interface ScheduleDay {
  date: string // YYYY-MM-DD
  status: 'draft' | 'published'
  bars: BarAssignment[]
  missing: number // сколько мест не заполнено
}
