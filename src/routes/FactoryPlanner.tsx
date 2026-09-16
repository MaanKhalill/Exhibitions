import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listParticipations } from '../api/participations'
import { listFactories, saveFactory } from '../api/factories'
import { useExhibitions } from '../lib/ExhibitionContext'
import { draftFactory } from '../lib/defaults'
import { dayLabel } from '../lib/planner'
import {
  bestTransport,
  candidateRisks,
  cityOf,
  clusterByCity,
  factoryDays,
  fmtHours,
  mapsEmbedUrl,
  mapsSearchUrl,
  modeLabel,
} from '../lib/factoryPlan'
import {
  PRIORITY_LABELS,
  VISIT_POSSIBLE_LABELS,
  type Factory,
  type FactoryCandidate,
  type Priority,
  type VisitPossible,
} from '../types'
import { Empty, Field, Page, Spinner } from '../components/ui'

export function FactoryPlanner() {
  const { current } = useExhibitions()
  const qc = useQueryClient()
  const [view, setView] = useState<'cities' | 'days'>('cities')
  const [dayTab, setDayTab] = useState<string>('')
  const [editing, setEditing] = useState<FactoryCandidate | null>(null)

  const { data: parts = [], isLoading: lp } = useQuery({
    queryKey: ['participations', current?.id],
    queryFn: () => listParticipations(current!.id),
    enabled: Boolean(current),
  })
  const { data: factories = [], isLoading: lf } = useQuery({
    queryKey: ['factories'],
    queryFn: () => listFactories(),
    enabled: Boolean(current),
  })

  const days = useMemo(() => factoryDays(current), [current])
  const lastDay = days[days.length - 1] ?? null

  const candidates: FactoryCandidate[] = useMemo(
    () =>
      parts
        .filter((p) => p.factory_candidate)
        .map((p) => ({
          supplier: p.supplier,
          participation: p,
          factory: factories.find((f) => f.supplier_id === p.supplier_id) ?? null,
        })),
    [parts, factories],
  )

  const saveMut = useMutation({
    mutationFn: (f: Factory) => saveFactory(f),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['factories'] }),
  })

  const assignDay = (cand: FactoryCandidate, day: string | null) => {
    const base = cand.factory ?? draftFactory(cand.supplier.id, {
      city: cand.supplier.city,
      contact_name: cand.participation.booth_contact_name,
      contact_phone: cand.participation.booth_contact_phone,
    })
    saveMut.mutate({ ...base, plan_day: day })
  }

  if (!current) return <Page title="Factory planner"><Empty icon="🗺" title="No exhibition selected" hint="Pick one from the switcher." /></Page>
  if (lp || lf) return <Page title="Factory planner"><Spinner /></Page>

  const risky = candidates.filter((c) => candidateRisks(c, lastDay).length > 0)

  const dayMover = (cand: FactoryCandidate) => (
    <select
      value={days.includes(cand.factory?.plan_day || '') ? (cand.factory!.plan_day as string) : ''}
      onChange={(e) => assignDay(cand, e.target.value || null)}
      onClick={(e) => e.stopPropagation()}
    >
      <option value="">Unscheduled</option>
      {days.map((d) => <option key={d} value={d}>{dayLabel(d)}</option>)}
    </select>
  )

  const activeDay = dayTab || days[0] || ''

  return (
    <Page
      title="Factory candidates & map"
      subtitle={`${candidates.length} factory-visit lead${candidates.length === 1 ? '' : 's'}`}
      actions={
        <button className="iconbtn dark" onClick={() => setView(view === 'cities' ? 'days' : 'cities')}>
          {view === 'cities' ? '🗓' : '📍'}
        </button>
      }
    >
      {candidates.length === 0 ? (
        <Empty icon="🏭" title="No factory candidates yet" hint="Mark suppliers as factory-visit candidates (in a supplier's fair page), and they appear here to plan the multi-city trip." />
      ) : (
        <>
          {days.length === 0 && (
            <p className="hint">Set the trip end date on the exhibition to schedule factory‑visit days.</p>
          )}
          {risky.length > 0 && (
            <div className="dupe" style={{ background: '#fdecea', borderColor: '#f5b5ae' }}>
              <div className="dupe-title">⚠️ {risky.length} risk{risky.length === 1 ? '' : 's'} to review</div>
              <div className="hint">Unverified locations or a far city on the last day before your Guangzhou departure. Open each to fix.</div>
            </div>
          )}

          {view === 'cities' ? (
            clusterByCity(candidates).map((cl) => (
              <div key={cl.city} className="detail-section" style={{ padding: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <h3 style={{ margin: 0, flex: 1 }}>📍 {cl.city} · {cl.items.length}</h3>
                  {cl.prd && <span className="badge status-ordered">near Guangzhou</span>}
                </div>
                {cl.items.map((c) => (
                  <CandidateRow key={c.supplier.id} cand={c} lastDay={lastDay} onEdit={() => setEditing(c)} dayMover={dayMover} />
                ))}
              </div>
            ))
          ) : (
            <>
              <div className="chips">
                {days.map((d) => (
                  <button key={d} className={`chip ${activeDay === d ? 'active' : ''}`} onClick={() => setDayTab(d)}>
                    {dayLabel(d)}{d === lastDay ? ' ✈' : ''}
                  </button>
                ))}
                <button className={`chip ${activeDay === 'unscheduled' ? 'active' : ''}`} onClick={() => setDayTab('unscheduled')}>
                  Unscheduled
                </button>
              </div>
              {activeDay === lastDay && (
                <p className="hint">✈ Last factory day before departure — keep this near Guangzhou (Pearl River Delta).</p>
              )}
              {(activeDay === 'unscheduled'
                ? candidates.filter((c) => !c.factory?.plan_day || !days.includes(c.factory.plan_day))
                : candidates.filter((c) => c.factory?.plan_day === activeDay)
              ).map((c) => (
                <CandidateRow key={c.supplier.id} cand={c} lastDay={lastDay} onEdit={() => setEditing(c)} dayMover={dayMover} />
              ))}
            </>
          )}
        </>
      )}

      {editing && (
        <FactoryEditor
          cand={editing}
          days={days}
          onClose={() => setEditing(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ['factories'] })
            setEditing(null)
          }}
        />
      )}
    </Page>
  )
}

function CandidateRow({
  cand,
  lastDay,
  onEdit,
  dayMover,
}: {
  cand: FactoryCandidate
  lastDay: string | null
  onEdit: () => void
  dayMover: (c: FactoryCandidate) => React.ReactNode
}) {
  const f = cand.factory
  const best = bestTransport(f)
  const risks = candidateRisks(cand, lastDay)
  return (
    <div className="card" style={{ cursor: 'default' }}>
      <div className="card-head">
        <div className="name">{cand.supplier.company_name}</div>
        <span className={`badge ${f?.verified === 'verified' ? 'status-ordered' : 'status-quote'}`}>
          {f?.verified === 'verified' ? '✓ verified' : 'verify'}
        </span>
      </div>
      <div className="card-meta">
        <span>📍 {cityOf(cand)}</span>
        {f?.visit_possible && f.visit_possible !== 'tbc' && <span>{VISIT_POSSIBLE_LABELS[f.visit_possible]}</span>}
        {best && <span>🚄 {modeLabel(best.mode)} {fmtHours(best.min)}</span>}
        {f?.nearest_rail && <span>🚉 {f.nearest_rail}</span>}
      </div>
      {risks.length > 0 && <div className="hint" style={{ color: 'var(--red)' }}>⚠️ {risks.join(' · ')}</div>}
      <div className="actions" style={{ marginTop: 8 }}>
        <div style={{ flex: 1 }}>{dayMover(cand)}</div>
        <a className="btn" href={mapsSearchUrl(cand)} target="_blank" rel="noreferrer">🗺 Map</a>
        <button className="btn primary" onClick={onEdit}>Edit</button>
      </div>
    </div>
  )
}

function numOrNull(v: string): number | null {
  if (v.trim() === '') return null
  const n = Number(v)
  return isNaN(n) ? null : n
}

function FactoryEditor({
  cand,
  days,
  onClose,
  onSaved,
}: {
  cand: FactoryCandidate
  days: string[]
  onClose: () => void
  onSaved: () => void
}) {
  const [f, setF] = useState<Factory>(
    cand.factory ??
      draftFactory(cand.supplier.id, {
        city: cand.supplier.city,
        address: cand.supplier.address,
        contact_name: cand.participation.booth_contact_name,
        contact_phone: cand.participation.booth_contact_phone,
      }),
  )
  const set = <K extends keyof Factory>(k: K, v: Factory[K]) => setF((p) => ({ ...p, [k]: v }))
  const save = useMutation({ mutationFn: () => saveFactory(f), onSuccess: onSaved })
  const best = bestTransport(f)

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h3>{cand.supplier.company_name} — factory</h3>

        <div className="row2">
          <Field label="City"><input value={f.city} onChange={(e) => set('city', e.target.value)} /></Field>
          <Field label="Province"><input value={f.province} onChange={(e) => set('province', e.target.value)} /></Field>
        </div>
        <Field label="Address"><textarea value={f.address} onChange={(e) => set('address', e.target.value)} /></Field>

        <iframe
          title="map"
          src={mapsEmbedUrl(cand)}
          loading="lazy"
          style={{ width: '100%', height: 180, border: 0, borderRadius: 12, marginBottom: 12 }}
        />

        <div className="row2">
          <Field label="Latitude"><input inputMode="decimal" value={f.lat ?? ''} onChange={(e) => set('lat', numOrNull(e.target.value))} /></Field>
          <Field label="Longitude"><input inputMode="decimal" value={f.lng ?? ''} onChange={(e) => set('lng', numOrNull(e.target.value))} /></Field>
        </div>

        <div className="row2">
          <Field label="Nearest airport"><input value={f.nearest_airport} onChange={(e) => set('nearest_airport', e.target.value)} /></Field>
          <Field label="Nearest rail station"><input value={f.nearest_rail} onChange={(e) => set('nearest_rail', e.target.value)} /></Field>
        </div>

        <h3 style={{ marginTop: 8 }}>Door-to-door from Guangzhou (minutes)</h3>
        <div className="row3">
          <Field label="By rail"><input inputMode="numeric" value={f.door_rail_min ?? ''} onChange={(e) => set('door_rail_min', numOrNull(e.target.value))} /></Field>
          <Field label="By flight"><input inputMode="numeric" value={f.door_air_min ?? ''} onChange={(e) => set('door_air_min', numOrNull(e.target.value))} /></Field>
          <Field label="By car"><input inputMode="numeric" value={f.door_car_min ?? ''} onChange={(e) => set('door_car_min', numOrNull(e.target.value))} /></Field>
        </div>
        {best && <p className="hint">Fastest: <b>{modeLabel(best.mode)}</b> ≈ {fmtHours(best.min)} door‑to‑door.</p>}

        <div className="row2">
          <Field label="Visit possible?">
            <select value={f.visit_possible} onChange={(e) => set('visit_possible', e.target.value as VisitPossible)}>
              {(Object.keys(VISIT_POSSIBLE_LABELS) as VisitPossible[]).map((k) => <option key={k} value={k}>{VISIT_POSSIBLE_LABELS[k]}</option>)}
            </select>
          </Field>
          <Field label="Location">
            <select value={f.verified} onChange={(e) => set('verified', e.target.value as Factory['verified'])}>
              <option value="needs">Needs verification</option>
              <option value="verified">Verified</option>
            </select>
          </Field>
        </div>

        <div className="row2">
          <Field label="Visit day">
            <select value={days.includes(f.plan_day || '') ? (f.plan_day as string) : ''} onChange={(e) => set('plan_day', e.target.value || null)}>
              <option value="">Unscheduled</option>
              {days.map((d) => <option key={d} value={d}>{dayLabel(d)}</option>)}
            </select>
          </Field>
          <Field label="Priority">
            <select value={f.priority} onChange={(e) => set('priority', e.target.value as Priority)}>
              {(Object.keys(PRIORITY_LABELS) as Priority[]).map((k) => <option key={k} value={k}>{PRIORITY_LABELS[k]}</option>)}
            </select>
          </Field>
        </div>

        <div className="row2">
          <Field label="Working hours"><input value={f.working_hours} onChange={(e) => set('working_hours', e.target.value)} /></Field>
          <Field label="Weekend"><input value={f.weekend} onChange={(e) => set('weekend', e.target.value)} placeholder="e.g. Sat only" /></Field>
        </div>
        <div className="row2">
          <Field label="Contact"><input value={f.contact_name} onChange={(e) => set('contact_name', e.target.value)} /></Field>
          <Field label="Contact phone"><input value={f.contact_phone} onChange={(e) => set('contact_phone', e.target.value)} /></Field>
        </div>
        <Field label="Notes"><textarea value={f.notes} onChange={(e) => set('notes', e.target.value)} /></Field>

        <div className="actions">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save factory'}
          </button>
        </div>
      </div>
    </div>
  )
}
