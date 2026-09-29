import { WECHAT_APP_URL, copyText } from '../lib/maps'

/**
 * Tappable WeChat ID. WeChat has no public deep-link to open a specific
 * contact, so clicking launches the WeChat app and copies the ID to the
 * clipboard — the user pastes it into WeChat's search to reach the contact.
 * `stop` prevents the click from also triggering a parent card's navigation.
 */
export function WeChatLink({ id, stop = false }: { id: string; stop?: boolean }) {
  if (!id) return null
  return (
    <a
      href={WECHAT_APP_URL}
      title="Open WeChat — the ID is copied, paste it into WeChat search"
      onClick={(e) => {
        if (stop) e.stopPropagation()
        copyText(id)
      }}
    >
      {id}
    </a>
  )
}
