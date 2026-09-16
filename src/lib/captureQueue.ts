import { insertMediaRow, uploadMedia, type MediaMeta } from '../api/media'
import { supabase } from './supabase'
import { DEMO } from './demo'

/**
 * Offline-tolerant capture queue (brief §11). Every photo/scan/note is written
 * to a local outbox immediately so nothing is lost when connectivity drops in
 * the halls, then uploaded and recorded when the network returns. Originals are
 * preserved. Status: Saved locally → Synchronizing → Synchronized / failed.
 */

export interface PendingCapture {
  id: string // == media row id, stable
  dataUrl?: string // compressed image, if any
  folder: string // storage folder (e.g. 'product')
  meta: MediaMeta
  created_at: string
}

interface QueueState {
  pending: PendingCapture[]
  online: boolean
  syncing: boolean
  lastError: string | null
}

const KEY = 'ex_media_queue'
let pending: PendingCapture[] = load()
let online = typeof navigator !== 'undefined' ? navigator.onLine : true
let syncing = false
let lastError: string | null = null

const listeners = new Set<() => void>()
let snapshot: QueueState = compute()

function load(): PendingCapture[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as PendingCapture[]) : []
  } catch {
    return []
  }
}
function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(pending))
  } catch {
    // storage full (large images) — in-memory copy still drives the upload
  }
}
function compute(): QueueState {
  return { pending: pending.slice(), online, syncing, lastError }
}
function emit() {
  snapshot = compute()
  for (const l of listeners) l()
}

export const captureQueue = {
  subscribe(l: () => void) {
    listeners.add(l)
    return () => listeners.delete(l)
  },
  getSnapshot(): QueueState {
    return snapshot
  },
}

export function enqueueCapture(item: Omit<PendingCapture, 'created_at'>) {
  pending.push({ ...item, created_at: new Date().toISOString() })
  persist()
  emit()
  void flushCaptures()
}

export function pendingForSupplier(supplierId: string): PendingCapture[] {
  return pending.filter((p) => p.meta.supplier_id === supplierId)
}

async function authed(): Promise<boolean> {
  if (DEMO) return true
  const { data } = await supabase.auth.getSession()
  return Boolean(data.session)
}

export async function flushCaptures(): Promise<void> {
  if (syncing || !online || pending.length === 0) return
  if (!(await authed())) return
  syncing = true
  lastError = null
  emit()
  try {
    while (pending.length > 0) {
      const item = pending[0]
      let path = item.meta.path ?? null
      if (item.dataUrl && !path) {
        path = await uploadMedia(item.dataUrl, item.folder)
      }
      await insertMediaRow({ ...item.meta, id: item.id, path })
      pending.shift()
      persist()
      emit()
    }
  } catch (err) {
    lastError = err instanceof Error ? err.message : 'Upload failed'
  } finally {
    syncing = false
    emit()
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    online = true
    emit()
    void flushCaptures()
  })
  window.addEventListener('offline', () => {
    online = false
    emit()
  })
}
