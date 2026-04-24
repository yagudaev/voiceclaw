import { Apple, Google } from "arctic"

// OAuth providers. Lazy-initialized so a PR can land without the env
// vars set — routes that hit these return 501 instead of crashing.

export type ProviderConfig = {
  baseUrl: string
  google: Google | null
  apple: Apple | null
}

export function loadProviderConfig(): ProviderConfig {
  const baseUrl = resolveBaseUrl()

  return {
    baseUrl,
    google: buildGoogle(baseUrl),
    apple: buildApple(baseUrl),
  }
}

export function isGoogleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
}

export function isAppleConfigured(): boolean {
  return Boolean(
    process.env.APPLE_CLIENT_ID &&
      process.env.APPLE_TEAM_ID &&
      process.env.APPLE_KEY_ID &&
      process.env.APPLE_PRIVATE_KEY,
  )
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function resolveBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL
  if (explicit) return explicit.replace(/\/$/, "")
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return "http://localhost:3000"
}

function buildGoogle(baseUrl: string): Google | null {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) return null
  return new Google(clientId, clientSecret, `${baseUrl}/api/auth/google/callback`)
}

function buildApple(baseUrl: string): Apple | null {
  const clientId = process.env.APPLE_CLIENT_ID
  const teamId = process.env.APPLE_TEAM_ID
  const keyId = process.env.APPLE_KEY_ID
  const privateKeyPem = process.env.APPLE_PRIVATE_KEY
  if (!clientId || !teamId || !keyId || !privateKeyPem) return null

  const pkcs8 = pemToPkcs8(privateKeyPem)
  return new Apple(clientId, teamId, keyId, pkcs8, `${baseUrl}/api/auth/apple/callback`)
}

// Apple ships the private key as a PEM-encoded PKCS#8 `.p8` file. Arctic's
// constructor wants the DER bytes, so strip the header/footer and decode
// the base64 body.
function pemToPkcs8(pem: string): Uint8Array {
  const normalized = pem
    .replace(/-----BEGIN [A-Z ]+-----/g, "")
    .replace(/-----END [A-Z ]+-----/g, "")
    .replace(/\s+/g, "")
  return Uint8Array.from(Buffer.from(normalized, "base64"))
}
