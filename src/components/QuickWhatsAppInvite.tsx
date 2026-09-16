import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { addInvitationEvent, saveInvitation } from '../api/invitations'
import { getProfile } from '../api/profile'
import { draftInvitation } from '../lib/defaults'
import { mailtoLink, whatsappLink } from '../lib/messages'
import { useExhibitions } from '../lib/ExhibitionContext'
import { Field } from './ui'

/**
 * Quick invite: type a supplier's WhatsApp number and/or email and press.
 * The WhatsApp button opens WhatsApp (wa.me); the Email button opens your mail
 * app (mailto) — both pre-filled with the standard bilingual message and the
 * personalized fill-in link. Each button is enabled by its own field, so you
 * can send by whichever channel(s) you have. Reused on Home and in Invitations.
 */
export function QuickWhatsAppInvite() {
  const { current } = useExhibitions()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [contact, setContact] = useState('')
  const [company, setCompany] = useState('')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: () => getProfile() })

  if (!current) return null

  const hasPhone = phone.trim().length > 0
  const hasEmail = email.trim().length > 0

  const send = (channel: 'wa' | 'mail') => {
    if (channel === 'wa' && !hasPhone) return
    if (channel === 'mail' && !hasEmail) return
    const inv = draftInvitation(current.id, {
      phone: phone.trim(),
      contact_name: contact.trim(),
      company_name: company.trim(),
      email: email.trim(),
      purpose: 'both',
      status: channel === 'wa' ? 'sent_whatsapp' : 'sent_email',
      last_sent_at: new Date().toISOString(),
    })
    // Open the channel synchronously (avoids popup blocking), then persist.
    if (channel === 'wa') window.open(whatsappLink(inv, current, profile), '_blank')
    else window.location.href = mailtoLink(inv, current, profile)
    setBusy(true)
    saveInvitation(inv)
      .then(() =>
        addInvitationEvent(
          inv.id,
          channel === 'wa' ? 'sent_whatsapp' : 'sent_email',
          channel === 'wa' ? 'WhatsApp invite sent' : 'Email invite sent',
        ),
      )
      .then(() => {
        qc.invalidateQueries({ queryKey: ['invitations', current.id] })
        navigate(`/invitations/${inv.id}`)
      })
      .catch(() => setBusy(false))
  }

  return (
    <div className="detail-section">
      <h3>Quick invite</h3>
      <p className="hint" style={{ marginTop: 0 }}>
        Fill a WhatsApp number to enable the WhatsApp button, an email to enable the email button — or
        both. Opens WhatsApp / your mail app with a standard bilingual message and the fill-in link
        (participation, booth number, and full factory address).
      </p>
      <Field label="Supplier WhatsApp number">
        <input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+86 138 0000 0000" />
      </Field>
      <div className="row2">
        <Field label="Contact name (optional)">
          <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="greets them by name" />
        </Field>
        <Field label="Company (optional)">
          <input value={company} onChange={(e) => setCompany(e.target.value)} />
        </Field>
      </div>
      <Field label="Supplier email">
        <input type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="sales@company.com" />
      </Field>
      <button className="btn primary block" onClick={() => send('wa')} disabled={busy || !hasPhone}>
        {busy ? 'Opening…' : '💬 Send WhatsApp invite'}
      </button>
      <button className="btn block" style={{ marginTop: 8 }} onClick={() => send('mail')} disabled={busy || !hasEmail}>
        {busy ? 'Opening…' : '✉️ Send email invite'}
      </button>
      {!hasPhone && !hasEmail && (
        <p className="hint" style={{ marginBottom: 0 }}>Enter a phone number and/or an email to enable a button.</p>
      )}
    </div>
  )
}
