import { X, ExternalLink, Settings } from 'lucide-react'
import type { AdapterErrorPayload } from '../lib/use-realtime'

interface AdapterErrorBannerProps {
  error: AdapterErrorPayload | null
  onDismiss: () => void
  onNavigateToSettings?: () => void
}

export function AdapterErrorBanner({ error, onDismiss, onNavigateToSettings }: AdapterErrorBannerProps) {
  if (!error) return null

  const displayMessage = error.userMessage ?? error.message
  const actionUrl = error.actionUrl ?? null
  const isInAppLink = typeof actionUrl === 'string' && actionUrl.startsWith('voiceclaw://')

  const handleAction = () => {
    if (!actionUrl) return
    if (isInAppLink) {
      onNavigateToSettings?.()
    } else {
      window.electronAPI?.shell?.openExternal(actionUrl).catch(() => {})
    }
  }

  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-2 px-3 py-2 bg-destructive/90 text-white text-sm"
    >
      <span className="flex-1 min-w-0 truncate">{displayMessage}</span>
      <div className="flex items-center gap-1.5 shrink-0">
        {actionUrl && (
          <button
            type="button"
            onClick={handleAction}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-white/20 hover:bg-white/30 transition-colors whitespace-nowrap"
          >
            {isInAppLink ? (
              <>
                <Settings size={11} />
                Open Settings
              </>
            ) : (
              <>
                <ExternalLink size={11} />
                Open billing
              </>
            )}
          </button>
        )}
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss error"
          className="p-0.5 rounded hover:bg-white/20 transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
