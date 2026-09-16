import { supabase } from '../lib/supabase'
import type { Contact } from '../types'

const TABLE = 'ex_contacts'

function toRow(c: Contact) {
  const { user_id: _omit, ...row } = c
  return row
}

export async function listContactsForSupplier(supplierId: string): Promise<Contact[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('supplier_id', supplierId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data as Contact[]) ?? []
}

export async function saveContact(c: Contact): Promise<Contact> {
  const { data, error } = await supabase.from(TABLE).upsert(toRow(c)).select('*').single()
  if (error) throw error
  return data as Contact
}

export async function deleteContact(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id)
  if (error) throw error
}
