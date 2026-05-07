import { useCallback, useEffect, useRef, useState } from 'react'
import type { UpdateState } from '../lib/db'
import { Wifi, WifiOff, Eye, EyeOff, Play } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Toggle } from '../components/ui/Toggle'
import { ShortcutsCard } from '../components/ShortcutsCard'
import { identityApi, onboarding } from '../lib/onboarding-api'
import { decodeVoicePreviewAudio } from '../lib/voice-preview'
import { useTheme, type Theme } from '../lib/use-theme'
import { enumerateAudioDevices, type AudioDevice } from '../lib/audio-engine'
import { getSetting, setSetting } from '../lib/db'
import {
  GEMINI_VOICES,
  OPENAI_VOICES,
  XAI_VOICES,
  getVoiceForProvider,
  isVoiceForProvider,
  providerForModel,
  setVoiceForProvider,
} from '../lib/voice-prefs'
import {
  captureRenderer,
  isOptedOutRenderer,
  setOptedOutRenderer,
} from '../lib/telemetry'

const GEMINI_VOICE_LABELS: Record<typeof GEMINI_VOICES[number], string> = {
  Puck: 'Puck (M)',
  Charon: 'Charon (M)',
  Kore: 'Kore (F)',
  Fenrir: 'Fenrir (M)',
  Aoede: 'Aoede (F)',
  Leda: 'Leda (F)',
  Orus: 'Orus (M)',
  Zephyr: 'Zephyr (F)',
}

const XAI_VOICE_LABELS: Record<typeof XAI_VOICES[number], string> = {
  eve: 'Eve (F)',
  ara: 'Ara (F)',
  rex: 'Rex (M)',
  sal: 'Sal (N)',
  leo: 'Leo (M)',
}

const OPENAI_VOICE_LABELS: Record<typeof OPENAI_VOICES[number], string> = {
  marin: 'Marin (F)',
  cedar: 'Cedar (M)',
  alloy: 'Alloy (N)',
  ash: 'Ash (M)',
  ballad: 'Ballad (M)',
  coral: 'Coral (F)',
  echo: 'Echo (M)',
  sage: 'Sage (N)',
  shimmer: 'Shimmer (F)',
  verse: 'Verse (M)',
}

type RealtimeModel =
  | 'gemini-3.1-flash-live-preview'
  | 'grok-voice-think-fast-1.0'
  | 'gpt-realtime-2'
  | 'gpt-realtime-mini'
const DEFAULT_REALTIME_MODEL: RealtimeModel = 'gemini-3.1-flash-live-preview'

const REALTIME_MODEL_LABELS: Record<RealtimeModel, string> = {
  'gemini-3.1-flash-live-preview': 'Gemini 3.1 Flash Live',
  'grok-voice-think-fast-1.0': 'Grok Voice Think Fast 1.0',
  'gpt-realtime-2': 'GPT Realtime 2',
  'gpt-realtime-mini': 'GPT Realtime Mini',
}

const REALTIME_MODELS: readonly RealtimeModel[] = [
  'gemini-3.1-flash-live-preview',
  'grok-voice-think-fast-1.0',
  'gpt-realtime-2',
  'gpt-realtime-mini',
]

export function SettingsPage() {
  const { theme, setTheme } = useTheme()

  // Connection
  const [serverUrl, setServerUrl] = useState('')
  const [serverUrlPlaceholder, setServerUrlPlaceholder] = useState('ws://localhost:8080/ws')
  const [apiKey, setApiKey] = useState('')
  const [apiKeyPlaceholder, setApiKeyPlaceholder] = useState('Enter your API key')
  const [showApiKey, setShowApiKey] = useState(false)
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle')
  const [testError, setTestError] = useState('')
  const [resetting, setResetting] = useState(false)

  // Web Search (Tavily) — when enabled AND a key is set, the realtime model
  // gets a fast web_search tool alongside ask_brain. Stored as plain settings
  // KV like the relay api key. The enabled flag is independent of the key so
  // the user can pause web_search without losing their saved key.
  const [tavilyKey, setTavilyKey] = useState('')
  const [tavilyEnabled, setTavilyEnabled] = useState(true)
  const [showTavilyKey, setShowTavilyKey] = useState(false)

  // Model + Voice
  const [model, setModel] = useState<RealtimeModel>('gemini-3.1-flash-live-preview')
  const [voice, setVoice] = useState<string>('Zephyr')

  // Audio
  const [volume, setVolume] = useState(1.0)
  const [inputDeviceId, setInputDeviceId] = useState('')
  const [outputDeviceId, setOutputDeviceId] = useState('')
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([])

  // Call bar (floating window during sessions)
  const [callBarEnabled, setCallBarEnabled] = useState(true)

  // Debug
  const [debugMode, setDebugMode] = useState(false)
  const [showLatency, setShowLatency] = useState(false)
  const [showContextUsage, setShowContextUsage] = useState(false)
  const [tracingEnabled, setTracingEnabled] = useState(false)
  const [exportingBundle, setExportingBundle] = useState(false)
  const [bundleToast, setBundleToast] = useState<{ ok: boolean; message: string } | null>(null)
  const [doctorRunning, setDoctorRunning] = useState(false)
  const [doctorResult, setDoctorResult] = useState<DoctorResultShape | null>(null)
  const [doctorCopied, setDoctorCopied] = useState(false)

  // Agent identity (name + description)
  const [agentName, setAgentName] = useState('')
  const [agentDescription, setAgentDescription] = useState('')
  const identityLoadedRef = useRef(false)

  // Voice preview playback (clicking ▶ on a voice card plays a sample
  // without changing the selection). Errors render inline below the grid.
  const [previewing, setPreviewing] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState('')
  const previewClipRef = useRef<{ audio: HTMLAudioElement; revoke: () => void } | null>(null)
  // Monotonic token used to invalidate stale in-flight preview requests
  // when the user clicks another voice (or unmounts) before the IPC returns.
  const previewTokenRef = useRef(0)

  // Privacy / telemetry
  const [telemetryEnabled, setTelemetryEnabled] = useState(true)

  // Updates
  const [updateState, setUpdateState] = useState<UpdateState | null>(null)
  const [checkingUpdate, setCheckingUpdate] = useState(false)

  const loadedRef = useRef(false)

  // Load all settings on mount
  useEffect(() => {
    ;(async () => {
      const url = await getSetting('realtime_server_url')
      if (url) setServerUrl(url)
      try {
        const ports = await window.electronAPI?.app?.getServicePorts?.()
        const port = ports?.relay
        if (typeof port === 'number' && port > 0) {
          setServerUrlPlaceholder(`ws://127.0.0.1:${port}/ws`)
        }
      } catch {
        // Keep the static fallback placeholder.
      }
      const key = await getSetting('realtime_api_key')
      if (key) {
        setApiKey(key)
        setApiKeyPlaceholder(maskKey(key))
      }
      const tk = await getSetting('tavily_api_key')
      if (tk) setTavilyKey(tk)
      // Default to enabled. Only treat the explicit string 'false' as off so
      // a missing setting (first-run) starts in the on state.
      const te = await getSetting('tavily_enabled')
      setTavilyEnabled(te !== 'false')
      const m = await getSetting('realtime_model')
      const loadedModel = normalizeRealtimeModel(m)
      setModel(loadedModel)
      if (m && m !== loadedModel) setSetting('realtime_model', loadedModel)
      const loadedVoice = await getVoiceForProvider(providerForModel(loadedModel))
      setVoice(loadedVoice)
      const vol = await getSetting('realtime_volume')
      if (vol) setVolume(parseFloat(vol))
      const inDev = await getSetting('input_device_id')
      if (inDev) setInputDeviceId(inDev)
      const outDev = await getSetting('output_device_id')
      if (outDev) setOutputDeviceId(outDev)
      const cb = await getSetting('call_bar_enabled')
      // Default ON — only explicit 'false' disables. Missing row = on.
      setCallBarEnabled(cb !== 'false')
      const dm = await getSetting('debug_mode')
      if (dm === 'true') setDebugMode(true)
      const sl = await getSetting('show_latency')
      if (sl === 'true') setShowLatency(true)
      const scu = await getSetting('show_context_usage')
      if (scu === 'true') setShowContextUsage(true)
      const tr = await getSetting('tracing_enabled')
      if (tr === 'true') setTracingEnabled(true)

      try {
        const id = await identityApi.get()
        setAgentName(id.name)
        setAgentDescription(id.description)
      } catch {
        // identity bridge unavailable — leave defaults
      }
      identityLoadedRef.current = true

      const optedOut = await isOptedOutRenderer()
      setTelemetryEnabled(!optedOut)

      loadedRef.current = true
    })()

    enumerateAudioDevices().then(setAudioDevices).catch(console.error)
  }, [])

  useEffect(() => {
    const api = window.electronAPI?.updates
    if (!api) return
    api.getState().then(setUpdateState).catch(() => {})
    const remove = api.onStateChanged(setUpdateState)
    return remove
  }, [])

  // Save setting to DB immediately
  const save = useCallback((key: string, value: string) => {
    setSetting(key, value)
  }, [])

  const updateServerUrl = useCallback((v: string) => {
    setServerUrl(v)
    if (loadedRef.current) save('realtime_server_url', v)
  }, [save])

  const updateApiKey = useCallback((v: string) => {
    setApiKey(v)
    if (loadedRef.current) {
      save('realtime_api_key', v)
      // Fire only when the user transitions from blank → set, so we
      // don't spam an event on every keystroke. Provider name only —
      // the key itself is never included.
      if (v && !apiKey) {
        captureRenderer('provider_key_saved', { provider: 'realtime', model })
      }
    }
  }, [save, apiKey, model])

  const updateTavilyKey = useCallback((v: string) => {
    setTavilyKey(v)
    if (loadedRef.current) {
      save('tavily_api_key', v)
      if (v && !tavilyKey) {
        captureRenderer('provider_key_saved', { provider: 'tavily' })
      }
    }
  }, [save, tavilyKey])

  const toggleTavilyEnabled = useCallback((v: boolean) => {
    setTavilyEnabled(v)
    setSetting('tavily_enabled', v ? 'true' : 'false')
  }, [])

  const updateModel = useCallback((v: RealtimeModel) => {
    setModel(v)
    if (loadedRef.current) save('realtime_model', v)
    const nextProvider = providerForModel(v)
    if (isVoiceForProvider(nextProvider, voice)) return
    void (async () => {
      const restored = await getVoiceForProvider(nextProvider)
      setVoice(restored)
      if (loadedRef.current) await setVoiceForProvider(nextProvider, restored)
    })()
  }, [save, voice])

  const updateVoice = useCallback((v: string) => {
    setVoice(v)
    if (loadedRef.current) {
      void setVoiceForProvider(providerForModel(model), v)
    }
  }, [model])

  // Stop + release any in-flight preview clip on unmount.
  useEffect(() => {
    return () => {
      previewTokenRef.current += 1
      const clip = previewClipRef.current
      if (clip) {
        try {
          clip.audio.pause()
        } catch {
          // ignore
        }
        clip.revoke()
        previewClipRef.current = null
      }
    }
  }, [])

  const handleVoicePreview = useCallback(async (voiceId: string) => {
    const token = ++previewTokenRef.current
    // Stop + release the previous clip so re-clicking restarts cleanly and
    // we don't leak the blob: URL backing a PCM preview.
    const prev = previewClipRef.current
    if (prev) {
      try {
        prev.audio.pause()
      } catch {
        // ignore
      }
      prev.revoke()
      previewClipRef.current = null
    }
    setPreviewError('')
    setPreviewing(voiceId)
    try {
      const result = await identityApi.getVoicePreview({ voice: voiceId })
      if (token !== previewTokenRef.current) return
      if (!result.ok) {
        setPreviewError(result.error)
        setPreviewing(null)
        return
      }
      const clip = decodeVoicePreviewAudio(result.audioBase64, result.mimeType)
      previewClipRef.current = clip
      const finish = () => {
        if (previewClipRef.current === clip) {
          clip.revoke()
          previewClipRef.current = null
        }
        setPreviewing((p) => (p === voiceId ? null : p))
      }
      clip.audio.onended = finish
      clip.audio.onerror = () => {
        setPreviewError(`Audio playback failed (${result.mimeType}).`)
        finish()
      }
      try {
        await clip.audio.play()
      } catch (err) {
        setPreviewError(err instanceof Error ? err.message : 'Could not play audio.')
        finish()
      }
    } catch (err) {
      if (token !== previewTokenRef.current) return
      setPreviewError(err instanceof Error ? err.message : 'Preview failed.')
      setPreviewing(null)
    }
  }, [])

  const updateVolume = useCallback((v: number) => {
    setVolume(v)
    if (loadedRef.current) save('realtime_volume', String(v))
  }, [save])

  const updateInputDevice = useCallback((v: string) => {
    setInputDeviceId(v)
    if (loadedRef.current) save('input_device_id', v)
  }, [save])

  const updateOutputDevice = useCallback((v: string) => {
    setOutputDeviceId(v)
    if (loadedRef.current) save('output_device_id', v)
  }, [save])

  const toggleCallBar = useCallback((v: boolean) => {
    setCallBarEnabled(v)
    setSetting('call_bar_enabled', v ? 'true' : 'false')
  }, [])

  const toggleDebugMode = useCallback((v: boolean) => {
    setDebugMode(v)
    setSetting('debug_mode', v ? 'true' : 'false')
  }, [])

  const toggleShowLatency = useCallback((v: boolean) => {
    setShowLatency(v)
    setSetting('show_latency', v ? 'true' : 'false')
  }, [])

  const toggleShowContextUsage = useCallback((v: boolean) => {
    setShowContextUsage(v)
    setSetting('show_context_usage', v ? 'true' : 'false')
  }, [])

  const toggleTracing = useCallback((v: boolean) => {
    setTracingEnabled(v)
    setSetting('tracing_enabled', v ? 'true' : 'false')
  }, [])

  const persistIdentity = useCallback(
    (next: { name?: string; description?: string }) => {
      if (!identityLoadedRef.current) return
      identityApi
        .save({
          name: next.name ?? agentName,
          description: next.description ?? agentDescription,
          voice,
        })
        .catch((err) => console.warn('[settings] identity save failed', err))
    },
    [agentName, agentDescription, voice],
  )

  const updateAgentName = useCallback(
    (v: string) => {
      setAgentName(v)
      persistIdentity({ name: v })
    },
    [persistIdentity],
  )

  const updateAgentDescription = useCallback(
    (v: string) => {
      setAgentDescription(v)
      persistIdentity({ description: v })
    },
    [persistIdentity],
  )

  const toggleTelemetry = useCallback(async (v: boolean) => {
    setTelemetryEnabled(v)
    await setOptedOutRenderer(!v)
  }, [])

  const exportBundle = useCallback(async () => {
    const SUPPRESS_KEY = 'diag_privacy_preview_suppressed'
    const suppressed = await getSetting(SUPPRESS_KEY)
    if (suppressed !== 'true') {
      const confirmed = await showPrivacyPreview()
      if (!confirmed.proceed) return
      if (confirmed.suppress) await setSetting(SUPPRESS_KEY, 'true')
    }

    setExportingBundle(true)
    setBundleToast(null)
    try {
      const result = await window.electronAPI?.diagnostics?.export?.()
      if (!result) {
        setBundleToast({ ok: false, message: 'Export not available.' })
        return
      }
      if (result.ok) {
        setBundleToast({ ok: true, message: 'Diagnostic bundle saved to Downloads.' })
      } else {
        setBundleToast({ ok: false, message: result.error })
      }
    } catch (err) {
      setBundleToast({ ok: false, message: err instanceof Error ? err.message : 'Export failed.' })
    } finally {
      setExportingBundle(false)
      setTimeout(() => setBundleToast(null), 6000)
    }
  }, [])

  const runBrainDoctor = useCallback(async () => {
    setDoctorRunning(true)
    setDoctorResult(null)
    setDoctorCopied(false)
    try {
      const result = await window.electronAPI?.brain?.runDoctor?.()
      if (result) setDoctorResult(result)
    } catch (err) {
      console.warn('[SettingsPage] brain doctor failed', err)
    } finally {
      setDoctorRunning(false)
    }
  }, [])

  const copyDoctorResults = useCallback(async () => {
    if (!doctorResult) return
    try {
      await navigator.clipboard.writeText(JSON.stringify(doctorResult, null, 2))
      setDoctorCopied(true)
      setTimeout(() => setDoctorCopied(false), 2500)
    } catch {
      // clipboard unavailable — silently skip
    }
  }, [doctorResult])

  const resetBundled = useCallback(async () => {
    setResetting(true)
    try {
      const result = await window.electronAPI?.app?.resetBundledDefaults?.()
      if (result?.ok) {
        setApiKey(result.relayApiKey)
        setApiKeyPlaceholder(maskKey(result.relayApiKey))
        setSetting('realtime_api_key', result.relayApiKey)
        setServerUrl('')
        setSetting('realtime_server_url', '')
        setTestStatus('idle')
        setTestError('')
      }
    } catch (err) {
      console.warn('[SettingsPage] resetBundled failed', err)
    } finally {
      setResetting(false)
    }
  }, [])

  const testConnection = useCallback(async () => {
    setTestStatus('testing')
    setTestError('')
    try {
      // Pass ws URL directly — main process converts to http and appends /health
      const result = await window.electronAPI.net.healthCheck(serverUrl)
      if (result.ok) {
        setTestStatus('ok')
        captureRenderer('test_call_completed', { success: true, surface: 'settings' })
      } else {
        setTestStatus('error')
        setTestError(result.error || 'Connection failed')
        captureRenderer('test_call_completed', {
          success: false,
          surface: 'settings',
          reason: result.error ?? 'unknown',
        })
      }
    } catch (err) {
      setTestStatus('error')
      setTestError(err instanceof Error ? err.message : 'Connection failed')
      captureRenderer('test_call_completed', {
        success: false,
        surface: 'settings',
        reason: err instanceof Error ? err.message : 'unknown',
      })
    }
  }, [serverUrl])

  const inputDevices = audioDevices.filter((d) => d.kind === 'audioinput')
  const outputDevices = audioDevices.filter((d) => d.kind === 'audiooutput')

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {/* Connection */}
        <Card className="p-4 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Connection</h3>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Relay Server URL</label>
            <Input
              value={serverUrl}
              onChange={(e) => updateServerUrl(e.target.value)}
              placeholder={serverUrlPlaceholder}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">API Key</label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => updateApiKey(e.target.value)}
                  placeholder={apiKeyPlaceholder}
                  className="pr-10"
                />
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          <ConnectionStatus
            status={testStatus}
            error={testError}
            onTest={testConnection}
          />

          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              Bundled relay running at <code className="rounded bg-muted px-1 py-0.5">{serverUrlPlaceholder}</code>
            </span>
            <Button variant="ghost" size="sm" onClick={resetBundled} disabled={resetting}>
              {resetting ? 'Resetting…' : 'Reset to bundled defaults'}
            </Button>
          </div>
        </Card>

        {/* Identity */}
        <Card className="p-4 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Agent Identity</h3>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Name</label>
            <Input
              value={agentName}
              onChange={(e) => updateAgentName(e.target.value)}
              placeholder="Pam"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Description</label>
            <textarea
              value={agentDescription}
              onChange={(e) => updateAgentDescription(e.target.value)}
              placeholder="Friendly, calm, helps me stay on top of things."
              rows={2}
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm leading-snug outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            <p className="text-[11px] text-muted-foreground">
              Used in the agent's system prompt. Saved as IDENTITY.md in the bundled openclaw workspace.
            </p>
          </div>
        </Card>

        {/* Web Search */}
        <Card className="p-4 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Web Search</h3>
              <p className="text-xs text-muted-foreground mt-1">
                When enabled, the assistant gets a fast{' '}
                <code className="rounded bg-muted px-1 py-0.5">web_search</code> tool
                (Tavily) for quick public-web lookups (typically 1-3s) — much faster
                than going through the brain. Get a key at{' '}
                <span className="text-foreground">tavily.com</span>.
              </p>
            </div>
            <Toggle checked={tavilyEnabled} onChange={toggleTavilyEnabled} />
          </div>

          <div className={`space-y-1.5 ${tavilyEnabled ? '' : 'opacity-50'}`}>
            <label className="text-xs text-muted-foreground">Tavily API Key</label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  type={showTavilyKey ? 'text' : 'password'}
                  value={tavilyKey}
                  onChange={(e) => updateTavilyKey(e.target.value)}
                  placeholder="tvly-..."
                  className="pr-10"
                  disabled={!tavilyEnabled}
                />
                <button
                  onClick={() => setShowTavilyKey(!showTavilyKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showTavilyKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {!tavilyEnabled
                ? 'web_search disabled. Key is kept for when you re-enable.'
                : tavilyKey
                  ? 'web_search tool will be available next call.'
                  : 'Add a key to enable web_search; the assistant falls back to ask_brain otherwise.'}
            </p>
          </div>
        </Card>

        {/* Model */}
        <Card className="p-4 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Model</h3>
          <div className="space-y-1.5">
            {REALTIME_MODELS.map((m) => {
              return (
                <button
                  key={m}
                  onClick={() => updateModel(m)}
                  className={`w-full flex items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors
                    ${model === m ? 'border-primary bg-accent' : 'border-input'}
                    hover:bg-accent cursor-pointer
                  `}
                >
                  <div className={`h-3.5 w-3.5 rounded-full border-2 flex items-center justify-center
                    ${model === m ? 'border-primary' : 'border-muted-foreground'}
                  `}>
                    {model === m && <div className="h-1.5 w-1.5 rounded-full bg-primary" />}
                  </div>
                  <span className={`text-sm ${model === m ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                    {REALTIME_MODEL_LABELS[m]}
                  </span>
                </button>
              )
            })}
          </div>
        </Card>

        {/* Voice */}
        <Card className="p-4 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Voice</h3>
          <div className="grid grid-cols-2 gap-1.5">
            {(providerForModel(model) === 'gemini'
              ? GEMINI_VOICES
              : providerForModel(model) === 'openai'
                ? OPENAI_VOICES
                : XAI_VOICES
            ).map((v) => {
              const provider = providerForModel(model)
              const label = provider === 'gemini'
                ? GEMINI_VOICE_LABELS[v as typeof GEMINI_VOICES[number]]
                : provider === 'openai'
                  ? OPENAI_VOICE_LABELS[v as typeof OPENAI_VOICES[number]]
                  : XAI_VOICE_LABELS[v as typeof XAI_VOICES[number]]
              const selected = voice === v
              const isPlaying = previewing === v
              return (
                <div
                  key={v}
                  className={`flex items-stretch gap-1 rounded-md border transition-colors
                    ${selected ? 'border-primary bg-accent' : 'border-input'}
                  `}
                >
                  <button
                    onClick={() => updateVoice(v)}
                    className={`flex-1 rounded-l-md px-3 py-2 text-left text-sm transition-colors
                      ${selected ? 'font-medium text-foreground' : 'text-muted-foreground hover:bg-accent'}
                    `}
                  >
                    {label}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      void handleVoicePreview(v)
                    }}
                    disabled={isPlaying}
                    aria-label={`Preview ${v} voice`}
                    title={isPlaying ? 'Playing…' : `Preview ${label}`}
                    className={`flex w-9 items-center justify-center rounded-r-md border-l border-input
                      text-muted-foreground transition-colors hover:bg-background hover:text-foreground
                      disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                  >
                    <Play size={14} className={isPlaying ? 'animate-pulse' : ''} />
                  </button>
                </div>
              )
            })}
          </div>
          {previewError ? (
            <p className="text-xs text-destructive" role="alert">
              {previewError}
            </p>
          ) : null}
        </Card>

        {/* Audio Devices */}
        <Card className="p-4 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Audio Devices</h3>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Input (Microphone)</label>
            <Select
              value={inputDeviceId}
              onChange={(e) => updateInputDevice(e.target.value)}
            >
              <option value="">System Default</option>
              {inputDevices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Output (Speaker)</label>
            <Select
              value={outputDeviceId}
              onChange={(e) => updateOutputDevice(e.target.value)}
            >
              <option value="">System Default</option>
              {outputDevices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Speaker Volume: {volume.toFixed(1)}x</label>
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
            onClick={() => enumerateAudioDevices().then(setAudioDevices)}
          >
            Refresh Devices
          </Button>
        </Card>

        {/* Appearance */}
        <Card className="p-4 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Appearance</h3>
          <div className="flex gap-2">
            {(['dark', 'light', 'system'] as Theme[]).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`flex-1 rounded-md border px-3 py-2 text-sm capitalize transition-colors
                  ${theme === t ? 'border-primary bg-accent font-medium text-foreground' : 'border-input text-muted-foreground hover:bg-accent'}
                `}
              >
                {t}
              </button>
            ))}
          </div>
        </Card>

        {/* Call Bar */}
        <Card className="p-4 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Call Bar</h3>

          <div className="flex items-center justify-between">
            <div className="pr-4">
              <p className="text-sm text-foreground">Show floating call bar during sessions</p>
              <p className="text-xs text-muted-foreground">
                A small always-on-top pill that shows live waveforms while you&apos;re on a call. Drag to reposition.
              </p>
            </div>
            <Toggle checked={callBarEnabled} onChange={toggleCallBar} />
          </div>
        </Card>

        <ShortcutsCard />

        {/* Updates */}
        <Card className="p-4 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Updates</h3>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">Current version</p>
              <p className="text-xs text-muted-foreground">{updateState?.currentVersion ?? '—'}</p>
            </div>
            {updateState?.currentVersion && (
              <a
                href={`https://github.com/yagudaev/voiceclaw/releases/tag/desktop-v${updateState.currentVersion}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
              >
                View release notes
              </a>
            )}
          </div>

          {updateState?.lastChecked && (
            <p className="text-xs text-muted-foreground">
              Last checked: {relativeTime(updateState.lastChecked)}
            </p>
          )}

          {updateState?.status === 'staged' && updateState.stagedVersion && (
            <div className="flex items-center justify-between rounded-md border border-[var(--brand-sage)] bg-[var(--brand-sage-wash)] px-3 py-2">
              <div>
                <p className="text-sm text-foreground font-medium">
                  Update ready: {updateState.stagedVersion}
                </p>
                <p className="text-xs text-muted-foreground">Restart to apply</p>
              </div>
              <Button
                variant="default"
                size="sm"
                onClick={async () => {
                  await window.electronAPI.updates.installNow('settings')
                }}
              >
                Restart now
              </Button>
            </div>
          )}

          {updateState?.status === 'error' && updateState.error && (
            <p className="text-xs text-destructive">{updateState.error}</p>
          )}

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={checkingUpdate || updateState?.status === 'checking' || updateState?.status === 'downloading'}
              onClick={async () => {
                setCheckingUpdate(true)
                try {
                  const next = await window.electronAPI.updates.checkNow()
                  setUpdateState(next)
                } finally {
                  setCheckingUpdate(false)
                }
              }}
            >
              {(checkingUpdate || updateState?.status === 'checking') ? 'Checking…'
                : updateState?.status === 'downloading' ? 'Downloading…'
                : 'Check for updates'}
            </Button>
            {updateState?.status === 'up-to-date' && (
              <span className="text-xs text-muted-foreground">Up to date</span>
            )}
            {updateState?.status === 'downloading' && (
              <span className="text-xs text-muted-foreground">Downloading in background…</span>
            )}
          </div>
        </Card>

        {/* Debug */}
        <Card className="p-4 space-y-4">
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
              <p className="text-xs text-muted-foreground">Display latency badges on chat messages</p>
            </div>
            <Toggle checked={showLatency} onChange={toggleShowLatency} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">Show Context Usage</p>
              <p className="text-xs text-muted-foreground">
                Live token count vs the model&apos;s context window during a call
              </p>
            </div>
            <Toggle checked={showContextUsage} onChange={toggleShowContextUsage} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">Send Traces</p>
              <p className="text-xs text-muted-foreground">Post per-turn latency to Langfuse via relay</p>
            </div>
            <Toggle checked={tracingEnabled} onChange={toggleTracing} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">Re-run onboarding wizard</p>
              <p className="text-xs text-muted-foreground">Resets the wizard cursor so you can step through it again. API keys and sign-in stay.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const result = await onboarding.reset()
                if (result.ok) window.location.reload()
              }}
            >
              Restart
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">Reveal Logs in Finder</p>
              <p className="text-xs text-muted-foreground">Opens ~/Library/Logs/VoiceClaw/ in Finder. Useful when troubleshooting.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { window.electronAPI.logs.reveal() }}
            >
              Reveal
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">Run brain diagnostic</p>
              <p className="text-xs text-muted-foreground">10-point check of the brain pipeline — openclaw, relay, Gemini API, and more.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={runBrainDoctor}
              disabled={doctorRunning}
            >
              {doctorRunning ? (
                <span className="flex items-center gap-1.5">
                  <span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Running…
                </span>
              ) : 'Run'}
            </Button>
          </div>

          {doctorResult && (
            <BrainDoctorPanel
              result={doctorResult}
              copied={doctorCopied}
              onCopy={copyDoctorResults}
            />
          )}

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">Export diagnostic bundle</p>
              <p className="text-xs text-muted-foreground">Bundles logs and config (with API keys redacted) for support. Saved to Downloads.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={exportBundle}
              disabled={exportingBundle}
            >
              {exportingBundle ? (
                <span className="flex items-center gap-1.5">
                  <span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Bundling…
                </span>
              ) : 'Export'}
            </Button>
          </div>

          {bundleToast && (
            <p className={`text-xs ${bundleToast.ok ? 'text-[var(--brand-sage)]' : 'text-destructive'}`}>
              {bundleToast.message}
            </p>
          )}
        </Card>

        {/* Privacy */}
        <Card className="p-4 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Privacy</h3>
          <div className="flex items-center justify-between">
            <div className="pr-4">
              <p className="text-sm text-foreground">Share anonymous diagnostics</p>
              <p className="text-xs text-muted-foreground">
                PostHog telemetry: usage events + crash reports. Never sends voice, transcripts, or API keys.
              </p>
            </div>
            <Toggle checked={telemetryEnabled} onChange={toggleTelemetry} />
          </div>
        </Card>

        {/* Setup Instructions */}
        <Card className="p-4 space-y-2 text-xs text-muted-foreground">
          <p className="font-medium">Setup</p>
          <p>The relay server runs automatically inside VoiceClaw. The active URL is <code className="rounded bg-muted px-1 py-0.5">{serverUrlPlaceholder}</code> — leave the field above blank to use it. Set a custom URL only if you want to point at an external relay.</p>
          <details className="pt-1">
            <summary className="cursor-pointer">Developers: run the relay from source</summary>
            <ol className="list-decimal list-inside space-y-0.5 pt-1">
              <li>From the repo root: <code className="rounded bg-muted px-1 py-0.5">cd relay-server && yarn dev</code></li>
              <li>Paste the printed URL into the field above</li>
              <li>Click Test to verify the connection</li>
            </ol>
          </details>
        </Card>

      </div>
    </div>
  )
}

function showPrivacyPreview(): Promise<{ proceed: boolean; suppress: boolean }> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div')
    overlay.style.cssText =
      'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center'

    const modal = document.createElement('div')
    modal.style.cssText =
      'background:var(--background,#1a1a1a);color:var(--foreground,#fff);border:1px solid var(--border,#333);border-radius:8px;padding:20px;max-width:420px;width:90%;font-family:inherit;font-size:13px;line-height:1.5'

    modal.innerHTML = `
      <p style="font-weight:600;margin-bottom:12px">What goes in the bundle?</p>
      <p style="margin-bottom:6px;color:var(--muted-foreground,#999);font-size:12px">INCLUDED</p>
      <ul style="margin:0 0 12px 16px;padding:0;color:var(--foreground,#fff);font-size:12px">
        <li>App version, platform, OS</li>
        <li>Last 7 days of log files</li>
        <li>OpenClaw config (API keys replaced with &lt;redacted&gt;)</li>
        <li>Workspace file names + sizes (no file contents)</li>
        <li>Database schema only (no message history)</li>
        <li>List of configured provider names (no key values)</li>
        <li>Service health snapshot</li>
      </ul>
      <p style="margin-bottom:6px;color:var(--muted-foreground,#999);font-size:12px">NOT INCLUDED</p>
      <ul style="margin:0 0 16px 16px;padding:0;color:var(--muted-foreground,#999);font-size:12px">
        <li>API keys or auth tokens</li>
        <li>Conversation history or messages</li>
        <li>Workspace file contents</li>
        <li>Audio recordings</li>
      </ul>
      <label style="display:flex;align-items:center;gap:8px;margin-bottom:16px;font-size:12px;cursor:pointer">
        <input type="checkbox" id="diag-suppress" style="cursor:pointer" />
        Don't ask again
      </label>
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button id="diag-cancel" style="padding:6px 14px;border-radius:5px;border:1px solid var(--border,#444);background:transparent;color:var(--foreground,#fff);font-size:13px;cursor:pointer">Cancel</button>
        <button id="diag-ok" style="padding:6px 14px;border-radius:5px;border:none;background:var(--primary,#4a7c59);color:#fff;font-size:13px;cursor:pointer;font-weight:500">Export</button>
      </div>
    `

    overlay.appendChild(modal)
    document.body.appendChild(overlay)

    const cleanup = () => document.body.removeChild(overlay)

    modal.querySelector('#diag-cancel')!.addEventListener('click', () => {
      cleanup()
      resolve({ proceed: false, suppress: false })
    })
    modal.querySelector('#diag-ok')!.addEventListener('click', () => {
      const suppress = (modal.querySelector('#diag-suppress') as HTMLInputElement).checked
      cleanup()
      resolve({ proceed: true, suppress })
    })
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        cleanup()
        resolve({ proceed: false, suppress: false })
      }
    })
  })
}

function relativeTime(ts: number): string {
  const diff = Math.round((Date.now() - ts) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`
  return `${Math.floor(diff / 86400)} days ago`
}

function maskKey(key: string): string {
  if (key.length <= 8) return '••••••••'
  return `${key.slice(0, 4)}…${key.slice(-4)}`
}

function isRealtimeModel(model: string | null): model is RealtimeModel {
  return REALTIME_MODELS.includes(model as RealtimeModel)
}

function normalizeRealtimeModel(model: string | null): RealtimeModel {
  return isRealtimeModel(model) ? model : DEFAULT_REALTIME_MODEL
}

// --- Helper Components ---

type DoctorCheckRow = {
  status: 'PASS' | 'FAIL' | 'SKIP'
  label: string
  detail: string | null
  hint: string | null
}

type DoctorResultShape = {
  checks: DoctorCheckRow[]
  passed: number
  failed: number
  skipped: number
}

function BrainDoctorPanel({
  result,
  copied,
  onCopy,
}: {
  result: DoctorResultShape
  copied: boolean
  onCopy: () => void
}) {
  return (
    <div className="rounded-md border border-input bg-muted/30 overflow-hidden">
      <div className="px-3 py-2 flex items-center justify-between border-b border-input">
        <span className="text-xs font-medium text-foreground">
          {result.passed} passed · {result.failed} failed · {result.skipped} skipped
        </span>
        <Button variant="ghost" size="sm" onClick={onCopy}>
          {copied ? 'Copied!' : 'Copy results'}
        </Button>
      </div>
      <ul className="divide-y divide-input">
        {result.checks.map((check, i) => (
          <li key={i} className="px-3 py-2 space-y-0.5">
            <div className="flex items-center gap-2">
              <span className={`text-sm leading-none ${
                check.status === 'PASS'
                  ? 'text-[var(--brand-sage)]'
                  : check.status === 'FAIL'
                  ? 'text-destructive'
                  : 'text-muted-foreground'
              }`}>
                {check.status === 'PASS' ? '✓' : check.status === 'FAIL' ? '✗' : '–'}
              </span>
              <span className="text-sm text-foreground">{check.label}</span>
            </div>
            {check.status === 'FAIL' && check.hint && (
              <p className="text-xs text-muted-foreground pl-5">{check.hint}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
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
    <div className={`flex items-center justify-between rounded-md border px-3 py-2
      ${status === 'ok' ? 'border-[var(--brand-sage)] bg-[var(--brand-sage-wash)]'
        : status === 'error' ? 'border-destructive/50 bg-destructive/5'
        : 'border-input'}
    `}>
      <div className="flex items-center gap-2">
        {status === 'testing' ? (
          <div className="h-4 w-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
        ) : status === 'ok' ? (
          <Wifi size={16} className="text-[var(--brand-sage)]" />
        ) : (
          <WifiOff size={16} className={status === 'error' ? 'text-destructive' : 'text-muted-foreground'} />
        )}
        <span className={`text-sm ${
          status === 'ok' ? 'text-[var(--brand-sage)]'
          : status === 'error' ? 'text-destructive'
          : 'text-muted-foreground'
        }`}>
          {status === 'ok' ? 'Connected'
          : status === 'testing' ? 'Testing...'
          : status === 'error' ? error
          : 'Not tested'}
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onTest}
        disabled={status === 'testing'}
      >
        Test
      </Button>
    </div>
  )
}
