import { useState } from 'react'
import { exportReportPdf, exportReportWord, reportHasContent, type ReportData, type ReportStyle } from '../lib/report'

type Kind = 'pdf' | 'word' | 'print'

/**
 * Export / print bar for a list. `build(style)` is called at click time so the
 * export always reflects the current filter / search / sort. Produces a
 * page-numbered PDF or Word (.doc), or sends the numbered PDF to the printer,
 * each with the export date & time in the footer. When `styles` holds more than
 * one option, a small selector lets the user pick the layout (e.g. a table of
 * essential fields vs. a detailed paragraph block per exhibitor).
 */
export function ExportMenu({
  build,
  label = 'Export',
  styles,
}: {
  build: (style: ReportStyle) => ReportData
  label?: string
  styles?: { key: ReportStyle; label: string }[]
}) {
  const [busy, setBusy] = useState<Kind | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [style, setStyle] = useState<ReportStyle>(styles?.[0]?.key ?? 'table')

  async function run(kind: Kind) {
    setErr(null)
    setBusy(kind)
    try {
      const data = build(style)
      if (!reportHasContent(data)) {
        setErr('Nothing to export — the list is empty.')
        return
      }
      if (kind === 'word') await exportReportWord(data)
      else await exportReportPdf(data, { print: kind === 'print' })
    } catch (e) {
      setErr(`Export failed. ${e instanceof Error ? e.message : ''}`.trim())
    } finally {
      setBusy(null)
    }
  }

  return (
    <div style={{ margin: '0 0 12px' }}>
      {styles && styles.length > 1 && (
        <div className="chips" style={{ marginBottom: 8 }}>
          {styles.map((s) => (
            <button
              key={s.key}
              type="button"
              className={`chip ${style === s.key ? 'active' : ''}`}
              onClick={() => setStyle(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <span className="hint" style={{ margin: 0 }}>{label}</span>
        <button type="button" className="btn" disabled={busy !== null} onClick={() => run('pdf')}>
          {busy === 'pdf' ? 'Making PDF…' : '⬇ PDF'}
        </button>
        <button type="button" className="btn" disabled={busy !== null} onClick={() => run('word')}>
          {busy === 'word' ? 'Making Word…' : '⬇ Word'}
        </button>
        <button type="button" className="btn" disabled={busy !== null} onClick={() => run('print')}>
          {busy === 'print' ? 'Preparing…' : '🖨 Print'}
        </button>
        {err && <p className="error" style={{ width: '100%', margin: '2px 0 0' }}>{err}</p>}
      </div>
    </div>
  )
}
