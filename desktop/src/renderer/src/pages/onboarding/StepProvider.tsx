import { useEffect, useState } from 'react'
import { Cloud, Eye, EyeOff, Key } from 'lucide-react'
import { StepFrame } from './StepFrame'
import {
  cloudApi,
  providerApi,
  type AccessMode,
  type CloudUserInfo,
  type OnboardingPayload,
  type ProviderId,
} from '../../lib/onboarding-api'

type Provider = {
  id: ProviderId
  name: string
  tagline: string
  detail: string
  keyLink: string
  keyLinkLabel: string
  placeholder: string
  prefix: string
  freeTier: string
}

const PROVIDERS: Provider[] = [
  {
    id: 'gemini',
    name: 'Gemini Live',
    tagline: 'Google · Recommended',
    detail: 'Warm, fast, handles long contexts with ease. Free tier is generous.',
    keyLink: 'https://aistudio.google.com/apikey',
    keyLinkLabel: 'Get a key at aistudio.google.com',
    placeholder: 'AIza...',
    prefix: 'AIza',
    freeTier: 'Free tier available',
  },
  {
    id: 'xai',
    name: 'Grok Voice',
    tagline: 'xAI',
    detail: 'Snappy, opinionated, unmistakably Grok. A newer model, less boring.',
    keyLink: 'https://console.x.ai',
    keyLinkLabel: 'Get a key at console.x.ai',
    placeholder: 'xai-...',
    prefix: 'xai-',
    freeTier: 'Pay-as-you-go',
  },
]

type ValidationState =
  | { kind: 'empty' }
  | { kind: 'typing' }
  | { kind: 'validating' }
  | { kind: 'valid' }
  | { kind: 'invalid'; error: string }

type CloudState =
  | { kind: 'unknown' }
  | { kind: 'not-signed-in' }
  | { kind: 'verifying' }
  | { kind: 'verified'; me: CloudUserInfo }
  | { kind: 'error'; error: string }

type Props = {
  onContinue?: (patch: OnboardingPayload) => void
  onBack?: () => void
  onStartOver?: () => void
  initialProvider?: ProviderId
  initialAccessMode?: AccessMode
  previewMode?: boolean
}

export function StepProvider({
  onContinue,
  onBack,
  onStartOver,
  initialProvider = 'gemini',
  initialAccessMode = 'byo-key',
  previewMode = false,
}: Props) {
  const [accessMode, setAccessMode] = useState<AccessMode>(initialAccessMode)
  const [selected, setSelected] = useState<ProviderId>(
    PROVIDERS.some((p) => p.id === initialProvider) ? initialProvider : 'gemini',
  )
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [validation, setValidation] = useState<ValidationState>({ kind: 'empty' })
  const [cloudState, setCloudState] = useState<CloudState>({ kind: 'unknown' })
  const active = PROVIDERS.find((p) => p.id === selected) ?? PROVIDERS[0]

  useEffect(() => {
    if (previewMode) return
    if (accessMode !== 'cloud') return
    if (cloudState.kind !== 'unknown') return
    void verifyCloud()
  }, [accessMode, cloudState.kind, previewMode])

  const verifyCloud = async () => {
    setCloudState({ kind: 'verifying' })
    try {
      const status = await cloudApi.getStatus()
      if (!status.signedIn) {
        setCloudState({ kind: 'not-signed-in' })
        return
      }
      const result = await cloudApi.fetchMe()
      if (!result.ok) {
        if (result.status === 401) {
          setCloudState({ kind: 'not-signed-in' })
          return
        }
        setCloudState({
          kind: 'error',
          error: result.error || `Server returned ${result.status}`,
        })
        return
      }
      setCloudState({ kind: 'verified', me: result.value })
    } catch (err) {
      setCloudState({
        kind: 'error',
        error: err instanceof Error ? err.message : 'Could not reach VoiceClaw Cloud.',
      })
    }
  }

  const handleKeyChange = (key: string) => {
    setApiKey(key)
    if (key.length === 0) {
      setValidation({ kind: 'empty' })
    } else {
      setValidation({ kind: 'typing' })
    }
  }

  const handleValidate = async () => {
    if (apiKey.length < 8) {
      setValidation({ kind: 'invalid', error: 'Key looks too short.' })
      return
    }
    if (previewMode) {
      setValidation({ kind: 'valid' })
      return
    }
    setValidation({ kind: 'validating' })
    try {
      const result = await providerApi.validateAndSave(selected, apiKey)
      if (result.ok) {
        setValidation({ kind: 'valid' })
      } else {
        setValidation({ kind: 'invalid', error: result.error })
      }
    } catch (err) {
      setValidation({
        kind: 'invalid',
        error: err instanceof Error ? err.message : 'Validation failed.',
      })
    }
  }

  const handleContinue = async () => {
    if (accessMode === 'cloud') {
      if (cloudState.kind === 'verified') {
        onContinue?.({ accessMode: 'cloud', cloudVerified: true, provider: 'gemini' })
      } else {
        await verifyCloud()
      }
      return
    }
    if (validation.kind !== 'valid') {
      await handleValidate()
      return
    }
    onContinue?.({ accessMode: 'byo-key', provider: selected, providerKeyValidated: true })
  }

  const cloudReady = cloudState.kind === 'verified'
  const cloudBusy = cloudState.kind === 'verifying'

  const continueLabel = (() => {
    if (accessMode === 'cloud') {
      if (cloudReady) return 'Continue'
      if (cloudBusy) return 'Checking…'
      if (cloudState.kind === 'not-signed-in') return 'Sign in first'
      return 'Verify + continue'
    }
    if (validation.kind === 'valid') return 'Continue'
    if (validation.kind === 'validating') return 'Checking…'
    return 'Validate + continue'
  })()

  const continueDisabled = (() => {
    if (accessMode === 'cloud') {
      return cloudBusy || cloudState.kind === 'not-signed-in'
    }
    return validation.kind === 'validating' || apiKey.length === 0
  })()

  return (
    <StepFrame
      stepIndex={4}
      totalSteps={6}
      eyebrow="04 / Voice provider"
      title="Pick a voice. Paste a key."
      description="Run on VoiceClaw Cloud (free trial, no key needed) or bring your own provider key. Keys go straight into macOS Keychain — VoiceClaw never sees them."
      primaryAction={{
        label: continueLabel,
        onClick: () => void handleContinue(),
        disabled: continueDisabled,
      }}
      secondaryAction={{ label: 'Back', onClick: onBack }}
      onStartOver={onStartOver}
    >
      <div className="mb-5 grid gap-3 md:grid-cols-2">
        <AccessModeCard
          mode="cloud"
          selected={accessMode === 'cloud'}
          onSelect={() => setAccessMode('cloud')}
        />
        <AccessModeCard
          mode="byo-key"
          selected={accessMode === 'byo-key'}
          onSelect={() => setAccessMode('byo-key')}
        />
      </div>

      {accessMode === 'cloud' ? (
        <CloudPanel state={cloudState} onRetry={() => void verifyCloud()} />
      ) : (
        <>
      <div className="grid gap-3 md:grid-cols-2">
        {PROVIDERS.map((provider) => (
          <ProviderCard
            key={provider.id}
            provider={provider}
            selected={selected === provider.id}
            onSelect={() => {
              setSelected(provider.id)
              setApiKey('')
              setShowKey(false)
              setValidation({ kind: 'empty' })
            }}
          />
        ))}
      </div>

      <div
        className="mt-6 rounded-[22px] border p-6"
        style={{
          borderColor: 'var(--line-strong)',
          backgroundColor: 'var(--panel)',
          boxShadow: 'var(--shadow)',
        }}
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p
              className="text-[10px] uppercase"
              style={{
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.26em',
                color: 'var(--accent)',
              }}
            >
              {active.name} API key
            </p>
            <p className="mt-2 text-[14px]" style={{ color: 'var(--muted)' }}>
              Paste the whole thing. We'll run a 1-second test call to check it.
            </p>
          </div>
          <a
            href={active.keyLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13px] underline-offset-4 hover:underline"
            style={{ color: 'var(--ink)' }}
          >
            ↗ {active.keyLinkLabel}
          </a>
        </div>

        <div className="mt-5 flex items-stretch gap-3">
          <div className="relative flex-1">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => handleKeyChange(e.target.value)}
              onBlur={() => {
                if (apiKey.length > 0 && validation.kind === 'typing') {
                  void handleValidate()
                }
              }}
              placeholder={active.placeholder}
              className="w-full rounded-[14px] border py-4 pl-5 pr-14 text-[15px] outline-none transition-colors focus:border-[var(--ink)]"
              style={{
                fontFamily: 'var(--font-mono)',
                borderColor: 'var(--line-strong)',
                backgroundColor: 'var(--panel-strong)',
                color: 'var(--ink)',
                letterSpacing: '0.04em',
              }}
            />
            <button
              type="button"
              onClick={() => setShowKey((prev) => !prev)}
              aria-label={showKey ? 'Hide API key' : 'Show API key'}
              aria-pressed={showKey}
              className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-[10px] transition-colors hover:bg-[var(--panel)] focus:bg-[var(--panel)] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[var(--ink)]"
              style={{ color: 'var(--muted)' }}
            >
              {showKey ? (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
          <ValidationBadge state={validation} />
        </div>

        {validation.kind === 'invalid' ? (
          <p
            className="mt-3 text-[12px] leading-[1.55]"
            style={{ color: 'var(--accent)', fontFamily: 'var(--font-sans)' }}
          >
            {validation.error}
          </p>
        ) : null}

        <p className="mt-4 text-[12px] leading-[1.6]" style={{ color: 'var(--muted)' }}>
          Your key never leaves this Mac. The test call is a token mint against{' '}
          <a
            href={active.keyLink}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
            style={{ color: 'var(--ink)' }}
          >
            {active.name}
          </a>
          , no audio yet.
        </p>
      </div>
        </>
      )}
    </StepFrame>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ProviderCard({
  provider,
  selected,
  onSelect,
}: {
  provider: Provider
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className="flex flex-col items-start gap-3 rounded-[20px] border p-5 text-left transition-all"
      style={{
        borderColor: selected ? 'var(--accent)' : 'var(--line-strong)',
        backgroundColor: selected ? 'var(--accent-soft)' : 'var(--panel)',
        boxShadow: selected ? 'none' : 'var(--shadow)',
      }}
    >
      <div className="flex w-full items-start justify-between gap-3">
        <div>
          <p
            className="text-[10px] uppercase"
            style={{
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.24em',
              color: selected ? 'var(--accent)' : 'var(--muted)',
            }}
          >
            {provider.tagline}
          </p>
          <p
            className="mt-2 text-[17px] font-medium tracking-[-0.01em]"
            style={{ color: 'var(--ink)' }}
          >
            {provider.name}
          </p>
        </div>
        <RadioDot selected={selected} />
      </div>
      <p className="text-[13px] leading-[1.55]" style={{ color: 'var(--muted)' }}>
        {provider.detail}
      </p>
      <p
        className="mt-auto text-[11px] uppercase"
        style={{
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.2em',
          color: 'var(--muted)',
        }}
      >
        {provider.freeTier}
      </p>
    </button>
  )
}

function RadioDot({ selected }: { selected: boolean }) {
  return (
    <span
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[1.5px]"
      style={{
        borderColor: selected ? 'var(--accent)' : 'var(--line-strong)',
      }}
    >
      {selected ? (
        <span
          className="h-[9px] w-[9px] rounded-full"
          style={{ backgroundColor: 'var(--accent)' }}
        />
      ) : null}
    </span>
  )
}

function ValidationBadge({ state }: { state: ValidationState }) {
  if (state.kind === 'empty') return null
  const visual = mapVisual(state)
  return (
    <div
      className="flex items-center gap-2 rounded-[14px] border px-4"
      style={{
        borderColor: visual.border,
        backgroundColor: visual.background,
        minWidth: 140,
      }}
    >
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: visual.dot }}
      />
      <span
        className="text-[12px] uppercase"
        style={{
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.2em',
          color: visual.color,
        }}
      >
        {visual.label}
      </span>
    </div>
  )
}

function mapVisual(state: ValidationState): {
  border: string
  background: string
  color: string
  dot: string
  label: string
} {
  if (state.kind === 'valid') {
    return {
      border: 'var(--accent)',
      background: 'var(--accent-soft)',
      color: 'var(--accent)',
      dot: 'var(--accent)',
      label: 'Looks valid',
    }
  }
  if (state.kind === 'invalid') {
    return {
      border: 'var(--accent)',
      background: 'var(--panel-strong)',
      color: 'var(--accent)',
      dot: 'var(--accent)',
      label: 'Invalid',
    }
  }
  if (state.kind === 'validating') {
    return {
      border: 'var(--line-strong)',
      background: 'var(--panel-strong)',
      color: 'var(--muted)',
      dot: 'var(--muted)',
      label: 'Checking…',
    }
  }
  return {
    border: 'var(--line-strong)',
    background: 'var(--panel-strong)',
    color: 'var(--muted)',
    dot: 'var(--muted)',
    label: 'Press tab to check',
  }
}

function AccessModeCard({
  mode,
  selected,
  onSelect,
}: {
  mode: AccessMode
  selected: boolean
  onSelect: () => void
}) {
  const isCloud = mode === 'cloud'
  const Icon = isCloud ? Cloud : Key
  const tagline = isCloud ? 'Free trial · Recommended' : 'Bring your own key'
  const title = isCloud ? 'VoiceClaw Cloud' : 'Use your own provider'
  const detail = isCloud
    ? '15 minutes a day on Gemini Live, on us. Sign in once. No key paste, no setup.'
    : 'Paste a Gemini, OpenAI, or Grok key. The key stays on this Mac, in macOS Keychain.'
  return (
    <button
      onClick={onSelect}
      className="flex flex-col items-start gap-3 rounded-[20px] border p-5 text-left transition-all"
      style={{
        borderColor: selected ? 'var(--accent)' : 'var(--line-strong)',
        backgroundColor: selected ? 'var(--accent-soft)' : 'var(--panel)',
        boxShadow: selected ? 'none' : 'var(--shadow)',
      }}
    >
      <div className="flex w-full items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5" style={{ color: selected ? 'var(--accent)' : 'var(--muted)' }} />
          <div>
            <p
              className="text-[10px] uppercase"
              style={{
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.24em',
                color: selected ? 'var(--accent)' : 'var(--muted)',
              }}
            >
              {tagline}
            </p>
            <p
              className="mt-1 text-[16px] font-medium tracking-[-0.01em]"
              style={{ color: 'var(--ink)' }}
            >
              {title}
            </p>
          </div>
        </div>
        <RadioDot selected={selected} />
      </div>
      <p className="text-[13px] leading-[1.55]" style={{ color: 'var(--muted)' }}>
        {detail}
      </p>
    </button>
  )
}

function CloudPanel({
  state,
  onRetry,
}: {
  state: CloudState
  onRetry: () => void
}) {
  return (
    <div
      className="rounded-[22px] border p-6"
      style={{
        borderColor: 'var(--line-strong)',
        backgroundColor: 'var(--panel)',
        boxShadow: 'var(--shadow)',
      }}
    >
      {state.kind === 'verified' ? (
        <CloudVerifiedDetails me={state.me} />
      ) : state.kind === 'verifying' || state.kind === 'unknown' ? (
        <p className="text-[14px]" style={{ color: 'var(--muted)' }}>
          Checking your VoiceClaw Cloud account…
        </p>
      ) : state.kind === 'not-signed-in' ? (
        <CloudNotSignedIn />
      ) : (
        <CloudErrorPanel error={state.error} onRetry={onRetry} />
      )}
    </div>
  )
}

function CloudVerifiedDetails({ me }: { me: CloudUserInfo }) {
  const remainingMin = Math.floor(me.usage.secondsRemainingToday / 60)
  const capMin = Math.floor(me.usage.dailyCapSeconds / 60)
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: 'var(--accent)' }}
        />
        <p
          className="text-[12px] uppercase"
          style={{
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.22em',
            color: 'var(--accent)',
          }}
        >
          {me.user.tier === 'pro' ? 'Pro tier' : 'Free tier · Verified'}
        </p>
      </div>
      <div>
        <p className="text-[14px]" style={{ color: 'var(--ink)' }}>
          Signed in as <strong>{me.user.email}</strong>.
        </p>
        <p className="mt-2 text-[13px]" style={{ color: 'var(--muted)' }}>
          {remainingMin} of {capMin} minutes available today. Daily quota resets
          at 00:00 UTC.
        </p>
      </div>
    </div>
  )
}

function CloudNotSignedIn() {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[14px]" style={{ color: 'var(--ink)' }}>
        Sign in to use VoiceClaw Cloud.
      </p>
      <p className="text-[13px]" style={{ color: 'var(--muted)' }}>
        Go back to the sign-in step and choose Google or Apple. We need a
        device token before the cloud broker will mint Gemini sessions on
        your behalf.
      </p>
    </div>
  )
}

function CloudErrorPanel({
  error,
  onRetry,
}: {
  error: string
  onRetry: () => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[14px]" style={{ color: 'var(--accent)' }}>
        Could not verify VoiceClaw Cloud.
      </p>
      <p className="text-[12px]" style={{ color: 'var(--muted)' }}>
        {error}
      </p>
      <button
        onClick={onRetry}
        className="self-start rounded-[12px] border px-4 py-2 text-[12px] uppercase"
        style={{
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.22em',
          borderColor: 'var(--line-strong)',
          color: 'var(--ink)',
        }}
      >
        Retry
      </button>
    </div>
  )
}
