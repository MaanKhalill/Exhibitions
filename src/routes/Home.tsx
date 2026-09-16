import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useExhibitions } from '../lib/ExhibitionContext'
import { saveExhibition } from '../api/exhibitions'
import { listParticipations } from '../api/participations'
import { listFactories } from '../api/factories'
import { cantonFairAutumn2026 } from '../lib/defaults'
import { EXHIBITION_STATUS_LABELS } from '../types'
import { Page, Spinner } from '../components/ui'
import { formatDateRange, daysUntil } from '../lib/format'
import { buildIcs, calendarEvents, downloadIcs } from '../lib/ics'

export function Home() {
  const { exhibitions, loading, current } = useExhibitions()
  if (loading) return <Spinner />
  if (exhibitions.length === 0) return <Onboarding />
  if (!current) return <Spinner />
  return <Dashboard key={current.id} exhibitionId={current.id} />
}

function Onboarding() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { setCurrentId } = useExhibitions()
  const create = useMutation({
    mutationFn: () => saveExhibition(cantonFairAutumn2026()),
    onSuccess: (e) => {
      qc.invalidateQueries({ queryKey: ['exhibitions'] })
      setCurrentId(e.id)
    },
  })

  return (
    <div className="center-screen" style={{ minHeight: 'auto', paddingTop: 24 }}>
      <div style={{ textAlign: 'center' }}>
        <div className="logo-badge">🌏</div>
        <h1 style={{ margin: '6px 0 2px' }}>Welcome</h1>
        <p className="hint">
          This is your permanent supplier-intelligence platform. Every exhibition adds to the same
          growing knowledge base. Start with your first workspace.
        </p>
      </div>

      <div className="detail-section" style={{ marginTop: 8 }}>
        <h3>Recommended first workspace</h3>
        <p style={{ margin: '0 0 4px', fontWeight: 600 }}>Canton Fair · Autumn 2026</p>
        <p className="hint" style={{ marginTop: 0 }}>
          Guangzhou · Fair 15–19 Oct · Factory visits 20–28 Oct · prefilled and ready to edit.
        </p>
        <button className="btn primary block" disabled={create.isPending} onClick={() => create.mutate()}>
          {create.isPending ? 'Creating…' : 'Set up Canton Fair Autumn 2026'}
        </button>
      </div>

      <button className="btn ghost block" onClick={() => navigate('/exhibitions/new')}>
        Create a different exhibition
      </button>
    </div>
  )
}

function Stat({ n, label, to }: { n: number; label: string; to?: string }) {
  const inner = (
    <>
      <div className="stat-n">{n}</div>
      <div className="stat-l">{label}</div>
    </>
  )
  return to ? (
    <Link className="stat" to={to}>
      {inner}
    </Link>
  ) : (
    <div className="stat">{inner}</div>
  )
}

function Dashboard({ exhibitionId }: { exhibitionId: string }) {
  const { current } = useExhibitions()
  const navigate = useNavigate()
  const { data: parts = [], isLoading } = useQuery({
    queryKey: ['participations', exhibitionId],
    queryFn: () => listParticipations(exhibitionId),
  })
  const { data: factories = [] } = useQuery({ queryKey: ['factories'], queryFn: () => listFactories() })

  function exportCalendar() {
    if (!current) return
    const events = calendarEvents(current, parts, factories)
    if (events.length === 0) {
      alert('No confirmed meetings or scheduled factory visits yet. Set meeting times or factory-visit days first.')
      return
    }
    downloadIcs(`${current.name.replace(/\s+/g, '-').toLowerCase()}.ics`, buildIcs(events))
  }

  if (!current) return <Spinner />
  const must = parts.filter((p) => p.priority === 'must').length
  const factory = parts.filter((p) => p.factory_candidate).length
  const completed = parts.filter((p) => p.visit_status === 'completed').length
  const followUps = parts.filter((p) => p.follow_up && p.follow_up !== 'No Further Action').length
  const dLeft = daysUntil(current.start_date)

  return (
    <Page
      title={current.name}
      subtitle={[current.edition, current.city].filter(Boolean).join(' · ')}
      actions={
        <span className={`badge ex-${current.status}`}>{EXHIBITION_STATUS_LABELS[current.status]}</span>
      }
    >
      <div className="detail-section">
        <div className="kv">
          <span className="k">Fair dates</span>
          <span className="v">{formatDateRange(current.start_date, current.end_date) || '—'}</span>
        </div>
        <div className="kv">
          <span className="k">Trip</span>
          <span className="v">{formatDateRange(current.trip_start, current.trip_end) || '—'}</span>
        </div>
        {dLeft !== null && (
          <div className="kv">
            <span className="k">Countdown</span>
            <span className="v">{dLeft > 0 ? `${dLeft} days to opening` : dLeft === 0 ? 'Opens today' : 'In progress / past'}</span>
          </div>
        )}
      </div>

      {isLoading ? (
        <Spinner />
      ) : (
        <div className="statgrid">
          <Stat n={parts.length} label="Suppliers" to="/fair" />
          <Stat n={must} label="Must visit" to="/fair" />
          <Stat n={factory} label="Factory candidates" to="/factory-plan" />
          <Stat n={completed} label="Completed" to="/fair" />
          <Stat n={followUps} label="Follow-ups" to="/fair" />
        </div>
      )}

      <div className="toolbar" style={{ marginTop: 16 }}>
        <button className="btn primary" onClick={() => navigate('/fair/add')}>
          ＋ Add supplier
        </button>
        <button className="btn" onClick={() => navigate('/fair')}>
          View fair list
        </button>
      </div>
      <div className="toolbar">
        <button className="btn" onClick={() => navigate('/today')}>📍 Today's route</button>
        <button className="btn" onClick={() => navigate('/planner')}>🧭 Plan days</button>
      </div>
      <div className="toolbar">
        <button className="btn" onClick={() => navigate('/factory-plan')}>🏭 Factories</button>
        <button className="btn" onClick={exportCalendar}>📅 Calendar</button>
      </div>

      <button className="btn ghost block" onClick={() => navigate(`/exhibitions/${current.id}/edit`)}>
        Edit exhibition details
      </button>
    </Page>
  )
}
