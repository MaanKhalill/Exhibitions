import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listSuppliers } from '../api/suppliers'
import { listAllParticipations } from '../api/participations'
import { listFactories } from '../api/factories'
import { listAllContacts } from '../api/contacts'
import { listExhibitions } from '../api/exhibitions'
import { useExhibitions } from '../lib/ExhibitionContext'
import { Field, Page, Spinner } from '../components/ui'
import { ExportMenu } from '../components/ExportMenu'
import {
  assembleRecords,
  applyScope,
  buildCustomReport,
  DEFAULT_FIELD_IDS,
  FIELD_BY_ID,
  FIELDS,
  FIELDS_BY_GROUP,
  GROUP_LABELS,
  GROUP_ORDER,
  SCOPE_LABELS,
  type ReportScope,
} from '../lib/reportFields'

const STORE_KEY = 'report-builder-v1'

interface Saved {
  title?: string
  scope?: ReportScope
  fields?: string[]
  sortId?: string
  desc?: boolean
}

function loadSaved(): Saved {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || '{}') as Saved
  } catch {
    return {}
  }
}

export function ReportBuilder() {
  const { current } = useExhibitions()
  const saved = useMemo(loadSaved, [])

  const [title, setTitle] = useState(saved.title || 'Custom supplier report')
  const [scope, setScope] = useState<ReportScope>(saved.scope || 'all')
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(saved.fields && saved.fields.length ? saved.fields : DEFAULT_FIELD_IDS),
  )
  const [sortId, setSortId] = useState<string>(saved.sortId || 'supplier.company_name')
  const [desc, setDesc] = useState<boolean>(Boolean(saved.desc))

  // Remember the last configuration.
  useEffect(() => {
    try {
      localStorage.setItem(
        STORE_KEY,
        JSON.stringify({ title, scope, fields: [...selected], sortId, desc } satisfies Saved),
      )
    } catch {
      /* ignore */
    }
  }, [title, scope, selected, sortId, desc])

  const { data, isLoading } = useQuery({
    queryKey: ['report-sources'],
    queryFn: async () => {
      const [suppliers, participations, factories, contacts, exhibitions] = await Promise.all([
        listSuppliers(),
        listAllParticipations(),
        listFactories(),
        listAllContacts(),
        listExhibitions(),
      ])
      return { suppliers, participations, factories, contacts, exhibitions }
    },
  })

  const records = useMemo(() => {
    if (!data) return []
    const all = assembleRecords({ ...data, currentExhibitionId: current?.id ?? null })
    return applyScope(all, scope, current?.id ?? null)
  }, [data, scope, current?.id])

  // Sort by any field in the databases (it need not be a displayed column).
  const effectiveSort = FIELD_BY_ID.has(sortId) ? sortId : ''
  const subtitle = [
    SCOPE_LABELS[scope],
    effectiveSort ? `Sorted by ${FIELDS.find((f) => f.id === effectiveSort)?.label}${desc ? ' (Z–A)' : ''}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const buildData = () =>
    buildCustomReport(records, selected, {
      title: title.trim() || 'Custom report',
      subtitle,
      filename: title.trim() || 'custom-report',
      sortId: effectiveSort || undefined,
      desc,
    })

  const preview = useMemo(() => buildData(), [records, selected, effectiveSort, desc, title, subtitle])

  function toggle(id: string) {
    setSelected((cur) => {
      const next = new Set(cur)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  function setGroup(ids: string[], on: boolean) {
    setSelected((cur) => {
      const next = new Set(cur)
      ids.forEach((id) => (on ? next.add(id) : next.delete(id)))
      return next
    })
  }

  return (
    <Page title="Custom report" subtitle="Pick any fields, sort, then export or print" back>
      {isLoading ? (
        <Spinner />
      ) : (
        <>
          <Field label="Report title">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Custom supplier report" />
          </Field>

          <Field label="Which suppliers to include">
            <select value={scope} onChange={(e) => setScope(e.target.value as ReportScope)}>
              {(Object.keys(SCOPE_LABELS) as ReportScope[]).map((k) => (
                <option key={k} value={k}>
                  {SCOPE_LABELS[k]}
                </option>
              ))}
            </select>
          </Field>
          {scope === 'current' && !current && (
            <p className="hint" style={{ color: '#b8272c' }}>
              No exhibition is selected — pick one from the switcher, or choose “All suppliers”.
            </p>
          )}

          <h3 className="section-label">Choose fields</h3>
          <p className="hint" style={{ marginTop: 0 }}>
            Grouped by where the data lives. Tick any combination — the columns follow this order.
          </p>

          {GROUP_ORDER.map((g) => {
            const fields = FIELDS_BY_GROUP[g]
            const ids = fields.map((f) => f.id)
            const on = ids.filter((id) => selected.has(id)).length
            return (
              <details key={g} open={on > 0} className="card" style={{ padding: '10px 12px', marginBottom: 8 }}>
                <summary style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 600, flex: 1 }}>{GROUP_LABELS[g]}</span>
                  <span className="hint" style={{ margin: 0 }}>{on}/{ids.length}</span>
                </summary>
                <div style={{ display: 'flex', gap: 8, margin: '8px 0' }}>
                  <button type="button" className="btn" style={{ padding: '4px 10px' }} onClick={() => setGroup(ids, true)}>
                    All
                  </button>
                  <button type="button" className="btn" style={{ padding: '4px 10px' }} onClick={() => setGroup(ids, false)}>
                    None
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '2px 14px' }}>
                  {fields.map((f) => (
                    <label key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 14, padding: '4px 0' }}>
                      <input type="checkbox" checked={selected.has(f.id)} onChange={() => toggle(f.id)} />
                      <span>{f.label}</span>
                    </label>
                  ))}
                </div>
              </details>
            )
          })}

          <h3 className="section-label">Sort & export</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
            <span className="hint" style={{ margin: 0 }}>Sort by</span>
            <select value={effectiveSort} onChange={(e) => setSortId(e.target.value)} style={{ flex: 1, minWidth: 160, maxWidth: 260 }}>
              <option value="">No sorting</option>
              {GROUP_ORDER.map((g) => (
                <optgroup key={g} label={GROUP_LABELS[g]}>
                  {FIELDS_BY_GROUP[g].map((f) => (
                    <option key={f.id} value={f.id}>{f.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <button
              type="button"
              className="btn"
              disabled={!effectiveSort}
              onClick={() => setDesc((d) => !d)}
              title="Toggle ascending / descending"
            >
              {desc ? 'Z → A' : 'A → Z'}
            </button>
          </div>

          <p className="hint" style={{ marginTop: 0 }}>
            {preview.rows.length} row{preview.rows.length === 1 ? '' : 's'} · {selected.size} column{selected.size === 1 ? '' : 's'}
          </p>

          {selected.size === 0 ? (
            <p className="hint" style={{ color: '#b8272c' }}>Select at least one field to build the report.</p>
          ) : records.length === 0 ? (
            <p className="hint">No suppliers match this scope yet.</p>
          ) : (
            <>
              <ExportMenu build={buildData} label="Generate" />
              <PreviewTable columns={preview.columns} rows={preview.rows} />
            </>
          )}
        </>
      )}
    </Page>
  )
}

function PreviewTable({ columns, rows }: { columns: string[]; rows: string[][] }) {
  const shown = rows.slice(0, 15)
  return (
    <div>
      <p className="hint" style={{ marginBottom: 4 }}>
        Preview {shown.length < rows.length ? `(first ${shown.length} of ${rows.length})` : ''}
      </p>
      <div style={{ overflowX: 'auto', border: '1px solid var(--line, #e5e7eb)', borderRadius: 8 }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 12, whiteSpace: 'nowrap' }}>
          <thead>
            <tr>
              {columns.map((c, i) => (
                <th key={i} style={{ textAlign: 'left', padding: '6px 8px', background: '#111827', color: '#fff', position: 'sticky', top: 0 }}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r, ri) => (
              <tr key={ri} style={{ background: ri % 2 ? '#f6f7f8' : '#fff' }}>
                {r.map((cell, ci) => (
                  <td key={ci} style={{ padding: '5px 8px', borderTop: '1px solid #eee', color: '#111', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
