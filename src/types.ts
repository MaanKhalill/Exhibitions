// ---------- Exhibitions (workspaces) ----------
export type ExhibitionStatus =
  | 'planning'
  | 'upcoming'
  | 'active'
  | 'factory_visit'
  | 'completed'
  | 'archived'

export const EXHIBITION_STATUS_LABELS: Record<ExhibitionStatus, string> = {
  planning: 'Planning',
  upcoming: 'Upcoming',
  active: 'Active',
  factory_visit: 'Factory Visit Phase',
  completed: 'Completed',
  archived: 'Archived',
}

export interface Exhibition {
  id: string
  user_id?: string
  name: string
  edition: string
  year: number | null
  country: string
  city: string
  venue: string
  website: string
  opening_hours: string
  start_date: string | null
  end_date: string | null
  trip_start: string | null
  trip_end: string | null
  arrival_city: string
  departure_city: string
  hotel: string
  notes: string
  status: ExhibitionStatus
  created_at: string
  updated_at: string
}

// ---------- Suppliers (global) ----------
export interface Supplier {
  id: string
  user_id?: string
  company_name: string
  aliases: string
  website: string
  domain: string
  country: string
  city: string
  address: string
  phone: string
  wechat: string
  email: string
  product_summary: string
  notes: string
  first_met_exhibition_id: string | null
  created_at: string
  updated_at: string
}

// ---------- Contacts ----------
export interface Contact {
  id: string
  user_id?: string
  supplier_id: string
  name: string
  position: string
  phone: string
  wechat: string
  email: string
  business_card_path: string | null
  notes: string
  first_met_exhibition_id: string | null
  created_at: string
  updated_at: string
}

// ---------- Participations (supplier × exhibition) ----------
export type Priority = 'must' | 'worth' | 'optional' | 'tbd'
export const PRIORITY_LABELS: Record<Priority, string> = {
  must: 'Must Visit',
  worth: 'Worth Visiting',
  optional: 'Optional',
  tbd: 'To Be Decided',
}

export type VisitStatus =
  | 'planned'
  | 'confirmed'
  | 'on_the_way'
  | 'arrived'
  | 'in_progress'
  | 'completed'
  | 'skipped'
  | 'rescheduled'
  | 'cancelled'
export const VISIT_STATUS_LABELS: Record<VisitStatus, string> = {
  planned: 'Planned',
  confirmed: 'Confirmed',
  on_the_way: 'On the Way',
  arrived: 'Arrived',
  in_progress: 'Meeting in Progress',
  completed: 'Completed',
  skipped: 'Skipped',
  rescheduled: 'Rescheduled',
  cancelled: 'Cancelled',
}

export type InterestLevel = 'high' | 'medium' | 'low' | 'review'
export const INTEREST_LABELS: Record<InterestLevel, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  review: 'Review Later',
}

export const FOLLOW_UP_OPTIONS = [
  'Immediate',
  'After Fair',
  'Request Quotation',
  'Request Samples',
  'Factory Visit',
  'Technical Review',
  'No Further Action',
] as const

export interface Participation {
  id: string
  user_id?: string
  exhibition_id: string
  supplier_id: string
  hall: string
  floor: string
  area: string
  booth: string
  booth_raw: string
  booth_section: string
  booth_number: string
  booth_contact_name: string
  booth_contact_phone: string
  products_shown: string
  priority: Priority
  preferred_meeting: string | null
  confirmed_meeting: string | null
  meeting_fixed: boolean
  expected_duration_min: number
  visit_status: VisitStatus
  interest_level: InterestLevel | null
  follow_up: string
  rating: number
  factory_candidate: boolean
  notes: string
  discovered_onsite: boolean
  created_at: string
  updated_at: string
}

/** A participation joined with its global supplier (for planner/list views). */
export interface ParticipationWithSupplier extends Participation {
  supplier: Supplier
}

// ---------- Invitations ----------
export type InvitationPurpose = 'exhibition' | 'factory' | 'both'
export const PURPOSE_LABELS: Record<InvitationPurpose, string> = {
  exhibition: 'Exhibition participation',
  factory: 'Factory visit',
  both: 'Exhibition + factory visit',
}

export type InvitationStatus =
  | 'not_invited'
  | 'prepared'
  | 'sent_whatsapp'
  | 'sent_email'
  | 'link_shared'
  | 'awaiting'
  | 'received'
  | 'incomplete'
  | 'follow_up'
  | 'meeting_proposed'
  | 'meeting_confirmed'
export const INVITATION_STATUS_LABELS: Record<InvitationStatus, string> = {
  not_invited: 'Not invited',
  prepared: 'Invitation prepared',
  sent_whatsapp: 'Sent by WhatsApp',
  sent_email: 'Sent by email',
  link_shared: 'Link shared',
  awaiting: 'Awaiting response',
  received: 'Response received',
  incomplete: 'Incomplete response',
  follow_up: 'Follow-up required',
  meeting_proposed: 'Meeting proposed',
  meeting_confirmed: 'Meeting confirmed',
}

export interface Invitation {
  id: string
  user_id?: string
  exhibition_id: string
  token: string
  company_name: string
  contact_name: string
  email: string
  phone: string
  purpose: InvitationPurpose
  internal_notes: string
  status: InvitationStatus
  supplier_id: string | null
  response: Record<string, unknown> | null
  last_sent_at: string | null
  responded_at: string | null
  created_at: string
  updated_at: string
}

export interface InvitationEvent {
  id: string
  invitation_id: string
  type: string
  detail: string
  created_at: string
}
