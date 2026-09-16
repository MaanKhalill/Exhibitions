import { supabase } from '../lib/supabase'
import { DEMO, demo } from '../lib/demo'
import { emptyProfile, type Profile } from '../types'

const TABLE = 'ex_profiles'

export async function getProfile(): Promise<Profile> {
  if (DEMO) return demo.getProfile()
  const { data, error } = await supabase.from(TABLE).select('*').maybeSingle()
  if (error) throw error
  return (data as Profile) ?? emptyProfile()
}

export async function saveProfile(p: Profile): Promise<Profile> {
  if (DEMO) return demo.saveProfile(p)
  const { data: session } = await supabase.auth.getSession()
  const userId = session.session?.user.id
  if (!userId) throw new Error('Not signed in')
  const { created_at: _c, updated_at: _u, ...fields } = p
  const { data, error } = await supabase
    .from(TABLE)
    .upsert({ ...fields, user_id: userId }, { onConflict: 'user_id' })
    .select('*')
    .single()
  if (error) throw error
  return data as Profile
}
