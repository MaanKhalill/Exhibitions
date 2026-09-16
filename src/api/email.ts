import { supabase } from '../lib/supabase'
import { DEMO } from '../lib/demo'

/**
 * Send an invitation email from the admin's own SMTP mailbox via the
 * `send-email` Edge Function. The function only sends to the email stored on an
 * invitation the caller owns, so it can't be used as an open relay.
 */
export async function sendInvitationEmail(
  invitationId: string,
  subject: string,
  text: string,
): Promise<{ to: string }> {
  if (DEMO) throw new Error('Email sending is disabled in the preview.')
  const { data, error } = await supabase.functions.invoke('send-email', {
    body: { invitationId, subject, text },
  })
  if (error) {
    // Surface the function's JSON error body when available.
    const ctx = (error as { context?: Response }).context
    if (ctx && typeof ctx.json === 'function') {
      try {
        const j = await ctx.json()
        if (j?.error) throw new Error(j.error)
      } catch {
        /* fall through */
      }
    }
    throw error
  }
  if (data?.error) throw new Error(data.error)
  return data as { to: string }
}
