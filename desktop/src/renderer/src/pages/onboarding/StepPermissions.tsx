import { useCallback, useEffect, useState } from 'react'
import type { ReactElement, SVGProps } from 'react'
import { StepFrame } from './StepFrame'
import {
  permissions,
  type OnboardingPayload,
  type PermissionStatus,
} from '../../lib/onboarding-api'

type PermissionId = 'mic' | 'screen' | 'accessibility'

type Permission = {
  id: PermissionId
  name: string
  purpose: string
  detail: string
  optional: boolean
  icon: (props: SVGProps<SVGSVGElement>) => ReactElement
}

const PERMISSIONS: Permission[] = [
  {
    id: 'mic',
    name: 'Microphone',
    purpose: 'So your words can reach the AI.',
    detail: 'Audio streams directly to the provider you pick. Nothing lingers on our side.',
    optional: false,
    icon: IconMic,
  },
  {
    id: 'screen',
    name: 'Screen Recording',
    purpose: "So the AI can see what you're looking at, when you ask.",
    detail: 'Off until you start a share. The green dot in the menu bar will tell you.',
    optional: true,
    icon: IconScreen,
  },
  {
    id: 'accessibility',
    name: 'Accessibility',
    purpose: 'So push-to-talk works from anywhere.',
    detail:
      "Lets VoiceClaw listen for your hotkey even when another app is focused. Skippable, but recommended.",
    optional: true,
    icon: IconAccessibility,
  },
]

type Props = {
  onContinue?: (patch: OnboardingPayload) => void
  onBack?: () => void
  onSkip?: () => void
  onStartOver?: () => void
  previewMode?: boolean
}

type StatusMap = Record<PermissionId, PermissionStatus | 'granted' | 'denied' | 'unknown'>

const PREVIEW_STATUS: StatusMap = {
  mic: 'granted',
  screen: 'not-determined',
  accessibility: 'denied',
}

export function StepPermissions({
  onContinue,
  onBack,
  onSkip,
  onStartOver,
  previewMode = false,
}: Props) {
  const [statuses, setStatuses] = useState<StatusMap>(
    previewMode
      ? PREVIEW_STATUS
      : { mic: 'unknown', screen: 'unknown', accessibility: 'unknown' },
  )

  const refresh = useCallback(async () => {
    if (previewMode) return
    try {
      const [mic, screen, accessibility] = await Promise.all([
        permissions.getMediaStatus('microphone'),
        permissions.getMediaStatus('screen'),
        permissions.getAccessibility(),
      ])
      setStatuses({
        mic,
        screen,
        accessibility: accessibility ? 'granted' : 'denied',
      })
    } catch (err) {
      console.warn('[onboarding] perm refresh failed', err)
    }
  }, [previewMode])

  // Initial fetch + 1s poll while on this step. Captures permission
  // grants the user makes in System Settings without us having to listen
  // for app focus events explicitly.
  useEffect(() => {
    void refresh()
    if (previewMode) return
    const id = window.setInterval(() => void refresh(), 1000)
    return () => window.clearInterval(id)
  }, [previewMode, refresh])

  const handleAction = async (id: PermissionId, current: PermissionStatus | 'unknown') => {
    if (previewMode) return
    if (id === 'mic' && current === 'not-determined') {
      try {
        await permissions.requestMic()
      } catch (err) {
        console.warn('[onboarding] requestMic failed', err)
      }
      void refresh()
      return
    }
    // For screen / accessibility, and for any denied state, jump straight
    // to the matching pane in System Settings.
    void permissions.openSettings(id)
  }

  // We treat the mic as the only required permission. Screen + a11y can
  // be added later. Allow continue if mic is granted OR not-determined
  // (user can grant mid-flow), and let the user explicitly skip too.
  const micUsable = statuses.mic === 'granted' || statuses.mic === 'not-determined'
  const allHandled = micUsable

  return (
    <StepFrame
      stepIndex={3}
      totalSteps={6}
      eyebrow="03 / Permissions"
      title="A few things the Mac needs from you."
      description="macOS asks once per permission. If you click the wrong thing, we'll send you to the right pane in System Settings — no terminal gymnastics."
      primaryAction={{
        label: 'Continue',
        onClick: () =>
          onContinue?.({
            permissions: {
              mic: normalizeStatus(statuses.mic),
              screen: normalizeStatus(statuses.screen),
              accessibility:
                statuses.accessibility === 'granted'
                  ? 'granted'
                  : statuses.accessibility === 'denied'
                    ? 'denied'
                    : 'unknown',
            },
          }),
        disabled: !allHandled,
      }}
      secondaryAction={{ label: 'Back', onClick: onBack }}
      skipAction={{ label: 'Handle this later', onClick: onSkip }}
      onStartOver={onStartOver}
    >
      <div className="flex flex-col gap-4">
        {PERMISSIONS.map((permission) => (
          <PermissionRow
            key={permission.id}
            permission={permission}
            status={statuses[permission.id] ?? 'unknown'}
            onAction={() => handleAction(permission.id, statuses[permission.id] ?? 'unknown')}
          />
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type DisplayStatus = 'granted' | 'pending' | 'denied'

function PermissionRow({
  permission,
  status,
  onAction,
}: {
  permission: Permission
  status: PermissionStatus | 'unknown'
  onAction: () => void
}) {
  const Icon = permission.icon
  const display = toDisplayStatus(status)
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

      <StatusPill status={display} />
      <ActionButton
        permissionId={permission.id}
        status={status}
        display={display}
        onAction={onAction}
      />
    </div>
  )
}

function StatusPill({ status }: { status: DisplayStatus }) {
  const styles: Record<DisplayStatus, { bg: string; text: string; label: string }> = {
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

function ActionButton({
  permissionId,
  status,
  display,
  onAction,
}: {
  permissionId: PermissionId
  status: PermissionStatus | 'unknown'
  display: DisplayStatus
  onAction: () => void
}) {
  if (display === 'granted') {
    return (
      <span className="w-[170px] text-right text-[13px]" style={{ color: 'var(--muted)' }}>
        ✓ All set
      </span>
    )
  }
  // mic + not-determined → "Allow" (in-app prompt). Everything else
  // (screen, accessibility, anything denied) → System Settings shortcut.
  const inAppRequest = permissionId === 'mic' && status === 'not-determined'
  const label = inAppRequest ? 'Allow' : 'Open System Settings'
  return (
    <button
      onClick={onAction}
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

function toDisplayStatus(status: PermissionStatus | 'unknown'): DisplayStatus {
  if (status === 'granted') return 'granted'
  if (status === 'denied' || status === 'restricted') return 'denied'
  return 'pending'
}

function normalizeStatus(raw: PermissionStatus | 'unknown'): PermissionStatus {
  if (raw === 'unknown') return 'unknown'
  return raw
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
