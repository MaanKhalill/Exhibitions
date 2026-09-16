import { supabase } from '../lib/supabase'
import { DEMO, demo } from '../lib/demo'
import type { Factory } from '../types'

const TABLE = 'ex_factories'

function toRow(f: Factory) {
  const { user_id: _omit, ...row } = f
  return row
}

export async function listFactories(): Promise<Factory[]> {
  if (DEMO) return demo.listFactories()
  const { data, error } = await supabase.from(TABLE).select('*')
  if (error) throw error
  return (data as Factory[]) ?? []
}

export async function saveFactory(f: Factory): Promise<Factory> {
  if (DEMO) return demo.saveFactory(f)
  const { data, error } = await supabase
    .from(TABLE)
    .upsert(toRow(f), { onConflict: 'supplier_id' })
    .select('*')
    .single()
  if (error) throw error
  return data as Factory
}
