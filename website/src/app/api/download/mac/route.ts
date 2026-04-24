import { NextResponse } from "next/server"
import {
  getLatestMacReleaseDownload,
  getMacDownloadFallbackUrl,
} from "@/lib/downloads"

export async function GET() {
  const release = await getLatestMacReleaseDownload()

  return NextResponse.redirect(
    release?.downloadUrl ?? getMacDownloadFallbackUrl(),
    307,
  )
}
