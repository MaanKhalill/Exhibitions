import { supabase, PHOTO_BUCKET } from './supabase'
import { dataUrlToBlob } from './image'
import type { Product, Supplier } from '../types'

/**
 * Offline-first data store.
 *
 * Everything the user captures is written immediately to a local cache and to
 * an "outbox" of pending operations. Whenever the device is online and signed
 * in, the outbox is flushed to Supabase in order. Reads come from the cache so
 * the app is fully usable with no connection — essential inside the fair halls.
 */

type Op =
  | { opId: string; entity: 'supplier'; action: 'upsert'; data: Supplier }
  | { opId: string; entity: 'supplier'; action: 'delete'; targetId: string }
  | { opId: string; entity: 'product'; action: 'upsert'; data: Product }
  | { opId: string; entity: 'product'; action: 'delete'; targetId: string }

export interface StoreState {
  suppliers: Supplier[]
  products: Product[]
  pending: number
  online: boolean
  syncing: boolean
  loaded: boolean
  lastError: string | null
}

const CACHE_SUPPLIERS = 'cf_suppliers'
const CACHE_PRODUCTS = 'cf_products'
const CACHE_OUTBOX = 'cf_outbox'

let suppliers: Supplier[] = load(CACHE_SUPPLIERS, [])
let products: Product[] = load(CACHE_PRODUCTS, [])
let outbox: Op[] = load(CACHE_OUTBOX, [])
let online = typeof navigator !== 'undefined' ? navigator.onLine : true
let syncing = false
let loaded = false
let lastError: string | null = null

const listeners = new Set<() => void>()
let snapshot: StoreState = compute()

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage full or unavailable (private mode). The in-memory copy still works.
  }
}

function compute(): StoreState {
  return {
    suppliers: suppliers.slice().sort((a, b) => b.created_at.localeCompare(a.created_at)),
    products: products.slice(),
    pending: outbox.length,
    online,
    syncing,
    loaded,
    lastError,
  }
}

function emit() {
  snapshot = compute()
  for (const l of listeners) l()
}

export const store = {
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  getSnapshot(): StoreState {
    return snapshot
  },
}

export function productsFor(supplierId: string): Product[] {
  return products
    .filter((p) => p.supplier_id === supplierId)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
}

export function getSupplier(id: string): Supplier | undefined {
  return suppliers.find((s) => s.id === id)
}

// ---- mutations (optimistic) ----

export function saveSupplier(s: Supplier) {
  const next = { ...s, updated_at: new Date().toISOString() }
  const i = suppliers.findIndex((x) => x.id === next.id)
  if (i >= 0) suppliers[i] = next
  else suppliers = [next, ...suppliers]
  save(CACHE_SUPPLIERS, suppliers)
  enqueue({ opId: crypto.randomUUID(), entity: 'supplier', action: 'upsert', data: next })
}

export function removeSupplier(id: string) {
  suppliers = suppliers.filter((s) => s.id !== id)
  products = products.filter((p) => p.supplier_id !== id)
  save(CACHE_SUPPLIERS, suppliers)
  save(CACHE_PRODUCTS, products)
  enqueue({ opId: crypto.randomUUID(), entity: 'supplier', action: 'delete', targetId: id })
}

export function saveProduct(p: Product) {
  const next = { ...p, updated_at: new Date().toISOString() }
  const i = products.findIndex((x) => x.id === next.id)
  if (i >= 0) products[i] = next
  else products = [...products, next]
  save(CACHE_PRODUCTS, products)
  enqueue({ opId: crypto.randomUUID(), entity: 'product', action: 'upsert', data: next })
}

export function removeProduct(id: string) {
  products = products.filter((p) => p.id !== id)
  save(CACHE_PRODUCTS, products)
  enqueue({ opId: crypto.randomUUID(), entity: 'product', action: 'delete', targetId: id })
}

function enqueue(op: Op) {
  outbox.push(op)
  save(CACHE_OUTBOX, outbox)
  emit()
  void flush()
}

// ---- sync ----

function supplierRow(s: Supplier) {
  const { user_id: _ignore, ...row } = s
  return row
}

function productRow(p: Product) {
  const { user_id: _ignore, pending_photo: _p, ...row } = p
  return row
}

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.user.id ?? null
}

export async function flush(): Promise<void> {
  if (syncing || !online || outbox.length === 0) return
  const userId = await currentUserId()
  if (!userId) return // not signed in yet
  syncing = true
  lastError = null
  emit()
  try {
    while (outbox.length > 0) {
      const op = outbox[0]
      await apply(op, userId)
      outbox.shift()
      save(CACHE_OUTBOX, outbox)
      emit()
    }
  } catch (err) {
    lastError = err instanceof Error ? err.message : 'Sync failed'
  } finally {
    syncing = false
    emit()
  }
}

async function apply(op: Op, userId: string): Promise<void> {
  if (op.entity === 'supplier') {
    if (op.action === 'upsert') {
      const { error } = await supabase.from('suppliers').upsert(supplierRow(op.data))
      if (error) throw error
    } else {
      const { error } = await supabase.from('suppliers').delete().eq('id', op.targetId)
      if (error) throw error
    }
    return
  }
  // product
  if (op.action === 'delete') {
    const { error } = await supabase.from('products').delete().eq('id', op.targetId)
    if (error) throw error
    return
  }
  let data = op.data
  if (data.pending_photo) {
    const path = `${userId}/${data.id}.jpg`
    const blob = dataUrlToBlob(data.pending_photo)
    const up = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
    if (up.error) throw up.error
    data = { ...data, photo_path: path, pending_photo: null }
    // reflect the uploaded path back into the cache
    const i = products.findIndex((x) => x.id === data.id)
    if (i >= 0) {
      products[i] = data
      save(CACHE_PRODUCTS, products)
    }
  }
  const { error } = await supabase.from('products').upsert(productRow(data))
  if (error) throw error
}

/** Pull the authoritative data set from Supabase and merge into the cache. */
export async function refreshFromServer(): Promise<void> {
  if (!online) return
  const userId = await currentUserId()
  if (!userId) return
  // Push local changes first so a pull never clobbers unsynced edits.
  await flush()
  if (outbox.length > 0) return // still pending; keep local view
  try {
    const [sRes, pRes] = await Promise.all([
      supabase.from('suppliers').select('*'),
      supabase.from('products').select('*'),
    ])
    if (sRes.error) throw sRes.error
    if (pRes.error) throw pRes.error
    suppliers = (sRes.data as Supplier[]) ?? []
    products = ((pRes.data as Product[]) ?? []).map((p) => ({ ...p, pending_photo: null }))
    save(CACHE_SUPPLIERS, suppliers)
    save(CACHE_PRODUCTS, products)
    lastError = null
  } catch (err) {
    lastError = err instanceof Error ? err.message : 'Could not load from server'
  } finally {
    loaded = true
    emit()
  }
}

/** Signed URL for a product photo stored in Supabase Storage. */
export async function photoUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .createSignedUrl(path, 60 * 60)
  if (error) return null
  return data.signedUrl
}

export function markLoaded() {
  loaded = true
  emit()
}

export function clearLocalData() {
  suppliers = []
  products = []
  outbox = []
  save(CACHE_SUPPLIERS, suppliers)
  save(CACHE_PRODUCTS, products)
  save(CACHE_OUTBOX, outbox)
  loaded = false
  emit()
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    online = true
    emit()
    void flush()
  })
  window.addEventListener('offline', () => {
    online = false
    emit()
  })
}
