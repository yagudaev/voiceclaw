import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { CallBar } from './CallBar'
import './call-bar.css'

const root = document.getElementById('call-bar-root')
if (root) {
  createRoot(root).render(
    <StrictMode>
      <CallBar />
    </StrictMode>,
  )
}
