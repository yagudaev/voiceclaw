import { useState } from 'react'
import { StepFrame } from './StepFrame'
import {
  providerApi,
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

type Props = {
  onContinue?: (patch: OnboardingPayload) => void
  onBack?: () => void
  onStartOver?: () => void
  initialProvider?: ProviderId
  previewMode?: boolean
}

export function StepProvider({
  onContinue,
  onBack,
  onStartOver,
  initialProvider = 'gemini',
  previewMode = false,
}: Props) {
  const [selected, setSelected] = useState<ProviderId>(
    PROVIDERS.some((p) => p.id === initialProvider) ? initialProvider : 'gemini',
  )
  const [apiKey, setApiKey] = useState('')
  const [validation, setValidation] = useState<ValidationState>({ kind: 'empty' })
  const active = PROVIDERS.find((p) => p.id === selected) ?? PROVIDERS[0]

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
    if (validation.kind !== 'valid') {
      await handleValidate()
      // re-read state inside handleValidate; handleContinue stops here
      // and the user clicks Continue again once they see the green check.
      return
    }
    onContinue?.({ provider: selected, providerKeyValidated: true })
  }

  const continueLabel =
    validation.kind === 'valid'
      ? 'Continue'
      : validation.kind === 'validating'
        ? 'Checking…'
        : 'Validate + continue'

  return (
    <StepFrame
      stepIndex={4}
      totalSteps={6}
      eyebrow="04 / Voice provider"
      title="Pick a voice. Paste a key."
      description="VoiceClaw doesn't keep your key. It goes straight into macOS Keychain on this machine, encrypted the way the OS encrypts your Wi-Fi passwords."
      primaryAction={{
        label: continueLabel,
        onClick: () => void handleContinue(),
        disabled: validation.kind === 'validating' || apiKey.length === 0,
      }}
      secondaryAction={{ label: 'Back', onClick: onBack }}
      onStartOver={onStartOver}
    >
      <div className="grid gap-3 md:grid-cols-2">
        {PROVIDERS.map((provider) => (
          <ProviderCard
            key={provider.id}
            provider={provider}
            selected={selected === provider.id}
            onSelect={() => {
              setSelected(provider.id)
              setApiKey('')
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
          <div className="flex-1">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => handleKeyChange(e.target.value)}
              onBlur={() => {
                if (apiKey.length > 0 && validation.kind === 'typing') {
                  void handleValidate()
                }
              }}
              placeholder={active.placeholder}
              className="w-full rounded-[14px] border px-5 py-4 text-[15px] outline-none transition-colors focus:border-[var(--ink)]"
              style={{
                fontFamily: 'var(--font-mono)',
                borderColor: 'var(--line-strong)',
                backgroundColor: 'var(--panel-strong)',
                color: 'var(--ink)',
                letterSpacing: '0.04em',
              }}
            />
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
