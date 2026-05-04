import { useEffect, useRef, useState } from 'react'
import { StepFrame } from './StepFrame'
import { identityApi, type OnboardingPayload } from '../../lib/onboarding-api'
import { decodeVoicePreviewAudio } from '../../lib/voice-preview'

const GEMINI_VOICES = [
  { id: 'Aoede', label: 'Aoede (F) — warm, conversational', preview: "Hi, I'm here." },
  { id: 'Kore', label: 'Kore (F) — calm, focused', preview: "Hi, I'm here." },
  { id: 'Leda', label: 'Leda (F) — bright, friendly', preview: "Hi, I'm here." },
  { id: 'Zephyr', label: 'Zephyr (F) — soft, thoughtful', preview: "Hi, I'm here." },
  { id: 'Puck', label: 'Puck (M) — playful, quick', preview: "Hi, I'm here." },
  { id: 'Charon', label: 'Charon (M) — grounded, steady', preview: "Hi, I'm here." },
  { id: 'Fenrir', label: 'Fenrir (M) — direct, confident', preview: "Hi, I'm here." },
  { id: 'Orus', label: 'Orus (M) — measured, low', preview: "Hi, I'm here." },
] as const

const DEFAULT_NAME = 'Pam'
const DEFAULT_DESCRIPTION = 'Friendly, calm, helps me stay on top of things.'
const DEFAULT_VOICE = 'Zephyr'

type Props = {
  onContinue?: (patch: OnboardingPayload) => void
  onBack?: () => void
  onStartOver?: () => void
  initialIdentity?: { name?: string; description?: string; voice?: string }
  previewMode?: boolean
}

export function StepIdentity({
  onContinue,
  onBack,
  onStartOver,
  initialIdentity = {},
  previewMode = false,
}: Props) {
  const [name, setName] = useState(initialIdentity.name ?? DEFAULT_NAME)
  const [description, setDescription] = useState(initialIdentity.description ?? DEFAULT_DESCRIPTION)
  const [voice, setVoice] = useState(initialIdentity.voice ?? DEFAULT_VOICE)
  const [previewing, setPreviewing] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState('')
  const clipRef = useRef<{ audio: HTMLAudioElement; revoke: () => void } | null>(null)
  const previewTokenRef = useRef(0)

  const stopActiveClip = () => {
    const clip = clipRef.current
    if (!clip) return
    try {
      clip.audio.pause()
    } catch {
      // ignore
    }
    clip.revoke()
    clipRef.current = null
  }

  useEffect(() => {
    return () => {
      // Bump the token so any in-flight `handlePreview` ignores its result.
      previewTokenRef.current += 1
      stopActiveClip()
    }
  }, [])

  const handlePreview = async (voiceId: string) => {
    if (previewMode) return
    const token = ++previewTokenRef.current
    stopActiveClip()
    setPreviewError('')
    setPreviewing(voiceId)
    try {
      const result = await identityApi.speakPreview({
        voice: voiceId,
        text: `Hi, I'm ${name.trim() || DEFAULT_NAME}.`,
      })
      if (token !== previewTokenRef.current) return
      if (!result.ok) {
        console.error('[voice-preview] api error', result.error)
        setPreviewError(result.error)
        setPreviewing(null)
        return
      }
      console.info('[voice-preview] got audio', { voiceId, mimeType: result.mimeType, bytes: result.audioBase64.length })
      const clip = decodeVoicePreviewAudio(result.audioBase64, result.mimeType)
      clipRef.current = clip
      const finish = () => {
        if (clipRef.current === clip) {
          clip.revoke()
          clipRef.current = null
        }
        setPreviewing((p) => (p === voiceId ? null : p))
      }
      clip.audio.onended = finish
      clip.audio.onerror = (e) => {
        console.error('[voice-preview] audio element error', e, 'mimeType:', result.mimeType)
        setPreviewError(`Audio playback failed (${result.mimeType}). Try a different voice.`)
        finish()
      }
      try {
        await clip.audio.play()
      } catch (err) {
        console.error('[voice-preview] audio.play() rejected', err)
        setPreviewError(err instanceof Error ? err.message : 'Could not play audio.')
        finish()
      }
    } catch (err) {
      if (token !== previewTokenRef.current) return
      console.error('[voice-preview] handler threw', err)
      setPreviewError(err instanceof Error ? err.message : 'Preview failed.')
      setPreviewing(null)
    }
  }

  const handleContinue = () => {
    const trimmedName = name.trim() || DEFAULT_NAME
    const trimmedDescription = description.trim()
    onContinue?.({
      identity: { name: trimmedName, description: trimmedDescription, voice },
    })
  }

  return (
    <StepFrame
      stepIndex={6}
      totalSteps={7}
      eyebrow="06 / Voice"
      title="Give your agent a name and a voice."
      description="Pick how they'll sound and feel. You can change all of this later in Settings."
      primaryAction={{ label: 'Continue', onClick: handleContinue }}
      secondaryAction={{ label: 'Back', onClick: onBack }}
      onStartOver={onStartOver}
    >
      <div className="flex flex-col gap-5">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={DEFAULT_NAME}
              className="w-full rounded-[14px] border px-4 py-3 text-[15px] outline-none"
              style={{
                borderColor: 'var(--line-strong)',
                backgroundColor: 'var(--panel-strong)',
                color: 'var(--ink)',
              }}
            />
          </Field>
          <Field label="One-line description (optional)">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={DEFAULT_DESCRIPTION}
              rows={2}
              className="w-full resize-none rounded-[14px] border px-4 py-3 text-[14px] leading-snug outline-none"
              style={{
                borderColor: 'var(--line-strong)',
                backgroundColor: 'var(--panel-strong)',
                color: 'var(--ink)',
              }}
            />
          </Field>
        </div>

        <Field label="Voice">
          <div className="flex flex-col gap-2">
            {GEMINI_VOICES.map((v) => (
              <VoiceRow
                key={v.id}
                voiceId={v.id}
                label={v.label}
                selected={voice === v.id}
                previewing={previewing === v.id}
                onSelect={() => setVoice(v.id)}
                onPreview={() => void handlePreview(v.id)}
              />
            ))}
          </div>
        </Field>

        {previewError ? (
          <p className="text-[12px]" style={{ color: 'var(--accent)' }}>
            {previewError}
          </p>
        ) : null}
      </div>
    </StepFrame>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span
        className="text-[10px] uppercase"
        style={{
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.24em',
          color: 'var(--accent)',
        }}
      >
        {label}
      </span>
      {children}
    </label>
  )
}

function VoiceRow({
  voiceId,
  label,
  selected,
  previewing,
  onSelect,
  onPreview,
}: {
  voiceId: string
  label: string
  selected: boolean
  previewing: boolean
  onSelect: () => void
  onPreview: () => void
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-[14px] border px-4 py-3"
      style={{
        borderColor: selected ? 'var(--accent)' : 'var(--line-strong)',
        backgroundColor: selected ? 'var(--accent-soft)' : 'var(--panel)',
      }}
    >
      <button
        onClick={onSelect}
        className="flex flex-1 items-center gap-3 text-left"
        type="button"
      >
        <span
          className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-[1.5px]"
          style={{ borderColor: selected ? 'var(--accent)' : 'var(--line-strong)' }}
        >
          {selected ? (
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: 'var(--accent)' }}
            />
          ) : null}
        </span>
        <span className="text-[14px]" style={{ color: 'var(--ink)' }}>
          {label}
        </span>
      </button>
      <button
        onClick={onPreview}
        type="button"
        disabled={previewing}
        className="rounded-[10px] border px-3 py-1.5 text-[12px] uppercase tracking-[0.2em] disabled:opacity-50"
        style={{
          borderColor: 'var(--line-strong)',
          backgroundColor: previewing ? 'var(--accent-soft)' : 'var(--panel-strong)',
          color: 'var(--ink)',
          fontFamily: 'var(--font-mono)',
        }}
        aria-label={`Preview ${voiceId} voice`}
      >
        {previewing ? 'Playing…' : 'Say hello'}
      </button>
    </div>
  )
}

