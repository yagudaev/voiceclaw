"use client"

import { type AnchorHTMLAttributes } from "react"
import { capture } from "@/lib/telemetry/posthog-client"

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & {
  ctaLocation: string
  ctaLabel: string
}

// Anchor variant of TrackCtaLink for hrefs that need to hit our API
// routes (e.g. /api/download/mac which 307-redirects to GitHub).
export function TrackCtaAnchor({
  ctaLocation,
  ctaLabel,
  onClick,
  ...rest
}: Props) {
  return (
    <a
      {...rest}
      onClick={(e) => {
        capture("cta_clicked", {
          location: ctaLocation,
          label: ctaLabel,
          href: rest.href,
        })
        onClick?.(e)
      }}
    />
  )
}
