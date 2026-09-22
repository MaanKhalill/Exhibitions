import { useState } from 'react'
import { exportReportPdf, exportReportWord, type ReportData } from '../lib/report'

type Kind = 'pdf' | 'word' | 'print'

/**
 * Export / print bar for a list. `build()` is called at click time so the
 * export always reflects the current filter / search / sort. Produces a
 * page-numbered PDF or Word (.doc) file, or sends the numbered PDF to the
 * printer — each with the export date & time in the footer.
 */
export function ExportMenu({ build, label = 'Export' }: { build: () => ReportData; label?: string }) {
  const [busy, setBusy] = useState<Kind | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function run(kind: Kind) {
    setErr(null)
    setBusy(kind)
    try {
      const data = build()
      if (!data.rows.length) {
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
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', margin: '0 0 12px' }}>
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
  )
}
