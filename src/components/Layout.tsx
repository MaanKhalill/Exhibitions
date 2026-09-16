import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useExhibitions } from '../lib/ExhibitionContext'
import { EXHIBITION_STATUS_LABELS } from '../types'

function ExhibitionSwitcher() {
  const { exhibitions, current, setCurrentId } = useExhibitions()
  const navigate = useNavigate()
  return (
    <div className="switcher">
      <select
        aria-label="Current exhibition"
        value={current?.id ?? ''}
        onChange={(e) => {
          if (e.target.value === '__manage') {
            navigate('/exhibitions')
            return
          }
          setCurrentId(e.target.value || null)
        }}
      >
        {exhibitions.length === 0 && <option value="">No exhibitions yet</option>}
        {exhibitions.map((e) => (
          <option key={e.id} value={e.id}>
            {e.name} · {e.edition || EXHIBITION_STATUS_LABELS[e.status]}
          </option>
        ))}
        <option value="__manage">＋ Manage exhibitions…</option>
      </select>
    </div>
  )
}

const NAV = [
  { to: '/', label: 'Home', icon: '⌂', end: true },
  { to: '/fair', label: 'Fair', icon: '📋', end: false },
  { to: '/fair/add', label: 'Add', icon: '＋', center: true, end: false },
  { to: '/suppliers', label: 'Directory', icon: '🗂', end: false },
  { to: '/more', label: 'More', icon: '⋯', end: false },
]

export function Layout() {
  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-row">
          <div style={{ flex: 1, minWidth: 0 }}>
            <ExhibitionSwitcher />
          </div>
        </div>
      </header>

      <div className="content with-nav">
        <Outlet />
      </div>

      <nav className="bottomnav">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) =>
              `navitem ${n.center ? 'center' : ''} ${isActive ? 'active' : ''}`
            }
          >
            <span className="ico">{n.icon}</span>
            <span className="lbl">{n.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
