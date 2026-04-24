import { app } from 'electron'

// Launch-at-login on macOS. VoiceClaw defaults to on so mobile devices
// can reach this Mac over Tailscale without manual intervention. User
// can flip it off from Settings.

export function isLaunchAtLoginEnabled(): boolean {
  return app.getLoginItemSettings().openAtLogin
}

export function setLaunchAtLogin(enabled: boolean): void {
  app.setLoginItemSettings({
    openAtLogin: enabled,
    // openAsHidden means "start minimized" — we still show the menu bar
    // icon, just not the main window. Exactly the behavior we want for
    // the "menu bar persists for mobile access" model.
    openAsHidden: true,
  })
}

// Ensure the preferred default lands on first run without clobbering a
// user who has explicitly disabled it later. Callers persist the user's
// most recent preference in SQLite so this is only used for the initial
// boot after install.
export function ensureDefault(defaultEnabled = true): void {
  const current = app.getLoginItemSettings()
  if (!current.openAtLogin && defaultEnabled) {
    setLaunchAtLogin(true)
  }
}
