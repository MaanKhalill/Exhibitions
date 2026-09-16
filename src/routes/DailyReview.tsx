import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listParticipations, patchParticipation } from '../api/participations'
import { useExhibitions } from '../lib/ExhibitionContext'
import { dayLabel, fairDays, nextDay, ymd } from '../lib/planner'
import { Empty, Page, Spinner } from '../components/ui'

export function DailyReview() {
  const { current } = useExhibitions()
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

  const move = useMutation({
    mutationFn: async () => {
      const tomorrow = nextDay(activeDay, days)
      if (!tomorrow) throw new Error('This is the last fair day — no next day to move to.')
      const missed = parts.filter((p) => p.plan_day === activeDay && p.visit_status !== 'completed')
      for (const p of missed) await patchParticipation(p.id, { plan_day: tomorrow, visit_status: 'planned' })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['participations', current?.id] }),
  })

  if (!current) return <Page title="Daily review"><Empty icon="🌙" title="No exhibition selected" hint="Pick one from the switcher." /></Page>
  if (isLoading) return <Page title="Daily review"><Spinner /></Page>
  if (days.length === 0) return <Page title="Daily review"><Empty icon="🗓" title="Set the fair dates first" /></Page>

  const dayParts = parts.filter((p) => p.plan_day === activeDay)
  const completed = dayParts.filter((p) => p.visit_status === 'completed').length
  const missed = dayParts.filter((p) => p.visit_status !== 'completed').length
  const discovered = dayParts.filter((p) => p.discovered_onsite).length
  const factory = dayParts.filter((p) => p.factory_candidate).length
  const followUps = dayParts.filter((p) => p.follow_up && p.follow_up !== 'No Further Action').length
  const tomorrow = nextDay(activeDay, days)

  const Stat = ({ n, label }: { n: number; label: string }) => (
    <div className="stat"><div className="stat-n">{n}</div><div className="stat-l">{label}</div></div>
  )

  return (
    <Page title="Daily review" subtitle={dayLabel(activeDay)}>
      <div className="chips">
        {days.map((d) => (
          <button key={d} className={`chip ${activeDay === d ? 'active' : ''}`} onClick={() => setDay(d)}>{dayLabel(d)}</button>
        ))}
      </div>

      {dayParts.length === 0 ? (
        <Empty icon="🗓" title={`Nothing planned for ${dayLabel(activeDay)}`} />
      ) : (
        <>
          <div className="statgrid">
            <Stat n={dayParts.length} label="Planned" />
            <Stat n={completed} label="Completed" />
            <Stat n={missed} label="Not visited" />
            <Stat n={discovered} label="Discovered" />
            <Stat n={factory} label="Factory" />
            <Stat n={followUps} label="Follow-ups" />
          </div>

          {missed > 0 && (
            <div className="detail-section" style={{ marginTop: 14 }}>
              <h3>Move missed visits</h3>
              <p className="hint" style={{ marginTop: 0 }}>
                {missed} supplier{missed === 1 ? '' : 's'} not completed on {dayLabel(activeDay)}.
                {tomorrow ? ` Move them to ${dayLabel(tomorrow)}?` : ' This is the last fair day.'}
              </p>
              <button className="btn primary block" disabled={!tomorrow || move.isPending} onClick={() => move.mutate()}>
                {move.isPending ? 'Moving…' : tomorrow ? `Move ${missed} to ${dayLabel(tomorrow)}` : 'No next day'}
              </button>
              {move.isError && <p className="error">{(move.error as Error).message}</p>}
            </div>
          )}
        </>
      )}
    </Page>
  )
}
