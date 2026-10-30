import { lazy, Suspense, useEffect, useState, type ComponentType, type LazyExoticComponent, type ReactNode } from 'react'
import Layout, { navItems } from './components/Layout'
import { Background, Icon, useSpotlight } from './components/ui'
import { navigate, usePath } from './lib/router'
import { useAuth } from './features/auth/AuthContext'
import AuthPage from './features/auth/AuthPage'
import { DataProvider } from './features/data/DataContext'

// Каждая страница — отдельный чанк, грузится только при первом открытии
const PAGES: Record<string, LazyExoticComponent<ComponentType>> = {
  '/': lazy(() => import('./features/dashboard/DashboardPage')),
  '/calendar': lazy(() => import('./features/calendar/CalendarPage')),
  '/schedule': lazy(() => import('./features/schedule/SchedulePage')),
  '/bartenders': lazy(() => import('./features/bartenders/BartendersPage')),
  '/settings': lazy(() => import('./features/settings/SettingsPage')),
}

function Splash({ text = 'Ładowanie…' }: { text?: string }) {
  return (
    <div className="splash">
      <div className="splash-mark"><Icon name="martini" size={28} /></div>
      <p>{text}</p>
    </div>
  )
}

/** Профиль создаётся сразу после регистрации; если он так и не появился — показываем выход */
function MissingProfile() {
  const { logout } = useAuth()
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 5000)
    return () => clearTimeout(t)
  }, [])
  if (!slow) return <Splash text="Ładowanie profilu…" />
  return (
    <div className="splash">
      <div className="splash-mark still"><Icon name="alert" size={28} /></div>
      <p className="splash-text">
        Nie znaleziono profilu użytkownika. Wyloguj się i zarejestruj ponownie albo skontaktuj się z menedżerem.
      </p>
      <button className="btn ghost" onClick={() => logout()}>Wyloguj</button>
    </div>
  )
}

function Routes() {
  const { isManager } = useAuth()
  const path = usePath()
  const allowed = navItems(isManager).some((i) => i.to === path)

  useEffect(() => {
    if (!allowed) navigate('/', true)
  }, [allowed])

  const Page = PAGES[allowed ? path : '/']
  return (
    <Suspense fallback={<div className="glass skeleton" />}>
      <Page />
    </Suspense>
  )
}

export default function App() {
  const { user, profile, loading } = useAuth()
  useSpotlight()

  let content: ReactNode
  if (loading) content = <Splash />
  else if (!user) content = <AuthPage />
  else if (!profile) content = <MissingProfile />
  else
    content = (
      <DataProvider>
        <Layout>
          <Routes />
        </Layout>
      </DataProvider>
    )

  return (
    <>
      <Background />
      {content}
    </>
  )
}
