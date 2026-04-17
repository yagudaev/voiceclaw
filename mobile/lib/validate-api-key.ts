export type ValidationStatus = 'idle' | 'testing' | 'valid' | 'invalid'

export type ValidationResult = {
  status: 'valid' | 'invalid'
  error?: string
}

export type Provider = 'brain' | 'elevenlabs' | 'deepgram' | 'openai_tts' | 'vapi'

export async function validateApiKey(
  provider: Provider,
  apiKey: string,
  apiUrl?: string,
): Promise<ValidationResult> {
  if (!apiKey.trim()) {
    return { status: 'invalid', error: 'API key is empty' }
  }

  switch (provider) {
    case 'brain':
      return validateBrainAgent(apiKey, apiUrl)
    case 'elevenlabs':
      return validateElevenLabs(apiKey)
    case 'deepgram':
      return validateDeepgram(apiKey)
    case 'openai_tts':
      return validateOpenAI(apiKey)
    case 'vapi':
      return validateVapi(apiKey)
    default:
      return { status: 'invalid', error: 'Unknown provider' }
  }
}

// --- Validation functions ---

async function validateBrainAgent(
  apiKey: string,
  apiUrl?: string,
): Promise<ValidationResult> {
  const url = apiUrl?.trim() || 'https://openrouter.ai/api/v1/chat/completions'
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 1,
      }),
    })

    if (response.status === 401 || response.status === 403) {
      return { status: 'invalid', error: 'Invalid API key' }
    }
    if (response.ok || response.status === 400) {
      // 400 can happen with model issues but key is valid
      return { status: 'valid' }
    }
    return { status: 'invalid', error: `HTTP ${response.status}` }
  } catch (err: any) {
    return { status: 'invalid', error: err.message || 'Network error' }
  }
}

async function validateElevenLabs(apiKey: string): Promise<ValidationResult> {
  try {
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      method: 'GET',
      headers: { 'xi-api-key': apiKey },
    })

    if (response.status === 401) {
      return { status: 'invalid', error: 'Invalid API key' }
    }
    if (response.ok) {
      return { status: 'valid' }
    }
    return { status: 'invalid', error: `HTTP ${response.status}` }
  } catch (err: any) {
    return { status: 'invalid', error: err.message || 'Network error' }
  }
}

async function validateDeepgram(apiKey: string): Promise<ValidationResult> {
  try {
    const response = await fetch('https://api.deepgram.com/v1/projects', {
      method: 'GET',
      headers: { Authorization: `Token ${apiKey}` },
    })

    if (response.status === 401 || response.status === 403) {
      return { status: 'invalid', error: 'Invalid API key' }
    }
    if (response.ok) {
      return { status: 'valid' }
    }
    return { status: 'invalid', error: `HTTP ${response.status}` }
  } catch (err: any) {
    return { status: 'invalid', error: err.message || 'Network error' }
  }
}

async function validateOpenAI(apiKey: string): Promise<ValidationResult> {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}` },
    })

    if (response.status === 401) {
      return { status: 'invalid', error: 'Invalid API key' }
    }
    if (response.ok) {
      return { status: 'valid' }
    }
    return { status: 'invalid', error: `HTTP ${response.status}` }
  } catch (err: any) {
    return { status: 'invalid', error: err.message || 'Network error' }
  }
}

async function validateVapi(apiKey: string): Promise<ValidationResult> {
  try {
    const response = await fetch('https://api.vapi.ai/assistant', {
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}` },
    })

    if (response.status === 401 || response.status === 403) {
      return { status: 'invalid', error: 'Invalid API key' }
    }
    if (response.ok) {
      return { status: 'valid' }
    }
    return { status: 'invalid', error: `HTTP ${response.status}` }
  } catch (err: any) {
    return { status: 'invalid', error: err.message || 'Network error' }
  }
}
