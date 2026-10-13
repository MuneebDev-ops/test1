import { useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useApp } from '../state/store'
import { Icon, type IconName } from './Icon'
import { Button } from './ui/button'
import { Separator } from './ui/separator'

const NAV: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: '/', label: 'Overview', icon: 'overview', end: true },
  { to: '/transactions', label: 'Transactions', icon: 'transactions' },
  { to: '/alerts', label: 'Alert queue', icon: 'alert' },
  { to: '/investigations', label: 'Investigations', icon: 'cases' },
  { to: '/rules', label: 'Rule controls', icon: 'rules' },
  { to: '/simulator', label: 'Simulator', icon: 'simulator' },
  { to: '/pipeline', label: 'Pipeline', icon: 'pipeline' },
  { to: '/model', label: 'Model insights', icon: 'model' },
]

function crumbFor(pathname: string) {
  if (pathname.startsWith('/transactions')) return 'Transactions'
  const match = NAV.find((item) => item.to === pathname)
  return match?.label ?? 'Overview'
}

export function Shell() {
  const { signOut } = useApp()
  const { pathname } = useLocation()
  const crumb = crumbFor(pathname)

  useEffect(() => {
    document.title = `${crumb} · SentinelGuard`
  }, [crumb])

  return (
    <div className="grid min-h-screen grid-cols-[248px_minmax(0,1fr)]">
      <aside className="sticky top-0 flex h-screen flex-col bg-sidebar px-4 py-5 text-sidebar-foreground">
        <div className="mb-7 flex items-center gap-3 px-2">
          <span className="grid size-9 place-items-center rounded-xl bg-[#1c7a68] text-white">
            <Icon name="shield" />
          </span>
          <span>
            <strong className="block text-[15px] leading-tight text-white">SentinelGuard</strong>
            <small className="text-xs text-[#9aadb6]">Analyst console</small>
          </span>
        </div>
        <p className="mb-2 px-3 text-[11px] font-semibold tracking-[0.16em] text-[#7f939c] uppercase">Workspace</p>
        <nav className="flex flex-col gap-1" aria-label="Workspace">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm no-underline ${
                  isActive ? 'bg-[#1c7a68] font-semibold text-white' : 'text-[#d7e1e6] hover:bg-white/10'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon name={item.icon} />
                  <span className="flex-1">{item.label}</span>
                  {isActive ? <Icon name="chevron" /> : null}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto px-2 pt-4">
          <Separator className="mb-4 bg-white/10" />
          <p className="flex items-center gap-2 text-sm text-white">
            <span className="size-2 rounded-full bg-signal" /> Synthetic environment
          </p>
          <small className="mt-1 block text-xs leading-relaxed text-[#9aadb6]">
            Demo data only. No live financial decisions.
          </small>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background/90 px-7 backdrop-blur">
          <p className="text-sm text-muted-foreground">
            Workspace <span className="px-1">/</span> <strong className="font-semibold text-foreground">{crumb}</strong>
          </p>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm text-foreground">
              <Icon name="eye" /> Demo environment
            </span>
            <div className="flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-full bg-sidebar text-xs font-semibold text-white">MC</span>
              <span className="leading-tight">
                <strong className="block text-sm">Maya Chen</strong>
                <small className="text-xs text-muted-foreground">Admin</small>
              </span>
            </div>
            <Button variant="outline" size="sm" onClick={signOut}>
              Sign out
            </Button>
          </div>
        </header>
        <div className="px-7 py-6">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
