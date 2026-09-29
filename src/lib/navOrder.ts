// Remembers the ordered list of supplier ids the user is browsing, so a
// supplier detail page can offer swipe / prev-next through the SAME order the
// list showed (respecting its current search, filter and sort). Kept in
// sessionStorage so it survives the navigation and a reload within the session.

export type NavContext = 'directory' | 'fair'

const key = (ctx: NavContext) => `nav-order-${ctx}`

export function setNavOrder(ctx: NavContext, ids: string[]): void {
  try {
    sessionStorage.setItem(key(ctx), JSON.stringify(ids))
  } catch {
    /* storage blocked — swipe falls back to a default order */
  }
}

export function getNavOrder(ctx: NavContext): string[] {
  try {
    const v = JSON.parse(sessionStorage.getItem(key(ctx)) || '[]')
    return Array.isArray(v) ? (v as string[]) : []
  } catch {
    return []
  }
}
