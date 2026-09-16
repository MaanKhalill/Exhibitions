import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { enqueueCapture } from '../lib/captureQueue'
import { useExhibitions } from '../lib/ExhibitionContext'
import { Field, Page } from '../components/ui'

/**
 * QR / barcode scanner. ZXing is dynamically imported so it never bloats the
 * main bundle. Works offline: the decoded value is queued like any capture.
 * A manual-entry fallback covers cameras that can't be accessed.
 */
export function ScanScreen() {
  const { supplierId } = useParams()
  const navigate = useNavigate()
  const { current } = useExhibitions()
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<{ stop: () => void } | null>(null)
  const [status, setStatus] = useState('Starting camera…')
  const [result, setResult] = useState<{ text: string; kind: 'qr' | 'barcode' } | null>(null)
  const [manual, setManual] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [{ BrowserMultiFormatReader }, { BarcodeFormat }] = await Promise.all([
          import('@zxing/browser'),
          import('@zxing/library'),
        ])
        if (cancelled) return
        const reader = new BrowserMultiFormatReader()
        setStatus('Point the camera at a QR code or barcode')
        const controls = await reader.decodeFromVideoDevice(undefined, videoRef.current!, (res) => {
          if (res && !cancelled) {
            const isQr = res.getBarcodeFormat() === BarcodeFormat.QR_CODE
            controls.stop()
            setResult({ text: res.getText(), kind: isQr ? 'qr' : 'barcode' })
          }
        })
        controlsRef.current = controls
      } catch (e) {
        if (!cancelled) setStatus(e instanceof Error ? `Camera unavailable: ${e.message}` : 'Camera unavailable')
      }
    })()
    return () => {
      cancelled = true
      controlsRef.current?.stop()
    }
  }, [])

  function saveScan(text: string, kind: 'qr' | 'barcode') {
    if (!supplierId || !text.trim()) return
    enqueueCapture({
      id: crypto.randomUUID(),
      folder: kind,
      meta: {
        kind,
        supplier_id: supplierId,
        exhibition_id: current?.id ?? null,
        decoded_content: text.trim(),
      },
    })
    navigate(`/fair/supplier/${supplierId}`, { replace: true })
  }

  return (
    <Page title="Scan QR / barcode" back>
      {!result && (
        <>
          <div className="scanner">
            <video ref={videoRef} playsInline muted />
            <div className="scan-frame" />
          </div>
          <p className="hint" style={{ textAlign: 'center' }}>{status}</p>
        </>
      )}

      {result && (
        <div className="detail-section">
          <h3>{result.kind === 'qr' ? 'QR code' : 'Barcode'} detected</h3>
          <div className="linkbox" style={{ marginBottom: 12 }}>{result.text}</div>
          <div className="actions">
            <button className="btn" onClick={() => { setResult(null); navigate(0) }}>Scan again</button>
            <button className="btn primary" onClick={() => saveScan(result.text, result.kind)}>Save to supplier</button>
          </div>
        </div>
      )}

      <div className="detail-section">
        <h3>Enter manually</h3>
        <Field label="Code / link">
          <input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Paste or type a code / URL" />
        </Field>
        <button className="btn block" onClick={() => saveScan(manual, /^https?:|^www\./i.test(manual) ? 'qr' : 'barcode')} disabled={!manual.trim()}>
          Save manual entry
        </button>
      </div>
    </Page>
  )
}
