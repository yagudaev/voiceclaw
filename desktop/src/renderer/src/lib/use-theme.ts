import { useCallback, useEffect, useState } from 'react'

export type Theme = 'dark' | 'light' | 'system'

const THEME_KEY = 'theme'
const DEFAULT_THEME: Theme = 'system'

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME)

  const applyTheme = useCallback((t: Theme) => {
    const isDark =
      t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    document.documentElement.classList.toggle('dark', isDark)
    document.documentElement.classList.toggle('light', !isDark)
  }, [])

  const setTheme = useCallback(
    (t: Theme) => {
      setThemeState(t)
      localStorage.setItem(THEME_KEY, t)
      applyTheme(t)
    },
    [applyTheme],
  )

  useEffect(() => {
    const saved = localStorage.getItem(THEME_KEY) as Theme | null
    const initial = saved || DEFAULT_THEME
    setThemeState(initial)
    applyTheme(initial)

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      const current = (localStorage.getItem(THEME_KEY) as Theme) || DEFAULT_THEME
      if (current === 'system') applyTheme('system')
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [applyTheme])

  return { theme, setTheme }
}
