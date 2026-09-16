import { supabase } from '../lib/supabase'
import { extractDomain, normalizePhone } from '../lib/defaults'
import type { Supplier } from '../types'

const TABLE = 'ex_suppliers'

function toRow(s: Supplier) {
  const { user_id: _omit, ...row } = s
  // Keep the domain index useful by deriving it from website/email on save.
  row.domain = extractDomain(s.website) || extractDomain(s.email) || s.domain || ''
  return row
}

export async function listSuppliers(search = ''): Promise<Supplier[]> {
  let q = supabase.from(TABLE).select('*').order('company_name', { ascending: true })
  const term = search.trim()
  if (term) {
    const like = `%${term}%`
    q = q.or(
      [
        `company_name.ilike.${like}`,
        `aliases.ilike.${like}`,
        `product_summary.ilike.${like}`,
        `city.ilike.${like}`,
        `country.ilike.${like}`,
        `website.ilike.${like}`,
        `notes.ilike.${like}`,
      ].join(','),
    )
  }
  const { data, error } = await q
  if (error) throw error
  return (data as Supplier[]) ?? []
}

export async function getSupplier(id: string): Promise<Supplier | null> {
  const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return (data as Supplier) ?? null
}

export async function saveSupplier(s: Supplier): Promise<Supplier> {
  const { data, error } = await supabase.from(TABLE).upsert(toRow(s)).select('*').single()
  if (error) throw error
  return data as Supplier
}

export async function deleteSupplier(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id)
  if (error) throw error
}

export interface DuplicateMatch {
  supplier: Supplier
  reasons: string[]
  score: number
}

/**
 * Find possible existing suppliers for a captured company/card, per the brief's
 * "Possible Existing Supplier Found" rule. Never auto-merges — returns ranked
 * candidates for the user to confirm.
 */
export async function findDuplicates(candidate: {
  company_name?: string
  website?: string
  email?: string
  phone?: string
  wechat?: string
}): Promise<DuplicateMatch[]> {
  const all = await listSuppliers()
  const name = (candidate.company_name || '').trim().toLowerCase()
  const domain = extractDomain(candidate.website || '') || extractDomain(candidate.email || '')
  const phone = normalizePhone(candidate.phone || '')
  const wechat = (candidate.wechat || '').trim().toLowerCase()

  const matches: DuplicateMatch[] = []
  for (const s of all) {
    const reasons: string[] = []
    let score = 0
    const sName = s.company_name.trim().toLowerCase()
    if (name && sName) {
      if (sName === name) {
        reasons.push('Same company name')
        score += 5
      } else if (sName.includes(name) || name.includes(sName)) {
        reasons.push('Similar company name')
        score += 2
      }
    }
    if (domain && s.domain && s.domain === domain) {
      reasons.push(`Same domain (${domain})`)
      score += 4
    }
    if (phone && phone.length >= 6) {
      if (normalizePhone(s.phone) === phone) {
        reasons.push('Same phone')
        score += 4
      }
    }
    if (wechat && s.wechat.trim().toLowerCase() === wechat) {
      reasons.push('Same WeChat')
      score += 3
    }
    if (score > 0) matches.push({ supplier: s, reasons, score })
  }
  return matches.sort((a, b) => b.score - a.score).slice(0, 5)
}
