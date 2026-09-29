import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { listParticipations } from '../api/participations'
import { useExhibitions } from '../lib/ExhibitionContext'
import { boothSortKey } from '../lib/booth'
import { PRIORITY_LABELS, VISIT_STATUS_LABELS, type ParticipationWithSupplier } from '../types'
import { telUrl, whatsappUrl } from '../lib/maps'
import { Empty, Page, Spinner } from '../components/ui'
import { ExportMenu } from '../components/ExportMenu'
import { fairSuppliersReport } from '../lib/report'

const btnSmall = { padding: '7px 12px', fontSize: 13 } as const

type FilterKey = 'all' | 'must' | 'confirmed' | 'todo' | 'completed' | 'factory'
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'must', label: 'Must visit' },
  { key: 'confirmed', label: 'Meeting confirmed' },
  { key: 'todo', label: 'Not visited' },
  { key: 'completed', label: 'Completed' },
  { key: 'factory', label: 'Factory candidate' },
]

function match(p: ParticipationWithSupplier, f: FilterKey): boolean {
  switch (f) {
    case 'must': return p.priority === 'must'
    case 'confirmed': return Boolean(p.confirmed_meeting) || p.visit_status === 'confirmed'
    case 'todo': return !['completed', 'skipped', 'cancelled'].includes(p.visit_status)
    case 'completed': return p.visit_status === 'completed'
    case 'factory': return p.factory_candidate
    default: return true
  }
}

type SortKey = 'booth' | 'name'

export function FairSuppliers() {
  const navigate = useNavigate()
  const { current } = useExhibitions()
  const [term, setTerm] = useState('')
  const [filter, setFilter] = useState<FilterKey>('all')
  const [sort, setSort] = useState<SortKey>('booth')

  const { data = [], isLoading } = useQuery({
    queryKey: ['participations', current?.id],
    queryFn: () => listParticipations(current!.id),
    enabled: Boolean(current),
  })

  const rows = useMemo(() => {
    const q = term.trim().toLowerCase()
    return data
      .filter((p) => match(p, filter))
      .filter((p) =>
        !q
          ? true
          : [p.supplier.company_name, p.supplier.product_summary, p.products_shown, p.hall, p.booth]
              .join(' ')
              .toLowerCase()
              .includes(q),
      )
      .sort((a, b) =>
        sort === 'name'
          ? (a.supplier.company_name || '￿').localeCompare(b.supplier.company_name || '￿', undefined, {
              sensitivity: 'base',
            })
          : boothSortKey(a).localeCompare(boothSortKey(b)),
      )
  }, [data, term, filter, sort])

  if (!current) {
    return (
      <Page title="Fair suppliers">
        <Empty icon="🗓" title="No exhibition selected" hint="Pick or create an exhibition from the switcher above." />
      </Page>
    )
  }

  return (
    <Page
      title="Fair suppliers"
      subtitle={`${current.name}${current.edition ? ' · ' + current.edition : ''}`}
      actions={
        <button className="iconbtn dark" aria-label="Add supplier" onClick={() => navigate('/fair/add')}>
          ＋
        </button>
      }
    >
      <div className="searchbar">
        <input placeholder="Search company, product, booth…" value={term} onChange={(e) => setTerm(e.target.value)} />
      </div>
      <div className="chips">
        {FILTERS.map((f) => (
          <button key={f.key} className={`chip ${filter === f.key ? 'active' : ''}`} onClick={() => setFilter(f.key)}>
            {f.label}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '2px 0 12px' }}>
        <span className="hint" style={{ margin: 0 }}>Sort by</span>
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} style={{ flex: 1, maxWidth: 240 }}>
          <option value="booth">Hall &amp; booth number</option>
          <option value="name">Company name (A–Z)</option>
        </select>
      </div>

      {rows.length > 0 && (
        <ExportMenu
          build={() =>
            fairSuppliersReport(rows, {
              title: `Fair suppliers — ${current.name}${current.edition ? ' · ' + current.edition : ''}`,
              subtitle: [
                filter !== 'all' ? FILTERS.find((f) => f.key === filter)?.label : null,
                term.trim() ? `Search: “${term.trim()}”` : null,
                `Sorted by ${sort === 'name' ? 'company name' : 'hall & booth'}`,
              ]
                .filter(Boolean)
                .join(' · '),
              filename: `fair-suppliers-${current.name}`,
            })
          }
        />
      )}

      {isLoading ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <Empty
          icon="📋"
          title={data.length === 0 ? 'No suppliers in this exhibition yet' : 'No matches'}
          hint={data.length === 0 ? 'Tap ＋ to add your first supplier or booth.' : undefined}
        />
      ) : (
        rows.map((p) => {
          const phone = p.supplier.phone || p.booth_contact_phone || ''
          const tel = telUrl(phone)
          const wa = whatsappUrl(phone)
          const contactName = p.booth_contact_name || ''
          return (
            <div key={p.id} className="card" onClick={() => navigate(`/fair/supplier/${p.supplier_id}`)}>
              <div className="card-head">
                <div className="name">{p.supplier.company_name || 'Unnamed'}</div>
                {p.priority === 'must' && <span className="badge status-ordered">Must</span>}
              </div>
              {(p.products_shown || p.supplier.product_summary) && (
                <div className="card-meta"><span>{p.products_shown || p.supplier.product_summary}</span></div>
              )}
              {/* Booth location — the most-used fields, shown clearly */}
              <div className="card-meta">
                {p.hall && <span>🏛 Hall {p.hall}</span>}
                {p.booth && <span>📍 Booth {p.booth}</span>}
                <span>{VISIT_STATUS_LABELS[p.visit_status]}</span>
                {p.priority !== 'must' && p.priority !== 'tbd' && <span>{PRIORITY_LABELS[p.priority]}</span>}
                {p.rating > 0 && <span className="stars">{'★'.repeat(p.rating)}</span>}
                {p.factory_candidate && <span>🏭 Factory</span>}
              </div>
              {/* Contact line */}
              {(phone || p.supplier.wechat || contactName) && (
                <div className="card-meta">
                  {contactName && <span>👤 {contactName}</span>}
                  {phone && <span>📞 {phone}</span>}
                  {p.supplier.wechat && <span>💬 WeChat {p.supplier.wechat}</span>}
                </div>
              )}
              {/* Quick actions — don't trigger the card's own navigation */}
              <div
                className="card-meta"
                style={{ gap: 8, marginTop: 8 }}
                onClick={(e) => e.stopPropagation()}
              >
                <Link className="btn" style={btnSmall} to={`/suppliers/${p.supplier_id}`}>
                  📇 Full contact details
                </Link>
                {tel && <a className="btn" style={btnSmall} href={tel}>📞 Call</a>}
                {wa && (
                  <a className="btn" style={btnSmall} href={wa} target="_blank" rel="noreferrer">
                    💬 WhatsApp
                  </a>
                )}
              </div>
            </div>
          )
        })
      )}
    </Page>
  )
}
