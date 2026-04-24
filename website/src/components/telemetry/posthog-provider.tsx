"use client"

import { useEffect } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { capture, getClient } from "@/lib/telemetry/posthog-client"

// Mounts on the client and triggers PostHog init. Also reports a manual
// $pageview on route changes since the App Router doesn't fire a full
// navigation that posthog-js's auto-pageview can detect on its own.

export function PostHogClientProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    // kick off lazy init
    getClient().catch(() => {
      // ignore — no telemetry is fine
    })
  }, [])

  useEffect(() => {
    if (!pathname) return
    const url =
      typeof window === "undefined"
        ? pathname
        : window.location.origin + pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "")
    capture("$pageview", { $current_url: url })
  }, [pathname, searchParams])

  return <>{children}</>
}
