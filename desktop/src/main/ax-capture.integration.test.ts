// Integration test that drives the actual ax-capture Swift sidecar binary.
// Skipped on non-darwin or when the binary hasn't been built yet — run
// `node desktop/scripts/build-ax-capture.mjs` once before invoking.
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'

const BIN = resolve(__dirname, '../../resources/bin/ax-capture')
const haveBin = process.platform === 'darwin' && existsSync(BIN)

describe.skipIf(!haveBin)('ax-capture sidecar protocol', () => {
  it('responds to ping with version', async () => {
    const r = await roundTrip({ cmd: 'ping', id: 1 })
    expect(r).toMatchObject({ ok: true, version: '1', id: 1 })
  })

  it('returns granted boolean for permission query', async () => {
    const r = await roundTrip({ cmd: 'permission', id: 2 })
    expect(r.ok).toBe(true)
    expect(typeof r.granted).toBe('boolean')
  })

  it('returns ok=false with permission_denied or a populated capture', async () => {
    const r = await roundTrip({ cmd: 'capture', id: 3 })
    if (r.ok === false) {
      expect(['permission_denied', 'no_frontmost', 'no_window', 'ax_failed'])
        .toContain(r.error)
    } else {
      expect(typeof r.app).toBe('string')
      expect(Array.isArray(r.elements)).toBe(true)
    }
  })

  it('rejects malformed json with bad_json', async () => {
    const out = await rawSend('this is not json\n')
    expect(out).toMatch(/"error"\s*:\s*"bad_json"/)
  })
})

async function roundTrip(cmd: Record<string, unknown>): Promise<Record<string, unknown>> {
  const out = await rawSend(JSON.stringify(cmd) + '\n')
  return JSON.parse(out.trim().split('\n')[0])
}

function rawSend(input: string): Promise<string> {
  return new Promise((resolveP, rejectP) => {
    const child = spawn(BIN, [])
    let out = ''
    child.stdout.on('data', (chunk) => {
      out += chunk.toString('utf8')
      if (out.includes('\n')) {
        child.stdin.end()
      }
    })
    child.stderr.on('data', () => {})
    child.on('close', () => resolveP(out))
    child.on('error', rejectP)
    child.stdin.write(input)
  })
}
