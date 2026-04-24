import { useCallback, useEffect, useRef, useState } from 'react'
import { Wifi, WifiOff, Eye, EyeOff, Network, BrainCircuit } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Toggle } from '../components/ui/Toggle'
import { useTheme, type Theme } from '../lib/use-theme'
import { enumerateAudioDevices, type AudioDevice } from '../lib/audio-engine'
import { getSetting, setSetting } from '../lib/db'
import {
  defaultServerUrlForMode,
  isRealtimeConnectionMode,
  LEGACY_REALTIME_SERVER_URL_SETTING,
  REALTIME_CONNECTION_MODE_SETTING,
  resolveServerUrlForMode,
  serverUrlSettingKeyForMode,
  type RealtimeConnectionMode,
} from '../lib/realtime-settings'

const GEMINI_VOICES = [
  'Puck',
  'Charon',
  'Kore',
  'Fenrir',
  'Aoede',
  'Leda',
  'Orus',
  'Zephyr',
] as const
const GEMINI_VOICE_LABELS: Record<(typeof GEMINI_VOICES)[number], string> = {
  Puck: 'Puck (M)',
  Charon: 'Charon (M)',
  Kore: 'Kore (F)',
  Fenrir: 'Fenrir (M)',
  Aoede: 'Aoede (F)',
  Leda: 'Leda (F)',
  Orus: 'Orus (M)',
  Zephyr: 'Zephyr (F)',
}

const XAI_VOICES = ['eve', 'ara', 'rex', 'sal', 'leo'] as const
const XAI_VOICE_LABELS: Record<(typeof XAI_VOICES)[number], string> = {
  eve: 'Eve (F)',
  ara: 'Ara (F)',
  rex: 'Rex (M)',
  sal: 'Sal (N)',
  leo: 'Leo (M)',
}

type RealtimeModel = 'gemini-3.1-flash-live-preview' | 'grok-voice-think-fast-1.0'
const DEFAULT_REALTIME_MODEL: RealtimeModel = 'gemini-3.1-flash-live-preview'

export function SettingsPage() {
  const { theme, setTheme } = useTheme()

  // Connection
  const [connectionMode, setConnectionMode] = useState<RealtimeConnectionMode>('relay')
  const [serverUrl, setServerUrl] = useState(defaultServerUrlForMode('relay'))
  const [apiKey, setApiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle')
  const [testError, setTestError] = useState('')

  // Model + Voice
  const [model, setModel] = useState<RealtimeModel>('gemini-3.1-flash-live-preview')
  const [voice, setVoice] = useState<string>('Zephyr')

  // Audio
  const [volume, setVolume] = useState(1.0)
  const [inputDeviceId, setInputDeviceId] = useState('')
  const [outputDeviceId, setOutputDeviceId] = useState('')
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([])

  // Debug
  const [debugMode, setDebugMode] = useState(false)
  const [showLatency, setShowLatency] = useState(false)
  const [tracingEnabled, setTracingEnabled] = useState(false)

  const loadedRef = useRef(false)

  // Load all settings on mount
  useEffect(() => {
    ;(async () => {
      const mode = await getSetting(REALTIME_CONNECTION_MODE_SETTING)
      const nextMode = isRealtimeConnectionMode(mode) ? mode : 'relay'
      setConnectionMode(nextMode)
      const url = await loadServerUrlForMode(nextMode)
      setServerUrl(url)
      const key = await getSetting('realtime_api_key')
      if (key) setApiKey(key)
      const m = await getSetting('realtime_model')
      const loadedModel = normalizeRealtimeModel(m)
      setModel(loadedModel)
      if (m && m !== loadedModel) setSetting('realtime_model', loadedModel)
      const v = await getSetting('realtime_voice')
      const loadedVoice = normalizeRealtimeVoice(loadedModel, v)
      setVoice(loadedVoice)
      if (v !== loadedVoice) setSetting('realtime_voice', loadedVoice)
      const vol = await getSetting('realtime_volume')
      if (vol) setVolume(parseFloat(vol))
      const inDev = await getSetting('input_device_id')
      if (inDev) setInputDeviceId(inDev)
      const outDev = await getSetting('output_device_id')
      if (outDev) setOutputDeviceId(outDev)
      const dm = await getSetting('debug_mode')
      if (dm === 'true') setDebugMode(true)
      const sl = await getSetting('show_latency')
      if (sl === 'true') setShowLatency(true)
      const tr = await getSetting('tracing_enabled')
      if (tr === 'true') setTracingEnabled(true)

      loadedRef.current = true
    })()

    enumerateAudioDevices().then(setAudioDevices).catch(console.error)
  }, [])

  // Save setting to DB immediately
  const save = useCallback((key: string, value: string) => {
    setSetting(key, value)
  }, [])

  const updateServerUrl = useCallback(
    (v: string) => {
      setServerUrl(v)
      setTestStatus('idle')
      if (loadedRef.current) {
        save(serverUrlSettingKeyForMode(connectionMode), v)
        if (connectionMode === 'relay') save(LEGACY_REALTIME_SERVER_URL_SETTING, v)
      }
    },
    [connectionMode, save]
  )

  const updateApiKey = useCallback(
    (v: string) => {
      setApiKey(v)
      setTestStatus('idle')
      if (loadedRef.current) save('realtime_api_key', v)
    },
    [save]
  )

  const updateModel = useCallback(
    (v: RealtimeModel) => {
      setModel(v)
      if (loadedRef.current) save('realtime_model', v)
      // Reset voice when switching providers
      const isGemini = v.startsWith('gemini-')
      const currentIsGemini = (GEMINI_VOICES as readonly string[]).includes(voice)
      const isXAI = v.startsWith('grok-voice-')
      const currentIsXAI = (XAI_VOICES as readonly string[]).includes(voice)
      if (isGemini && !currentIsGemini) {
        setVoice('Zephyr')
        save('realtime_voice', 'Zephyr')
      } else if (isXAI && !currentIsXAI) {
        setVoice('eve')
        save('realtime_voice', 'eve')
      }
    },
    [save, voice]
  )

  const updateConnectionMode = useCallback(
    async (v: RealtimeConnectionMode) => {
      setConnectionMode(v)
      setTestStatus('idle')
      if (loadedRef.current) save(REALTIME_CONNECTION_MODE_SETTING, v)

      const nextUrl = await loadServerUrlForMode(v)
      setServerUrl(nextUrl)
    },
    [save]
  )

  const updateVoice = useCallback(
    (v: string) => {
      setVoice(v)
      if (loadedRef.current) save('realtime_voice', v)
    },
    [save]
  )

  const updateVolume = useCallback(
    (v: number) => {
      setVolume(v)
      if (loadedRef.current) save('realtime_volume', String(v))
    },
    [save]
  )

  const updateInputDevice = useCallback(
    (v: string) => {
      setInputDeviceId(v)
      if (loadedRef.current) save('input_device_id', v)
    },
    [save]
  )

  const updateOutputDevice = useCallback(
    (v: string) => {
      setOutputDeviceId(v)
      if (loadedRef.current) save('output_device_id', v)
    },
    [save]
  )

  const toggleDebugMode = useCallback((v: boolean) => {
    setDebugMode(v)
    setSetting('debug_mode', v ? 'true' : 'false')
  }, [])

  const toggleShowLatency = useCallback((v: boolean) => {
    setShowLatency(v)
    setSetting('show_latency', v ? 'true' : 'false')
  }, [])

  const toggleTracing = useCallback((v: boolean) => {
    setTracingEnabled(v)
    setSetting('tracing_enabled', v ? 'true' : 'false')
  }, [])

  const testConnection = useCallback(async () => {
    setTestStatus('testing')
    setTestError('')
    try {
      // Pass ws URL directly — main process converts to http and appends /health
      const result = await window.electronAPI.net.healthCheck(serverUrl)
      if (result.ok) {
        setTestStatus('ok')
      } else {
        setTestStatus('error')
        setTestError(result.error || 'Connection failed')
      }
    } catch (err) {
      setTestStatus('error')
      setTestError(err instanceof Error ? err.message : 'Connection failed')
    }
  }, [serverUrl])

  const inputDevices = audioDevices.filter((d) => d.kind === 'audioinput')
  const outputDevices = audioDevices.filter((d) => d.kind === 'audiooutput')
  const isRealtimeBrainMode = connectionMode === 'realtime-brain'
  const serverUrlLabel = isRealtimeBrainMode ? 'OpenClaw Realtime URL' : 'Relay Server URL'
  const serverUrlPlaceholder = defaultServerUrlForMode(connectionMode)
  const apiKeyLabel = isRealtimeBrainMode ? 'OpenClaw Gateway Token' : 'API Key'
  const apiKeyPlaceholder = isRealtimeBrainMode
    ? 'Enter gateway token or password'
    : 'Enter your API key'

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {/* Connection */}
        <Card className="space-y-4 p-4">
          <h3 className="text-sm font-semibold text-foreground">Connection</h3>

          <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
            {(
              [
                { value: 'relay', label: 'Relay', icon: Network },
                { value: 'realtime-brain', label: 'Real-time brain', icon: BrainCircuit },
              ] as const
            ).map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => void updateConnectionMode(value)}
                className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${connectionMode === value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'} `}>
                <Icon size={15} />
                <span>{label}</span>
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">{serverUrlLabel}</label>
            <Input
              value={serverUrl}
              onChange={(e) => updateServerUrl(e.target.value)}
              placeholder={serverUrlPlaceholder}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">{apiKeyLabel}</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => updateApiKey(e.target.value)}
                  placeholder={apiKeyPlaceholder}
                  className="pr-10"
                />
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          <ConnectionStatus status={testStatus} error={testError} onTest={testConnection} />
        </Card>

        {/* Model */}
        <Card className="space-y-4 p-4">
          <h3 className="text-sm font-semibold text-foreground">Model</h3>
          <div className="space-y-1.5">
            {(['gemini-3.1-flash-live-preview', 'grok-voice-think-fast-1.0'] as const).map((m) => {
              return (
                <button
                  key={m}
                  onClick={() => updateModel(m)}
                  className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${model === m ? 'bg-primary/10 border-primary' : 'border-input'} cursor-pointer hover:bg-accent`}>
                  <div
                    className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 ${model === m ? 'border-primary' : 'border-muted-foreground'} `}>
                    {model === m && <div className="h-1.5 w-1.5 rounded-full bg-primary" />}
                  </div>
                  <span
                    className={`text-sm ${model === m ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                    {m === 'gemini-3.1-flash-live-preview'
                      ? 'Gemini 3.1 Flash Live'
                      : 'Grok Voice Think Fast 1.0'}
                  </span>
                </button>
              )
            })}
          </div>
        </Card>

        {/* Voice */}
        <Card className="space-y-4 p-4">
          <h3 className="text-sm font-semibold text-foreground">Voice</h3>
          <div className="grid grid-cols-2 gap-1.5">
            {(model.startsWith('gemini-') ? GEMINI_VOICES : XAI_VOICES).map((v) => (
              <button
                key={v}
                onClick={() => updateVoice(v)}
                className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${voice === v ? 'bg-primary/10 border-primary font-medium text-foreground' : 'border-input text-muted-foreground hover:bg-accent'} `}>
                {model.startsWith('gemini-')
                  ? GEMINI_VOICE_LABELS[v as (typeof GEMINI_VOICES)[number]]
                  : XAI_VOICE_LABELS[v as (typeof XAI_VOICES)[number]]}
              </button>
            ))}
          </div>
        </Card>

        {/* Audio Devices */}
        <Card className="space-y-4 p-4">
          <h3 className="text-sm font-semibold text-foreground">Audio Devices</h3>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Input (Microphone)</label>
            <Select value={inputDeviceId} onChange={(e) => updateInputDevice(e.target.value)}>
              <option value="">System Default</option>
              {inputDevices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Output (Speaker)</label>
            <Select value={outputDeviceId} onChange={(e) => updateOutputDevice(e.target.value)}>
              <option value="">System Default</option>
              {outputDevices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">
              Speaker Volume: {volume.toFixed(1)}x
            </label>
            <input
              type="range"
              min={0.5}
              max={3.0}
              step={0.1}
              value={volume}
              onChange={(e) => updateVolume(Math.round(parseFloat(e.target.value) * 10) / 10)}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Quiet</span>
              <span>Max</span>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => enumerateAudioDevices().then(setAudioDevices)}>
            Refresh Devices
          </Button>
        </Card>

        {/* Appearance */}
        <Card className="space-y-4 p-4">
          <h3 className="text-sm font-semibold text-foreground">Appearance</h3>
          <div className="flex gap-2">
            {(['dark', 'light', 'system'] as Theme[]).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm capitalize transition-colors ${theme === t ? 'bg-primary/10 border-primary font-medium text-foreground' : 'border-input text-muted-foreground hover:bg-accent'} `}>
                {t}
              </button>
            ))}
          </div>
        </Card>

        {/* Debug */}
        <Card className="space-y-4 p-4">
          <h3 className="text-sm font-semibold text-foreground">Debug</h3>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">Debug Mode</p>
              <p className="text-xs text-muted-foreground">Show event counters during calls</p>
            </div>
            <Toggle checked={debugMode} onChange={toggleDebugMode} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">Show Latency</p>
              <p className="text-xs text-muted-foreground">
                Display latency badges on chat messages
              </p>
            </div>
            <Toggle checked={showLatency} onChange={toggleShowLatency} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">Send Traces</p>
              <p className="text-xs text-muted-foreground">
                Post per-turn latency to Langfuse via the active realtime server
              </p>
            </div>
            <Toggle checked={tracingEnabled} onChange={toggleTracing} />
          </div>
        </Card>

        {/* Setup Instructions */}
        <Card className="space-y-2 p-4 text-xs text-muted-foreground">
          <p className="font-medium">Setup</p>
          {isRealtimeBrainMode ? (
            <ol className="list-inside list-decimal space-y-0.5">
              <li>Start OpenClaw from the realtime brain worktree on port 19789</li>
              <li>
                Set the URL to{' '}
                <code className="rounded bg-muted px-1 py-0.5">
                  ws://localhost:19789/voiceclaw/realtime
                </code>
              </li>
              <li>Enter the OpenClaw gateway token or password if gateway auth is enabled</li>
              <li>Click Test to verify the connection</li>
            </ol>
          ) : (
            <ol className="list-inside list-decimal space-y-0.5">
              <li>
                Start the relay server:{' '}
                <code className="rounded bg-muted px-1 py-0.5">cd relay-server && yarn dev</code>
              </li>
              <li>Enter the relay server URL shown on startup</li>
              <li>Enter your API key for authentication</li>
              <li>Click Test to verify the connection</li>
            </ol>
          )}
        </Card>
      </div>
    </div>
  )
}

function isRealtimeModel(model: string | null): model is RealtimeModel {
  return model === 'gemini-3.1-flash-live-preview' || model === 'grok-voice-think-fast-1.0'
}

function normalizeRealtimeModel(model: string | null): RealtimeModel {
  return isRealtimeModel(model) ? model : DEFAULT_REALTIME_MODEL
}

function normalizeRealtimeVoice(model: RealtimeModel, voice: string | null): string {
  if (model.startsWith('grok-voice-')) {
    return voice && (XAI_VOICES as readonly string[]).includes(voice) ? voice : 'eve'
  }

  return voice && (GEMINI_VOICES as readonly string[]).includes(voice) ? voice : 'Zephyr'
}

// --- Helper Components ---

async function loadServerUrlForMode(mode: RealtimeConnectionMode): Promise<string> {
  const modeUrl = await getSetting(serverUrlSettingKeyForMode(mode))
  const legacyUrl = mode === 'relay' ? await getSetting(LEGACY_REALTIME_SERVER_URL_SETTING) : null
  return resolveServerUrlForMode(mode, modeUrl || legacyUrl)
}

function ConnectionStatus({
  status,
  error,
  onTest,
}: {
  status: 'idle' | 'testing' | 'ok' | 'error'
  error: string
  onTest: () => void
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
        status === 'ok'
          ? 'border-green-500/30 bg-green-500/5'
          : status === 'error'
            ? 'border-destructive/50 bg-destructive/5'
            : 'border-input'
      } `}>
      <div className="flex items-center gap-2">
        {status === 'testing' ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        ) : status === 'ok' ? (
          <Wifi size={16} className="text-green-500" />
        ) : (
          <WifiOff
            size={16}
            className={status === 'error' ? 'text-destructive' : 'text-muted-foreground'}
          />
        )}
        <span
          className={`text-sm ${
            status === 'ok'
              ? 'text-green-500'
              : status === 'error'
                ? 'text-destructive'
                : 'text-muted-foreground'
          }`}>
          {status === 'ok'
            ? 'Connected'
            : status === 'testing'
              ? 'Testing...'
              : status === 'error'
                ? error
                : 'Not tested'}
        </span>
      </div>
      <Button variant="ghost" size="sm" onClick={onTest} disabled={status === 'testing'}>
        Test
      </Button>
    </div>
  )
}
