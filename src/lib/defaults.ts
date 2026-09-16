import type { Exhibition, Participation, Supplier } from '../types'

export function draftExhibition(partial: Partial<Exhibition> = {}): Exhibition {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    name: '',
    edition: '',
    year: null,
    country: '',
    city: '',
    venue: '',
    website: '',
    opening_hours: '',
    start_date: null,
    end_date: null,
    trip_start: null,
    trip_end: null,
    arrival_city: '',
    departure_city: '',
    hotel: '',
    notes: '',
    status: 'planning',
    created_at: now,
    updated_at: now,
    ...partial,
  }
}

/** Prefilled template for the first workspace (dates are data, not hardcoded logic). */
export function cantonFairAutumn2026(): Exhibition {
  return draftExhibition({
    name: 'Canton Fair',
    edition: 'Autumn 2026',
    year: 2026,
    country: 'China',
    city: 'Guangzhou',
    venue: 'Canton Fair Complex (广交会展馆)',
    website: 'https://www.cantonfair.org.cn',
    start_date: '2026-10-15',
    end_date: '2026-10-19',
    trip_start: '2026-10-14',
    trip_end: '2026-10-28',
    arrival_city: 'Guangzhou',
    departure_city: 'Guangzhou',
    status: 'upcoming',
    notes:
      'Canton Fair operating period 15–19 Oct. Factory visit phase 20–28 Oct. ' +
      'Late-night departure from Guangzhou on 28 Oct — keep 27–28 Oct within safe return range of Guangzhou.',
  })
}

export function draftSupplier(partial: Partial<Supplier> = {}): Supplier {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    company_name: '',
    aliases: '',
    website: '',
    domain: '',
    country: '',
    city: '',
    address: '',
    phone: '',
    wechat: '',
    email: '',
    product_summary: '',
    notes: '',
    first_met_exhibition_id: null,
    created_at: now,
    updated_at: now,
    ...partial,
  }
}

export function draftParticipation(
  exhibitionId: string,
  supplierId: string,
  partial: Partial<Participation> = {},
): Participation {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    exhibition_id: exhibitionId,
    supplier_id: supplierId,
    hall: '',
    floor: '',
    area: '',
    booth: '',
    booth_raw: '',
    booth_section: '',
    booth_number: '',
    booth_contact_name: '',
    booth_contact_phone: '',
    products_shown: '',
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
    created_at: now,
    updated_at: now,
    ...partial,
  }
}

/** Extract a bare domain from a website or email for duplicate detection. */
export function extractDomain(websiteOrEmail: string): string {
  if (!websiteOrEmail) return ''
  let s = websiteOrEmail.trim().toLowerCase()
  if (s.includes('@')) s = s.split('@')[1] || ''
  s = s.replace(/^https?:\/\//, '').replace(/^www\./, '')
  s = s.split('/')[0].split('?')[0]
  return s
}

/** Digits-only phone for loose comparison. */
export function normalizePhone(phone: string): string {
  return (phone || '').replace(/\D/g, '')
}
