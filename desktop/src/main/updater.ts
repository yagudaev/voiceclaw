import { app } from 'electron'

// Auto-update via electron-updater against GitHub Releases. This file is
// intentionally a no-op until the release pipeline exists — we don't
// want `yarn dev` to poll a release feed that doesn't exist yet, and we
// don't want a packaged pre-release build trying to upgrade itself to
// something that isn't on the feed.
//
// Once CI publishes signed DMGs to github.com/yagudaev/voiceclaw
// Releases, set UPDATE_FEED_URL (or leave it default) and this function
// installs the update-on-relaunch hook.

type UpdaterApi = {
  checkForUpdatesAndNotify: () => Promise<unknown>
  on: (event: string, cb: (...args: unknown[]) => void) => void
  autoDownload: boolean
  setFeedURL?: (url: string) => void
}

let initialized = false

export async function initAutoUpdater(): Promise<void> {
  if (initialized) return
  if (!app.isPackaged) return // never run in dev
  if (process.env.VOICECLAW_DISABLE_UPDATER === '1') return

  // Lazy import so dev / unpackaged builds don't require the module.
  // Optional dependency pattern: if `electron-updater` isn't installed,
  // dynamic require throws and we silently no-op. Ships `as any` on the
  // require call because the module isn't in our dependency closure yet.
  let updater: UpdaterApi | null = null
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = (globalThis as { require?: NodeJS.Require }).require?.('electron-updater') as
      | { autoUpdater: UpdaterApi }
      | undefined
    if (!mod) {
      console.info('[updater] electron-updater not installed; skipping')
      return
    }
    updater = mod.autoUpdater
  } catch (err) {
    console.warn('[updater] failed to load electron-updater', err)
    return
  }

  initialized = true
  updater.autoDownload = true

  const feedUrl = process.env.UPDATE_FEED_URL
  if (feedUrl && updater.setFeedURL) {
    updater.setFeedURL(feedUrl)
  }

  updater.on('update-available', (info) => {
    console.info('[updater] update available', info)
  })
  updater.on('update-downloaded', (info) => {
    console.info('[updater] update downloaded; will install on next restart', info)
  })
  updater.on('error', (err) => {
    console.warn('[updater] error', err)
  })

  try {
    await updater.checkForUpdatesAndNotify()
  } catch (err) {
    console.warn('[updater] check failed', err)
  }
}
