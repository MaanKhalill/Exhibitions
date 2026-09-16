import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listAllParticipations } from '../api/participations'
import { listAllContacts } from '../api/contacts'
import { useExhibitions } from '../lib/ExhibitionContext'
import { Empty, Page, Spinner } from '../components/ui'

export function Analytics() {
  const { exhibitions } = useExhibitions()
  const { data: parts = [], isLoading } = useQuery({ queryKey: ['all-participations'], queryFn: () => listAllParticipations() })
  const { data: contacts = [] } = useQuery({ queryKey: ['all-contacts'], queryFn: () => listAllContacts() })

  const rows = useMemo(() => {
    return exhibitions.map((e) => {
      const p = parts.filter((x) => x.exhibition_id === e.id)
      return {
        e,
        suppliers: p.length,
        must: p.filter((x) => x.priority === 'must').length,
        completed: p.filter((x) => x.visit_status === 'completed').length,
        discovered: p.filter((x) => x.discovered_onsite).length,
        factory: p.filter((x) => x.factory_candidate).length,
        followUps: p.filter((x) => x.follow_up && x.follow_up !== 'No Further Action').length,
      }
    })
  }, [exhibitions, parts])

  const totalSuppliers = new Set(parts.map((p) => p.supplier_id)).size

  if (isLoading) return <Page title="Analytics"><Spinner /></Page>

  return (
    <Page title="Analytics" subtitle="Across all exhibitions">
      {exhibitions.length === 0 ? (
        <Empty icon="📊" title="No data yet" hint="Metrics appear as you add exhibitions and suppliers." />
      ) : (
        <>
          <div className="statgrid" style={{ marginBottom: 16 }}>
            <div className="stat"><div className="stat-n">{exhibitions.length}</div><div className="stat-l">Exhibitions</div></div>
            <div className="stat"><div className="stat-n">{totalSuppliers}</div><div className="stat-l">Suppliers</div></div>
            <div className="stat"><div className="stat-n">{contacts.length}</div><div className="stat-l">Contacts</div></div>
            <div className="stat"><div className="stat-n">{parts.filter((p) => p.visit_status === 'completed').length}</div><div className="stat-l">Meetings done</div></div>
            <div className="stat"><div className="stat-n">{parts.filter((p) => p.factory_candidate).length}</div><div className="stat-l">Factory leads</div></div>
            <div className="stat"><div className="stat-n">{parts.filter((p) => p.follow_up && p.follow_up !== 'No Further Action').length}</div><div className="stat-l">Follow-ups</div></div>
          </div>

          {rows.map(({ e, suppliers, must, completed, discovered, factory, followUps }) => (
            <div key={e.id} className="detail-section" style={{ padding: 14 }}>
              <h3 style={{ margin: '0 0 10px' }}>{e.name}{e.edition ? ` · ${e.edition}` : ''}</h3>
              <div className="analytics-grid">
                <span>Suppliers<b>{suppliers}</b></span>
                <span>Must visit<b>{must}</b></span>
                <span>Completed<b>{completed}</b></span>
                <span>Discovered<b>{discovered}</b></span>
                <span>Factory<b>{factory}</b></span>
                <span>Follow-ups<b>{followUps}</b></span>
              </div>
            </div>
          ))}
        </>
      )}
    </Page>
  )
}
