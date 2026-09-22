// Read a QR / barcode from a still image — e.g. a business-card photo taken or
// picked from the gallery. Many cards carry a QR code holding the contact's
// vCard, a MeCard, or a URL; decoding that is cleaner than OCR. Uses the
// browser's native BarcodeDetector when available, otherwise the bundled ZXing
// reader (dynamically imported, so it's code-split and cached for offline use —
// the same reader the live camera scanner uses).

import type { ParsedCard } from './cardOcr'

/* eslint-disable @typescript-eslint/no-explicit-any */

async function detectNative(file: Blob): Promise<string | null> {
  const BD = (globalThis as any).BarcodeDetector
  if (!BD) return null
  let formats: string[] | undefined
  try {
    formats = await BD.getSupportedFormats?.()
  } catch {
    formats = undefined
  }
  const detector = formats && formats.length ? new BD({ formats }) : new BD()
  const bitmap = await createImageBitmap(file)
  try {
    const codes = await detector.detect(bitmap)
    const hit = (codes || []).map((c: any) => c?.rawValue).find((v: any) => typeof v === 'string' && v)
    return hit || null
  } finally {
    bitmap.close?.()
  }
}

async function detectZxing(file: Blob): Promise<string | null> {
  const { BrowserMultiFormatReader } = await import('@zxing/browser')
  const reader = new BrowserMultiFormatReader()
  const url = URL.createObjectURL(file)
  try {
    const result = await reader.decodeFromImageUrl(url)
    return result?.getText?.() || null
  } catch {
    return null // no code found in the image
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Read the first QR / barcode found in an image, or null if there isn't one. */
export async function scanBarcodeFromImage(file: Blob): Promise<string | null> {
  try {
    const native = await detectNative(file)
    if (native) return native
  } catch {
    /* native detector unavailable or failed — fall back to ZXing */
  }
  try {
    return await detectZxing(file)
  } catch {
    return null
  }
}

const clean = (s?: string) =>
  (s || '')
    .replace(/\\n/gi, ' ')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
    .trim()

const stripProto = (s: string) => s.replace(/^https?:\/\//i, '').trim()

/** First non-empty value of a vCard property (ignoring TYPE= parameters). */
function vcardValue(lines: string[], prop: string): string | undefined {
  const re = new RegExp(`^${prop}(?:;[^:]*)?:(.*)$`, 'i')
  for (const l of lines) {
    const m = l.match(re)
    if (m && m[1].trim()) return m[1].trim()
  }
  return undefined
}

function parseVCard(raw: string): ParsedCard {
  const lines = raw.split(/\r?\n/)
  let contactName = clean(vcardValue(lines, 'FN'))
  if (!contactName) {
    const n = vcardValue(lines, 'N') // family;given;additional;prefix;suffix
    if (n) {
      const [family = '', given = ''] = n.split(';')
      contactName = clean(`${given} ${family}`)
    }
  }
  const org = vcardValue(lines, 'ORG')
  const urlv = vcardValue(lines, 'URL')
  const email = vcardValue(lines, 'EMAIL')
  return {
    company: org ? clean(org.split(';')[0]) || undefined : undefined,
    contactName: contactName || undefined,
    position: clean(vcardValue(lines, 'TITLE')) || undefined,
    phone: clean(vcardValue(lines, 'TEL')) || undefined,
    email: email ? email.trim().toLowerCase() : undefined,
    website: urlv ? stripProto(clean(urlv)) || undefined : undefined,
    raw,
  }
}

function parseMeCard(raw: string): ParsedCard {
  const body = raw.replace(/^MECARD:/i, '')
  const fields: Record<string, string> = {}
  for (const part of body.split(';')) {
    const idx = part.indexOf(':')
    if (idx > 0) fields[part.slice(0, idx).trim().toUpperCase()] = part.slice(idx + 1).trim()
  }
  const name = fields.N ? clean(fields.N.split(',').reverse().join(' ')) : undefined // N: last,first
  return {
    company: fields.ORG || undefined,
    contactName: name || undefined,
    phone: fields.TEL || undefined,
    email: fields.EMAIL ? fields.EMAIL.toLowerCase() : undefined,
    website: fields.URL ? stripProto(fields.URL) || undefined : undefined,
    raw,
  }
}

/** Turn a decoded QR / barcode payload into supplier fields, or null if unusable. */
export function parseBarcodePayload(text: string): ParsedCard | null {
  const raw = (text || '').trim()
  if (!raw) return null
  if (/^BEGIN:VCARD/i.test(raw)) return parseVCard(raw)
  if (/^MECARD:/i.test(raw)) return parseMeCard(raw)
  if (/^https?:\/\//i.test(raw) || /^www\./i.test(raw)) return { website: stripProto(raw), raw }
  // Arbitrary text — salvage an email / phone if present.
  const email = raw.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/)?.[0]?.toLowerCase()
  const phone = raw.match(/\+?\d[\d ()\-.]{6,}\d/)?.[0]
  if (email || phone) return { email, phone, raw }
  return { raw }
}

/** True when a parsed card carries a usable identity field (not just a URL / raw blob). */
export function hasCardFields(p: ParsedCard | null): boolean {
  return Boolean(p && (p.company || p.contactName || p.email || p.phone))
}
