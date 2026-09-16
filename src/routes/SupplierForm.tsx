import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSupplier, saveSupplier } from '../api/suppliers'
import { draftSupplier } from '../lib/defaults'
import type { Supplier } from '../types'
import { Field, Page, Spinner, ErrorNote } from '../components/ui'

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
  const navigate = useNavigate()
  const qc = useQueryClient()
  const set = <K extends keyof Supplier>(k: K, v: Supplier[K]) => setS((p) => ({ ...p, [k]: v }))

  const mutation = useMutation({
    mutationFn: () => saveSupplier({ ...s, company_name: s.company_name.trim() }),
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
