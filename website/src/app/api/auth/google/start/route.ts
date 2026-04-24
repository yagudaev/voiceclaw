import { NextResponse } from "next/server"
import { generateCodeVerifier, generateState } from "arctic"
import { loadProviderConfig, isGoogleConfigured } from "@/lib/auth/providers"
import { setOAuthCookies } from "@/lib/auth/cookies"

// GET /api/auth/google/start
//
// Kicks off the Google OAuth flow. Mints a state + PKCE code verifier,
// stores them as short-lived HttpOnly cookies, redirects to Google's
// consent screen with our redirect URI baked in.

export async function GET(request: Request) {
  if (!isGoogleConfigured()) {
    return NextResponse.json(
      { error: "google_not_configured" },
      { status: 501 },
    )
  }

  const { google } = loadProviderConfig()
  if (!google) {
    return NextResponse.json(
      { error: "google_not_configured" },
      { status: 501 },
    )
  }

  const url = new URL(request.url)
  const target = url.searchParams.get("target") === "mobile" ? "mobile" : "desktop"

  const state = generateState()
  const codeVerifier = generateCodeVerifier()
  const scopes = ["openid", "email", "profile"]

  const authorizationUrl = google.createAuthorizationURL(state, codeVerifier, scopes)
  // Include the platform hint in state so we can route back to the right
  // deep-link scheme. Arctic signs the state with random bytes; we append
  // our hint as a suffix and verify the prefix on callback.
  const statePayload = `${state}.${target}`

  const res = NextResponse.redirect(authorizationUrl)
  setOAuthCookies(res, statePayload, codeVerifier)
  return res
}
