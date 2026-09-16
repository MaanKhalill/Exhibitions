import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getParticipation, saveParticipation, deleteParticipation } from '../api/participations'
import { getSupplier } from '../api/suppliers'
import { draftParticipation } from '../lib/defaults'
import { useExhibitions } from '../lib/ExhibitionContext'
import {
  FOLLOW_UP_OPTIONS,
  INTEREST_LABELS,
  PRIORITY_LABELS,
  VISIT_STATUS_LABELS,
  type InterestLevel,
  type Participation,
  type Priority,
  type VisitStatus,
} from '../types'
import { Field, Page, Spinner, ErrorNote } from '../components/ui'
import { Stars } from '../components/Stars'

function toLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}
function fromLocalInput(v: string): string | null {
  if (!v) return null
  const d = new Date(v)
  return isNaN(d.getTime()) ? null : d.toISOString()
}

export function FairSupplierDetail() {
  const { supplierId } = useParams()
  const { current } = useExhibitions()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: supplier } = useQuery({
    queryKey: ['supplier', supplierId],
    queryFn: () => getSupplier(supplierId!),
    enabled: Boolean(supplierId),
  })
  const { data: existing, isLoading } = useQuery({
    queryKey: ['participation', current?.id, supplierId],
    queryFn: () => getParticipation(current!.id, supplierId!),
    enabled: Boolean(current && supplierId),
  })

  const [p, setP] = useState<Participation | null>(null)
  useEffect(() => {
    if (!current || !supplierId) return
    setP(existing ?? draftParticipation(current.id, supplierId))
  }, [existing, current, supplierId])

  const save = useMutation({
    mutationFn: (row: Participation) => saveParticipation(row),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['participations', current?.id] })
      qc.invalidateQueries({ queryKey: ['participation', current?.id, supplierId] })
    },
  })
  const del = useMutation({
    mutationFn: () => deleteParticipation(existing!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['participations', current?.id] })
      navigate('/fair', { replace: true })
    },
  })

  if (!current) return <Page title="Supplier" back><p className="hint">No exhibition selected.</p></Page>
  if (isLoading || !p) return <Spinner />

  const set = <K extends keyof Participation>(k: K, v: Participation[K]) =>
    setP((prev) => (prev ? { ...prev, [k]: v } : prev))
  const quickStatus = (status: VisitStatus) => {
    const next = { ...p, visit_status: status }
    setP(next)
    save.mutate(next)
  }

  return (
    <Page
      title={supplier?.company_name || 'Supplier'}
      subtitle={supplier ? undefined : 'Loading…'}
      back
      actions={
        supplier && (
          <Link className="iconbtn dark" to={`/suppliers/${supplier.id}`} aria-label="Global record">
            🗂
          </Link>
        )
      }
    >
      <div className="actions" style={{ marginBottom: 12 }}>
        {supplier?.phone && <a className="btn" href={`tel:${supplier.phone.replace(/\s+/g, '')}`}>📞</a>}
        <button className="btn" onClick={() => quickStatus('arrived')}>Arrived</button>
        <button className="btn primary" onClick={() => quickStatus('completed')}>Complete</button>
        <button className="btn" onClick={() => quickStatus('skipped')}>Skip</button>
      </div>

      <div className="detail-section">
        <h3>Booth</h3>
        <div className="row2">
          <Field label="Hall">
            <input value={p.hall} onChange={(e) => set('hall', e.target.value)} />
          </Field>
          <Field label="Booth">
            <input value={p.booth_raw || p.booth} onChange={(e) => { set('booth_raw', e.target.value); set('booth', e.target.value) }} />
          </Field>
        </div>
        <div className="row2">
          <Field label="Floor">
            <input value={p.floor} onChange={(e) => set('floor', e.target.value)} />
          </Field>
          <Field label="Area / section">
            <input value={p.area} onChange={(e) => set('area', e.target.value)} />
          </Field>
        </div>
        <Field label="Products shown (free text)">
          <textarea value={p.products_shown} onChange={(e) => set('products_shown', e.target.value)} />
        </Field>
      </div>

      <div className="detail-section">
        <h3>Meeting</h3>
        <div className="row2">
          <Field label="Preferred">
            <input type="datetime-local" value={toLocalInput(p.preferred_meeting)} onChange={(e) => set('preferred_meeting', fromLocalInput(e.target.value))} />
          </Field>
          <Field label="Confirmed">
            <input type="datetime-local" value={toLocalInput(p.confirmed_meeting)} onChange={(e) => set('confirmed_meeting', fromLocalInput(e.target.value))} />
          </Field>
        </div>
        <div className="row2">
          <Field label="Duration (min)">
            <input type="number" value={p.expected_duration_min} onChange={(e) => set('expected_duration_min', Number(e.target.value) || 0)} />
          </Field>
          <label className="checkrow" style={{ alignSelf: 'end', paddingBottom: 12 }}>
            <input type="checkbox" checked={p.meeting_fixed} onChange={(e) => set('meeting_fixed', e.target.checked)} />
            <span>Fixed appointment</span>
          </label>
        </div>
      </div>

      <div className="detail-section">
        <h3>Priority & status</h3>
        <div className="row2">
          <Field label="Priority">
            <select value={p.priority} onChange={(e) => set('priority', e.target.value as Priority)}>
              {(Object.keys(PRIORITY_LABELS) as Priority[]).map((k) => <option key={k} value={k}>{PRIORITY_LABELS[k]}</option>)}
            </select>
          </Field>
          <Field label="Visit status">
            <select value={p.visit_status} onChange={(e) => set('visit_status', e.target.value as VisitStatus)}>
              {(Object.keys(VISIT_STATUS_LABELS) as VisitStatus[]).map((k) => <option key={k} value={k}>{VISIT_STATUS_LABELS[k]}</option>)}
            </select>
          </Field>
        </div>
      </div>

      <div className="detail-section">
        <h3>Evaluation</h3>
        <Field label="Interest level">
          <select value={p.interest_level ?? ''} onChange={(e) => set('interest_level', (e.target.value || null) as InterestLevel | null)}>
            <option value="">—</option>
            {(Object.keys(INTEREST_LABELS) as InterestLevel[]).map((k) => <option key={k} value={k}>{INTEREST_LABELS[k]}</option>)}
          </select>
        </Field>
        <Field label="Rating">
          <Stars value={p.rating} onChange={(v) => set('rating', v)} />
        </Field>
        <Field label="Follow-up">
          <select value={p.follow_up} onChange={(e) => set('follow_up', e.target.value)}>
            <option value="">—</option>
            {FOLLOW_UP_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </Field>
        <label className="checkrow">
          <input type="checkbox" checked={p.factory_candidate} onChange={(e) => set('factory_candidate', e.target.checked)} />
          <span>Factory-visit candidate</span>
        </label>
        <Field label="Notes">
          <textarea value={p.notes} onChange={(e) => set('notes', e.target.value)} />
        </Field>
      </div>

      <ErrorNote error={save.error} />
      <div className="actions">
        <button className="btn primary block" onClick={() => save.mutate(p)} disabled={save.isPending}>
          {save.isPending ? 'Saving…' : save.isSuccess ? 'Saved ✓' : 'Save'}
        </button>
      </div>
      {existing && (
        <button
          className="btn danger block"
          style={{ marginTop: 10 }}
          onClick={() => { if (confirm('Remove this supplier from this exhibition? The global supplier record stays.')) del.mutate() }}
        >
          Remove from this exhibition
        </button>
      )}
    </Page>
  )
}
