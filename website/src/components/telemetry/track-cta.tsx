"use client"

import { type ComponentProps } from "react"
import Link from "next/link"
import { capture } from "@/lib/telemetry/posthog-client"

type Props = ComponentProps<typeof Link> & {
  ctaLocation: string
  ctaLabel: string
}

// Drop-in <Link> wrapper that fires a `cta_clicked` event before
// navigation. We don't await the capture so it doesn't slow the click;
// posthog-js batches and flushes via the SDK's own keepalive logic.
export function TrackCtaLink({ ctaLocation, ctaLabel, onClick, ...rest }: Props) {
  return (
    <Link
      {...rest}
      onClick={(e) => {
        capture("cta_clicked", {
          location: ctaLocation,
          label: ctaLabel,
          href: typeof rest.href === "string" ? rest.href : undefined,
        })
        onClick?.(e)
      }}
    />
  )
}
