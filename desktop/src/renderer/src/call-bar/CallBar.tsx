import { useEffect, useRef, useState } from 'react'
import { VoiceClawMark } from '../components/brand/VoiceClawMark'

// Ambient augmentation — only the call-bar renderer touches these
// callBar IPC methods. The main renderer declares the producer-side
// `sendAudioLevels` shape in use-realtime.ts; these are the
// consumer-side listeners the CallBar subscribes to.
declare global {
  interface Window {
    electronAPI: Window['electronAPI'] & {
      callBar?: {
        ready?: () => Promise<void>
        focusMain?: () => Promise<void>
        openContextMenu?: () => Promise<void>
        onVisibility?: (handler: (visible: boolean) => void) => () => void
        onAudioLevels?: (
          handler: (payload: { input: number; output: number }) => void,
        ) => () => void
      }
    }
  }
}

// Props are provided entirely via IPC in production; keeping the
// component prop-driven makes it trivial to render in a visual harness
// or Storybook later.
type Speaker = 'user' | 'ai' | 'idle'

export function CallBar() {
  const previewMode = isPreview()
  const [visible, setVisible] = useState(previewMode)
  const [speaker, setSpeaker] = useState<Speaker>(previewMode ? 'user' : 'idle')
  const [levels, setLevels] = useState<number[]>([0, 0, 0])

  // Ref mirror for the IPC handler — React 19 setters can't be read
  // synchronously, and we need the previous levels to feed a small IIR
  // decay so bars fall gracefully instead of snapping to zero.
  const levelsRef = useRef(levels)
  levelsRef.current = levels

  // Mark the document so the scoped call-bar styles (transparent bg,
  // token overrides, no-overflow) apply without clobbering the main
  // renderer's own rules.
  useEffect(() => {
    document.body.classList.add('call-bar-view')
    if (previewMode) document.body.classList.add('call-bar-preview')
    return () => {
      document.body.classList.remove('call-bar-view')
      document.body.classList.remove('call-bar-preview')
    }
  }, [previewMode])

  // In preview mode (browser tab, no Electron IPC) drive a synthetic
  // level signal so the waveform animates and the styling iteration
  // loop is faster than firing up Electron + a real call.
  useEffect(() => {
    if (!previewMode) return
    const id = setInterval(() => {
      const t = performance.now() / 1000
      const fakeInput = 0.18 + 0.12 * Math.abs(Math.sin(t * 2.4))
      const fakeOutput = 0.05
      setSpeaker(resolveSpeaker(fakeInput, fakeOutput))
      setLevels((prev) => spreadLevel(prev, fakeInput, fakeOutput))
    }, 60)
    return () => clearInterval(id)
  }, [previewMode])

  useEffect(() => {
    const api = window.electronAPI?.callBar
    if (!api) return

    const unsubVisibility = api.onVisibility?.((v) => {
      setVisible(v)
    })

    const unsubLevels = api.onAudioLevels?.((payload) => {
      setSpeaker(resolveSpeaker(payload.input, payload.output))
      setLevels(spreadLevel(levelsRef.current, payload.input, payload.output))
    })

    // Tell main we're ready — it may have queued a visibility event
    // while our renderer was still booting.
    api.ready?.().catch(() => {})

    return () => {
      unsubVisibility?.()
      unsubLevels?.()
    }
  }, [])

  const handleMarkClick = () => {
    window.electronAPI?.callBar?.focusMain?.().catch(() => {})
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    window.electronAPI?.callBar?.openContextMenu?.().catch(() => {})
  }

  const rootClass = [
    'call-bar',
    visible ? 'is-visible' : '',
    speaker === 'user' ? 'is-user-speaking' : '',
    speaker === 'ai' ? 'is-ai-speaking' : '',
    speaker === 'idle' ? 'is-idle' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={rootClass}
      onContextMenu={handleContextMenu}
    >
      <div
        className="call-bar__focus-zone"
        onClick={handleMarkClick}
        aria-label="Open VoiceClaw main window"
      />

      <VoiceClawMark className="call-bar__mark" />

      <div className="call-bar__waveform">
        {levels.map((lvl, i) => (
          <div
            key={i}
            className="call-bar__bar"
            style={{ height: `${Math.round(clampHeight(lvl))}px` }}
          />
        ))}
      </div>

      <div className="call-bar__grip" aria-label="Drag handle">
        <div className="call-bar__grip-dot" />
        <div className="call-bar__grip-dot" />
        <div className="call-bar__grip-dot" />
        <div className="call-bar__grip-dot" />
        <div className="call-bar__grip-dot" />
        <div className="call-bar__grip-dot" />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MIN_BAR = 3
const MAX_BAR = 12

// Gain the raw RMS into something visually useful. RMS tops out around
// 0.3 for typical speaking voices; multiplying by ~3 puts a normal
// speaking level near the top of the bar.
const LEVEL_GAIN = 3.2

// Decay factor for the IIR smoother — higher = holds peaks longer.
const DECAY = 0.82

function resolveSpeaker(input: number, output: number): Speaker {
  const threshold = 0.015
  if (output > threshold && output >= input) return 'ai'
  if (input > threshold) return 'user'
  return 'idle'
}

function spreadLevel(prev: number[], input: number, output: number): number[] {
  // Dominant stream picks the color via resolveSpeaker; the height feed
  // is just the louder of the two so AI and user both drive motion.
  const active = Math.max(input, output)
  const target = Math.min(1, active * LEVEL_GAIN)

  const offsets = [0.85, 1.0, 0.85]

  return prev.map((current, i) => {
    const wanted = target * offsets[i]
    // Rising edges snap, falling edges decay so we get that springy
    // "waveform falling back" feel rather than an instant collapse.
    if (wanted > current) return wanted
    return current * DECAY
  })
}

function clampHeight(level: number): number {
  const h = MIN_BAR + level * (MAX_BAR - MIN_BAR)
  return Math.max(MIN_BAR, Math.min(MAX_BAR, h))
}

function isPreview(): boolean {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get('preview') === '1'
}
