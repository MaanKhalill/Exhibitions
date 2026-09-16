// Public Edge Function (verify_jwt = false). Accepts a supplier's form response
// keyed by the invitation token and, using the service role, de-duplicates
// against the owning admin's suppliers, then links/creates the supplier and
// upserts the exhibition participation. Anonymous callers never touch the
// tables directly and never see internal fields.
//
// Overwrite policy: a value the supplier provides REPLACES the stored one
// (their latest submission wins — this powers "update your data"), but a blank
// field never wipes existing data. Exhibition history (participations, media)
// is kept per exhibition and is never overwritten across exhibitions.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}
function extractDomain(s: string): string {
  if (!s) return ''
  let v = s.trim().toLowerCase()
  if (v.includes('@')) v = v.split('@')[1] || ''
  v = v.replace(/^https?:\/\//, '').replace(/^www\./, '')
  return v.split('/')[0].split('?')[0]
}
function normPhone(s: string): string { return (s || '').replace(/\D/g, '') }
function parseBooth(raw: string) {
  const empty = { hall: '', section: '', number: '' }
  if (!raw) return empty
  const s = raw.trim().replace(/booth|stand|no\.?/gi, ' ').replace(/\s+/g, ' ').trim()
  const hallMatch = s.match(/(?:hall\s*)?(\d{1,2}(?:\.\d)?)/i)
  const hall = hallMatch ? hallMatch[1] : ''
  let rest = s
  if (hallMatch) rest = s.slice((hallMatch.index || 0) + hallMatch[0].length)
  const sn = rest.match(/([A-Za-z])\s*[-–]?\s*(\d{1,4}(?:\s*[-–]\s*\d{1,4})?[A-Za-z]?)/)
  if (sn) return { hall, section: sn[1].toUpperCase(), number: sn[2].replace(/\s+/g, '') }
  const numOnly = rest.match(/(\d{1,4}(?:\s*[-–]\s*\d{1,4})?)/)
  return { hall, section: '', number: numOnly ? numOnly[1].replace(/\s+/g, '') : '' }
}
const nz = (a: string, b: string) => (a && a.trim() ? a : b)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const { token, payload } = await req.json()
    if (!token) return json({ error: 'Missing token' }, 400)
    const p = payload || {}
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const { data: inv, error: invErr } = await admin.from('ex_invitations').select('*').eq('token', token).maybeSingle()
    if (invErr) return json({ error: invErr.message }, 500)
    if (!inv) return json({ error: 'Invitation not found' }, 404)

    // Enforce link expiry (absolute expires_at, or ttl_hours from first open).
    let effExpiry: number | null = null
    if (inv.expires_at) effExpiry = Date.parse(inv.expires_at as string)
    else if (inv.ttl_hours && inv.opened_at) effExpiry = Date.parse(inv.opened_at as string) + Number(inv.ttl_hours) * 3600000
    if (effExpiry != null && Date.now() > effExpiry) {
      return json({ error: 'This link has expired. Please ask your contact for a new one.', expired: true })
    }

    const owner = inv.user_id
    const companyName = nz(p.company_name, inv.company_name)
    const website = p.website || ''
    const domain = extractDomain(website) || extractDomain(p.email || '')
    const phone = p.phone || inv.phone || ''

    let supplierId: string | null = inv.supplier_id
    if (!supplierId) {
      const { data: candidates } = await admin.from('ex_suppliers').select('id, company_name, domain, phone').eq('user_id', owner)
      const match = (candidates || []).find((c: any) => {
        if (domain && c.domain && c.domain === domain) return true
        if (companyName && c.company_name && c.company_name.trim().toLowerCase() === companyName.trim().toLowerCase()) return true
        if (phone && normPhone(c.phone) && normPhone(c.phone) === normPhone(phone)) return true
        return false
      })
      supplierId = match?.id ?? null
    }

    if (supplierId) {
      const { data: cur } = await admin.from('ex_suppliers').select('*').eq('id', supplierId).maybeSingle()
      // Prefer the supplier's freshly submitted value; keep the stored one only
      // when the new value is blank (so an untouched field is never wiped).
      await admin.from('ex_suppliers').update({
        company_name: nz(companyName, cur?.company_name),
        product_summary: nz(p.product_summary || '', cur?.product_summary),
        website: nz(website, cur?.website),
        domain: nz(domain, cur?.domain),
        phone: nz(phone, cur?.phone),
        wechat: nz(p.wechat || '', cur?.wechat),
        email: nz(p.email || '', cur?.email),
        city: nz(p.city || '', cur?.city),
        country: nz(p.country || '', cur?.country),
        address: nz(p.address || '', cur?.address),
      }).eq('id', supplierId)
    } else {
      const { data: created, error: cErr } = await admin.from('ex_suppliers').insert({
        user_id: owner,
        company_name: companyName,
        product_summary: p.product_summary || '',
        website, domain, phone,
        wechat: p.wechat || '',
        email: p.email || inv.email || '',
        city: p.city || '', country: p.country || '', address: p.address || '',
        first_met_exhibition_id: inv.exhibition_id,
      }).select('id').single()
      if (cErr) return json({ error: cErr.message }, 500)
      supplierId = created.id
    }

    const contactName = p.contact_name || inv.contact_name || ''
    if (contactName) {
      // Refresh the contact of the same name if we already have one (new values
      // win, blanks keep the old); otherwise add them as a new contact.
      const { data: existingContacts } = await admin
        .from('ex_contacts').select('id, name, phone, wechat, email').eq('supplier_id', supplierId)
      const match = (existingContacts || []).find(
        (c: any) => (c.name || '').trim().toLowerCase() === contactName.trim().toLowerCase(),
      )
      if (match) {
        await admin.from('ex_contacts').update({
          phone: nz(phone, match.phone),
          wechat: nz(p.wechat || '', match.wechat),
          email: nz(p.email || '', match.email),
        }).eq('id', match.id)
      } else {
        await admin.from('ex_contacts').insert({
          user_id: owner, supplier_id: supplierId, name: contactName,
          phone, wechat: p.wechat || '', email: p.email || '',
          first_met_exhibition_id: inv.exhibition_id,
        })
      }
    }

    const booth = p.booth || ''
    const parsed = parseBooth(booth)
    const { data: existingPart } = await admin.from('ex_participations').select('id').eq('exhibition_id', inv.exhibition_id).eq('supplier_id', supplierId).maybeSingle()
    const partRow: Record<string, unknown> = {
      user_id: owner,
      exhibition_id: inv.exhibition_id,
      supplier_id: supplierId,
      hall: p.hall || parsed.hall || '',
      booth, booth_raw: booth, booth_section: parsed.section, booth_number: parsed.number,
      area: p.area || '',
      booth_contact_name: p.booth_contact_name || contactName,
      booth_contact_phone: p.booth_contact_phone || phone,
      products_shown: p.product_summary || '',
      preferred_meeting: p.preferred_meeting || null,
    }
    if (existingPart) await admin.from('ex_participations').update(partRow).eq('id', existingPart.id)
    else await admin.from('ex_participations').insert(partRow)

    await admin.from('ex_invitations').update({
      response: p, status: 'received', responded_at: new Date().toISOString(), supplier_id: supplierId,
    }).eq('id', inv.id)
    await admin.from('ex_invitation_events').insert({
      user_id: owner, invitation_id: inv.id, type: 'response_submitted',
      detail: p.participate ? `Participation: ${p.participate}` : 'Response received',
    })

    return json({ ok: true })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Bad request' }, 400)
  }
})
