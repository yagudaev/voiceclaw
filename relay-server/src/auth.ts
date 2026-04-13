// Validate OpenClaw auth token by hitting the gateway's /v1/models endpoint

export async function validateOpenClawToken(
  gatewayUrl: string,
  authToken: string,
): Promise<boolean> {
  try {
    const url = `${gatewayUrl.replace(/\/$/, "")}/v1/models`
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${authToken}` },
    })

    if (!response.ok) return false

    // Check response is JSON (not HTML from an unconfigured gateway)
    const contentType = response.headers.get("content-type") ?? ""
    if (!contentType.includes("application/json")) return false

    return true
  } catch {
    return false
  }
}
