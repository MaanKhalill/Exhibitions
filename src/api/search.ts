import { supabase } from '../lib/supabase'
import { DEMO, demo } from '../lib/demo'
import type { ExhibitionRef, Supplier, SupplierSearchResult } from '../types'

interface SupplierRow extends Supplier {
  participations?: { exhibition: ExhibitionRef | null }[]
}
interface PartRow {
  products_shown: string
  notes: string
  supplier: Supplier | null
  exhibition: ExhibitionRef | null
}

/**
 * Cross-exhibition supplier & product search. Matches supplier fields and
 * exhibition-specific product/notes text, and shows where each supplier was met.
 */
export async function globalSearch(term: string): Promise<SupplierSearchResult[]> {
  if (DEMO) return demo.globalSearch(term)
  const q = term.trim()
  if (!q) return []
  const like = `%${q}%`

  const [sRes, pRes] = await Promise.all([
    supabase
      .from('ex_suppliers')
      .select('*, participations:ex_participations(exhibition:ex_exhibitions(id,name,edition,status))')
      .or(
        [
          `company_name.ilike.${like}`,
          `aliases.ilike.${like}`,
          `product_summary.ilike.${like}`,
          `city.ilike.${like}`,
          `country.ilike.${like}`,
          `website.ilike.${like}`,
          `notes.ilike.${like}`,
        ].join(','),
      ),
    supabase
      .from('ex_participations')
      .select('products_shown, notes, supplier:ex_suppliers(*), exhibition:ex_exhibitions(id,name,edition,status)')
      .or(`products_shown.ilike.${like},notes.ilike.${like}`),
  ])
  if (sRes.error) throw sRes.error
  if (pRes.error) throw pRes.error

  const byId = new Map<string, SupplierSearchResult>()
  const add = (supplier: Supplier, exhibition: ExhibitionRef | null, snippet: string) => {
    let entry = byId.get(supplier.id)
    if (!entry) {
      entry = { supplier, exhibitions: [], snippet }
      byId.set(supplier.id, entry)
    }
    if (exhibition && !entry.exhibitions.some((e) => e.id === exhibition.id)) {
      entry.exhibitions.push(exhibition)
    }
    if (!entry.snippet && snippet) entry.snippet = snippet
  }

  for (const s of (sRes.data as SupplierRow[]) ?? []) {
    add(s, null, s.product_summary || '')
    for (const p of s.participations ?? []) if (p.exhibition) add(s, p.exhibition, s.product_summary || '')
  }
  for (const p of (pRes.data as unknown as PartRow[]) ?? []) {
    if (p.supplier) add(p.supplier, p.exhibition, p.products_shown || p.notes || '')
  }

  return Array.from(byId.values()).sort((a, b) =>
    a.supplier.company_name.localeCompare(b.supplier.company_name),
  )
}
