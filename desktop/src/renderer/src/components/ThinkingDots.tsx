export function ThinkingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      <span className="thinking-dot w-2 h-2 rounded-full bg-muted-foreground/60" style={{ animationDelay: '0ms' }} />
      <span className="thinking-dot w-2 h-2 rounded-full bg-muted-foreground/60" style={{ animationDelay: '200ms' }} />
      <span className="thinking-dot w-2 h-2 rounded-full bg-muted-foreground/60" style={{ animationDelay: '400ms' }} />
    </div>
  )
}
