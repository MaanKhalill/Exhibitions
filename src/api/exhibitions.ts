import { supabase } from '../lib/supabase'
import type { Exhibition } from '../types'

const TABLE = 'ex_exhibitions'

function toRow(e: Exhibition) {
  const { user_id: _omit, ...row } = e
  return row
}

export async function listExhibitions(): Promise<Exhibition[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('start_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as Exhibition[]) ?? []
}

export async function getExhibition(id: string): Promise<Exhibition | null> {
  const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return (data as Exhibition) ?? null
}

export async function saveExhibition(e: Exhibition): Promise<Exhibition> {
  const { data, error } = await supabase.from(TABLE).upsert(toRow(e)).select('*').single()
  if (error) throw error
  return data as Exhibition
}

export async function deleteExhibition(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id)
  if (error) throw error
}
