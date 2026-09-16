import { supabase } from '../lib/supabase'
import { DEMO, demo } from '../lib/demo'
import type { Invitation, InvitationEvent, InvitationStatus } from '../types'

const TABLE = 'ex_invitations'

function toRow(i: Invitation) {
  const { user_id: _omit, ...row } = i
  return row
}

export function newInvitationToken(): string {
  return crypto.randomUUID().replace(/-/g, '')
}

export function inviteUrl(token: string): string {
  return `${window.location.origin}/invite/${token}`
}

export async function listInvitations(exhibitionId: string): Promise<Invitation[]> {
  if (DEMO) return demo.listInvitations(exhibitionId)
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('exhibition_id', exhibitionId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as Invitation[]) ?? []
}

export async function getInvitation(id: string): Promise<Invitation | null> {
  if (DEMO) return demo.getInvitation(id)
  const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return (data as Invitation) ?? null
}

export async function saveInvitation(i: Invitation): Promise<Invitation> {
  if (DEMO) return demo.saveInvitation(i)
  const { data, error } = await supabase.from(TABLE).upsert(toRow(i)).select('*').single()
  if (error) throw error
  return data as Invitation
}

export async function setInvitationStatus(id: string, status: InvitationStatus): Promise<void> {
  if (DEMO) return demo.setInvitationStatus(id, status)
  const patch: Record<string, unknown> = { status }
  if (status === 'sent_whatsapp' || status === 'sent_email' || status === 'link_shared') {
    patch.last_sent_at = new Date().toISOString()
  }
  const { error } = await supabase.from(TABLE).update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteInvitation(id: string): Promise<void> {
  if (DEMO) return demo.deleteInvitation(id)
  const { error } = await supabase.from(TABLE).delete().eq('id', id)
  if (error) throw error
}

export async function addInvitationEvent(
  invitationId: string,
  type: string,
  detail: string,
): Promise<void> {
  if (DEMO) return demo.addInvitationEvent(invitationId, type, detail)
  const { error } = await supabase.from('ex_invitation_events').insert({
    invitation_id: invitationId,
    type,
    detail,
  })
  if (error) throw error
}

export async function listInvitationEvents(invitationId: string): Promise<InvitationEvent[]> {
  if (DEMO) return demo.listInvitationEvents(invitationId)
  const { data, error } = await supabase
    .from('ex_invitation_events')
    .select('*')
    .eq('invitation_id', invitationId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data as InvitationEvent[]) ?? []
}

// ---------- public (no-login) endpoints via Edge Functions ----------

export interface PublicInvitationInfo {
  invitation: {
    company_name: string
    contact_name: string
    email: string
    phone: string
    purpose: 'exhibition' | 'factory' | 'both'
    already_responded: boolean
  }
  exhibition: {
    name: string
    edition: string
    city: string
    country: string
    venue: string
    start_date: string | null
    end_date: string | null
    trip_start: string | null
    trip_end: string | null
  } | null
}

export async function fetchPublicInvitation(token: string): Promise<PublicInvitationInfo> {
  if (DEMO) return demo.fetchPublicInvitation(token) as Promise<PublicInvitationInfo>
  const { data, error } = await supabase.functions.invoke('invitation-get', { body: { token } })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data as PublicInvitationInfo
}

export async function submitPublicInvitation(
  token: string,
  payload: Record<string, unknown>,
): Promise<void> {
  if (DEMO) return demo.submitPublicInvitation()
  const { data, error } = await supabase.functions.invoke('invitation-submit', {
    body: { token, payload },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
}
