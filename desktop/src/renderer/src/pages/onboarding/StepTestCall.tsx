import { StepFrame } from './StepFrame'

type Props = {
  onContinue?: () => void
  onBack?: () => void
  onStartOver?: () => void
}

const WAVEFORM = [32, 54, 72, 48, 28, 40, 62, 84, 56, 34, 22, 44, 68, 82, 60, 36, 24, 42, 66, 50, 30, 52, 76, 58]

export function StepTestCall({ onContinue, onBack, onStartOver }: Props) {
  return (
    <StepFrame
      stepIndex={6}
      totalSteps={6}
      eyebrow="06 / First call"
      title="Say hi."
      description="Tap the mic. Speak naturally — nothing fancy, just the kind of thing you'd say to a thoughtful colleague. VoiceClaw will listen, think, and talk back."
      primaryAction={{ label: "I'm ready — take me in", onClick: onContinue, tone: 'accent' }}
      secondaryAction={{ label: 'Back', onClick: onBack }}
      onStartOver={onStartOver}
      intense
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <CallSurface />
        <Transcript />
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
            Gemini Live · bundled OpenClaw
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
          latency 182ms · first byte 310ms
        </span>
      </div>
    </StepFrame>
  )
}

function CallSurface() {
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
            Live call
          </p>
          <p
            className="mt-3 text-[1.8rem] leading-[1.1]"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            Listening…
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
            style={{ backgroundColor: 'var(--accent)', boxShadow: '0 0 8px var(--accent)' }}
          />
          rec
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
                }}
              />
            )
          })}
        </div>

        <div className="flex items-center justify-between">
          <MicButton />
          <div>
            <p
              className="text-[11px] uppercase"
              style={{
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.22em',
                color: 'rgba(244,237,231,0.55)',
              }}
            >
              Voice
            </p>
            <p className="mt-1 text-[15px]" style={{ color: '#f4ede7' }}>
              Gemini · Zephyr
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
              Mic
            </p>
            <p className="mt-1 text-[15px]" style={{ color: '#f4ede7' }}>
              MacBook Pro
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function MicButton() {
  return (
    <button
      className="group relative flex h-16 w-16 items-center justify-center rounded-full transition-transform hover:scale-[1.04]"
      style={{
        backgroundColor: 'var(--accent)',
        boxShadow: '0 0 0 8px rgba(180, 73, 47, 0.18), 0 12px 28px rgba(180,73,47,0.35)',
      }}
      aria-label="Start call"
    >
      <span
        aria-hidden
        className="absolute inset-0 rounded-full"
        style={{
          border: '1px solid rgba(244,237,231,0.22)',
          animation: 'vc-pulse 1.6s ease-in-out infinite',
        }}
      />
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="#f4ede7">
        <rect x="9" y="3" width="6" height="11" rx="3" strokeWidth="1.8" />
        <path d="M6 11v1a6 6 0 0 0 12 0v-1" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M12 18v3" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M9 21h6" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </button>
  )
}

function Transcript() {
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
          live
        </p>
      </div>

      <div className="flex flex-1 flex-col gap-3">
        <Bubble from="you" delay="0.1s">
          Hey VoiceClaw. Can you hear me alright?
        </Bubble>
        <Bubble from="ai" delay="0.9s">
          Loud and clear, Michael. Nice to meet you.
        </Bubble>
        <Bubble from="you" delay="1.8s">
          Great. Quick sanity check — what time is it in Toronto right now?
        </Bubble>
        <Bubble from="ai" delay="2.6s" thinking>
          Thinking through brain…
        </Bubble>
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
          On-device · never leaves this Mac
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
