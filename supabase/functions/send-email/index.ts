// Sends an invitation email from the admin's own SMTP mailbox.
// verify_jwt=true: only an authenticated admin can call it, and it only ever
// sends to the email stored on an invitation THEY own (RLS-checked with the
// caller's token) — never an arbitrary address, so it can't be used as an open
// relay. SMTP credentials come from function secrets:
//   SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, SMTP_FROM
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

    // Caller-scoped client: RLS ensures the invitation belongs to this admin.
    const user = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: auth } },
    })
    const { data: inv, error } = await user
      .from('ex_invitations')
      .select('email, company_name')
      .eq('id', invitationId)
      .maybeSingle()
    if (error) return json({ error: error.message }, 500)
    if (!inv) return json({ error: 'Invitation not found' }, 404)
    if (!inv.email) return json({ error: 'This invitation has no email address.' }, 400)

    const host = Deno.env.get('SMTP_HOST')
    const port = Number(Deno.env.get('SMTP_PORT') || '465')
    const username = Deno.env.get('SMTP_USERNAME')
    const password = Deno.env.get('SMTP_PASSWORD')
    const from = Deno.env.get('SMTP_FROM') || username
    if (!host || !username || !password || !from) {
      return json({ error: 'Email is not configured yet. Set SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD and SMTP_FROM as Edge Function secrets.' }, 400)
    }

    const client = new SMTPClient({
      connection: { hostname: host, port, tls: port === 465, auth: { username, password } },
    })
    await client.send({ from, to: inv.email, subject: subject || 'Invitation', content: text })
    await client.close()

    return json({ ok: true, to: inv.email })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Send failed' }, 500)
  }
})
