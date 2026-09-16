const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function fmt(d: string): string {
  const date = new Date(d + 'T00:00:00')
  if (isNaN(date.getTime())) return d
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`
}

export function formatDateRange(start: string | null, end: string | null): string {
  if (!start && !end) return ''
  if (start && end) {
    const year = new Date(end + 'T00:00:00').getFullYear()
    return `${fmt(start)} – ${fmt(end)} ${year}`
  }
  const one = (start || end)!
  return `${fmt(one)} ${new Date(one + 'T00:00:00').getFullYear()}`
}

export function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  const target = new Date(dateStr + 'T00:00:00')
  if (isNaN(target.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}
