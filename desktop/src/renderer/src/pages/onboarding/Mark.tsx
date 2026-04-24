type MarkProps = {
  className?: string
  accent?: boolean
}

const STROKE = 4
const ACCENT_STROKE = 4.5

export function Mark({ className, accent = false }: MarkProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      fill="none"
      aria-label="VoiceClaw mark"
    >
      <path
        d="M20 10 H14 V54 H20"
        stroke="currentColor"
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M20 10 L27 17" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" />
      <path d="M20 54 L27 47" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" />
      <path
        d="M44 10 H50 V54 H44"
        stroke="currentColor"
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M44 10 L37 17" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" />
      <path d="M44 54 L37 47" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" />
      <path
        d="M29 40 V24"
        stroke={accent ? 'var(--accent)' : 'currentColor'}
        strokeWidth={ACCENT_STROKE}
        strokeLinecap="round"
      />
      <path d="M35 46 V18" stroke="currentColor" strokeWidth={ACCENT_STROKE} strokeLinecap="round" />
      <path d="M41 37 V27" stroke="currentColor" strokeWidth={ACCENT_STROKE} strokeLinecap="round" />
    </svg>
  )
}
