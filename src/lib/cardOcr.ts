// Business-card OCR — runs entirely in the browser, no API key. Tesseract.js is
// loaded from a CDN only when a card is actually scanned, so it adds nothing to
// the app bundle. The recognised text is then parsed into supplier fields with
// simple heuristics; the user always reviews the result before saving.

export interface ParsedCard {
  company?: string
  contactName?: string
  position?: string
  phone?: string
  email?: string
  website?: string
  wechat?: string
  raw: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let tesseract: Promise<any> | null = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function loadTesseract(): Promise<any> {
  if (!tesseract)
    // @ts-expect-error - remote ESM module loaded at runtime; no local types
    tesseract = import(/* @vite-ignore */ 'https://esm.sh/tesseract.js@5')
  return tesseract
}

/** OCR an image (English) and return the raw recognised text. */
export async function recognizeCard(image: File | Blob | string, onProgress?: (pct: number) => void): Promise<string> {
  const T = await loadTesseract()
  const worker = await T.createWorker('eng', 1, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    logger: (m: any) => {
      if (m?.status === 'recognizing text' && onProgress) onProgress(m.progress ?? 0)
    },
  })
  try {
    const { data } = await worker.recognize(image)
    return (data?.text as string) || ''
  } finally {
    await worker.terminate()
  }
}

const onlyDigits = (s: string) => (s.match(/\d/g) || []).join('')

/** Best-effort extraction of supplier fields from raw card text. */
export function parseCard(text: string): ParsedCard {
  const raw = text || ''
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const flat = lines.join('   ')

  const email = flat.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/)?.[0]?.toLowerCase()

  // Website: an explicit www./http first, else a bare domain not part of an email.
  let website: string | undefined
  const web =
    flat.match(/\b(?:https?:\/\/)?www\.[A-Za-z0-9-]+(?:\.[A-Za-z]{2,}){1,2}\b/i) ||
    flat.match(/(?<![@\w])[A-Za-z0-9-]+\.(?:com|cn|net|org)(?:\.cn)?\b/i)
  if (web) website = web[0].replace(/^https?:\/\//i, '')

  // Phones: digit runs of 7+ digits; keep the longest few, prefer one with a "+".
  const phoneCandidates = (flat.match(/\+?\d[\d ()\-.]{6,}\d/g) || [])
    .map((p) => p.trim())
    .filter((p) => onlyDigits(p).length >= 7)
    .sort((a, b) => (b.startsWith('+') ? 1 : 0) - (a.startsWith('+') ? 1 : 0) || onlyDigits(b).length - onlyDigits(a).length)
  const phone = phoneCandidates[0]

  // WeChat / 微信 id on its own line.
  let wechat: string | undefined
  const wLine = lines.find((l) => /wechat|微信|weixin/i.test(l))
  if (wLine) {
    const after = wLine.replace(/.*?(?:wechat|微信|weixin)\s*[:：]?\s*/i, '').trim()
    wechat = after.split(/\s+/)[0] || undefined
  }

  const company = lines.find((l) =>
    /(co\.,?\s*ltd|company|limited|\bltd\b|\binc\b|有限公司|industr|technolog|machinery|electric|equipment|power|group|imp.{0,4}exp)/i.test(l),
  )

  const position = lines.find((l) =>
    /(manager|director|\bsales\b|engineer|\bceo\b|\bcto\b|export|foreign trade|supervisor|president|represent|marketing|general\s*manager|chief|vice)/i.test(l),
  )

  // Contact name: a short, letters-only line that isn't the company/position/url.
  const contactName = lines.find(
    (l) =>
      l.length <= 30 &&
      /^[A-Za-z][A-Za-z .'-]{1,28}$/.test(l) &&
      l.split(/\s+/).length <= 4 &&
      l !== company &&
      l !== position &&
      !/(co\.,?\s*ltd|company|\bltd\b|\binc\b|manager|director|sales|engineer|export|www|@|http)/i.test(l),
  )

  return {
    company: company?.trim(),
    contactName: contactName?.trim(),
    position: position?.trim(),
    phone,
    email,
    website,
    wechat,
    raw,
  }
}
