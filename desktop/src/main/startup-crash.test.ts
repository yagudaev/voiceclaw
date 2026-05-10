import { beforeEach, describe, expect, it, vi } from 'vitest'

const FAKE_HOME = '/Users/jdoe'

vi.mock('node:os', async () => {
  const actual = await vi.importActual<typeof import('node:os')>('node:os')
  return { ...actual, homedir: () => FAKE_HOME }
})

vi.mock('electron', () => ({
  app: {
    getVersion: () => '0.10.99',
    getPath: () => '/tmp/voiceclaw-startup-crash-test',
    exit: () => undefined,
  },
  clipboard: {
    writeText: () => undefined,
  },
  dialog: {
    showMessageBox: async () => ({ response: 3, checkboxChecked: false }),
  },
  shell: {
    openPath: async () => '',
    openExternal: async () => undefined,
  },
}))

vi.mock('./telemetry', () => ({
  capture: () => undefined,
}))

import {
  __resetForTests,
  buildClipboardPayload,
  formatSanitizedSummary,
  handleStartupCrash,
  sanitizeStartupError,
} from './startup-crash'

beforeEach(() => {
  __resetForTests()
})

describe('sanitizeStartupError', () => {
  it('strips the user home dir to ~', () => {
    const err = new Error(`Cannot read ${FAKE_HOME}/code/voiceclaw/secret.json`)
    err.stack = `Error: boom\n    at fn (${FAKE_HOME}/code/voiceclaw/desktop/src/main/index.ts:10:5)`
    const s = sanitizeStartupError(err)
    expect(s.errorMessage).not.toContain(FAKE_HOME)
    expect(s.errorMessage).toContain('~')
    expect(s.stackFrames[0]).not.toContain(FAKE_HOME)
    expect(s.stackFrames[0]).toContain('~')
  })

  it('replaces /Applications/<App>.app/Contents with <app>', () => {
    const err = new Error('boom')
    err.stack = [
      'Error: boom',
      '    at Module._resolveFilename (/Applications/VoiceClaw.app/Contents/Resources/app.asar/out/main/index.js:1:1)',
      '    at Object.<anonymous> (/Applications/VoiceClaw.app/Contents/Resources/app.asar/out/main/index.js:2:1)',
    ].join('\n')
    const s = sanitizeStartupError(err)
    for (const frame of s.stackFrames) {
      expect(frame).not.toContain('/Applications/VoiceClaw.app/Contents')
      expect(frame).toContain('<app>')
    }
  })

  it('keeps at most 5 stack frames', () => {
    const err = new Error('boom')
    err.stack = [
      'Error: boom',
      '    at f1 (a:1:1)',
      '    at f2 (b:1:1)',
      '    at f3 (c:1:1)',
      '    at f4 (d:1:1)',
      '    at f5 (e:1:1)',
      '    at f6 (f:1:1)',
      '    at f7 (g:1:1)',
    ].join('\n')
    const s = sanitizeStartupError(err)
    expect(s.stackFrames).toHaveLength(5)
    expect(s.stackFrames.at(-1)).toContain('f5')
  })

  it('truncates the formatted summary at 500 chars', () => {
    const long = 'x'.repeat(2000)
    const err = new Error(long)
    err.stack = `Error: ${long}\n    at f1 (a:1:1)`
    const s = sanitizeStartupError(err)
    const summary = formatSanitizedSummary(s)
    expect(summary.length).toBeLessThanOrEqual(500)
  })

  it('preserves the error class', () => {
    class CustomError extends Error {
      override name = 'CustomError'
    }
    const err = new CustomError('weird')
    const s = sanitizeStartupError(err)
    expect(s.errorClass).toBe('CustomError')
  })
})

describe('buildClipboardPayload', () => {
  it('includes the log path on the first line and sanitized summary below', () => {
    const s = sanitizeStartupError(new Error('Cannot find module \'archiver\''))
    const payload = buildClipboardPayload(s, '~/Library/Logs/VoiceClaw/startup-crash-2026-05-10.log')
    const [firstLine, ...rest] = payload.split('\n')
    expect(firstLine).toBe('~/Library/Logs/VoiceClaw/startup-crash-2026-05-10.log')
    expect(rest.join('\n')).toContain('Error: Cannot find module \'archiver\'')
    expect(payload).not.toContain(FAKE_HOME)
  })
})

describe('handleStartupCrash', () => {
  it('writes a crash log, fires telemetry, shows dialog, and exits 1', async () => {
    const writes: Array<{ path: string; contents: string }> = []
    const captures: Array<{ event: string; props?: Record<string, unknown> }> = []
    const dialogs: unknown[] = []
    let exitCode: number | null = null

    await handleStartupCrash(new Error('archiver missing'), 'uncaughtException', {
      writeLogFile: (path, contents) => writes.push({ path, contents }),
      capture: (event, props) => captures.push({ event, props }),
      showDialog: async (opts) => {
        dialogs.push(opts)
        return { response: 3, checkboxChecked: false }
      },
      exit: (code) => {
        exitCode = code
      },
      now: () => new Date('2026-05-10T15:30:00.000Z'),
      logsDir: '/tmp/logs',
    })

    expect(writes).toHaveLength(1)
    expect(writes[0].path).toBe('/tmp/logs/startup-crash-2026-05-10T15-30-00-000Z.log')
    expect(writes[0].contents).toContain('archiver missing')
    expect(writes[0].contents).toContain('source: uncaughtException')

    expect(captures).toHaveLength(1)
    expect(captures[0].event).toBe('app.startup_failed')
    expect(captures[0].props).toMatchObject({
      error_class: 'Error',
      error_message: expect.stringContaining('archiver missing'),
      source: 'uncaughtException',
      app_version: '0.10.99',
    })

    expect(dialogs).toHaveLength(1)
    const opts = dialogs[0] as { buttons: string[]; message: string; detail: string }
    expect(opts.buttons).toEqual(['Reveal Logs', 'Copy Diagnostic', 'Reinstall', 'Quit'])
    expect(opts.message).toMatch(/Something went wrong/)
    expect(opts.detail).toContain('startup-crash-2026-05-10T15-30-00-000Z.log')

    expect(exitCode).toBe(1)
  })

  it('is idempotent across multiple calls', async () => {
    const captures: string[] = []
    const dialogShown: number[] = []
    const exits: number[] = []
    const opts = {
      writeLogFile: () => undefined,
      capture: (event: string) => captures.push(event),
      showDialog: async () => {
        dialogShown.push(1)
        return { response: 3, checkboxChecked: false }
      },
      exit: (code: number) => exits.push(code),
      now: () => new Date('2026-05-10T15:30:00.000Z'),
      logsDir: '/tmp/logs',
    }

    await handleStartupCrash(new Error('first'), 'uncaughtException', opts)
    await handleStartupCrash(new Error('second'), 'unhandledRejection', opts)
    await handleStartupCrash(new Error('third'), 'uncaughtException', opts)

    expect(captures).toHaveLength(1)
    expect(dialogShown).toHaveLength(1)
    expect(exits).toHaveLength(1)
  })

  it('Reveal Logs response invokes openPath', async () => {
    const opened: string[] = []
    await handleStartupCrash(new Error('boom'), 'uncaughtException', {
      writeLogFile: () => undefined,
      capture: () => undefined,
      showDialog: async () => ({ response: 0, checkboxChecked: false }),
      openPath: async (p) => {
        opened.push(p)
        return ''
      },
      exit: () => undefined,
      now: () => new Date('2026-05-10T15:30:00.000Z'),
      logsDir: '/tmp/logs',
    })
    expect(opened).toEqual([`${FAKE_HOME}/Library/Logs/VoiceClaw`])
  })

  it('Copy Diagnostic response writes to clipboard with sanitized summary', async () => {
    const clip: string[] = []
    const followUps: unknown[] = []
    let dialogCount = 0
    await handleStartupCrash(
      Object.assign(new Error(`failed at ${FAKE_HOME}/code/voiceclaw`), {
        stack: `Error: failed\n    at f (${FAKE_HOME}/code/voiceclaw/x.ts:1:1)`,
      }),
      'uncaughtException',
      {
        writeLogFile: () => undefined,
        capture: () => undefined,
        showDialog: async (opts) => {
          dialogCount += 1
          if (dialogCount === 1) return { response: 1, checkboxChecked: false }
          followUps.push(opts)
          return { response: 0, checkboxChecked: false }
        },
        writeClipboard: (t) => clip.push(t),
        exit: () => undefined,
        now: () => new Date('2026-05-10T15:30:00.000Z'),
        logsDir: '/tmp/logs',
      },
    )
    expect(clip).toHaveLength(1)
    expect(clip[0]).not.toContain(FAKE_HOME)
    expect(clip[0]).toContain('startup-crash-2026-05-10T15-30-00-000Z.log')
    expect(followUps).toHaveLength(1)
    const followUp = followUps[0] as { message: string }
    expect(followUp.message).toMatch(/Copied to clipboard/i)
  })

  it('Reinstall response opens the releases page', async () => {
    const opened: string[] = []
    await handleStartupCrash(new Error('boom'), 'uncaughtException', {
      writeLogFile: () => undefined,
      capture: () => undefined,
      showDialog: async () => ({ response: 2, checkboxChecked: false }),
      openExternal: async (u) => {
        opened.push(u)
      },
      exit: () => undefined,
      now: () => new Date('2026-05-10T15:30:00.000Z'),
      logsDir: '/tmp/logs',
    })
    expect(opened).toEqual(['https://github.com/yagudaev/voiceclaw/releases/latest'])
  })

  it('coerces non-Error throws into Error before sanitizing', async () => {
    const captures: Array<{ event: string; props?: Record<string, unknown> }> = []
    await handleStartupCrash('plain string crash', 'unhandledRejection', {
      writeLogFile: () => undefined,
      capture: (event, props) => captures.push({ event, props }),
      showDialog: async () => ({ response: 3, checkboxChecked: false }),
      exit: () => undefined,
      now: () => new Date('2026-05-10T15:30:00.000Z'),
      logsDir: '/tmp/logs',
    })
    expect(captures[0].props?.error_message).toContain('plain string crash')
  })
})
