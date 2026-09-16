import { supabase } from '../lib/supabase'
import { DEMO, demo } from '../lib/demo'
import { parseBooth } from '../lib/booth'
import type { Participation, ParticipationWithSupplier } from '../types'

const TABLE = 'ex_participations'

function toRow(p: Participation) {
  const { user_id: _omit, ...row } = p
  // Keep the parsed booth fields in sync with the raw booth string on save.
  if (row.booth_raw) {
    const parsed = parseBooth(row.booth_raw)
    row.booth_section = parsed.section
    row.booth_number = parsed.number
    if (!row.hall && parsed.hall) row.hall = parsed.hall
  }
  return row
}

export async function listParticipations(
  exhibitionId: string,
): Promise<ParticipationWithSupplier[]> {
  if (DEMO) return demo.listParticipations(exhibitionId)
  const { data, error } = await supabase
    .from(TABLE)
    .select('*, supplier:ex_suppliers(*)')
    .eq('exhibition_id', exhibitionId)
  if (error) throw error
  return (data as ParticipationWithSupplier[]) ?? []
}

export async function listParticipationsForSupplier(
  supplierId: string,
): Promise<Participation[]> {
  if (DEMO) return demo.listParticipationsForSupplier(supplierId)
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('supplier_id', supplierId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data as Participation[]) ?? []
}

export async function getParticipation(
  exhibitionId: string,
  supplierId: string,
): Promise<Participation | null> {
  if (DEMO) return demo.getParticipation(exhibitionId, supplierId)
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('exhibition_id', exhibitionId)
    .eq('supplier_id', supplierId)
    .maybeSingle()
  if (error) throw error
  return (data as Participation) ?? null
}

export async function saveParticipation(p: Participation): Promise<Participation> {
  if (DEMO) return demo.saveParticipation(p)
  const { data, error } = await supabase
    .from(TABLE)
    .upsert(toRow(p), { onConflict: 'exhibition_id,supplier_id' })
    .select('*')
    .single()
  if (error) throw error
  return data as Participation
}

export async function deleteParticipation(id: string): Promise<void> {
  if (DEMO) return demo.deleteParticipation(id)
  const { error } = await supabase.from(TABLE).delete().eq('id', id)
  if (error) throw error
}

/** Partial update by id (e.g. plan_day, visit_status) for the planner. */
export async function patchParticipation(
  id: string,
  patch: Partial<Participation>,
): Promise<void> {
  if (DEMO) return demo.patchParticipation(id, patch)
  const { error } = await supabase.from(TABLE).update(patch).eq('id', id)
  if (error) throw error
}
