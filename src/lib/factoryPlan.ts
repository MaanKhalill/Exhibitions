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

/**
 * Extract exact coordinates from a pasted string: either "lat, lng"
 * (what Google Maps' right-click → "Copy coordinates" gives) or a Google Maps
 * URL (…@lat,lng… , …!3dlat!4dlng… , or ?q=/query=/ll=lat,lng). Returns null if
 * no valid pair is found (lat ∈ [-90,90], lng ∈ [-180,180]).
 */
export function parseLatLng(input: string): { lat: number; lng: number } | null {
  const s = (input || '').trim()
  if (!s) return null
  const ok = (lat: number, lng: number) =>
    !isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null
  // Plain "lat, lng" or "lat lng"
  const pair = s.match(/^(-?\d{1,3}(?:\.\d+)?)\s*[, ]\s*(-?\d{1,3}(?:\.\d+)?)$/)
  if (pair) return ok(parseFloat(pair[1]), parseFloat(pair[2]))
  // Google Maps URL: the place pin (!3d…!4d…) is the most exact
  const dd = s.match(/!3d(-?\d{1,3}\.\d+)!4d(-?\d{1,3}\.\d+)/)
  if (dd) return ok(parseFloat(dd[1]), parseFloat(dd[2]))
  // …@lat,lng (map centre)
  const at = s.match(/@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/)
  if (at) return ok(parseFloat(at[1]), parseFloat(at[2]))
  // ?q= / query= / ll= / destination= lat,lng
  const q = s.match(/[?&](?:q|query|ll|destination)=(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/)
  if (q) return ok(parseFloat(q[1]), parseFloat(q[2]))
  return null
}

/** A single map query for a candidate: prefers coordinates, else "Company, address/city". */
function candMapQuery(c: FactoryCandidate): string | null {
  const f = c.factory
  if (f?.lat != null && f?.lng != null) return `${f.lat},${f.lng}`
  const place = (f?.address || [cityOf(c) !== 'Unassigned' ? cityOf(c) : '', c.supplier.address].filter(Boolean).join(' ')).trim()
  if (!place) return null
  return `${c.supplier.company_name}, ${place}`
}

/** The exhibition venue as a map origin (falls back to the Canton Fair complex). */
function exhibitionOrigin(ex: Exhibition | null): string {
  return [ex?.venue, ex?.city, ex?.country].filter(Boolean).join(', ') || 'Canton Fair Complex, Guangzhou, China'
}

export interface LatLng { lat: number; lng: number }

/** Canton Fair Complex (Pazhou, Guangzhou) — default trip start. */
export const CANTON_FAIR_ORIGIN: LatLng = { lat: 23.0975, lng: 113.334 }

/** Great-circle distance in km between two points. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(s)))
}

function factoryLatLng(c: FactoryCandidate): LatLng | null {
  const f = c.factory
  return f && f.lat != null && f.lng != null ? { lat: f.lat, lng: f.lng } : null
}

/** Order candidates nearest-first from the origin (only those with coordinates). */
export function orderByNearest(origin: LatLng, cands: FactoryCandidate[]): {
  ordered: FactoryCandidate[]
  unlocated: FactoryCandidate[]
} {
  const remaining = cands.filter((c) => factoryLatLng(c))
  const unlocated = cands.filter((c) => !factoryLatLng(c))
  const ordered: FactoryCandidate[] = []
  let cur = origin
  while (remaining.length) {
    let bi = 0
    let bd = Infinity
    remaining.forEach((c, i) => {
      const d = haversineKm(cur, factoryLatLng(c)!)
      if (d < bd) { bd = d; bi = i }
    })
    const next = remaining.splice(bi, 1)[0]
    ordered.push(next)
    cur = factoryLatLng(next)!
  }
  return { ordered, unlocated }
}

function kmLabel(km: number): string {
  return km >= 100 ? `${Math.round(km / 10) * 10} km` : `${Math.round(km)} km`
}
function hoursLabel(h: number): string {
  const t = Math.round(h * 60)
  const hh = Math.floor(t / 60)
  const mm = t % 60
  return hh > 0 ? `~${hh}h${mm ? String(mm).padStart(2, '0') : ''}` : `~${mm}m`
}

/**
 * A short text brief for the post-fair factory trip, built from coordinates:
 * nearest-first order from the fair, straight-line leg distances, and each
 * factory's nearest station/airport with rough by-air / by-train times to help
 * look up tickets. Distances are straight-line and times are approximate.
 */
export function tripSummary(originName: string, origin: LatLng, cands: FactoryCandidate[]): string {
  const { ordered, unlocated } = orderByNearest(origin, cands)
  if (ordered.length === 0) return ''

  // Rough door-to-door hours by mode; flying only pays off on longer legs.
  const airH = (km: number) => km / 650 + 2.3
  const trainH = (km: number) => (km * 1.35) / 230 + 0.8
  const roadH = (km: number) => (km * 1.4) / 70 + 0.3
  const legLine = (km: number) =>
    km >= 250
      ? `~${kmLabel(km)} · ${hoursLabel(airH(km))} by air / ${hoursLabel(trainH(km))} by train`
      : `~${kmLabel(km)} · ${hoursLabel(trainH(km))} by train / ${hoursLabel(roadH(km))} by road`
  const fastestH = (km: number) => (km >= 250 ? Math.min(airH(km), trainH(km)) : Math.min(trainH(km), roadH(km)))

  // Sections separated by a blank line; stops lettered A, B, C… like Google Maps
  // (A = the fair, then each factory in visit order).
  const sections: string[] = [`A. ${originName} — start`]
  let prev = origin
  let total = 0
  let totalH = 0
  ordered.forEach((c, i) => {
    const p = factoryLatLng(c)!
    const km = haversineKm(prev, p)
    total += km
    totalH += fastestH(km)
    const letter = String.fromCharCode(66 + i) // B, C, D…
    const f = c.factory
    const lines = [`${letter}. ${c.supplier.company_name} — ${cityOf(c)}`, `    ${legLine(km)}`]
    const hub: string[] = []
    if (f?.nearest_rail) hub.push(`Train ${f.nearest_rail}`)
    if (f?.nearest_airport) hub.push(`Airport ${f.nearest_airport}`)
    if (hub.length) lines.push(`    ${hub.join(' · ')}`)
    sections.push(lines.join('\n'))
    prev = p
  })

  // Return leg back to Guangzhou for the departure flight.
  const returnKm = haversineKm(prev, origin)
  total += returnKm
  totalH += fastestH(returnKm)
  sections.push(`↩ Back to Guangzhou (Baiyun Intl, CAN) — departure\n    ${legLine(returnKm)}`)

  let out = `Nearest-first factory route from ${originName}:\n\n` + sections.join('\n\n')
  out += `\n\nRound-trip ≈ ${kmLabel(total)} straight-line · ${hoursLabel(totalH)} total travel (excludes time spent at each factory).`
  out += `\nDistances are straight-line (real road/rail is longer) and times are rough — confirm exact train/flight schedules at the stations and airports above.`
  if (unlocated.length) out += `\n\nNot yet pinned (add coordinates to include): ${unlocated.map((c) => c.supplier.company_name).join(', ')}.`
  return out
}

export interface MultiMapPlan {
  url: string
  count: number
  skipped: string[]
}

/**
 * One keyless Google Maps directions link that starts at the exhibition venue
 * and passes through every given factory as a stop, so all locations appear on
 * one map with the driving route and times (best/fastest planning after the fair).
 * Each stop is queried as "Company name, address" so the company name is visible.
 * Google's universal directions URL takes origin + destination + up to ~9 waypoints.
 */
export function multiFactoryMapUrl(ex: Exhibition | null, cands: FactoryCandidate[]): MultiMapPlan {
  const stops: string[] = []
  const skipped: string[] = []
  for (const c of cands) {
    const q = candMapQuery(c)
    if (q) stops.push(q)
    else skipped.push(c.supplier.company_name)
  }
  if (stops.length === 0) return { url: '', count: 0, skipped }
  const origin = encodeURIComponent(exhibitionOrigin(ex))
  const destination = encodeURIComponent(stops[stops.length - 1])
  const waypoints = stops.slice(0, -1).map(encodeURIComponent).join('|')
  let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`
  if (waypoints) url += `&waypoints=${waypoints}`
  return { url, count: stops.length, skipped }
}
