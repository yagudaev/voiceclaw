import { createHash, randomBytes } from "crypto"
import { SignJWT, jwtVerify, type JWTPayload } from "jose"

// Token utilities for the browser → desktop/mobile handoff.
//
// Two token types:
//   - Auth tickets: short-lived (~60s), single-use, passed via deep link.
//   - Device tokens: long-lived (~1y), stored in macOS/iOS Keychain on the
//     client. Used to authenticate every subsequent API call.
//
// We only store hashes server-side so a DB leak can't impersonate anyone.

const AUTH_TICKET_TTL_SECONDS = 90
const DEVICE_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 365 // 1 year

const DEVICE_TOKEN_ISSUER = "getvoiceclaw.com"
const DEVICE_TOKEN_AUDIENCE = "voiceclaw-device"

export type DeviceTokenClaims = JWTPayload & {
  sub: string // user id
  deviceId: string
  platform?: string
}

// ---------------------------------------------------------------------------
// Auth tickets (short-lived, opaque, hashed server-side)
// ---------------------------------------------------------------------------

export function mintAuthTicket(): { ticket: string; hash: string; expiresAt: Date } {
  // 32 bytes = 256 bits of entropy, base64url-encoded.
  const ticket = randomBytes(32).toString("base64url")
  const hash = sha256(ticket)
  const expiresAt = new Date(Date.now() + AUTH_TICKET_TTL_SECONDS * 1000)
  return { ticket, hash, expiresAt }
}

export function hashAuthTicket(ticket: string): string {
  return sha256(ticket)
}

// ---------------------------------------------------------------------------
// Device tokens (long-lived JWTs, hash stored server-side)
// ---------------------------------------------------------------------------

export async function mintDeviceToken(claims: {
  userId: string
  deviceId: string
  platform?: string
}): Promise<{ token: string; hash: string }> {
  const key = getSigningKey()
  const payload: DeviceTokenClaims = {
    sub: claims.userId,
    deviceId: claims.deviceId,
    platform: claims.platform,
  }
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(DEVICE_TOKEN_ISSUER)
    .setAudience(DEVICE_TOKEN_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${DEVICE_TOKEN_TTL_SECONDS}s`)
    .sign(key)
  const hash = sha256(token)
  return { token, hash }
}

export async function verifyDeviceToken(token: string): Promise<DeviceTokenClaims | null> {
  try {
    const key = getSigningKey()
    const { payload } = await jwtVerify(token, key, {
      issuer: DEVICE_TOKEN_ISSUER,
      audience: DEVICE_TOKEN_AUDIENCE,
    })
    return payload as DeviceTokenClaims
  } catch {
    return null
  }
}

export function hashDeviceToken(token: string): string {
  return sha256(token)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex")
}

function getSigningKey(): Uint8Array {
  const secret = process.env.AUTH_JWT_SECRET
  if (!secret) {
    throw new Error(
      "AUTH_JWT_SECRET is not set. Generate with `openssl rand -hex 48` and add to env.",
    )
  }
  return new TextEncoder().encode(secret)
}

export function isSigningKeyConfigured(): boolean {
  return Boolean(process.env.AUTH_JWT_SECRET)
}
