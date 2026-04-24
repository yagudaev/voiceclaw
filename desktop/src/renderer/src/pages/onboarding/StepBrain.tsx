import { useState } from 'react'
import type { ReactElement, SVGProps } from 'react'
import { StepFrame } from './StepFrame'

type BrainId = 'openclaw' | 'claude' | 'codex' | 'custom'

type Brain = {
  id: BrainId
  name: string
  character: string
  detail: string
  status: 'bundled' | 'detected' | 'not-detected' | 'custom'
  icon: (props: SVGProps<SVGSVGElement>) => ReactElement
  recommended?: boolean
}

const BRAINS: Brain[] = [
  {
    id: 'openclaw',
    name: 'OpenClaw (bundled)',
    character: 'A calm, generalist agent. Does the right thing most of the time.',
    detail: 'Ships inside VoiceClaw. No separate install, no signing in, no extra ports to worry about.',
    status: 'bundled',
    icon: IconBracket,
    recommended: true,
  },
  {
    id: 'claude',
    name: 'Claude Code',
    character: 'The careful one. Great at actual work — code, docs, research.',
    detail: 'Detected at /usr/local/bin/claude. Already signed in as your account.',
    status: 'detected',
    icon: IconC,
  },
  {
    id: 'codex',
    name: 'Codex CLI',
    character: 'Fast, terse, no small talk. OpenAI-flavored thinker.',
    detail: 'Detected at /opt/homebrew/bin/codex.',
    status: 'detected',
    icon: IconSlash,
  },
  {
    id: 'custom',
    name: 'Custom endpoint',
    character: 'Anything that speaks OpenAI-compatible chat completions.',
    detail: 'Bring your own agent. Paste the URL and an auth header if you need one.',
    status: 'custom',
    icon: IconLink,
  },
]

type Props = {
  onContinue?: () => void
  onBack?: () => void
  onStartOver?: () => void
  initialBrain?: BrainId
}

export function StepBrain({ onContinue, onBack, onStartOver, initialBrain = 'openclaw' }: Props) {
  const [selected, setSelected] = useState<BrainId>(initialBrain)
  const [customUrl, setCustomUrl] = useState('')
  const canContinue = selected !== 'custom' || customUrl.length > 10

  return (
    <StepFrame
      stepIndex={5}
      totalSteps={6}
      eyebrow="05 / Brain"
      title="Who's actually doing the thinking?"
      description="The voice you picked last step handles conversation. The brain does the work — answering questions, running tools, remembering context. Pick one. You can switch later."
      primaryAction={{ label: 'Continue', onClick: onContinue, disabled: !canContinue }}
      secondaryAction={{ label: 'Back', onClick: onBack }}
      onStartOver={onStartOver}
    >
      <div className="flex flex-col gap-3">
        {BRAINS.map((brain) => (
          <BrainRow
            key={brain.id}
            brain={brain}
            selected={selected === brain.id}
            onSelect={() => setSelected(brain.id)}
          />
        ))}
      </div>

      {selected === 'custom' ? (
        <div
          className="mt-5 rounded-[22px] border p-5"
          style={{
            borderColor: 'var(--line-strong)',
            backgroundColor: 'var(--panel)',
            boxShadow: 'var(--shadow)',
          }}
        >
          <label
            className="text-[10px] uppercase"
            style={{
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.24em',
              color: 'var(--accent)',
            }}
          >
            Endpoint URL
          </label>
          <input
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            placeholder="http://localhost:18789/v1/chat/completions"
            className="mt-3 w-full rounded-[14px] border px-4 py-3 text-[14px] outline-none"
            style={{
              fontFamily: 'var(--font-mono)',
              borderColor: 'var(--line-strong)',
              backgroundColor: 'var(--panel-strong)',
              color: 'var(--ink)',
            }}
          />
          <p className="mt-3 text-[12px]" style={{ color: 'var(--muted)' }}>
            Must speak the OpenAI chat completions protocol. Streaming responses preferred.
          </p>
        </div>
      ) : null}
    </StepFrame>
  )
}

function BrainRow({
  brain,
  selected,
  onSelect,
}: {
  brain: Brain
  selected: boolean
  onSelect: () => void
}) {
  const Icon = brain.icon
  return (
    <button
      onClick={onSelect}
      className="group flex items-center gap-5 rounded-[20px] border px-5 py-4 text-left transition-all"
      style={{
        borderColor: selected ? 'var(--accent)' : 'var(--line-strong)',
        backgroundColor: selected ? 'var(--accent-soft)' : 'var(--panel)',
        boxShadow: selected ? 'none' : 'var(--shadow)',
      }}
    >
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] border"
        style={{
          borderColor: 'var(--line-strong)',
          backgroundColor: selected ? 'var(--panel-strong)' : 'var(--panel-strong)',
        }}
      >
        <Icon className="h-6 w-6" style={{ color: 'var(--ink)' }} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-[16px] font-medium tracking-[-0.01em]" style={{ color: 'var(--ink)' }}>
            {brain.name}
          </p>
          {brain.recommended ? <Pill label="Recommended" tone="accent" /> : null}
          {brain.status === 'detected' ? <Pill label="Detected on your Mac" tone="ink" /> : null}
          {brain.status === 'bundled' ? <Pill label="Built in" tone="ink" /> : null}
        </div>
        <p className="mt-1 text-[14px]" style={{ color: 'var(--ink)' }}>
          {brain.character}
        </p>
        <p className="mt-1 text-[13px] leading-[1.55]" style={{ color: 'var(--muted)' }}>
          {brain.detail}
        </p>
      </div>

      <RadioDot selected={selected} />
    </button>
  )
}

function Pill({ label, tone }: { label: string; tone: 'accent' | 'ink' }) {
  return (
    <span
      className="rounded-full px-2.5 py-[3px] text-[10px] uppercase"
      style={{
        fontFamily: 'var(--font-mono)',
        letterSpacing: '0.2em',
        color: tone === 'accent' ? 'var(--accent)' : 'var(--muted)',
        backgroundColor: tone === 'accent' ? 'var(--accent-soft)' : 'rgba(25,21,17,0.05)',
      }}
    >
      {label}
    </span>
  )
}

function RadioDot({ selected }: { selected: boolean }) {
  return (
    <span
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[1.5px]"
      style={{ borderColor: selected ? 'var(--accent)' : 'var(--line-strong)' }}
    >
      {selected ? (
        <span className="h-[9px] w-[9px] rounded-full" style={{ backgroundColor: 'var(--accent)' }} />
      ) : null}
    </span>
  )
}

function IconBracket(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path d="M9 5 H5 V19 H9" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 5 H19 V19 H15" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11 8 V16" strokeWidth="1.8" stroke="var(--accent)" strokeLinecap="round" />
      <path d="M13 9 V15" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function IconC(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path d="M18 7a7 7 0 1 0 0 10" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M18 12h-3" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function IconSlash(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path d="M7 19 L17 5" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M5 12h3" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M16 12h3" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function IconLink(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path d="M8 8h-1a4 4 0 0 0 0 8h1" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M16 8h1a4 4 0 0 1 0 8h-1" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M8 12h8" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M11 9h2" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
