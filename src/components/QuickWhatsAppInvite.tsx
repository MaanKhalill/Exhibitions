import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { addInvitationEvent, saveInvitation } from '../api/invitations'
import { getProfile } from '../api/profile'
import { draftInvitation } from '../lib/defaults'
import { whatsappLink } from '../lib/messages'
import { useExhibitions } from '../lib/ExhibitionContext'
import { Field } from './ui'

/**
 * Type a supplier's WhatsApp number and press: opens WhatsApp on the phone
 * (wa.me) with a standard bilingual message + the personalized fill-in link,
 * and records the invitation. Reused on Home and in the Invitation Center.
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

  const send = () => {
    if (!phone.trim()) return
    const inv = draftInvitation(current.id, {
      phone: phone.trim(),
      contact_name: contact.trim(),
      company_name: company.trim(),
      email: email.trim(),
      purpose: 'both',
      status: 'sent_whatsapp',
      last_sent_at: new Date().toISOString(),
    })
    // Open WhatsApp synchronously (avoids popup blocking), then persist the link.
    window.open(whatsappLink(inv, current, profile), '_blank')
    setBusy(true)
    saveInvitation(inv)
      .then(() => addInvitationEvent(inv.id, 'sent_whatsapp', 'WhatsApp invite sent'))
      .then(() => {
        qc.invalidateQueries({ queryKey: ['invitations', current.id] })
        navigate(`/invitations/${inv.id}`)
      })
      .catch(() => setBusy(false))
  }

  return (
    <div className="detail-section">
      <h3>Quick WhatsApp invite</h3>
      <p className="hint" style={{ marginTop: 0 }}>
        Type a number and press — opens WhatsApp on your phone with a standard bilingual message and
        the fill-in link (participation, booth number, and full factory address).
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
      <Field label="Email (optional)" hint="Saved so you can also email them later.">
        <input type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <button className="btn primary block" onClick={send} disabled={busy || !phone.trim()}>
        {busy ? 'Opening WhatsApp…' : '💬 Send WhatsApp invite'}
      </button>
    </div>
  )
}
