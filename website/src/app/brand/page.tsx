import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowLeft,
  Check,
  GitBranch,
  Layers3,
  MonitorSmartphone,
  Moon,
  Ruler,
  ScanLine,
  SwatchBook,
  Type,
} from "lucide-react"
import {
  BRAND_COLORS,
  BRAND_RULES,
  BrandWordmark,
  SignalBars,
  VoiceClawMark,
} from "@/components/brand/brand-system"

export const metadata: Metadata = {
  title: "VoiceClaw Brand Guidelines",
  description:
    "Editorial Quiet brand system for VoiceClaw marketing, desktop, and mobile surfaces.",
}

const DARK_MODE_INTENT = [
  {
    name: "Night Paper",
    value: "#171310",
    role: "Dark page field",
  },
  {
    name: "Warm Ink",
    value: "#F5EADC",
    role: "Primary text on dark",
  },
  {
    name: "Signal Rust",
    value: "#D86A4D",
    role: "Active and live state",
  },
] as const

const SURFACE_NOTES = [
  {
    title: "Website",
    description: "Use broad editorial bands, real product evidence, and direct repository paths.",
  },
  {
    title: "Desktop",
    description: "Respect system preference, keep panels compact, use rust wash for navigation, and reserve solid rust for calls or live signal.",
  },
  {
    title: "Mobile",
    description: "Keep iOS controls native, touch targets generous, use solid rust for mic/send/live state, and sage for healthy connection state.",
  },
] as const

const ICON_RULES = [
  "Use the chamfered bracket mark for the wordmark, app icon, and product identity.",
  "Use lucide icons for interface actions at consistent stroke weight.",
  "Use rust on one active segment only; inactive strokes stay carbon or warm ink.",
] as const

export default function BrandGuidelinesPage() {
  return (
    <main className="min-h-screen bg-[var(--brand-paper)] text-[var(--brand-ink)]">
      <header className="border-b border-[var(--brand-line-strong)] px-5 py-5 sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-[var(--brand-muted)] transition hover:text-[var(--brand-ink)]"
          >
            <ArrowLeft className="size-4" />
            Home
          </Link>
          <BrandWordmark />
        </div>
      </header>

      <section className="border-b border-[var(--brand-line-strong)] px-5 py-20 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <p className="font-mono text-xs uppercase text-[var(--brand-accent)]">
              Editorial Quiet
            </p>
            <h1 className="mt-4 max-w-4xl font-serif text-6xl leading-none sm:text-7xl">
              Restraint wins. Confidence in silence.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-[var(--brand-muted)]">
              VoiceClaw is a precise interface layer, not a personality. The
              brand should feel like a well-made instrument: warm, calm, exact,
              and useful under pressure.
            </p>
          </div>
          <div className="rounded-md border border-[var(--brand-line-strong)] bg-[var(--brand-panel)] p-6 shadow-[var(--brand-shadow)]">
            <div className="flex aspect-square items-center justify-center rounded-md border border-[var(--brand-line-strong)] bg-[var(--brand-panel-strong)] text-[var(--brand-ink)]">
              <VoiceClawMark className="size-28" />
            </div>
            <p className="mt-5 text-sm leading-7 text-[var(--brand-muted)]">
              The mark is an abstract grip around a measured signal. It should
              read as a tool, not a literal claw.
            </p>
          </div>
        </div>
      </section>

      <GuidelineSection
        eyebrow="01"
        title="Principles"
        description="The rules that make the brand recognizable across website, desktop, and mobile."
        icon={<Check className="size-5" />}
      >
        <div className="grid gap-3 md:grid-cols-2">
          {BRAND_RULES.map((rule) => (
            <div
              key={rule}
              className="rounded-md border border-[var(--brand-line-strong)] bg-[var(--brand-panel)] p-5 shadow-[var(--brand-shadow)]"
            >
              <p className="text-sm leading-7 text-[var(--brand-muted)]">
                {rule}
              </p>
            </div>
          ))}
        </div>
      </GuidelineSection>

      <GuidelineSection
        eyebrow="02"
        title="Color"
        description="Warm paper carries the field. Carbon carries authority. Rust is reserved for live signal and committed action."
        icon={<SwatchBook className="size-5" />}
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {BRAND_COLORS.map((color) => (
            <article
              key={color.name}
              className="rounded-md border border-[var(--brand-line-strong)] bg-[var(--brand-panel)] p-5 shadow-[var(--brand-shadow)]"
            >
              <div
                className="h-24 rounded-md border border-[var(--brand-line-strong)]"
                style={{ background: color.value }}
              />
              <div className="mt-4">
                <h3 className="font-semibold">{color.name}</h3>
                <p className="mt-1 font-mono text-xs text-[var(--brand-muted)]">
                  {color.value}
                </p>
                <p className="mt-3 text-sm leading-6 text-[var(--brand-muted)]">
                  {color.role}
                </p>
              </div>
            </article>
          ))}
        </div>
      </GuidelineSection>

      <GuidelineSection
        eyebrow="03"
        title="Typography"
        description="Fraunces carries the editorial argument. Geist Sans handles product copy. JetBrains Mono is reserved for state, routing, and measurements."
        icon={<Type className="size-5" />}
      >
        <div className="grid gap-4">
          <TypeSpec
            label="Display serif"
            className="font-serif text-5xl leading-none"
            sample="Voice for the agent you already trust."
          />
          <TypeSpec
            label="Interface sans"
            className="text-2xl"
            sample="Talk to your own agent on iPhone and Mac."
          />
          <TypeSpec
            label="System mono"
            className="font-mono text-lg"
            sample="SESSION LIVE / LATENCY 182MS / ROUTE ACTIVE"
          />
        </div>
      </GuidelineSection>

      <GuidelineSection
        eyebrow="04"
        title="Layout"
        description="Use measured bands, fine rules, and small-radius surfaces. The brand gets confidence from spacing, not decoration."
        icon={<Ruler className="size-5" />}
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-md border border-[var(--brand-line-strong)] bg-[var(--brand-panel)] p-6 shadow-[var(--brand-shadow)]">
            <div className="grid gap-4 sm:grid-cols-3">
              <RuleCard title="Bands">Full-width sections separated by fine rules.</RuleCard>
              <RuleCard title="Cards">Use cards for repeated items, not page wrappers.</RuleCard>
              <RuleCard title="Radius">Keep surfaces at 8px or less.</RuleCard>
            </div>
          </div>
          <div className="rounded-md border border-[var(--brand-line-strong)] bg-[var(--brand-panel-strong)] p-5 shadow-[var(--brand-shadow)]">
            <p className="mb-5 font-mono text-xs text-[var(--brand-muted)]">
              SIGNAL SAMPLE
            </p>
            <SignalBars activeIndex={6} />
          </div>
        </div>
      </GuidelineSection>

      <GuidelineSection
        eyebrow="05"
        title="Dark mode direction"
        description="Website and platform apps follow system preference with a warm dark palette, not blue-black SaaS chrome."
        icon={<Moon className="size-5" />}
      >
        <div className="grid gap-3 md:grid-cols-3">
          {DARK_MODE_INTENT.map((color) => (
            <article
              key={color.name}
              className="rounded-md border border-[var(--brand-line-strong)] bg-[var(--brand-panel)] p-5 shadow-[var(--brand-shadow)]"
            >
              <div
                className="h-20 rounded-md border border-[var(--brand-line-strong)]"
                style={{ background: color.value }}
              />
              <h3 className="mt-4 font-semibold">{color.name}</h3>
              <p className="mt-1 font-mono text-xs text-[var(--brand-muted)]">
                {color.value}
              </p>
              <p className="mt-3 text-sm leading-6 text-[var(--brand-muted)]">
                {color.role}
              </p>
            </article>
          ))}
        </div>
      </GuidelineSection>

      <GuidelineSection
        eyebrow="06"
        title="Platform surfaces"
        description="Follow-on PRs should adapt the system to the platform instead of copying the website layout."
        icon={<MonitorSmartphone className="size-5" />}
      >
        <div className="grid gap-3 md:grid-cols-3">
          {SURFACE_NOTES.map((note) => (
            <ImplementationCard
              key={note.title}
              title={note.title}
              description={note.description}
            />
          ))}
        </div>
      </GuidelineSection>

      <GuidelineSection
        eyebrow="07"
        title="Iconography"
        description="The mark and interface icons should feel like measurement tools, not decoration."
        icon={<ScanLine className="size-5" />}
      >
        <div className="grid gap-3 md:grid-cols-3">
          {ICON_RULES.map((rule) => (
            <div
              key={rule}
              className="rounded-md border border-[var(--brand-line-strong)] bg-[var(--brand-panel)] p-5 shadow-[var(--brand-shadow)]"
            >
              <p className="text-sm leading-7 text-[var(--brand-muted)]">
                {rule}
              </p>
            </div>
          ))}
        </div>
      </GuidelineSection>

      <GuidelineSection
        eyebrow="08"
        title="Implementation"
        description="The first website PR owns the light expression and shared reference page. Later stacked PRs should update this page when platform-specific decisions become real."
        icon={<GitBranch className="size-5" />}
      >
        <div className="grid gap-3 md:grid-cols-3">
          <ImplementationCard
            title="Website"
            description="Use this page as the canonical light and dark reference."
          />
          <ImplementationCard
            title="Desktop"
            description="Default to system theme, keep controls compact, and use sage for calm connection state."
          />
          <ImplementationCard
            title="Mobile"
            description="Use system color scheme, native tab chrome, the shared mark, and regenerated Editorial Quiet app assets."
          />
        </div>
      </GuidelineSection>

      <footer className="border-t border-[var(--brand-line-strong)] px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between text-sm text-[var(--brand-muted)]">
          <span>VoiceClaw brand guidelines</span>
          <Link href="/" className="hover:text-[var(--brand-ink)]">
            Back to site
          </Link>
        </div>
      </footer>
    </main>
  )
}

function GuidelineSection({
  eyebrow,
  title,
  description,
  icon,
  children,
}: {
  eyebrow: string
  title: string
  description: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="border-b border-[var(--brand-line-strong)] px-5 py-16 sm:px-8">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div>
          <div className="mb-5 flex size-10 items-center justify-center rounded-md border border-[var(--brand-line-strong)] bg-[var(--brand-panel)] text-[var(--brand-accent)]">
            {icon}
          </div>
          <p className="font-mono text-xs uppercase text-[var(--brand-accent)]">
            {eyebrow}
          </p>
          <h2 className="mt-4 break-words font-serif text-3xl leading-none text-[var(--brand-ink)]">
            {title}
          </h2>
          <p className="mt-5 text-sm leading-7 text-[var(--brand-muted)]">
            {description}
          </p>
        </div>
        <div>{children}</div>
      </div>
    </section>
  )
}

function TypeSpec({
  label,
  sample,
  className,
}: {
  label: string
  sample: string
  className: string
}) {
  return (
    <article className="rounded-md border border-[var(--brand-line-strong)] bg-[var(--brand-panel)] p-6 shadow-[var(--brand-shadow)]">
      <p className="font-mono text-xs text-[var(--brand-accent)]">
        {label}
      </p>
      <p className={`mt-4 text-[var(--brand-ink)] ${className}`}>{sample}</p>
    </article>
  )
}

function RuleCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="border-l border-[var(--brand-line-strong)] pl-4">
      <h3 className="font-semibold text-[var(--brand-ink)]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--brand-muted)]">
        {children}
      </p>
    </div>
  )
}

function ImplementationCard({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <article className="rounded-md border border-[var(--brand-line-strong)] bg-[var(--brand-panel)] p-5 shadow-[var(--brand-shadow)]">
      <div className="mb-4 flex size-9 items-center justify-center rounded-md bg-[var(--brand-sage-wash)] text-[var(--brand-sage)]">
        <Layers3 className="size-4" />
      </div>
      <h3 className="font-semibold text-[var(--brand-ink)]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--brand-muted)]">
        {description}
      </p>
    </article>
  )
}
