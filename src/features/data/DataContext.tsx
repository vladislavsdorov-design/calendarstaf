import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { collection, doc, onSnapshot, query, setDoc, where } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { byNamePl, fullName } from '../../lib/utils'
import { useAuth } from '../auth/AuthContext'
import {
  DEFAULT_SETTINGS,
  type AvailabilityDoc,
  type ClubSettings,
  type DateDoc,
  type ScheduleDay,
  type UserProfile,
} from '../../types'

/**
 * Единый источник данных.
 * Раньше каждая страница открывала свои подписки (календарь — 5 штук одновременно,
 * плюс дубли в каждом хуке). Теперь на всё приложение по одной подписке на коллекцию,
 * а страницы переключаются мгновенно — данные уже в памяти.
 */
interface Data {
  dates: Record<string, DateDoc>
  availability: AvailabilityDoc[]
  schedules: Record<string, ScheduleDay>
  settings: ClubSettings
  settingsReady: boolean
  bartenders: UserProfile[]
  /** дата → uid барменов, подавших заявку */
  byDate: Record<string, string[]>
  /** uid → имя (из профилей и из сохранённых смен) */
  names: Record<string, string>
  /** даты, на которые текущий пользователь подал заявку */
  mine: Set<string>
}

const DataCtx = createContext<Data | null>(null)
const logErr = (e: unknown) => console.error(e)

export function DataProvider({ children }: { children: ReactNode }) {
  const { user, isManager } = useAuth()
  const uid = user?.uid

  const [dates, setDates] = useState<Record<string, DateDoc>>({})
  const [availability, setAvailability] = useState<AvailabilityDoc[]>([])
  const [schedules, setSchedules] = useState<Record<string, ScheduleDay>>({})
  const [settings, setSettings] = useState<ClubSettings>(DEFAULT_SETTINGS)
  const [settingsReady, setSettingsReady] = useState(false)
  const [bartenders, setBartenders] = useState<UserProfile[]>([])

  useEffect(
    () =>
      onSnapshot(
        collection(db, 'dates'),
        (snap) => {
          const m: Record<string, DateDoc> = {}
          snap.forEach((d) => {
            m[d.id] = { date: d.id, open: d.data().open === true }
          })
          setDates(m)
        },
        logErr,
      ),
    [],
  )

  // Менеджер видит все заявки, бармен — только свои (так же ограничено правилами)
  useEffect(() => {
    if (!uid) return
    const col = collection(db, 'availability')
    const q = isManager ? col : query(col, where('uid', '==', uid))
    return onSnapshot(
      q,
      (snap) =>
        setAvailability(
          snap.docs.map((d) => ({ id: d.id, date: d.data().date as string, uid: d.data().uid as string })),
        ),
      logErr,
    )
  }, [uid, isManager])

  // Менеджер видит черновики и опубликованное, бармен — только опубликованное
  useEffect(() => {
    if (!uid) return
    const col = collection(db, 'schedules')
    const q = isManager ? col : query(col, where('status', '==', 'published'))
    return onSnapshot(
      q,
      (snap) => {
        const m: Record<string, ScheduleDay> = {}
        snap.forEach((d) => {
          m[d.id] = { ...(d.data() as ScheduleDay), date: d.id }
        })
        setSchedules(m)
      },
      logErr,
    )
  }, [uid, isManager])

  // Настройки клуба; если документа нет — менеджер создаёт его со значениями по умолчанию
  useEffect(() => {
    const ref = doc(db, 'settings', 'club')
    return onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Partial<ClubSettings>
          setSettings({ days: { ...DEFAULT_SETTINGS.days, ...(data.days ?? {}) } })
        } else if (isManager) {
          setDoc(ref, DEFAULT_SETTINGS).catch(logErr)
        }
        setSettingsReady(true)
      },
      (e) => {
        logErr(e)
        setSettingsReady(true)
      },
    )
  }, [isManager])

  // Список барменов доступен только менеджеру
  useEffect(() => {
    if (!isManager) {
      setBartenders([])
      return
    }
    return onSnapshot(
      query(collection(db, 'users'), where('role', '==', 'bartender')),
      (snap) => {
        const items = snap.docs.map((d) => ({ uid: d.id, ...d.data() }) as UserProfile)
        items.sort((a, b) => byNamePl(fullName(a), fullName(b)))
        setBartenders(items)
      },
      logErr,
    )
  }, [isManager])

  const byDate = useMemo(() => {
    const m: Record<string, string[]> = {}
    for (const a of availability) (m[a.date] ??= []).push(a.uid)
    return m
  }, [availability])

  const names = useMemo(() => {
    const m: Record<string, string> = {}
    for (const s of Object.values(schedules)) for (const b of s.bars) for (const p of b.staff) m[p.uid] = p.name
    for (const b of bartenders) m[b.uid] = fullName(b)
    return m
  }, [schedules, bartenders])

  const mine = useMemo(
    () => new Set(availability.filter((a) => a.uid === uid).map((a) => a.date)),
    [availability, uid],
  )

  const value = useMemo<Data>(
    () => ({ dates, availability, schedules, settings, settingsReady, bartenders, byDate, names, mine }),
    [dates, availability, schedules, settings, settingsReady, bartenders, byDate, names, mine],
  )

  return <DataCtx.Provider value={value}>{children}</DataCtx.Provider>
}

export function useData() {
  const c = useContext(DataCtx)
  if (!c) throw new Error('useData must be used inside DataProvider')
  return c
}

/* ───── Общие помощники ───── */

export interface Requirement {
  bars: number
  perBar: number
  total: number
}

/** Сколько баров и барменов нужно в конкретную дату — строго по сохранённым настройкам */
export function getRequirement(settings: ClubSettings, iso: string): Requirement {
  const cfg = settings.days[String(new Date(iso + 'T12:00:00').getDay())]
  const bars = cfg?.bars ?? 0
  const perBar = cfg?.bartendersPerBar ?? 0
  return { bars, perBar, total: bars * perBar }
}

export const isAssigned = (s: ScheduleDay | undefined, uid: string | undefined) =>
  !!s && !!uid && s.bars.some((b) => b.staff.some((p) => p.uid === uid))

export const barOf = (s: ScheduleDay, uid: string | undefined) =>
  s.bars.find((b) => b.staff.some((p) => p.uid === uid))?.bar
