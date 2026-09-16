import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getExhibition, saveExhibition } from '../api/exhibitions'
import { draftExhibition } from '../lib/defaults'
import { EXHIBITION_STATUS_LABELS, type Exhibition, type ExhibitionStatus } from '../types'
import { useExhibitions } from '../lib/ExhibitionContext'
import { Field, Page, Spinner, ErrorNote } from '../components/ui'

export function ExhibitionForm({ preset }: { preset?: Exhibition }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { setCurrentId } = useExhibitions()

  const { data: existing, isLoading } = useQuery({
    queryKey: ['exhibition', id],
    queryFn: () => getExhibition(id!),
    enabled: Boolean(id),
  })

  if (id && isLoading) return <Spinner />
  return (
    <Inner
      initial={existing ?? preset ?? draftExhibition()}
      onSaved={(e) => {
        qc.invalidateQueries({ queryKey: ['exhibitions'] })
        setCurrentId(e.id)
        navigate('/')
      }}
    />
  )
}

function Inner({ initial, onSaved }: { initial: Exhibition; onSaved: (e: Exhibition) => void }) {
  const [e, setE] = useState<Exhibition>(initial)
  const set = <K extends keyof Exhibition>(k: K, v: Exhibition[K]) =>
    setE((p) => ({ ...p, [k]: v }))

  const mutation = useMutation({
    mutationFn: () => saveExhibition({ ...e, name: e.name.trim() }),
    onSuccess: onSaved,
  })

  return (
    <Page title={initial.name ? 'Edit exhibition' : 'New exhibition'} back>
      <form
        onSubmit={(ev) => {
          ev.preventDefault()
          if (!e.name.trim()) return
          mutation.mutate()
        }}
      >
        <Field label="Exhibition name *">
          <input value={e.name} onChange={(ev) => set('name', ev.target.value)} placeholder="e.g. Canton Fair" required autoFocus />
        </Field>
        <div className="row2">
          <Field label="Edition">
            <input value={e.edition} onChange={(ev) => set('edition', ev.target.value)} placeholder="Autumn 2026" />
          </Field>
          <Field label="Year">
            <input
              type="number"
              value={e.year ?? ''}
              onChange={(ev) => set('year', ev.target.value ? Number(ev.target.value) : null)}
              placeholder="2026"
            />
          </Field>
        </div>
        <div className="row2">
          <Field label="Country">
            <input value={e.country} onChange={(ev) => set('country', ev.target.value)} />
          </Field>
          <Field label="City">
            <input value={e.city} onChange={(ev) => set('city', ev.target.value)} />
          </Field>
        </div>
        <Field label="Venue">
          <input value={e.venue} onChange={(ev) => set('venue', ev.target.value)} />
        </Field>
        <Field label="Official website">
          <input value={e.website} onChange={(ev) => set('website', ev.target.value)} />
        </Field>

        <div className="row2">
          <Field label="Fair start">
            <input type="date" value={e.start_date ?? ''} onChange={(ev) => set('start_date', ev.target.value || null)} />
          </Field>
          <Field label="Fair end">
            <input type="date" value={e.end_date ?? ''} onChange={(ev) => set('end_date', ev.target.value || null)} />
          </Field>
        </div>
        <div className="row2">
          <Field label="Trip start">
            <input type="date" value={e.trip_start ?? ''} onChange={(ev) => set('trip_start', ev.target.value || null)} />
          </Field>
          <Field label="Trip end">
            <input type="date" value={e.trip_end ?? ''} onChange={(ev) => set('trip_end', ev.target.value || null)} />
          </Field>
        </div>
        <div className="row2">
          <Field label="Arrival city">
            <input value={e.arrival_city} onChange={(ev) => set('arrival_city', ev.target.value)} />
          </Field>
          <Field label="Departure city">
            <input value={e.departure_city} onChange={(ev) => set('departure_city', ev.target.value)} />
          </Field>
        </div>
        <Field label="Hotel / accommodation">
          <input value={e.hotel} onChange={(ev) => set('hotel', ev.target.value)} />
        </Field>
        <Field label="Opening hours">
          <input value={e.opening_hours} onChange={(ev) => set('opening_hours', ev.target.value)} placeholder="e.g. 09:30–18:00" />
        </Field>
        <Field label="Status">
          <select value={e.status} onChange={(ev) => set('status', ev.target.value as ExhibitionStatus)}>
            {(Object.keys(EXHIBITION_STATUS_LABELS) as ExhibitionStatus[]).map((k) => (
              <option key={k} value={k}>
                {EXHIBITION_STATUS_LABELS[k]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Internal notes">
          <textarea value={e.notes} onChange={(ev) => set('notes', ev.target.value)} />
        </Field>

        <ErrorNote error={mutation.error} />
        <div className="actions">
          <button type="button" className="btn" onClick={() => history.back()}>
            Cancel
          </button>
          <button type="submit" className="btn primary" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : 'Save exhibition'}
          </button>
        </div>
      </form>
    </Page>
  )
}
