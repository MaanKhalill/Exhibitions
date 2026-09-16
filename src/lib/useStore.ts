import { useSyncExternalStore } from 'react'
import { store, type StoreState } from './store'

export function useStore(): StoreState {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
}
