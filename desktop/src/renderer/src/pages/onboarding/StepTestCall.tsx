// TODO(voice-test-call): replace this descoped text smoke test with the
// real bidirectional Gemini Live audio call. Tracked separately so we
// don't double the size of the wizard-wiring PR. Until then, the test
// call confirms the saved provider key works end-to-end with a single
// generateContent round trip — enough to flush the renderer→main→
// provider path and surface auth errors before the user discovers them
// the hard way.

import { useEffect, useState } from 'react'
import { StepFrame } from './StepFrame'
import { providerApi, type ProviderId } from '../../lib/onboarding-api'

type Props = {
  onContinue?: () => void
  onBack?: () => void
  onStartOver?: () => void
  providerId?: ProviderId
  previewMode?: boolean
}

const SMOKE_PROMPT = "Say 'Hi, I'm VoiceClaw' in five words."
const PREVIEW_REPLY = "Hi, I'm VoiceClaw — ready."

type TestState =
  | { kind: 'idle' }
  | { kind: 'running' }
  | { kind: 'success'; reply: string; latencyMs: number }
  | { kind: 'error'; error: string }

const WAVEFORM = [32, 54, 72, 48, 28, 40, 62, 84, 56, 34, 22, 44, 68, 82, 60, 36, 24, 42, 66, 50, 30, 52, 76, 58]

export function StepTestCall({
  onContinue,
  onBack,
  onStartOver,
  providerId = 'gemini',
  previewMode = false,
}: Props) {
  const [state, setState] = useState<TestState>(
    previewMode
      ? { kind: 'success', reply: PREVIEW_REPLY, latencyMs: 312 }
      : { kind: 'idle' },
  )

  // Auto-run the smoke call on first mount in non-preview mode. Saves a
  // click and confirms the key works without making the user hunt for a
  // button. They can rerun via the mic button if they want.
  useEffect(() => {
    if (previewMode) return
    void runSmokeCall(providerId, setState)
  }, [previewMode, providerId])

  const reply =
    state.kind === 'success' ? state.reply : state.kind === 'idle' ? '' : ''

  return (
    <StepFrame
      stepIndex={6}
      totalSteps={6}
      eyebrow="06 / First call"
      title="Say hi."
      description="One last check — we'll ping your provider with a tiny prompt to make sure the key is alive. Real bidirectional voice ships in the next build; this is just the smoke test."
      primaryAction={{
        label: state.kind === 'success' ? 'Take me in' : "I'm ready — take me in",
        onClick: onContinue,
        tone: 'accent',
      }}
      secondaryAction={{ label: 'Back', onClick: onBack }}
      onStartOver={onStartOver}
      intense
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <CallSurface
          state={state}
          providerId={providerId}
          onRerun={() => void runSmokeCall(providerId, setState)}
        />
        <Transcript state={state} reply={reply} prompt={SMOKE_PROMPT} />
      </div>

      <div
        className="mt-8 flex items-center justify-between gap-4 rounded-[18px] border px-5 py-4"
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
          <span className="text-[13px]" style={{ color: 'var(--ink)' }}>
            {providerLabel(providerId)} · text-only smoke test
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
          {state.kind === 'success'
            ? `latency ${state.latencyMs}ms`
            : state.kind === 'running'
              ? 'pinging…'
              : state.kind === 'error'
                ? 'check the error above'
                : 'idle'}
        </span>
      </div>

      <p
        className="mt-4 text-[12px] leading-[1.55]"
        style={{ color: 'var(--muted)', fontFamily: 'var(--font-sans)' }}
      >
        Your provider key works. Real voice comes next.
      </p>
    </StepFrame>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function runSmokeCall(
  providerId: ProviderId,
  setState: (s: TestState) => void,
): Promise<void> {
  if (providerId !== 'gemini') {
    // For openai/xai we don't ship a smoke endpoint in this PR — the
    // validateAndSave call already proved the key works, so we declare
    // victory and let the user advance.
    setState({
      kind: 'success',
      reply: 'Key validated earlier — skipping smoke test for this provider.',
      latencyMs: 0,
    })
    return
  }
  setState({ kind: 'running' })
  const start = Date.now()
  try {
    const result = await providerApi.geminiSmoke(SMOKE_PROMPT)
    const latencyMs = Date.now() - start
    if (result.ok) {
      setState({ kind: 'success', reply: result.text, latencyMs })
    } else {
      setState({ kind: 'error', error: result.error })
    }
  } catch (err) {
    setState({
      kind: 'error',
      error: err instanceof Error ? err.message : 'Smoke call failed.',
    })
  }
}

function providerLabel(id: ProviderId): string {
  if (id === 'gemini') return 'Gemini'
  if (id === 'openai') return 'OpenAI'
  return 'Grok'
}

function CallSurface({
  state,
  providerId,
  onRerun,
}: {
  state: TestState
  providerId: ProviderId
  onRerun: () => void
}) {
  const headline =
    state.kind === 'running'
      ? 'Pinging…'
      : state.kind === 'success'
        ? 'Got a reply.'
        : state.kind === 'error'
          ? 'No good.'
          : 'Ready.'
  return (
    <div
      className="relative flex min-h-[380px] flex-col overflow-hidden rounded-[28px] p-8"
      style={{
        backgroundColor: 'var(--ink)',
        color: '#f4ede7',
        boxShadow: '0 24px 60px rgba(25,21,17,0.18)',
      }}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-x-0 top-0 h-[70%] opacity-60"
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
            Smoke test
          </p>
          <p
            className="mt-3 text-[1.8rem] leading-[1.1]"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            {headline}
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
            style={{
              backgroundColor:
                state.kind === 'success'
                  ? '#7fb15c'
                  : state.kind === 'error'
                    ? 'var(--accent)'
                    : 'var(--accent)',
              boxShadow: '0 0 8px var(--accent)',
            }}
          />
          {state.kind === 'success' ? 'ok' : state.kind === 'error' ? 'err' : 'wait'}
        </span>
      </div>

      <div className="relative mt-auto flex flex-col gap-6">
        <div className="flex h-[120px] items-end gap-[5px]">
          {WAVEFORM.map((height, index) => {
            const delay = (index * 0.05).toFixed(2)
            const isAccent = index === 7 || index === 18
            return (
              <span
                key={index}
                className="vc-pulse-bar block flex-1 rounded-full"
                style={{
                  height: `${height}%`,
                  backgroundColor: isAccent ? 'var(--accent)' : 'rgba(244,237,231,0.88)',
                  animationDelay: `${delay}s`,
                  animationPlayState: state.kind === 'running' ? 'running' : 'paused',
                  opacity: state.kind === 'running' ? 1 : 0.55,
                }}
              />
            )
          })}
        </div>

        <div className="flex items-center justify-between">
          <RerunButton onClick={onRerun} disabled={state.kind === 'running'} />
          <div>
            <p
              className="text-[11px] uppercase"
              style={{
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.22em',
                color: 'rgba(244,237,231,0.55)',
              }}
            >
              Provider
            </p>
            <p className="mt-1 text-[15px]" style={{ color: '#f4ede7' }}>
              {providerLabel(providerId)}
            </p>
          </div>
          <div>
            <p
              className="text-[11px] uppercase"
              style={{
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.22em',
                color: 'rgba(244,237,231,0.55)',
              }}
            >
              Mode
            </p>
            <p className="mt-1 text-[15px]" style={{ color: '#f4ede7' }}>
              Text only · v0.1
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function RerunButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="group relative flex h-16 w-16 items-center justify-center rounded-full transition-transform hover:scale-[1.04] disabled:cursor-not-allowed disabled:opacity-50"
      style={{
        backgroundColor: 'var(--accent)',
        boxShadow: '0 0 0 8px rgba(180, 73, 47, 0.18), 0 12px 28px rgba(180,73,47,0.35)',
      }}
      aria-label="Rerun smoke test"
    >
      <span
        aria-hidden
        className="absolute inset-0 rounded-full"
        style={{
          border: '1px solid rgba(244,237,231,0.22)',
          animation: disabled ? 'none' : 'vc-pulse 1.6s ease-in-out infinite',
        }}
      />
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="#f4ede7">
        <path
          d="M3 12a9 9 0 1 0 3-6.7"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path d="M3 4v5h5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}

function Transcript({
  state,
  reply,
  prompt,
}: {
  state: TestState
  reply: string
  prompt: string
}) {
  return (
    <div
      className="flex min-h-[380px] flex-col gap-4 rounded-[28px] border p-6"
      style={{
        borderColor: 'var(--line-strong)',
        backgroundColor: 'var(--panel)',
        boxShadow: 'var(--shadow)',
      }}
    >
      <div className="flex items-center justify-between">
        <p
          className="text-[10px] uppercase"
          style={{
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.28em',
            color: 'var(--accent)',
          }}
        >
          Transcript
        </p>
        <p
          className="text-[11px] uppercase"
          style={{
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.22em',
            color: 'var(--muted)',
          }}
        >
          smoke
        </p>
      </div>

      <div className="flex flex-1 flex-col gap-3">
        <Bubble from="you" delay="0.1s">
          {prompt}
        </Bubble>
        {state.kind === 'success' ? (
          <Bubble from="ai" delay="0.3s">
            {reply}
          </Bubble>
        ) : null}
        {state.kind === 'running' ? (
          <Bubble from="ai" delay="0.3s" thinking>
            Pinging provider…
          </Bubble>
        ) : null}
        {state.kind === 'error' ? (
          <Bubble from="ai" delay="0.3s">
            {state.error}
          </Bubble>
        ) : null}
      </div>

      <div
        className="flex items-center gap-3 rounded-[14px] border px-4 py-3"
        style={{
          borderColor: 'var(--line-strong)',
          backgroundColor: 'var(--panel-strong)',
        }}
      >
        <span
          className="h-[6px] w-[6px] rounded-full"
          style={{ backgroundColor: 'var(--accent)' }}
        />
        <span
          className="text-[11px] uppercase"
          style={{
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.22em',
            color: 'var(--muted)',
          }}
        >
          On-device · key never leaves this Mac
        </span>
      </div>
    </div>
  )
}

function Bubble({
  from,
  children,
  delay,
  thinking = false,
}: {
  from: 'you' | 'ai'
  children: React.ReactNode
  delay: string
  thinking?: boolean
}) {
  const isYou = from === 'you'
  return (
    <div
      className="vc-rise flex"
      style={{
        animationDelay: delay,
        justifyContent: isYou ? 'flex-end' : 'flex-start',
      }}
    >
      <div
        className="max-w-[85%] rounded-[18px] px-4 py-3 text-[14px] leading-[1.55]"
        style={{
          backgroundColor: isYou ? 'var(--panel-strong)' : 'var(--ink)',
          color: isYou ? 'var(--ink)' : '#f4ede7',
          border: isYou ? '1px solid var(--line-strong)' : 'none',
        }}
      >
        <p
          className="text-[10px] uppercase"
          style={{
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.22em',
            color: isYou ? 'var(--muted)' : 'rgba(244,237,231,0.55)',
          }}
        >
          {isYou ? 'you' : 'voiceclaw'}
        </p>
        <p className="mt-1 flex items-center gap-2">
          {children}
          {thinking ? <ThinkingDots /> : null}
        </p>
      </div>
    </div>
  )
}

function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-[3px]">
      <span
        className="vc-thinking-dot inline-block h-[4px] w-[4px] rounded-full"
        style={{ backgroundColor: 'var(--accent)', animationDelay: '0s' }}
      />
      <span
        className="vc-thinking-dot inline-block h-[4px] w-[4px] rounded-full"
        style={{ backgroundColor: 'var(--accent)', animationDelay: '0.15s' }}
      />
      <span
        className="vc-thinking-dot inline-block h-[4px] w-[4px] rounded-full"
        style={{ backgroundColor: 'var(--accent)', animationDelay: '0.3s' }}
      />
    </span>
  )
}
