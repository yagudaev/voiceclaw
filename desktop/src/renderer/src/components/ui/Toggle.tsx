interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  label?: string
}

export function Toggle({ checked, onChange, disabled = false, label }: ToggleProps) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <button
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`
          relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent
          transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2
          focus-visible:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed
          ${checked ? 'bg-primary' : 'bg-input'}
        `}
      >
        <span
          className={`
            pointer-events-none inline-block h-5 w-5 rounded-full bg-background
            shadow-sm transition-transform duration-200
            ${checked ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
      </button>
      {label && (
        <span className={`text-sm ${disabled ? 'text-muted-foreground' : 'text-foreground'}`}>
          {label}
        </span>
      )}
    </label>
  )
}
