import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getInvitation, newInvitationToken, saveInvitation } from '../api/invitations'
import { useExhibitions } from '../lib/ExhibitionContext'
import { PURPOSE_LABELS, type Invitation, type InvitationPurpose } from '../types'
import { Field, Page, Spinner, ErrorNote } from '../components/ui'

function draftInvitation(exhibitionId: string): Invitation {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    exhibition_id: exhibitionId,
    token: newInvitationToken(),
    company_name: '',
    contact_name: '',
    email: '',
    phone: '',
    purpose: 'exhibition',
    internal_notes: '',
    status: 'prepared',
    supplier_id: null,
    response: null,
    last_sent_at: null,
    responded_at: null,
    created_at: now,
    updated_at: now,
  }
}

export function InvitationForm() {
  const { id } = useParams()
  const { current } = useExhibitions()
  const { data, isLoading } = useQuery({
    queryKey: ['invitation', id],
    queryFn: () => getInvitation(id!),
    enabled: Boolean(id),
  })
  if (!current) return <Page title="Invite supplier" back><p className="hint">Select an exhibition first.</p></Page>
  if (id && isLoading) return <Spinner />
  return <Inner initial={data ?? draftInvitation(current.id)} isEdit={Boolean(id)} />
}

function Inner({ initial, isEdit }: { initial: Invitation; isEdit: boolean }) {
  const [i, setI] = useState<Invitation>(initial)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const set = <K extends keyof Invitation>(k: K, v: Invitation[K]) => setI((p) => ({ ...p, [k]: v }))

  const mutation = useMutation({
    mutationFn: () => saveInvitation(i),
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: ['invitations', saved.exhibition_id] })
      navigate(`/invitations/${saved.id}`, { replace: true })
    },
  })

  return (
    <Page title={isEdit ? 'Edit invitation' : 'Invite supplier'} back>
      <p className="hint" style={{ marginTop: 0 }}>
        Enter only what you already know. The supplier fills in the rest through their
        personalized link — no product categories required.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          mutation.mutate()
        }}
      >
        <Field label="Company name">
          <input value={i.company_name} onChange={(e) => set('company_name', e.target.value)} autoFocus />
        </Field>
        <Field label="Contact name">
          <input value={i.contact_name} onChange={(e) => set('contact_name', e.target.value)} />
        </Field>
        <div className="row2">
          <Field label="Email">
            <input type="email" value={i.email} onChange={(e) => set('email', e.target.value)} />
          </Field>
          <Field label="WhatsApp / phone">
            <input value={i.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+86…" />
          </Field>
        </div>
        <Field label="What to request">
          <select value={i.purpose} onChange={(e) => set('purpose', e.target.value as InvitationPurpose)}>
            {(Object.keys(PURPOSE_LABELS) as InvitationPurpose[]).map((k) => (
              <option key={k} value={k}>{PURPOSE_LABELS[k]}</option>
            ))}
          </select>
        </Field>
        <Field label="Internal notes" hint="Private — never shown to the supplier.">
          <textarea value={i.internal_notes} onChange={(e) => set('internal_notes', e.target.value)} />
        </Field>

        <ErrorNote error={mutation.error} />
        <div className="actions">
          <button type="button" className="btn" onClick={() => history.back()}>Cancel</button>
          <button type="submit" className="btn primary" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : 'Save & get link'}
          </button>
        </div>
      </form>
    </Page>
  )
}
