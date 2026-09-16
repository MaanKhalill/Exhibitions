import { useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { isConfigured, supabase } from './lib/supabase'
import {
  clearLocalData,
  flush,
  getSupplier,
  markLoaded,
  productsFor,
  refreshFromServer,
  removeSupplier,
} from './lib/store'
import { useStore } from './lib/useStore'
import { STATUS_LABELS, type Product, type Supplier } from './types'
import { downloadCsv, suppliersToCsv } from './lib/export'
import { Auth } from './components/Auth'
import { SetupNeeded } from './components/SetupNeeded'
import { SupplierForm } from './components/SupplierForm'
import { SupplierDetail } from './components/SupplierDetail'
import { ProductForm } from './components/ProductForm'
import { Stars } from './components/Stars'

type View =
  | { name: 'list' }
  | { name: 'detail'; id: string }
  | { name: 'editSupplier'; id: string | null }
  | { name: 'product'; supplierId: string; product: Product | null }
  | { name: 'settings' }

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    if (!isConfigured) {
      setAuthReady(true)
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session) {
      refreshFromServer()
    }
  }, [session])

  if (!isConfigured) return <SetupNeeded />
  if (!authReady) return <Splash />
  if (!session) return <Auth />
  return <Main />
}

function Splash() {
  return (
    <div className="app">
      <div className="center-screen" style={{ textAlign: 'center' }}>
        <div className="logo-badge">🛍️</div>
        <p className="hint">Loading…</p>
      </div>
    </div>
  )
}

function Main() {
  const state = useStore()
  const [view, setView] = useState<View>({ name: 'list' })
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>('')

  useEffect(() => {
    // In case the initial server refresh set nothing, ensure loaded flips.
    if (!state.loaded) markLoaded()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const categories = useMemo(() => {
    const set = new Set<string>()
    for (const s of state.suppliers) if (s.category) set.add(s.category)
    return Array.from(set).sort()
  }, [state.suppliers])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return state.suppliers.filter((s) => {
      if (category && s.category !== category) return false
      if (!q) return true
      return [
        s.company_name,
        s.contact_name,
        s.hall,
        s.booth,
        s.category,
        s.wechat,
        s.notes,
      ]
        .join(' ')
        .toLowerCase()
        .includes(q)
    })
  }, [state.suppliers, query, category])

  function exportCsv() {
    const csv = suppliersToCsv(state.suppliers, state.products)
    const date = new Date().toISOString().slice(0, 10)
    downloadCsv(`canton-fair-${date}.csv`, csv)
  }

  // ---- sub views ----
  if (view.name === 'editSupplier') {
    const initial = view.id ? getSupplier(view.id) : undefined
    return (
      <Screen
        title={view.id ? 'Edit supplier' : 'New supplier'}
        onBack={() => setView(view.id ? { name: 'detail', id: view.id } : { name: 'list' })}
      >
        <SupplierForm
          initial={initial}
          onDone={(id) => setView({ name: 'detail', id })}
          onCancel={() =>
            setView(view.id ? { name: 'detail', id: view.id } : { name: 'list' })
          }
        />
      </Screen>
    )
  }

  if (view.name === 'product') {
    return (
      <Screen title={view.product ? 'Edit product' : 'Add product'} onBack={() => setView({ name: 'detail', id: view.supplierId })}>
        <ProductForm
          supplierId={view.supplierId}
          initial={view.product ?? undefined}
          onDone={() => setView({ name: 'detail', id: view.supplierId })}
          onCancel={() => setView({ name: 'detail', id: view.supplierId })}
        />
      </Screen>
    )
  }

  if (view.name === 'detail') {
    const s = getSupplier(view.id)
    if (!s) return <Screen title="Not found" onBack={() => setView({ name: 'list' })}><p className="hint">This supplier was removed.</p></Screen>
    return (
      <Screen title="Supplier" onBack={() => setView({ name: 'list' })}>
        <SupplierDetail
          supplier={s}
          onEdit={() => setView({ name: 'editSupplier', id: s.id })}
          onAddProduct={() => setView({ name: 'product', supplierId: s.id, product: null })}
          onEditProduct={(p) => setView({ name: 'product', supplierId: s.id, product: p })}
          onDelete={() => {
            if (confirm(`Delete "${s.company_name}" and its ${productsFor(s.id).length} product(s)?`)) {
              removeSupplier(s.id)
              setView({ name: 'list' })
            }
          }}
        />
      </Screen>
    )
  }

  if (view.name === 'settings') {
    return (
      <Screen title="Settings" onBack={() => setView({ name: 'list' })}>
        <Settings onExport={exportCsv} suppliers={state.suppliers} />
      </Screen>
    )
  }

  // ---- list view ----
  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-row">
          <div style={{ flex: 1 }}>
            <h1>Canton Fair Companion</h1>
            <div className="sub">
              {state.suppliers.length} supplier{state.suppliers.length === 1 ? '' : 's'} saved
            </div>
          </div>
          <button className="iconbtn" onClick={exportCsv} aria-label="Export CSV">
            ⤓
          </button>
          <button
            className="iconbtn"
            onClick={() => setView({ name: 'settings' })}
            aria-label="Settings"
          >
            ⚙
          </button>
        </div>
      </header>

      <SyncBar />

      <div className="content">
        <div className="searchbar">
          <input
            placeholder="Search company, booth, notes…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {categories.length > 0 && (
          <div className="chips">
            <button
              className={`chip ${category === '' ? 'active' : ''}`}
              onClick={() => setCategory('')}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c}
                className={`chip ${category === c ? 'active' : ''}`}
                onClick={() => setCategory(category === c ? '' : c)}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="empty">
            <div className="big">🛍️</div>
            {state.suppliers.length === 0 ? (
              <>
                <p>No suppliers yet.</p>
                <p className="hint">
                  Tap the red + button at a booth to capture your first supplier — company,
                  booth number, products and photos.
                </p>
              </>
            ) : (
              <p>No matches. Try a different search or filter.</p>
            )}
          </div>
        ) : (
          filtered.map((s) => (
            <SupplierCard key={s.id} supplier={s} onOpen={() => setView({ name: 'detail', id: s.id })} />
          ))
        )}
      </div>

      <button
        className="fab"
        aria-label="Add supplier"
        onClick={() => setView({ name: 'editSupplier', id: null })}
      >
        +
      </button>
    </div>
  )
}

function SupplierCard({ supplier: s, onOpen }: { supplier: Supplier; onOpen: () => void }) {
  const products = productsFor(s.id)
  return (
    <div className="card" onClick={onOpen}>
      <div className="card-head">
        <div className="name">{s.company_name}</div>
        {s.status !== 'new' && (
          <span className={`badge status-${s.status}`}>{STATUS_LABELS[s.status]}</span>
        )}
      </div>
      <div className="card-meta">
        {s.hall && <span>🏛 Hall {s.hall}</span>}
        {s.booth && <span>📍 {s.booth}</span>}
        {s.category && <span>{s.category}</span>}
        {products.length > 0 && <span>📦 {products.length}</span>}
      </div>
      <Stars value={s.rating} />
    </div>
  )
}

function SyncBar() {
  const state = useStore()
  let label: string
  let cls = ''
  if (state.syncing) {
    label = 'Syncing…'
    cls = 'syncing'
  } else if (!state.online) {
    label = `Offline — ${state.pending} change${state.pending === 1 ? '' : 's'} will sync later`
    cls = 'offline'
  } else if (state.pending > 0) {
    label = `${state.pending} change${state.pending === 1 ? '' : 's'} waiting to sync`
    cls = 'offline'
  } else {
    label = 'All changes saved to your database'
  }
  return (
    <div className="status">
      <span className={`dot ${cls}`} />
      <span style={{ flex: 1 }}>{label}</span>
      {state.online && state.pending > 0 && !state.syncing && (
        <button
          onClick={() => flush()}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--red)',
            font: 'inherit',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Sync now
        </button>
      )}
    </div>
  )
}

function Settings({ onExport, suppliers }: { onExport: () => void; suppliers: Supplier[] }) {
  const [busy, setBusy] = useState(false)
  async function signOut() {
    if (!confirm('Sign out? Un-synced changes stay on this device until you sign back in.')) return
    setBusy(true)
    await refreshFromServer()
    await supabase.auth.signOut()
    clearLocalData()
    setBusy(false)
  }
  return (
    <div>
      <div className="detail-section">
        <h3>Your data</h3>
        <div className="kv">
          <span className="k">Suppliers saved</span>
          <span className="v">{suppliers.length}</span>
        </div>
        <button className="btn primary block" onClick={onExport} style={{ marginTop: 12 }}>
          ⤓ Export everything to CSV / Excel
        </button>
        <p className="hint">
          Opens in Excel, Google Sheets or Numbers — great for sharing with your team after
          the fair.
        </p>
      </div>

      <div className="detail-section">
        <h3>Account</h3>
        <button className="btn danger block" onClick={signOut} disabled={busy}>
          {busy ? 'Signing out…' : 'Sign out'}
        </button>
        <p className="hint">
          Your suppliers are stored in your own database, so signing in on another device
          shows everything again.
        </p>
      </div>

      <p className="hint" style={{ textAlign: 'center' }}>
        Canton Fair Companion · works offline · v0.1
      </p>
    </div>
  )
}

function Screen({
  title,
  onBack,
  children,
}: {
  title: string
  onBack: () => void
  children: React.ReactNode
}) {
  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-row">
          <button className="iconbtn" onClick={onBack} aria-label="Back">
            ‹
          </button>
          <h1>{title}</h1>
        </div>
      </header>
      <div className="content">{children}</div>
    </div>
  )
}
