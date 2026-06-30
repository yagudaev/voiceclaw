"use client"

import { useState, type FormEvent } from "react"
import { ArrowRight, CheckCircle2 } from "lucide-react"
import { capture } from "@/lib/telemetry/posthog-client"

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; alreadySubscribed: boolean }
  | { kind: "error"; message: string }

const ERROR_COPY: Record<string, string> = {
  invalid_email: "That email doesn't look right. Try again.",
  not_configured: "Signup isn't live yet. Check back soon.",
  rate_limited: "Too many tries. Give it a minute and retry.",
  upstream_error: "Something went wrong on our end. Try again.",
  network_error: "Couldn't reach the server. Check your connection.",
}

export function JoinForm() {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<Status>({ kind: "idle" })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (status.kind === "submitting") return

    setStatus({ kind: "submitting" })
    capture("join_submitted", { location: "join_page" })

    let response: Response
    try {
      response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
    } catch {
      setStatus({ kind: "error", message: ERROR_COPY.network_error })
      return
    }

    const payload = (await safeJson(response)) as
      | { ok?: boolean; alreadySubscribed?: boolean; error?: string }
      | null

    if (response.ok && payload?.ok) {
      capture("join_succeeded", {
        location: "join_page",
        already_subscribed: Boolean(payload.alreadySubscribed),
      })
      setStatus({
        kind: "success",
        alreadySubscribed: Boolean(payload.alreadySubscribed),
      })
      setEmail("")
      return
    }

    const code = payload?.error ?? "upstream_error"
    capture("join_failed", { location: "join_page", error: code })
    setStatus({ kind: "error", message: ERROR_COPY[code] ?? ERROR_COPY.upstream_error })
  }

  if (status.kind === "success") {
    return (
      <div
        role="status"
        className="rounded-md border border-[var(--brand-line-strong)] bg-[var(--brand-panel)] p-6 shadow-[var(--brand-shadow)] sm:p-8"
      >
        <div className="flex items-start gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-[var(--brand-accent-wash)] text-[var(--brand-accent)]">
            <CheckCircle2 className="size-5" />
          </div>
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-[var(--brand-accent)]">
              {status.alreadySubscribed ? "Already on the list" : "You're in"}
            </p>
            <h2 className="mt-3 font-serif text-2xl leading-tight text-[var(--brand-ink)] sm:text-3xl">
              {status.alreadySubscribed
                ? "We already have your email."
                : "Welcome aboard."}
            </h2>
            <p className="mt-3 text-sm leading-7 text-[var(--brand-muted)]">
              We&apos;ll send launch notes, TestFlight invites, and the occasional
              build update. No noise.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const submitting = status.kind === "submitting"

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-md border border-[var(--brand-line-strong)] bg-[var(--brand-panel)] p-6 shadow-[var(--brand-shadow)] sm:p-8"
    >
      <label
        htmlFor="join-email"
        className="font-mono text-xs uppercase tracking-[0.24em] text-[var(--brand-muted)]"
      >
        Email
      </label>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <input
          id="join-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          placeholder="you@domain.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={submitting}
          aria-invalid={status.kind === "error" || undefined}
          aria-describedby={status.kind === "error" ? "join-error" : undefined}
          className="h-12 flex-1 rounded-md border border-[var(--brand-line-strong)] bg-[var(--brand-panel-strong)] px-4 text-base text-[var(--brand-ink)] placeholder:text-[var(--brand-muted)] focus:border-[var(--brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent-wash)] disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[var(--brand-accent)] px-5 text-sm font-semibold text-primary-foreground transition hover:bg-[var(--brand-accent-hover)] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? "Joining..." : "Join"}
          {!submitting && <ArrowRight className="size-4" />}
        </button>
      </div>
      {status.kind === "error" && (
        <p
          id="join-error"
          role="alert"
          className="mt-4 text-sm text-destructive"
        >
          {status.message}
        </p>
      )}
      <p className="mt-5 text-xs leading-6 text-[var(--brand-muted)]">
        We use your email only to send VoiceClaw updates. Unsubscribe any time.
      </p>
    </form>
  )
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return null
  }
}
