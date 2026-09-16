import { supabase } from '../lib/supabase'
import { DEMO, demo } from '../lib/demo'
import type { Exhibition } from '../types'

const TABLE = 'ex_exhibitions'

function toRow(e: Exhibition) {
  const { user_id: _omit, ...row } = e
  return row
}

export async function listExhibitions(): Promise<Exhibition[]> {
  if (DEMO) return demo.listExhibitions()
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('start_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as Exhibition[]) ?? []
}

export async function getExhibition(id: string): Promise<Exhibition | null> {
  if (DEMO) return demo.getExhibition(id)
  const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return (data as Exhibition) ?? null
}

export async function saveExhibition(e: Exhibition): Promise<Exhibition> {
  if (DEMO) return demo.saveExhibition(e)
  const { data, error } = await supabase.from(TABLE).upsert(toRow(e)).select('*').single()
  if (error) throw error
  return data as Exhibition
}

export async function deleteExhibition(id: string): Promise<void> {
  if (DEMO) return demo.deleteExhibition(id)
  const { error } = await supabase.from(TABLE).delete().eq('id', id)
  if (error) throw error
}
