// Public Edge Function (verify_jwt = false). The invitation token is the
// capability; anonymous callers never touch the tables directly. Records the
// first-open time (starts the from-first-open validity window), reports expiry,
// and returns the inviter's public profile so the supplier sees who invited
// them. Returns only supplier-facing fields for prefilling the public form.
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
    const { token } = await req.json()
    if (!token) return json({ error: 'Missing token' }, 400)
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const { data: inv, error } = await admin
      .from('ex_invitations')
      .select('id, token, company_name, contact_name, email, phone, purpose, status, responded_at, exhibition_id, user_id, opened_at, expires_at, ttl_hours')
      .eq('token', token)
      .maybeSingle()
    if (error) return json({ error: error.message }, 500)
    if (!inv) return json({ error: 'Invitation not found' }, 404)

    let opened = inv.opened_at as string | null
    if (!opened) {
      opened = new Date().toISOString()
      await admin.from('ex_invitations').update({ opened_at: opened }).eq('id', inv.id)
    }

    const nowMs = Date.now()
    let effExpiry: number | null = null
    if (inv.expires_at) effExpiry = Date.parse(inv.expires_at as string)
    if (effExpiry == null && inv.ttl_hours && opened) effExpiry = Date.parse(opened) + Number(inv.ttl_hours) * 3600000
    const expired = effExpiry != null && nowMs > effExpiry

    const { data: ex } = await admin
      .from('ex_exhibitions')
      .select('name, edition, city, country, venue, start_date, end_date, trip_start, trip_end')
      .eq('id', inv.exhibition_id)
      .maybeSingle()

    const { data: prof } = await admin
      .from('ex_profiles')
      .select('owner_name, company_name, whatsapp, wechat, email, website, country, bio, address')
      .eq('user_id', inv.user_id)
      .maybeSingle()

    return json({
      invitation: {
        company_name: inv.company_name,
        contact_name: inv.contact_name,
        email: inv.email,
        phone: inv.phone,
        purpose: inv.purpose,
        already_responded:
          Boolean(inv.responded_at) ||
          ['received', 'incomplete', 'meeting_proposed', 'meeting_confirmed'].includes(inv.status),
      },
      exhibition: ex ?? null,
      inviter: prof ?? null,
      expired,
      expires_at: effExpiry != null ? new Date(effExpiry).toISOString() : null,
    })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Bad request' }, 400)
  }
})
