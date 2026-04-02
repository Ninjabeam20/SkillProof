import { NavLink } from 'react-router-dom'
import clsx from 'clsx'
import { BarChart3, Network, PencilRuler, Target, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, useEffect } from 'react'

const nav = [
  { to: '/', label: 'Resume Input', icon: PencilRuler },
  { to: '/graph', label: 'Knowledge Graph', icon: Network },
  { to: '/results', label: 'Results', icon: BarChart3 },
  { to: '/roadmap', label: 'Roadmap', icon: Target },
]

export function AppShell({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed')
    return saved ? JSON.parse(saved) : false
  })

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(sidebarCollapsed))
  }, [sidebarCollapsed])

  const sidebarWidth = sidebarCollapsed ? 72 : 260

  return (
    <div className="min-h-dvh" style={{ background: 'var(--color-bg-primary)' }}>
      {/* Mobile header */}
      <header className="px-4 pt-4 md:hidden">
        <div
          className="rounded-xl border p-4"
          style={{
            borderColor: 'var(--color-border)',
            background: 'var(--color-bg-secondary)',
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div
                className="text-sm font-semibold tracking-tight"
                style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}
              >
                SkillProof
              </div>
              <div className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                Resume Skill Verifier
              </div>
            </div>
          </div>

          <nav className="mt-4 flex flex-wrap gap-2">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-200"
                style={({ isActive }) => ({
                  borderColor: isActive ? 'var(--color-nav-active-border)' : 'var(--color-border)',
                  background: isActive ? 'var(--color-nav-active-dim)' : 'var(--color-bg-tertiary)',
                  color: isActive ? 'var(--color-nav-active)' : 'var(--color-text-secondary)',
                })}
                end={item.to === '/'}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      {/* Desktop sidebar — fixed */}
      <aside
        className={clsx(
          'fixed top-0 left-0 z-40 hidden h-screen flex-col justify-between border-r transition-all duration-300 ease-in-out md:flex',
        )}
        style={{
          width: sidebarWidth,
          borderColor: 'var(--color-border)',
          background: 'var(--color-bg-secondary)',
        }}
      >
        <div>
          {/* Brand */}
          <div className="flex items-center justify-between gap-2 px-5 py-5">
            <div
              className={clsx(
                'select-none transition-opacity duration-200',
                sidebarCollapsed && 'opacity-0',
              )}
            >
              <div
                className="text-sm font-bold tracking-tight"
                style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}
              >
                SkillProof
              </div>
              <div className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                Resume Skill Verifier
              </div>
            </div>

            {/* Collapse toggle */}
            <button
              type="button"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border transition-all duration-200"
              style={{
                borderColor: 'var(--color-border)',
                background: 'var(--color-bg-tertiary)',
                color: 'var(--color-text-secondary)',
              }}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Nav links */}
          <nav className="mt-6 flex flex-col gap-1 px-3">
            {nav.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className="group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200"
                  style={({ isActive }) => ({
                    background: isActive ? 'var(--color-nav-active-dim)' : 'transparent',
                    color: isActive ? 'var(--color-nav-active)' : 'var(--color-text-secondary)',
                  })}
                  end={item.to === '/'}
                >
                  {({ isActive }) => (
                    <>
                      {/* Electric pink left border indicator */}
                      {isActive && (
                        <span
                          className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full"
                          style={{
                            background: 'var(--color-nav-active)',
                            boxShadow: '0 0 8px var(--color-nav-active), 0 0 16px var(--color-nav-active-dim)',
                          }}
                        />
                      )}
                      <Icon className="h-5 w-5 transition-transform group-hover:scale-110" />
                      <span
                        className={clsx(
                          'truncate transition-opacity duration-200',
                          sidebarCollapsed && 'w-0 overflow-hidden opacity-0',
                        )}
                      >
                        {item.label}
                      </span>
                    </>
                  )}
                </NavLink>
              )
            })}
          </nav>
        </div>

        {/* Bottom info block */}
        <div className="space-y-3 px-3 pb-5">
          <div
            className={clsx(
              'rounded-lg border p-3.5 text-xs transition-opacity duration-200',
              sidebarCollapsed && 'opacity-0',
            )}
            style={{
              borderColor: 'var(--color-border)',
              background: 'var(--color-bg-tertiary)',
              color: 'var(--color-text-secondary)',
            }}
          >
            Every verdict traces to rule thresholds. Deterministic, explainable, transparent.
          </div>
        </div>
      </aside>

      {/* Main content — offset by sidebar width */}
      <main
        className="transition-all duration-300 ease-in-out"
        style={{ marginLeft: `${sidebarWidth}px` }}
      >
        <div className="mx-auto max-w-7xl px-6 py-6">
          {children}
        </div>
      </main>
    </div>
  )
}
