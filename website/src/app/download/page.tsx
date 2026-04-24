import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Download,
  ShieldCheck,
} from "lucide-react"
import { BrandWordmark } from "@/components/brand/brand-system"
import { ThemeSwitcher } from "@/components/theme-switcher"

const REPO_URL = "https://github.com/yagudaev/voiceclaw"
const RELEASES_URL = "https://github.com/yagudaev/voiceclaw/releases"
const MAC_DOWNLOAD_URL = "/api/download/mac"
const SYSTEM_REQUIREMENT = "macOS 11 Big Sur or later"

export const metadata: Metadata = {
  title: "Download VoiceClaw for Mac",
  description:
    "Universal build for Apple Silicon and Intel Macs. Signed, notarized, and open source.",
}

type DownloadPageProps = {
  searchParams?: Promise<{ empty?: string }>
}

export default async function DownloadPage({ searchParams }: DownloadPageProps) {
  const params = (await searchParams) ?? {}
  const isEmpty = params.empty === "1"

  return (
    <main className="min-h-screen bg-[var(--brand-paper)] text-[var(--brand-ink)]">
      <Header />
      <section className="border-b border-[var(--brand-line-strong)] px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-4xl">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-[var(--brand-accent)]">
            Download
          </p>
          <h1 className="mt-6 font-serif text-5xl leading-none sm:text-7xl">
            VoiceClaw for Mac.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--brand-muted)] sm:text-xl">
            One universal build for every Mac you own. Point it at your agent,
            click the mic, and start talking.
          </p>

          {isEmpty ? <EmptyStateNotice /> : <DownloadCard />}

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <InfoTile
              icon={<Cpu className="size-5" />}
              title="Universal"
              body="One download runs natively on Apple Silicon and Intel. No chip-picker step at install."
            />
            <InfoTile
              icon={<ShieldCheck className="size-5" />}
              title="Signed and notarized"
              body="Developer ID signed and Apple-notarized every release, so Gatekeeper stays quiet."
            />
            <InfoTile
              icon={<CheckCircle2 className="size-5" />}
              title="Open source"
              body={`Read the code, file issues, send patches. MIT license on ${friendlyHost(REPO_URL)}.`}
            />
          </div>

          <RequirementsBlock />

          <AppStoreNotice />
        </div>
      </section>
      <Footer />
    </main>
  )
}

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--brand-line-strong)] bg-[var(--brand-paper)]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link href="/" aria-label="VoiceClaw home">
          <BrandWordmark />
        </Link>
        <nav className="flex items-center gap-2 text-sm text-[var(--brand-muted)] sm:gap-5">
          <Link
            href="/"
            className="inline-flex items-center gap-2 hover:text-[var(--brand-ink)]"
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">Home</span>
          </Link>
          <ThemeSwitcher />
        </nav>
      </div>
    </header>
  )
}

function DownloadCard() {
  return (
    <div className="mt-10 rounded-md border border-[var(--brand-line-strong)] bg-[var(--brand-panel)] p-6 shadow-[var(--brand-shadow)] sm:p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-[var(--brand-muted)]">
            Latest release
          </p>
          <p className="mt-3 font-serif text-2xl text-[var(--brand-ink)] sm:text-3xl">
            VoiceClaw for macOS
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--brand-muted)]">
            Universal DMG — Apple Silicon and Intel in a single file.
          </p>
        </div>
        <a
          href={MAC_DOWNLOAD_URL}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[var(--brand-accent)] px-5 text-sm font-semibold text-primary-foreground transition hover:bg-[var(--brand-accent-hover)]"
        >
          <Download className="size-4" />
          Download for Mac
        </a>
      </div>
      <p className="mt-5 text-xs text-[var(--brand-muted)]">
        Clicking the button redirects to the latest release on GitHub. Every
        version is Developer ID signed and Apple-notarized.
      </p>
    </div>
  )
}

function EmptyStateNotice() {
  return (
    <div className="mt-10 rounded-md border border-[var(--brand-line-strong)] bg-[var(--brand-panel)] p-6 shadow-[var(--brand-shadow)] sm:p-8">
      <p className="font-mono text-xs uppercase tracking-[0.24em] text-[var(--brand-accent)]">
        Not quite yet
      </p>
      <h2 className="mt-4 font-serif text-3xl leading-tight text-[var(--brand-ink)]">
        No build is live on this channel yet.
      </h2>
      <p className="mt-4 max-w-xl text-sm leading-7 text-[var(--brand-muted)]">
        A public DMG is landing shortly. In the meantime you can watch{" "}
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-[var(--brand-ink)] underline decoration-[var(--brand-accent)] underline-offset-4"
        >
          the repository
        </a>{" "}
        for the first tagged release.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <a
          href={RELEASES_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[var(--brand-line-strong)] bg-[var(--brand-panel-strong)] px-4 text-sm font-semibold text-[var(--brand-ink)] transition hover:border-[var(--brand-accent)]"
        >
          View releases
          <ArrowRight className="size-4" />
        </a>
      </div>
    </div>
  )
}

function RequirementsBlock() {
  return (
    <div className="mt-10 rounded-md border border-[var(--brand-line-strong)] bg-[var(--brand-panel-strong)] p-6">
      <p className="font-mono text-xs uppercase tracking-[0.24em] text-[var(--brand-muted)]">
        System requirements
      </p>
      <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-[var(--brand-muted)]">Operating system</dt>
          <dd className="mt-1 text-[var(--brand-ink)]">{SYSTEM_REQUIREMENT}</dd>
        </div>
        <div>
          <dt className="text-[var(--brand-muted)]">Architecture</dt>
          <dd className="mt-1 text-[var(--brand-ink)]">Apple Silicon and Intel (universal)</dd>
        </div>
        <div>
          <dt className="text-[var(--brand-muted)]">Microphone</dt>
          <dd className="mt-1 text-[var(--brand-ink)]">Required for voice sessions</dd>
        </div>
        <div>
          <dt className="text-[var(--brand-muted)]">Agent endpoint</dt>
          <dd className="mt-1 text-[var(--brand-ink)]">Any OpenAI-compatible service</dd>
        </div>
      </dl>
    </div>
  )
}

function AppStoreNotice() {
  return (
    <div className="mt-10 rounded-md border border-dashed border-[var(--brand-line-strong)] bg-transparent p-6">
      <p className="font-mono text-xs uppercase tracking-[0.24em] text-[var(--brand-muted)]">
        Heading to the Mac App Store
      </p>
      <p className="mt-3 text-sm leading-7 text-[var(--brand-muted)]">
        A Mac App Store build is on the way. The DMG here stays the canonical
        way to install VoiceClaw until review lands.
      </p>
    </div>
  )
}

function Footer() {
  return (
    <footer className="border-t border-[var(--brand-line-strong)] bg-[var(--brand-paper)] px-5 py-8 sm:px-8">
      <div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 text-sm text-[var(--brand-muted)] sm:flex-row sm:items-center">
        <BrandWordmark />
        <div className="flex flex-wrap gap-5">
          <a
            href={RELEASES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--brand-ink)]"
          >
            Release notes
          </a>
          <Link href="/brand" className="hover:text-[var(--brand-ink)]">
            Brand guidelines
          </Link>
          <a
            href={REPO_URL}
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

function InfoTile({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <article className="rounded-md border border-[var(--brand-line-strong)] bg-[var(--brand-panel)] p-5 shadow-[var(--brand-shadow)]">
      <div className="mb-4 flex size-10 items-center justify-center rounded-md bg-[var(--brand-accent-wash)] text-[var(--brand-accent)]">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-[var(--brand-ink)]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--brand-muted)]">{body}</p>
    </article>
  )
}

function friendlyHost(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "")
  } catch {
    return url
  }
}
