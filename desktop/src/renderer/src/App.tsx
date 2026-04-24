import { useCallback, useEffect, useState } from 'react'
import { TabBar, type TabId } from './components/TabBar'
import { ChatPage } from './pages/ChatPage'
import { HistoryPage } from './pages/HistoryPage'
import { SettingsPage } from './pages/SettingsPage'
import { ConversationProvider } from './lib/conversation-context'
import { useTheme } from './lib/use-theme'
import { OnboardingWizard, type WizardStepId } from './pages/onboarding/OnboardingWizard'

const ONBOARDING_STEP_IDS: WizardStepId[] = [
  'welcome',
  'signin',
  'permissions',
  'provider',
  'brain',
  'testcall',
]

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

export function App() {
  const [activeTab, setActiveTab] = useState<TabId>('chat')
  const onboardingFlag = parseOnboardingFlag()
  // Initialize theme system (applies dark/light class to html)
  useTheme()

  const navigateToChat = useCallback(() => setActiveTab('chat'), [])

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

  if (onboardingFlag?.enabled) {
    return <OnboardingWizard initialStep={onboardingFlag.step} />
  }

  return (
    <ConversationProvider>
      <div className="h-screen flex flex-col bg-background text-foreground">
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
