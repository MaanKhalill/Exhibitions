import type { Exhibition, Invitation } from '../types'
import { inviteUrl } from '../api/invitations'
import { formatDateRange } from './format'

function purposeAsk(inv: Invitation, lang: 'en' | 'zh'): string {
  if (lang === 'en') {
    if (inv.purpose === 'factory') return 'your full factory address for a possible visit'
    if (inv.purpose === 'both')
      return 'whether you will exhibit and your booth number, and your full factory address for a possible visit'
    return 'whether you will exhibit and your booth number, and a possible meeting time'
  }
  if (inv.purpose === 'factory') return '贵司完整的工厂地址以便安排参观'
  if (inv.purpose === 'both') return '是否参展及展位号，以及贵司完整的工厂地址以便安排参观'
  return '是否参展、展位号，以及可安排的洽谈时间'
}

/** Trip details block (English) built from the exhibition/trip fields. */
export function tripDetails(ex: Exhibition | null): string {
  if (!ex) return ''
  const lines: string[] = []
  const fair = formatDateRange(ex.start_date, ex.end_date)
  const trip = formatDateRange(ex.trip_start, ex.trip_end)
  if (fair) lines.push(`Fair dates: ${fair}${ex.city ? ` (${ex.city})` : ''}`)
  if (trip) lines.push(`My trip: ${trip}`)
  if (ex.arrival_city || ex.departure_city) {
    lines.push(`Arriving ${ex.arrival_city || '—'}, departing ${ex.departure_city || '—'}`)
  }
  if (ex.hotel) lines.push(`Staying at: ${ex.hotel}`)
  return lines.length ? `My trip details:\n${lines.join('\n')}` : ''
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
    'The link is valid for 48 hours after you first open it.',
    'Thank you!',
  ].join('\n')
  const zh = [
    greetName ? `您好 ${greetName}：` : '您好：',
    `我们将参加${exName}${dates ? `（${dates}）` : ''}，希望与贵司洽谈。`,
    `请通过以下链接填写${purposeAsk(inv, 'zh')}（无需登录）：`,
    url,
    '链接自首次打开起 48 小时内有效。',
    '谢谢！',
  ].join('\n')
  return `${en}\n\n———\n\n${zh}`
}

/** "Please update all your details" message — used for the 24h update link. */
export function updateRequestMessage(inv: Invitation, ex: Exhibition | null): string {
  const url = inviteUrl(inv.token)
  const greetName = inv.contact_name || inv.company_name || ''
  const exName = ex ? `${ex.name}${ex.edition ? ' ' + ex.edition : ''}` : 'the exhibition'
  const en = [
    greetName ? `Hello ${greetName},` : 'Hello,',
    `Ahead of ${exName}, could you please review and update all your company details (products, booth, contact, factory) here:`,
    url,
    'For security this link is valid for 24 hours from now.',
    'Thank you!',
  ].join('\n')
  const zh = [
    greetName ? `您好 ${greetName}：` : '您好：',
    `在${exName}之前，请通过以下链接更新贵司的全部信息（产品、展位、联系人、工厂）：`,
    url,
    '为安全起见，此链接自现在起 24 小时内有效。',
    '谢谢！',
  ].join('\n')
  return `${en}\n\n———\n\n${zh}`
}

/** Full email body: the bilingual invite plus the sender's trip details. */
export function emailBody(inv: Invitation, ex: Exhibition | null): string {
  const trip = tripDetails(ex)
  return trip ? `${invitationMessage(inv, ex)}\n\n———\n\n${trip}` : invitationMessage(inv, ex)
}

export function emailSubject(ex: Exhibition | null): string {
  const exName = ex ? `${ex.name}${ex.edition ? ' ' + ex.edition : ''}` : 'Exhibition'
  return `${exName} — meeting request / 洽谈邀请`
}

function waLink(text: string, phone: string): string {
  const t = encodeURIComponent(text)
  const p = (phone || '').replace(/\D/g, '')
  return p ? `https://wa.me/${p}?text=${t}` : `https://wa.me/?text=${t}`
}

export function whatsappLink(inv: Invitation, ex: Exhibition | null): string {
  return waLink(invitationMessage(inv, ex), inv.phone)
}

export function whatsappUpdateLink(inv: Invitation, ex: Exhibition | null): string {
  return waLink(updateRequestMessage(inv, ex), inv.phone)
}

export function mailtoLink(inv: Invitation, ex: Exhibition | null): string {
  const subject = encodeURIComponent(emailSubject(ex))
  const body = encodeURIComponent(emailBody(inv, ex))
  const to = encodeURIComponent(inv.email || '')
  return `mailto:${to}?subject=${subject}&body=${body}`
}
