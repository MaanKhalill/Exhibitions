import { Page } from '../components/ui'

export function Placeholder({ title, phase, points }: { title: string; phase: string; points: string[] }) {
  return (
    <Page title={title} back>
      <div className="detail-section">
        <span className="badge status-quote">{phase}</span>
        <p className="hint" style={{ marginTop: 10 }}>
          This section is on the roadmap. Planned capabilities:
        </p>
        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
          {points.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </div>
      <p className="hint" style={{ textAlign: 'center' }}>
        The data model already supports this — the screens are being built phase by phase.
      </p>
    </Page>
  )
}
