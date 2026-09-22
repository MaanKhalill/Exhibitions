// Report / export of a supplier list or any search result to PDF, Word (.doc)
// or the printer. Every page is numbered and carries the export date & time in
// the footer. The PDF engine (jsPDF) is dynamically imported so it's code-split
// and cached for offline use; Word is a plain MS-Word HTML document, so it
// needs no library at all.

import type { ParticipationWithSupplier, Supplier } from '../types'
import { PRIORITY_LABELS, VISIT_STATUS_LABELS } from '../types'

export interface ReportData {
  title: string
  subtitle?: string
  columns: string[]
  rows: string[][]
  /** Base file name, without extension. */
  filename: string
}

/** Local export timestamp, e.g. "2026-09-22 14:07". */
function exportStamp(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function safeName(base: string): string {
  return (base || 'report').replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'report'
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

  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  const exportedAt = exportStamp()
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 32
  const countLabel = `${data.rows.length} row${data.rows.length === 1 ? '' : 's'}`

  autoTable(doc, {
    head: [data.columns],
    body: data.rows,
    startY: 78,
    margin: { top: 78, left: margin, right: margin, bottom: 42 },
    styles: { fontSize: 8, cellPadding: 4, overflow: 'linebreak', valign: 'top' },
    headStyles: { fillColor: [17, 24, 39], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 246, 248] },
    columnStyles: { 0: { cellWidth: 22, halign: 'right' } },
    // Page header (title + subtitle) repeats at the top of every page.
    didDrawPage: () => {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(14)
      doc.setTextColor(17, 24, 39)
      doc.text(data.title, margin, 42)
      const sub = [data.subtitle, countLabel].filter(Boolean).join('   ·   ')
      if (sub) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(110)
        doc.text(sub, margin, 58)
      }
    },
  })

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
  const countLabel = `${data.rows.length} row${data.rows.length === 1 ? '' : 's'}`
  const sub = [data.subtitle, countLabel].filter(Boolean).join(' &nbsp;·&nbsp; ')

  const thead = `<tr>${data.columns.map((c) => `<th>${esc(c)}</th>`).join('')}</tr>`
  const tbody = data.rows
    .map((r) => `<tr>${r.map((c) => `<td>${esc(c).replace(/\n/g, '<br>')}</td>`).join('')}</tr>`)
    .join('')

  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>${esc(data.title)}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->
<style>
@page Section1 { size: 841.9pt 595.3pt; mso-page-orientation: landscape; margin: 1.2cm 1cm 1.4cm 1cm; mso-footer: f1; mso-footer-margin: .6cm; }
div.Section1 { page: Section1; }
body { font-family: Arial, sans-serif; }
h1 { font-size: 15pt; margin: 0 0 2pt; }
p.sub { font-size: 9pt; color: #555; margin: 0 0 10pt; }
table.data { border-collapse: collapse; width: 100%; font-size: 9pt; }
table.data th, table.data td { border: 1px solid #999; padding: 4px 6px; text-align: left; vertical-align: top; }
table.data th { background: #111827; color: #fff; }
p.MsoFooter, li.MsoFooter, div.MsoFooter { margin: 0; }
td.foot { border: none; font-size: 8pt; color: #666; }
</style>
</head>
<body>
<div class="Section1">
<h1>${esc(data.title)}</h1>
${sub ? `<p class="sub">${sub}</p>` : ''}
<table class="data"><thead>${thead}</thead><tbody>${tbody}</tbody></table>
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
// Builders — turn each list surface's rows into report columns/rows.
// ---------------------------------------------------------------------------

export function suppliersReport(
  suppliers: Supplier[],
  opts: { title: string; subtitle?: string; filename: string },
): ReportData {
  const columns = ['#', 'Company', 'Products', 'City / Country', 'Phone', 'Email', 'Website']
  const rows = suppliers.map((s, i) => [
    String(i + 1),
    s.company_name || '—',
    s.product_summary || '',
    [s.city, s.country].filter(Boolean).join(', '),
    s.phone || '',
    s.email || '',
    s.domain || s.website || '',
  ])
  return { columns, rows, ...opts }
}

export function fairSuppliersReport(
  items: ParticipationWithSupplier[],
  opts: { title: string; subtitle?: string; filename: string },
): ReportData {
  const columns = ['#', 'Company', 'Hall', 'Booth', 'Products', 'Priority', 'Status', 'Rating', 'Factory', 'Contact']
  const rows = items.map((p, i) => [
    String(i + 1),
    p.supplier.company_name || '—',
    p.hall || '',
    p.booth || '',
    p.products_shown || p.supplier.product_summary || '',
    PRIORITY_LABELS[p.priority] || '',
    VISIT_STATUS_LABELS[p.visit_status] || '',
    p.rating ? `${p.rating}/5` : '',
    p.factory_candidate ? 'Yes' : '',
    [p.booth_contact_name, p.booth_contact_phone].filter(Boolean).join(' · '),
  ])
  return { columns, rows, ...opts }
}
