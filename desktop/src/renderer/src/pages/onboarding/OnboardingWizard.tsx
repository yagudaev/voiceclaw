import { useCallback, useEffect, useState } from 'react'
import './brand.css'
import { StepWelcome } from './StepWelcome'
import { StepSignIn } from './StepSignIn'
import { StepPermissions } from './StepPermissions'
import { StepProvider } from './StepProvider'
import { StepBrain } from './StepBrain'
import { StepIdentity } from './StepIdentity'
import { StepIntroduction } from './StepIntroduction'
import {
  identityApi,
  userApi,
  type ProviderId,
  type UserProfile,
} from '../../lib/onboarding-api'
import {
  onboarding,
  type OnboardingPayload,
  type OnboardingState,
  type WizardStepId,
} from '../../lib/onboarding-api'
import { isVoiceForProvider } from '../../lib/voice-prefs'

export type { WizardStepId }

const STEPS: WizardStepId[] = [
  'welcome',
  'signin',
  'permissions',
  'provider',
  'brain',
  'identity',
  'introduction',
]

const DEFAULT_AGENT_NAME = 'Pam'
const DEFAULT_VOICE = 'Zephyr'
const DEFAULT_USER: UserProfile = { name: 'Friend', bio: '' }

type Props = {
  initialState?: OnboardingState
  onComplete?: () => void
  /**
   * Skip all main-process IPC calls. Used by the docs-site preview where
   * the renderer runs in a normal browser without an Electron bridge.
   */
  previewMode?: boolean
}

export function OnboardingWizard({ initialState, onComplete, previewMode = false }: Props) {
  const [stepId, setStepId] = useState<WizardStepId>(initialState?.currentStep ?? 'welcome')
  const [payload, setPayload] = useState<OnboardingPayload>(initialState?.payload ?? {})
  const [existingUser, setExistingUser] = useState<UserProfile>(DEFAULT_USER)
  const currentIndex = STEPS.indexOf(stepId)

  useEffect(() => {
    if (previewMode) return
    void (async () => {
      try {
        const u = await userApi.get()
        setExistingUser(u)
      } catch (err) {
        console.warn('[onboarding] user load failed', err)
      }
    })()
  }, [previewMode])

  const persist = useCallback(
    async (nextStep: WizardStepId, patch: OnboardingPayload = {}) => {
      const merged = mergePayload(payload, patch)
      setPayload(merged)
      setStepId(nextStep)
      if (previewMode) return
      try {
        await onboarding.updateStep(nextStep, patch)
      } catch (err) {
        console.warn('[onboarding] updateStep failed', err)
      }
    },
    [payload, previewMode],
  )

  const next = useCallback(
    (patch: OnboardingPayload = {}) => {
      const nextIndex = currentIndex + 1
      if (nextIndex >= STEPS.length) {
        return finish(patch)
      }
      void persist(STEPS[nextIndex], patch)
    },
    [currentIndex, persist],
  )

  const back = useCallback(() => {
    const prevIndex = currentIndex - 1
    if (prevIndex < 0) return
    void persist(STEPS[prevIndex])
  }, [currentIndex, persist])

  const finish = useCallback(
    async (patch: OnboardingPayload = {}) => {
      const merged = mergePayload(payload, patch)
      setPayload(merged)
      if (!previewMode) {
        try {
          if (Object.keys(patch).length > 0) {
            await onboarding.updateStep('introduction', patch)
          }
          await onboarding.complete()
          // After the introduction step the agent has already greeted the
          // user out loud — no need to re-greet on first chat load.
        } catch (err) {
          console.warn('[onboarding] complete failed', err)
        }
      }
      onComplete?.()
    },
    [onComplete, payload, previewMode],
  )

  const startOver = useCallback(async () => {
    if (previewMode) {
      setPayload({})
      setStepId('welcome')
      return
    }
    const result = await onboarding.reset()
    if (!result.ok) return
    setPayload(result.state.payload)
    setStepId(result.state.currentStep)
  }, [previewMode])

  switch (stepId) {
    case 'welcome':
      return <StepWelcome onContinue={() => next()} onStartOver={startOver} />
    case 'signin':
      return (
        <StepSignIn
          onContinue={(patch) => next(patch)}
          onBack={back}
          onSkip={() => next({ signedIn: false })}
          onStartOver={startOver}
          initialSignedIn={payload.signedIn ?? false}
          previewMode={previewMode}
        />
      )
    case 'permissions':
      return (
        <StepPermissions
          onContinue={(patch) => next(patch)}
          onBack={back}
          onSkip={() => next()}
          onStartOver={startOver}
          previewMode={previewMode}
        />
      )
    case 'provider':
      return (
        <StepProvider
          onContinue={(patch) => next(patch)}
          onBack={back}
          onStartOver={startOver}
          initialProvider={payload.provider ?? 'gemini'}
          previewMode={previewMode}
        />
      )
    case 'brain':
      return (
        <StepBrain
          onContinue={(patch) => next(patch)}
          onBack={back}
          onStartOver={startOver}
          initialBrain={resolveInitialBrainId(payload.brain)}
          initialCustomUrl={typeof payload.brain === 'object' ? payload.brain.url : ''}
          previewMode={previewMode}
        />
      )
    case 'identity':
      return (
        <StepIdentity
          onContinue={(patch) => {
            void persistIdentity(patch.identity, previewMode).then(() => next(patch))
          }}
          onBack={back}
          onStartOver={startOver}
          initialIdentity={payload.identity ?? {}}
          previewMode={previewMode}
        />
      )
    case 'introduction': {
      const agentName = payload.identity?.name?.trim() || DEFAULT_AGENT_NAME
      const voice = payload.identity?.voice || DEFAULT_VOICE
      const providerId: ProviderId = payload.provider ?? providerFromVoice(voice)
      return (
        <StepIntroduction
          onContinue={() => finish()}
          onBack={back}
          onStartOver={startOver}
          agentName={agentName}
          voice={voice}
          providerId={providerId}
          initialUser={existingUser}
          previewMode={previewMode}
        />
      )
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function providerFromVoice(voice: string): ProviderId {
  if (isVoiceForProvider('xai', voice)) return 'xai'
  if (isVoiceForProvider('openai', voice)) return 'openai'
  return 'gemini'
}

function mergePayload(
  current: OnboardingPayload,
  patch: OnboardingPayload,
): OnboardingPayload {
  return {
    ...current,
    ...patch,
    permissions: patch.permissions
      ? { ...(current.permissions ?? {}), ...patch.permissions }
      : current.permissions,
    user: patch.user ? { ...(current.user ?? {}), ...patch.user } : current.user,
  }
}

function resolveInitialBrainId(
  brain: OnboardingPayload['brain'],
): 'openclaw' | 'claude' | 'codex' | 'custom' {
  if (!brain) return 'openclaw'
  if (typeof brain === 'object') return 'custom'
  return brain
}

async function persistIdentity(
  identity: OnboardingPayload['identity'],
  previewMode: boolean,
): Promise<void> {
  if (previewMode || !identity) return
  try {
    await identityApi.save(identity)
  } catch (err) {
    console.warn('[onboarding] identity save failed', err)
  }
}
