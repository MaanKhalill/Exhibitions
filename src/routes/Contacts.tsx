import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { listAllContacts } from '../api/contacts'
import { Empty, Page, Spinner } from '../components/ui'

export function Contacts() {
  const navigate = useNavigate()
  const [term, setTerm] = useState('')
  const { data = [], isLoading } = useQuery({ queryKey: ['all-contacts'], queryFn: () => listAllContacts() })

  const rows = useMemo(() => {
    const q = term.trim().toLowerCase()
    if (!q) return data
    return data.filter((c) =>
      [c.name, c.position, c.supplier?.company_name, c.phone, c.wechat, c.email].join(' ').toLowerCase().includes(q),
    )
  }, [data, term])

  return (
    <Page title="Contacts" subtitle="People across every supplier">
      <div className="searchbar">
        <input placeholder="Name, company, phone, WeChat…" value={term} onChange={(e) => setTerm(e.target.value)} />
      </div>
      {isLoading ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <Empty icon="👤" title={data.length === 0 ? 'No contacts yet' : 'No matches'} hint={data.length === 0 ? 'Contacts you add to suppliers appear here.' : undefined} />
      ) : (
        rows.map((c) => (
          <div key={c.id} className="card" onClick={() => c.supplier && navigate(`/suppliers/${c.supplier.id}`)}>
            <div className="card-head">
              <div className="name">{c.name || 'Unnamed'}{c.position ? <span className="muted"> · {c.position}</span> : null}</div>
            </div>
            {c.supplier && <div className="card-meta"><span>🏢 {c.supplier.company_name}</span></div>}
            <div className="card-meta">
              {c.phone && <span>📱 {c.phone}</span>}
              {c.wechat && <span>💬 {c.wechat}</span>}
              {c.email && <span>✉️ {c.email}</span>}
            </div>
          </div>
        ))
      )}
    </Page>
  )
}
