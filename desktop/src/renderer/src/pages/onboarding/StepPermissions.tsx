import type { ReactElement, SVGProps } from 'react'
import { StepFrame } from './StepFrame'

type PermissionStatus = 'pending' | 'granted' | 'denied'

type Permission = {
  id: 'mic' | 'screen' | 'accessibility'
  name: string
  purpose: string
  detail: string
  status: PermissionStatus
  icon: (props: SVGProps<SVGSVGElement>) => ReactElement
}

const PERMISSIONS: Permission[] = [
  {
    id: 'mic',
    name: 'Microphone',
    purpose: 'So your words can reach the AI.',
    detail: 'Audio streams directly to the provider you pick. Nothing lingers on our side.',
    status: 'granted',
    icon: IconMic,
  },
  {
    id: 'screen',
    name: 'Screen Recording',
    purpose: "So the AI can see what you're looking at, when you ask.",
    detail: 'Off until you start a share. The green dot in the menu bar will tell you.',
    status: 'pending',
    icon: IconScreen,
  },
  {
    id: 'accessibility',
    name: 'Accessibility',
    purpose: 'So push-to-talk works from anywhere.',
    detail: 'Lets VoiceClaw listen for your hotkey even when another app is focused.',
    status: 'denied',
    icon: IconAccessibility,
  },
]

type Props = {
  onContinue?: () => void
  onBack?: () => void
  onSkip?: () => void
  onStartOver?: () => void
}

export function StepPermissions({ onContinue, onBack, onSkip, onStartOver }: Props) {
  const allHandled = PERMISSIONS.every((p) => p.status !== 'pending')
  return (
    <StepFrame
      stepIndex={3}
      totalSteps={6}
      eyebrow="03 / Permissions"
      title="A few things the Mac needs from you."
      description="macOS asks once per permission. If you click the wrong thing, we'll send you to the right pane in System Settings — no terminal gymnastics."
      primaryAction={{ label: 'Continue', onClick: onContinue, disabled: !allHandled }}
      secondaryAction={{ label: 'Back', onClick: onBack }}
      skipAction={{ label: 'Handle this later', onClick: onSkip }}
      onStartOver={onStartOver}
    >
      <div className="flex flex-col gap-4">
        {PERMISSIONS.map((permission) => (
          <PermissionRow key={permission.id} permission={permission} />
        ))}
      </div>

      <div
        className="mt-8 flex items-start gap-4 rounded-[18px] border px-5 py-4"
        style={{
          borderColor: 'var(--line-strong)',
          backgroundColor: 'var(--panel)',
        }}
      >
        <span
          className="mt-[2px] text-[11px] uppercase"
          style={{
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.22em',
            color: 'var(--accent)',
          }}
        >
          Note
        </span>
        <p className="text-[13px] leading-[1.65]" style={{ color: 'var(--muted)' }}>
          You can revoke any of these in <strong style={{ color: 'var(--ink)' }}>System Settings → Privacy &
          Security</strong> at any time. VoiceClaw will degrade gracefully — you just
          lose the features that needed them.
        </p>
      </div>
    </StepFrame>
  )
}

function PermissionRow({ permission }: { permission: Permission }) {
  const Icon = permission.icon
  return (
    <div
      className="flex items-center gap-5 rounded-[18px] border px-5 py-4"
      style={{
        borderColor: 'var(--line-strong)',
        backgroundColor: 'var(--panel)',
        boxShadow: 'var(--shadow)',
      }}
    >
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] border"
        style={{
          borderColor: 'var(--line-strong)',
          backgroundColor: 'var(--panel-strong)',
        }}
      >
        <Icon className="h-6 w-6" style={{ color: 'var(--ink)' }} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-3">
          <p className="text-[16px] font-medium tracking-[-0.01em]" style={{ color: 'var(--ink)' }}>
            {permission.name}
          </p>
          <p className="text-[13px]" style={{ color: 'var(--muted)' }}>
            {permission.purpose}
          </p>
        </div>
        <p className="mt-1 text-[13px] leading-[1.55]" style={{ color: 'var(--muted)' }}>
          {permission.detail}
        </p>
      </div>

      <StatusPill status={permission.status} />
      <ActionButton status={permission.status} />
    </div>
  )
}

function StatusPill({ status }: { status: PermissionStatus }) {
  const styles: Record<PermissionStatus, { bg: string; text: string; label: string }> = {
    granted: {
      bg: 'rgba(97, 145, 79, 0.14)',
      text: '#3f6230',
      label: 'Granted',
    },
    pending: {
      bg: 'rgba(25,21,17,0.08)',
      text: 'var(--muted)',
      label: 'Needed',
    },
    denied: {
      bg: 'var(--accent-soft)',
      text: 'var(--accent)',
      label: 'Denied',
    },
  }
  const s = styles[status]
  return (
    <span
      className="rounded-full px-3 py-1 text-[10px] uppercase"
      style={{
        fontFamily: 'var(--font-mono)',
        letterSpacing: '0.22em',
        color: s.text,
        backgroundColor: s.bg,
      }}
    >
      {s.label}
    </span>
  )
}

function ActionButton({ status }: { status: PermissionStatus }) {
  if (status === 'granted') {
    return (
      <span className="w-[170px] text-right text-[13px]" style={{ color: 'var(--muted)' }}>
        ✓ All set
      </span>
    )
  }
  const label = status === 'denied' ? 'Open System Settings' : 'Allow'
  return (
    <button
      className="rounded-full border px-5 py-[8px] text-[13px] font-medium transition-colors hover:bg-white/70"
      style={{
        borderColor: 'var(--line-strong)',
        backgroundColor: 'var(--panel-strong)',
        color: 'var(--ink)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {label}
    </button>
  )
}

function IconMic(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <rect x="8" y="3" width="8" height="11" rx="4" strokeWidth="1.6" />
      <path d="M6 11.5V12a6 6 0 0 0 12 0v-.5" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12 18v3" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M9 21h6" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M15.5 7.5v2.5" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function IconScreen(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <rect x="3" y="4" width="18" height="13" rx="2" strokeWidth="1.6" />
      <path d="M8 21h8" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12 17v4" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="18" cy="8" r="1" fill="var(--accent)" stroke="none" />
    </svg>
  )
}

function IconAccessibility(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <circle cx="12" cy="5" r="1.6" strokeWidth="1.6" />
      <path d="M5 9h14" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M9 9v3l-2 8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 9v3l2 8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 12h6" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
