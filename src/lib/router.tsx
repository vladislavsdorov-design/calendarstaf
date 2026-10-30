import { useSyncExternalStore, type AnchorHTMLAttributes, type MouseEvent } from 'react'

/* Мини-роутер на History API (вместо react-router: ~40 строк вместо ~60 КБ). */

const listeners = new Set<() => void>()

function subscribe(cb: () => void) {
  listeners.add(cb)
  window.addEventListener('popstate', cb)
  return () => {
    listeners.delete(cb)
    window.removeEventListener('popstate', cb)
  }
}

const getPath = () => window.location.pathname

export function navigate(to: string, replace = false) {
  if (to === getPath()) return
  if (replace) window.history.replaceState(null, '', to)
  else window.history.pushState(null, '', to)
  listeners.forEach((l) => l())
  if (!replace) window.scrollTo({ top: 0 })
}

export const usePath = () => useSyncExternalStore(subscribe, getPath)

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { to: string }

export function Link({ to, onClick, ...rest }: LinkProps) {
  function handle(e: MouseEvent<HTMLAnchorElement>) {
    onClick?.(e)
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    navigate(to)
  }
  return <a href={to} onClick={handle} {...rest} />
}
