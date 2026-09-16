import { useState } from 'react'
import { CATEGORIES, STATUS_LABELS, newSupplier, type Supplier, type SupplierStatus } from '../types'
import { saveSupplier } from '../lib/store'
import { Stars } from './Stars'

interface Props {
  initial?: Supplier
  onDone: (id: string) => void
  onCancel: () => void
}

export function SupplierForm({ initial, onDone, onCancel }: Props) {
  const [s, setS] = useState<Supplier>(initial ?? newSupplier())
  const set = <K extends keyof Supplier>(k: K, v: Supplier[K]) =>
    setS((prev) => ({ ...prev, [k]: v }))

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!s.company_name.trim()) {
      set('company_name', s.company_name.trim())
      return
    }
    saveSupplier({ ...s, company_name: s.company_name.trim() })
    onDone(s.id)
  }

  return (
    <form onSubmit={submit}>
      <div className="field">
        <label htmlFor="company">Company / booth name *</label>
        <input
          id="company"
          value={s.company_name}
          onChange={(e) => set('company_name', e.target.value)}
          placeholder="e.g. Guangzhou Bright Lighting Co."
          autoFocus
          required
        />
      </div>

      <div className="row2">
        <div className="field">
          <label htmlFor="hall">Hall / area</label>
          <input
            id="hall"
            value={s.hall}
            onChange={(e) => set('hall', e.target.value)}
            placeholder="e.g. 4.1"
          />
        </div>
        <div className="field">
          <label htmlFor="booth">Booth no.</label>
          <input
            id="booth"
            value={s.booth}
            onChange={(e) => set('booth', e.target.value)}
            placeholder="e.g. C21"
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="category">Category</label>
        <select id="category" value={s.category} onChange={(e) => set('category', e.target.value)}>
          <option value="">— Select —</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="contact">Contact person</label>
        <input
          id="contact"
          value={s.contact_name}
          onChange={(e) => set('contact_name', e.target.value)}
          placeholder="Name on the business card"
        />
      </div>

      <div className="row2">
        <div className="field">
          <label htmlFor="wechat">WeChat ID</label>
          <input id="wechat" value={s.wechat} onChange={(e) => set('wechat', e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="phone">Phone</label>
          <input
            id="phone"
            type="tel"
            value={s.phone}
            onChange={(e) => set('phone', e.target.value)}
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={s.email}
          onChange={(e) => set('email', e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="website">Website</label>
        <input
          id="website"
          value={s.website}
          onChange={(e) => set('website', e.target.value)}
          placeholder="alibaba.com/… or company site"
        />
      </div>

      <div className="field">
        <label>Interest rating</label>
        <Stars value={s.rating} onChange={(v) => set('rating', v)} />
      </div>

      <div className="field">
        <label htmlFor="status">Follow-up status</label>
        <select
          id="status"
          value={s.status}
          onChange={(e) => set('status', e.target.value as SupplierStatus)}
        >
          {(Object.keys(STATUS_LABELS) as SupplierStatus[]).map((k) => (
            <option key={k} value={k}>
              {STATUS_LABELS[k]}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="notes">Notes</label>
        <textarea
          id="notes"
          value={s.notes}
          onChange={(e) => set('notes', e.target.value)}
          placeholder="Prices discussed, lead time, quality impressions, next steps…"
        />
      </div>

      <div className="actions">
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn primary">
          Save
        </button>
      </div>
    </form>
  )
}
