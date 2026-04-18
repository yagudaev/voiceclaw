// Minimal typing for the subset of window.Telegram.WebApp the mini app uses.
// The full SDK: https://core.telegram.org/bots/webapps

export interface TelegramWebApp {
  initData: string
  initDataUnsafe: {
    user?: {
      id: number
      username?: string
      first_name?: string
    }
    start_param?: string
  }
  colorScheme: "light" | "dark"
  themeParams: Record<string, string>
  ready: () => void
  expand: () => void
  close: () => void
  HapticFeedback?: {
    impactOccurred: (style: "light" | "medium" | "heavy") => void
  }
  MainButton?: {
    setText: (text: string) => void
    show: () => void
    hide: () => void
    onClick: (fn: () => void) => void
  }
}

declare global {
  interface Window {
    Telegram?: { WebApp: TelegramWebApp }
  }
}

export {}
