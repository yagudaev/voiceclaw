import { StepFrame } from './StepFrame'
import { Mark } from './Mark'

type Props = {
  onContinue?: () => void
  onStartOver?: () => void
}

export function StepWelcome({ onContinue, onStartOver }: Props) {
  return (
    <StepFrame
      stepIndex={1}
      totalSteps={6}
      eyebrow="01 / Welcome"
      title={
        <>
          Voice for the agent
          <br />
          you already trust.
        </>
      }
      description="VoiceClaw lives on this Mac, keeps your keys in the Keychain, and never routes your audio through anyone you didn't pick. About four minutes to set up."
      primaryAction={{ label: "Let's set up", onClick: onContinue }}
      onStartOver={onStartOver}
    >
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <aside
          className="relative flex flex-col justify-between overflow-hidden rounded-[24px] border p-8"
          style={{
            borderColor: 'var(--line-strong)',
            backgroundColor: 'var(--panel)',
            boxShadow: 'var(--shadow)',
          }}
        >
          <div>
            <p
              className="text-[10px] uppercase"
              style={{
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.26em',
                color: 'var(--accent)',
              }}
            >
              Thesis
            </p>
            <p
              className="mt-4 max-w-[380px] text-[1.5rem] leading-[1.2] tracking-[-0.025em]"
              style={{ fontFamily: 'var(--font-serif)', color: 'var(--ink)' }}
            >
              A thin voice layer. Your brain does the thinking. Your phone, your Mac, your call.
            </p>
          </div>

          <div className="mt-8 flex items-center gap-4 rounded-[16px] border p-4" style={{ borderColor: 'var(--line-strong)', backgroundColor: 'var(--panel-strong)' }}>
            <div className="rounded-[12px] border p-2.5" style={{ borderColor: 'var(--line-strong)', backgroundColor: 'var(--paper)' }}>
              <Mark className="h-10 w-10" accent />
            </div>
            <div>
              <p
                className="text-[10px] uppercase"
                style={{
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.22em',
                  color: 'var(--muted)',
                }}
              >
                Six steps · about four minutes
              </p>
              <p className="mt-1 text-[13px] leading-[1.55]" style={{ color: 'var(--ink)' }}>
                Stop anytime. We'll resume where you left off.
              </p>
            </div>
          </div>
        </aside>

        <div className="flex flex-col gap-2">
          <Beat
            eyebrow="01"
            title="Sign in (optional)"
            description="Email only. We'll never share your voice."
          />
          <Beat
            eyebrow="02"
            title="Permissions"
            description="Mic, screen, accessibility — all in one screen."
          />
          <Beat
            eyebrow="03"
            title="Voice + brain"
            description="Paste one key, pick the agent that thinks behind it."
          />
          <Beat
            eyebrow="04"
            title="Say hi"
            description="First real call. You'll hear it back in a second or two. That's the whole bet."
            accent
          />
        </div>
      </div>
    </StepFrame>
  )
}

function Beat({
  eyebrow,
  title,
  description,
  accent = false,
}: {
  eyebrow: string
  title: string
  description: string
  accent?: boolean
}) {
  return (
    <div
      className="flex items-start gap-4 rounded-[16px] border px-4 py-3"
      style={{
        borderColor: 'var(--line-strong)',
        backgroundColor: accent ? 'var(--accent-soft)' : 'var(--panel)',
        boxShadow: accent ? 'none' : 'var(--shadow)',
      }}
    >
      <span
        className="mt-1 text-[11px] uppercase"
        style={{
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.22em',
          color: accent ? 'var(--accent)' : 'var(--muted)',
        }}
      >
        {eyebrow}
      </span>
      <div>
        <p
          className="text-[15px] font-medium tracking-[-0.01em]"
          style={{ color: 'var(--ink)' }}
        >
          {title}
        </p>
        <p
          className="mt-1 text-[14px] leading-[1.55]"
          style={{ color: 'var(--muted)' }}
        >
          {description}
        </p>
      </div>
    </div>
  )
}
