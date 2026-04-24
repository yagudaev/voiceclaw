export type RealtimeConnectionMode = 'relay' | 'realtime-brain'

export const RELAY_DEFAULT_SERVER_URL = 'ws://localhost:8080/ws'
export const REALTIME_BRAIN_DEFAULT_SERVER_URL = 'ws://localhost:19789/voiceclaw/realtime'
export const LEGACY_REALTIME_SERVER_URL_SETTING = 'realtime_server_url'
export const REALTIME_CONNECTION_MODE_SETTING = 'realtime_connection_mode'

const SERVER_URL_SETTING_BY_MODE: Record<RealtimeConnectionMode, string> = {
  relay: 'realtime_server_url_relay',
  'realtime-brain': 'realtime_server_url_realtime_brain',
}

export function isRealtimeConnectionMode(value: string | null): value is RealtimeConnectionMode {
  return value === 'relay' || value === 'realtime-brain'
}

export function defaultServerUrlForMode(mode: RealtimeConnectionMode): string {
  return mode === 'realtime-brain' ? REALTIME_BRAIN_DEFAULT_SERVER_URL : RELAY_DEFAULT_SERVER_URL
}

export function serverUrlSettingKeyForMode(mode: RealtimeConnectionMode): string {
  return SERVER_URL_SETTING_BY_MODE[mode]
}

export function resolveServerUrlForMode(
  mode: RealtimeConnectionMode,
  savedUrl: string | null
): string {
  const trimmed = savedUrl?.trim()
  if (!trimmed) return defaultServerUrlForMode(mode)
  if (mode === 'realtime-brain' && trimmed === RELAY_DEFAULT_SERVER_URL) {
    return REALTIME_BRAIN_DEFAULT_SERVER_URL
  }
  if (mode === 'relay' && trimmed === REALTIME_BRAIN_DEFAULT_SERVER_URL) {
    return RELAY_DEFAULT_SERVER_URL
  }
  return trimmed
}
