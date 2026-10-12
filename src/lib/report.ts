// Report / export of a supplier list or any search result to PDF, Word (.doc)
// or the printer. Every page is numbered and carries the export date & time in
// the footer. Two layouts: a wide "table" of essential columns, or "cards" —
// one condensed paragraph-style block per exhibitor with ALL their fields.
// The PDF engine (jsPDF) is dynamically imported so it's code-split and cached
// for offline use; Word is a plain MS-Word HTML document, so it needs no library.

import type { ParticipationWithSupplier, Supplier } from '../types'
import { PRIORITY_LABELS, VISIT_STATUS_LABELS } from '../types'

export type ReportStyle = 'table' | 'cards'

/** One exhibitor rendered as a block: a title and label/value pairs. */
export interface ReportCard {
  title: string
  fields: [string, string][]
}

export interface ReportData {
  title: string
  subtitle?: string
  /** Table layout */
  columns: string[]
  rows: string[][]
  /** Card / paragraph layout (when set, exporters render blocks, not a table). */
  cards?: ReportCard[]
  /** Base file name, without extension. */
  filename: string
}

/** Local export timestamp, e.g. "2026-10-12 14:07". */
function exportStamp(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function safeName(base: string): string {
  return (base || 'report').replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'report'
}

/** True when there's anything to export. */
export function reportHasContent(data: ReportData): boolean {
  return Boolean(data.cards ? data.cards.length : data.rows.length)
}

function countLabel(data: ReportData): string {
  const n = data.cards ? data.cards.length : data.rows.length
  const noun = data.cards ? 'exhibitor' : 'row'
  return `${n} ${noun}${n === 1 ? '' : 's'}`
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

// ---------------------------------------------------------------------------
// PDF (also used for Print — same numbered document, sent straight to the
// print dialog).
// ---------------------------------------------------------------------------

export async function exportReportPdf(data: ReportData, opts: { print?: boolean } = {}): Promise<void> {
  const [{ jsPDF }, autoTableMod] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const autoTable = autoTableMod.default

  const cards = data.cards
  const doc = new jsPDF({ orientation: cards ? 'portrait' : 'landscape', unit: 'pt', format: 'a4' })
  const exportedAt = exportStamp()
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = cards ? 40 : 32

  // Page header (title + subtitle), redrawn at the top of every page.
  const drawHeader = () => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.setTextColor(17, 24, 39)
    doc.text(data.title, margin, 42)
    const sub = [data.subtitle, countLabel(data)].filter(Boolean).join('   ·   ')
    if (sub) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(110)
      doc.text(sub, margin, 58)
    }
  }

  if (cards) {
    const topY = 78
    const bottomLimit = pageH - 42
    const contentW = pageW - margin * 2
    let y = topY
    drawHeader()
    const ensure = (need: number) => {
      if (y + need > bottomLimit) {
        doc.addPage()
        drawHeader()
        y = topY
      }
    }
    for (const card of cards) {
      const fieldText = card.fields
        .filter(([, v]) => v && v.trim())
        .map(([k, v]) => `${k}: ${v}`)
        .join('   ·   ')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      const titleLines = doc.splitTextToSize(card.title || '—', contentW) as string[]
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      const bodyLines = (fieldText ? doc.splitTextToSize(fieldText, contentW) : []) as string[]
      // Keep the whole block together when it fits on a page.
      ensure(titleLines.length * 14 + bodyLines.length * 12 + 12)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(17, 24, 39)
      for (const ln of titleLines) {
        ensure(14)
        doc.text(ln, margin, y)
        y += 14
      }
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(45, 45, 45)
      for (const ln of bodyLines) {
        ensure(12)
        doc.text(ln, margin, y)
        y += 12
      }
      y += 5
      doc.setDrawColor(226)
      doc.line(margin, y, pageW - margin, y)
      y += 9
    }
  } else {
    autoTable(doc, {
      head: [data.columns],
      body: data.rows,
      startY: 78,
      margin: { top: 78, left: margin, right: margin, bottom: 42 },
      styles: { fontSize: 8, cellPadding: 4, overflow: 'linebreak', valign: 'top' },
      headStyles: { fillColor: [17, 24, 39], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 246, 248] },
      columnStyles: { 0: { cellWidth: 22, halign: 'right' } },
      didDrawPage: drawHeader,
    })
  }

  // Footer on every page: export timestamp (left) + "Page X of Y" (right).
  const total = doc.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(120)
    doc.text(`Exported ${exportedAt}`, margin, pageH - 18)
    doc.text(`Page ${i} of ${total}`, pageW - margin, pageH - 18, { align: 'right' })
  }

  if (opts.print) {
    doc.autoPrint()
    const url = doc.output('bloburl')
    const w = window.open(url as unknown as string, '_blank')
    if (!w) downloadBlob(doc.output('blob'), `${safeName(data.filename)}.pdf`) // popup blocked → download instead
  } else {
    doc.save(`${safeName(data.filename)}.pdf`)
  }
}

// ---------------------------------------------------------------------------
// Word — an MS-Word HTML document (.doc). Page numbers and the export stamp go
// in a Word footer; PAGE / NUMPAGES are live Word fields, the timestamp is the
// fixed moment of export.
// ---------------------------------------------------------------------------

const esc = (s: string) =>
  (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export async function exportReportWord(data: ReportData): Promise<void> {
  const exportedAt = exportStamp()
  const sub = [data.subtitle, countLabel(data)].filter(Boolean).join(' &nbsp;·&nbsp; ')
  const cards = data.cards

  const pageSize = cards ? '595.3pt 841.9pt' : '841.9pt 595.3pt'
  const pageOrient = cards ? 'portrait' : 'landscape'

  const body = cards
    ? cards
        .map((c) => {
          const fields = c.fields
            .filter(([, v]) => v && v.trim())
            .map(([k, v]) => `<b>${esc(k)}:</b> ${esc(v).replace(/\n/g, ' ')}`)
            .join(' &nbsp;·&nbsp; ')
          return `<div class="rec"><div class="rt">${esc(c.title || '—')}</div><div class="rf">${fields}</div></div>`
        })
        .join('')
    : `<table class="data"><thead><tr>${data.columns.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${data.rows
        .map((r) => `<tr>${r.map((c) => `<td>${esc(c).replace(/\n/g, '<br>')}</td>`).join('')}</tr>`)
        .join('')}</tbody></table>`

  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>${esc(data.title)}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->
<style>
@page Section1 { size: ${pageSize}; mso-page-orientation: ${pageOrient}; margin: 1.2cm 1cm 1.4cm 1cm; mso-footer: f1; mso-footer-margin: .6cm; }
div.Section1 { page: Section1; }
body { font-family: Arial, sans-serif; }
h1 { font-size: 15pt; margin: 0 0 2pt; }
p.sub { font-size: 9pt; color: #555; margin: 0 0 10pt; }
table.data { border-collapse: collapse; width: 100%; font-size: 9pt; }
table.data th, table.data td { border: 1px solid #999; padding: 4px 6px; text-align: left; vertical-align: top; }
table.data th { background: #111827; color: #fff; }
div.rec { border-bottom: 1px solid #ccc; padding: 6pt 0; }
div.rt { font-weight: bold; font-size: 11pt; }
div.rf { font-size: 9.5pt; color: #222; margin-top: 2pt; line-height: 1.35; }
p.MsoFooter, li.MsoFooter, div.MsoFooter { margin: 0; }
td.foot { border: none; font-size: 8pt; color: #666; }
</style>
</head>
<body>
<div class="Section1">
<h1>${esc(data.title)}</h1>
${sub ? `<p class="sub">${sub}</p>` : ''}
${body}
<div style="mso-element:footer" id="f1">
<p class="MsoFooter">
<table style="width:100%;border:none;"><tr>
<td class="foot" style="text-align:left;border:none;">Exported ${esc(exportedAt)}</td>
<td class="foot" style="text-align:right;border:none;">Page <span style="mso-field-code:&quot; PAGE &quot;"></span> of <span style="mso-field-code:&quot; NUMPAGES &quot;"></span></td>
</tr></table>
</p>
</div>
</div>
</body>
</html>`

  const blob = new Blob(['﻿', html], { type: 'application/msword' })
  downloadBlob(blob, `${safeName(data.filename)}.doc`)
}

// ---------------------------------------------------------------------------
// Builders — turn each list surface's rows into a table OR per-exhibitor cards.
// ---------------------------------------------------------------------------

const addr = (...parts: (string | null | undefined)[]) => parts.map((p) => (p || '').trim()).filter(Boolean).join(', ')

export function suppliersReport(
  suppliers: Supplier[],
  opts: { title: string; subtitle?: string; filename: string },
  style: ReportStyle = 'table',
): ReportData {
  if (style === 'cards') {
    const cards: ReportCard[] = suppliers.map((s) => ({
      title: s.company_name || '—',
      fields: [
        ['Products', s.product_summary],
        ['Phone', s.phone],
        ['WeChat', s.wechat],
        ['Email', s.email],
        ['Website', s.domain || s.website],
        ['Address', addr(s.address, s.city, s.province, s.country)],
        ['Amap', s.amap],
        ['Also known as', s.aliases],
        ['Notes', s.notes],
      ],
    }))
    return { columns: [], rows: [], cards, ...opts }
  }
  const columns = ['#', 'Company', 'Products', 'City / Country', 'Phone', 'Email', 'Website']
  const rows = suppliers.map((s, i) => [
    String(i + 1),
    s.company_name || '—',
    s.product_summary || '',
    addr(s.city, s.province, s.country),
    s.phone || '',
    s.email || '',
    s.domain || s.website || '',
  ])
  return { columns, rows, ...opts }
}

export function fairSuppliersReport(
  items: ParticipationWithSupplier[],
  opts: { title: string; subtitle?: string; filename: string },
  style: ReportStyle = 'table',
): ReportData {
  if (style === 'cards') {
    const cards: ReportCard[] = items.map((p) => ({
      title: p.supplier.company_name || '—',
      fields: [
        ['Hall', p.hall],
        ['Booth', p.booth],
        ['Person in charge', p.booth_contact_name],
        ['Phone', p.supplier.phone],
        ['Booth phone', p.booth_contact_phone],
        ['WeChat', p.supplier.wechat],
        ['Email', p.supplier.email],
        ['Website', p.supplier.domain || p.supplier.website],
        ['Products', p.products_shown || p.supplier.product_summary],
        ['Priority', PRIORITY_LABELS[p.priority] || ''],
        ['Status', VISIT_STATUS_LABELS[p.visit_status] || ''],
        ['Rating', p.rating ? `${p.rating}/5` : ''],
        ['Factory candidate', p.factory_candidate ? 'Yes' : ''],
        ['Location', addr(p.supplier.city, p.supplier.province, p.supplier.country)],
      ],
    }))
    return { columns: [], rows: [], cards, ...opts }
  }
  const columns = ['#', 'Company', 'Hall', 'Booth', 'Products', 'Priority', 'Status', 'Person in charge', 'Phone']
  const rows = items.map((p, i) => [
    String(i + 1),
    p.supplier.company_name || '—',
    p.hall || '',
    p.booth || '',
    p.products_shown || p.supplier.product_summary || '',
    PRIORITY_LABELS[p.priority] || '',
    VISIT_STATUS_LABELS[p.visit_status] || '',
    p.booth_contact_name || '',
    p.supplier.phone || p.booth_contact_phone || '',
  ])
  return { columns, rows, ...opts }
}
