import type { ReactNode } from 'react'
import { Mark } from './Mark'

export type StepFrameProps = {
  stepIndex: number
  totalSteps: number
  eyebrow: string
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  primaryAction?: {
    label: string
    onClick?: () => void
    disabled?: boolean
    tone?: 'accent' | 'ink'
  }
  secondaryAction?: {
    label: string
    onClick?: () => void
  }
  skipAction?: {
    label: string
    onClick?: () => void
  }
  onStartOver?: () => void
  intense?: boolean
}

export function StepFrame({
  stepIndex,
  totalSteps,
  eyebrow,
  title,
  description,
  children,
  primaryAction,
  secondaryAction,
  skipAction,
  onStartOver,
  intense = false,
}: StepFrameProps) {
  return (
    <div
      className="voiceclaw-brand relative flex h-screen min-h-[680px] flex-col overflow-hidden"
      style={{ fontFamily: 'var(--font-sans)' }}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 vc-grid-wash" />
      <div aria-hidden className="pointer-events-none absolute inset-0 vc-vignette" />

      <TopBar
        stepIndex={stepIndex}
        totalSteps={totalSteps}
        onStartOver={onStartOver}
        intense={intense}
      />

      <main className="relative flex flex-1 flex-col overflow-y-auto px-14 pb-6 pt-3">
        <div className="mx-auto flex w-full max-w-[960px] flex-1 flex-col">
          <header className="vc-rise">
            <p
              className="text-[10px] uppercase"
              style={{
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.28em',
                color: 'var(--accent)',
              }}
            >
              {eyebrow}
            </p>
            <h1
              className="mt-3 max-w-[780px] text-[clamp(2rem,4.6vw,3.1rem)] leading-[1.02] tracking-[-0.045em]"
              style={{ fontFamily: 'var(--font-serif)', color: 'var(--ink)' }}
            >
              {title}
            </h1>
            {description ? (
              <p
                className="mt-4 max-w-[640px] text-[1rem] leading-[1.6]"
                style={{ color: 'var(--muted)' }}
              >
                {description}
              </p>
            ) : null}
          </header>

          <div className="mt-7 flex-1 vc-rise" style={{ animationDelay: '0.08s' }}>
            {children}
          </div>
        </div>
      </main>

      <ActionBar
        primary={primaryAction}
        secondary={secondaryAction}
        skip={skipAction}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function TopBar({
  stepIndex,
  totalSteps,
  onStartOver,
  intense,
}: {
  stepIndex: number
  totalSteps: number
  onStartOver?: () => void
  intense: boolean
}) {
  return (
    <div
      className="drag-region relative flex h-12 shrink-0 items-center justify-between border-b pl-[92px] pr-6"
      style={{ borderColor: 'var(--line)' }}
    >
      <div className="flex items-center gap-3">
        <Mark className="h-[22px] w-[22px]" />
        <span
          className="text-[11px] uppercase"
          style={{
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.3em',
            color: 'var(--ink)',
          }}
        >
          VoiceClaw
        </span>
      </div>

      <div className="no-drag flex items-center gap-6">
        <StepIndicator stepIndex={stepIndex} totalSteps={totalSteps} intense={intense} />
        {onStartOver ? (
          <button
            onClick={onStartOver}
            className="text-[11px] uppercase transition-colors hover:opacity-70"
            style={{
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.24em',
              color: 'var(--muted)',
            }}
          >
            Start over
          </button>
        ) : null}
      </div>
    </div>
  )
}

function StepIndicator({
  stepIndex,
  totalSteps,
  intense,
}: {
  stepIndex: number
  totalSteps: number
  intense: boolean
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="text-[11px] uppercase"
        style={{
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.22em',
          color: 'var(--muted)',
        }}
      >
        {String(stepIndex).padStart(2, '0')} / {String(totalSteps).padStart(2, '0')}
      </span>
      <div className="flex items-center gap-[6px]">
        {Array.from({ length: totalSteps }).map((_, index) => {
          const isCurrent = index === stepIndex - 1
          const isDone = index < stepIndex - 1
          return (
            <span
              key={index}
              className="h-[6px] transition-all"
              style={{
                width: isCurrent ? 18 : 6,
                borderRadius: 999,
                backgroundColor: isCurrent
                  ? intense
                    ? 'var(--accent)'
                    : 'var(--ink)'
                  : isDone
                    ? 'var(--muted)'
                    : 'var(--line-strong)',
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

function ActionBar({
  primary,
  secondary,
  skip,
}: {
  primary?: StepFrameProps['primaryAction']
  secondary?: StepFrameProps['secondaryAction']
  skip?: StepFrameProps['skipAction']
}) {
  if (!primary && !secondary && !skip) return null
  return (
    <div
      className="relative flex shrink-0 items-center justify-between gap-4 border-t px-14 py-5"
      style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}
    >
      <div>
        {secondary ? (
          <button
            onClick={secondary.onClick}
            className="rounded-full border px-5 py-2 text-sm transition-colors hover:bg-white/60"
            style={{
              fontFamily: 'var(--font-sans)',
              borderColor: 'var(--line-strong)',
              color: 'var(--ink)',
            }}
          >
            {secondary.label}
          </button>
        ) : null}
      </div>
      <div className="flex items-center gap-4">
        {skip ? (
          <button
            onClick={skip.onClick}
            className="text-[13px] transition-opacity hover:opacity-70"
            style={{ color: 'var(--muted)', fontFamily: 'var(--font-sans)' }}
          >
            {skip.label}
          </button>
        ) : null}
        {primary ? (
          <button
            onClick={primary.onClick}
            disabled={primary.disabled}
            className="rounded-full px-7 py-[10px] text-[14px] font-medium transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              backgroundColor:
                primary.tone === 'accent' ? 'var(--accent)' : 'var(--ink)',
              color: '#fdfaf4',
              fontFamily: 'var(--font-sans)',
              letterSpacing: '-0.005em',
            }}
          >
            {primary.label}
          </button>
        ) : null}
      </div>
    </div>
  )
}
