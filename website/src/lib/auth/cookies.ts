import type { NextRequest, NextResponse } from "next/server"

// OAuth state + code-verifier cookies. Used to defend against CSRF in the
// Google/Apple OAuth roundtrip. HttpOnly + SameSite=Lax so the redirect
// back from the provider still includes them but they can't be read by
// browser JS.

const STATE_COOKIE = "vc_oauth_state"
const VERIFIER_COOKIE = "vc_oauth_verifier"
const FIVE_MINUTES = 60 * 5

export function setOAuthCookies(
  res: NextResponse,
  state: string,
  codeVerifier: string,
): void {
  const isProd = process.env.NODE_ENV === "production"
  const options = {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/",
    maxAge: FIVE_MINUTES,
  }
  res.cookies.set(STATE_COOKIE, state, options)
  res.cookies.set(VERIFIER_COOKIE, codeVerifier, options)
}

export function readOAuthCookies(req: NextRequest): {
  state: string | null
  codeVerifier: string | null
} {
  return {
    state: req.cookies.get(STATE_COOKIE)?.value ?? null,
    codeVerifier: req.cookies.get(VERIFIER_COOKIE)?.value ?? null,
  }
}

export function clearOAuthCookies(res: NextResponse): void {
  res.cookies.delete(STATE_COOKIE)
  res.cookies.delete(VERIFIER_COOKIE)
}
