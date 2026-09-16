import { useState } from 'react'
import { newProduct, type Product } from '../types'
import { saveProduct } from '../lib/store'
import { compressImage } from '../lib/image'

interface Props {
  supplierId: string
  initial?: Product
  initialPhoto?: string | null
  onDone: () => void
  onCancel: () => void
}

const CURRENCIES = ['USD', 'CNY', 'EUR', 'GBP', 'AED']

export function ProductForm({ supplierId, initial, initialPhoto, onDone, onCancel }: Props) {
  const [p, setP] = useState<Product>(initial ?? newProduct(supplierId))
  const [preview, setPreview] = useState<string | null>(
    initialPhoto ?? initial?.pending_photo ?? null,
  )
  const [busy, setBusy] = useState(false)
  const set = <K extends keyof Product>(k: K, v: Product[K]) =>
    setP((prev) => ({ ...prev, [k]: v }))

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    try {
      const dataUrl = await compressImage(file)
      setPreview(dataUrl)
      set('pending_photo', dataUrl)
    } catch {
      // ignore — user can retry
    } finally {
      setBusy(false)
      e.target.value = ''
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!p.name.trim()) return
    saveProduct({ ...p, name: p.name.trim() })
    onDone()
  }

  return (
    <form onSubmit={submit}>
      <div className="field">
        <label>Photo</label>
        <label
          className="product"
          style={{ cursor: 'pointer', margin: 0 }}
          htmlFor="photo-input"
        >
          {preview ? (
            <img src={preview} alt="product" />
          ) : (
            <span className="noimg">{busy ? '…' : '📷'}</span>
          )}
          <div className="p-body">
            <div className="p-name">{preview ? 'Change photo' : 'Add a photo'}</div>
            <div className="p-meta">Tap to use your camera or gallery</div>
          </div>
        </label>
        <input
          id="photo-input"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onPhoto}
          style={{ display: 'none' }}
        />
      </div>

      <div className="field">
        <label htmlFor="pname">Product name *</label>
        <input
          id="pname"
          value={p.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="e.g. LED panel light 600x600"
          autoFocus
          required
        />
      </div>

      <div className="field">
        <label htmlFor="model">Model / SKU</label>
        <input id="model" value={p.model} onChange={(e) => set('model', e.target.value)} />
      </div>

      <div className="row2">
        <div className="field">
          <label htmlFor="moq">MOQ</label>
          <input
            id="moq"
            value={p.moq}
            onChange={(e) => set('moq', e.target.value)}
            placeholder="e.g. 500 pcs"
          />
        </div>
        <div className="field">
          <label htmlFor="price">Unit price</label>
          <input
            id="price"
            value={p.unit_price}
            onChange={(e) => set('unit_price', e.target.value)}
            inputMode="decimal"
            placeholder="e.g. 3.20"
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="cur">Currency</label>
        <select id="cur" value={p.currency} onChange={(e) => set('currency', e.target.value)}>
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="pnotes">Notes</label>
        <textarea
          id="pnotes"
          value={p.notes}
          onChange={(e) => set('notes', e.target.value)}
          placeholder="Specs, colours, certifications, sample given?…"
        />
      </div>

      <div className="actions">
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn primary" disabled={busy}>
          Save product
        </button>
      </div>
    </form>
  )
}
