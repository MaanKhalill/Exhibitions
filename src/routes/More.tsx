import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { supabase, isConfigured } from '../lib/supabase'
import { DEMO } from '../lib/demo'
import { useExhibitions } from '../lib/ExhibitionContext'
import { Page } from '../components/ui'

interface Item {
  to: string
  label: string
  icon: string
  soon?: boolean
}

const GLOBAL: Item[] = [
  { to: '/profile', label: 'My profile', icon: '🪪' },
  { to: '/exhibitions', label: 'Exhibitions', icon: '🗓' },
  { to: '/suppliers', label: 'Supplier directory', icon: '🗂' },
  { to: '/search', label: 'Global search', icon: '🔎' },
  { to: '/contacts', label: 'Contacts', icon: '👤' },
  { to: '/follow-ups', label: 'Follow-ups', icon: '✅' },
  { to: '/analytics', label: 'Analytics', icon: '📊' },
]

const IN_EXHIBITION: Item[] = [
  { to: '/fair', label: 'Fair suppliers', icon: '📋' },
  { to: '/fair/add', label: 'New supplier capture', icon: '＋' },
  { to: '/invitations', label: 'Invitations & forms', icon: '✉️' },
  { to: '/planner', label: 'Booth route planner', icon: '🧭' },
  { to: '/today', label: "Today's route", icon: '📍' },
  { to: '/factory-plan', label: 'Factory candidates & map', icon: '🗺' },
  { to: '/daily-review', label: 'Daily review', icon: '🌙' },
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

function buildStamp(): string {
  try {
    const d = new Date(__BUILD_TIME__)
    if (isNaN(d.getTime())) return 'dev'
    const p = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
  } catch {
    return 'dev'
  }
}

async function wipeCaches() {
  // Clears the offline app cache and service worker so the newest version is
  // fetched — keeps you signed in and keeps any unsynced captures (localStorage).
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map((r) => r.unregister()))
    }
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
    }
  } catch {
    /* best effort */
  }
  window.location.reload()
}

export function More() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { current } = useExhibitions()
  const [clearOpen, setClearOpen] = useState(false)
  const [pw, setPw] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function signOut() {
    if (!confirm('Sign out?')) return
    await supabase.auth.signOut()
    qc.clear()
    navigate('/')
  }

  async function confirmClear() {
    setBusy(true)
    setErr(null)
    try {
      // Verify the account password before clearing (skipped in the demo build).
      if (isConfigured && !DEMO) {
        const { data } = await supabase.auth.getUser()
        const email = data.user?.email
        if (!email) throw new Error('Not signed in')
        const { error } = await supabase.auth.signInWithPassword({ email, password: pw })
        if (error) {
          setErr('Incorrect password')
          setBusy(false)
          return
        }
      }
      await wipeCaches() // reloads the page
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not verify password')
      setBusy(false)
    }
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
        <button
          className="menu-item"
          onClick={() => { setPw(''); setErr(null); setClearOpen(true) }}
          style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none' }}
        >
          <span className="menu-ico">🧹</span>
          <span style={{ flex: 1 }}>Clear cache &amp; reload</span>
          <span className="menu-arrow">›</span>
        </button>
        <button className="menu-item" onClick={signOut} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none' }}>
          <span className="menu-ico">🚪</span>
          <span style={{ flex: 1 }}>Sign out</span>
          <span className="menu-arrow">›</span>
        </button>
      </div>
      <p className="hint" style={{ textAlign: 'center', marginTop: 16 }}>
        Multi-Exhibition Supplier Intelligence · works offline
        <br />
        <span style={{ fontSize: 12 }}>Build {buildStamp()}</span>
      </p>

      {clearOpen && (
        <div className="overlay" onClick={() => !busy && setClearOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Clear cache &amp; reload</h3>
            <p className="hint" style={{ marginTop: 0 }}>
              Forces the app to fetch the newest version. You stay signed in and no data is lost.
              Enter your password to confirm.
            </p>
            <div className="field">
              <label>Password</label>
              <input
                type="password"
                value={pw}
                autoFocus
                onChange={(e) => { setPw(e.target.value); setErr(null) }}
                onKeyDown={(e) => { if (e.key === 'Enter' && pw) confirmClear() }}
                placeholder="Your account password"
                autoComplete="current-password"
              />
            </div>
            {err && <p className="error" style={{ marginTop: 0 }}>{err}</p>}
            <div className="actions">
              <button className="btn" onClick={() => setClearOpen(false)} disabled={busy}>Cancel</button>
              <button className="btn primary" onClick={confirmClear} disabled={busy || !pw}>
                {busy ? 'Clearing…' : 'Clear cache'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Page>
  )
}
