const EMAIL_OCTOPUS_BASE = "https://api.emailoctopus.com"

export type SubscribeResult =
  | { ok: true }
  | { ok: false; reason: "not_configured" | "invalid_email" | "already_subscribed" | "rate_limited" | "upstream_error"; status?: number; message?: string }

export function isEmailOctopusConfigured(): boolean {
  return Boolean(process.env.EMAIL_OCTOPUS_API_KEY && process.env.EMAIL_OCTOPUS_LIST_ID)
}

export async function subscribeToList(email: string): Promise<SubscribeResult> {
  const apiKey = process.env.EMAIL_OCTOPUS_API_KEY
  const listId = process.env.EMAIL_OCTOPUS_LIST_ID
  if (!apiKey || !listId) {
    return { ok: false, reason: "not_configured" }
  }

  const trimmed = email.trim().toLowerCase()
  if (!isPlausibleEmail(trimmed)) {
    return { ok: false, reason: "invalid_email" }
  }

  const url = `${EMAIL_OCTOPUS_BASE}/lists/${encodeURIComponent(listId)}/contacts`
  let response: Response
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email_address: trimmed, status: "subscribed" }),
      cache: "no-store",
    })
  } catch (err) {
    return {
      ok: false,
      reason: "upstream_error",
      message: err instanceof Error ? err.message : "fetch_failed",
    }
  }

  if (response.ok) {
    return { ok: true }
  }

  const payload = (await safeJson(response)) as { error?: { code?: string; message?: string } } | null
  const code = payload?.error?.code

  if (response.status === 409 || code === "MEMBER_EXISTS_WITH_EMAIL_ADDRESS") {
    return { ok: false, reason: "already_subscribed", status: response.status }
  }
  if (response.status === 429) {
    return { ok: false, reason: "rate_limited", status: response.status }
  }
  if (response.status === 400 && code === "INVALID_PARAMETERS") {
    return { ok: false, reason: "invalid_email", status: response.status }
  }

  return {
    ok: false,
    reason: "upstream_error",
    status: response.status,
    message: payload?.error?.message,
  }
}

function isPlausibleEmail(value: string): boolean {
  if (value.length < 3 || value.length > 254) return false
  const at = value.indexOf("@")
  if (at <= 0 || at !== value.lastIndexOf("@")) return false
  const dot = value.lastIndexOf(".")
  return dot > at + 1 && dot < value.length - 1
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return null
  }
}
