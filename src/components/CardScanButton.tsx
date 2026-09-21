import { useRef, useState } from 'react'
import { parseCard, recognizeCard, type ParsedCard } from '../lib/cardOcr'

/**
 * "Scan business card" button: opens the camera / picker, OCRs the photo in the
 * browser, and hands the parsed fields back so the form can auto-fill. The user
 * always reviews the result.
 */
export function CardScanButton({ onParsed }: { onParsed: (p: ParsedCard) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [pct, setPct] = useState(0)
  const [err, setErr] = useState<string | null>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-picking the same file
    if (!file) return
    setBusy(true)
    setErr(null)
    setPct(0)
    try {
      const text = await recognizeCard(file, (p) => setPct(Math.round(p * 100)))
      const parsed = parseCard(text)
      if (!parsed.company && !parsed.email && !parsed.phone && !parsed.contactName) {
        setErr('Could not read much from that image. Try a sharper, well-lit, straight-on photo.')
      }
      onParsed(parsed)
    } catch {
      setErr('Card reader could not load (needs internet the first time). You can still type the details.')
    } finally {
      setBusy(false)
      setPct(0)
    }
  }

  return (
    <div style={{ marginBottom: 12 }}>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" hidden onChange={handleFile} />
      <button type="button" className="btn block" onClick={() => inputRef.current?.click()} disabled={busy}>
        {busy ? `Reading card… ${pct}%` : '📇 Scan business card'}
      </button>
      {err && <p className="error" style={{ marginBottom: 0 }}>{err}</p>}
      <p className="hint" style={{ marginBottom: 0 }}>
        Snap a card to auto-fill the fields below, then check them — OCR isn't perfect.
      </p>
    </div>
  )
}
