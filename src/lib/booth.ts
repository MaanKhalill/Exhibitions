export interface ParsedBooth {
  hall: string
  section: string
  number: string
}

/**
 * Best-effort parse of a booth string into hall / section / booth number so the
 * planner can sort and group by proximity. Handles common Canton Fair forms:
 *   "15.1 A23-24"      -> { hall: "15.1", section: "A", number: "23-24" }
 *   "Hall 5 Booth A10" -> { hall: "5",    section: "A", number: "10" }
 *   "4.1A05"           -> { hall: "4.1",  section: "A", number: "05" }
 * Anything it can't confidently parse is left blank rather than guessed.
 */
export function parseBooth(raw: string): ParsedBooth {
  const empty: ParsedBooth = { hall: '', section: '', number: '' }
  if (!raw) return empty
  const s = raw.trim().replace(/booth|stand|no\.?/gi, ' ').replace(/\s+/g, ' ').trim()

  // Hall: a number possibly with a dot (e.g. 15.1) after an optional "hall".
  const hallMatch = s.match(/(?:hall\s*)?(\d{1,2}(?:\.\d)?)/i)
  const hall = hallMatch ? hallMatch[1] : ''

  // The remainder after the hall token, which should hold section + number.
  let rest = s
  if (hallMatch) rest = s.slice((hallMatch.index || 0) + hallMatch[0].length)

  // Section: a single letter; Number: digits with optional range/suffix.
  const sn = rest.match(/([A-Za-z])\s*[-–]?\s*(\d{1,4}(?:\s*[-–]\s*\d{1,4})?[A-Za-z]?)/)
  if (sn) {
    return {
      hall,
      section: sn[1].toUpperCase(),
      number: sn[2].replace(/\s+/g, ''),
    }
  }
  const numOnly = rest.match(/(\d{1,4}(?:\s*[-–]\s*\d{1,4})?)/)
  return { hall, section: '', number: numOnly ? numOnly[1].replace(/\s+/g, '') : '' }
}

/** A comparable key for proximity sorting: hall, then section, then number. */
export function boothSortKey(p: {
  hall: string
  booth_section: string
  booth_number: string
}): string {
  const hallNum = parseFloat(p.hall) || 999
  const hallKey = String(hallNum).padStart(6, '0')
  const numKey = String(parseInt(p.booth_number, 10) || 0).padStart(5, '0')
  return `${hallKey}|${p.booth_section || 'ZZ'}|${numKey}`
}
