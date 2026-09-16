import type { Exhibition, Invitation } from '../types'
import { inviteUrl } from '../api/invitations'
import { formatDateRange } from './format'

function purposeAsk(inv: Invitation, lang: 'en' | 'zh'): string {
  if (lang === 'en') {
    if (inv.purpose === 'factory') return 'your factory address and a possible factory-visit time'
    if (inv.purpose === 'both')
      return 'your booth details and a possible meeting, plus your factory address and a possible factory-visit time'
    return 'your booth details and a possible meeting time'
  }
  if (inv.purpose === 'factory') return '贵司工厂地址及可安排的参观时间'
  if (inv.purpose === 'both') return '展位信息、洽谈时间，以及工厂地址和可安排的参观时间'
  return '展位信息及可安排的洽谈时间'
}

/** Bilingual EN + 中文 invitation message for WhatsApp / copy / WeChat. */
export function invitationMessage(inv: Invitation, ex: Exhibition | null): string {
  const url = inviteUrl(inv.token)
  const greetName = inv.contact_name || inv.company_name || ''
  const exName = ex ? `${ex.name}${ex.edition ? ' ' + ex.edition : ''}` : 'the exhibition'
  const dates = ex ? formatDateRange(ex.start_date, ex.end_date) : ''
  const en = [
    greetName ? `Hello ${greetName},` : 'Hello,',
    `We are attending ${exName}${dates ? ` (${dates})` : ''} and would like to connect with you.`,
    `Could you please share ${purposeAsk(inv, 'en')} using this quick form (no login needed):`,
    url,
    'Thank you!',
  ].join('\n')
  const zh = [
    greetName ? `您好 ${greetName}：` : '您好：',
    `我们将参加${exName}${dates ? `（${dates}）` : ''}，希望与贵司洽谈。`,
    `请通过以下链接填写${purposeAsk(inv, 'zh')}（无需登录）：`,
    url,
    '谢谢！',
  ].join('\n')
  return `${en}\n\n———\n\n${zh}`
}

export function emailSubject(ex: Exhibition | null): string {
  const exName = ex ? `${ex.name}${ex.edition ? ' ' + ex.edition : ''}` : 'Exhibition'
  return `${exName} — meeting request / 洽谈邀请`
}

export function whatsappLink(inv: Invitation, ex: Exhibition | null): string {
  const text = encodeURIComponent(invitationMessage(inv, ex))
  const phone = (inv.phone || '').replace(/\D/g, '')
  return phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`
}

export function mailtoLink(inv: Invitation, ex: Exhibition | null): string {
  const subject = encodeURIComponent(emailSubject(ex))
  const body = encodeURIComponent(invitationMessage(inv, ex))
  const to = encodeURIComponent(inv.email || '')
  return `mailto:${to}?subject=${subject}&body=${body}`
}
