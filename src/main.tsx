import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { DEMO } from './lib/demo'
import './index.css'

// The preview build is a single self-contained page (hash routing, no service
// worker); the real app uses history routing and installs as a PWA.
// When a new version deploys, activate it and reload once so users always see
// the latest without manually clearing the offline cache.
if (!DEMO) {
  registerSW({ immediate: true })
  if ('serviceWorker' in navigator) {
    // Only reload when an existing version is replaced by a new one — not on the
    // very first install (when there was no controller yet).
    const hadController = Boolean(navigator.serviceWorker.controller)
    let reloading = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading || !hadController) return
      reloading = true
      window.location.reload()
    })
  }
}
const Router = DEMO ? HashRouter : BrowserRouter

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <Router>
        <App />
      </Router>
    </QueryClientProvider>
  </React.StrictMode>,
)
