import { app } from 'electron'
import { mkdirSync, createWriteStream } from 'fs'
import { join } from 'path'

// Central log directory for VoiceClaw + the services it spawns. Creating
// writes under ~/Library/Logs/VoiceClaw/ on macOS (per Apple convention)
// so logs survive app uninstalls (matches `feedback_no_data_wipe` rule)
// and are easy to tail via Console.app.

let logDir: string | null = null

export function getLogDir(): string {
  if (logDir) return logDir
  // app.getPath('logs') maps to ~/Library/Logs/<AppName>/ on darwin.
  const dir = app.getPath('logs')
  mkdirSync(dir, { recursive: true })
  logDir = dir
  return dir
}

export function openLogStream(filename: string): ReturnType<typeof createWriteStream> {
  const dir = getLogDir()
  const path = join(dir, filename)
  return createWriteStream(path, { flags: 'a' })
}

export function logFilePath(filename: string): string {
  return join(getLogDir(), filename)
}
