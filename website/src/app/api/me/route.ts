import { type NextRequest, NextResponse } from "next/server"
import { isDatabaseConfigured, prisma } from "@/lib/auth/db"
import {
  hashDeviceToken,
  isSigningKeyConfigured,
  verifyDeviceToken,
} from "@/lib/auth/tokens"

// GET /api/me
//
// Desktop/mobile apps call this on launch to verify their device token
// is still valid + fetch the current user identity. Returns:
//   200 { user: {...}, mobileAccess: {...} } on success
//   401 when the token is missing or invalid
//   410 when the device has been revoked

export async function GET(request: NextRequest) {
  if (!isDatabaseConfigured() || !isSigningKeyConfigured()) {
    return NextResponse.json({ error: "not_configured" }, { status: 501 })
  }

  const token = extractBearer(request)
  if (!token) {
    return NextResponse.json({ error: "missing_token" }, { status: 401 })
  }

  const claims = await verifyDeviceToken(token)
  if (!claims) {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 })
  }

  // Check the hash matches what's on file; the token could be a valid
  // JWT for a device we've since revoked.
  const hash = hashDeviceToken(token)
  const device = await prisma.device.findUnique({
    where: { tokenHash: hash },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          mobileAccessRequestedAt: true,
          mobileAccessGrantedAt: true,
        },
      },
    },
  })

  if (!device || device.revokedAt) {
    return NextResponse.json({ error: "device_revoked" }, { status: 410 })
  }

  // Update last-seen eagerly; noisy but tiny.
  await prisma.device.update({
    where: { id: device.id },
    data: { lastSeenAt: new Date() },
  })

  return NextResponse.json({
    user: device.user,
    device: {
      id: device.id,
      label: device.label,
      platform: device.platform,
    },
    mobileAccess: mapMobileAccess(device.user),
  })
}

function extractBearer(request: NextRequest): string | null {
  const header = request.headers.get("authorization")
  if (!header) return null
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match?.[1] ?? null
}

function mapMobileAccess(user: {
  mobileAccessRequestedAt: Date | null
  mobileAccessGrantedAt: Date | null
}) {
  if (user.mobileAccessGrantedAt) {
    return { state: "granted" as const, grantedAt: user.mobileAccessGrantedAt }
  }
  if (user.mobileAccessRequestedAt) {
    return { state: "requested" as const, requestedAt: user.mobileAccessRequestedAt }
  }
  return { state: "none" as const }
}
