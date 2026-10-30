import type { ReactNode } from 'react'
import { Link, usePath } from '../lib/router'
import { cx, fullName, sv } from '../lib/utils'
import { useAuth } from '../features/auth/AuthContext'
import { Avatar, Icon, type IconName } from './ui'

interface NavItem {
  to: string
  label: string
  icon: IconName
}

export function navItems(isManager: boolean): NavItem[] {
  const items: NavItem[] = [
    { to: '/', label: 'Panel', icon: 'dashboard' },
    { to: '/calendar', label: 'Kalendarz', icon: 'calendar' },
    { to: '/schedule', label: 'Grafik', icon: 'clipboard' },
  ]
  if (isManager) {
    items.push(
      { to: '/bartenders', label: 'Barmani', icon: 'users' },
      { to: '/settings', label: 'Ustawienia', icon: 'sliders' },
    )
  }
  return items
}

export default function Layout({ children }: { children: ReactNode }) {
  const { profile, isManager, logout } = useAuth()
  const path = usePath()
  const items = navItems(isManager)
  const active = Math.max(0, items.findIndex((i) => i.to === path))
  const name = profile ? fullName(profile) : ''

  return (
    <>
      <div className="wrap">
        <header className="top glass enter">
          <Link to="/" className="brand" aria-label="NightShift — panel">
            <span className="brand-mark"><Icon name="martini" size={18} /></span>
            <span className="brand-text"><b>NIGHT</b>SHIFT</span>
          </Link>

          <nav className="seg nav" style={sv({ '--i': active, '--n': items.length })}>
            <span className="seg-ind" />
            {items.map((it) => (
              <Link key={it.to} to={it.to} className={cx('seg-btn', path === it.to && 'on')}
                aria-current={path === it.to ? 'page' : undefined}>
                <Icon name={it.icon} />
                <span>{it.label}</span>
              </Link>
            ))}
          </nav>

          <div className="who">
            <div className="who-text">
              <b>{name}</b>
              <small>{isManager ? 'Menedżer' : 'Barman'}</small>
            </div>
            <Avatar name={name} size={34} />
            <button className="btn icon" title="Wyloguj" aria-label="Wyloguj" onClick={() => logout()}>
              <Icon name="logout" />
            </button>
          </div>
        </header>

        <main key={path} className="view">{children}</main>
      </div>

      {/* Нижнее меню — телефон */}
      <nav className="bottom-nav glass" style={sv({ '--i': active, '--n': items.length })}>
        <span className="bn-ind" />
        {items.map((it) => (
          <Link key={it.to} to={it.to} className={cx('bn-btn', path === it.to && 'on')}>
            <Icon name={it.icon} size={20} />
            <span>{it.label}</span>
          </Link>
        ))}
      </nav>
    </>
  )
}
