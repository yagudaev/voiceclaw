// Provider-specific HTTP status → human message + action URL mapping for
// upstream auth/quota/service failures on the realtime WebSocket path.

export interface AdapterErrorInfo {
  userMessage: string
  actionUrl: string | null
}

export function mapAdapterError(
  provider: string,
  httpStatus: number | null,
  bodyExcerpt: string | null,
): AdapterErrorInfo {
  if (provider === "xai" || provider === "grok") {
    return mapXaiError(httpStatus, bodyExcerpt)
  }
  if (provider === "openai") {
    return mapOpenAiError(httpStatus, bodyExcerpt)
  }
  if (provider === "gemini") {
    return mapGeminiError(httpStatus, bodyExcerpt)
  }
  return mapGenericError(provider, httpStatus)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapXaiError(
  httpStatus: number | null,
  _bodyExcerpt: string | null,
): AdapterErrorInfo {
  if (httpStatus === 401) {
    return {
      userMessage: "xAI API key invalid or revoked. Update it in Settings → Provider.",
      actionUrl: "voiceclaw://settings/provider",
    }
  }
  if (httpStatus === 402 || httpStatus === 429) {
    return {
      userMessage: "xAI account out of credits or hit spending limit. Top up to continue.",
      actionUrl: "https://console.x.ai/team",
    }
  }
  if (httpStatus === 403) {
    return {
      userMessage: "xAI rejected this request. Check API key permissions.",
      actionUrl: "https://console.x.ai",
    }
  }
  if (httpStatus !== null && httpStatus >= 500) {
    return {
      userMessage: "xAI service is having issues. Try again in a moment.",
      actionUrl: "https://status.x.ai",
    }
  }
  return {
    userMessage: "Connection to xAI closed unexpectedly. Try again.",
    actionUrl: null,
  }
}

function mapOpenAiError(
  httpStatus: number | null,
  bodyExcerpt: string | null,
): AdapterErrorInfo {
  if (httpStatus === 401) {
    return {
      userMessage: "OpenAI API key invalid or revoked. Update it in Settings → Provider.",
      actionUrl: "voiceclaw://settings/provider",
    }
  }
  if (httpStatus === 402) {
    return {
      userMessage: "OpenAI quota exceeded. Top up your account.",
      actionUrl: "https://platform.openai.com/account/billing",
    }
  }
  if (httpStatus === 429) {
    const isQuota = bodyExcerpt?.includes("insufficient_quota") ?? false
    if (isQuota) {
      return {
        userMessage: "OpenAI quota exceeded. Top up your account.",
        actionUrl: "https://platform.openai.com/account/billing",
      }
    }
    return {
      userMessage: "OpenAI rate limit. Try again in a moment.",
      actionUrl: null,
    }
  }
  if (httpStatus !== null && httpStatus >= 500) {
    return {
      userMessage: "OpenAI service is having issues. Try again in a moment.",
      actionUrl: "https://status.openai.com",
    }
  }
  return {
    userMessage: "Connection to OpenAI closed unexpectedly. Try again.",
    actionUrl: null,
  }
}

function mapGeminiError(
  httpStatus: number | null,
  _bodyExcerpt: string | null,
): AdapterErrorInfo {
  if (httpStatus === 401 || httpStatus === 403) {
    return {
      userMessage: "Gemini API key invalid. Update it in Settings → Provider.",
      actionUrl: "voiceclaw://settings/provider",
    }
  }
  if (httpStatus === 429) {
    return {
      userMessage: "Gemini quota exceeded. Top up or wait for the daily reset.",
      actionUrl: "https://aistudio.google.com/app/billing",
    }
  }
  if (httpStatus !== null && httpStatus >= 500) {
    return {
      userMessage: "Gemini service is having issues. Try again in a moment.",
      actionUrl: "https://status.cloud.google.com",
    }
  }
  return {
    userMessage: "Connection to Gemini closed unexpectedly. Try again.",
    actionUrl: null,
  }
}

function mapGenericError(
  provider: string,
  httpStatus: number | null,
): AdapterErrorInfo {
  const label = provider || "provider"
  if (httpStatus !== null && httpStatus >= 500) {
    return {
      userMessage: `${label} service is having issues. Try again in a moment.`,
      actionUrl: null,
    }
  }
  return {
    userMessage: `Connection to ${label} closed unexpectedly. Try again.`,
    actionUrl: null,
  }
}
