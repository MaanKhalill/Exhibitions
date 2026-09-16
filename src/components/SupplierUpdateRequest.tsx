import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { addInvitationEvent, findInvitationForSupplier, saveInvitation } from '../api/invitations'
import { getProfile } from '../api/profile'
import { draftInvitation } from '../lib/defaults'
import { mailtoUpdateLink, whatsappUpdateLink } from '../lib/messages'
import { useExhibitions } from '../lib/ExhibitionContext'
import type { Contact, Invitation, Supplier } from '../types'

interface Props {
  supplier: Supplier
  /** Primary contact — used only to fall back to a phone/email if the supplier has none. */
  contact?: Contact | null
  /** Exhibition context for the message (falls back to the supplier's history). */
  exhibitionId?: string | null
}

/**
 * Sits on a supplier's own page. Sends the supplier a "please review & update
 * all your details" link (valid 24h). By default WhatsApp uses the supplier's
 * existing phone and Email uses their existing email — no typing required.
 * This is separate from inviting a brand-new supplier to fill in their data.
 */
export function SupplierUpdateRequest({ supplier, contact, exhibitionId }: Props) {
  const qc = useQueryClient()
  const { exhibitions } = useExhibitions()
  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: () => getProfile() })
  const { data: existingInv } = useQuery({
    queryKey: ['supplier-invitation', supplier.id],
    queryFn: () => findInvitationForSupplier(supplier.id),
  })
  const [note, setNote] = useState<string | null>(null)

  const phone = supplier.phone || contact?.phone || ''
  const email = supplier.email || contact?.email || ''
  const exId = exhibitionId ?? supplier.first_met_exhibition_id ?? null
  const ex = useMemo(
    () => exhibitions.find((e) => e.id === (existingInv?.exhibition_id ?? exId)) ?? null,
    [exhibitions, existingInv, exId],
  )

  // A stable invitation object (reused existing, else a freshly drafted one with
  // a fixed token) that the wa.me / mailto links are built from synchronously,
  // so tapping the button opens the app without a popup being blocked.
  const outInv = useMemo<Invitation | null>(() => {
    const base = existingInv ?? (exId ? draftInvitation(exId, { supplier_id: supplier.id }) : null)
    if (!base) return null
    return {
      ...base,
      company_name: supplier.company_name || base.company_name,
      contact_name: contact?.name || base.contact_name,
      email,
      phone,
      purpose: 'both',
      supplier_id: supplier.id,
    }
  }, [existingInv, exId, supplier.id, supplier.company_name, contact?.name, email, phone])

  const canSend = Boolean(outInv)

  async function persist(channel: 'wa' | 'mail') {
    if (!outInv) return
    const saved: Invitation = {
      ...outInv,
      expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      ttl_hours: null,
      status: channel === 'wa' ? 'sent_whatsapp' : 'sent_email',
      last_sent_at: new Date().toISOString(),
    }
    await saveInvitation(saved)
    await addInvitationEvent(
      saved.id,
      'update_requested',
      `Update request sent by ${channel === 'wa' ? 'WhatsApp' : 'email'} (link valid 24h)`,
    )
    qc.invalidateQueries({ queryKey: ['supplier-invitation', supplier.id] })
    setNote(
      channel === 'wa'
        ? `WhatsApp opened${phone ? ` to ${phone}` : ''} with an update request. The link is valid for 24 hours.`
        : `Your mail app opened${email ? ` to ${email}` : ''} with an update request. The link is valid for 24 hours.`,
    )
  }

  const waHref = outInv ? whatsappUpdateLink(outInv, ex, profile) : undefined
  const mailHref = outInv ? mailtoUpdateLink(outInv, ex, profile) : undefined

  return (
    <div className="detail-section">
      <h3>Ask this supplier to update their details</h3>
      <p className="hint" style={{ marginTop: 0 }}>
        Sends <b>{supplier.company_name || 'this supplier'}</b> a secure link to review &amp; update all
        their details (products, contact, booth, factory). The link is valid for <b>24 hours</b>.
      </p>

      <div className="actions">
        {phone ? (
          <a className="btn primary" href={waHref} target="_blank" rel="noreferrer" onClick={() => persist('wa')}>
            💬 WhatsApp
          </a>
        ) : (
          <button className="btn" disabled title="No phone on file for this supplier">💬 WhatsApp</button>
        )}
        {email ? (
          <a className="btn" href={mailHref} onClick={() => persist('mail')}>
            ✉️ Email
          </a>
        ) : (
          <button className="btn" disabled title="No email on file for this supplier">✉️ Email</button>
        )}
      </div>

      <p className="hint" style={{ marginBottom: 0 }}>
        {phone ? <>WhatsApp goes to their number on file: <b>{phone}</b>. </> : <>No phone on file — add one to enable WhatsApp. </>}
        {email ? <>Email goes to: <b>{email}</b>.</> : <>No email on file — add one to enable email.</>}
      </p>

      {!canSend && (
        <p className="hint error" style={{ marginBottom: 0 }}>
          Link this supplier to an exhibition first, then you can request an update.
        </p>
      )}
      {note && <p className="hint" style={{ marginBottom: 0 }}>✓ {note}</p>}
    </div>
  )
}
