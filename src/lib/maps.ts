// Helpers for turning an address / phone into tappable links.

/** A Google Maps "search" link for an address, so the user can see it and plan
 *  the visit. Opens the Maps app on mobile, Google Maps on desktop. */
export function mapSearchUrl(...parts: (string | null | undefined)[]): string | undefined {
  const q = parts
    .map((p) => (p || '').trim())
    .filter(Boolean)
    .join(', ')
  if (!q) return undefined
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
}

/** wa.me link from a phone number (digits only, keeping the country code). */
export function whatsappUrl(phone: string | null | undefined): string | undefined {
  const digits = (phone || '').replace(/\D/g, '')
  return digits.length >= 7 ? `https://wa.me/${digits}` : undefined
}

/** tel: link from a phone number. */
export function telUrl(phone: string | null | undefined): string | undefined {
  const p = (phone || '').replace(/\s+/g, '')
  return p ? `tel:${p}` : undefined
}

/** mailto: link from an email. */
export function mailUrl(email: string | null | undefined): string | undefined {
  return email ? `mailto:${email}` : undefined
}

/** Normalise a website into a clickable https URL. */
export function siteUrl(website: string | null | undefined): string | undefined {
  if (!website) return undefined
  return website.startsWith('http') ? website : `https://${website}`
}
