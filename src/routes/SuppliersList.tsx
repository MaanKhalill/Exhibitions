import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { listSuppliers } from '../api/suppliers'
import { Empty, Page, Spinner } from '../components/ui'

export function SuppliersList() {
  const navigate = useNavigate()
  const [term, setTerm] = useState('')
  const { data = [], isLoading } = useQuery({
    queryKey: ['suppliers', term],
    queryFn: () => listSuppliers(term),
  })

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

      {isLoading ? (
        <Spinner />
      ) : data.length === 0 ? (
        <Empty
          icon="🗂"
          title={term ? 'No matches' : 'No suppliers yet'}
          hint={term ? 'Try a different search.' : 'Suppliers you add at any exhibition appear here permanently.'}
        />
      ) : (
        data.map((s) => (
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
