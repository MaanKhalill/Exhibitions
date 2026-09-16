import { useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useExhibitions } from '../lib/ExhibitionContext'
import { useCaptureQueue } from '../lib/useCaptureQueue'
import { flushCaptures } from '../lib/captureQueue'
import { EXHIBITION_STATUS_LABELS } from '../types'

function CaptureStatus() {
  const q = useCaptureQueue()
  if (q.pending.length === 0 && q.online) return null
  let label: string
  let cls = ''
  if (q.syncing) {
    label = 'Synchronizing captures…'
    cls = 'syncing'
  } else if (!q.online && q.pending.length > 0) {
    label = `Offline — ${q.pending.length} capture${q.pending.length === 1 ? '' : 's'} saved locally`
    cls = 'offline'
  } else if (q.pending.length > 0) {
    label = `${q.pending.length} capture${q.pending.length === 1 ? '' : 's'} to upload`
    cls = 'offline'
  } else {
    label = 'Offline'
    cls = 'offline'
  }
  return (
    <div className="syncbar">
      <span className={`dot ${cls}`} />
      <span style={{ flex: 1 }}>{label}</span>
      {q.online && q.pending.length > 0 && !q.syncing && (
        <button
          onClick={() => flushCaptures()}
          style={{ background: 'none', border: 'none', color: 'var(--red)', font: 'inherit', fontWeight: 600, cursor: 'pointer' }}
        >
          Upload now
        </button>
      )}
    </div>
  )
}

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
  useEffect(() => {
    void flushCaptures()
  }, [])
  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-row">
          <div style={{ flex: 1, minWidth: 0 }}>
            <ExhibitionSwitcher />
          </div>
        </div>
      </header>

      <CaptureStatus />

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
