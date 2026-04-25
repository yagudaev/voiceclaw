import { useEffect } from 'react'

// Screen-share capture frame — renders inside a transparent,
// click-through, always-on-top BrowserWindow that's sized to the full
// bounds of the display the user is sharing. The only visible element
// is a rust border traced around the perimeter of the window (= the
// perimeter of the display). Everything else is transparent so the
// user's actual content shows through and stays interactive (the
// window is setIgnoreMouseEvents). A pill label was tried at top
// center but it overlapped macOS's own screen-recording menu bar
// indicator; the perimeter frame + the call-bar pip are signal enough.

declare global {
  interface Window {
    electronAPI: Window['electronAPI'] & {
      screenShare?: {
        ready?: () => Promise<void>
      }
    }
  }
}

export function ScreenFrame() {
  // Mark the document so the scoped screen-frame styles take over the
  // shared #root / html / body without bleeding into the main renderer
  // when the bundle is loaded as part of the same chunk graph.
  useEffect(() => {
    document.body.classList.add('screen-frame-view')
    return () => {
      document.body.classList.remove('screen-frame-view')
    }
  }, [])

  // Tell main we're ready so any queued show() can fire. Main holds the
  // active flag — if the share started before this window's renderer
  // finished booting, we'd otherwise miss the show.
  useEffect(() => {
    window.electronAPI?.screenShare?.ready?.().catch(() => {})
  }, [])

  return (
    <div className="screen-frame">
      <div className="screen-frame__border" />
    </div>
  )
}
