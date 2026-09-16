import { boothSortKey } from './booth'
import type { Exhibition, ParticipationWithSupplier } from '../types'

export interface PlannerSettings {
  visitMin: number
  walkMin: number
  openPct: number
  dayStart: string // 'HH:MM'
  dayHours: number
}

export const DEFAULT_SETTINGS: PlannerSettings = {
  visitMin: 20,
  walkMin: 8,
  openPct: 35,
  dayStart: '09:30',
  dayHours: 8,
}

export function loadSettings(exhibitionId: string): PlannerSettings {
  try {
    const raw = localStorage.getItem(`ex_planner_${exhibitionId}`)
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_SETTINGS }
}

export function saveSettings(exhibitionId: string, s: PlannerSettings) {
  try {
    localStorage.setItem(`ex_planner_${exhibitionId}`, JSON.stringify(s))
  } catch {
    /* ignore */
  }
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}
export function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** All fair days between the exhibition start and end dates (inclusive). */
export function fairDays(ex: Exhibition | null): string[] {
  if (!ex?.start_date) return []
  const start = new Date(ex.start_date + 'T00:00:00')
  const end = new Date((ex.end_date || ex.start_date) + 'T00:00:00')
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return []
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

export function dayLabel(dayStr: string): string {
  const d = new Date(dayStr + 'T00:00:00')
  const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()]
  const mo = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()]
  return `${wd} ${d.getDate()} ${mo}`
}

export function fixedTimeOn(p: ParticipationWithSupplier, dayStr: string): Date | null {
  const iso = p.confirmed_meeting || (p.meeting_fixed ? p.preferred_meeting : null)
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  return ymd(d) === dayStr ? d : null
}

export function hhmm(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export interface ScheduledStop {
  p: ParticipationWithSupplier
  arrival: Date
  fixed: boolean
  duration: number
}

/** Order a day's stops (fixed meetings by time first, then booth proximity) and
 *  compute estimated arrival times, honoring fixed meetings as "don't start before". */
export function scheduleDay(
  parts: ParticipationWithSupplier[],
  dayStr: string,
  s: PlannerSettings,
): { stops: ScheduledStop[]; loadMin: number; capacityMin: number } {
  const ordered = parts
    .map((p) => ({ p, fixed: fixedTimeOn(p, dayStr) }))
    .sort((a, b) => {
      const at = a.fixed ? a.fixed.getTime() : Number.POSITIVE_INFINITY
      const bt = b.fixed ? b.fixed.getTime() : Number.POSITIVE_INFINITY
      if (at !== bt) return at - bt
      return boothSortKey(a.p).localeCompare(boothSortKey(b.p))
    })

  const [h, m] = s.dayStart.split(':').map(Number)
  let clock = new Date(dayStr + 'T00:00:00')
  clock.setHours(h || 0, m || 0, 0, 0)

  const stops: ScheduledStop[] = []
  let loadMin = 0
  for (const { p, fixed } of ordered) {
    const duration = p.expected_duration_min || s.visitMin
    const arrival = fixed && fixed.getTime() > clock.getTime() ? new Date(fixed) : new Date(clock)
    stops.push({ p, arrival, fixed: Boolean(fixed), duration })
    clock = new Date(arrival.getTime() + (duration + s.walkMin) * 60000)
    loadMin += duration + s.walkMin
  }
  const capacityMin = Math.round(s.dayHours * 60 * (1 - s.openPct / 100))
  return { stops, loadMin, capacityMin }
}

/** Greedy proximity-based distribution of unscheduled booth visits across days. */
export function autoPlan(
  unscheduled: ParticipationWithSupplier[],
  days: string[],
  s: PlannerSettings,
): { id: string; day: string }[] {
  if (days.length === 0) return []
  const capacity = Math.round(s.dayHours * 60 * (1 - s.openPct / 100))
  // Only booth visits (need a hall or booth) get auto-scheduled.
  const queue = unscheduled
    .filter((p) => p.hall || p.booth || p.booth_raw)
    .sort((a, b) => boothSortKey(a).localeCompare(boothSortKey(b)))

  const assignments: { id: string; day: string }[] = []
  let di = 0
  let used = 0
  for (const p of queue) {
    const cost = (p.expected_duration_min || s.visitMin) + s.walkMin
    if (used + cost > capacity && di < days.length - 1) {
      di++
      used = 0
    }
    assignments.push({ id: p.id, day: days[di] })
    used += cost
  }
  return assignments
}

export function nextDay(dayStr: string, days: string[]): string | null {
  const i = days.indexOf(dayStr)
  if (i < 0 || i + 1 >= days.length) return null
  return days[i + 1]
}
