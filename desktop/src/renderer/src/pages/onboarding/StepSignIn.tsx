import { useEffect, useState } from 'react'
import { StepFrame } from './StepFrame'
import { onboarding, type OnboardingPayload } from '../../lib/onboarding-api'

type Props = {
  onContinue?: (patch: OnboardingPayload) => void
  onBack?: () => void
  onSkip?: () => void
  onStartOver?: () => void
  initialSignedIn?: boolean
  previewMode?: boolean
}

type SignInState =
  | { kind: 'idle' }
  | { kind: 'pending'; provider: 'google' | 'apple' }
  | { kind: 'success'; user: { email?: string | null; name?: string | null } | null }
  | { kind: 'error'; error: string }

export function StepSignIn({
  onContinue,
  onBack,
  onSkip,
  onStartOver,
  initialSignedIn = false,
  previewMode = false,
}: Props) {
  const [state, setState] = useState<SignInState>(
    initialSignedIn ? { kind: 'success', user: null } : { kind: 'idle' },
  )

  // Listen for the deep-link callback from main. The main process redeems
  // the ticket and forwards a friendlier shape to the renderer.
  useEffect(() => {
    if (previewMode) return
    const off = onboarding.onAuthCallback((payload) => {
      if (payload.ok) {
        setState({ kind: 'success', user: payload.user })
      } else {
        setState({ kind: 'error', error: humanizeAuthError(payload.error) })
      }
    })
    return off
  }, [previewMode])

  const handleSignIn = async (provider: 'google' | 'apple') => {
    if (previewMode) {
      setState({ kind: 'success', user: { email: 'preview@voiceclaw.app', name: 'Preview' } })
      return
    }
    setState({ kind: 'pending', provider })
    try {
      await onboarding.startSignIn()
    } catch (err) {
      setState({
        kind: 'error',
        error: err instanceof Error ? err.message : 'Could not open browser.',
      })
    }
  }

  const isSignedIn = state.kind === 'success'

  return (
    <StepFrame
      stepIndex={2}
      totalSteps={6}
      eyebrow="02 / Sign in"
      title="Tell us where to find you."
      description="We use your email to send build updates and reach out when something breaks. Not for marketing, not for training. If you'd rather keep things anonymous, skip this — it's safe."
      primaryAction={{
        label: isSignedIn ? 'Continue' : 'Continue without signing in',
        onClick: () =>
          onContinue?.({
            signedIn: isSignedIn,
            user:
              state.kind === 'success'
                ? {
                    email: state.user?.email ?? null,
                    name: state.user?.name ?? null,
                  }
                : undefined,
          }),
      }}
      secondaryAction={{ label: 'Back', onClick: onBack }}
      skipAction={{ label: 'Skip — use without an account', onClick: onSkip }}
      onStartOver={onStartOver}
    >
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
        <div className="flex flex-col gap-3">
          <AuthButton
            provider="google"
            onClick={() => handleSignIn('google')}
            pending={state.kind === 'pending' && state.provider === 'google'}
          />
          <AuthButton
            provider="apple"
            onClick={() => handleSignIn('apple')}
            pending={state.kind === 'pending' && state.provider === 'apple'}
            disabled
          />

          <p
            className="mt-3 text-[13px] leading-[1.6]"
            style={{ color: 'var(--muted)' }}
          >
            We'll open your browser to finish signing in. You'll come back here
            automatically.
          </p>

          {state.kind === 'pending' ? (
            <StatusLine
              tone="info"
              text={`Waiting for ${state.provider} sign-in to finish in your browser…`}
            />
          ) : null}
          {state.kind === 'error' ? <StatusLine tone="error" text={state.error} /> : null}
          {state.kind === 'success' ? (
            <StatusLine
              tone="ok"
              text={
                state.user?.email
                  ? `Signed in as ${state.user.email}.`
                  : 'Signed in. Welcome aboard.'
              }
            />
          ) : null}
        </div>

        <aside
          className="flex flex-col gap-5 rounded-[22px] border p-6"
          style={{
            borderColor: 'var(--line-strong)',
            backgroundColor: 'var(--panel)',
            boxShadow: 'var(--shadow)',
          }}
        >
          <p
            className="text-[10px] uppercase"
            style={{
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.26em',
              color: 'var(--accent)',
            }}
          >
            What we store
          </p>
          <ul className="space-y-3 text-[14px] leading-[1.6]" style={{ color: 'var(--ink)' }}>
            <li className="flex items-start gap-3">
              <Check /> Your email and name
            </li>
            <li className="flex items-start gap-3">
              <Check /> A device token, hashed, so you stay signed in
            </li>
            <li className="flex items-start gap-3">
              <CrossOut /> Your voice
            </li>
            <li className="flex items-start gap-3">
              <CrossOut /> Your transcripts
            </li>
            <li className="flex items-start gap-3">
              <CrossOut /> Your API keys
            </li>
          </ul>
          <p
            className="rounded-[14px] border px-4 py-3 text-[12px] leading-[1.6]"
            style={{
              borderColor: 'var(--line-strong)',
              color: 'var(--muted)',
              backgroundColor: 'var(--panel-strong)',
              fontFamily: 'var(--font-sans)',
            }}
          >
            <a
              className="underline"
              style={{ color: 'var(--ink)' }}
              href="https://getvoiceclaw.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
            >
              Privacy policy
            </a>{' '}
            ·{' '}
            <a
              className="underline"
              style={{ color: 'var(--ink)' }}
              href="https://getvoiceclaw.com/terms"
              target="_blank"
              rel="noopener noreferrer"
            >
              Terms
            </a>
          </p>
        </aside>
      </div>
    </StepFrame>
  )
}

function AuthButton({
  provider,
  onClick,
  pending = false,
  disabled = false,
}: {
  provider: 'google' | 'apple'
  onClick?: () => void
  pending?: boolean
  disabled?: boolean
}) {
  const label =
    provider === 'google'
      ? pending
        ? 'Opening Google in your browser…'
        : 'Continue with Google'
      : 'Continue with Apple (coming soon)'
  return (
    <button
      onClick={onClick}
      disabled={disabled || pending}
      className="group flex items-center gap-4 rounded-[18px] border px-6 py-4 text-left transition-all hover:-translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
      style={{
        borderColor: 'var(--line-strong)',
        backgroundColor: 'var(--panel)',
        boxShadow: 'var(--shadow)',
      }}
    >
      <span
        className="flex h-10 w-10 items-center justify-center rounded-full border"
        style={{
          borderColor: 'var(--line-strong)',
          backgroundColor: 'var(--panel-strong)',
        }}
      >
        {provider === 'google' ? <GoogleGlyph /> : <AppleGlyph />}
      </span>
      <div className="flex-1">
        <p className="text-[15px] font-medium" style={{ color: 'var(--ink)' }}>
          {label}
        </p>
        <p className="text-[13px]" style={{ color: 'var(--muted)' }}>
          Opens in your browser · signs you back in here
        </p>
      </div>
      <span
        className="text-[11px] uppercase transition-transform group-hover:translate-x-[2px]"
        style={{
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.24em',
          color: 'var(--muted)',
        }}
      >
        →
      </span>
    </button>
  )
}

function StatusLine({ tone, text }: { tone: 'info' | 'ok' | 'error'; text: string }) {
  const color = tone === 'ok' ? '#3f6230' : tone === 'error' ? 'var(--accent)' : 'var(--muted)'
  return (
    <p
      className="rounded-[12px] border px-3 py-2 text-[12px] leading-[1.55]"
      style={{
        borderColor: 'var(--line-strong)',
        backgroundColor: 'var(--panel-strong)',
        color,
        fontFamily: 'var(--font-sans)',
      }}
    >
      {text}
    </p>
  )
}

function humanizeAuthError(raw: string): string {
  if (raw.startsWith('redeem_failed_501')) {
    return "Sign-in isn't fully wired in this build. Skip for now — your keys still work."
  }
  if (raw.startsWith('redeem_failed_410')) return 'That sign-in link already expired. Try again.'
  if (raw.startsWith('redeem_failed_404')) return "That sign-in link wasn't found."
  if (raw === 'safeStorage_unavailable') {
    return 'macOS Keychain is locked. Unlock it and try again.'
  }
  return `Sign-in failed: ${raw}`
}

function Check() {
  return (
    <svg viewBox="0 0 16 16" className="mt-[3px] h-4 w-4 shrink-0" fill="none">
      <circle cx="8" cy="8" r="7" stroke="var(--ink)" strokeWidth="1.25" />
      <path
        d="M5 8.3 7 10.3 11 6"
        stroke="var(--ink)"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CrossOut() {
  return (
    <svg viewBox="0 0 16 16" className="mt-[3px] h-4 w-4 shrink-0" fill="none">
      <circle cx="8" cy="8" r="7" stroke="var(--muted)" strokeWidth="1.25" />
      <path
        d="M5.2 5.2 10.8 10.8"
        stroke="var(--muted)"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  )
}

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.08-1.92 3.28-4.74 3.28-8.07z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09A6.99 6.99 0 0 1 5.47 12c0-.73.13-1.44.37-2.09V7.07H2.18A10.98 10.98 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.08 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  )
}

function AppleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" style={{ color: 'var(--ink)' }}>
      <path d="M16.52 12.72c0-2.95 2.41-4.37 2.52-4.44-1.37-2-3.51-2.28-4.27-2.31-1.82-.18-3.55 1.07-4.48 1.07-.93 0-2.35-1.04-3.87-1.01-1.99.03-3.82 1.16-4.84 2.94-2.06 3.58-.53 8.87 1.48 11.78.98 1.42 2.16 3.02 3.67 2.96 1.47-.06 2.03-.95 3.81-.95 1.78 0 2.28.95 3.83.92 1.59-.03 2.59-1.45 3.56-2.88 1.12-1.65 1.58-3.25 1.61-3.34-.04-.02-3.09-1.19-3.12-4.74zM13.75 4.56c.81-.98 1.36-2.34 1.21-3.7-1.17.05-2.59.78-3.43 1.76-.75.86-1.41 2.24-1.23 3.58 1.31.1 2.64-.66 3.45-1.64z" />
    </svg>
  )
}
