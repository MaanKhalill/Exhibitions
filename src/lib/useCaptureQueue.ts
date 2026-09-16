import { useSyncExternalStore } from 'react'
import { captureQueue } from './captureQueue'

export function useCaptureQueue() {
  return useSyncExternalStore(captureQueue.subscribe, captureQueue.getSnapshot, captureQueue.getSnapshot)
}
