import { MEDIA_BUCKET, supabase } from '../lib/supabase'
import { dataUrlToBlob } from '../lib/image'

async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  const id = data.session?.user.id
  if (!id) throw new Error('Not signed in')
  return id
}

/** Upload a compressed data URL to the private media bucket, returning its path. */
export async function uploadMedia(dataUrl: string, folder: string): Promise<string> {
  const userId = await currentUserId()
  const path = `${userId}/${folder}/${crypto.randomUUID()}.jpg`
  const blob = dataUrlToBlob(dataUrl)
  const { error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
  if (error) throw error
  return path
}

/** Short-lived signed URL for displaying a private media object. */
export async function mediaUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .createSignedUrl(path, 60 * 60)
  if (error) return null
  return data.signedUrl
}
