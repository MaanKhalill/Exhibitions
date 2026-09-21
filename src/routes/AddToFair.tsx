import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { findDuplicates, saveSupplier, type DuplicateMatch } from '../api/suppliers'
import { saveParticipation } from '../api/participations'
import { saveContact } from '../api/contacts'
import { draftContact, draftParticipation, draftSupplier } from '../lib/defaults'
import { PRIORITY_LABELS, type Priority, type Supplier } from '../types'
import { useExhibitions } from '../lib/ExhibitionContext'
import { Field, Page, ErrorNote } from '../components/ui'
import { Stars } from '../components/Stars'

export function AddToFair() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { current } = useExhibitions()

  // New-supplier fields (used when not linking to an existing one)
  const [company, setCompany] = useState('')
  const [website, setWebsite] = useState('')
  const [products, setProducts] = useState('')

  // Contact person (their business card) — saved as a contact on the supplier.
  const [contactName, setContactName] = useState('')
  const [position, setPosition] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [wechat, setWechat] = useState('')

  const [linked, setLinked] = useState<Supplier | null>(null)
  const [matches, setMatches] = useState<DuplicateMatch[] | null>(null)
  const [checking, setChecking] = useState(false)

  // Participation fields
  const [hall, setHall] = useState('')
  const [boothRaw, setBoothRaw] = useState('')
  const [priority, setPriority] = useState<Priority>('tbd')
  const [rating, setRating] = useState(0)
  const [notes, setNotes] = useState('')
  const [factory, setFactory] = useState(false)

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)

  if (!current) {
    return (
      <Page title="Add supplier" back>
        <p className="hint">Select or create an exhibition first (use the switcher above).</p>
      </Page>
    )
  }

  async function checkDuplicates() {
    if (!company.trim()) return
    setChecking(true)
    try {
      const found = await findDuplicates({ company_name: company, website, phone, wechat })
      setMatches(found)
    } finally {
      setChecking(false)
    }
  }

  async function save() {
    if (!current) return
    if (!linked && !company.trim()) {
      setError(new Error('Enter a company name or link an existing supplier.'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      let supplier = linked
      if (!supplier) {
        supplier = await saveSupplier(
          draftSupplier({
            company_name: company.trim(),
            website,
            phone,
            email,
            wechat,
            product_summary: products,
            first_met_exhibition_id: current.id,
          }),
        )
      }
      // Save the person from their card as a contact on the supplier.
      if (contactName.trim() || email.trim()) {
        await saveContact(
          draftContact(supplier.id, {
            name: contactName.trim() || supplier.company_name,
            position: position.trim(),
            phone,
            email,
            wechat,
            first_met_exhibition_id: current.id,
          }),
        )
      }
      await saveParticipation(
        draftParticipation(current.id, supplier.id, {
          hall,
          booth: boothRaw,
          booth_raw: boothRaw,
          booth_contact_name: contactName.trim(),
          booth_contact_phone: phone,
          products_shown: products,
          priority,
          rating,
          notes,
          factory_candidate: factory,
          discovered_onsite: true,
        }),
      )
      qc.invalidateQueries({ queryKey: ['participations', current.id] })
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      navigate('/fair', { replace: true })
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Page title="Add supplier" subtitle={`to ${current.name}${current.edition ? ' · ' + current.edition : ''}`} back>
      {linked ? (
        <div className="detail-section">
          <h3>Linked to existing supplier</h3>
          <p style={{ margin: '0 0 8px', fontWeight: 600 }}>{linked.company_name}</p>
          <button className="btn ghost" onClick={() => setLinked(null)}>
            Unlink / enter a new one
          </button>
        </div>
      ) : (
        <>
          <Field label="Company name *">
            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              onBlur={checkDuplicates}
              placeholder="Company or booth name"
              autoFocus
            />
          </Field>

          {matches && matches.length > 0 && (
            <div className="dupe">
              <div className="dupe-title">⚠️ Possible existing supplier found</div>
              {matches.map((m) => (
                <div key={m.supplier.id} className="dupe-row">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>{m.supplier.company_name}</div>
                    <div className="hint" style={{ marginTop: 2 }}>{m.reasons.join(' · ')}</div>
                  </div>
                  <button className="btn primary" onClick={() => { setLinked(m.supplier); setMatches(null) }}>
                    Link
                  </button>
                </div>
              ))}
              <div className="hint">Not a match? Just keep filling in the form to create a new supplier.</div>
            </div>
          )}

          <Field label="Website">
            <input value={website} onChange={(e) => setWebsite(e.target.value)} onBlur={checkDuplicates} />
          </Field>
        </>
      )}

      <h3 className="section-label">Contact person (their card)</h3>
      <Field label="Contact name">
        <input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Person you met" />
      </Field>
      <div className="row2">
        <Field label="Position">
          <input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="e.g. Sales Manager" />
        </Field>
        <Field label="Phone">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} onBlur={checkDuplicates} />
        </Field>
      </div>
      <div className="row2">
        <Field label="Email">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="WeChat">
          <input value={wechat} onChange={(e) => setWechat(e.target.value)} onBlur={checkDuplicates} />
        </Field>
      </div>

      <Field label="Products (free text)">
        <textarea value={products} onChange={(e) => setProducts(e.target.value)} placeholder="What they showed / make" />
      </Field>
      <div className="row2">
        <Field label="Hall">
          <input value={hall} onChange={(e) => setHall(e.target.value)} placeholder="e.g. 15.1" />
        </Field>
        <Field label="Booth" hint="e.g. 15.1 A23-24 — parsed automatically.">
          <input value={boothRaw} onChange={(e) => setBoothRaw(e.target.value)} placeholder="A23-24" />
        </Field>
      </div>
      <Field label="Priority">
        <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
          {(Object.keys(PRIORITY_LABELS) as Priority[]).map((k) => (
            <option key={k} value={k}>{PRIORITY_LABELS[k]}</option>
          ))}
        </select>
      </Field>
      <Field label="Rating">
        <Stars value={rating} onChange={setRating} />
      </Field>
      <label className="checkrow">
        <input type="checkbox" checked={factory} onChange={(e) => setFactory(e.target.checked)} />
        <span>Add to factory-visit candidates</span>
      </label>
      <Field label="Quick notes">
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>

      {checking && <p className="hint">Checking for existing suppliers…</p>}
      <ErrorNote error={error} />
      <div className="actions">
        <button type="button" className="btn" onClick={() => history.back()}>Cancel</button>
        <button type="button" className="btn primary" onClick={save} disabled={busy}>
          {busy ? 'Saving…' : 'Save'}
        </button>
      </div>
    </Page>
  )
}
