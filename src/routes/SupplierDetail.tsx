import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deleteSupplier, getSupplier } from '../api/suppliers'
import { listContactsForSupplier } from '../api/contacts'
import { listParticipationsForSupplier } from '../api/participations'
import { useExhibitions } from '../lib/ExhibitionContext'
import { PRIORITY_LABELS, VISIT_STATUS_LABELS } from '../types'
import { Page, Spinner } from '../components/ui'

function Row({ k, v, href }: { k: string; v: string; href?: string }) {
  if (!v) return null
  return (
    <div className="kv">
      <span className="k">{k}</span>
      <span className="v">{href ? <a href={href}>{v}</a> : v}</span>
    </div>
  )
}

export function SupplierDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { exhibitions, setCurrentId } = useExhibitions()

  const { data: s, isLoading } = useQuery({ queryKey: ['supplier', id], queryFn: () => getSupplier(id!), enabled: Boolean(id) })
  const { data: contacts = [] } = useQuery({ queryKey: ['contacts', id], queryFn: () => listContactsForSupplier(id!), enabled: Boolean(id) })
  const { data: parts = [] } = useQuery({ queryKey: ['supplier-parts', id], queryFn: () => listParticipationsForSupplier(id!), enabled: Boolean(id) })

  const del = useMutation({
    mutationFn: () => deleteSupplier(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      navigate('/suppliers', { replace: true })
    },
  })

  if (isLoading) return <Spinner />
  if (!s) return <Page title="Not found" back><p className="hint">This supplier no longer exists.</p></Page>

  const exName = (exId: string) => {
    const e = exhibitions.find((x) => x.id === exId)
    return e ? `${e.name}${e.edition ? ' · ' + e.edition : ''}` : 'Exhibition'
  }
  const tel = s.phone ? `tel:${s.phone.replace(/\s+/g, '')}` : undefined
  const mail = s.email ? `mailto:${s.email}` : undefined
  const site = s.website ? (s.website.startsWith('http') ? s.website : `https://${s.website}`) : undefined

  return (
    <Page
      title={s.company_name || 'Supplier'}
      subtitle={[s.city, s.country].filter(Boolean).join(', ')}
      back
      actions={
        <button className="iconbtn dark" aria-label="Edit" onClick={() => navigate(`/suppliers/${s.id}/edit`)}>
          ✎
        </button>
      }
    >
      {(tel || mail) && (
        <div className="actions" style={{ marginBottom: 12 }}>
          {tel && <a className="btn" href={tel}>📞 Call</a>}
          {mail && <a className="btn" href={mail}>✉️ Email</a>}
          {site && <a className="btn" href={site} target="_blank" rel="noreferrer">🌐 Web</a>}
        </div>
      )}

      {s.product_summary && (
        <div className="detail-section">
          <h3>Products</h3>
          <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{s.product_summary}</p>
        </div>
      )}

      <div className="detail-section">
        <h3>Company</h3>
        <Row k="Website" v={s.domain || s.website} href={site} />
        <Row k="Phone" v={s.phone} href={tel} />
        <Row k="WeChat" v={s.wechat} />
        <Row k="Email" v={s.email} href={mail} />
        <Row k="Address" v={s.address} />
        <Row k="Also known as" v={s.aliases} />
      </div>

      {s.notes && (
        <div className="detail-section">
          <h3>Notes</h3>
          <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{s.notes}</p>
        </div>
      )}

      <div className="detail-section">
        <h3>Exhibition history ({parts.length})</h3>
        {parts.length === 0 && <p className="hint">Not linked to any exhibition yet.</p>}
        {parts.map((p) => (
          <div
            key={p.id}
            className="timeline-item"
            onClick={() => {
              setCurrentId(p.exhibition_id)
              navigate(`/fair/supplier/${p.supplier_id}`)
            }}
          >
            <div style={{ fontWeight: 600 }}>{exName(p.exhibition_id)}</div>
            <div className="card-meta">
              {p.hall && <span>🏛 Hall {p.hall}</span>}
              {p.booth && <span>📍 {p.booth}</span>}
              <span>{PRIORITY_LABELS[p.priority]}</span>
              <span>{VISIT_STATUS_LABELS[p.visit_status]}</span>
              {p.rating > 0 && <span>{'★'.repeat(p.rating)}</span>}
            </div>
          </div>
        ))}
      </div>

      {contacts.length > 0 && (
        <div className="detail-section">
          <h3>Contacts ({contacts.length})</h3>
          {contacts.map((c) => (
            <div key={c.id} className="kv">
              <span className="k">{c.name}{c.position ? `, ${c.position}` : ''}</span>
              <span className="v">{[c.phone, c.wechat && `WeChat ${c.wechat}`, c.email].filter(Boolean).join(' · ')}</span>
            </div>
          ))}
        </div>
      )}

      <button
        className="btn danger block"
        onClick={() => {
          if (confirm(`Delete "${s.company_name}"? This removes it from all exhibitions and its history.`)) del.mutate()
        }}
        disabled={del.isPending}
      >
        {del.isPending ? 'Deleting…' : 'Delete supplier'}
      </button>
    </Page>
  )
}
