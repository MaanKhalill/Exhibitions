import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listParticipations, patchParticipation } from '../api/participations'
import { useExhibitions } from '../lib/ExhibitionContext'
import {
  autoPlan,
  dayLabel,
  DEFAULT_SETTINGS,
  fairDays,
  hhmm,
  loadSettings,
  saveSettings,
  scheduleDay,
  type PlannerSettings,
} from '../lib/planner'
import type { ParticipationWithSupplier } from '../types'
import { Empty, Page, Spinner } from '../components/ui'

export function Planner() {
  const { current } = useExhibitions()
  const qc = useQueryClient()
  const { data: parts = [], isLoading } = useQuery({
    queryKey: ['participations', current?.id],
    queryFn: () => listParticipations(current!.id),
    enabled: Boolean(current),
  })

  const days = useMemo(() => fairDays(current), [current])
  const [tab, setTab] = useState<string>('')
  const [showSettings, setShowSettings] = useState(false)
  const [settings, setSettings] = useState<PlannerSettings>(DEFAULT_SETTINGS)
  useEffect(() => {
    if (current) setSettings(loadSettings(current.id))
  }, [current?.id])
  const activeTab = tab || days[0] || 'unscheduled'

  const invalidate = () => qc.invalidateQueries({ queryKey: ['participations', current?.id] })
  const patch = useMutation({
    mutationFn: (v: { id: string; plan_day: string | null }) => patchParticipation(v.id, { plan_day: v.plan_day }),
    onSuccess: invalidate,
  })
  const auto = useMutation({
    mutationFn: async () => {
      const a = autoPlan(unscheduled, days, settings)
      for (const x of a) await patchParticipation(x.id, { plan_day: x.day })
    },
    onSuccess: invalidate,
  })

  const unscheduled = useMemo(
    () => parts.filter((p) => !p.plan_day || !days.includes(p.plan_day)),
    [parts, days],
  )

  if (!current) {
    return (
      <Page title="Route planner">
        <Empty icon="🧭" title="No exhibition selected" hint="Pick one from the switcher above." />
      </Page>
    )
  }
  if (isLoading) return <Page title="Route planner"><Spinner /></Page>

  const setS = <K extends keyof PlannerSettings>(k: K, v: PlannerSettings[K]) => {
    const next = { ...settings, [k]: v }
    setSettings(next)
    saveSettings(current.id, next)
  }

  const dayMover = (p: ParticipationWithSupplier) => (
    <select
      value={days.includes(p.plan_day || '') ? (p.plan_day as string) : ''}
      onChange={(e) => patch.mutate({ id: p.id, plan_day: e.target.value || null })}
      onClick={(e) => e.stopPropagation()}
    >
      <option value="">Unscheduled</option>
      {days.map((d) => (
        <option key={d} value={d}>{dayLabel(d)}</option>
      ))}
    </select>
  )

  return (
    <Page
      title="Booth route planner"
      subtitle={`${current.name}${current.edition ? ' · ' + current.edition : ''}`}
      actions={
        <Link className="iconbtn dark" to="/today" aria-label="Today's route">📍</Link>
      }
    >
      {days.length === 0 ? (
        <Empty
          icon="🗓"
          title="Set the fair dates first"
          hint="Add a fair start and end date to the exhibition, then the planner can lay out each day."
        />
      ) : (
        <>
          <div className="toolbar" style={{ marginBottom: 10 }}>
            <button className="btn primary" onClick={() => auto.mutate()} disabled={auto.isPending}>
              {auto.isPending ? 'Planning…' : '✨ Auto-plan by hall'}
            </button>
            <button className="btn" onClick={() => setShowSettings((v) => !v)}>⚙ Settings</button>
          </div>

          {showSettings && (
            <div className="detail-section">
              <h3>Planner settings</h3>
              <div className="row2">
                <label className="mini">Default visit (min)
                  <input type="number" value={settings.visitMin} onChange={(e) => setS('visitMin', Number(e.target.value) || 0)} />
                </label>
                <label className="mini">Walking buffer (min)
                  <input type="number" value={settings.walkMin} onChange={(e) => setS('walkMin', Number(e.target.value) || 0)} />
                </label>
              </div>
              <div className="row2">
                <label className="mini">Day starts
                  <input type="time" value={settings.dayStart} onChange={(e) => setS('dayStart', e.target.value)} />
                </label>
                <label className="mini">Hours / day
                  <input type="number" value={settings.dayHours} onChange={(e) => setS('dayHours', Number(e.target.value) || 0)} />
                </label>
              </div>
              <label className="mini">Reserve for discovering new suppliers: {settings.openPct}%
                <input type="range" min={0} max={70} value={settings.openPct} onChange={(e) => setS('openPct', Number(e.target.value))} />
              </label>
            </div>
          )}

          <div className="chips">
            {days.map((d) => {
              const n = parts.filter((p) => p.plan_day === d).length
              return (
                <button key={d} className={`chip ${activeTab === d ? 'active' : ''}`} onClick={() => setTab(d)}>
                  {dayLabel(d)}{n > 0 ? ` · ${n}` : ''}
                </button>
              )
            })}
            <button className={`chip ${activeTab === 'unscheduled' ? 'active' : ''}`} onClick={() => setTab('unscheduled')}>
              Unscheduled · {unscheduled.length}
            </button>
          </div>

          {activeTab === 'unscheduled' ? (
            <UnscheduledView list={unscheduled} dayMover={dayMover} />
          ) : (
            <DayView day={activeTab} parts={parts.filter((p) => p.plan_day === activeTab)} settings={settings} dayMover={dayMover} />
          )}
        </>
      )}
    </Page>
  )
}

function UnscheduledView({
  list,
  dayMover,
}: {
  list: ParticipationWithSupplier[]
  dayMover: (p: ParticipationWithSupplier) => React.ReactNode
}) {
  if (list.length === 0) return <Empty icon="✅" title="Everything is scheduled" hint="Every supplier has a day. Nice." />
  return (
    <>
      <p className="hint">Assign each to a day, or use ✨ Auto-plan. Factory-only leads (no booth) can stay here.</p>
      {list.map((p) => (
        <div className="card" key={p.id} style={{ cursor: 'default' }}>
          <div className="card-head"><div className="name">{p.supplier.company_name}</div></div>
          <div className="card-meta">
            {p.hall && <span>🏛 {p.hall}</span>}
            {p.booth && <span>📍 {p.booth}</span>}
            {p.factory_candidate && <span>🏭 factory</span>}
            {!p.hall && !p.booth && <span>no booth</span>}
          </div>
          <div style={{ marginTop: 8 }}>{dayMover(p)}</div>
        </div>
      ))}
    </>
  )
}

function DayView({
  day,
  parts,
  settings,
  dayMover,
}: {
  day: string
  parts: ParticipationWithSupplier[]
  settings: PlannerSettings
  dayMover: (p: ParticipationWithSupplier) => React.ReactNode
}) {
  const { stops, loadMin, capacityMin } = scheduleDay(parts, day, settings)
  if (parts.length === 0) return <Empty icon="🗓" title={`Nothing planned for ${dayLabel(day)}`} hint="Assign suppliers from the Unscheduled tab or Auto-plan." />
  const pct = Math.min(100, Math.round((loadMin / Math.max(1, capacityMin)) * 100))
  const over = loadMin > capacityMin
  return (
    <>
      <div className="detail-section" style={{ padding: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
          <span className="muted">Booked {Math.round(loadMin / 60 * 10) / 10}h of {Math.round(capacityMin / 60 * 10) / 10}h</span>
          <span className={over ? 'error' : 'muted'}>{over ? 'Over capacity' : `${100 - pct}% free for discoveries`}</span>
        </div>
        <div className="capbar"><div className="capbar-fill" style={{ width: `${pct}%`, background: over ? 'var(--red)' : 'var(--green)' }} /></div>
      </div>

      {stops.map((st) => (
        <div className="card" key={st.p.id} style={{ cursor: 'default' }}>
          <div className="card-head">
            <div className="name">{st.p.supplier.company_name}</div>
            <span className={`badge ${st.fixed ? 'status-sample' : 'status-skip'}`}>
              {st.fixed ? `🔒 ${hhmm(st.arrival)}` : `~${hhmm(st.arrival)}`}
            </span>
          </div>
          <div className="card-meta">
            {st.p.hall && <span>🏛 Hall {st.p.hall}</span>}
            {st.p.booth && <span>📍 {st.p.booth}</span>}
            <span>⏱ {st.duration}m</span>
            {st.p.priority === 'must' && <span>Must</span>}
          </div>
          <div style={{ marginTop: 8 }}>{dayMover(st.p)}</div>
        </div>
      ))}
    </>
  )
}
