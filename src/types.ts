export type SupplierStatus =
  | 'new'
  | 'quote'
  | 'sample'
  | 'ordered'
  | 'skip'

export const STATUS_LABELS: Record<SupplierStatus, string> = {
  new: 'New',
  quote: 'Quote requested',
  sample: 'Sample requested',
  ordered: 'Ordered',
  skip: 'Not interested',
}

export const CATEGORIES = [
  'Electronics & Appliances',
  'Lighting',
  'Machinery',
  'Building Materials',
  'Home & Kitchen',
  'Furniture',
  'Textiles & Garments',
  'Bags & Shoes',
  'Toys & Gifts',
  'Beauty & Health',
  'Auto & Motorcycle',
  'Packaging',
  'Office & Stationery',
  'Other',
] as const

export interface Supplier {
  id: string
  user_id?: string
  company_name: string
  hall: string
  booth: string
  category: string
  contact_name: string
  phone: string
  wechat: string
  email: string
  website: string
  rating: number
  status: SupplierStatus
  notes: string
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  supplier_id: string
  user_id?: string
  name: string
  model: string
  moq: string
  unit_price: string
  currency: string
  notes: string
  photo_path: string | null
  /** Client-only: a data URL captured offline, not yet uploaded to storage. */
  pending_photo?: string | null
  created_at: string
  updated_at: string
}

export function newSupplier(): Supplier {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    company_name: '',
    hall: '',
    booth: '',
    category: '',
    contact_name: '',
    phone: '',
    wechat: '',
    email: '',
    website: '',
    rating: 0,
    status: 'new',
    notes: '',
    created_at: now,
    updated_at: now,
  }
}

export function newProduct(supplierId: string): Product {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    supplier_id: supplierId,
    name: '',
    model: '',
    moq: '',
    unit_price: '',
    currency: 'USD',
    notes: '',
    photo_path: null,
    pending_photo: null,
    created_at: now,
    updated_at: now,
  }
}
