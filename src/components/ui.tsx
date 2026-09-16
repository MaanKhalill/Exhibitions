import { useNavigate } from 'react-router-dom'

export function Page({
  title,
  subtitle,
  back,
  actions,
  children,
}: {
  title: string
  subtitle?: string
  back?: boolean | (() => void)
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  const navigate = useNavigate()
  return (
    <>
      <div className="pagehead">
        {back && (
          <button
            className="iconbtn dark"
            aria-label="Back"
            onClick={() => (typeof back === 'function' ? back() : navigate(-1))}
          >
            ‹
          </button>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="pagetitle">{title}</h1>
          {subtitle && <div className="pagesub">{subtitle}</div>}
        </div>
        {actions}
      </div>
      {children}
    </>
  )
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string
  children: React.ReactNode
  hint?: string
}) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {hint && <div className="hint">{hint}</div>}
    </div>
  )
}

export function Empty({ icon, title, hint }: { icon: string; title: string; hint?: string }) {
  return (
    <div className="empty">
      <div className="big">{icon}</div>
      <p style={{ fontWeight: 600 }}>{title}</p>
      {hint && <p className="hint">{hint}</p>}
    </div>
  )
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="empty">
      <div className="spinner" />
      <p className="hint">{label}</p>
    </div>
  )
}

export function ErrorNote({ error }: { error: unknown }) {
  if (!error) return null
  const msg = error instanceof Error ? error.message : String(error)
  return <p className="error">{msg}</p>
}
