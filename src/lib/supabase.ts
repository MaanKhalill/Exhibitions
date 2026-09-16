import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * True when the app has been configured with Supabase credentials.
 * When false, the UI shows a friendly setup screen instead of crashing.
 */
export const isConfigured = Boolean(url && anonKey)

export const PHOTO_BUCKET = 'cf-photos'

// A harmless placeholder keeps createClient from throwing before setup.
export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storageKey: 'canton-fair-auth',
    },
  },
)
