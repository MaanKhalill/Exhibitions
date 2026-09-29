/**
 * Prev / position / Next bar shown on a supplier detail page. Complements the
 * swipe gesture (and gives desktop / tablet a visible control). Hidden when
 * there's nothing to page through.
 */
export function NavArrows({
  index,
  total,
  onPrev,
  onNext,
}: {
  index: number
  total: number
  onPrev: () => void
  onNext: () => void
}) {
  if (total <= 1 || index < 0) return null
  const hasPrev = index > 0
  const hasNext = index < total - 1
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
      <button type="button" className="btn" style={{ padding: '7px 14px' }} onClick={onPrev} disabled={!hasPrev} aria-label="Previous supplier">
        ‹ Prev
      </button>
      <span className="hint" style={{ margin: 0 }}>{index + 1} / {total}</span>
      <button type="button" className="btn" style={{ padding: '7px 14px' }} onClick={onNext} disabled={!hasNext} aria-label="Next supplier">
        Next ›
      </button>
    </div>
  )
}
