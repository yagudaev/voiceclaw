import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { initTelemetry } from './lib/telemetry'
import './index.css'

// Fire-and-forget. Lazy-init handles missing token gracefully.
initTelemetry()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
