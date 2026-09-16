import { supabase } from '../lib/supabase'
import { DEMO, demo } from '../lib/demo'
import { emptyEmailSettings, type EmailSettings } from '../types'

const TABLE = 'ex_email_settings'
// Never select the raw password (the client has no read grant on it).
const READ_COLS = 'host, port, username, from_email, from_name, secure, password_set'

export async function getEmailSettings(): Promise<EmailSettings> {
  if (DEMO) return demo.getEmailSettings()
  const { data, error } = await supabase.from(TABLE).select(READ_COLS).maybeSingle()
  if (error) throw error
  return (data as EmailSettings) ?? emptyEmailSettings()
}

/**
 * Save SMTP settings. `password` is optional: pass a new one to set/replace it,
 * or leave it undefined/empty to keep the stored password unchanged.
 */
export async function saveEmailSettings(s: EmailSettings, password?: string): Promise<EmailSettings> {
  if (DEMO) return demo.saveEmailSettings(s, password)
  const { data: session } = await supabase.auth.getSession()
  const userId = session.session?.user.id
  if (!userId) throw new Error('Not signed in')
  const row: Record<string, unknown> = {
    user_id: userId,
    host: s.host,
    port: s.port,
    username: s.username,
    from_email: s.from_email,
    from_name: s.from_name,
    secure: s.secure,
    updated_at: new Date().toISOString(),
  }
  if (password && password.length) row.password = password
  const { data, error } = await supabase
    .from(TABLE)
    .upsert(row, { onConflict: 'user_id' })
    .select(READ_COLS)
    .single()
  if (error) throw error
  return data as EmailSettings
}
