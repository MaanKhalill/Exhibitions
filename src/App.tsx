import { lazy, Suspense, useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { isConfigured, supabase } from './lib/supabase'
import { DEMO } from './lib/demo'
import { ExhibitionProvider } from './lib/ExhibitionContext'
import { Layout } from './components/Layout'
import { Auth } from './components/Auth'
import { SetupNeeded } from './components/SetupNeeded'
import { Spinner } from './components/ui'
import { Home } from './routes/Home'
import { ExhibitionsList } from './routes/ExhibitionsList'
import { ExhibitionForm } from './routes/ExhibitionForm'
import { SuppliersList } from './routes/SuppliersList'
import { SupplierForm } from './routes/SupplierForm'
import { SupplierDetail } from './routes/SupplierDetail'
import { FairSuppliers } from './routes/FairSuppliers'
import { AddToFair } from './routes/AddToFair'
import { FairSupplierDetail } from './routes/FairSupplierDetail'
import { More } from './routes/More'
import { Placeholder } from './routes/Placeholder'
import { InvitationsList } from './routes/InvitationsList'
import { InvitationForm } from './routes/InvitationForm'
import { InvitationDetail } from './routes/InvitationDetail'
import { PublicInvite } from './routes/PublicInvite'
import { Planner } from './routes/Planner'
import { TodayRoute } from './routes/TodayRoute'
import { DailyReview } from './routes/DailyReview'
import { FactoryPlanner } from './routes/FactoryPlanner'
import { Search } from './routes/Search'
import { Contacts } from './routes/Contacts'
import { FollowUps } from './routes/FollowUps'
import { Analytics } from './routes/Analytics'
import { ProfilePage } from './routes/ProfilePage'

const ScanScreen = lazy(() => import('./routes/ScanScreen').then((m) => ({ default: m.ScanScreen })))

export default function App() {
  const location = useLocation()
  const isPublic = location.pathname.startsWith('/invite/')
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!isConfigured) {
      setReady(true)
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  // Public supplier form — no login, rendered before the auth gate.
  if (isPublic) {
    return (
      <Routes>
        <Route path="/invite/:token" element={<PublicInvite />} />
      </Routes>
    )
  }

  // Preview / demo build: no login, seeded in-memory data.
  if (DEMO) return <AdminApp />

  if (!isConfigured) return <SetupNeeded />
  if (!ready) return <div className="app"><div className="content"><Spinner /></div></div>
  if (!session) return <Auth />

  return <AdminApp />
}

function AdminApp() {
  return (
    <ExhibitionProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />

          <Route path="exhibitions" element={<ExhibitionsList />} />
          <Route path="exhibitions/new" element={<ExhibitionForm />} />
          <Route path="exhibitions/:id/edit" element={<ExhibitionForm />} />

          <Route path="suppliers" element={<SuppliersList />} />
          <Route path="suppliers/new" element={<SupplierForm />} />
          <Route path="suppliers/:id" element={<SupplierDetail />} />
          <Route path="suppliers/:id/edit" element={<SupplierForm />} />

          <Route path="fair" element={<FairSuppliers />} />
          <Route path="fair/add" element={<AddToFair />} />
          <Route path="fair/supplier/:supplierId" element={<FairSupplierDetail />} />
          <Route
            path="fair/supplier/:supplierId/scan"
            element={<Suspense fallback={<div className="content"><Spinner /></div>}><ScanScreen /></Suspense>}
          />

          <Route path="invitations" element={<InvitationsList />} />
          <Route path="invitations/new" element={<InvitationForm />} />
          <Route path="invitations/:id" element={<InvitationDetail />} />
          <Route path="invitations/:id/edit" element={<InvitationForm />} />

          <Route path="more" element={<More />} />

          <Route path="search" element={<Search />} />
          <Route path="contacts" element={<Contacts />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route
            path="factories"
            element={<Placeholder title="Factories" phase="Phase 5" points={['Factory locations with verification status', 'Map & dynamic city clustering', 'Nearest airport / high-speed rail and transfer times']} />}
          />
          <Route path="follow-ups" element={<FollowUps />} />
          <Route path="planner" element={<Planner />} />
          <Route path="today" element={<TodayRoute />} />
          <Route path="factory-plan" element={<FactoryPlanner />} />
          <Route path="daily-review" element={<DailyReview />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </ExhibitionProvider>
  )
}
