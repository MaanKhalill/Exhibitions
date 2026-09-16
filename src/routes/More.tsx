import { Link, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useExhibitions } from '../lib/ExhibitionContext'
import { Page } from '../components/ui'

interface Item {
  to: string
  label: string
  icon: string
  soon?: boolean
}

const GLOBAL: Item[] = [
  { to: '/exhibitions', label: 'Exhibitions', icon: '🗓' },
  { to: '/suppliers', label: 'Supplier directory', icon: '🗂' },
  { to: '/search', label: 'Global search', icon: '🔎', soon: true },
  { to: '/contacts', label: 'Contacts', icon: '👤', soon: true },
  { to: '/factories', label: 'Factories', icon: '🏭', soon: true },
  { to: '/follow-ups', label: 'Follow-ups', icon: '✅', soon: true },
]

const IN_EXHIBITION: Item[] = [
  { to: '/fair', label: 'Fair suppliers', icon: '📋' },
  { to: '/fair/add', label: 'New supplier capture', icon: '＋' },
  { to: '/invitations', label: 'Invitations & forms', icon: '✉️', soon: true },
  { to: '/planner', label: 'Booth route planner', icon: '🧭', soon: true },
  { to: '/today', label: "Today's route", icon: '📍', soon: true },
  { to: '/factory-plan', label: 'Factory candidates & map', icon: '🗺', soon: true },
  { to: '/daily-review', label: 'Daily review', icon: '🌙', soon: true },
]

function MenuList({ items }: { items: Item[] }) {
  return (
    <div className="menu">
      {items.map((i) => (
        <Link key={i.to} to={i.to} className="menu-item">
          <span className="menu-ico">{i.icon}</span>
          <span style={{ flex: 1 }}>{i.label}</span>
          {i.soon && <span className="badge status-quote">Soon</span>}
          <span className="menu-arrow">›</span>
        </Link>
      ))}
    </div>
  )
}

export function More() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { current } = useExhibitions()

  async function signOut() {
    if (!confirm('Sign out?')) return
    await supabase.auth.signOut()
    qc.clear()
    navigate('/')
  }

  return (
    <Page title="More">
      <h3 className="section-label">Global</h3>
      <MenuList items={GLOBAL} />

      <h3 className="section-label">
        {current ? `Inside ${current.name}` : 'Inside an exhibition'}
      </h3>
      <MenuList items={IN_EXHIBITION} />

      <h3 className="section-label">Account</h3>
      <div className="menu">
        <button className="menu-item" onClick={signOut} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none' }}>
          <span className="menu-ico">🚪</span>
          <span style={{ flex: 1 }}>Sign out</span>
          <span className="menu-arrow">›</span>
        </button>
      </div>
      <p className="hint" style={{ textAlign: 'center', marginTop: 16 }}>
        Multi-Exhibition Supplier Intelligence · Phase 1 · works offline
      </p>
    </Page>
  )
}
