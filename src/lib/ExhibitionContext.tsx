import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listExhibitions } from '../api/exhibitions'
import type { Exhibition } from '../types'

interface ExhibitionCtx {
  exhibitions: Exhibition[]
  loading: boolean
  current: Exhibition | null
  currentId: string | null
  setCurrentId: (id: string | null) => void
}

const Ctx = createContext<ExhibitionCtx | null>(null)
const STORAGE_KEY = 'ex_current_exhibition'

export function ExhibitionProvider({ children }: { children: React.ReactNode }) {
  const { data, isLoading } = useQuery({
    queryKey: ['exhibitions'],
    queryFn: () => listExhibitions(),
  })
  const exhibitions = useMemo(() => data ?? [], [data])

  const [currentId, setCurrentIdState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY)
    } catch {
      return null
    }
  })

  const setCurrentId = (id: string | null) => {
    setCurrentIdState(id)
    try {
      if (id) localStorage.setItem(STORAGE_KEY, id)
      else localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore storage errors
    }
  }

  // Keep the selection valid: default to an active/first exhibition when unset.
  useEffect(() => {
    if (exhibitions.length === 0) return
    const stillValid = currentId && exhibitions.some((e) => e.id === currentId)
    if (!stillValid) {
      const active = exhibitions.find((e) => e.status === 'active' || e.status === 'factory_visit')
      setCurrentId((active ?? exhibitions[0]).id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exhibitions])

  const current = useMemo(
    () => exhibitions.find((e) => e.id === currentId) ?? null,
    [exhibitions, currentId],
  )

  const value: ExhibitionCtx = {
    exhibitions,
    loading: isLoading,
    current,
    currentId: current?.id ?? null,
    setCurrentId,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useExhibitions(): ExhibitionCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useExhibitions must be used within ExhibitionProvider')
  return ctx
}
