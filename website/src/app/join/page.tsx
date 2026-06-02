import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, Mic, RadioTower, ShieldCheck } from "lucide-react"
import { BrandWordmark } from "@/components/brand/brand-system"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { JoinForm } from "@/components/join/join-form"

const REPO_URL = "https://github.com/yagudaev/voiceclaw"
const RELEASES_URL = "https://github.com/yagudaev/voiceclaw/releases"

export const metadata: Metadata = {
  title: "Join VoiceClaw",
  description:
    "Get launch notes, TestFlight invites, and build updates for VoiceClaw — the open-source voice layer for your agent.",
}

export default function JoinPage() {
  return (
    <main className="min-h-screen bg-[var(--brand-paper)] text-[var(--brand-ink)]">
      <Header />
      <section className="border-b border-[var(--brand-line-strong)] px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-4xl">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-[var(--brand-accent)]">
            Join
          </p>
          <h1 className="mt-6 font-serif text-5xl leading-none sm:text-7xl">
            Get on the list.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--brand-muted)] sm:text-xl">
            Drop your email and we&apos;ll send launch notes, TestFlight invites,
            and the occasional build update. Voice for the agent you already
            trust.
          </p>

          <div className="mt-10">
            <JoinForm />
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <InfoTile
              icon={<Mic className="size-5" />}
              title="Natural voice in front"
              body="Low-latency voice sessions with transcript continuity and clear live state."
            />
            <InfoTile
              icon={<RadioTower className="size-5" />}
              title="iPhone TestFlight"
              body="Members get TestFlight invites first while App Store review wraps up."
            />
            <InfoTile
              icon={<ShieldCheck className="size-5" />}
              title="Open source"
              body="Run the relay yourself, inspect the code, and keep provider keys under your control."
            />
          </div>

          <p className="mt-10 text-sm text-[var(--brand-muted)]">
            Already have a Mac?{" "}
            <Link
              href="/download"
              className="font-semibold text-[var(--brand-ink)] underline decoration-[var(--brand-accent)] underline-offset-4"
            >
              Download the macOS app
            </Link>
            .
          </p>
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
