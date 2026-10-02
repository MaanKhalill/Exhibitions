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

/** URL scheme that launches the WeChat app (there is no public deep-link to a
 *  specific contact, so we open the app and copy the ID for pasting into search). */
export const WECHAT_APP_URL = 'weixin://'

const isUrl = (s: string) => /^https?:\/\//i.test(s.trim())

/** Amap (Gaode / 高德) search-by-address link. Opens the Amap app in China. */
export function amapSearchUrl(...parts: (string | null | undefined)[]): string | undefined {
  const q = parts.map((p) => (p || '').trim()).filter(Boolean).join(' ')
  if (!q) return undefined
  return `https://uri.amap.com/search?keyword=${encodeURIComponent(q)}&src=exhibitions&callnative=1`
}

/** Amap marker at WGS-84 coordinates (Amap converts to its GCJ-02 datum). */
export function amapMarkerUrl(lat: number, lng: number, name = 'Location'): string {
  return `https://uri.amap.com/marker?position=${lng},${lat}&name=${encodeURIComponent(name)}&coordinate=wgs84&callnative=1&src=exhibitions`
}

/**
 * Best "open in Amap" link for a supplier. Prefers the supplier-provided Amap
 * field: a share link opens as-is; a coordinate pair becomes an Amap marker
 * (treated as Amap's native lng,lat / GCJ-02, the usual copy format); any other
 * text is searched. Falls back to searching the structured address.
 */
export function amapForSupplier(s: {
  amap?: string | null
  address?: string | null
  city?: string | null
  province?: string | null
  country?: string | null
  company_name?: string | null
}): string | undefined {
  const raw = (s.amap || '').trim()
  if (raw) {
    if (isUrl(raw)) return raw
    const m = raw.match(/(-?\d{1,3}\.\d+)\s*[, ]\s*(-?\d{1,3}\.\d+)/)
    if (m) {
      const a = parseFloat(m[1])
      const b = parseFloat(m[2])
      // China: longitude (~73–135) > latitude (~18–53); order them, assume Amap GCJ-02.
      const [lng, lat] = Math.abs(a) >= Math.abs(b) ? [a, b] : [b, a]
      return `https://uri.amap.com/marker?position=${lng},${lat}&name=${encodeURIComponent(s.company_name || 'Location')}&coordinate=gaode&callnative=1&src=exhibitions`
    }
    // Plain text: search the complete address (add city/province/country if the
    // supplier's text doesn't already include them).
    return amapSearchUrl(...completeAddress(raw, s.city, s.province, s.country))
  }
  return amapSearchUrl(s.address, s.city, s.province, s.country)
}

/** Keep `raw`, then append any address parts it doesn't already contain. */
function completeAddress(raw: string, ...parts: (string | null | undefined)[]): string[] {
  const have = raw.toLowerCase()
  const extra = parts.map((p) => (p || '').trim()).filter((p) => p && !have.includes(p.toLowerCase()))
  return [raw, ...extra]
}

/** Best-effort copy to clipboard (never throws). */
export function copyText(text: string): void {
  try {
    navigator.clipboard?.writeText(text)
  } catch {
    /* clipboard blocked (insecure context, permissions) — ignore */
  }
}
