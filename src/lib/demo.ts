/**
 * DEMO / preview mode. When VITE_DEMO=1 the whole app runs against this
 * in-memory store with seeded sample data and no backend — so it can be shown
 * as a single self-contained page (e.g. a shareable preview link) with no login
 * and no network. The real app uses Supabase; these helpers mirror the api/*
 * layer so components are unchanged.
 */
import { cantonFairAutumn2026, draftFactory, draftSupplier } from './defaults'
import { parseBooth } from './booth'
import type {
  Contact,
  Exhibition,
  Factory,
  Invitation,
  InvitationEvent,
  MediaItem,
  Participation,
  ParticipationWithSupplier,
  Profile,
  Supplier,
  SupplierChange,
  EmailSettings,
} from '../types'
import { emptyEmailSettings } from '../types'

export const DEMO = import.meta.env.VITE_DEMO === '1'

const now = () => new Date().toISOString()
const uid = () => crypto.randomUUID()

// ---- seed ----
const exhibition: Exhibition = { ...cantonFairAutumn2026(), id: 'demo-ex-1', status: 'upcoming' }
const extraExhibitions: Exhibition[] = []

function seedSupplier(partial: Partial<Supplier>): Supplier {
  return draftSupplier({ id: uid(), first_met_exhibition_id: exhibition.id, ...partial })
}

const suppliers: Supplier[] = [
  seedSupplier({ company_name: 'Guangzhou Bright Lighting Co.', product_summary: 'LED panel lights, downlights, drivers', city: 'Guangzhou', country: 'China', website: 'brightlighting.com', domain: 'brightlighting.com', phone: '+8613800000001', wechat: 'bright_led' }),
  seedSupplier({ company_name: 'Shenzhen PowerCell Batteries', product_summary: 'Li-ion cells, power banks, BMS', city: 'Shenzhen', country: 'China', website: 'powercell.cn', domain: 'powercell.cn', phone: '+8613800000002' }),
  seedSupplier({ company_name: 'Foshan Comfort Furniture', product_summary: 'Office chairs, sofas, ergonomic desks', city: 'Foshan', country: 'China', website: 'comfort-furniture.com', domain: 'comfort-furniture.com' }),
  seedSupplier({ company_name: 'Ningbo ToolMaster Hardware', product_summary: 'Hand tools, power tool accessories', city: 'Ningbo', country: 'China', phone: '+8613800000004' }),
  seedSupplier({ company_name: 'Yiwu GiftCraft Trading', product_summary: 'Promotional gifts, stationery, packaging', city: 'Yiwu', country: 'China', website: 'giftcraft.cn', domain: 'giftcraft.cn' }),
]

function seedPart(idx: number, partial: Partial<Participation>): Participation {
  const s = suppliers[idx]
  const booth = partial.booth_raw || ''
  const parsed = parseBooth(booth)
  return {
    id: uid(),
    exhibition_id: exhibition.id,
    supplier_id: s.id,
    hall: parsed.hall,
    floor: '',
    area: '',
    booth,
    booth_raw: booth,
    booth_section: parsed.section,
    booth_number: parsed.number,
    booth_contact_name: '',
    booth_contact_phone: '',
    products_shown: s.product_summary,
    priority: 'tbd',
    preferred_meeting: null,
    confirmed_meeting: null,
    meeting_fixed: false,
    expected_duration_min: 20,
    visit_status: 'planned',
    interest_level: null,
    follow_up: '',
    rating: 0,
    factory_candidate: false,
    notes: '',
    discovered_onsite: false,
    plan_day: null,
    created_at: now(),
    updated_at: now(),
    ...partial,
  }
}

const participations: Participation[] = [
  seedPart(0, { booth_raw: '13.1 A05', hall: '13.1', priority: 'must', rating: 4, visit_status: 'confirmed', confirmed_meeting: '2026-10-15T10:00:00.000Z', meeting_fixed: true, interest_level: 'high', follow_up: 'Request Quotation', plan_day: '2026-10-15' }),
  seedPart(1, { booth_raw: '9.2 C21', hall: '9.2', priority: 'worth', rating: 3, factory_candidate: true, follow_up: 'Factory Visit', plan_day: '2026-10-15' }),
  seedPart(2, { booth_raw: '4.1 B12', hall: '4.1', priority: 'worth', visit_status: 'completed', rating: 5, factory_candidate: true, follow_up: 'Factory Visit', plan_day: '2026-10-16' }),
  seedPart(3, { booth_raw: '10.3 D30', hall: '10.3', priority: 'tbd', discovered_onsite: true }),
]

const contacts: Contact[] = [
  { id: uid(), supplier_id: suppliers[0].id, name: 'Lucy Chen', position: 'Sales Manager', phone: '+8613800000001', wechat: 'lucy_bright', email: 'lucy@brightlighting.com', business_card_path: null, notes: '', first_met_exhibition_id: exhibition.id, created_at: now(), updated_at: now() },
]

const invitations: Invitation[] = [
  { id: uid(), exhibition_id: exhibition.id, token: 'demo-token-1', company_name: 'Guangzhou Bright Lighting Co.', contact_name: 'Lucy Chen', email: 'lucy@brightlighting.com', phone: '+8613800000001', purpose: 'both', internal_notes: 'Top priority — LED panels', status: 'received', supplier_id: suppliers[0].id, response: { participate: 'Yes', hall: '13.1', booth: 'A05', product_summary: 'LED panel lights' }, last_sent_at: now(), responded_at: now(), opened_at: now(), expires_at: null, ttl_hours: 48, created_at: now(), updated_at: now() },
  { id: uid(), exhibition_id: exhibition.id, token: 'demo-token-2', company_name: 'Shenzhen PowerCell Batteries', contact_name: '', email: 'sales@powercell.cn', phone: '', purpose: 'exhibition', internal_notes: '', status: 'sent_whatsapp', supplier_id: null, response: null, last_sent_at: now(), responded_at: null, opened_at: null, expires_at: null, ttl_hours: 48, created_at: now(), updated_at: now() },
]

const invitationEvents: InvitationEvent[] = [
  { id: uid(), invitation_id: invitations[0].id, type: 'sent_whatsapp', detail: 'Sent by WhatsApp', created_at: now() },
  { id: uid(), invitation_id: invitations[0].id, type: 'response_submitted', detail: 'Response received', created_at: now() },
]

const supplierChanges: SupplierChange[] = [
  {
    id: uid(), supplier_id: suppliers[0].id, invitation_id: invitations[0].id,
    entity: 'supplier', entity_label: '', field: 'phone',
    old_value: '+8613800000000', new_value: '+8613800000001',
    source: 'supplier_update', created_at: now(),
  },
  {
    id: uid(), supplier_id: suppliers[0].id, invitation_id: invitations[0].id,
    entity: 'supplier', entity_label: '', field: 'product_summary',
    old_value: 'LED lights', new_value: 'LED panel lights, downlights, drivers',
    source: 'supplier_update', created_at: now(),
  },
]

const media: MediaItem[] = []
const mediaBlobs = new Map<string, string>()

function placeholder(label: string, color: string): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><rect width='300' height='300' fill='${color}'/><text x='50%' y='50%' fill='white' font-family='sans-serif' font-size='24' text-anchor='middle' dominant-baseline='middle'>${label}</text></svg>`
  return 'data:image/svg+xml;base64,' + btoa(svg)
}
// two sample product photos on the first supplier
;['LED panel', 'Downlight'].forEach((label, i) => {
  const path = `demo/${uid()}.svg`
  mediaBlobs.set(path, placeholder(label, i ? '#8f1e22' : '#b8272c'))
  media.push({ id: uid(), exhibition_id: exhibition.id, supplier_id: suppliers[0].id, participation_id: participations[0].id, kind: 'product', path, caption: label, decoded_content: '', flags: i ? 'Request quotation' : 'Interesting', created_at: now() })
})

const factories: Factory[] = [
  draftFactory(suppliers[1].id, {
    city: 'Shenzhen', province: 'Guangdong', address: 'Baoan District, Shenzhen',
    verified: 'verified', visit_possible: 'yes',
    nearest_rail: 'Shenzhen North', nearest_airport: 'Shenzhen Baoan (SZX)',
    door_rail_min: 40, door_car_min: 120, plan_day: '2026-10-20',
    contact_name: 'Lucy Chen', priority: 'worth',
  }),
  draftFactory(suppliers[2].id, {
    city: 'Foshan', province: 'Guangdong', address: 'Longjiang, Shunde District, Foshan',
    verified: 'verified', visit_possible: 'yes',
    nearest_rail: 'Foshan West', nearest_airport: 'Guangzhou Baiyun (CAN)',
    door_rail_min: 60, door_car_min: 90, plan_day: '2026-10-21',
    priority: 'worth',
  }),
]

let profile: Profile = {
  owner_name: 'Your Name',
  company_name: 'Your Company Ltd',
  address: 'Your address',
  email: 'you@yourcompany.com',
  whatsapp: '+971 50 000 0000',
  wechat: 'your_wechat',
  phone: '',
  country: 'United Arab Emirates',
  website: 'www.yourcompany.com',
  bio: 'We source quality products worldwide and attend major trade fairs.',
}

let emailSettings: EmailSettings = emptyEmailSettings()

// ---- helpers used by the api layer (demo short-circuits) ----
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x))

export const demo = {
  // exhibitions
  listExhibitions: async () => clone([exhibition, ...extraExhibitions]),
  getExhibition: async (id: string) => clone([exhibition, ...extraExhibitions].find((e) => e.id === id) ?? null),
  saveExhibition: async (e: Exhibition) => {
    const i = extraExhibitions.findIndex((x) => x.id === e.id)
    if (e.id === exhibition.id) Object.assign(exhibition, e)
    else if (i >= 0) extraExhibitions[i] = clone(e)
    else extraExhibitions.push(clone(e))
    return clone(e)
  },
  deleteExhibition: async (id: string) => {
    const i = extraExhibitions.findIndex((x) => x.id === id)
    if (i >= 0) extraExhibitions.splice(i, 1)
  },

  // suppliers
  listSuppliers: async (search = '') => {
    const q = search.trim().toLowerCase()
    const list = clone(suppliers).sort((a: Supplier, b: Supplier) => a.company_name.localeCompare(b.company_name))
    return q ? list.filter((s: Supplier) => [s.company_name, s.product_summary, s.city, s.country, s.website, s.notes].join(' ').toLowerCase().includes(q)) : list
  },
  getSupplier: async (id: string) => clone(suppliers.find((s) => s.id === id) ?? null),
  saveSupplier: async (s: Supplier) => {
    const i = suppliers.findIndex((x) => x.id === s.id)
    if (i >= 0) suppliers[i] = clone(s)
    else suppliers.push(clone(s))
    return clone(s)
  },
  deleteSupplier: async (id: string) => {
    const i = suppliers.findIndex((x) => x.id === id)
    if (i >= 0) suppliers.splice(i, 1)
  },
  findDuplicates: async (cand: { company_name?: string }) => {
    const name = (cand.company_name || '').trim().toLowerCase()
    if (!name) return []
    return suppliers
      .filter((s) => s.company_name.toLowerCase().includes(name) || name.includes(s.company_name.toLowerCase()))
      .slice(0, 3)
      .map((s) => ({ supplier: clone(s), reasons: ['Similar company name'], score: 2 }))
  },

  // participations
  listParticipations: async (exId: string): Promise<ParticipationWithSupplier[]> =>
    clone(participations.filter((p) => p.exhibition_id === exId)).map((p: Participation) => ({ ...p, supplier: clone(suppliers.find((s) => s.id === p.supplier_id)!) })),
  listParticipationsForSupplier: async (supId: string) => clone(participations.filter((p) => p.supplier_id === supId)),
  getParticipation: async (exId: string, supId: string) => clone(participations.find((p) => p.exhibition_id === exId && p.supplier_id === supId) ?? null),
  saveParticipation: async (p: Participation) => {
    const i = participations.findIndex((x) => x.exhibition_id === p.exhibition_id && x.supplier_id === p.supplier_id)
    if (i >= 0) participations[i] = clone(p)
    else participations.push(clone(p))
    return clone(p)
  },
  deleteParticipation: async (id: string) => {
    const i = participations.findIndex((x) => x.id === id)
    if (i >= 0) participations.splice(i, 1)
  },
  patchParticipation: async (id: string, patch: Partial<Participation>) => {
    const p = participations.find((x) => x.id === id)
    if (p) Object.assign(p, patch)
  },

  // contacts
  listContactsForSupplier: async (supId: string) => clone(contacts.filter((c) => c.supplier_id === supId)),
  saveContact: async (c: Contact) => {
    const i = contacts.findIndex((x) => x.id === c.id)
    if (i >= 0) contacts[i] = clone(c)
    else contacts.push(clone(c))
    return clone(c)
  },
  deleteContact: async (id: string) => {
    const i = contacts.findIndex((x) => x.id === id)
    if (i >= 0) contacts.splice(i, 1)
  },

  // invitations
  listInvitations: async (exId: string) => clone(invitations.filter((i) => i.exhibition_id === exId)),
  getInvitation: async (id: string) => clone(invitations.find((i) => i.id === id) ?? null),
  findInvitationForSupplier: async (supplierId: string) => {
    const list = invitations
      .filter((i) => i.supplier_id === supplierId)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    return clone(list[0] ?? null)
  },
  listSupplierChanges: async (supplierId: string) =>
    clone(supplierChanges.filter((c) => c.supplier_id === supplierId).sort((a, b) => (a.created_at < b.created_at ? 1 : -1))),
  saveInvitation: async (inv: Invitation) => {
    const i = invitations.findIndex((x) => x.id === inv.id)
    if (i >= 0) invitations[i] = clone(inv)
    else invitations.push(clone(inv))
    return clone(inv)
  },
  setInvitationStatus: async (id: string, status: Invitation['status']) => {
    const inv = invitations.find((x) => x.id === id)
    if (inv) inv.status = status
  },
  deleteInvitation: async (id: string) => {
    const i = invitations.findIndex((x) => x.id === id)
    if (i >= 0) invitations.splice(i, 1)
  },
  addInvitationEvent: async (invitationId: string, type: string, detail: string) => {
    invitationEvents.push({ id: uid(), invitation_id: invitationId, type, detail, created_at: now() })
  },
  listInvitationEvents: async (invitationId: string) => clone(invitationEvents.filter((e) => e.invitation_id === invitationId)),
  fetchPublicInvitation: async (token: string) => {
    const inv = invitations.find((i) => i.token === token)
    if (!inv) throw new Error('Invitation not found')
    return {
      invitation: { company_name: inv.company_name, contact_name: inv.contact_name, email: inv.email, phone: inv.phone, purpose: inv.purpose, already_responded: Boolean(inv.responded_at) },
      exhibition: clone(exhibition),
      inviter: clone(profile),
      expired: false,
      expires_at: null,
    }
  },
  submitPublicInvitation: async () => {},

  // media
  uploadMedia: async (dataUrl: string, folder: string) => {
    const path = `demo/${folder}/${uid()}`
    mediaBlobs.set(path, dataUrl)
    return path
  },
  mediaUrl: async (path: string) => mediaBlobs.get(path) ?? null,
  insertMediaRow: async (meta: Partial<MediaItem> & { kind: MediaItem['kind'] }) => {
    const row: MediaItem = {
      id: meta.id ?? uid(),
      exhibition_id: meta.exhibition_id ?? null,
      supplier_id: meta.supplier_id ?? null,
      participation_id: meta.participation_id ?? null,
      kind: meta.kind,
      path: meta.path ?? null,
      caption: meta.caption ?? '',
      decoded_content: meta.decoded_content ?? '',
      flags: meta.flags ?? '',
      created_at: now(),
    }
    media.unshift(row)
    return clone(row)
  },
  listMediaForSupplier: async (supId: string) => clone(media.filter((m) => m.supplier_id === supId)),
  updateMediaRow: async (id: string, patch: Partial<MediaItem>) => {
    const m = media.find((x) => x.id === id)
    if (m) Object.assign(m, patch)
  },
  deleteMedia: async (item: MediaItem) => {
    const i = media.findIndex((x) => x.id === item.id)
    if (i >= 0) media.splice(i, 1)
  },

  // profile
  getProfile: async () => clone(profile),
  saveProfile: async (p: Profile) => {
    profile = clone(p)
    return clone(profile)
  },

  // email (SMTP) settings
  getEmailSettings: async () => clone(emailSettings),
  saveEmailSettings: async (s: EmailSettings, password?: string) => {
    emailSettings = { ...clone(s), password_set: emailSettings.password_set || Boolean(password && password.length) }
    return clone(emailSettings)
  },

  // factories
  listFactories: async () => clone(factories),
  saveFactory: async (f: Factory) => {
    const i = factories.findIndex((x) => x.supplier_id === f.supplier_id)
    if (i >= 0) factories[i] = clone(f)
    else factories.push(clone(f))
    return clone(f)
  },

  // cross-exhibition (Phase 7-8)
  listAllParticipations: async () =>
    clone(participations).map((p: Participation) => ({
      ...p,
      supplier: clone(suppliers.find((s) => s.id === p.supplier_id)!),
      exhibition: { id: exhibition.id, name: exhibition.name, edition: exhibition.edition, status: exhibition.status },
    })),
  listAllContacts: async () =>
    clone(contacts).map((c: Contact) => {
      const s = suppliers.find((x) => x.id === c.supplier_id)
      return { ...c, supplier: s ? { id: s.id, company_name: s.company_name } : null }
    }),
  globalSearch: async (term: string) => {
    const q = term.trim().toLowerCase()
    if (!q) return []
    const ex = { id: exhibition.id, name: exhibition.name, edition: exhibition.edition, status: exhibition.status }
    return suppliers
      .filter((s) =>
        [s.company_name, s.product_summary, s.city, s.country, s.website, s.notes].join(' ').toLowerCase().includes(q),
      )
      .map((s) => ({
        supplier: clone(s),
        exhibitions: participations.some((p) => p.supplier_id === s.id) ? [ex] : [],
        snippet: s.product_summary,
      }))
  },
}
