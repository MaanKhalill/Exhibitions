import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listParticipations, patchParticipation } from '../api/participations'
import { useExhibitions } from '../lib/ExhibitionContext'
import { dayLabel, fairDays, hhmm, loadSettings, scheduleDay, ymd, type ScheduledStop } from '../lib/planner'
import type { VisitStatus } from '../types'
import { Empty, Page, Spinner } from '../components/ui'

const DONE: VisitStatus[] = ['completed', 'skipped', 'cancelled']

export function TodayRoute() {
  const { current } = useExhibitions()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const days = useMemo(() => fairDays(current), [current])
  const today = ymd(new Date())
  const [day, setDay] = useState<string>('')
  const activeDay = day || (days.includes(today) ? today : days[0] || '')

  const { data: parts = [], isLoading } = useQuery({
    queryKey: ['participations', current?.id],
    queryFn: () => listParticipations(current!.id),
    enabled: Boolean(current),
  })

  const patch = useMutation({
    mutationFn: (v: { id: string; status: VisitStatus }) => patchParticipation(v.id, { visit_status: v.status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['participations', current?.id] }),
  })

  if (!current) return <Page title="Today's route"><Empty icon="📍" title="No exhibition selected" hint="Pick one from the switcher." /></Page>
  if (isLoading) return <Page title="Today's route"><Spinner /></Page>
  if (days.length === 0) return <Page title="Today's route"><Empty icon="🗓" title="Set the fair dates first" hint="Add fair start/end dates to plan days." /></Page>

  const settings = loadSettings(current.id)
  const dayParts = parts.filter((p) => p.plan_day === activeDay)
  const { stops } = scheduleDay(dayParts, activeDay, settings)
  const remaining = stops.filter((s) => !DONE.includes(s.p.visit_status))
  const now = remaining[0]
  const next = remaining[1]
  const completedCount = dayParts.filter((p) => p.visit_status === 'completed').length

  const setStatus = (id: string, status: VisitStatus) => patch.mutate({ id, status })

  return (
    <Page
      title="Today's route"
      subtitle={dayLabel(activeDay)}
      actions={<button className="iconbtn dark" aria-label="Planner" onClick={() => navigate('/planner')}>🧭</button>}
    >
      <div className="chips">
        {days.map((d) => (
          <button key={d} className={`chip ${activeDay === d ? 'active' : ''}`} onClick={() => setDay(d)}>
            {dayLabel(d)}
          </button>
        ))}
      </div>

      {dayParts.length === 0 ? (
        <Empty icon="🗓" title={`Nothing planned for ${dayLabel(activeDay)}`} hint="Plan this day in the route planner (🧭)." />
      ) : !now ? (
        <div className="detail-section" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40 }}>🎉</div>
          <p style={{ fontWeight: 600, margin: '6px 0' }}>All done for {dayLabel(activeDay)}!</p>
          <p className="hint">{completedCount} completed. Check the daily review to move anything missed.</p>
          <button className="btn" onClick={() => navigate('/daily-review')}>Daily review</button>
        </div>
      ) : (
        <>
          <div className="nowcard">
            <div className="nowtag">NOW{now.fixed ? ` · 🔒 ${hhmm(now.arrival)}` : ` · ~${hhmm(now.arrival)}`}</div>
            <h2 onClick={() => navigate(`/fair/supplier/${now.p.supplier_id}`)} style={{ margin: '4px 0', cursor: 'pointer' }}>
              {now.p.supplier.company_name}
            </h2>
            <div className="card-meta" style={{ fontSize: 15 }}>
              {now.p.hall && <span>🏛 Hall {now.p.hall}</span>}
              {now.p.booth && <span>📍 {now.p.booth}</span>}
              <span>⏱ {now.duration}m</span>
            </div>
            <div className="actions" style={{ marginTop: 12 }}>
              {now.p.supplier.phone && <a className="btn" href={`tel:${now.p.supplier.phone.replace(/\s+/g, '')}`}>📞 Call</a>}
              <button className="btn" onClick={() => setStatus(now.p.id, 'arrived')}>Arrived</button>
              <button className="btn" onClick={() => setStatus(now.p.id, 'skipped')}>Skip</button>
              <button className="btn primary" onClick={() => setStatus(now.p.id, 'completed')}>Complete</button>
            </div>
          </div>

          {next && (
            <div className="nextcard" onClick={() => navigate(`/fair/supplier/${next.p.supplier_id}`)}>
              <div className="nexttag">NEXT · ~{hhmm(next.arrival)}</div>
              <div style={{ fontWeight: 600 }}>{next.p.supplier.company_name}</div>
              <div className="card-meta">
                {next.p.hall && <span>🏛 Hall {next.p.hall}</span>}
                {next.p.booth && <span>📍 {next.p.booth}</span>}
                {next.p.hall && now.p.hall && next.p.hall !== now.p.hall && <span>🚶 hall change</span>}
              </div>
            </div>
          )}

          <h3 className="section-label" style={{ marginTop: 16 }}>Remaining · {remaining.length}</h3>
          {remaining.slice(2).map((st: ScheduledStop) => (
            <div className="card" key={st.p.id} onClick={() => navigate(`/fair/supplier/${st.p.supplier_id}`)}>
              <div className="card-head">
                <div className="name">{st.p.supplier.company_name}</div>
                <span className="badge status-skip">{st.fixed ? `🔒 ${hhmm(st.arrival)}` : `~${hhmm(st.arrival)}`}</span>
              </div>
              <div className="card-meta">
                {st.p.hall && <span>🏛 Hall {st.p.hall}</span>}
                {st.p.booth && <span>📍 {st.p.booth}</span>}
              </div>
            </div>
          ))}

          {completedCount > 0 && (
            <p className="hint" style={{ textAlign: 'center', marginTop: 12 }}>
              ✓ {completedCount} completed today · <span style={{ color: 'var(--red)', cursor: 'pointer' }} onClick={() => navigate('/daily-review')}>daily review</span>
            </p>
          )}
        </>
      )}
    </Page>
  )
}
