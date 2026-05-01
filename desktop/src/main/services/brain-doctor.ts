import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { app } from 'electron'
import { getProviderKey } from '../provider-keys'

export type CheckStatus = 'PASS' | 'FAIL' | 'SKIP'

export type CheckResult = {
  status: CheckStatus
  label: string
  detail: string | null
  hint: string | null
}

export type DoctorResult = {
  checks: CheckResult[]
  passed: number
  failed: number
  skipped: number
}

type Acc = CheckResult[]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pass(acc: Acc, label: string, detail?: string): void {
  acc.push({ status: 'PASS', label, detail: detail ?? null, hint: null })
}

function fail(acc: Acc, label: string, detail?: string, hint?: string): void {
  acc.push({ status: 'FAIL', label, detail: detail ?? null, hint: hint ?? null })
}

function skip(acc: Acc, label: string, detail?: string): void {
  acc.push({ status: 'SKIP', label, detail: detail ?? null, hint: null })
}

function safeReadJson(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return null
  }
}

async function safeFetch(url: string, opts: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal })
    clearTimeout(timer)
    return res
  } catch (err) {
    clearTimeout(timer)
    throw err
  }
}

// ---------------------------------------------------------------------------
// Individual checks
// ---------------------------------------------------------------------------

function checkOpenclawScript(acc: Acc): void {
  const relative = join('openclaw', 'openclaw.mjs')
  const scriptPath = app.isPackaged
    ? join(process.resourcesPath, relative)
    : join(__dirname, '..', '..', '..', 'vendor', 'openclaw', 'openclaw.mjs')
  const devOpenclawScript = scriptPath
  if (existsSync(devOpenclawScript)) {
    pass(acc, 'openclaw script', devOpenclawScript)
  } else {
    fail(
      acc,
      'openclaw script',
      `not found at ${devOpenclawScript}`,
      'Run: git submodule update --init vendor/openclaw OR yarn build:openclaw-bundle',
    )
  }
}

function checkBundledNode(acc: Acc): void {
  const vendorNodeDir = app.isPackaged
    ? join(process.resourcesPath, 'node')
    : join(__dirname, '..', '..', '..', 'vendor', 'node')
  let bundledNodePath: string | null = null
  for (const candidate of [
    join(vendorNodeDir, 'bin', 'node'),
    join(vendorNodeDir, 'node.exe'),
    join(__dirname, '..', '..', '..', 'resources', 'node', 'bin', 'node'),
  ]) {
    if (existsSync(candidate)) {
      bundledNodePath = candidate
      break
    }
  }

  if (!bundledNodePath) {
    fail(
      acc,
      'bundled node binary',
      'not found in vendor/node/ or resources/node/',
      'Run: node desktop/scripts/fetch-node.mjs to download the bundled runtime',
    )
    return
  }

  try {
    const ver = execSync(`"${bundledNodePath}" --version`, { encoding: 'utf8' }).trim()
    const match = ver.match(/^v(\d+)\.(\d+)/)
    if (match) {
      const major = parseInt(match[1])
      const minor = parseInt(match[2])
      if (major > 22 || (major === 22 && minor >= 12)) {
        pass(acc, 'bundled node binary', `${ver} at ${bundledNodePath}`)
      } else {
        fail(
          acc,
          'bundled node binary',
          `version ${ver} is below v22.12`,
          'Run: node desktop/scripts/fetch-node.mjs to fetch a newer runtime',
        )
      }
    } else {
      pass(acc, 'bundled node binary', `${ver} at ${bundledNodePath}`)
    }
  } catch (err) {
    fail(
      acc,
      'bundled node binary',
      `exists but cannot run: ${(err as Error).message}`,
      'Check file permissions on the binary',
    )
  }
}

function checkOpenclawConfigFile(acc: Acc, configPath: string): void {
  if (existsSync(configPath)) {
    pass(acc, 'openclaw config file', configPath)
  } else {
    fail(
      acc,
      'openclaw config file',
      `not found at ${configPath}`,
      'Launch VoiceClaw — the config is created on first run',
    )
  }
}

function checkOpenclawConfigShape(acc: Acc, configPath: string): void {
  if (!existsSync(configPath)) {
    skip(acc, 'openclaw config shape', 'skipped (config missing)')
    return
  }
  const cfg = safeReadJson(configPath) as Record<string, unknown> | null
  if (!cfg) {
    fail(
      acc,
      'openclaw config valid JSON',
      'parse error',
      `Check or delete ${configPath} and relaunch VoiceClaw`,
    )
    return
  }
  const c = cfg as {
    gateway?: { mode?: string }
    models?: { providers?: { google?: { apiKey?: string } } }
    agents?: { defaults?: { model?: { primary?: string } } }
  }
  const gatewayMode = c?.gateway?.mode
  const apiKey = c?.models?.providers?.google?.apiKey
  const primaryModel = c?.agents?.defaults?.model?.primary

  const issues: string[] = []
  if (gatewayMode !== 'local')
    issues.push(`gateway.mode="${gatewayMode ?? 'missing'}" (expected "local")`)
  if (!apiKey || typeof apiKey !== 'string' || apiKey.length < 10)
    issues.push('models.providers.google.apiKey missing or too short')
  if (!primaryModel || typeof primaryModel !== 'string')
    issues.push('agents.defaults.model.primary missing')

  if (issues.length === 0) {
    pass(acc, 'openclaw config shape', `gateway.mode=local, model=${primaryModel}`)
  } else {
    fail(
      acc,
      'openclaw config shape',
      issues.join('; '),
      'Open VoiceClaw Settings → Brain tab and re-save your Gemini API key, then relaunch',
    )
  }
}

function checkOpenclawWorkspace(acc: Acc, openclawStateDir: string): void {
  const workspaceDir = join(openclawStateDir, 'workspace')
  const requiredWorkspaceFiles = ['SOUL.md', 'IDENTITY.md', 'AGENTS.md', 'USER.md', 'BOOTSTRAP.md']

  if (!existsSync(workspaceDir)) {
    fail(
      acc,
      'openclaw workspace',
      `directory missing: ${workspaceDir}`,
      `Run: rm ${join(openclawStateDir, 'workspace-bootstrapped')} 2>/dev/null; relaunch VoiceClaw to re-bootstrap`,
    )
    return
  }

  const missingFiles = requiredWorkspaceFiles.filter((f) => !existsSync(join(workspaceDir, f)))
  if (missingFiles.length === 0) {
    pass(acc, 'openclaw workspace', `all ${requiredWorkspaceFiles.length} expected files present`)
  } else {
    fail(
      acc,
      'openclaw workspace',
      `missing: ${missingFiles.join(', ')}`,
      `Run: rm ${join(openclawStateDir, 'workspace-bootstrapped')} 2>/dev/null; relaunch VoiceClaw to re-bootstrap workspace files`,
    )
  }
}

async function checkOpenclawProcess(acc: Acc): Promise<number | null> {
  let openclawPort: number | null = null
  let openclawRunning = false

  try {
    const pgrepOut = execSync('pgrep -fl openclaw', { encoding: 'utf8' }).trim()
    if (pgrepOut.length > 0) {
      openclawRunning = true
      const portMatch = pgrepOut.match(/--port\s+(\d+)/)
      if (portMatch) openclawPort = parseInt(portMatch[1])
    }
  } catch {
    // pgrep exits 1 when nothing found
  }

  if (!openclawRunning) {
    fail(acc, 'openclaw process running', 'not found via pgrep', 'Quit and relaunch VoiceClaw app')
    return null
  }

  if (!openclawPort) {
    fail(
      acc,
      'openclaw process running',
      'process found but port not detectable from args',
      'Quit and relaunch VoiceClaw; check ~/Library/Logs/VoiceClaw/openclaw-gateway.log',
    )
    return null
  }

  pass(acc, 'openclaw process running', `pid found, port=${openclawPort}`)
  try {
    const res = await safeFetch(`http://127.0.0.1:${openclawPort}/health`, {}, 3_000)
    if (res.ok) {
      pass(acc, 'openclaw /health', `HTTP ${res.status} at port ${openclawPort}`)
    } else {
      fail(
        acc,
        'openclaw /health',
        `HTTP ${res.status}`,
        'Quit and relaunch VoiceClaw; check openclaw-gateway.log',
      )
    }
  } catch (err) {
    fail(
      acc,
      'openclaw /health',
      `fetch failed: ${(err as Error).message}`,
      `tail -50 ~/Library/Logs/VoiceClaw/openclaw-gateway.log`,
    )
  }

  return openclawPort
}

async function checkRelayProcess(acc: Acc): Promise<number | null> {
  let relayPort: number | null = null
  let relayRunning = false

  try {
    const pgrepOut = execSync("pgrep -fl 'relay-server\\|relay/dist'", { encoding: 'utf8' }).trim()
    if (pgrepOut.length > 0) relayRunning = true
  } catch {
    // not found
  }

  if (!relayRunning) {
    try {
      const pgrepOut2 = execSync("pgrep -fl 'relay'", { encoding: 'utf8' }).trim()
      if (pgrepOut2.length > 0) relayRunning = true
    } catch {
      // not found
    }
  }

  const relayPortFromEnv = process.env.RELAY_PORT ? parseInt(process.env.RELAY_PORT) : null
  const commonRelayPorts = [8080, 8081, 8082, 8083]
  for (const p of [relayPortFromEnv, ...commonRelayPorts].filter(
    (x): x is number => x !== null,
  )) {
    try {
      const res = await safeFetch(`http://127.0.0.1:${p}/health`, {}, 1_000)
      if (res.ok) {
        relayPort = p
        relayRunning = true
        break
      }
    } catch {
      // not on this port
    }
  }

  if (!relayRunning || !relayPort) {
    fail(
      acc,
      'relay process running',
      'relay not found on common ports (8080-8083)',
      'Quit and relaunch VoiceClaw; check ~/Library/Logs/VoiceClaw/relay.log',
    )
    return null
  }

  pass(acc, 'relay process running', `responding at port ${relayPort}`)
  return relayPort
}

async function checkPortAgreement(
  acc: Acc,
  relayPort: number | null,
  openclawPort: number | null,
): Promise<void> {
  if (!relayPort || !openclawPort) {
    skip(acc, 'relay ↔ openclaw port agreement', 'skipped (one or both not found)')
    return
  }
  try {
    const res = await safeFetch(`http://127.0.0.1:${openclawPort}/health`, {}, 2_000)
    if (res.ok) {
      pass(acc, 'relay ↔ openclaw port agreement', `openclaw answering on port ${openclawPort}`)
    } else {
      fail(
        acc,
        'relay ↔ openclaw port agreement',
        `openclaw returned HTTP ${res.status} on port ${openclawPort}`,
        'Quit and relaunch VoiceClaw to reallocate ports consistently',
      )
    }
  } catch (err) {
    fail(
      acc,
      'relay ↔ openclaw port agreement',
      `cannot reach openclaw on port ${openclawPort}: ${(err as Error).message}`,
      'Quit and relaunch VoiceClaw',
    )
  }
}

async function checkOpenclawCompletions(
  acc: Acc,
  openclawPort: number | null,
  configPath: string,
): Promise<void> {
  if (!openclawPort) {
    skip(acc, 'openclaw completions endpoint', 'skipped (openclaw not found)')
    return
  }
  const authToken = existsSync(configPath)
    ? (
        (safeReadJson(configPath) as {
          gateway?: { auth?: { token?: string } }
        } | null)?.gateway?.auth?.token
      ) ?? null
    : null
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`

  try {
    const res = await safeFetch(
      `http://127.0.0.1:${openclawPort}/v1/chat/completions`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: 'openclaw',
          messages: [{ role: 'user', content: 'Reply with one word: ready' }],
          stream: false,
          max_tokens: 5,
        }),
      },
      15_000,
    )
    const text = await res.text()
    if (res.ok && text.length > 0) {
      pass(acc, 'openclaw completions endpoint', `HTTP ${res.status}, response length=${text.length}`)
    } else {
      fail(
        acc,
        'openclaw completions endpoint',
        `HTTP ${res.status}, body="${text.substring(0, 200)}"`,
        `tail -50 ~/Library/Logs/VoiceClaw/openclaw-gateway.log`,
      )
    }
  } catch (err) {
    fail(
      acc,
      'openclaw completions endpoint',
      `fetch failed: ${(err as Error).message}`,
      `tail -50 ~/Library/Logs/VoiceClaw/openclaw-gateway.log`,
    )
  }
}

async function checkGeminiApiKey(acc: Acc, configPath: string): Promise<void> {
  const geminiApiKey = existsSync(configPath)
    ? (
        (safeReadJson(configPath) as {
          models?: { providers?: { google?: { apiKey?: string } } }
        } | null)?.models?.providers?.google?.apiKey
      ) ?? null
    : null

  if (!geminiApiKey) {
    skip(acc, 'Gemini API key reachability', 'skipped (no API key in config)')
    return
  }

  try {
    const res = await safeFetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Reply with one word: ok' }] }],
          generationConfig: { maxOutputTokens: 3 },
        }),
      },
      12_000,
    )
    const text = await res.text()
    if (res.ok) {
      pass(acc, 'Gemini API key reachability', `HTTP ${res.status}`)
    } else {
      let hint = 'Check your Gemini API key in VoiceClaw Settings → Brain tab'
      if (res.status === 400)
        hint = 'API key may be invalid. Re-enter it in VoiceClaw Settings → Brain tab'
      if (res.status === 403)
        hint =
          'API key lacks permission. Ensure the Gemini API is enabled in Google Cloud Console'
      if (res.status === 429)
        hint = 'Gemini API quota exceeded. Wait or check your quota at aistudio.google.com'
      fail(
        acc,
        'Gemini API key reachability',
        `HTTP ${res.status}: ${text.substring(0, 200)}`,
        hint,
      )
    }
  } catch (err) {
    fail(
      acc,
      'Gemini API key reachability',
      `fetch failed: ${(err as Error).message}`,
      'Check internet connectivity; if behind a VPN/proxy, try disabling it',
    )
  }
}

async function checkXaiApiKey(acc: Acc): Promise<void> {
  const apiKey = getProviderKey('xai')
  if (!apiKey) {
    skip(acc, 'xAI API key reachability', 'skipped (no xAI key configured)')
    return
  }
  try {
    const res = await safeFetch(
      'https://api.x.ai/v1/models',
      { headers: { Authorization: `Bearer ${apiKey}` } },
      10_000,
    )
    const text = await res.text()
    if (res.ok) {
      pass(acc, 'xAI API key reachability', `HTTP ${res.status}`)
    } else {
      let hint = 'Check your xAI API key in VoiceClaw Settings → Provider tab'
      if (res.status === 401) hint = 'API key invalid or revoked. Re-enter it in Settings → Provider'
      if (res.status === 402 || res.status === 429)
        hint = 'xAI account out of credits or rate limited. Top up at https://console.x.ai/team'
      if (res.status === 403) hint = 'xAI API key lacks permission. Check key settings at https://console.x.ai'
      fail(acc, 'xAI API key reachability', `HTTP ${res.status}: ${text.substring(0, 200)}`, hint)
    }
  } catch (err) {
    fail(
      acc,
      'xAI API key reachability',
      `fetch failed: ${(err as Error).message}`,
      'Check internet connectivity; if behind a VPN/proxy, try disabling it',
    )
  }
}

async function checkOpenAiApiKey(acc: Acc): Promise<void> {
  const apiKey = getProviderKey('openai')
  if (!apiKey) {
    skip(acc, 'OpenAI API key reachability', 'skipped (no OpenAI key configured)')
    return
  }
  try {
    const res = await safeFetch(
      'https://api.openai.com/v1/models',
      { headers: { Authorization: `Bearer ${apiKey}` } },
      10_000,
    )
    const text = await res.text()
    if (res.ok) {
      pass(acc, 'OpenAI API key reachability', `HTTP ${res.status}`)
    } else {
      let hint = 'Check your OpenAI API key in VoiceClaw Settings → Provider tab'
      if (res.status === 401) hint = 'API key invalid or revoked. Re-enter it in Settings → Provider'
      if (res.status === 402 || (res.status === 429 && text.includes('insufficient_quota')))
        hint = 'OpenAI quota exceeded. Top up at https://platform.openai.com/account/billing'
      if (res.status === 429 && !text.includes('insufficient_quota'))
        hint = 'OpenAI rate limit hit. Try again in a moment'
      fail(acc, 'OpenAI API key reachability', `HTTP ${res.status}: ${text.substring(0, 200)}`, hint)
    }
  } catch (err) {
    fail(
      acc,
      'OpenAI API key reachability',
      `fetch failed: ${(err as Error).message}`,
      'Check internet connectivity; if behind a VPN/proxy, try disabling it',
    )
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function runAllChecks(): Promise<DoctorResult> {
  const acc: Acc = []

  const openclawStateDir = join(app.getPath('userData'), 'openclaw')
  const configPath = join(openclawStateDir, 'openclaw.json')

  checkOpenclawScript(acc)
  checkBundledNode(acc)
  checkOpenclawConfigFile(acc, configPath)
  checkOpenclawConfigShape(acc, configPath)
  checkOpenclawWorkspace(acc, openclawStateDir)

  const openclawPort = await checkOpenclawProcess(acc)
  const relayPort = await checkRelayProcess(acc)
  await checkPortAgreement(acc, relayPort, openclawPort)
  await checkOpenclawCompletions(acc, openclawPort, configPath)
  await checkGeminiApiKey(acc, configPath)
  await checkXaiApiKey(acc)
  await checkOpenAiApiKey(acc)

  return {
    checks: acc,
    passed: acc.filter((r) => r.status === 'PASS').length,
    failed: acc.filter((r) => r.status === 'FAIL').length,
    skipped: acc.filter((r) => r.status === 'SKIP').length,
  }
}
