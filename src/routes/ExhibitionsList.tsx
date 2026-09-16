import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { listExhibitions } from '../api/exhibitions'
import { useExhibitions } from '../lib/ExhibitionContext'
import { EXHIBITION_STATUS_LABELS } from '../types'
import { Empty, Page, Spinner } from '../components/ui'
import { formatDateRange } from '../lib/format'

export function ExhibitionsList() {
  const navigate = useNavigate()
  const { current, setCurrentId } = useExhibitions()
  const { data, isLoading } = useQuery({ queryKey: ['exhibitions'], queryFn: () => listExhibitions() })
  const exhibitions = data ?? []

  return (
    <Page
      title="Exhibitions"
      subtitle="Your workspaces"
      actions={
        <button className="iconbtn dark" aria-label="New exhibition" onClick={() => navigate('/exhibitions/new')}>
          ＋
        </button>
      }
    >
      {isLoading ? (
        <Spinner />
      ) : exhibitions.length === 0 ? (
        <Empty icon="🗓" title="No exhibitions yet" hint="Create your first workspace to start planning." />
      ) : (
        exhibitions.map((e) => (
          <div
            key={e.id}
            className={`card ${current?.id === e.id ? 'selected' : ''}`}
            onClick={() => {
              setCurrentId(e.id)
              navigate('/')
            }}
          >
            <div className="card-head">
              <div className="name">
                {e.name} {e.edition && <span className="muted">· {e.edition}</span>}
              </div>
              <span className={`badge ex-${e.status}`}>{EXHIBITION_STATUS_LABELS[e.status]}</span>
            </div>
            <div className="card-meta">
              {(e.city || e.country) && <span>📍 {[e.city, e.country].filter(Boolean).join(', ')}</span>}
              {formatDateRange(e.start_date, e.end_date) && <span>🗓 {formatDateRange(e.start_date, e.end_date)}</span>}
            </div>
            <div className="actions" style={{ marginTop: 10 }}>
              <button
                className="btn"
                onClick={(ev) => {
                  ev.stopPropagation()
                  navigate(`/exhibitions/${e.id}/edit`)
                }}
              >
                Edit
              </button>
              {current?.id === e.id ? (
                <button className="btn" disabled>
                  Current
                </button>
              ) : (
                <button
                  className="btn primary"
                  onClick={(ev) => {
                    ev.stopPropagation()
                    setCurrentId(e.id)
                    navigate('/')
                  }}
                >
                  Open
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </Page>
  )
}
