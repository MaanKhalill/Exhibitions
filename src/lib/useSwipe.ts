import { useRef } from 'react'
import type { TouchEvent } from 'react'

// Don't hijack a swipe that begins inside a horizontally-scrollable area
// (e.g. a wide table) or anything explicitly opted out with data-noswipe.
function startsInScrollable(el: HTMLElement | null): boolean {
  let n: HTMLElement | null = el
  while (n && n !== document.body) {
    if (n.hasAttribute('data-noswipe')) return true
    if (n.scrollWidth > n.clientWidth + 2) {
      const ox = getComputedStyle(n).overflowX
      if (ox === 'auto' || ox === 'scroll') return true
    }
    n = n.parentElement
  }
  return false
}

/**
 * Horizontal swipe detection for prev/next navigation.
 * Swipe left → next, swipe right → previous. Only fires on a clear horizontal
 * gesture (so vertical scrolling is untouched). Works over form fields too, but
 * leaves horizontally-scrollable regions alone. Attach the handlers to a
 * wrapping element.
 */
export function useSwipe(opts: { onPrev: () => void; onNext: () => void; canPrev: boolean; canNext: boolean }) {
  const start = useRef<{ x: number; y: number; skip: boolean } | null>(null)

  function onTouchStart(e: TouchEvent) {
    const t = e.touches[0]
    start.current = { x: t.clientX, y: t.clientY, skip: startsInScrollable(e.target as HTMLElement | null) }
  }

  function onTouchEnd(e: TouchEvent) {
    const s = start.current
    start.current = null
    if (!s || s.skip) return
    const t = e.changedTouches[0]
    const dx = t.clientX - s.x
    const dy = t.clientY - s.y
    // Clearly horizontal, and far enough to be a deliberate swipe.
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      if (dx < 0 && opts.canNext) opts.onNext()
      else if (dx > 0 && opts.canPrev) opts.onPrev()
    }
  }

  return { onTouchStart, onTouchEnd }
}
