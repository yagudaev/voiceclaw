import Image from "next/image"
import Link from "next/link"
import {
  ArrowRight,
  BookOpen,
  GitBranch,
  Mic2,
  RadioTower,
  Route,
  ShieldCheck,
  TerminalSquare,
} from "lucide-react"
import {
  BrandWordmark,
  PRODUCT_PROOF,
  SectionHeading,
  SignalBars,
  StatBlock,
} from "@/components/brand/brand-system"

export default function Home() {
  return (
    <div className="min-h-screen text-[var(--brand-ink)]">
      <Header />
      <main>
        <HeroSection />
        <ProofSection />
        <WorkflowSection />
        <PlatformSection />
        <GetStartedSection />
      </main>
      <Footer />
    </div>
  )
}

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--brand-line-strong)] bg-[var(--brand-paper)]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link href="/" aria-label="VoiceClaw home">
          <BrandWordmark />
        </Link>
        <nav className="flex items-center gap-5 text-sm text-[var(--brand-muted)]">
          <Link className="hidden hover:text-[var(--brand-ink)] sm:inline" href="#work">
            How it works
          </Link>
          <Link className="hidden hover:text-[var(--brand-ink)] sm:inline" href="/brand">
            Brand
          </Link>
          <a
            href="https://github.com/yagudaev/voiceclaw"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-[var(--brand-line-strong)] bg-[var(--brand-panel)] px-3 py-2 text-[var(--brand-ink)] shadow-[var(--brand-shadow)] transition hover:border-[var(--brand-accent)]"
          >
            <GitBranch className="size-4" />
            GitHub
          </a>
        </nav>
      </div>
    </header>
  )
}

function HeroSection() {
  return (
    <section className="relative isolate min-h-[calc(100svh-4rem)] overflow-hidden border-b border-[var(--brand-line-strong)]">
      <Image
        src="/demo-thumbnail.jpg"
        alt="VoiceClaw in use beside a live work document"
        fill
        priority
        sizes="100vw"
        className="object-cover object-[70%_center]"
      />
      <div className="brand-hero-scrim-mobile absolute inset-0 sm:hidden" />
      <div className="brand-hero-scrim-desktop absolute inset-0 hidden sm:block" />
      <div className="relative mx-auto flex min-h-[calc(100svh-4rem)] max-w-7xl flex-col justify-between px-5 py-10 sm:px-8 sm:py-14">
        <div className="max-w-4xl pt-12 sm:pt-20">
          <div className="mb-8 inline-flex items-center gap-3 rounded-md border border-[var(--brand-line-strong)] bg-[var(--brand-panel)] px-3 py-2 font-mono text-xs text-[var(--brand-muted)] shadow-[var(--brand-shadow)]">
            <span className="size-2 rounded-full bg-[var(--brand-accent)]" />
            Open source voice layer
          </div>
          <h1 className="font-serif text-5xl leading-none text-[var(--brand-ink)] sm:text-7xl lg:text-8xl">
            VoiceClaw
          </h1>
          <p className="mt-6 max-w-2xl font-serif text-3xl leading-tight text-[var(--brand-ink)] sm:text-5xl">
            Voice for the agent you already trust.
          </p>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-[var(--brand-muted)] sm:text-xl">
            Talk to your own agent on iPhone and Mac. Point VoiceClaw at an
            OpenAI-compatible endpoint and it handles the mic, the route, and
            the transcript while your agent does the real work.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a
              href="https://github.com/yagudaev/voiceclaw"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[var(--brand-accent)] px-5 text-sm font-semibold text-primary-foreground transition hover:bg-[var(--brand-accent-hover)]"
            >
              <GitBranch className="size-4" />
              View on GitHub
            </a>
            <Link
              href="/brand"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-[var(--brand-line-strong)] bg-[var(--brand-panel)] px-5 text-sm font-semibold text-[var(--brand-ink)] transition hover:border-[var(--brand-accent)]"
            >
              <BookOpen className="size-4" />
              Brand guidelines
            </Link>
          </div>
        </div>
        <div className="mt-8 grid max-w-md grid-cols-3 gap-2 rounded-md border border-[var(--brand-line-strong)] bg-[var(--brand-panel)] p-3 shadow-[var(--brand-shadow)] sm:mt-14 sm:max-w-3xl sm:gap-4 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
          {PRODUCT_PROOF.map((item) => (
            <StatBlock key={item.label} value={item.value} label={item.label} />
          ))}
        </div>
      </div>
    </section>
  )
}

function ProofSection() {
  return (
    <section className="border-b border-[var(--brand-line-strong)] bg-[var(--brand-paper)] px-5 py-20 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="Why it exists"
          title="Bring the brain. VoiceClaw keeps the conversation precise."
          description="Realtime voice models are fast, but your useful agent already knows your tools. VoiceClaw sits between microphone and endpoint as a thin interface layer."
        />
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          <FeatureCard
            icon={<Mic2 className="size-5" />}
            title="Natural voice in front"
            description="Low-latency voice sessions with transcript continuity and clear live state."
          />
          <FeatureCard
            icon={<Route className="size-5" />}
            title="Your agent behind it"
            description="Route speech into OpenClaw, Hermes, MCP-based agents, or your own OpenAI-compatible service."
          />
          <FeatureCard
            icon={<ShieldCheck className="size-5" />}
            title="Open source by default"
            description="Run the relay yourself, inspect the code, and keep provider keys under your control."
          />
        </div>
      </div>
    </section>
  )
}

function WorkflowSection() {
  return (
    <section
      id="work"
      className="border-b border-[var(--brand-line-strong)] bg-[var(--brand-panel)] px-5 py-20 sm:px-8"
    >
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(360px,1fr)]">
        <SectionHeading
          eyebrow="Signal path"
          title="A calmer way to route live work."
          description="The product should feel like an instrument panel stripped to essentials. Every surface explains where the signal is, where it is going, and what came back."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-md border border-[var(--brand-line-strong)] bg-[var(--brand-panel-strong)] p-5 shadow-[var(--brand-shadow)]">
            <div className="mb-5 flex items-center justify-between">
              <p className="font-mono text-xs text-[var(--brand-muted)]">
                SESSION FIELD
              </p>
              <span className="rounded-md bg-[var(--brand-accent-wash)] px-2 py-1 font-mono text-xs text-[var(--brand-accent)]">
                live
              </span>
            </div>
            <SignalBars />
            <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
              <MiniMetric label="Latency" value="182ms" />
              <MiniMetric label="Mode" value="Bridge" />
              <MiniMetric label="Scope" value="BYO" />
            </div>
          </div>
          <ol className="grid gap-4">
            <WorkflowStep
              number="01"
              title="Talk"
              description="A clear mic state tells the user when VoiceClaw is listening."
            />
            <WorkflowStep
              number="02"
              title="Route"
              description="VoiceClaw sends the turn to the configured agent endpoint."
            />
            <WorkflowStep
              number="03"
              title="Read back"
              description="The reply returns as audio, transcript, and context you can skim."
            />
          </ol>
        </div>
      </div>
    </section>
  )
}

function PlatformSection() {
  return (
    <section className="border-b border-[var(--brand-line-strong)] bg-[var(--brand-paper)] px-5 py-20 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="Surfaces"
          title="One brand, native to iPhone and Mac."
          description="The website sets the system: warm field, carbon type, fine rules, and one rust signal. Product surfaces inherit the same restraint without forcing the same layout."
        />
        <div className="mt-12 grid gap-4 lg:grid-cols-2">
          <SurfaceCard
            icon={<RadioTower className="size-5" />}
            title="Mobile"
            description="Fast voice capture, clean session state, and thumb-reachable controls for iPhone."
          />
          <SurfaceCard
            icon={<TerminalSquare className="size-5" />}
            title="Desktop"
            description="A menu-bar companion with compact panels, system theme respect, and visible routing state."
          />
        </div>
      </div>
    </section>
  )
}

function GetStartedSection() {
  return (
    <section className="bg-[var(--brand-contrast-bg)] px-5 py-20 text-[var(--brand-contrast-fg)] sm:px-8">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <p className="font-mono text-xs uppercase text-[var(--brand-contrast-muted)]">
            Get started
          </p>
          <h2 className="mt-4 max-w-3xl font-serif text-5xl leading-none sm:text-6xl">
            Give your existing agent a voice front end.
          </h2>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--brand-contrast-muted)]">
            Clone the repo, run the relay, connect your endpoint, and start
            talking. No hosted brain required.
          </p>
        </div>
        <div className="flex flex-col justify-end gap-3">
          <a
            href="https://github.com/yagudaev/voiceclaw"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[var(--brand-contrast-fg)] px-5 text-sm font-semibold text-[var(--brand-contrast-bg)] transition hover:bg-[var(--brand-contrast-fg-hover)]"
          >
            <GitBranch className="size-4" />
            Open repository
          </a>
          <a
            href="https://github.com/yagudaev/voiceclaw#quick-start"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-[var(--brand-contrast-line)] px-5 text-sm font-semibold text-[var(--brand-contrast-fg)] transition hover:border-[var(--brand-contrast-fg)]"
          >
            Quick start
            <ArrowRight className="size-4" />
          </a>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-[var(--brand-line-strong)] bg-[var(--brand-paper)] px-5 py-8 sm:px-8">
      <div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 text-sm text-[var(--brand-muted)] sm:flex-row sm:items-center">
        <BrandWordmark />
        <div className="flex gap-5">
          <Link href="/brand" className="hover:text-[var(--brand-ink)]">
            Brand guidelines
          </Link>
          <a
            href="https://github.com/yagudaev/voiceclaw"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--brand-ink)]"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <article className="rounded-md border border-[var(--brand-line-strong)] bg-[var(--brand-panel)] p-6 shadow-[var(--brand-shadow)]">
      <div className="mb-5 flex size-10 items-center justify-center rounded-md bg-[var(--brand-accent-wash)] text-[var(--brand-accent)]">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-[var(--brand-ink)]">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-[var(--brand-muted)]">
        {description}
      </p>
    </article>
  )
}

function WorkflowStep({
  number,
  title,
  description,
}: {
  number: string
  title: string
  description: string
}) {
  return (
    <li className="rounded-md border border-[var(--brand-line-strong)] bg-[var(--brand-panel-strong)] p-5 shadow-[var(--brand-shadow)]">
      <p className="font-mono text-xs text-[var(--brand-accent)]">
        {number}
      </p>
      <h3 className="mt-3 text-lg font-semibold text-[var(--brand-ink)]">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-7 text-[var(--brand-muted)]">
        {description}
      </p>
    </li>
  )
}

function SurfaceCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <article className="rounded-md border border-[var(--brand-line-strong)] bg-[var(--brand-panel)] p-6 shadow-[var(--brand-shadow)]">
      <div className="flex items-start gap-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-md border border-[var(--brand-line-strong)] bg-[var(--brand-panel-strong)] text-[var(--brand-ink)]">
          {icon}
        </div>
        <div>
          <h3 className="text-xl font-semibold text-[var(--brand-ink)]">
            {title}
          </h3>
          <p className="mt-3 text-sm leading-7 text-[var(--brand-muted)]">
            {description}
          </p>
        </div>
      </div>
    </article>
  )
}

function MiniMetric({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="border-t border-[var(--brand-line)] pt-3">
      <p className="font-mono text-xs text-[var(--brand-ink)]">
        {value}
      </p>
      <p className="mt-1 text-xs text-[var(--brand-muted)]">{label}</p>
    </div>
  )
}
