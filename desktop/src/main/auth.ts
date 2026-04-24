import { app, net, safeStorage, shell } from 'electron'
import { getDb } from './db'
import { ensureOnboardingSchema } from './onboarding'
import { getMainWindow } from './window-lifecycle'

// Desktop sign-in flow:
//
//   1. Renderer asks main to start sign-in. We open the browser to
//      https://getvoiceclaw.com/api/auth/google/start?target=desktop.
//   2. Browser completes Google OAuth, the website redirects back to
//      voiceclaw://auth/callback?ticket=…
//   3. macOS hands the URL to this process via the open-url event. We
//      POST the ticket to /api/auth/ticket/redeem and persist the
//      returned device token in SQLite (encrypted with safeStorage).
//   4. Renderer is notified via `onboarding:auth-callback` so the
//      wizard can mark the user as signed-in and advance.

export const DEEP_LINK_SCHEME = 'voiceclaw'
const DEFAULT_AUTH_BASE_URL = 'https://getvoiceclaw.com'

export function registerAuthDeepLink(): void {
  // Register the custom scheme with macOS. argv handling for non-mac
  // platforms is unused for now.
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient(DEEP_LINK_SCHEME, process.execPath, [
        process.argv[1] ?? '',
      ])
    }
  } else {
    app.setAsDefaultProtocolClient(DEEP_LINK_SCHEME)
  }

  app.on('open-url', (event, url) => {
    event.preventDefault()
    void handleDeepLink(url).catch((err) => {
      console.warn('[auth] deep-link handler failed', err)
    })
  })
}

export function startSignInFlow(provider: 'google' | 'apple' = 'google'): void {
  const base = process.env.VOICECLAW_AUTH_BASE_URL ?? DEFAULT_AUTH_BASE_URL
  const url = `${base}/api/auth/${provider}/start?target=desktop`
  void shell.openExternal(url)
}

async function handleDeepLink(rawUrl: string): Promise<void> {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    return
  }
  if (parsed.protocol.replace(':', '') !== DEEP_LINK_SCHEME) return
  // path is "/auth/callback" or similar; we accept anything ending in
  // /auth/callback for forward compatibility.
  const isAuthCallback =
    parsed.host === 'auth' && parsed.pathname.startsWith('/callback')
  if (!isAuthCallback) return
  const ticket = parsed.searchParams.get('ticket')
  const error = parsed.searchParams.get('error')

  const window = getMainWindow()
  if (error || !ticket) {
    window?.webContents.send('onboarding:auth-callback', {
      ok: false,
      error: error ?? 'missing_ticket',
    })
    return
  }

  try {
    const result = await redeemTicket(ticket)
    window?.webContents.send('onboarding:auth-callback', {
      ok: true,
      user: result.user,
    })
  } catch (err) {
    window?.webContents.send('onboarding:auth-callback', {
      ok: false,
      error: err instanceof Error ? err.message : 'unknown_error',
    })
  }
}

async function redeemTicket(ticket: string): Promise<{
  user: { id?: string; email?: string | null; name?: string | null } | null
}> {
  const base = process.env.VOICECLAW_AUTH_BASE_URL ?? DEFAULT_AUTH_BASE_URL
  const response = await net.fetch(`${base}/api/auth/ticket/redeem`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticket, platform: 'desktop-macos', label: 'VoiceClaw Desktop' }),
  })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`redeem_failed_${response.status}: ${text.slice(0, 120)}`)
  }
  const body = (await response.json()) as {
    token: string
    device: { id: string; label: string | null; platform: string | null }
    user: { id: string; email: string | null; name: string | null } | null
  }

  ensureOnboardingSchema()
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('safeStorage_unavailable')
  }
  const tokenEnc = safeStorage.encryptString(body.token)
  const db = getDb()
  db.prepare(
    `INSERT INTO devices (id, user_id, user_email, user_name, token_enc, platform, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       user_id = excluded.user_id,
       user_email = excluded.user_email,
       user_name = excluded.user_name,
       token_enc = excluded.token_enc,
       platform = excluded.platform`,
  ).run(
    body.device.id,
    body.user?.id ?? null,
    body.user?.email ?? null,
    body.user?.name ?? null,
    tokenEnc,
    body.device.platform ?? 'desktop-macos',
    Date.now(),
  )
  return { user: body.user }
}
