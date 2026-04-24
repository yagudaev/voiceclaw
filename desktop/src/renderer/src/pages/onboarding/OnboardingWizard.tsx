import { useState } from 'react'
import './brand.css'
import { StepWelcome } from './StepWelcome'
import { StepSignIn } from './StepSignIn'
import { StepPermissions } from './StepPermissions'
import { StepProvider } from './StepProvider'
import { StepBrain } from './StepBrain'
import { StepTestCall } from './StepTestCall'

export type WizardStepId =
  | 'welcome'
  | 'signin'
  | 'permissions'
  | 'provider'
  | 'brain'
  | 'testcall'

const STEPS: WizardStepId[] = ['welcome', 'signin', 'permissions', 'provider', 'brain', 'testcall']

type Props = {
  initialStep?: WizardStepId
  onComplete?: () => void
}

export function OnboardingWizard({ initialStep = 'welcome', onComplete }: Props) {
  const [stepId, setStepId] = useState<WizardStepId>(initialStep)
  const currentIndex = STEPS.indexOf(stepId)

  const next = () => {
    const nextIndex = currentIndex + 1
    if (nextIndex >= STEPS.length) {
      onComplete?.()
      return
    }
    setStepId(STEPS[nextIndex])
  }

  const back = () => {
    const prevIndex = currentIndex - 1
    if (prevIndex < 0) return
    setStepId(STEPS[prevIndex])
  }

  const startOver = () => setStepId('welcome')

  switch (stepId) {
    case 'welcome':
      return <StepWelcome onContinue={next} onStartOver={startOver} />
    case 'signin':
      return <StepSignIn onContinue={next} onBack={back} onSkip={next} onStartOver={startOver} />
    case 'permissions':
      return (
        <StepPermissions
          onContinue={next}
          onBack={back}
          onSkip={next}
          onStartOver={startOver}
        />
      )
    case 'provider':
      return <StepProvider onContinue={next} onBack={back} onStartOver={startOver} />
    case 'brain':
      return <StepBrain onContinue={next} onBack={back} onStartOver={startOver} />
    case 'testcall':
      return <StepTestCall onContinue={onComplete} onBack={back} onStartOver={startOver} />
  }
}
