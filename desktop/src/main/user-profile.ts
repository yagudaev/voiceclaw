import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { getWorkspaceDir } from './identity'

export type UserProfile = {
  name: string
  bio: string
}

export const DEFAULT_USER: UserProfile = {
  name: 'Friend',
  bio: '',
}

export function getUserProfilePath(): string {
  return join(getWorkspaceDir(), 'USER.md')
}

export function readUserProfile(): UserProfile {
  const path = getUserProfilePath()
  if (!existsSync(path)) return { ...DEFAULT_USER }
  let content = ''
  try {
    content = readFileSync(path, 'utf8')
  } catch {
    return { ...DEFAULT_USER }
  }
  return {
    name: readSection(content, 'Name') || DEFAULT_USER.name,
    bio: readSection(content, 'About') || DEFAULT_USER.bio,
  }
}

export function writeUserProfile(profile: Partial<UserProfile>): UserProfile {
  const merged: UserProfile = {
    name: profile.name?.trim() || DEFAULT_USER.name,
    bio: profile.bio?.trim() ?? DEFAULT_USER.bio,
  }
  const dir = getWorkspaceDir()
  mkdirSync(dir, { recursive: true })
  writeFileSync(getUserProfilePath(), renderUserProfileMarkdown(merged), { mode: 0o600 })
  return merged
}

export function hasUserProfile(): boolean {
  return existsSync(getUserProfilePath())
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderUserProfileMarkdown(profile: UserProfile): string {
  const bio = profile.bio.trim()
  return [
    '# USER.md - Who Are You Talking To?',
    '',
    '## Name',
    profile.name,
    '',
    '## About',
    bio.length > 0 ? bio : '_(not provided)_',
    '',
  ].join('\n')
}

function readSection(content: string, heading: string): string | null {
  const lines = content.split('\n')
  const target = `## ${heading}`.toLowerCase()
  let inSection = false
  const captured: string[] = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.toLowerCase().startsWith('## ')) {
      if (inSection) break
      inSection = trimmed.toLowerCase() === target
      continue
    }
    if (inSection) captured.push(line)
  }
  const body = captured.join('\n').trim()
  if (!body || body === '_(not provided)_') return null
  return body
}
