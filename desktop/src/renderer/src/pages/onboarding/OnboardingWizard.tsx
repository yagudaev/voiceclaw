import { useCallback, useState } from 'react'
import './brand.css'
import { StepWelcome } from './StepWelcome'
import { StepSignIn } from './StepSignIn'
import { StepPermissions } from './StepPermissions'
import { StepProvider } from './StepProvider'
import { StepBrain } from './StepBrain'
import { StepTestCall } from './StepTestCall'
import {
  onboarding,
  type OnboardingPayload,
  type OnboardingState,
  type WizardStepId,
} from '../../lib/onboarding-api'

export type { WizardStepId }

const STEPS: WizardStepId[] = ['welcome', 'signin', 'permissions', 'provider', 'brain', 'testcall']

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
  const currentIndex = STEPS.indexOf(stepId)

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
            await onboarding.updateStep('testcall', patch)
          }
          await onboarding.complete()
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
    case 'testcall':
      return (
        <StepTestCall
          onContinue={() => finish()}
          onBack={back}
          onStartOver={startOver}
          providerId={payload.provider ?? 'gemini'}
          previewMode={previewMode}
        />
      )
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
