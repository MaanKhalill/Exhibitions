import { useState } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Email + password sign-in. Chosen over magic links because email delivery
 * can be slow or blocked in mainland China — with a password you sign in once
 * (ideally before the trip), and the session is cached and auto-refreshed so
 * you rarely have to do it again. The same login on any device shows all your
 * saved data.
 */
export function Auth() {
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    setMsg(null)
    try {
      if (mode === 'up') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setMsg(
          'Account created. If email confirmation is on, check your inbox, then sign in.',
        )
        setMode('in')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="app">
      <div className="center-screen">
        <div style={{ textAlign: 'center' }}>
          <div className="logo-badge">🌏</div>
          <h1 style={{ margin: '4px 0 2px' }}>Exhibition Supplier Intelligence</h1>
          <p className="hint">Plan exhibitions, capture suppliers, and keep every lead — even offline.</p>
        </div>

        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="pw">Password</label>
            <input
              id="pw"
              type="password"
              autoComplete={mode === 'up' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>
          {err && <p className="error">{err}</p>}
          {msg && <p className="hint">{msg}</p>}
          <button className="btn primary block" type="submit" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'in' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <button
          className="btn ghost block"
          onClick={() => {
            setErr(null)
            setMsg(null)
            setMode(mode === 'in' ? 'up' : 'in')
          }}
        >
          {mode === 'in' ? 'New here? Create an account' : 'Already have an account? Sign in'}
        </button>

        <p className="hint" style={{ textAlign: 'center' }}>
          Tip: sign in before you travel so it&apos;s ready to use in the halls.
        </p>
      </div>
    </div>
  )
}
