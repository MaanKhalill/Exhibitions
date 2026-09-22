// Field registry for the custom report builder. Every field the user can put
// in a report — across suppliers, contacts, fair participation, factories and
// exhibitions — is declared here, grouped into related sets. A report row is a
// supplier joined with its (best) participation, its factory and its primary
// contact, plus the relevant exhibition.

import type { Contact, Exhibition, Factory, Participation, Supplier } from '../types'
import {
  EXHIBITION_STATUS_LABELS,
  INTEREST_LABELS,
  PRIORITY_LABELS,
  VISIT_POSSIBLE_LABELS,
  VISIT_STATUS_LABELS,
} from '../types'
import type { ReportData } from './report'

export interface FlatRecord {
  supplier: Supplier
  participation: Participation | null
  factory: Factory | null
  contact: Contact | null
  exhibition: Exhibition | null
}

export type GroupKey = 'supplier' | 'contact' | 'fair' | 'factory' | 'exhibition'

export const GROUP_LABELS: Record<GroupKey, string> = {
  supplier: 'Supplier',
  contact: 'Contact person',
  fair: 'Fair booth & visit',
  factory: 'Factory & factory visit',
  exhibition: 'Exhibition',
}

export const GROUP_ORDER: GroupKey[] = ['supplier', 'contact', 'fair', 'factory', 'exhibition']

export interface FieldDef {
  id: string
  group: GroupKey
  label: string
  value: (r: FlatRecord) => string
  /** Optional comparable for sorting (numbers sort numerically); defaults to the display text. */
  sort?: (r: FlatRecord) => string | number
}

// --- formatting helpers ---
const dOnly = (s?: string | null) => (s ? String(s).slice(0, 10) : '')
const dTime = (s?: string | null) => (s ? String(s).replace('T', ' ').slice(0, 16) : '')
const numS = (n?: number | null) => (n == null ? '' : String(n))
const yn = (b?: boolean | null) => (b ? 'Yes' : 'No')

// --- per-group field constructors (with null-safe access) ---
function supF(id: string, label: string, val: (s: Supplier) => string, sort?: (s: Supplier) => string | number): FieldDef {
  return { id: `supplier.${id}`, group: 'supplier', label, value: (r) => val(r.supplier), sort: sort && ((r) => sort(r.supplier)) }
}
function conF(id: string, label: string, val: (c: Contact) => string): FieldDef {
  return { id: `contact.${id}`, group: 'contact', label, value: (r) => (r.contact ? val(r.contact) : '') }
}
function parF(id: string, label: string, val: (p: Participation) => string, sort?: (p: Participation) => string | number): FieldDef {
  return {
    id: `fair.${id}`,
    group: 'fair',
    label,
    value: (r) => (r.participation ? val(r.participation) : ''),
    sort: sort && ((r) => (r.participation ? sort(r.participation) : '')),
  }
}
function facF(id: string, label: string, val: (f: Factory) => string, sort?: (f: Factory) => string | number): FieldDef {
  return {
    id: `factory.${id}`,
    group: 'factory',
    label,
    value: (r) => (r.factory ? val(r.factory) : ''),
    sort: sort && ((r) => (r.factory ? sort(r.factory) : '')),
  }
}
function exF(id: string, label: string, val: (e: Exhibition) => string, sort?: (e: Exhibition) => string | number): FieldDef {
  return {
    id: `exhibition.${id}`,
    group: 'exhibition',
    label,
    value: (r) => (r.exhibition ? val(r.exhibition) : ''),
    sort: sort && ((r) => (r.exhibition ? sort(r.exhibition) : '')),
  }
}

export const FIELDS: FieldDef[] = [
  // Supplier
  supF('company_name', 'Company name', (s) => s.company_name, (s) => s.company_name.toLowerCase()),
  supF('aliases', 'Also known as', (s) => s.aliases),
  supF('product_summary', 'Products', (s) => s.product_summary),
  supF('website', 'Website', (s) => s.domain || s.website),
  supF('phone', 'Phone', (s) => s.phone),
  supF('wechat', 'WeChat', (s) => s.wechat),
  supF('email', 'Email', (s) => s.email),
  supF('city', 'City', (s) => s.city),
  supF('country', 'Country', (s) => s.country),
  supF('address', 'Address', (s) => s.address),
  supF('notes', 'Supplier notes', (s) => s.notes),
  supF('created_at', 'Added on', (s) => dOnly(s.created_at), (s) => s.created_at || ''),

  // Contact person
  conF('name', 'Contact name', (c) => c.name),
  conF('position', 'Position', (c) => c.position),
  conF('phone', 'Contact phone', (c) => c.phone),
  conF('wechat', 'Contact WeChat', (c) => c.wechat),
  conF('email', 'Contact email', (c) => c.email),
  conF('notes', 'Contact notes', (c) => c.notes),

  // Fair booth & visit
  parF('hall', 'Hall', (p) => p.hall),
  parF('floor', 'Floor', (p) => p.floor),
  parF('area', 'Area', (p) => p.area),
  parF('booth', 'Booth', (p) => p.booth),
  parF('booth_section', 'Booth section', (p) => p.booth_section),
  parF('booth_number', 'Booth number', (p) => p.booth_number),
  parF('booth_contact_name', 'Booth contact name', (p) => p.booth_contact_name),
  parF('booth_contact_phone', 'Booth contact phone', (p) => p.booth_contact_phone),
  parF('products_shown', 'Products shown', (p) => p.products_shown),
  parF('priority', 'Priority', (p) => PRIORITY_LABELS[p.priority] || p.priority),
  parF('visit_status', 'Visit status', (p) => VISIT_STATUS_LABELS[p.visit_status] || p.visit_status),
  parF('interest_level', 'Interest level', (p) => (p.interest_level ? INTEREST_LABELS[p.interest_level] : '')),
  parF('follow_up', 'Follow-up', (p) => p.follow_up),
  parF('rating', 'Rating', (p) => (p.rating ? `${p.rating}/5` : ''), (p) => p.rating || 0),
  parF('factory_candidate', 'Factory candidate', (p) => yn(p.factory_candidate)),
  parF('preferred_meeting', 'Preferred meeting', (p) => dTime(p.preferred_meeting), (p) => p.preferred_meeting || ''),
  parF('confirmed_meeting', 'Confirmed meeting', (p) => dTime(p.confirmed_meeting), (p) => p.confirmed_meeting || ''),
  parF('meeting_fixed', 'Meeting fixed', (p) => yn(p.meeting_fixed)),
  parF('expected_duration_min', 'Planned minutes', (p) => numS(p.expected_duration_min), (p) => p.expected_duration_min || 0),
  parF('plan_day', 'Plan day', (p) => dOnly(p.plan_day), (p) => p.plan_day || ''),
  parF('discovered_onsite', 'Found on-site', (p) => yn(p.discovered_onsite)),
  parF('notes', 'Visit notes', (p) => p.notes),

  // Factory & factory visit
  facF('city', 'Factory city', (f) => f.city),
  facF('province', 'Province', (f) => f.province),
  facF('district', 'District', (f) => f.district),
  facF('address', 'Factory address', (f) => f.address),
  facF('lat', 'Latitude', (f) => numS(f.lat), (f) => f.lat ?? 0),
  facF('lng', 'Longitude', (f) => numS(f.lng), (f) => f.lng ?? 0),
  facF('map_link', 'Map link', (f) => f.map_link),
  facF('nearest_airport', 'Nearest airport', (f) => f.nearest_airport),
  facF('nearest_rail', 'Nearest rail', (f) => f.nearest_rail),
  facF('transfer_air_min', 'Airport transfer (min)', (f) => numS(f.transfer_air_min), (f) => f.transfer_air_min ?? 0),
  facF('transfer_rail_min', 'Rail transfer (min)', (f) => numS(f.transfer_rail_min), (f) => f.transfer_rail_min ?? 0),
  facF('door_air_min', 'Door via air (min)', (f) => numS(f.door_air_min), (f) => f.door_air_min ?? 0),
  facF('door_rail_min', 'Door via rail (min)', (f) => numS(f.door_rail_min), (f) => f.door_rail_min ?? 0),
  facF('door_car_min', 'Door via car (min)', (f) => numS(f.door_car_min), (f) => f.door_car_min ?? 0),
  facF('best_mode', 'Best travel mode', (f) => f.best_mode),
  facF('verified', 'Location verified', (f) => (f.verified === 'verified' ? 'Verified' : 'Needs check')),
  facF('visit_possible', 'Visit possible', (f) => VISIT_POSSIBLE_LABELS[f.visit_possible] || f.visit_possible),
  facF('meeting_datetime', 'Factory meeting', (f) => dTime(f.meeting_datetime), (f) => f.meeting_datetime || ''),
  facF('duration_min', 'Visit minutes', (f) => numS(f.duration_min), (f) => f.duration_min || 0),
  facF('working_hours', 'Working hours', (f) => f.working_hours),
  facF('weekend', 'Weekend', (f) => f.weekend),
  facF('contact_name', 'Factory contact', (f) => f.contact_name),
  facF('contact_phone', 'Factory phone', (f) => f.contact_phone),
  facF('priority', 'Factory priority', (f) => PRIORITY_LABELS[f.priority] || f.priority),
  facF('plan_day', 'Factory plan day', (f) => dOnly(f.plan_day), (f) => f.plan_day || ''),
  facF('notes', 'Factory notes', (f) => f.notes),

  // Exhibition
  exF('name', 'Exhibition', (e) => e.name),
  exF('edition', 'Edition', (e) => e.edition),
  exF('year', 'Year', (e) => numS(e.year), (e) => e.year ?? 0),
  exF('country', 'Exhibition country', (e) => e.country),
  exF('city', 'Exhibition city', (e) => e.city),
  exF('venue', 'Venue', (e) => e.venue),
  exF('status', 'Exhibition status', (e) => EXHIBITION_STATUS_LABELS[e.status] || e.status),
  exF('start_date', 'Start date', (e) => dOnly(e.start_date), (e) => e.start_date || ''),
  exF('end_date', 'End date', (e) => dOnly(e.end_date), (e) => e.end_date || ''),
]

export const FIELD_BY_ID = new Map(FIELDS.map((f) => [f.id, f]))

export const FIELDS_BY_GROUP: Record<GroupKey, FieldDef[]> = GROUP_ORDER.reduce(
  (acc, g) => {
    acc[g] = FIELDS.filter((f) => f.group === g)
    return acc
  },
  {} as Record<GroupKey, FieldDef[]>,
)

/** A sensible starting selection for first-time users. */
export const DEFAULT_FIELD_IDS = [
  'supplier.company_name',
  'supplier.city',
  'supplier.country',
  'supplier.phone',
  'supplier.email',
  'fair.booth',
  'fair.priority',
  'fair.visit_status',
  'factory.city',
  'factory.nearest_airport',
]

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

export interface ReportSources {
  suppliers: Supplier[]
  participations: Participation[]
  factories: Factory[]
  contacts: Contact[]
  exhibitions: Exhibition[]
  currentExhibitionId?: string | null
}

export function assembleRecords(src: ReportSources): FlatRecord[] {
  const exById = new Map(src.exhibitions.map((e) => [e.id, e]))
  const partsBySup = new Map<string, Participation[]>()
  for (const p of src.participations) {
    const arr = partsBySup.get(p.supplier_id) || []
    arr.push(p)
    partsBySup.set(p.supplier_id, arr)
  }
  const facBySup = new Map<string, Factory>()
  for (const f of src.factories) if (!facBySup.has(f.supplier_id)) facBySup.set(f.supplier_id, f)
  const conBySup = new Map<string, Contact>()
  for (const c of src.contacts) if (!conBySup.has(c.supplier_id)) conBySup.set(c.supplier_id, c)

  return src.suppliers.map((s) => {
    const parts = partsBySup.get(s.id) || []
    const participation =
      (src.currentExhibitionId && parts.find((p) => p.exhibition_id === src.currentExhibitionId)) ||
      [...parts].sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''))[0] ||
      null
    const exId = participation?.exhibition_id || s.first_met_exhibition_id || null
    return {
      supplier: s,
      participation: participation || null,
      factory: facBySup.get(s.id) || null,
      contact: conBySup.get(s.id) || null,
      exhibition: exId ? exById.get(exId) || null : null,
    }
  })
}

export type ReportScope = 'all' | 'current' | 'factory'

export const SCOPE_LABELS: Record<ReportScope, string> = {
  all: 'All suppliers (every exhibition)',
  current: 'Current exhibition only',
  factory: 'Factory-visit candidates',
}

export function applyScope(records: FlatRecord[], scope: ReportScope, currentId?: string | null): FlatRecord[] {
  if (scope === 'current') return records.filter((r) => r.participation && r.participation.exhibition_id === currentId)
  if (scope === 'factory') return records.filter((r) => r.factory || r.participation?.factory_candidate)
  return records
}

/** Build a ReportData from the chosen records, fields and sort. Column order
 *  follows the registry, so it's stable regardless of tick order. */
export function buildCustomReport(
  records: FlatRecord[],
  selected: Set<string>,
  opts: { title: string; subtitle?: string; filename: string; sortId?: string; desc?: boolean },
): ReportData {
  const fields = FIELDS.filter((f) => selected.has(f.id))
  let rows = records
  const sf = opts.sortId ? FIELD_BY_ID.get(opts.sortId) : undefined
  if (sf) {
    const key = sf.sort || ((r: FlatRecord) => sf.value(r).toLowerCase())
    rows = [...records].sort((a, b) => {
      const ka = key(a)
      const kb = key(b)
      const cmp =
        typeof ka === 'number' && typeof kb === 'number'
          ? ka - kb
          : String(ka).localeCompare(String(kb), undefined, { numeric: true, sensitivity: 'base' })
      return opts.desc ? -cmp : cmp
    })
  }
  return {
    title: opts.title,
    subtitle: opts.subtitle,
    columns: fields.map((f) => f.label),
    rows: rows.map((r) => fields.map((f) => f.value(r))),
    filename: opts.filename,
  }
}
