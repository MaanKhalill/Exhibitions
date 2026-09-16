import type { Product, Supplier } from '../types'
import { STATUS_LABELS } from '../types'

function csvCell(value: unknown): string {
  const s = value == null ? '' : String(value)
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
  return s
}

function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(csvCell).join(',')]
  for (const row of rows) lines.push(row.map(csvCell).join(','))
  // BOM so Excel opens UTF-8 (Chinese characters) correctly.
  return '﻿' + lines.join('\r\n')
}

export function suppliersToCsv(
  suppliers: Supplier[],
  products: Product[],
): string {
  const byId = new Map<string, Product[]>()
  for (const p of products) {
    const arr = byId.get(p.supplier_id) || []
    arr.push(p)
    byId.set(p.supplier_id, arr)
  }
  const headers = [
    'Company',
    'Hall',
    'Booth',
    'Category',
    'Contact',
    'Phone',
    'WeChat',
    'Email',
    'Website',
    'Rating',
    'Status',
    'Products',
    'Notes',
    'Saved',
  ]
  const rows = suppliers.map((s) => {
    const prods = byId.get(s.id) || []
    const productSummary = prods
      .map((p) => {
        const bits = [p.name, p.model, p.moq && `MOQ ${p.moq}`, p.unit_price && `${p.unit_price} ${p.currency}`]
        return bits.filter(Boolean).join(' · ')
      })
      .filter(Boolean)
      .join(' | ')
    return [
      s.company_name,
      s.hall,
      s.booth,
      s.category,
      s.contact_name,
      s.phone,
      s.wechat,
      s.email,
      s.website,
      s.rating,
      STATUS_LABELS[s.status] || s.status,
      productSummary,
      s.notes,
      new Date(s.created_at).toLocaleString(),
    ]
  })
  return toCsv(headers, rows)
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
