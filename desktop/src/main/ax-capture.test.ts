import { describe, expect, it } from 'vitest'
import { formatAxText, type AXCaptureResult } from './ax-capture'

const sampleOk: AXCaptureResult = {
  ok: true,
  app: 'Google Chrome',
  window: 'Releases · yagudaev/voiceclaw',
  elements: [
    { role: 'AXButton', text: 'Back' },
    { role: 'AXTextField', text: 'github.com/yagudaev/voiceclaw/releases' },
    { role: 'AXStaticText', text: 'Latest' },
  ],
}

describe('formatAxText', () => {
  it('returns empty for failed captures', () => {
    expect(formatAxText({ ok: false, error: 'permission_denied' })).toBe('')
  })

  it('emits header + role-prefixed lines, stripping the AX prefix', () => {
    const out = formatAxText(sampleOk)
    expect(out.split('\n')[0]).toBe(
      '[Screen text — Google Chrome · Releases · yagudaev/voiceclaw]',
    )
    expect(out).toContain('Button: Back')
    expect(out).toContain('TextField: github.com/yagudaev/voiceclaw/releases')
  })

  it('skips elements with empty text', () => {
    const out = formatAxText({
      ok: true,
      app: 'X',
      window: '',
      elements: [
        { role: 'AXGroup', text: '' },
        { role: 'AXStaticText', text: 'kept' },
      ],
    })
    expect(out).not.toContain('Group')
    expect(out).toContain('StaticText: kept')
  })

  it('truncates to maxBytes and appends marker', () => {
    const big: AXCaptureResult = {
      ok: true,
      app: 'X',
      window: '',
      elements: Array.from({ length: 200 }, (_, i) => ({
        role: 'AXStaticText',
        text: `line ${i} ` + 'x'.repeat(80),
      })),
    }
    const out = formatAxText(big, 1024)
    expect(Buffer.byteLength(out, 'utf8')).toBeLessThanOrEqual(1024 + 16)
    expect(out.endsWith('…(truncated)')).toBe(true)
  })

  it('omits window section when window title is empty', () => {
    const out = formatAxText({
      ok: true,
      app: 'AppOnly',
      window: '',
      elements: [{ role: 'AXButton', text: 'go' }],
    })
    expect(out.split('\n')[0]).toBe('[Screen text — AppOnly]')
  })
})
