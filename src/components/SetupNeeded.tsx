export function SetupNeeded() {
  return (
    <div className="app">
      <div className="center-screen">
        <div style={{ textAlign: 'center' }}>
          <div className="logo-badge">🛠️</div>
          <h1 style={{ marginBottom: 4 }}>Almost there</h1>
        </div>
        <p className="hint">
          This app needs its Supabase connection details before it can store your data.
          Create a <code>.env</code> file in the project root with:
        </p>
        <pre
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 14,
            fontSize: 13,
            overflowX: 'auto',
          }}
        >
{`VITE_SUPABASE_URL=https://YOUR-ref.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-publishable-key`}
        </pre>
        <p className="hint">
          Then restart the dev server (or rebuild). See <code>README.md</code> for the full
          setup, including the database schema.
        </p>
      </div>
    </div>
  )
}
