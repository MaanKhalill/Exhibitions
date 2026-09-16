import { STATUS_LABELS, type Product, type Supplier } from '../types'
import { productsFor, removeProduct } from '../lib/store'
import { Stars } from './Stars'
import { ProductThumb } from './ProductThumb'

interface Props {
  supplier: Supplier
  onEdit: () => void
  onAddProduct: () => void
  onEditProduct: (p: Product) => void
  onDelete: () => void
}

function Row({ k, v, href }: { k: string; v: string; href?: string }) {
  if (!v) return null
  return (
    <div className="kv">
      <span className="k">{k}</span>
      <span className="v">{href ? <a href={href}>{v}</a> : v}</span>
    </div>
  )
}

export function SupplierDetail({
  supplier: s,
  onEdit,
  onAddProduct,
  onEditProduct,
  onDelete,
}: Props) {
  const products = productsFor(s.id)
  const tel = s.phone ? `tel:${s.phone.replace(/\s+/g, '')}` : undefined
  const mail = s.email ? `mailto:${s.email}` : undefined
  const site = s.website
    ? s.website.startsWith('http')
      ? s.website
      : `https://${s.website}`
    : undefined

  return (
    <div>
      <div className="detail-section">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: '0 0 4px', fontSize: 20 }}>{s.company_name}</h2>
            {(s.hall || s.booth) && (
              <div className="card-meta" style={{ marginTop: 0 }}>
                {s.hall && <span>🏛 Hall {s.hall}</span>}
                {s.booth && <span>📍 Booth {s.booth}</span>}
              </div>
            )}
          </div>
          <span className={`badge status-${s.status}`}>{STATUS_LABELS[s.status]}</span>
        </div>
        <div style={{ marginTop: 8 }}>
          <Stars value={s.rating} size="lg" />
        </div>
        <div className="actions" style={{ marginTop: 14 }}>
          {tel && (
            <a className="btn" href={tel}>
              📞 Call
            </a>
          )}
          {mail && (
            <a className="btn" href={mail}>
              ✉️ Email
            </a>
          )}
          <button className="btn primary" onClick={onEdit}>
            ✎ Edit
          </button>
        </div>
      </div>

      <div className="detail-section">
        <h3>Contact</h3>
        <Row k="Category" v={s.category} />
        <Row k="Contact" v={s.contact_name} />
        <Row k="WeChat" v={s.wechat} />
        <Row k="Phone" v={s.phone} href={tel} />
        <Row k="Email" v={s.email} href={mail} />
        <Row k="Website" v={s.website} href={site} />
        {!s.category && !s.contact_name && !s.wechat && !s.phone && !s.email && !s.website && (
          <p className="hint">No contact details yet. Tap Edit to add them.</p>
        )}
      </div>

      {s.notes && (
        <div className="detail-section">
          <h3>Notes</h3>
          <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{s.notes}</p>
        </div>
      )}

      <div className="detail-section">
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, flex: 1 }}>Products ({products.length})</h3>
          <button className="btn ghost" onClick={onAddProduct} style={{ padding: '6px 10px' }}>
            + Add
          </button>
        </div>
        {products.length === 0 && <p className="hint">No products logged yet.</p>}
        {products.map((p) => (
          <div className="product" key={p.id} onClick={() => onEditProduct(p)}>
            <ProductThumb product={p} />
            <div className="p-body">
              <div className="p-name">{p.name}</div>
              <div className="p-meta">
                {[
                  p.model,
                  p.moq && `MOQ ${p.moq}`,
                  p.unit_price && `${p.unit_price} ${p.currency}`,
                ]
                  .filter(Boolean)
                  .join(' · ') || 'Tap to add details'}
              </div>
            </div>
            <button
              className="iconbtn"
              style={{ background: 'transparent', color: 'var(--muted)' }}
              onClick={(e) => {
                e.stopPropagation()
                if (confirm(`Delete product "${p.name}"?`)) removeProduct(p.id)
              }}
              aria-label="Delete product"
            >
              🗑
            </button>
          </div>
        ))}
      </div>

      <button className="btn danger block" onClick={onDelete} style={{ marginTop: 4 }}>
        Delete supplier
      </button>
    </div>
  )
}
