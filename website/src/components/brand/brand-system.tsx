import type { ReactNode, SVGProps } from "react"

export const BRAND_COLORS = [
  {
    name: "Paper",
    value: "#F1E8DA",
    role: "Primary page field",
  },
  {
    name: "Bone",
    value: "#FDF9F1",
    role: "Quiet raised surfaces",
  },
  {
    name: "Carbon",
    value: "#191511",
    role: "Text and mark",
  },
  {
    name: "Graphite",
    value: "#665F58",
    role: "Secondary text",
  },
  {
    name: "Signal Rust",
    value: "#B4492F",
    role: "Active state and call to action",
  },
  {
    name: "Sage",
    value: "#697668",
    role: "Calm system contrast",
  },
] as const

export const BRAND_RULES = [
  "Lead with the product job: a precise voice layer for the agent people already use.",
  "Use warm paper as the field, carbon for authority, rust only for action or live signal.",
  "Prefer generous whitespace, fine rules, measured columns, and restrained product evidence.",
  "Avoid mascots, neon gradients, heavy glass, and claw literalism.",
] as const

export const PRODUCT_PROOF = [
  {
    value: "BYO",
    label: "Agent",
  },
  {
    value: "MIT",
    label: "License",
  },
  {
    value: "iOS + Mac",
    label: "Clients",
  },
] as const

export function VoiceClawMark({
  className,
  accent = false,
  ...props
}: SVGProps<SVGSVGElement> & {
  accent?: boolean
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <path
        d="M20 10 H14 V54 H20"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 10 L27 17"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M20 54 L27 47"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M44 10 H50 V54 H44"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M44 10 L37 17"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M44 54 L37 47"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M29 40 V24"
        stroke={accent ? "var(--brand-accent)" : "currentColor"}
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <path
        d="M35 46 V18"
        stroke="currentColor"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <path
        d="M41 37 V27"
        stroke="currentColor"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function BrandWordmark({
  className = "",
  accent = true,
}: {
  className?: string
  accent?: boolean
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="flex size-8 items-center justify-center rounded-md border border-[var(--brand-line-strong)] bg-[var(--brand-panel)] text-[var(--brand-ink)]">
        <VoiceClawMark className="size-5" accent={accent} />
      </span>
      <span className="text-base font-semibold text-[var(--brand-ink)]">
        VoiceClaw
      </span>
    </span>
  )
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="font-mono text-xs uppercase text-[var(--brand-accent)]">
      {children}
    </p>
  )
}

export function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <header className="max-w-3xl">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-4 font-serif text-4xl leading-none text-[var(--brand-ink)] sm:text-5xl">
        {title}
      </h2>
      <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--brand-muted)] sm:text-lg">
        {description}
      </p>
    </header>
  )
}

export function SignalBars({ activeIndex = 3 }: { activeIndex?: number }) {
  return (
    <div className="flex h-24 items-end gap-2">
      {[28, 52, 76, 58, 34, 20, 46, 68, 40, 24, 54, 72].map(
        (height, index) => (
          <span
            key={`signal-bar-${index}`}
            className={`block flex-1 rounded-sm ${
              index === activeIndex
                ? "bg-[var(--brand-accent)]"
                : "bg-[var(--brand-ink)]"
            }`}
            style={{ height: `${height}%` }}
          />
        )
      )}
    </div>
  )
}

export function StatBlock({
  value,
  label,
}: {
  value: string
  label: string
}) {
  return (
    <div className="border-l border-[var(--brand-line-strong)] pl-4">
      <p className="font-mono text-sm text-[var(--brand-ink)]">
        {value}
      </p>
      <p className="mt-1 text-sm text-[var(--brand-muted)]">{label}</p>
    </div>
  )
}
