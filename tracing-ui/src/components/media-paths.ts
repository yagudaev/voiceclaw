import type { MediaRow } from "@/lib/db"

export type SessionMediaUrls = {
  sessionDir: string
  userAudioUrl: string | null
  assistantAudioUrl: string | null
  peaksUrl: string
  thumbnailsUrl: string
}

export function getSessionMediaUrls(sessionId: string, media: MediaRow[]): SessionMediaUrls {
  const userAudio = media.find((m) => m.kind === "session_user_audio")
  const assistantAudio = media.find((m) => m.kind === "session_assistant_audio")
  const peaks = media.find((m) => m.kind === "session_peaks")
  const thumbnails = media.find((m) => m.kind === "session_thumbnails")
  const sessionDir =
    sessionDirFromFilePath(peaks?.file_path)
    ?? sessionDirFromFilePath(thumbnails?.file_path)
    ?? sessionDirFromFilePath(userAudio?.file_path)
    ?? sessionDirFromFilePath(assistantAudio?.file_path)
    ?? sessionId

  return {
    sessionDir,
    userAudioUrl:
      mediaUrlFromFilePath(userAudio?.file_path ?? null)
      ?? mediaPathUrl(sessionDir, ["session", "user.wav"]),
    assistantAudioUrl:
      mediaUrlFromFilePath(assistantAudio?.file_path ?? null)
      ?? mediaPathUrl(sessionDir, ["session", "assistant.wav"]),
    peaksUrl:
      mediaUrlFromFilePath(peaks?.file_path ?? null)
      ?? mediaPathUrl(sessionDir, ["session", "peaks.json"]),
    thumbnailsUrl:
      mediaUrlFromFilePath(thumbnails?.file_path ?? null)
      ?? mediaPathUrl(sessionDir, ["session", "thumbnails.json"]),
  }
}

export function mediaUrlFromFilePath(filePath: string | null): string | null {
  if (!filePath) return null
  const parts = filePath.split("/").filter(Boolean)
  if (parts.length < 2) return null
  const sessionDir = sessionDirFromFilePath(filePath)
  if (!sessionDir) return null
  const sessionIdx = parts.lastIndexOf(sessionDir)
  if (sessionIdx < 0 || sessionIdx >= parts.length - 1) return null
  return mediaPathUrl(sessionDir, parts.slice(sessionIdx + 1))
}

export function mediaDirUrlFromFilePath(filePath: string | null): string | null {
  if (!filePath) return null
  const parts = filePath.split("/").filter(Boolean)
  if (parts.length < 2) return null
  const dirName = parts[parts.length - 1]
  const sessionDir = parts[parts.length - 2]
  return mediaPathUrl(sessionDir, [dirName])
}

export function mediaPathUrl(sessionDir: string, path: string | string[]): string {
  const parts = Array.isArray(path) ? path : path.split("/")
  return `/api/media/${encodeURIComponent(sessionDir)}/${parts
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/")}`
}

function sessionDirFromFilePath(filePath: string | null | undefined): string | null {
  if (!filePath) return null
  const parts = filePath.split("/").filter(Boolean)
  const sessionIdx = parts.lastIndexOf("session")
  if (sessionIdx > 0) return parts[sessionIdx - 1]
  if (parts.length >= 2) return parts[parts.length - 2]
  return null
}
