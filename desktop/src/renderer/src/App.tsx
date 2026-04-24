import { useCallback, useEffect, useState } from 'react'
import { TabBar, type TabId } from './components/TabBar'
import { ChatPage } from './pages/ChatPage'
import { HistoryPage } from './pages/HistoryPage'
import { SettingsPage } from './pages/SettingsPage'
import { ConversationProvider } from './lib/conversation-context'
import { useTheme } from './lib/use-theme'
import { OnboardingWizard, type WizardStepId } from './pages/onboarding/OnboardingWizard'
import { onboarding, type OnboardingState } from './lib/onboarding-api'

const ONBOARDING_STEP_IDS: WizardStepId[] = [
  'welcome',
  'signin',
  'permissions',
  'provider',
  'brain',
  'testcall',
]

export function App() {
  const [activeTab, setActiveTab] = useState<TabId>('chat')
  const [bootState, setBootState] = useState<OnboardingState | null>(null)
  const [showWizard, setShowWizard] = useState(false)
  const [bootChecked, setBootChecked] = useState(false)

  const onboardingFlag = parseOnboardingFlag()

  // Initialize theme system (applies dark/light class to html)
  useTheme()

  const navigateToChat = useCallback(() => setActiveTab('chat'), [])

  // First-mount: ask main whether onboarding is complete. The wizard
  // shows iff completedAt is null. The ?onboarding=1 URL flag (used by
  // Storybook-style design previews) forces the wizard regardless.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const state = await onboarding.getState()
        if (cancelled) return
        setBootState(state)
        setShowWizard(state.completedAt === null)
      } catch (err) {
        // If the bridge isn't available yet (e.g. preview mode in a
        // browser tab) fall back to showing the main app.
        console.warn('[onboarding] getState failed', err)
      } finally {
        if (!cancelled) setBootChecked(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey
      if (!meta) return

      switch (e.key) {
        case ',':
          e.preventDefault()
          setActiveTab('settings')
          break
        case '1':
          e.preventDefault()
          setActiveTab('chat')
          break
        case '2':
          e.preventDefault()
          setActiveTab('history')
          break
        case '3':
          e.preventDefault()
          setActiveTab('settings')
          break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Design-preview override: ?onboarding=1[&step=…] always shows the
  // wizard at the requested step with empty payload. Used by the docs
  // site previews where there is no main process to talk to.
  if (onboardingFlag?.enabled) {
    return (
      <OnboardingWizard
        initialState={{
          currentStep: onboardingFlag.step,
          payload: {},
          completedAt: null,
        }}
        previewMode
      />
    )
  }

  // Hold the splash blank for a single tick while we decide. Avoids
  // briefly flashing the main app then swapping to the wizard.
  if (!bootChecked) {
    return <div className="h-screen w-screen bg-background" />
  }

  if (showWizard) {
    return (
      <OnboardingWizard
        initialState={
          bootState ?? { currentStep: 'welcome', payload: {}, completedAt: null }
        }
        onComplete={() => setShowWizard(false)}
      />
    )
  }

  return (
    <ConversationProvider>
      <div className="h-screen flex flex-col bg-background text-foreground vc-window-surface">
        <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="flex-1 flex flex-col overflow-hidden relative">
          <div className={`flex-1 flex flex-col overflow-hidden ${activeTab !== 'chat' ? 'hidden' : ''}`}>
            <ChatPage />
          </div>
          <div className={`flex-1 flex flex-col overflow-hidden ${activeTab !== 'history' ? 'hidden' : ''}`}>
            <HistoryPage isVisible={activeTab === 'history'} onNavigateToChat={navigateToChat} />
          </div>
          <div className={`flex-1 flex flex-col overflow-hidden ${activeTab !== 'settings' ? 'hidden' : ''}`}>
            <SettingsPage />
          </div>
        </main>
      </div>
    </ConversationProvider>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseOnboardingFlag(): { enabled: boolean; step: WizardStepId } | null {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  if (params.get('onboarding') !== '1') return null
  const stepParam = params.get('step') ?? 'welcome'
  const step = (ONBOARDING_STEP_IDS as string[]).includes(stepParam)
    ? (stepParam as WizardStepId)
    : 'welcome'
  return { enabled: true, step }
}
