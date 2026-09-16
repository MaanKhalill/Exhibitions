import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deleteMedia, listMediaForSupplier, mediaUrl, updateMediaRow } from '../api/media'
import { compressImage } from '../lib/image'
import { enqueueCapture, pendingForSupplier } from '../lib/captureQueue'
import { useCaptureQueue } from '../lib/useCaptureQueue'
import { MEDIA_KIND_LABELS, PRODUCT_FLAGS, type MediaItem, type MediaKind } from '../types'

const PHOTO_KINDS: { kind: MediaKind; label: string; icon: string }[] = [
  { kind: 'product', label: 'Product', icon: '📦' },
  { kind: 'booth', label: 'Booth', icon: '🏬' },
  { kind: 'card', label: 'Card', icon: '💳' },
  { kind: 'catalogue', label: 'Catalogue', icon: '📖' },
]

export function CaptureSection({
  supplierId,
  participationId,
  exhibitionId,
}: {
  supplierId: string
  participationId: string | null
  exhibitionId: string | null
}) {
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const kindRef = useRef<MediaKind>('product')
  const [busy, setBusy] = useState(false)
  const [selected, setSelected] = useState<MediaItem | null>(null)
  const queue = useCaptureQueue()
  const pending = pendingForSupplier(supplierId)

  const { data: media = [] } = useQuery({
    queryKey: ['media', supplierId],
    queryFn: () => listMediaForSupplier(supplierId),
  })

  // Refresh the gallery when the offline queue drains.
  useEffect(() => {
    if (queue.pending.length === 0 && !queue.syncing) {
      qc.invalidateQueries({ queryKey: ['media', supplierId] })
    }
  }, [queue.pending.length, queue.syncing, qc, supplierId])

  const del = useMutation({
    mutationFn: (item: MediaItem) => deleteMedia(item),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['media', supplierId] })
      setSelected(null)
    },
  })

  function pick(kind: MediaKind) {
    kindRef.current = kind
    fileRef.current?.click()
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      const dataUrl = await compressImage(file, 1400, 0.72)
      enqueueCapture({
        id: crypto.randomUUID(),
        dataUrl,
        folder: kindRef.current,
        meta: { kind: kindRef.current, supplier_id: supplierId, participation_id: participationId, exhibition_id: exhibitionId },
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="detail-section">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
        <h3 style={{ margin: 0, flex: 1 }}>Photos & scans</h3>
        {queue.pending.length > 0 && (
          <span className="badge status-quote">{queue.syncing ? 'Uploading…' : `${queue.pending.length} to sync`}</span>
        )}
      </div>

      <div className="capture-buttons">
        {PHOTO_KINDS.map((k) => (
          <button key={k.kind} className="capture-btn" onClick={() => pick(k.kind)} disabled={busy}>
            <span className="cap-ico">{k.icon}</span>
            <span>{k.label}</span>
          </button>
        ))}
        <Link className="capture-btn" to={`/fair/supplier/${supplierId}/scan`}>
          <span className="cap-ico">🔳</span>
          <span>Scan</span>
        </Link>
      </div>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onFile} style={{ display: 'none' }} />
      {busy && <p className="hint">Processing photo…</p>}

      <div className="media-grid">
        {pending.map((p) => (
          <div className="media-cell" key={p.id}>
            {p.dataUrl ? <img src={p.dataUrl} alt="pending" /> : <span className="noimg">{p.meta.kind === 'qr' ? '🔳' : '🏷'}</span>}
            <span className="media-badge">saved locally</span>
          </div>
        ))}
        {media.map((m) => (
          <div className="media-cell" key={m.id} onClick={() => setSelected(m)}>
            {m.path ? (
              <MediaThumb path={m.path} />
            ) : (
              <span className="noimg">{m.kind === 'qr' || m.kind === 'barcode' ? '🔳' : '🏷'}</span>
            )}
            <span className="media-badge">{MEDIA_KIND_LABELS[m.kind]}</span>
          </div>
        ))}
      </div>
      {media.length === 0 && pending.length === 0 && (
        <p className="hint">No photos or scans yet. Capture products, the booth, a business card, or scan a QR code.</p>
      )}

      {selected && (
        <MediaEditor
          item={selected}
          onClose={() => setSelected(null)}
          onSaved={() => qc.invalidateQueries({ queryKey: ['media', supplierId] })}
          onDelete={() => del.mutate(selected)}
        />
      )}
    </div>
  )
}

function MediaThumb({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let active = true
    mediaUrl(path).then((u) => active && setUrl(u))
    return () => {
      active = false
    }
  }, [path])
  return url ? <img src={url} alt="" /> : <span className="noimg">🖼</span>
}

function MediaEditor({
  item,
  onClose,
  onSaved,
  onDelete,
}: {
  item: MediaItem
  onClose: () => void
  onSaved: () => void
  onDelete: () => void
}) {
  const [caption, setCaption] = useState(item.caption)
  const [flags, setFlags] = useState<string[]>(item.flags ? item.flags.split(',').filter(Boolean) : [])
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (item.path) mediaUrl(item.path).then(setUrl)
  }, [item.path])

  const save = useMutation({
    mutationFn: () => updateMediaRow(item.id, { caption, flags: flags.join(',') }),
    onSuccess: () => {
      onSaved()
      onClose()
    },
  })
  const toggle = (f: string) => setFlags((p) => (p.includes(f) ? p.filter((x) => x !== f) : [...p, f]))

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h3>{MEDIA_KIND_LABELS[item.kind]}</h3>
        {url && item.path && <img className="sheet-img" src={url} alt="" />}
        {item.decoded_content && <div className="linkbox" style={{ marginBottom: 12 }}>{item.decoded_content}</div>}
        <div className="field">
          <label>Caption / notes</label>
          <textarea value={caption} onChange={(e) => setCaption(e.target.value)} />
        </div>
        {item.kind === 'product' && (
          <div className="field">
            <label>Flags</label>
            <div className="chips" style={{ flexWrap: 'wrap' }}>
              {PRODUCT_FLAGS.map((f) => (
                <button key={f} type="button" className={`chip ${flags.includes(f) ? 'active' : ''}`} onClick={() => toggle(f)}>
                  {f}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="actions">
          <button className="btn danger" onClick={onDelete}>Delete</button>
          <button className="btn primary" onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
        <button className="btn ghost block" onClick={onClose} style={{ marginTop: 8 }}>Close</button>
      </div>
    </div>
  )
}
