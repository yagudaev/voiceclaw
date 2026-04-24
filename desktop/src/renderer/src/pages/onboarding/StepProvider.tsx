import { useState } from 'react'
import { StepFrame } from './StepFrame'

type ProviderId = 'gemini' | 'openai' | 'xai'

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
    id: 'openai',
    name: 'OpenAI Realtime',
    tagline: 'OpenAI',
    detail: 'Sharp, precise, slightly cooler voice. Pay per minute.',
    keyLink: 'https://platform.openai.com/api-keys',
    keyLinkLabel: 'Get a key at platform.openai.com',
    placeholder: 'sk-...',
    prefix: 'sk-',
    freeTier: 'Pay-as-you-go',
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

type Props = {
  onContinue?: () => void
  onBack?: () => void
  onStartOver?: () => void
  initialProvider?: ProviderId
  initialKey?: string
}

export function StepProvider({
  onContinue,
  onBack,
  onStartOver,
  initialProvider = 'gemini',
  initialKey = '',
}: Props) {
  const [selected, setSelected] = useState<ProviderId>(initialProvider)
  const [apiKey, setApiKey] = useState(initialKey)
  const active = PROVIDERS.find((p) => p.id === selected)!
  const looksValid = apiKey.length > 20 && apiKey.startsWith(active.prefix)

  return (
    <StepFrame
      stepIndex={4}
      totalSteps={6}
      eyebrow="04 / Voice provider"
      title="Pick a voice. Paste a key."
      description="VoiceClaw doesn't keep your key. It goes straight into macOS Keychain on this machine, encrypted the way the OS encrypts your Wi-Fi passwords."
      primaryAction={{
        label: looksValid ? 'Validate + continue' : 'Continue',
        onClick: onContinue,
        disabled: !looksValid,
      }}
      secondaryAction={{ label: 'Back', onClick: onBack }}
      onStartOver={onStartOver}
    >
      <div className="grid gap-3 md:grid-cols-3">
        {PROVIDERS.map((provider) => (
          <ProviderCard
            key={provider.id}
            provider={provider}
            selected={selected === provider.id}
            onSelect={() => {
              setSelected(provider.id)
              setApiKey('')
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
              onChange={(e) => setApiKey(e.target.value)}
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
          <ValidationBadge state={apiKey.length === 0 ? 'empty' : looksValid ? 'valid' : 'typing'} />
        </div>

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

function ValidationBadge({ state }: { state: 'empty' | 'typing' | 'valid' }) {
  if (state === 'empty') return null
  const isValid = state === 'valid'
  return (
    <div
      className="flex items-center gap-2 rounded-[14px] border px-4"
      style={{
        borderColor: isValid ? 'var(--accent)' : 'var(--line-strong)',
        backgroundColor: isValid ? 'var(--accent-soft)' : 'var(--panel-strong)',
        minWidth: 140,
      }}
    >
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: isValid ? 'var(--accent)' : 'var(--muted)' }}
      />
      <span
        className="text-[12px] uppercase"
        style={{
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.2em',
          color: isValid ? 'var(--accent)' : 'var(--muted)',
        }}
      >
        {isValid ? 'Looks valid' : 'Checking…'}
      </span>
    </div>
  )
}
