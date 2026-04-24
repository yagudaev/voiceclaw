import { spawn, type ChildProcess } from 'child_process'
import { EventEmitter } from 'events'
import type { ServiceName } from '../ports'
import { openLogStream } from '../logs'

// Central lifecycle for the bundled services (openclaw-gateway, relay,
// tracing-collector, tracing-ui). Keeps one source of truth for start /
// stop / health / logs so the menu bar, renderer, and shutdown handlers
// all see the same state.
//
// In this PR the actual service binaries aren't bundled yet — only the
// manager scaffolding lands so follow-up PRs can wire each binary.

export type ServiceStatus =
  | { state: 'idle' }
  | { state: 'starting' }
  | { state: 'running'; port: number; startedAt: number }
  | { state: 'crashed'; lastExitCode: number | null; startedAt: number }
  | { state: 'stopped' }

export type ServiceDefinition = {
  name: ServiceName
  command: string
  args?: string[]
  env?: NodeJS.ProcessEnv
  port: number
  healthCheckUrl?: string
  logFile: string
}

type ServiceState = {
  definition: ServiceDefinition
  status: ServiceStatus
  child: ChildProcess | null
}

class ServiceManager extends EventEmitter {
  private services = new Map<ServiceName, ServiceState>()

  async start(def: ServiceDefinition): Promise<void> {
    const existing = this.services.get(def.name)
    if (existing && existing.status.state === 'running') {
      return
    }

    const state: ServiceState = {
      definition: def,
      status: { state: 'starting' },
      child: null,
    }
    this.services.set(def.name, state)
    this.emit('change', def.name, state.status)

    const logStream = openLogStream(def.logFile)
    const child = spawn(def.command, def.args ?? [], {
      env: { ...process.env, ...def.env, PORT: String(def.port) },
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
    })
    child.stdout?.pipe(logStream)
    child.stderr?.pipe(logStream)
    state.child = child

    child.once('error', (err) => {
      logStream.write(`\n[service-manager] ${def.name} failed to spawn: ${err.message}\n`)
      this.setStatus(def.name, { state: 'crashed', lastExitCode: null, startedAt: Date.now() })
    })

    child.once('exit', (code) => {
      const current = this.services.get(def.name)
      if (!current) return
      if (current.status.state === 'stopped') return
      this.setStatus(def.name, {
        state: 'crashed',
        lastExitCode: code,
        startedAt: Date.now(),
      })
    })

    this.setStatus(def.name, {
      state: 'running',
      port: def.port,
      startedAt: Date.now(),
    })
  }

  stop(name: ServiceName): void {
    const state = this.services.get(name)
    if (!state) return
    state.status = { state: 'stopped' }
    state.child?.kill('SIGTERM')
    this.emit('change', name, state.status)
  }

  stopAll(): void {
    for (const name of this.services.keys()) {
      this.stop(name)
    }
  }

  getStatus(name: ServiceName): ServiceStatus {
    return this.services.get(name)?.status ?? { state: 'idle' }
  }

  getAllStatuses(): Record<ServiceName, ServiceStatus> {
    const result: Record<string, ServiceStatus> = {}
    for (const [name, state] of this.services.entries()) {
      result[name] = state.status
    }
    return result as Record<ServiceName, ServiceStatus>
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  private setStatus(name: ServiceName, status: ServiceStatus): void {
    const state = this.services.get(name)
    if (!state) return
    state.status = status
    this.emit('change', name, status)
  }
}

export const serviceManager = new ServiceManager()
