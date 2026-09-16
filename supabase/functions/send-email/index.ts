// Sends an invitation email from THE CALLER'S OWN SMTP mailbox (multi-user).
// verify_jwt=true: only an authenticated user can call it, and it only ever
// sends to the email stored on an invitation THEY own (RLS-checked with the
// caller's token) — never an arbitrary address, so it can't be used as an open
// relay. Each user stores their own SMTP settings in ex_email_settings; this
// function reads them (including the password) with the service role, so the
// email always goes out from the caller's own mailbox.
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const auth = req.headers.get('Authorization')
    if (!auth) return json({ error: 'Unauthorized' }, 401)
    const { invitationId, subject, text } = await req.json()
    if (!invitationId || !text) return json({ error: 'Missing invitationId or text' }, 400)

    // Caller-scoped client: identifies the user and RLS-checks the invitation.
    const user = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: auth } },
    })
    const { data: authData } = await user.auth.getUser()
    const uid = authData.user?.id
    if (!uid) return json({ error: 'Unauthorized' }, 401)

    const { data: inv, error } = await user
      .from('ex_invitations')
      .select('email, company_name')
      .eq('id', invitationId)
      .maybeSingle()
    if (error) return json({ error: error.message }, 500)
    if (!inv) return json({ error: 'Invitation not found' }, 404)
    if (!inv.email) return json({ error: 'This invitation has no email address.' }, 400)

    // Read the caller's own SMTP settings with the service role (the password
    // column is not client-readable). Fall back to project-wide SMTP secrets if
    // this user hasn't configured their own mailbox yet.
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: s } = await admin
      .from('ex_email_settings')
      .select('host, port, username, password, from_email, from_name, secure')
      .eq('user_id', uid)
      .maybeSingle()

    const host = s?.host || Deno.env.get('SMTP_HOST')
    const port = Number(s?.port || Deno.env.get('SMTP_PORT') || '465')
    const username = s?.username || Deno.env.get('SMTP_USERNAME')
    const password = s?.password || Deno.env.get('SMTP_PASSWORD')
    const fromEmail = s?.from_email || Deno.env.get('SMTP_FROM') || username
    const fromName = s?.from_name || ''
    const secure = s ? s.secure : port === 465
    if (!host || !username || !password || !fromEmail) {
      return json({ error: 'Your email is not set up yet. Open My profile → “Send from my mailbox” and add your SMTP details.' }, 400)
    }
    const from = fromName ? `${fromName} <${fromEmail}>` : fromEmail

    const client = new SMTPClient({
      connection: { hostname: host, port, tls: secure, auth: { username, password } },
    })
    await client.send({ from, to: inv.email, subject: subject || 'Invitation', content: text })
    await client.close()

    return json({ ok: true, to: inv.email })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Send failed' }, 500)
  }
})
