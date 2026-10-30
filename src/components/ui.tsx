import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { cx, initials, sv } from '../lib/utils'

/* ───────────── Иконки (inline SVG, без внешних библиотек) ───────────── */
const P = {
  martini: 'M8 22h8M12 11v11M3 3h18l-9 8zM16 3l3-2',
  dashboard: 'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z',
  calendar: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  clipboard: 'M9 3h6v4H9zM9 5H6a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3M9 12h6M9 16h4',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  sliders: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  chevL: 'M15 18l-6-6 6-6',
  chevR: 'M9 18l6-6-6-6',
  chevD: 'M6 9l6 6 6-6',
  arrowR: 'M5 12h14M13 6l6 6-6 6',
  check: 'M20 6L9 17l-5-5',
  x: 'M18 6L6 18M6 6l12 12',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  lock: 'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4',
  unlock: 'M6 11h12v10H6zM8 11V7a4 4 0 0 1 7.9-1',
  alert: 'M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
  info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16v-4M12 8h.01',
  sparkles: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 3v4M17 5h4M5 17v3M3.5 18.5h3',
  send: 'M22 2L11 13M22 2l-7 20-4-9-9-4z',
  undo: 'M9 14L4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  mail: 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM22 6l-10 7L2 6',
  key: 'M15 7a3 3 0 1 1 0 .01M13.5 10.5L3 21M7 17l3 3M10 14l2 2',
  save: 'M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2zM17 21v-8H7v8M7 3v5h8',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
  hand: 'M18 11V6a2 2 0 0 0-4 0M14 10V4a2 2 0 0 0-4 0v2M10 10.5V6a2 2 0 0 0-4 0v8M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-6-2.4l-3.6-3.6a2 2 0 0 1 2.8-2.8L7 15',
  layers: 'M12 2l10 5-10 5L2 7zM2 17l10 5 10-5M2 12l10 5 10-5',
} as const

export type IconName = keyof typeof P

export function Icon({ name, size = 16, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      className={cx('ico', className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={P[name]} />
    </svg>
  )
}

export const Spinner = () => <span className="spin" aria-hidden="true" />

export function Avatar({ name = '', size = 32, ghost }: { name?: string; size?: number; ghost?: boolean }) {
  return (
    <span className={cx('ava', ghost && 'ghost')} style={sv({ '--sz': size + 'px' })} title={name}>
      {ghost ? <Icon name="plus" size={12} /> : initials(name)}
    </span>
  )
}

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 10,
  disabled,
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  disabled?: boolean
}) {
  return (
    <div className="stepper">
      <button type="button" className="step" disabled={disabled || value <= min}
        onClick={() => onChange(Math.max(min, value - 1))} aria-label="Mniej">
        <Icon name="minus" size={14} />
      </button>
      <span key={value} className="step-val">{value}</span>
      <button type="button" className="step" disabled={disabled || value >= max}
        onClick={() => onChange(Math.min(max, value + 1))} aria-label="Więcej">
        <Icon name="plus" size={14} />
      </button>
    </div>
  )
}

export interface SegItem<T extends string> {
  id: T
  label: string
  icon?: IconName
}

/** Сегментный переключатель со скользящей «таблеткой» */
export function Segmented<T extends string>({
  items,
  value,
  onChange,
  className,
}: {
  items: SegItem<T>[]
  value: T
  onChange: (v: T) => void
  className?: string
}) {
  const i = Math.max(0, items.findIndex((t) => t.id === value))
  return (
    <div className={cx('seg', className)} style={sv({ '--i': i, '--n': items.length })} role="tablist">
      <span className="seg-ind" />
      {items.map((t) => (
        <button key={t.id} type="button" role="tab" aria-selected={t.id === value}
          className={cx('seg-btn', t.id === value && 'on')} onClick={() => onChange(t.id)}>
          {t.icon && <Icon name={t.icon} />}
          <span>{t.label}</span>
        </button>
      ))}
    </div>
  )
}

/** Анимированный счётчик */
export function Num({ v, ms = 900 }: { v: number; ms?: number }) {
  const [n, setN] = useState(0)
  const from = useRef(0)
  useEffect(() => {
    let f = 0
    const t0 = performance.now()
    const a = from.current
    const step = (now: number) => {
      const p = Math.min((now - t0) / ms, 1)
      const val = Math.round(a + (v - a) * (1 - Math.pow(1 - p, 4)))
      setN(val)
      from.current = val
      if (p < 1) f = requestAnimationFrame(step)
    }
    f = requestAnimationFrame(step)
    return () => cancelAnimationFrame(f)
  }, [v, ms])
  return <>{n}</>
}

export function Background() {
  return (
    <div className="bg" aria-hidden="true">
      <div className="bg-orb a" />
      <div className="bg-orb b" />
      <div className="bg-grid" />
      <div className="bg-light" id="bg-light" />
      <div className="bg-noise" />
    </div>
  )
}

export function EmptyState({ icon = 'calendar', children }: { icon?: IconName; children: ReactNode }) {
  return (
    <div className="empty-state">
      <span className="es-ico"><Icon name={icon} size={20} /></span>
      <div>{children}</div>
    </div>
  )
}

export function PageHeader({
  eyebrow,
  title,
  sub,
  actions,
}: {
  eyebrow?: ReactNode
  title: ReactNode
  sub?: ReactNode
  actions?: ReactNode
}) {
  return (
    <section className="hero enter">
      <div className="hero-text">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {sub && <p className="hero-sub">{sub}</p>}
      </div>
      {actions && <div className="hero-actions">{actions}</div>}
    </section>
  )
}

export function Kpi({
  label,
  value,
  icon,
  i = 0,
  warn,
  suffix,
}: {
  label: string
  value: number
  icon: IconName
  i?: number
  warn?: boolean
  suffix?: string
}) {
  return (
    <div className={cx('glass card kpi', warn && value > 0 && 'warn')} style={sv({ '--d': i * 70 + 'ms' })}>
      <div className="kpi-top"><span>{label}</span><Icon name={icon} /></div>
      <b><Num v={value} />{suffix && <small>{suffix}</small>}</b>
    </div>
  )
}

/** Подсветка карточек под курсором + мягкий свет на фоне.
 *  Один слушатель на всё приложение, обновление не чаще кадра. */
export function useSpotlight() {
  useEffect(() => {
    if (!window.matchMedia('(hover: hover)').matches) return
    let raf = 0
    let ev: PointerEvent | null = null
    let last: HTMLElement | null = null
    const run = () => {
      raf = 0
      if (!ev) return
      const light = document.getElementById('bg-light')
      if (light) light.style.transform = `translate3d(${ev.clientX - 350}px, ${ev.clientY - 350}px, 0)`
      const el = (ev.target as Element | null)?.closest?.('.glass') as HTMLElement | null
      if (last && last !== el) last.classList.remove('lit')
      if (el) {
        const r = el.getBoundingClientRect()
        el.style.setProperty('--mx', ev.clientX - r.left + 'px')
        el.style.setProperty('--my', ev.clientY - r.top + 'px')
        el.classList.add('lit')
      }
      last = el
    }
    const on = (e: PointerEvent) => {
      ev = e
      if (!raf) raf = requestAnimationFrame(run)
    }
    window.addEventListener('pointermove', on, { passive: true })
    return () => {
      window.removeEventListener('pointermove', on)
      cancelAnimationFrame(raf)
    }
  }, [])
}

/* ───────────── Уведомления и диалог подтверждения ───────────── */
type ToastKind = 'ok' | 'err' | 'info'
interface ToastState { text: string; kind: ToastKind; id: number }
interface ConfirmOpts { title: string; text?: string; ok?: string; danger?: boolean }
interface DialogState extends ConfirmOpts { resolve: (v: boolean) => void }
interface UIApi {
  notify: (text: string, kind?: ToastKind) => void
  confirm: (o: ConfirmOpts) => Promise<boolean>
}

const UICtx = createContext<UIApi | null>(null)
const TOAST_ICON: Record<ToastKind, IconName> = { ok: 'check', err: 'alert', info: 'info' }

export function UIProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null)
  const [dlg, setDlg] = useState<DialogState | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const notify = useCallback((text: string, kind: ToastKind = 'ok') => {
    window.clearTimeout(timer.current)
    setToast({ text, kind, id: Date.now() })
    timer.current = window.setTimeout(() => setToast(null), 3000)
  }, [])

  const confirm = useCallback(
    (o: ConfirmOpts) => new Promise<boolean>((resolve) => setDlg({ ...o, resolve })),
    [],
  )

  const close = useCallback((v: boolean) => {
    setDlg((d) => {
      d?.resolve(v)
      return null
    })
  }, [])

  useEffect(() => {
    if (!dlg) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false)
      if (e.key === 'Enter') close(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dlg, close])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const api = useMemo(() => ({ notify, confirm }), [notify, confirm])

  return (
    <UICtx.Provider value={api}>
      {children}
      {toast && (
        <div className={cx('toast', toast.kind)} key={toast.id} role="status">
          <span className="toast-ico"><Icon name={TOAST_ICON[toast.kind]} size={14} /></span>
          {toast.text}
        </div>
      )}
      {dlg && (
        <div className="modal-back" onClick={() => close(false)}>
          <div className="glass modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <span className={cx('modal-ico', dlg.danger && 'danger')}>
              <Icon name={dlg.danger ? 'alert' : 'info'} size={20} />
            </span>
            <h3>{dlg.title}</h3>
            {dlg.text && <p>{dlg.text}</p>}
            <div className="modal-actions">
              <button className="btn ghost" onClick={() => close(false)}>Anuluj</button>
              <button className="btn primary" autoFocus onClick={() => close(true)}>{dlg.ok ?? 'Potwierdź'}</button>
            </div>
          </div>
        </div>
      )}
    </UICtx.Provider>
  )
}

export function useUI() {
  const c = useContext(UICtx)
  if (!c) throw new Error('useUI must be used inside UIProvider')
  return c
}

/** Обёртка для записи в Firestore: состояние загрузки + уведомление об ошибке */
export function useAction() {
  const { notify } = useUI()
  const [busy, setBusy] = useState(false)
  const run = useCallback(
    async (fn: () => Promise<unknown>, okText?: string) => {
      setBusy(true)
      try {
        await fn()
        if (okText) notify(okText)
        return true
      } catch (e) {
        console.error(e)
        notify('Nie udało się zapisać zmian. Sprawdź połączenie i uprawnienia.', 'err')
        return false
      } finally {
        setBusy(false)
      }
    },
    [notify],
  )
  return { busy, run }
}
