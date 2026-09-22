import { useRef, useState } from 'react'
import { parseCard, recognizeCard, type ParsedCard } from '../lib/cardOcr'
import { hasCardFields, parseBarcodePayload, scanBarcodeFromImage } from '../lib/cardBarcode'

/**
 * "Scan business card" control with two sources — the camera or the photo
 * gallery. Both feed the same reader: it first looks for a QR / barcode on the
 * card (vCard, MeCard or URL, decoded offline via the bundled ZXing reader) and,
 * if there isn't a usable one, OCRs the printed text instead. Whatever it finds
 * is handed back to the form, which only ever fills empty fields — the user
 * reviews the result before saving.
 */
export function CardScanButton({ onParsed }: { onParsed: (p: ParsedCard) => void }) {
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [label, setLabel] = useState('')
  const [err, setErr] = useState<string | null>(null)

  // Barcode-provided fields win; OCR fills whatever the code didn't carry.
  function merge(ocr: ParsedCard, code: ParsedCard | null): ParsedCard {
    if (!code) return ocr
    return {
      company: code.company || ocr.company,
      contactName: code.contactName || ocr.contactName,
      position: code.position || ocr.position,
      phone: code.phone || ocr.phone,
      email: code.email || ocr.email,
      website: code.website || ocr.website,
      wechat: code.wechat || ocr.wechat,
      raw: [code.raw, ocr.raw].filter(Boolean).join('\n\n'),
    }
  }

  async function process(file: File) {
    setBusy(true)
    setErr(null)
    try {
      // 1) A QR / barcode on the card gives the cleanest data and works offline.
      setLabel('Looking for a code…')
      let code: ParsedCard | null = null
      try {
        const decoded = await scanBarcodeFromImage(file)
        if (decoded) code = parseBarcodePayload(decoded)
      } catch {
        /* no code, or the reader failed — OCR below */
      }

      // 2) No usable code? Read the printed text with OCR and merge the two.
      let parsed: ParsedCard | null = code
      if (!hasCardFields(code)) {
        setLabel('Reading card… 0%')
        const text = await recognizeCard(file, (p) => setLabel(`Reading card… ${Math.round(p * 100)}%`))
        parsed = merge(parseCard(text), code)
      }

      if (!hasCardFields(parsed) && !parsed?.website) {
        setErr('Could not read a card or code from that image. Try a sharper, well-lit, straight-on photo.')
      }
      if (parsed) onParsed(parsed)
    } catch {
      setErr('Card reader could not load (the text reader needs internet the first time). You can still type the details.')
    } finally {
      setBusy(false)
      setLabel('')
    }
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-picking the same file
    if (file) process(file)
  }

  return (
    <div style={{ marginBottom: 12 }}>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={onPick} />
      <input ref={galleryRef} type="file" accept="image/*" hidden onChange={onPick} />
      {busy ? (
        <button type="button" className="btn block" disabled>
          {label || 'Scanning…'}
        </button>
      ) : (
        <div className="row2">
          <button type="button" className="btn" onClick={() => cameraRef.current?.click()}>
            📇 Scan card
          </button>
          <button type="button" className="btn" onClick={() => galleryRef.current?.click()}>
            🖼️ From gallery
          </button>
        </div>
      )}
      {err && <p className="error" style={{ marginBottom: 0 }}>{err}</p>}
      <p className="hint" style={{ marginBottom: 0 }}>
        Take or pick a card photo to auto-fill below — reads its QR / barcode if it has one, otherwise the printed
        text. Check the result; scanning isn't perfect.
      </p>
    </div>
  )
}
