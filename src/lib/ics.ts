import type { Exhibition, Factory, ParticipationWithSupplier } from '../types'

export interface CalEvent {
  uid: string
  title: string
  start: Date
  end?: Date
  allDay?: boolean
  location?: string
  description?: string
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}
function utc(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  )
}
function dateOnly(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
}
function esc(s: string): string {
  return (s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

export function buildIcs(events: CalEvent[]): string {
  const now = utc(new Date())
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Exhibition Supplier Intelligence//EN',
    'CALSCALE:GREGORIAN',
  ]
  for (const e of events) {
    lines.push('BEGIN:VEVENT')
    lines.push(`UID:${e.uid}`)
    lines.push(`DTSTAMP:${now}`)
    if (e.allDay) {
      const end = e.end ?? new Date(e.start.getTime() + 24 * 3600 * 1000)
      lines.push(`DTSTART;VALUE=DATE:${dateOnly(e.start)}`)
      lines.push(`DTEND;VALUE=DATE:${dateOnly(end)}`)
    } else {
      const end = e.end ?? new Date(e.start.getTime() + 30 * 60000)
      lines.push(`DTSTART:${utc(e.start)}`)
      lines.push(`DTEND:${utc(end)}`)
    }
    lines.push(`SUMMARY:${esc(e.title)}`)
    if (e.location) lines.push(`LOCATION:${esc(e.location)}`)
    if (e.description) lines.push(`DESCRIPTION:${esc(e.description)}`)
    lines.push('END:VEVENT')
  }
  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

export function downloadIcs(filename: string, ics: string) {
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Confirmed booth meetings + scheduled factory visits as calendar events. */
export function calendarEvents(
  ex: Exhibition,
  parts: ParticipationWithSupplier[],
  factories: Factory[],
): CalEvent[] {
  const events: CalEvent[] = []

  for (const p of parts) {
    const iso = p.confirmed_meeting || (p.meeting_fixed ? p.preferred_meeting : null)
    if (!iso) continue
    const start = new Date(iso)
    if (isNaN(start.getTime())) continue
    events.push({
      uid: `mtg-${p.id}@exsi`,
      title: `Meeting: ${p.supplier.company_name}`,
      start,
      end: new Date(start.getTime() + (p.expected_duration_min || 20) * 60000),
      location: [p.hall && `Hall ${p.hall}`, p.booth].filter(Boolean).join(' · ') || ex.venue,
      description: [p.products_shown, p.booth_contact_name && `Contact: ${p.booth_contact_name}`, p.notes].filter(Boolean).join('\n'),
    })
  }

  const supplierName = (id: string) => parts.find((p) => p.supplier_id === id)?.supplier.company_name || 'Factory visit'
  for (const f of factories) {
    if (!f.plan_day) continue
    if (f.meeting_datetime) {
      const start = new Date(f.meeting_datetime)
      if (!isNaN(start.getTime())) {
        events.push({
          uid: `fac-${f.id}@exsi`,
          title: `Factory visit: ${supplierName(f.supplier_id)}`,
          start,
          end: new Date(start.getTime() + (f.duration_min || 120) * 60000),
          location: [f.address, f.city].filter(Boolean).join(', '),
          description: [f.nearest_rail && `Rail: ${f.nearest_rail}`, f.contact_name && `Contact: ${f.contact_name} ${f.contact_phone}`, f.notes].filter(Boolean).join('\n'),
        })
        continue
      }
    }
    const start = new Date(f.plan_day + 'T00:00:00')
    events.push({
      uid: `fac-${f.id}@exsi`,
      title: `Factory visit: ${supplierName(f.supplier_id)}`,
      start,
      allDay: true,
      location: [f.address, f.city].filter(Boolean).join(', '),
      description: [f.nearest_rail && `Rail: ${f.nearest_rail}`, f.contact_name && `Contact: ${f.contact_name} ${f.contact_phone}`, f.notes].filter(Boolean).join('\n'),
    })
  }

  return events.sort((a, b) => a.start.getTime() - b.start.getTime())
}
