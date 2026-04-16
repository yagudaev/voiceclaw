import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
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
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-[640px] max-h-[80vh] flex flex-col">
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
                  className="group rounded-xl border border-border bg-background p-2 hover:border-primary/50 hover:bg-accent transition-colors text-left"
                >
                  <img
                    src={source.thumbnailDataURL}
                    alt={source.name}
                    className="w-full h-32 object-contain rounded-lg bg-muted mb-2"
                  />
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
