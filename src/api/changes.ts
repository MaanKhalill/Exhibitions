import { supabase } from '../lib/supabase'
import { DEMO, demo } from '../lib/demo'
import type { SupplierChange } from '../types'

/** Change-history entries for a supplier, newest first. */
export async function listSupplierChanges(supplierId: string): Promise<SupplierChange[]> {
  if (DEMO) return demo.listSupplierChanges(supplierId)
  const { data, error } = await supabase
    .from('ex_supplier_changes')
    .select('*')
    .eq('supplier_id', supplierId)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw error
  return (data as SupplierChange[]) ?? []
}
