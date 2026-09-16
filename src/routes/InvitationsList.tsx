import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { addInvitationEvent, listInvitations, saveInvitation } from '../api/invitations'
import { draftInvitation } from '../lib/defaults'
import { whatsappLink } from '../lib/messages'
import { useExhibitions } from '../lib/ExhibitionContext'
import { INVITATION_STATUS_LABELS, type Invitation, type InvitationStatus } from '../types'
import { Empty, Field, Page, Spinner } from '../components/ui'

function QuickWhatsAppInvite() {
  const { current } = useExhibitions()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [company, setCompany] = useState('')
  const [busy, setBusy] = useState(false)

  if (!current) return null

  const send = () => {
    if (!phone.trim()) return
    const inv = draftInvitation(current.id, {
      phone: phone.trim(),
      company_name: company.trim(),
      purpose: 'both',
      status: 'sent_whatsapp',
      last_sent_at: new Date().toISOString(),
    })
    // Open WhatsApp synchronously (avoids popup blocking), then persist the link.
    window.open(whatsappLink(inv, current), '_blank')
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
      <Field label="Company / name (optional)">
        <input value={company} onChange={(e) => setCompany(e.target.value)} />
      </Field>
      <button className="btn primary block" onClick={send} disabled={busy || !phone.trim()}>
        {busy ? 'Opening WhatsApp…' : '💬 Send WhatsApp invite'}
      </button>
    </div>
  )
}

const OPEN_STATUSES: InvitationStatus[] = ['prepared', 'sent_whatsapp', 'sent_email', 'link_shared', 'awaiting', 'follow_up']

function badgeClass(s: InvitationStatus): string {
  if (s === 'received' || s === 'meeting_confirmed') return 'status-ordered'
  if (s === 'meeting_proposed') return 'status-sample'
  if (s === 'follow_up' || s === 'incomplete') return 'status-quote'
  return 'status-skip'
}

export function InvitationsList() {
  const navigate = useNavigate()
  const { current } = useExhibitions()
  const [tab, setTab] = useState<'open' | 'responded' | 'all'>('all')

  const { data = [], isLoading } = useQuery({
    queryKey: ['invitations', current?.id],
    queryFn: () => listInvitations(current!.id),
    enabled: Boolean(current),
  })

  const rows = useMemo(() => {
    if (tab === 'open') return data.filter((i) => OPEN_STATUSES.includes(i.status))
    if (tab === 'responded') return data.filter((i) => Boolean(i.responded_at))
    return data
  }, [data, tab])

  if (!current) {
    return (
      <Page title="Invitations">
        <Empty icon="✉️" title="No exhibition selected" hint="Pick or create an exhibition from the switcher above." />
      </Page>
    )
  }

  return (
    <Page
      title="Invitation Center"
      subtitle={`${current.name}${current.edition ? ' · ' + current.edition : ''}`}
      actions={
        <button className="iconbtn dark" aria-label="Invite supplier" onClick={() => navigate('/invitations/new')}>
          ＋
        </button>
      }
    >
      <QuickWhatsAppInvite />

      <div className="chips">
        {(['all', 'open', 'responded'] as const).map((t) => (
          <button key={t} className={`chip ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'all' ? 'All' : t === 'open' ? 'Awaiting' : 'Responded'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <Empty
          icon="✉️"
          title={data.length === 0 ? 'No invitations yet' : 'Nothing here'}
          hint={data.length === 0 ? 'Tap ＋ to invite a supplier and get a personalized form link.' : undefined}
        />
      ) : (
        rows.map((i: Invitation) => (
          <div key={i.id} className="card" onClick={() => navigate(`/invitations/${i.id}`)}>
            <div className="card-head">
              <div className="name">{i.company_name || i.contact_name || 'Unnamed invitation'}</div>
              <span className={`badge ${badgeClass(i.status)}`}>{INVITATION_STATUS_LABELS[i.status]}</span>
            </div>
            <div className="card-meta">
              {i.contact_name && i.company_name && <span>👤 {i.contact_name}</span>}
              {i.email && <span>✉️ {i.email}</span>}
              {i.phone && <span>📱 {i.phone}</span>}
            </div>
          </div>
        ))
      )}
    </Page>
  )
}
