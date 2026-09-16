import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { globalSearch } from '../api/search'
import { Empty, Page, Spinner } from '../components/ui'

export function Search() {
  const [term, setTerm] = useState('')
  const { data = [], isLoading, isFetching } = useQuery({
    queryKey: ['search', term.trim()],
    queryFn: () => globalSearch(term),
    enabled: term.trim().length >= 2,
  })

  return (
    <Page title="Global search" subtitle="Across every exhibition">
      <div className="searchbar">
        <input
          placeholder="Company, product, city, contact, notes…"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          autoFocus
        />
      </div>

      {term.trim().length < 2 ? (
        <Empty
          icon="🔎"
          title="Search your whole knowledge base"
          hint="Find suppliers by company, product description, city, country, website or meeting notes — across all exhibitions and years."
        />
      ) : isLoading || isFetching ? (
        <Spinner />
      ) : data.length === 0 ? (
        <Empty icon="🔍" title="No matches" hint="Try a different word — search covers product text too." />
      ) : (
        <>
          <p className="hint">{data.length} supplier{data.length === 1 ? '' : 's'} found</p>
          {data.map((r) => (
            <Link key={r.supplier.id} className="card" to={`/suppliers/${r.supplier.id}`}>
              <div className="card-head">
                <div className="name">{r.supplier.company_name}</div>
              </div>
              {r.snippet && <div className="card-meta"><span>{r.snippet}</span></div>}
              <div className="card-meta">
                {(r.supplier.city || r.supplier.country) && <span>📍 {[r.supplier.city, r.supplier.country].filter(Boolean).join(', ')}</span>}
              </div>
              {r.exhibitions.length > 0 && (
                <div className="chips" style={{ marginTop: 6, marginBottom: 0 }}>
                  {r.exhibitions.map((e) => (
                    <span key={e.id} className="badge status-sample">{e.name}{e.edition ? ` · ${e.edition}` : ''}</span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </>
      )}
    </Page>
  )
}
