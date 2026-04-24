import { type NextRequest, NextResponse } from "next/server"
import { decodeIdToken, OAuth2RequestError, type OAuth2Tokens } from "arctic"
import { loadProviderConfig, isGoogleConfigured } from "@/lib/auth/providers"
import { clearOAuthCookies, readOAuthCookies } from "@/lib/auth/cookies"
import { isDatabaseConfigured, prisma } from "@/lib/auth/db"
import { mintAuthTicket } from "@/lib/auth/tokens"
import { buildAuthCallbackDeepLink, buildCallbackPageHtml } from "@/lib/auth/deep-link"

// GET /api/auth/google/callback?code=...&state=...
//
// Verifies state, exchanges code for tokens, upserts the User, mints a
// one-time auth ticket, and redirects via voiceclaw:// deep link. The
// browser then shows a waiting page (in case the app isn't installed)
// that also tries to open the deep link programmatically.

export async function GET(request: NextRequest) {
  if (!isGoogleConfigured() || !isDatabaseConfigured()) {
    return NextResponse.json({ error: "not_configured" }, { status: 501 })
  }

  const { google } = loadProviderConfig()
  if (!google) {
    return NextResponse.json({ error: "google_not_configured" }, { status: 501 })
  }

  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const stateParam = url.searchParams.get("state")

  const { state: storedStateWithTarget, codeVerifier } = readOAuthCookies(request)
  if (!code || !stateParam || !storedStateWithTarget || !codeVerifier) {
    return failed("missing_oauth_params")
  }

  const [storedState, target] = storedStateWithTarget.split(".")
  if (storedState !== stateParam) {
    return failed("state_mismatch")
  }

  let tokens: OAuth2Tokens
  try {
    tokens = await google.validateAuthorizationCode(code, codeVerifier)
  } catch (err) {
    if (err instanceof OAuth2RequestError) {
      return failed(`oauth_error:${err.code}`)
    }
    return failed("token_exchange_failed")
  }

  const idTokenRaw = tokens.idToken()
  const claims = decodeIdToken(idTokenRaw) as {
    sub?: string
    email?: string
    name?: string
    email_verified?: boolean
  }
  if (!claims.sub || !claims.email) {
    return failed("missing_id_token_claims")
  }

  // Upsert the user, keyed on Google sub.
  const user = await prisma.user.upsert({
    where: { googleSub: claims.sub },
    create: {
      googleSub: claims.sub,
      email: claims.email,
      name: claims.name ?? null,
    },
    update: {
      email: claims.email,
      name: claims.name ?? undefined,
    },
  })

  // Mint a short-lived ticket, store its hash, hand the plaintext to the
  // deep link. The installed app redeems it at /api/auth/ticket/redeem.
  const { ticket, hash, expiresAt } = mintAuthTicket()
  await prisma.authTicket.create({
    data: {
      userId: user.id,
      ticketHash: hash,
      expiresAt,
      targetPlatform: target ?? "desktop",
    },
  })

  const deepLink = buildAuthCallbackDeepLink({
    target: target === "mobile" ? "mobile" : "desktop",
    ticket,
  })

  const res = new NextResponse(
    buildCallbackPageHtml({ deepLink, appName: "VoiceClaw" }),
    { status: 200, headers: { "content-type": "text/html; charset=utf-8" } },
  )
  clearOAuthCookies(res)
  return res
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function failed(reason: string): NextResponse {
  const res = NextResponse.redirect(
    new URL(`/auth/failed?reason=${encodeURIComponent(reason)}`, request_base()),
  )
  clearOAuthCookies(res)
  return res
}

function request_base(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
}
