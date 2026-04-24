import { NextResponse } from "next/server"
import {
  getLatestMacReleaseDownload,
  getMacDownloadFallbackUrl,
} from "@/lib/downloads"
import { withCapture } from "@/lib/telemetry/posthog-server"

export const GET = withCapture(async () => {
  const release = await getLatestMacReleaseDownload()

  return NextResponse.redirect(
    release?.downloadUrl ?? getMacDownloadFallbackUrl(),
    307,
  )
}, "/api/download/mac")
