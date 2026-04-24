// Deep-link builder for the browser → desktop/mobile ticket handoff.
//
// After the OAuth callback verifies the user and mints a ticket, we
// redirect the browser to a voiceclaw:// URL. The installed app's URL
// scheme handler catches it, extracts the ticket, and calls the ticket
// redeem endpoint to exchange it for a long-lived device token.
//
// Desktop and mobile prod both register `voiceclaw://`. Dev / staging
// variants of mobile register their own schemes (`voiceclaw-dev://`,
// `voiceclaw-staging://`), but that's resolved at the app side — the
// web callback always emits `voiceclaw://` and the ticket's stored
// `targetPlatform` tells the redeem endpoint which variant to trust.

export type DeepLinkTarget = "desktop" | "mobile"

export function buildAuthCallbackDeepLink(params: {
  target: DeepLinkTarget
  ticket: string
}): string {
  // `target` is kept in the signature (and the DB ticket row) so the
  // redeem endpoint can enforce desktop-vs-mobile, but the scheme is the
  // same either way — dev/staging mobile variants register their own
  // scheme and are routed by the app, not the URL.
  void params.target
  const url = new URL("voiceclaw://auth/callback")
  url.searchParams.set("ticket", params.ticket)
  return url.toString()
}

// Fallback HTML page for when the app isn't installed — the browser
// shows a waiting screen that also tries to open the deep link on load.
export function buildCallbackPageHtml(params: {
  deepLink: string
  appName: string
}): string {
  const deepLink = params.deepLink.replace(/"/g, "&quot;")
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Signed in · ${params.appName}</title>
  <meta http-equiv="refresh" content="0; url=${deepLink}" />
  <style>
    body { font-family: system-ui, sans-serif; padding: 4rem 2rem; text-align: center; color: #191511; background: #f1e8da; }
    h1 { font-size: 1.5rem; font-weight: 600; }
    p { max-width: 480px; margin: 1rem auto; line-height: 1.6; color: #665f58; }
    a { color: #b4492f; }
  </style>
</head>
<body>
  <h1>Signed in. Returning to ${params.appName}…</h1>
  <p>If this page is still here in a few seconds, <a href="${deepLink}">open ${params.appName}</a> manually.</p>
  <script>
    // Also try to navigate programmatically — meta refresh is the fallback.
    setTimeout(function () { window.location.href = ${JSON.stringify(params.deepLink)} }, 50)
  </script>
</body>
</html>`
}
