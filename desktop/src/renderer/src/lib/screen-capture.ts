// Screen capture utility for Electron's desktopCapturer.
// Captures frames at 1 FPS, resizes to ~1536px, and emits JPEG base64.

export type ScreenSource = {
  id: string
  name: string
  thumbnailDataURL: string | null
  appIconDataURL: string | null
}

declare global {
  interface Window {
    electronAPI: Window['electronAPI'] & {
      screen: {
        getSources: () => Promise<ScreenSource[]>
      }
      ax: {
        capture: () => Promise<AXCaptureResultBridge>
        permission: () => Promise<{ granted: boolean }>
        openSettings: () => Promise<void>
      }
    }
  }
}

export type AXCaptureResultBridge =
  | {
      ok: true
      app: string
      window: string
      elements: Array<{
        role: string
        text: string
        frame?: { x: number; y: number; w: number; h: number }
      }>
      truncated?: boolean
    }
  | {
      ok: false
      error:
        | 'permission_denied'
        | 'no_frontmost'
        | 'no_window'
        | 'ax_failed'
        | 'unavailable'
        | 'timeout'
        | 'sidecar_unavailable'
    }

export type ScreenFrame = {
  base64Jpeg: string
  axText?: string
}

// 1536 keeps small terminal text legible on Retina captures while staying within
// Gemini's HIGH-resolution video tokenizer envelope. 768 was too aggressive —
// 11pt monospace fonts blurred to the point Gemini misread "warp" as "warn",
// command output as garbled glyphs, etc.
const MAX_DIMENSION = 1536
const CAPTURE_INTERVAL_MS = 1000 // 1 FPS
// 0.85 preserves anti-aliased text edges through chroma subsampling. 0.7 was
// dropping enough high-frequency luma detail that ligatures and thin glyph
// strokes (i, l, |, /) became unreadable after JPEG.
const JPEG_QUALITY = 0.85
// Bound the AX call so a hung sidecar (or slow AX tree on a giant window) can
// never delay the next image frame. 250ms gives the sidecar a generous budget
// — typical capture is well under 50ms — while leaving 750ms of slack before
// the next 1 FPS tick. On timeout we send the image without text rather than
// blocking it.
const AX_CAPTURE_TIMEOUT_MS = 250
// Upper bound for the source stream so Chromium doesn't silently cap the
// desktop capture at its 1280x720 default. We downscale to MAX_DIMENSION
// after the fact — this just prevents pre-canvas downsampling. 4K covers
// nearly every Retina/HiDPI display we care about.
const SOURCE_MAX_WIDTH = 3840
const SOURCE_MAX_HEIGHT = 2160

export class ScreenCapture {
  private stream: MediaStream | null = null
  private video: HTMLVideoElement | null = null
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private intervalId: ReturnType<typeof setInterval> | null = null
  private sourceName = ''
  private axEnabled = true
  private axPermissionDenied = false

  async start(
    sourceId: string,
    onFrame: (frame: ScreenFrame) => void,
    options?: { axEnabled?: boolean },
  ) {
    this.axEnabled = options?.axEnabled ?? true
    // Request screen capture stream using Electron's chromeMediaSource.
    // The legacy `mandatory` constraint shape is required when combining
    // chromeMediaSource: 'desktop' with size hints — modern width/height
    // constraints are ignored on this path in Chromium.
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: sourceId,
          maxWidth: SOURCE_MAX_WIDTH,
          maxHeight: SOURCE_MAX_HEIGHT,
        },
      } as any,
    })

    // Set up hidden video element to receive stream
    this.video = document.createElement('video')
    this.video.srcObject = this.stream
    this.video.style.display = 'none'
    document.body.appendChild(this.video)
    await this.video.play()

    // Set up canvas for frame extraction
    this.canvas = document.createElement('canvas')
    this.ctx = this.canvas.getContext('2d')

    // Start capturing at 1 FPS
    this.intervalId = setInterval(() => {
      void this.captureFrame(onFrame)
    }, CAPTURE_INTERVAL_MS)
  }

  isAxPermissionDenied(): boolean {
    return this.axPermissionDenied
  }

  setAxEnabled(enabled: boolean) {
    this.axEnabled = enabled
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop())
      this.stream = null
    }
    if (this.video) {
      this.video.remove()
      this.video = null
    }
    this.canvas = null
    this.ctx = null
  }

  getSourceName(): string {
    return this.sourceName
  }

  setSourceName(name: string) {
    this.sourceName = name
  }

  private async captureFrame(onFrame: (frame: ScreenFrame) => void) {
    if (!this.video || !this.canvas || !this.ctx) return
    if (this.video.videoWidth === 0 || this.video.videoHeight === 0) return

    // Resize to fit within MAX_DIMENSION, preserving aspect ratio
    const { videoWidth, videoHeight } = this.video
    const scale = Math.min(MAX_DIMENSION / videoWidth, MAX_DIMENSION / videoHeight, 1)
    const w = Math.round(videoWidth * scale)
    const h = Math.round(videoHeight * scale)

    this.canvas.width = w
    this.canvas.height = h
    this.ctx.drawImage(this.video, 0, 0, w, h)

    // Export as JPEG base64 (strip the data:image/jpeg;base64, prefix)
    const dataUrl = this.canvas.toDataURL('image/jpeg', JPEG_QUALITY)
    const base64 = dataUrl.split(',')[1]
    if (!base64) return

    // Run AX capture concurrently with the rest of the frame pipeline so a
    // slow AX tree never delays image delivery. We awaited drawImage above
    // synchronously, so by the time we get here the bitmap is fixed; the
    // AX result captured ~now is the closest-aligned to the JPEG.
    let axText: string | undefined
    if (this.axEnabled && !this.axPermissionDenied) {
      axText = await this.captureAxTextOrTimeout()
    }

    onFrame({ base64Jpeg: base64, axText })
  }

  private async captureAxTextOrTimeout(): Promise<string | undefined> {
    const api = window.electronAPI?.ax
    if (!api?.capture) return undefined
    try {
      const result = await Promise.race([
        api.capture(),
        new Promise<{ ok: false; error: 'timeout' }>((resolve) =>
          setTimeout(() => resolve({ ok: false, error: 'timeout' }), AX_CAPTURE_TIMEOUT_MS),
        ),
      ])
      if (!result.ok) {
        if (result.error === 'permission_denied') this.axPermissionDenied = true
        return undefined
      }
      return formatAxTextRenderer(result)
    } catch {
      return undefined
    }
  }
}

export async function getScreenSources(): Promise<ScreenSource[]> {
  return window.electronAPI.screen.getSources()
}

// Format an AX capture result into the compact text block we send to Gemini
// inline with each image frame. Keeps the rendered string under `maxBytes`
// so it can't blow span attribute or token limits.
//
// Mirrors formatAxText in desktop/src/main/ax-capture.ts. Both have unit
// tests; if you change one, change the other and update both test files.
export function formatAxTextRenderer(
  result: AXCaptureResultBridge,
  maxBytes = 8 * 1024,
): string {
  if (!result.ok) return ''
  const header = `[Screen text — ${result.app}${result.window ? ` · ${result.window}` : ''}]`
  const lines: string[] = [header]
  for (const el of result.elements) {
    if (!el.text) continue
    const role = el.role.replace(/^AX/, '')
    lines.push(`${role}: ${el.text}`)
  }
  let out = lines.join('\n')
  if (byteLen(out) > maxBytes) {
    while (byteLen(out) > maxBytes && lines.length > 1) {
      lines.pop()
      out = lines.join('\n') + '\n…(truncated)'
    }
  }
  return out
}

function byteLen(s: string): number {
  return new TextEncoder().encode(s).length
}
