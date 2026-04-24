import { type NextRequest, NextResponse } from "next/server"
import { isDatabaseConfigured, prisma } from "@/lib/auth/db"
import {
  hashAuthTicket,
  isSigningKeyConfigured,
  mintDeviceToken,
} from "@/lib/auth/tokens"
import { withCapture } from "@/lib/telemetry/posthog-server"

// POST /api/auth/ticket/redeem
// Body: { ticket: string, label?: string, platform?: "desktop-macos" | "ios" | "android" }
//
// The desktop/mobile app calls this after receiving the deep-link
// ticket. We hash the ticket, find the matching AuthTicket row (must be
// unexpired + unconsumed), mark it consumed, create a new Device, and
// return a long-lived device token the client stores in Keychain.
//
// Idempotency: a replayed call with the same ticket returns 410 gone.

type Body = {
  ticket?: unknown
  label?: unknown
  platform?: unknown
}

export const POST = withCapture(async (request: NextRequest) => {
  if (!isDatabaseConfigured() || !isSigningKeyConfigured()) {
    return NextResponse.json({ error: "not_configured" }, { status: 501 })
  }

  let body: Body
  try {
    body = (await request.json()) as Body
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 })
  }

  if (typeof body.ticket !== "string" || body.ticket.length < 16) {
    return NextResponse.json({ error: "missing_ticket" }, { status: 400 })
  }
  const label = typeof body.label === "string" ? body.label.slice(0, 120) : null
  const platform = typeof body.platform === "string" ? body.platform.slice(0, 40) : null

  const hash = hashAuthTicket(body.ticket)
  const row = await prisma.authTicket.findUnique({ where: { ticketHash: hash } })
  if (!row) {
    return NextResponse.json({ error: "unknown_ticket" }, { status: 404 })
  }
  if (row.consumedAt) {
    return NextResponse.json({ error: "ticket_already_used" }, { status: 410 })
  }
  if (row.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "ticket_expired" }, { status: 410 })
  }

  // Mint the device token first so we can hash it before DB writes.
  // The device row holds the hash; we return the plaintext exactly once.
  const deviceId = cuidLike()
  const token = await mintDeviceToken({
    userId: row.userId,
    deviceId,
    platform: platform ?? undefined,
  })

  // Atomic consume-or-fail: `updateMany` with `consumedAt: null` returns
  // the count of rows actually updated. Two concurrent redeems race here
  // — exactly one wins (count=1), the other sees count=0 and aborts
  // before we create a duplicate device.
  const consumed = await prisma.authTicket.updateMany({
    where: { id: row.id, consumedAt: null },
    data: { consumedAt: new Date() },
  })
  if (consumed.count === 0) {
    return NextResponse.json({ error: "ticket_already_used" }, { status: 410 })
  }

  const device = await prisma.device.create({
    data: {
      id: deviceId,
      userId: row.userId,
      label,
      platform,
      tokenHash: token.hash,
    },
  })

  const user = await prisma.user.findUnique({
    where: { id: row.userId },
    select: { id: true, email: true, name: true },
  })

  return NextResponse.json({
    token: token.token,
    device: { id: device.id, label: device.label, platform: device.platform },
    user,
  })
}, "/api/auth/ticket/redeem")

// Quick cuid-like id since we need to supply the device id before we can
// hash its token. Matches the shape Prisma generates elsewhere.
function cuidLike(): string {
  return `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
}
