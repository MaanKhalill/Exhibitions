import { supabase } from '../lib/supabase'
import { DEMO, demo } from '../lib/demo'
import type { Contact } from '../types'

const TABLE = 'ex_contacts'

function toRow(c: Contact) {
  const { user_id: _omit, ...row } = c
  return row
}

export async function listContactsForSupplier(supplierId: string): Promise<Contact[]> {
  if (DEMO) return demo.listContactsForSupplier(supplierId)
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('supplier_id', supplierId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data as Contact[]) ?? []
}

export async function saveContact(c: Contact): Promise<Contact> {
  if (DEMO) return demo.saveContact(c)
  const { data, error } = await supabase.from(TABLE).upsert(toRow(c)).select('*').single()
  if (error) throw error
  return data as Contact
}

export async function deleteContact(id: string): Promise<void> {
  if (DEMO) return demo.deleteContact(id)
  const { error } = await supabase.from(TABLE).delete().eq('id', id)
  if (error) throw error
}
