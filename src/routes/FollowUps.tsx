import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listAllParticipations, patchParticipation } from '../api/participations'
import { FOLLOW_UP_OPTIONS, type ParticipationWithContext } from '../types'
import { Empty, Page, Spinner } from '../components/ui'

const OPEN = (f: string) => f && f !== 'No Further Action'

export function FollowUps() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data = [], isLoading } = useQuery({ queryKey: ['all-participations'], queryFn: () => listAllParticipations() })

  const patch = useMutation({
    mutationFn: (v: { id: string; follow_up: string }) => patchParticipation(v.id, { follow_up: v.follow_up }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['all-participations'] }),
  })

  const groups = useMemo(() => {
    const open = data.filter((p) => OPEN(p.follow_up))
    const map = new Map<string, ParticipationWithContext[]>()
    for (const p of open) {
      const arr = map.get(p.follow_up) || []
      arr.push(p)
      map.set(p.follow_up, arr)
    }
    return Array.from(map.entries())
  }, [data])

  const total = groups.reduce((n, [, arr]) => n + arr.length, 0)

  return (
    <Page title="Follow-ups" subtitle="Open commercial actions">
      {isLoading ? (
        <Spinner />
      ) : total === 0 ? (
        <Empty icon="✅" title="No open follow-ups" hint="Set a follow-up on a supplier (Request quotation, Samples, Factory visit…) and it shows here across all exhibitions." />
      ) : (
        groups.map(([type, items]) => (
          <div key={type}>
            <h3 className="section-label">{type} · {items.length}</h3>
            {items.map((p) => (
              <div key={p.id} className="card" style={{ cursor: 'default' }}>
                <div className="card-head" onClick={() => navigate(`/suppliers/${p.supplier_id}`)} style={{ cursor: 'pointer' }}>
                  <div className="name">{p.supplier.company_name}</div>
                  {p.rating > 0 && <span className="stars">{'★'.repeat(p.rating)}</span>}
                </div>
                <div className="card-meta">
                  {p.exhibition && <span className="badge status-sample">{p.exhibition.name}{p.exhibition.edition ? ` · ${p.exhibition.edition}` : ''}</span>}
                  {p.hall && <span>🏛 {p.hall}</span>}
                  {p.factory_candidate && <span>🏭</span>}
                </div>
                <div className="actions" style={{ marginTop: 8 }}>
                  <select value={p.follow_up} onChange={(e) => patch.mutate({ id: p.id, follow_up: e.target.value })} style={{ flex: 1 }}>
                    {FOLLOW_UP_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                  <button className="btn" onClick={() => patch.mutate({ id: p.id, follow_up: 'No Further Action' })}>Done</button>
                </div>
              </div>
            ))}
          </div>
        ))
      )}
    </Page>
  )
}
