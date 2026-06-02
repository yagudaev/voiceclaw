import { type NextRequest, NextResponse } from "next/server"
import { isEmailOctopusConfigured, subscribeToList } from "@/lib/email-octopus"
import { withCapture } from "@/lib/telemetry/posthog-server"

type Body = { email?: unknown }

export const POST = withCapture(async (request: NextRequest) => {
  if (!isEmailOctopusConfigured()) {
    return NextResponse.json({ error: "not_configured" }, { status: 501 })
  }

  let body: Body
  try {
    body = (await request.json()) as Body
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 })
  }

  if (typeof body.email !== "string") {
    return NextResponse.json({ error: "missing_email" }, { status: 400 })
  }

  const result = await subscribeToList(body.email)
  if (result.ok) {
    return NextResponse.json({ ok: true })
  }

  switch (result.reason) {
    case "invalid_email":
      return NextResponse.json({ error: "invalid_email" }, { status: 400 })
    case "already_subscribed":
      return NextResponse.json({ ok: true, alreadySubscribed: true })
    case "rate_limited":
      return NextResponse.json({ error: "rate_limited" }, { status: 429 })
    default:
      return NextResponse.json({ error: "upstream_error" }, { status: 502 })
  }
}, "/api/subscribe")
