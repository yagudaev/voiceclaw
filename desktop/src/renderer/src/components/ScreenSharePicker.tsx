import { useEffect, useState } from 'react'
import { AppWindow, Monitor, X } from 'lucide-react'
import { Button } from './ui/Button'
import { getScreenSources, type ScreenSource } from '../lib/screen-capture'

interface ScreenSharePickerProps {
  onSelect: (source: ScreenSource) => void
  onCancel: () => void
}

export function ScreenSharePicker({ onSelect, onCancel }: ScreenSharePickerProps) {
  const [sources, setSources] = useState<ScreenSource[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getScreenSources()
      .then(setSources)
      .catch((err) => console.error('Failed to get screen sources:', err))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[640px] max-h-[80vh] flex flex-col rounded-md border border-border bg-card vc-panel-shadow">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Share Screen</h2>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X size={18} />
          </Button>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading sources...</div>
          ) : sources.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No sources available</div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {sources.map((source) => (
                <button
                  key={source.id}
                  onClick={() => onSelect(source)}
                  className="group rounded-md border border-border bg-background p-2 hover:border-primary/50 hover:bg-accent transition-colors text-left"
                >
                  <SourcePreview source={source} />
                  <p className="text-xs text-muted-foreground group-hover:text-foreground truncate px-1">
                    {source.name}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SourcePreview({ source }: { source: ScreenSource }) {
  const isScreen = source.id.startsWith('screen:')

  if (source.thumbnailDataURL) {
    return (
      <img
        src={source.thumbnailDataURL}
        alt={source.name}
        className="w-full h-32 object-contain rounded-md bg-muted mb-2"
      />
    )
  }

  if (source.appIconDataURL) {
    return (
      <div className="w-full h-32 flex items-center justify-center rounded-md bg-muted mb-2">
        <img
          src={source.appIconDataURL}
          alt={source.name}
          className="h-16 w-16 object-contain"
        />
      </div>
    )
  }

  return (
    <div className="w-full h-32 flex items-center justify-center rounded-md bg-muted mb-2 text-muted-foreground">
      {isScreen ? <Monitor size={40} /> : <AppWindow size={40} />}
    </div>
  )
}
