import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Mic, MicOff, Pencil, Volume2, VolumeX } from 'lucide-react'
import { StepFrame } from './StepFrame'
import {
  identityApi,
  userApi,
  type ProviderId,
  type UserProfile,
} from '../../lib/onboarding-api'
import { useRealtime, type AdapterErrorPayload } from '../../lib/use-realtime'
import { getSetting } from '../../lib/db'

const DEFAULT_REALTIME_MODEL = 'gemini-3.1-flash-live-preview'
const DEFAULT_USER_NAME = 'Friend'

type Turn = {
  id: number
  role: 'user' | 'assistant'
  text: string
  isFinal: boolean
}

type CaptureStage = 'awaiting_name' | 'awaiting_bio' | 'done'

type Props = {
  onContinue?: () => void
  onBack?: () => void
  onStartOver?: () => void
  agentName: string
  voice: string
  providerId: ProviderId
  initialUser?: UserProfile
  previewMode?: boolean
}

export function StepIntroduction({
  onContinue,
  onBack,
  onStartOver,
  agentName,
  voice,
  providerId,
  initialUser,
  previewMode = false,
}: Props) {
  const [name, setName] = useState(initialUser?.name && initialUser.name !== DEFAULT_USER_NAME ? initialUser.name : '')
  const [bio, setBio] = useState(initialUser?.bio ?? '')
  const [nameTyping, setNameTyping] = useState(Boolean(initialUser?.name && initialUser.name !== DEFAULT_USER_NAME))
  const [bioTyping, setBioTyping] = useState(Boolean(initialUser?.bio && initialUser.bio.length > 0))
  const [turns, setTurns] = useState<Turn[]>([])
  const [stage, setStage] = useState<CaptureStage>(
    previewMode || (initialUser?.name && initialUser?.bio) ? 'done' : 'awaiting_name',
  )
  const [callError, setCallError] = useState('')
  const [voiceUnavailable, setVoiceUnavailable] = useState(previewMode)
  const [muted, setMuted] = useState(false)
  const [outputMuted, setOutputMuted] = useState(false)
  const [saving, setSaving] = useState(false)
  const turnIdRef = useRef(0)
  const stageRef = useRef<CaptureStage>(stage)
  stageRef.current = stage
  const callbacks = useMemo(
    () => ({
      onTranscriptDelta: (text: string, role: 'user' | 'assistant') => {
        if (!text) return
        setTurns((prev) => updateStreamingTurn(prev, role, text, false, turnIdRef))
      },
      onTranscriptDone: (text: string, role: 'user' | 'assistant') => {
        const trimmed = text.trim()
        if (!trimmed) return
        setTurns((prev) => updateStreamingTurn(prev, role, trimmed, true, turnIdRef))
        if (role !== 'user') return
        if (stageRef.current === 'awaiting_name') {
          const captured = extractFirstName(trimmed)
          if (captured) {
            setName((current) => (current.trim() ? current : captured))
          }
          setStage('awaiting_bio')
        } else if (stageRef.current === 'awaiting_bio') {
          setBio((current) => (current.trim() ? current : trimmed))
          setStage('done')
        }
      },
      onError: (message: string, _code: number, payload?: AdapterErrorPayload) => {
        setCallError(payload?.userMessage ?? message)
      },
      onDisconnect: () => {
        setVoiceUnavailable(true)
      },
    }),
    [],
  )

  const realtime = useRealtime(callbacks)
  const startedRef = useRef(false)

  useEffect(() => {
    if (previewMode) return
    if (startedRef.current) return
    startedRef.current = true
    void (async () => {
      try {
        const apiKey = (await getSetting('realtime_api_key')) ?? ''
        const serverUrl = (await getSetting('realtime_server_url')) || (await defaultRelayUrl())
        if (!apiKey) {
          setVoiceUnavailable(true)
          setCallError('No relay API key configured — voice intro disabled. Type your answers below.')
          return
        }
        const model = (await getSetting('realtime_model')) || DEFAULT_REALTIME_MODEL
        realtime.start({
          serverUrl,
          voice,
          model,
          brainAgent: 'none',
          apiKey,
          systemPromptOverride: buildIntroPrompt(agentName),
          deviceContext: {
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            locale: navigator.language,
            deviceModel: 'Desktop (Electron)',
          },
        })
      } catch (err) {
        setVoiceUnavailable(true)
        setCallError(err instanceof Error ? err.message : 'Could not start voice intro.')
      }
    })()
    return () => {
      realtime.stop()
    }
    // realtime is stable enough across renders — starting it once on mount is the contract.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewMode])

  const handleDone = useCallback(async () => {
    const cleanedName = name.trim() || DEFAULT_USER_NAME
    const cleanedBio = bio.trim()
    if (!previewMode) {
      setSaving(true)
      try {
        await userApi.save({ name: cleanedName, bio: cleanedBio })
      } catch (err) {
        console.warn('[onboarding] user save failed', err)
      } finally {
        setSaving(false)
      }
    }
    realtime.stop()
    onContinue?.()
  }, [name, bio, onContinue, previewMode, realtime])

  const handleSkip = useCallback(async () => {
    if (!previewMode) {
      setSaving(true)
      try {
        await userApi.save({ name: DEFAULT_USER_NAME, bio: '' })
      } catch (err) {
        console.warn('[onboarding] user skip save failed', err)
      } finally {
        setSaving(false)
      }
    }
    realtime.stop()
    onContinue?.()
  }, [onContinue, previewMode, realtime])

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev
      realtime.setMuted(next)
      return next
    })
  }, [realtime])

  const toggleOutputMute = useCallback(() => {
    setOutputMuted((prev) => {
      const next = !prev
      realtime.setOutputMuted(next)
      return next
    })
  }, [realtime])

  const status = computeCallStatus({
    isConnecting: !realtime.isConnected && !voiceUnavailable && !previewMode,
    isReconnecting: realtime.isReconnecting,
    voiceUnavailable,
    stage,
    agentName,
  })

  return (
    <StepFrame
      stepIndex={7}
      totalSteps={7}
      eyebrow="07 / Hello"
      title={`Say hi to ${agentName}.`}
      description="They'll introduce themselves, ask your name, and ask a bit about you. Anything they hear shows up below — fix any typos, then hit Done."
      primaryAction={{
        label: saving ? 'Saving…' : 'Done',
        onClick: () => void handleDone(),
        disabled: saving,
        tone: 'accent',
      }}
      secondaryAction={{ label: 'Back', onClick: onBack }}
      skipAction={{ label: 'Skip for now', onClick: () => void handleSkip() }}
      onStartOver={onStartOver}
      intense
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <CallSurface
          agentName={agentName}
          status={status}
          turns={turns}
          previewMode={previewMode}
          muted={muted}
          outputMuted={outputMuted}
          onToggleMute={toggleMute}
          onToggleOutputMute={toggleOutputMute}
          voiceUnavailable={voiceUnavailable}
        />
        <div className="flex flex-col gap-5">
          <FormField
            label="Your name"
            typing={nameTyping}
            onSwapMode={() => setNameTyping((m) => !m)}
            stage={stage}
            target="awaiting_name"
            highlight={stage === 'awaiting_name' && name.trim().length > 0}
          >
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setNameTyping(true)
              }}
              placeholder={voiceUnavailable ? 'Type your name' : 'Captured from voice…'}
              className="w-full rounded-[14px] border px-4 py-3 text-[15px] outline-none"
              style={{
                borderColor: 'var(--line-strong)',
                backgroundColor: 'var(--panel-strong)',
                color: 'var(--ink)',
              }}
            />
          </FormField>
          <FormField
            label="About you"
            typing={bioTyping}
            onSwapMode={() => setBioTyping((m) => !m)}
            stage={stage}
            target="awaiting_bio"
            highlight={stage === 'awaiting_bio' && bio.trim().length > 0}
          >
            <textarea
              value={bio}
              onChange={(e) => {
                setBio(e.target.value)
                setBioTyping(true)
              }}
              rows={3}
              placeholder={
                voiceUnavailable
                  ? 'A sentence or two about you…'
                  : 'Captured from voice…'
              }
              className="w-full resize-none rounded-[14px] border px-4 py-3 text-[14px] leading-snug outline-none"
              style={{
                borderColor: 'var(--line-strong)',
                backgroundColor: 'var(--panel-strong)',
                color: 'var(--ink)',
              }}
            />
          </FormField>

          <RouteRow
            providerId={providerId}
            voice={voice}
            voiceUnavailable={voiceUnavailable}
            isConnected={realtime.isConnected}
          />

          {callError ? (
            <p className="text-[12px]" style={{ color: 'var(--accent)' }}>
              {callError}
            </p>
          ) : null}
        </div>
      </div>
    </StepFrame>
  )
}

// ---------------------------------------------------------------------------
// Helpers — stage logic and prompt construction
// ---------------------------------------------------------------------------

function buildIntroPrompt(agentName: string): string {
  return [
    `You are ${agentName}, doing first-time onboarding with a brand-new user.`,
    '',
    'Speak the lines in this script in order. Wait for the user to respond between turns.',
    '',
    `Turn 1 (greeting): Say something warm and short like: "Hi! I'm ${agentName}. Nice to meet you — what should I call you?"`,
    '',
    'Turn 2 (after they tell you their name): Acknowledge by name and ask for a brief bio. Example: "Nice to meet you, NAME! Can you tell me a little bit about yourself?"',
    '',
    'Turn 3 (after they share a bio): Wrap up. Example: "Got it — I added that to my notes. Tweak the fields below if anything\'s off, then hit Done whenever you\'re ready."',
    '',
    'Rules:',
    '- Each turn: 1–2 short sentences. Voice mode — keep it tight.',
    '- Do NOT call any tools. You have none.',
    "- Do NOT ask follow-up questions beyond the script. Don't probe their bio.",
    '- Do NOT invent details about the user.',
    '- If the user asks something off-script, redirect gently: "We can dig in once setup is done — first, can you tell me…"',
    '- Begin Turn 1 immediately when the session starts; don\'t wait for the user to speak first.',
  ].join('\n')
}

function extractFirstName(raw: string): string {
  // Pull the most likely first name out of an answer like "I'm Michael" or
  // "My name is Michael Yagudaev" or just "Michael". Strip punctuation,
  // collapse whitespace, take the last alphabetic token of the introducer
  // phrase, capitalize. Falls back to the whole trimmed answer if we can't
  // find anything useful — the user can fix it in the field.
  const cleaned = raw
    .replace(/[.!?,;:"'()]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!cleaned) return ''
  const introducer = cleaned.match(/(?:i'?m|i am|my name is|call me|it'?s|this is)\s+([a-z][a-z' -]*)/i)
  const candidate = introducer?.[1] ?? cleaned
  const firstToken = candidate.split(' ')[0]?.trim() ?? ''
  if (!firstToken) return ''
  return firstToken.charAt(0).toUpperCase() + firstToken.slice(1).toLowerCase()
}

function updateStreamingTurn(
  prev: Turn[],
  role: 'user' | 'assistant',
  text: string,
  done: boolean,
  turnIdRef: { current: number },
): Turn[] {
  // Coalesce successive deltas from the same role into a single bubble. When
  // a final transcript lands, mark it as final and start a fresh bubble for
  // the next turn so deltas from the next speaker don't overwrite history.
  const last = prev[prev.length - 1]
  if (last && !last.isFinal && last.role === role) {
    const next = [...prev]
    next[next.length - 1] = { ...last, text, isFinal: done }
    return next
  }
  turnIdRef.current += 1
  return [...prev, { id: turnIdRef.current, role, text, isFinal: done }]
}

async function defaultRelayUrl(): Promise<string> {
  try {
    const ports = await window.electronAPI?.app?.getServicePorts?.()
    const port = ports?.relay
    if (typeof port === 'number' && port > 0) return `ws://127.0.0.1:${port}/ws`
  } catch {
    // fall through
  }
  return 'ws://localhost:8080/ws'
}

function computeCallStatus(args: {
  isConnecting: boolean
  isReconnecting: boolean
  voiceUnavailable: boolean
  stage: CaptureStage
  agentName: string
}): { label: string; tone: 'connecting' | 'live' | 'done' | 'error' } {
  if (args.voiceUnavailable) return { label: 'Voice unavailable — use the form', tone: 'error' }
  if (args.isReconnecting) return { label: 'Reconnecting…', tone: 'connecting' }
  if (args.isConnecting) return { label: `Calling ${args.agentName}…`, tone: 'connecting' }
  if (args.stage === 'awaiting_name') return { label: 'Listening for your name', tone: 'live' }
  if (args.stage === 'awaiting_bio') return { label: 'Listening for your bio', tone: 'live' }
  return { label: 'All set', tone: 'done' }
}

function statusDot(tone: 'connecting' | 'live' | 'done' | 'error'): string {
  if (tone === 'live') return '#7fb15c'
  if (tone === 'done') return '#7fb15c'
  if (tone === 'error') return 'var(--accent)'
  return 'var(--accent)'
}

// ---------------------------------------------------------------------------
// Helpers — sub-components
// ---------------------------------------------------------------------------

function CallSurface({
  agentName,
  status,
  turns,
  previewMode,
  muted,
  outputMuted,
  onToggleMute,
  onToggleOutputMute,
  voiceUnavailable,
}: {
  agentName: string
  status: { label: string; tone: 'connecting' | 'live' | 'done' | 'error' }
  turns: Turn[]
  previewMode: boolean
  muted: boolean
  outputMuted: boolean
  onToggleMute: () => void
  onToggleOutputMute: () => void
  voiceUnavailable: boolean
}) {
  const previewTurns: Turn[] = previewMode
    ? [
        { id: 1, role: 'assistant', text: `Hi! I'm ${agentName}. Nice to meet you — what should I call you?`, isFinal: true },
        { id: 2, role: 'user', text: 'Michael.', isFinal: true },
        { id: 3, role: 'assistant', text: 'Nice to meet you, Michael! Can you tell me a little bit about yourself?', isFinal: true },
      ]
    : turns

  return (
    <div
      className="relative flex min-h-[420px] flex-col overflow-hidden rounded-[28px] p-7"
      style={{
        backgroundColor: 'var(--ink)',
        color: '#f4ede7',
        boxShadow: '0 24px 60px rgba(25,21,17,0.18)',
      }}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-x-0 top-0 h-[60%] opacity-60"
          style={{
            background:
              'radial-gradient(circle at 50% 0%, rgba(180, 73, 47, 0.35), transparent 58%)',
          }}
        />
      </div>

      <div className="relative flex items-start justify-between">
        <div>
          <p
            className="text-[10px] uppercase"
            style={{
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.28em',
              color: 'rgba(244,237,231,0.55)',
            }}
          >
            Live with {agentName}
          </p>
          <p
            className="mt-3 text-[1.45rem] leading-[1.15]"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            {status.label}
          </p>
        </div>
        <span
          className="flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] uppercase"
          style={{
            borderColor: 'rgba(244,237,231,0.18)',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.22em',
            color: '#f4ede7',
          }}
        >
          <span
            className="h-[6px] w-[6px] rounded-full"
            style={{ backgroundColor: statusDot(status.tone), boxShadow: '0 0 8px var(--accent)' }}
          />
          {status.tone}
        </span>
      </div>

      <div
        className="relative mt-5 flex-1 overflow-y-auto rounded-[18px] border p-4"
        style={{
          borderColor: 'rgba(244,237,231,0.14)',
          backgroundColor: 'rgba(20,16,12,0.45)',
        }}
      >
        <div className="flex flex-col gap-3">
          {previewTurns.length === 0 ? (
            <p
              className="text-[12px]"
              style={{ color: 'rgba(244,237,231,0.55)', fontFamily: 'var(--font-mono)' }}
            >
              {voiceUnavailable
                ? 'Voice intro skipped — fill the fields manually.'
                : 'Waiting for the agent to speak…'}
            </p>
          ) : null}
          {previewTurns.map((turn) => (
            <Bubble key={turn.id} role={turn.role}>
              {turn.text}
            </Bubble>
          ))}
        </div>
      </div>

      <div className="relative mt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onToggleMute}
          disabled={previewMode || voiceUnavailable}
          className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] disabled:opacity-40"
          style={{
            borderColor: 'rgba(244,237,231,0.22)',
            backgroundColor: muted ? 'var(--accent)' : 'rgba(244,237,231,0.08)',
            color: '#f4ede7',
            fontFamily: 'var(--font-mono)',
          }}
          aria-label={muted ? 'Unmute microphone' : 'Mute microphone'}
        >
          {muted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
          {muted ? 'Mic off' : 'Mic on'}
        </button>
        <button
          type="button"
          onClick={onToggleOutputMute}
          disabled={previewMode || voiceUnavailable}
          className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] disabled:opacity-40"
          style={{
            borderColor: 'rgba(244,237,231,0.22)',
            backgroundColor: outputMuted ? 'var(--accent)' : 'rgba(244,237,231,0.08)',
            color: '#f4ede7',
            fontFamily: 'var(--font-mono)',
          }}
          aria-label={outputMuted ? 'Unmute output' : 'Mute output'}
        >
          {outputMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          {outputMuted ? 'Audio off' : 'Audio on'}
        </button>
      </div>
    </div>
  )
}

function Bubble({ role, children }: { role: 'user' | 'assistant'; children: React.ReactNode }) {
  const isUser = role === 'user'
  return (
    <div
      className="flex"
      style={{ justifyContent: isUser ? 'flex-end' : 'flex-start' }}
    >
      <div
        className="max-w-[85%] rounded-[16px] px-3.5 py-2.5 text-[13px] leading-[1.5]"
        style={{
          backgroundColor: isUser ? 'rgba(244,237,231,0.92)' : 'rgba(180, 73, 47, 0.85)',
          color: isUser ? 'var(--ink)' : '#f4ede7',
        }}
      >
        <p
          className="text-[9px] uppercase"
          style={{
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.22em',
            color: isUser ? 'var(--muted)' : 'rgba(244,237,231,0.65)',
          }}
        >
          {isUser ? 'you' : 'agent'}
        </p>
        <p className="mt-1">{children}</p>
      </div>
    </div>
  )
}

function FormField({
  label,
  typing,
  onSwapMode,
  stage,
  target,
  highlight,
  children,
}: {
  label: string
  typing: boolean
  onSwapMode: () => void
  stage: CaptureStage
  target: CaptureStage
  highlight: boolean
  children: React.ReactNode
}) {
  const isActive = stage === target
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span
          className="text-[10px] uppercase"
          style={{
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.24em',
            color: highlight ? 'var(--accent)' : 'var(--accent)',
          }}
        >
          {label}
          {isActive ? ' • listening' : highlight ? ' • captured' : ''}
        </span>
        <button
          type="button"
          onClick={onSwapMode}
          className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em]"
          style={{
            fontFamily: 'var(--font-mono)',
            color: 'var(--muted)',
          }}
        >
          <Pencil className="h-3 w-3" />
          {typing ? 'Voice mode' : 'Type your answer instead'}
        </button>
      </div>
      {children}
    </div>
  )
}

function RouteRow({
  providerId,
  voice,
  voiceUnavailable,
  isConnected,
}: {
  providerId: ProviderId
  voice: string
  voiceUnavailable: boolean
  isConnected: boolean
}) {
  return (
    <div
      className="flex items-center justify-between gap-4 rounded-[18px] border px-5 py-3"
      style={{
        borderColor: 'var(--line-strong)',
        backgroundColor: 'var(--panel)',
      }}
    >
      <div className="flex items-center gap-3">
        <span
          className="text-[10px] uppercase"
          style={{
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.26em',
            color: 'var(--accent)',
          }}
        >
          Route
        </span>
        <span className="text-[12px]" style={{ color: 'var(--ink)' }}>
          {providerLabel(providerId)} · {voice}
        </span>
      </div>
      <span
        className="text-[11px] uppercase"
        style={{
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.22em',
          color: 'var(--muted)',
        }}
      >
        {voiceUnavailable ? 'manual' : isConnected ? 'live' : 'connecting'}
      </span>
    </div>
  )
}

function providerLabel(id: ProviderId): string {
  if (id === 'gemini') return 'Gemini'
  if (id === 'openai') return 'OpenAI'
  return 'Grok'
}

// Re-export for OnboardingWizard to load identity defaults without a new IPC.
export { identityApi }

// Exposed for unit tests.
export { buildIntroPrompt, extractFirstName }
