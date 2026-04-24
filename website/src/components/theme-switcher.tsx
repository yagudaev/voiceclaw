"use client"

import { Monitor, Moon, Sun } from "lucide-react"
import { useSyncExternalStore } from "react"

const THEME_STORAGE_KEY = "voiceclaw-theme"
const THEME_CHANGE_EVENT = "voiceclaw-theme-change"
const THEME_MODES = [
  {
    value: "system",
    label: "Use system theme",
    icon: Monitor,
  },
  {
    value: "light",
    label: "Use light theme",
    icon: Sun,
  },
  {
    value: "dark",
    label: "Use dark theme",
    icon: Moon,
  },
] as const

type ThemeMode = (typeof THEME_MODES)[number]["value"]

export function ThemeSwitcher() {
  const theme = useSyncExternalStore(
    subscribeTheme,
    readStoredTheme,
    getServerTheme
  )

  function selectTheme(nextTheme: ThemeMode) {
    if (nextTheme === "system") {
      window.localStorage.removeItem(THEME_STORAGE_KEY)
    } else {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
    }

    applyTheme(nextTheme)
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT))
  }

  return (
    <div
      className="inline-flex rounded-md border border-[var(--brand-line-strong)] bg-[var(--brand-panel)] p-0.5 shadow-[var(--brand-shadow)]"
      role="group"
      aria-label="Theme"
    >
      {THEME_MODES.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          title={label}
          aria-label={label}
          aria-pressed={theme === value}
          onClick={() => selectTheme(value)}
          className={`flex size-8 items-center justify-center rounded-[5px] transition ${
            theme === value
              ? "bg-[var(--brand-accent-wash)] text-[var(--brand-accent)]"
              : "text-[var(--brand-muted)] hover:text-[var(--brand-ink)]"
          }`}
        >
          <Icon className="size-4" />
        </button>
      ))}
    </div>
  )
}

function applyTheme(theme: ThemeMode) {
  const root = document.documentElement
  root.classList.remove("light", "dark")

  if (theme !== "system") {
    root.classList.add(theme)
  }
}

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "system" || value === "light" || value === "dark"
}

function readStoredTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return "system"
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)
  return isThemeMode(storedTheme) ? storedTheme : "system"
}

function getServerTheme(): ThemeMode {
  return "system"
}

function subscribeTheme(onStoreChange: () => void) {
  function handleThemeChange() {
    applyTheme(readStoredTheme())
    onStoreChange()
  }

  window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange)
  window.addEventListener("storage", handleThemeChange)

  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange)
    window.removeEventListener("storage", handleThemeChange)
  }
}
