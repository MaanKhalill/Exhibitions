import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { listSuppliers } from '../api/suppliers'
import { Empty, Page, Spinner } from '../components/ui'
import { ExportMenu } from '../components/ExportMenu'
import { suppliersReport } from '../lib/report'

type SortKey = 'name' | 'city'

export function SuppliersList() {
  const navigate = useNavigate()
  const [term, setTerm] = useState('')
  const [sort, setSort] = useState<SortKey>('name')
  const { data = [], isLoading } = useQuery({
    queryKey: ['suppliers', term],
    queryFn: () => listSuppliers(term),
  })

  const rows = useMemo(() => {
    const byName = (a: string, b: string) => (a || '￿').localeCompare(b || '￿', undefined, { sensitivity: 'base' })
    return [...data].sort((a, b) =>
      sort === 'city'
        ? byName([a.city, a.country].filter(Boolean).join(', '), [b.city, b.country].filter(Boolean).join(', ')) ||
          byName(a.company_name, b.company_name)
        : byName(a.company_name, b.company_name),
    )
  }, [data, sort])

  return (
    <Page
      title="Supplier directory"
      subtitle="All suppliers, across every exhibition"
      actions={
        <button className="iconbtn dark" aria-label="New supplier" onClick={() => navigate('/suppliers/new')}>
          ＋
        </button>
      }
    >
      <div className="searchbar">
        <input
          placeholder="Search company, product, city, website…"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '2px 0 12px' }}>
        <span className="hint" style={{ margin: 0 }}>Sort by</span>
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} style={{ flex: 1, maxWidth: 240 }}>
          <option value="name">Company name (A–Z)</option>
          <option value="city">Location (city)</option>
        </select>
      </div>

      {rows.length > 0 && (
        <ExportMenu
          build={() =>
            suppliersReport(rows, {
              title: 'Supplier directory',
              subtitle: term.trim() ? `Search: “${term.trim()}”` : 'All suppliers, across every exhibition',
              filename: `suppliers${term.trim() ? '-search' : ''}`,
            })
          }
        />
      )}

      {isLoading ? (
        <Spinner />
      ) : data.length === 0 ? (
        <Empty
          icon="🗂"
          title={term ? 'No matches' : 'No suppliers yet'}
          hint={term ? 'Try a different search.' : 'Suppliers you add at any exhibition appear here permanently.'}
        />
      ) : (
        rows.map((s) => (
          <Link key={s.id} className="card" to={`/suppliers/${s.id}`}>
            <div className="card-head">
              <div className="name">{s.company_name || 'Unnamed supplier'}</div>
            </div>
            {s.product_summary && <div className="card-meta"><span>{s.product_summary}</span></div>}
            <div className="card-meta">
              {(s.city || s.country) && <span>📍 {[s.city, s.country].filter(Boolean).join(', ')}</span>}
              {s.website && <span>🌐 {s.domain || s.website}</span>}
            </div>
          </Link>
        ))
      )}
    </Page>
  )
}
