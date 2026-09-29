import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deleteSupplier, getSupplier } from '../api/suppliers'
import { listContactsForSupplier } from '../api/contacts'
import { listParticipationsForSupplier } from '../api/participations'
import { useExhibitions } from '../lib/ExhibitionContext'
import { PRIORITY_LABELS, VISIT_STATUS_LABELS, type Contact } from '../types'
import { mailUrl, mapSearchUrl, siteUrl, telUrl, whatsappUrl } from '../lib/maps'
import { Page, Spinner } from '../components/ui'
import { SupplierUpdateRequest } from '../components/SupplierUpdateRequest'
import { WeChatLink } from '../components/WeChatLink'

/** A labelled row whose value is a WeChat ID that opens the WeChat app. */
function WeChatRow({ id }: { id: string }) {
  if (!id) return null
  return (
    <div className="kv">
      <span className="k">WeChat</span>
      <span className="v"><WeChatLink id={id} /></span>
    </div>
  )
}

/** One labelled contact line. `href` makes the value a link; `map` adds a map link. */
function Row({ k, v, href, map, external }: { k: string; v: string; href?: string; map?: string; external?: boolean }) {
  if (!v) return null
  return (
    <div className="kv">
      <span className="k">{k}</span>
      <span className="v">
        {href ? (
          <a href={href} {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}>
            {v}
          </a>
        ) : (
          v
        )}
        {map && (
          <>
            {'  '}
            <a href={map} target="_blank" rel="noreferrer" className="maplink">📍 Map</a>
          </>
        )}
      </span>
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

  const tel = telUrl(s.phone)
  const wa = whatsappUrl(s.phone)
  const mail = mailUrl(s.email)
  const site = siteUrl(s.website)
  const map = mapSearchUrl(s.address, s.city, s.country)

  // The contacts list holds the current details of each person — most recently
  // updated first, so the top one is the latest primary contact.
  const people = [...contacts].sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''))
  const primary = people[0] ?? null
  const others = people.slice(1)

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
      {(tel || wa || mail || site) && (
        <div className="actions" style={{ marginBottom: 12, flexWrap: 'wrap' }}>
          {tel && <a className="btn" href={tel}>📞 Call</a>}
          {wa && <a className="btn" href={wa} target="_blank" rel="noreferrer">💬 WhatsApp</a>}
          {mail && <a className="btn" href={mail}>✉️ Email</a>}
          {site && <a className="btn" href={site} target="_blank" rel="noreferrer">🌐 Web</a>}
        </div>
      )}

      <div className="detail-section">
        <h3>Company contact</h3>
        <Row k="Phone" v={s.phone} href={tel} />
        <Row k="WhatsApp" v={wa ? s.phone : ''} href={wa} external />
        <WeChatRow id={s.wechat} />
        <Row k="Email" v={s.email} href={mail} />
        <Row k="Website" v={s.domain || s.website} href={site} external />
        <Row k="Address" v={s.address} map={map} />
        {!s.address && (s.city || s.country) && (
          <Row k="Location" v={[s.city, s.country].filter(Boolean).join(', ')} map={map} />
        )}
        <Row k="Also known as" v={s.aliases} />
      </div>

      {primary && <ContactCard title={others.length ? 'Primary contact' : 'Contact person'} c={primary} />}
      {others.map((c) => (
        <ContactCard key={c.id} title="Contact person" c={c} />
      ))}

      {s.product_summary && (
        <div className="detail-section">
          <h3>Products</h3>
          <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{s.product_summary}</p>
        </div>
      )}

      {s.notes && (
        <div className="detail-section">
          <h3>Notes</h3>
          <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{s.notes}</p>
        </div>
      )}

      <SupplierUpdateRequest
        supplier={s}
        contact={primary}
        exhibitionId={parts[0]?.exhibition_id ?? null}
      />

      <div className="detail-section">
        <h3>Seen at exhibitions ({parts.length})</h3>
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

      <button
        className="btn danger block"
        onClick={() => {
          if (confirm(`Delete "${s.company_name}"? This removes it from all exhibitions.`)) del.mutate()
        }}
        disabled={del.isPending}
      >
        {del.isPending ? 'Deleting…' : 'Delete supplier'}
      </button>
    </Page>
  )
}

/** A clean, labelled block for one contact person (their current details). */
function ContactCard({ title, c }: { title: string; c: Contact }) {
  const tel = telUrl(c.phone)
  const wa = whatsappUrl(c.phone)
  const mail = mailUrl(c.email)
  return (
    <div className="detail-section">
      <h3>{title}</h3>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>
        {c.name || '—'}
        {c.position ? <span className="hint" style={{ fontWeight: 400 }}> · {c.position}</span> : null}
      </div>
      <Row k="Phone" v={c.phone} href={tel} />
      <Row k="WhatsApp" v={wa ? c.phone : ''} href={wa} external />
      <WeChatRow id={c.wechat} />
      <Row k="Email" v={c.email} href={mail} />
      {c.notes && <Row k="Notes" v={c.notes} />}
    </div>
  )
}
