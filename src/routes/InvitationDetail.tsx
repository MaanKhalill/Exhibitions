import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addInvitationEvent,
  deleteInvitation,
  getInvitation,
  inviteUrl,
  listInvitationEvents,
  setInvitationStatus,
} from '../api/invitations'
import { getExhibition } from '../api/exhibitions'
import { getProfile } from '../api/profile'
import { sendInvitationEmail } from '../api/email'
import { emailBody, emailSubject, invitationMessage, mailtoLink, whatsappLink } from '../lib/messages'
import { INVITATION_STATUS_LABELS, type InvitationStatus } from '../types'
import { Page, Spinner } from '../components/ui'

export function InvitationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [copied, setCopied] = useState(false)

  const { data: inv, isLoading } = useQuery({ queryKey: ['invitation', id], queryFn: () => getInvitation(id!), enabled: Boolean(id) })
  const { data: ex } = useQuery({
    queryKey: ['exhibition', inv?.exhibition_id],
    queryFn: () => getExhibition(inv!.exhibition_id),
    enabled: Boolean(inv),
  })
  const { data: events = [] } = useQuery({ queryKey: ['invitation-events', id], queryFn: () => listInvitationEvents(id!), enabled: Boolean(id) })
  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: () => getProfile() })

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['invitation', id] })
    qc.invalidateQueries({ queryKey: ['invitation-events', id] })
    if (inv) qc.invalidateQueries({ queryKey: ['invitations', inv.exhibition_id] })
  }

  const mark = useMutation({
    mutationFn: async ({ status, event }: { status?: InvitationStatus; event?: string }) => {
      if (status) await setInvitationStatus(id!, status)
      if (event) await addInvitationEvent(id!, event, event)
    },
    onSuccess: refresh,
  })
  const del = useMutation({
    mutationFn: () => deleteInvitation(id!),
    onSuccess: () => {
      if (inv) qc.invalidateQueries({ queryKey: ['invitations', inv.exhibition_id] })
      navigate('/invitations', { replace: true })
    },
  })
  const emailNow = useMutation({
    mutationFn: async () => {
      if (!inv) return
      const r = await sendInvitationEmail(inv.id, emailSubject(ex ?? null), emailBody(inv, ex ?? null, profile))
      await setInvitationStatus(inv.id, 'sent_email')
      await addInvitationEvent(inv.id, 'email_sent', `Email sent to ${r.to}`)
    },
    onSuccess: refresh,
  })

  if (isLoading || !inv) return <Spinner />
  const url = inviteUrl(inv.token)

  const fmt = (iso: string) => new Date(iso).toLocaleString()
  let validity = `Valid for ${inv.ttl_hours ?? 48}h after the supplier first opens it`
  let isExpired = false
  if (inv.expires_at) {
    isExpired = Date.now() > Date.parse(inv.expires_at)
    validity = isExpired ? `Expired ${fmt(inv.expires_at)}` : `Valid until ${fmt(inv.expires_at)} (24h update window)`
  } else if (inv.opened_at && inv.ttl_hours) {
    const exp = Date.parse(inv.opened_at) + inv.ttl_hours * 3600000
    isExpired = Date.now() > exp
    validity = isExpired
      ? `Expired ${fmt(new Date(exp).toISOString())}`
      : `Opened ${fmt(inv.opened_at)} · valid until ${fmt(new Date(exp).toISOString())}`
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // clipboard may be blocked; the link is shown for manual copy
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
    mark.mutate({ status: inv.status === 'prepared' ? 'link_shared' : undefined, event: 'link_copied' })
  }
  const sendWhatsApp = () => {
    window.open(whatsappLink(inv, ex ?? null, profile), '_blank')
    mark.mutate({ status: 'sent_whatsapp', event: 'sent_whatsapp' })
  }
  const sendEmail = () => {
    window.location.href = mailtoLink(inv, ex ?? null, profile)
    mark.mutate({ status: 'sent_email', event: 'sent_email' })
  }
  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(invitationMessage(inv, ex ?? null, profile))
    } catch {
      /* ignore */
    }
    mark.mutate({ event: 'message_copied' })
  }
  const resp = inv.response as Record<string, unknown> | null

  return (
    <Page
      title={inv.company_name || inv.contact_name || 'Invitation'}
      subtitle={ex ? `${ex.name}${ex.edition ? ' · ' + ex.edition : ''}` : undefined}
      back
      actions={
        <button className="iconbtn dark" aria-label="Edit" onClick={() => navigate(`/invitations/${inv.id}/edit`)}>✎</button>
      }
    >
      <div className="detail-section">
        <h3>Personalized link</h3>
        <div className="linkbox">{url}</div>
        <div className="actions" style={{ marginTop: 10 }}>
          <button className="btn" onClick={copyLink}>{copied ? 'Copied ✓' : '🔗 Copy link'}</button>
          <button className="btn" onClick={copyMessage}>📋 Copy message</button>
        </div>
        <div className="actions" style={{ marginTop: 10 }}>
          <button className="btn primary" onClick={sendWhatsApp}>💬 WhatsApp</button>
          <button className="btn" onClick={sendEmail}>✉️ Mail app</button>
        </div>
        <button className="btn block" style={{ marginTop: 8 }} onClick={() => emailNow.mutate()} disabled={emailNow.isPending}>
          {emailNow.isPending ? 'Sending…' : emailNow.isSuccess ? 'Email sent ✓' : '📤 Send email now (from your mailbox)'}
        </button>
        {emailNow.isError && <p className="error">{(emailNow.error as Error).message}</p>}
        <p className={`hint ${isExpired ? 'error' : ''}`}>{isExpired ? '⛔' : '⏳'} {validity}</p>
        <p className="hint">The email includes your trip details. Opens WhatsApp/email with an editable bilingual (EN + 中文) message — you stay in control of the final send.</p>
      </div>

      {inv.supplier_id && (
        <div className="detail-section">
          <h3>Need to refresh their data later?</h3>
          <p className="hint" style={{ marginTop: 0 }}>
            Ask an existing supplier to review &amp; update all their details from their own page —
            WhatsApp/email use the number and address already on file.
          </p>
          <Link className="btn block" to={`/suppliers/${inv.supplier_id}`}>Open supplier page →</Link>
        </div>
      )}

      <div className="detail-section">
        <h3>Status</h3>
        <select
          value={inv.status}
          onChange={(e) => mark.mutate({ status: e.target.value as InvitationStatus, event: `status:${e.target.value}` })}
        >
          {(Object.keys(INVITATION_STATUS_LABELS) as InvitationStatus[]).map((k) => (
            <option key={k} value={k}>{INVITATION_STATUS_LABELS[k]}</option>
          ))}
        </select>
      </div>

      {inv.responded_at && (
        <div className="detail-section">
          <h3>Response received</h3>
          {resp && (
            <>
              {typeof resp.participate === 'string' && <div className="kv"><span className="k">Participating</span><span className="v">{resp.participate}</span></div>}
              {typeof resp.hall === 'string' && resp.hall && <div className="kv"><span className="k">Hall</span><span className="v">{resp.hall}</span></div>}
              {typeof resp.booth === 'string' && resp.booth && <div className="kv"><span className="k">Booth</span><span className="v">{resp.booth}</span></div>}
              {typeof resp.product_summary === 'string' && resp.product_summary && <div className="kv"><span className="k">Products</span><span className="v">{resp.product_summary}</span></div>}
            </>
          )}
          {inv.supplier_id && (
            <div className="actions" style={{ marginTop: 10 }}>
              <Link className="btn primary" to={`/suppliers/${inv.supplier_id}`}>Open supplier</Link>
              <Link className="btn" to={`/fair/supplier/${inv.supplier_id}`}>In this fair</Link>
            </div>
          )}
        </div>
      )}

      {!inv.responded_at && (
        <div className="detail-section">
          <h3>Reminders</h3>
          <p className="hint" style={{ marginTop: 0 }}>Resend the same personalized link.</p>
          <div className="actions">
            <button className="btn" onClick={sendWhatsApp}>WhatsApp reminder</button>
            <button className="btn" onClick={sendEmail}>Email reminder</button>
          </div>
        </div>
      )}

      <div className="detail-section">
        <h3>Timeline</h3>
        {events.length === 0 && <p className="hint">No activity yet.</p>}
        {events.map((ev) => (
          <div key={ev.id} className="kv">
            <span className="k">{new Date(ev.created_at).toLocaleString()}</span>
            <span className="v">{ev.detail || ev.type}</span>
          </div>
        ))}
      </div>

      <button
        className="btn danger block"
        onClick={() => { if (confirm('Delete this invitation? The supplier record (if any) stays.')) del.mutate() }}
      >
        Delete invitation
      </button>
    </Page>
  )
}
