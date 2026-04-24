import { NextResponse } from "next/server"
import { generateState } from "arctic"
import { loadProviderConfig, isAppleConfigured } from "@/lib/auth/providers"
import { setOAuthCookies } from "@/lib/auth/cookies"
import { withCapture } from "@/lib/telemetry/posthog-server"

// GET /api/auth/apple/start
//
// Same shape as Google start. Apple's OAuth flow doesn't require PKCE
// (Apple signs a JWT client_secret in the token exchange instead), but
// we still need a state param for CSRF protection and a placeholder
// verifier to keep the cookie read/write symmetric across providers.

export const GET = withCapture(async (request: Request) => {
  if (!isAppleConfigured()) {
    return NextResponse.json({ error: "apple_not_configured" }, { status: 501 })
  }

  const { apple } = loadProviderConfig()
  if (!apple) {
    return NextResponse.json({ error: "apple_not_configured" }, { status: 501 })
  }

  const url = new URL(request.url)
  const target = url.searchParams.get("target") === "mobile" ? "mobile" : "desktop"

  const state = generateState()
  const scopes = ["name", "email"]
  const authorizationUrl = apple.createAuthorizationURL(state, scopes)
  // Apple uses `response_mode=form_post` by default in many tutorials,
  // but arctic's default is query-string which matches our Google
  // callback shape. Keep them consistent.

  const statePayload = `${state}.${target}`
  const res = NextResponse.redirect(authorizationUrl)
  setOAuthCookies(res, statePayload, "apple-no-pkce")
  return res
}, "/api/auth/apple/start")
