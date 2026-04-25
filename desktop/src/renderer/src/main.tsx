import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// The renderer ships a single bundle. The call-bar window loads the
// same HTML with `?view=call-bar` in the URL — we look at that here
// and mount a different component tree instead of fighting
// electron-vite's single-entry renderer config.
//
// Both stylesheets and the app/call-bar modules are dynamic-imported
// so the call-bar window doesn't drag the Tailwind build (34 kB of
// CSS plus the main app's tree) and the main window doesn't drag the
// call-bar-specific overrides.
void (async () => {
  const view = new URLSearchParams(window.location.search).get('view')
  const root = createRoot(document.getElementById('root')!)

  if (view === 'call-bar') {
    const [{ CallBar }] = await Promise.all([
      import('./call-bar/CallBar'),
      import('./call-bar/call-bar.css'),
    ])
    root.render(
      <StrictMode>
        <CallBar />
      </StrictMode>,
    )
    return
  }

  if (view === 'screen-frame') {
    const [{ ScreenFrame }] = await Promise.all([
      import('./screen-frame/ScreenFrame'),
      import('./screen-frame/screen-frame.css'),
    ])
    root.render(
      <StrictMode>
        <ScreenFrame />
      </StrictMode>,
    )
    return
  }

  const [{ App }, { initTelemetry }] = await Promise.all([
    import('./App'),
    import('./lib/telemetry'),
    import('./index.css'),
  ])
  // Fire-and-forget. Lazy-init handles missing token gracefully.
  initTelemetry()
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})()
