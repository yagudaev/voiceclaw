import { app } from 'electron'
import { existsSync } from 'fs'
import { join } from 'path'
import { allocatePort, getAllocatedPorts } from '../ports'
import { getBundledRelayApiKey } from '../onboarding'
import { getProviderKey, type ProviderId } from '../provider-keys'
import { resolveBundledNode } from './node-runtime'
import { getOpenClawConfigPath, readGatewayAuthToken } from './openclaw-gateway'
import { serviceManager } from './service-manager'

export async function startBundledRelayServer(): Promise<void> {
  const scriptPath = resolveBundledRelayScript()
  if (!scriptPath) {
    console.info('[relay] bundled script not found; skipping spawn')
    return
  }
  const nodePath = resolveBundledNode()
  if (!nodePath) {
    console.info('[relay] bundled node runtime not found; skipping spawn')
    return
  }

  const port = await allocatePort('relay')

  await serviceManager.start({
    name: 'relay',
    command: nodePath,
    args: [scriptPath],
    env: buildRelayEnv(),
    port,
    healthCheckUrl: `http://127.0.0.1:${port}/health`,
    logFile: 'relay-server.log',
  })
}

export function resolveBundledRelayScript(): string | null {
  const relative = join('relay-server-bundle', 'dist', 'index.js')
  if (app.isPackaged) {
    const packaged = join(process.resourcesPath, relative)
    return existsSync(packaged) ? packaged : null
  }
  const dev = join(__dirname, '..', '..', 'resources', relative)
  return existsSync(dev) ? dev : null
}

export function buildRelayEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = forwardedEnv()
  for (const provider of Object.keys(PROVIDER_ENV_KEYS) as ProviderId[]) {
    const envKey = PROVIDER_ENV_KEYS[provider]
    if (env[envKey]) continue
    const stored = getProviderKey(provider)
    if (stored) env[envKey] = stored
  }
  if (!env.BRAIN_GATEWAY_AUTH_TOKEN) {
    const token = readGatewayAuthToken(getOpenClawConfigPath())
    if (token) env.BRAIN_GATEWAY_AUTH_TOKEN = token
  }
  if (!env.RELAY_API_KEY) {
    const bundledKey = getBundledRelayApiKey()
    if (bundledKey) env.RELAY_API_KEY = bundledKey
  }
  if (!env.BRAIN_GATEWAY_URL) {
    const openclawPort = getAllocatedPorts().openclawGateway
    if (openclawPort) env.BRAIN_GATEWAY_URL = `http://127.0.0.1:${openclawPort}`
  }
  // Tavily is stored in the renderer-side settings KV today, not the
  // provider-keys vault, so the relay reads it from process.env via the
  // forwarded passthrough above when the user has exported it.
  return env
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FORWARDED_KEYS = [
  'TAVILY_API_KEY',
  'BRAIN_GATEWAY_URL',
  'BRAIN_GATEWAY_AUTH_TOKEN',
  'RELAY_API_KEY',
  'LANGFUSE_PUBLIC_KEY',
  'LANGFUSE_SECRET_KEY',
  'LANGFUSE_BASE_URL',
  'TRACING_UI_COLLECTOR_URL',
  'GIT_SHA',
  'RELAY_VERSION',
] as const

const PROVIDER_ENV_KEYS: Record<ProviderId, string> = {
  gemini: 'GEMINI_API_KEY',
  openai: 'OPENAI_API_KEY',
  xai: 'XAI_API_KEY',
}

function forwardedEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {}
  for (const key of FORWARDED_KEYS) {
    const value = process.env[key]
    if (value !== undefined) env[key] = value
  }
  return env
}
