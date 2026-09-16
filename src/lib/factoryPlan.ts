import type { Exhibition, Factory, FactoryCandidate } from '../types'
import { ymd } from './planner'

// Pearl River Delta / safe-return cities near Guangzhou for departure safety.
const PRD = new Set([
  'guangzhou', 'shenzhen', 'dongguan', 'foshan', 'zhongshan', 'zhuhai',
  'huizhou', 'jiangmen', 'hong kong', 'hongkong', 'hk', 'qingyuan', 'zhaoqing',
])

export function isPRD(city: string): boolean {
  return PRD.has((city || '').trim().toLowerCase())
}

/** Factory-visit phase days: the day after the fair ends through the trip end. */
export function factoryDays(ex: Exhibition | null): string[] {
  if (!ex) return []
  const base = ex.end_date || ex.trip_start || ex.start_date
  const endStr = ex.trip_end || ex.end_date
  if (!base || !endStr) return []
  const start = new Date(base + 'T00:00:00')
  if (ex.end_date) start.setDate(start.getDate() + 1) // start the day after the fair
  const end = new Date(endStr + 'T00:00:00')
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return []
  const days: string[] = []
  const d = new Date(start)
  let guard = 0
  while (d <= end && guard < 60) {
    days.push(ymd(d))
    d.setDate(d.getDate() + 1)
    guard++
  }
  return days
}

export function cityOf(cand: FactoryCandidate): string {
  return (cand.factory?.city || cand.supplier.city || '').trim() || 'Unassigned'
}

export interface CityCluster {
  city: string
  items: FactoryCandidate[]
  prd: boolean
}

export function clusterByCity(cands: FactoryCandidate[]): CityCluster[] {
  const map = new Map<string, FactoryCandidate[]>()
  for (const c of cands) {
    const key = cityOf(c)
    const arr = map.get(key) || []
    arr.push(c)
    map.set(key, arr)
  }
  return Array.from(map.entries())
    .map(([city, items]) => ({ city, items, prd: isPRD(city) }))
    .sort((a, b) => b.items.length - a.items.length || a.city.localeCompare(b.city))
}

export interface TransportOption {
  mode: 'rail' | 'air' | 'car'
  min: number
}
const MODE_LABEL: Record<TransportOption['mode'], string> = { rail: 'High-speed rail', air: 'Flight', car: 'Car' }
export function modeLabel(mode: string): string {
  return MODE_LABEL[mode as TransportOption['mode']] || mode
}

/** Fastest door-to-door option among the entered rail/flight/car times. */
export function bestTransport(f: Factory | null): TransportOption | null {
  if (!f) return null
  const opts: TransportOption[] = []
  if (f.door_rail_min != null) opts.push({ mode: 'rail', min: f.door_rail_min })
  if (f.door_air_min != null) opts.push({ mode: 'air', min: f.door_air_min })
  if (f.door_car_min != null) opts.push({ mode: 'car', min: f.door_car_min })
  if (opts.length === 0) return null
  return opts.sort((a, b) => a.min - b.min)[0]
}

export function fmtHours(min: number | null | undefined): string {
  if (min == null) return '—'
  const h = Math.floor(min / 60)
  const m = min % 60
  return h > 0 ? `${h}h${m ? ' ' + m + 'm' : ''}` : `${m}m`
}

/** Risk flags for a candidate given the last factory-phase day (departure safety). */
export function candidateRisks(cand: FactoryCandidate, lastDay: string | null): string[] {
  const risks: string[] = []
  const f = cand.factory
  const city = cityOf(cand)
  if (!f || f.verified === 'needs') risks.push('Location needs verification')
  if (f?.visit_possible === 'no') risks.push('Visit marked not possible')
  if (f?.plan_day && lastDay && f.plan_day === lastDay && city !== 'Unassigned' && !isPRD(city)) {
    risks.push('Far city on the last day — risky for the Guangzhou departure')
  }
  return risks
}

/** Google Maps search URL (keyless) for verifying / viewing a factory location. */
export function mapsSearchUrl(cand: FactoryCandidate): string {
  const f = cand.factory
  if (f?.lat != null && f?.lng != null) return `https://www.google.com/maps/search/?api=1&query=${f.lat},${f.lng}`
  const q = encodeURIComponent(f?.address || `${cityOf(cand)} ${cand.supplier.company_name}`)
  return `https://www.google.com/maps/search/?api=1&query=${q}`
}

/** Keyless embeddable Google Maps URL (works in an <iframe> without an API key). */
export function mapsEmbedUrl(cand: FactoryCandidate): string {
  const f = cand.factory
  const q = f?.lat != null && f?.lng != null ? `${f.lat},${f.lng}` : f?.address || `${cityOf(cand)} ${cand.supplier.company_name}`
  return `https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed`
}
