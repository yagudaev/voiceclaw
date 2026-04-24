import { type NextRequest, NextResponse } from "next/server"
import { decodeIdToken, OAuth2RequestError, type OAuth2Tokens } from "arctic"
import { loadProviderConfig, isAppleConfigured } from "@/lib/auth/providers"
import { clearOAuthCookies, readOAuthCookies } from "@/lib/auth/cookies"
import { isDatabaseConfigured, prisma } from "@/lib/auth/db"
import { mintAuthTicket } from "@/lib/auth/tokens"
import { buildAuthCallbackDeepLink, buildCallbackPageHtml } from "@/lib/auth/deep-link"
import { withCapture } from "@/lib/telemetry/posthog-server"

// GET /api/auth/apple/callback?code=...&state=...
//
// Apple-specific gotchas worth knowing:
//  - Apple only sends the user's name on the FIRST sign-in (in the
//    request body of a form_post). Subsequent sign-ins: ID token only,
//    no name. We persist on first-sight; later sign-ins don't clobber.
//  - Apple "Hide My Email" returns a relay `@privaterelay.appleid.com`.
//    That's fine — real email delivery works. We store it as-is.
//  - Apple's `sub` is stable per-app. Don't try to link it to Google
//    `sub` across providers unless the user explicitly requests it.

export const GET = withCapture(async (request: NextRequest) => {
  if (!isAppleConfigured() || !isDatabaseConfigured()) {
    return NextResponse.json({ error: "not_configured" }, { status: 501 })
  }

  const { apple } = loadProviderConfig()
  if (!apple) {
    return NextResponse.json({ error: "apple_not_configured" }, { status: 501 })
  }

  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const stateParam = url.searchParams.get("state")
  const { state: storedStateWithTarget } = readOAuthCookies(request)
  if (!code || !stateParam || !storedStateWithTarget) {
    return failed("missing_oauth_params")
  }
  const [storedState, target] = storedStateWithTarget.split(".")
  if (storedState !== stateParam) {
    return failed("state_mismatch")
  }

  let tokens: OAuth2Tokens
  try {
    tokens = await apple.validateAuthorizationCode(code)
  } catch (err) {
    if (err instanceof OAuth2RequestError) {
      return failed(`oauth_error:${err.code}`)
    }
    return failed("token_exchange_failed")
  }

  const idToken = tokens.idToken()
  const claims = decodeIdToken(idToken) as {
    sub?: string
    email?: string
    email_verified?: boolean
  }
  if (!claims.sub) {
    return failed("missing_id_token_claims")
  }

  const email = claims.email ?? null
  const user = await prisma.user.upsert({
    where: { appleSub: claims.sub },
    create: {
      appleSub: claims.sub,
      email: email ?? `${claims.sub}@apple.private`,
      appleIdEmail: email,
    },
    update: {
      appleIdEmail: email ?? undefined,
    },
  })

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
}, "/api/auth/apple/callback")

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function failed(reason: string): NextResponse {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  const res = NextResponse.redirect(
    new URL(`/auth/failed?reason=${encodeURIComponent(reason)}`, base),
  )
  clearOAuthCookies(res)
  return res
}
