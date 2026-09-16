import { MEDIA_BUCKET, supabase } from '../lib/supabase'
import { dataUrlToBlob } from '../lib/image'
import type { MediaItem, MediaKind } from '../types'

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

export interface MediaMeta {
  id?: string
  kind: MediaKind
  exhibition_id?: string | null
  supplier_id?: string | null
  participation_id?: string | null
  caption?: string
  decoded_content?: string
  flags?: string
  path?: string | null
}

export async function insertMediaRow(meta: MediaMeta): Promise<MediaItem> {
  const row = {
    id: meta.id ?? crypto.randomUUID(),
    kind: meta.kind,
    exhibition_id: meta.exhibition_id ?? null,
    supplier_id: meta.supplier_id ?? null,
    participation_id: meta.participation_id ?? null,
    caption: meta.caption ?? '',
    decoded_content: meta.decoded_content ?? '',
    flags: meta.flags ?? '',
    path: meta.path ?? null,
  }
  const { data, error } = await supabase.from('ex_media').insert(row).select('*').single()
  if (error) throw error
  return data as MediaItem
}

export async function listMediaForSupplier(supplierId: string): Promise<MediaItem[]> {
  const { data, error } = await supabase
    .from('ex_media')
    .select('*')
    .eq('supplier_id', supplierId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as MediaItem[]) ?? []
}

export async function updateMediaRow(
  id: string,
  patch: { caption?: string; flags?: string; decoded_content?: string },
): Promise<void> {
  const { error } = await supabase.from('ex_media').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteMedia(item: MediaItem): Promise<void> {
  const { error } = await supabase.from('ex_media').delete().eq('id', item.id)
  if (error) throw error
  if (item.path) {
    await supabase.storage.from(MEDIA_BUCKET).remove([item.path])
  }
}
