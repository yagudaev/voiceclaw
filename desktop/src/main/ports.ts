import { createServer } from 'net'

// Dynamic port allocation for bundled services. Each service asks the OS
// for any available port at startup; the main process holds the map so
// the renderer (and mobile-pairing QR codes) know where things landed.
//
// Preferred ports are attempted first so local-tools / muscle memory
// still work when nothing conflicts. If a preferred port is taken we
// fall back to an OS-picked ephemeral port (port 0).

export type ServiceName = 'relay' | 'openclawGateway' | 'tracingCollector' | 'tracingUi'

const PREFERRED: Record<ServiceName, number> = {
  relay: 8080,
  openclawGateway: 18789,
  tracingCollector: 4318,
  tracingUi: 4319,
}

const allocated: Partial<Record<ServiceName, number>> = {}

export async function allocatePort(service: ServiceName): Promise<number> {
  const existing = allocated[service]
  if (existing !== undefined) return existing

  const preferred = PREFERRED[service]
  const port = (await isPortFree(preferred)) ? preferred : await askKernelForFreePort()
  allocated[service] = port
  return port
}

export function getAllocatedPorts(): Partial<Record<ServiceName, number>> {
  return { ...allocated }
}

// For tests / force-reset scenarios.
export function resetAllocatedPorts(): void {
  for (const key of Object.keys(allocated) as ServiceName[]) {
    delete allocated[key]
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer()
    server.unref()
    server.on('error', () => resolve(false))
    server.listen(port, '127.0.0.1', () => {
      server.close(() => resolve(true))
    })
  })
}

function askKernelForFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.unref()
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (typeof address !== 'object' || address === null) {
        server.close()
        reject(new Error('Unexpected server address shape'))
        return
      }
      const port = address.port
      server.close(() => resolve(port))
    })
  })
}
