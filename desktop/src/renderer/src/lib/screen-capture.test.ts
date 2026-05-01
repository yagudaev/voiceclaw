import { describe, expect, it } from 'vitest'
import { formatAxTextRenderer, type AXCaptureResultBridge } from './screen-capture'

describe('formatAxTextRenderer', () => {
  it('returns empty for failed captures', () => {
    expect(formatAxTextRenderer({ ok: false, error: 'permission_denied' })).toBe('')
  })

  it('emits a header line and one role:text line per element', () => {
    const r: AXCaptureResultBridge = {
      ok: true,
      app: 'VS Code',
      window: 'screen-capture.ts',
      elements: [
        { role: 'AXButton', text: 'Run' },
        { role: 'AXTextField', text: 'src/lib/screen-capture.ts' },
      ],
    }
    const out = formatAxTextRenderer(r)
    expect(out.split('\n')[0]).toBe('[Screen text — VS Code · screen-capture.ts]')
    expect(out).toContain('Button: Run')
    expect(out).toContain('TextField: src/lib/screen-capture.ts')
  })

  it('strips empty-text elements', () => {
    const out = formatAxTextRenderer({
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

  it('truncates over budget and appends marker', () => {
    const big: AXCaptureResultBridge = {
      ok: true,
      app: 'X',
      window: '',
      elements: Array.from({ length: 200 }, (_, i) => ({
        role: 'AXStaticText',
        text: `line ${i} ` + 'x'.repeat(80),
      })),
    }
    const out = formatAxTextRenderer(big, 1024)
    expect(new TextEncoder().encode(out).length).toBeLessThanOrEqual(1024 + 16)
    expect(out.endsWith('…(truncated)')).toBe(true)
  })
})
