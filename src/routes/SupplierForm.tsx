import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSupplier, saveSupplier } from '../api/suppliers'
import { saveContact } from '../api/contacts'
import { draftContact, draftSupplier } from '../lib/defaults'
import type { Supplier } from '../types'
import { Field, Page, Spinner, ErrorNote } from '../components/ui'
import { CardScanButton } from '../components/CardScanButton'
import type { ParsedCard } from '../lib/cardOcr'

export function SupplierForm() {
  const { id } = useParams()
  const { data, isLoading } = useQuery({
    queryKey: ['supplier', id],
    queryFn: () => getSupplier(id!),
    enabled: Boolean(id),
  })
  if (id && isLoading) return <Spinner />
  return <Inner initial={data ?? draftSupplier()} isEdit={Boolean(id)} />
}

function Inner({ initial, isEdit }: { initial: Supplier; isEdit: boolean }) {
  const [s, setS] = useState<Supplier>(initial)
  // Primary contact person (only captured when creating a new supplier).
  const [cName, setCName] = useState('')
  const [cPos, setCPos] = useState('')
  const [cPhone, setCPhone] = useState('')
  const [cEmail, setCEmail] = useState('')
  const [cWechat, setCWechat] = useState('')
  const navigate = useNavigate()
  const qc = useQueryClient()
  const set = <K extends keyof Supplier>(k: K, v: Supplier[K]) => setS((p) => ({ ...p, [k]: v }))

  // Fill empty fields from a scanned business card (never overwrite typed input).
  function applyCard(p: ParsedCard) {
    setS((cur) => ({
      ...cur,
      company_name: cur.company_name || p.company || '',
      website: cur.website || p.website || '',
      phone: cur.phone || p.phone || '',
      email: cur.email || p.email || '',
      wechat: cur.wechat || p.wechat || '',
    }))
    if (p.contactName) setCName((v) => v || p.contactName!)
    if (p.position) setCPos((v) => v || p.position!)
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const saved = await saveSupplier({ ...s, company_name: s.company_name.trim() })
      if (!isEdit && cName.trim()) {
        await saveContact(
          draftContact(saved.id, {
            name: cName.trim(),
            position: cPos.trim(),
            phone: cPhone || s.phone,
            email: cEmail || s.email,
            wechat: cWechat || s.wechat,
            first_met_exhibition_id: saved.first_met_exhibition_id,
          }),
        )
      }
      return saved
    },
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      qc.invalidateQueries({ queryKey: ['supplier', saved.id] })
      navigate(`/suppliers/${saved.id}`, { replace: true })
    },
  })

  return (
    <Page title={isEdit ? 'Edit supplier' : 'New supplier'} back>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!s.company_name.trim()) return
          mutation.mutate()
        }}
      >
        {!isEdit && <CardScanButton onParsed={applyCard} />}
        <Field label="Company name *">
          <input value={s.company_name} onChange={(e) => set('company_name', e.target.value)} required autoFocus />
        </Field>
        <Field label="Products (free text)" hint="What they manufacture or supply — no fixed categories.">
          <textarea
            value={s.product_summary}
            onChange={(e) => set('product_summary', e.target.value)}
            placeholder="e.g. LED panel lights, downlights, drivers"
          />
        </Field>
        <Field label="Website">
          <input value={s.website} onChange={(e) => set('website', e.target.value)} placeholder="company.com or alibaba store" />
        </Field>
        <div className="row2">
          <Field label="Phone">
            <input value={s.phone} onChange={(e) => set('phone', e.target.value)} />
          </Field>
          <Field label="WeChat">
            <input value={s.wechat} onChange={(e) => set('wechat', e.target.value)} />
          </Field>
        </div>
        <Field label="Email">
          <input type="email" value={s.email} onChange={(e) => set('email', e.target.value)} />
        </Field>
        <div className="row2">
          <Field label="City">
            <input value={s.city} onChange={(e) => set('city', e.target.value)} />
          </Field>
          <Field label="Country">
            <input value={s.country} onChange={(e) => set('country', e.target.value)} />
          </Field>
        </div>
        <Field label="Address">
          <input value={s.address} onChange={(e) => set('address', e.target.value)} />
        </Field>
        <Field label="Also known as" hint="Alternative names / spellings, for search & de-duplication.">
          <input value={s.aliases} onChange={(e) => set('aliases', e.target.value)} />
        </Field>

        {!isEdit && (
          <>
            <h3 className="section-label">Primary contact person (optional)</h3>
            <Field label="Contact name">
              <input value={cName} onChange={(e) => setCName(e.target.value)} placeholder="Person you deal with" />
            </Field>
            <div className="row2">
              <Field label="Position">
                <input value={cPos} onChange={(e) => setCPos(e.target.value)} placeholder="e.g. Sales Manager" />
              </Field>
              <Field label="Contact phone" hint="Blank = use company phone.">
                <input value={cPhone} onChange={(e) => setCPhone(e.target.value)} />
              </Field>
            </div>
            <div className="row2">
              <Field label="Contact email" hint="Blank = use company email.">
                <input type="email" value={cEmail} onChange={(e) => setCEmail(e.target.value)} />
              </Field>
              <Field label="Contact WeChat">
                <input value={cWechat} onChange={(e) => setCWechat(e.target.value)} />
              </Field>
            </div>
          </>
        )}

        <Field label="Notes">
          <textarea value={s.notes} onChange={(e) => set('notes', e.target.value)} />
        </Field>

        <ErrorNote error={mutation.error} />
        <div className="actions">
          <button type="button" className="btn" onClick={() => history.back()}>
            Cancel
          </button>
          <button type="submit" className="btn primary" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : 'Save supplier'}
          </button>
        </div>
      </form>
    </Page>
  )
}
