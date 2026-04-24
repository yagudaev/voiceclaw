import Link from "next/link"
import type { ReactNode } from "react"

// Shared container for legal pages (privacy, terms, legal index).
// Minimal styling — a follow-up PR restyles this to match Option B
// (paper + serif) once the brand system lands on the marketing site.
// For now: readable, neutral, link back to home.

type LegalPageProps = {
  title: string
  lastUpdated: string
  lede?: string
  children: ReactNode
}

export function LegalPage({ title, lastUpdated, lede, children }: LegalPageProps) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
      <nav className="mb-12 text-sm text-muted-foreground">
        <Link href="/" className="transition-colors hover:text-foreground">
          ← VoiceClaw
        </Link>
      </nav>

      <header className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Last updated: {lastUpdated}
        </p>
        {lede ? (
          <p className="mt-6 text-lg leading-7 text-muted-foreground">{lede}</p>
        ) : null}
      </header>

      <div className="max-w-none space-y-8 text-[15px] leading-7 [&_h2]:mt-12 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h3]:mt-8 [&_h3]:text-lg [&_h3]:font-medium [&_ul]:list-disc [&_ul]:pl-6 [&_a]:underline [&_a]:underline-offset-2">
        {children}
      </div>

      <footer className="mt-16 border-t border-border/40 pt-8 text-sm text-muted-foreground">
        <p>
          Questions? Email{" "}
          <a href="mailto:support@getvoiceclaw.com" className="underline">
            support@getvoiceclaw.com
          </a>
          .
        </p>
        <p className="mt-2">
          VoiceClaw is a product of <strong>Nano 3 Labs Ltd.</strong>, Vancouver, BC, Canada.
        </p>
      </footer>
    </div>
  )
}
