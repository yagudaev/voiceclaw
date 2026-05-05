// Screen capture utility for Electron's desktopCapturer.
// Captures frames at 1 FPS, resizes to ~1536px, and emits JPEG base64.

export type ScreenSource = {
  id: string
  name: string
  thumbnailDataURL: string | null
  appIconDataURL: string | null
}

export type StrokePoint = { x: number; y: number }

export type Stroke = {
  id: string
  color: string
  width: number
  points: StrokePoint[]
}

export type DisplayBounds = {
  x: number
  y: number
  width: number
  height: number
  scaleFactor: number
}

export type WindowBounds = {
  x: number
  y: number
  width: number
  height: number
}

export type SourceContext =
  | { kind: 'display'; displayBounds: DisplayBounds }
  | {
      kind: 'window'
      displayBounds: DisplayBounds
      windowBounds: WindowBounds | null
    }

export type AnnotationProvider = {
  getStrokes: () => Stroke[]
  getSourceContext: () => SourceContext | null
}

export type FrameWithAnnotations = {
  composite: string
  original: string
  strokesPng: string | null
  hasStrokes: boolean
}

declare global {
  interface Window {
    electronAPI: Window['electronAPI'] & {
      screen: {
        getSources: () => Promise<ScreenSource[]>
      }
    }
  }
}

// 1536 keeps small terminal text legible on Retina captures while staying
// within Gemini's HIGH-resolution video tokenizer envelope. 768 was too
// aggressive — 11pt monospace fonts blurred to the point Gemini misread
// "warp" as "warn", command output as garbled glyphs, etc.
const MAX_DIMENSION = 1536
const CAPTURE_INTERVAL_MS = 1000 // 1 FPS
const JPEG_QUALITY = 0.85
const SOURCE_MAX_WIDTH = 3840
const SOURCE_MAX_HEIGHT = 2160

export class ScreenCapture {
  private stream: MediaStream | null = null
  private video: HTMLVideoElement | null = null
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private strokesCanvas: HTMLCanvasElement | null = null
  private strokesCtx: CanvasRenderingContext2D | null = null
  private intervalId: ReturnType<typeof setInterval> | null = null
  private sourceName = ''
  private annotationProvider: AnnotationProvider | null = null

  setAnnotationProvider(provider: AnnotationProvider | null) {
    this.annotationProvider = provider
  }

  async start(sourceId: string, onFrame: (frame: FrameWithAnnotations) => void) {
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

    this.video = document.createElement('video')
    this.video.srcObject = this.stream
    this.video.style.display = 'none'
    document.body.appendChild(this.video)
    await this.video.play()

    this.canvas = document.createElement('canvas')
    this.ctx = this.canvas.getContext('2d')
    this.strokesCanvas = document.createElement('canvas')
    this.strokesCtx = this.strokesCanvas.getContext('2d')

    this.intervalId = setInterval(() => {
      this.captureFrame(onFrame)
    }, CAPTURE_INTERVAL_MS)
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
    this.strokesCanvas = null
    this.strokesCtx = null
  }

  getSourceName(): string {
    return this.sourceName
  }

  setSourceName(name: string) {
    this.sourceName = name
  }

  private captureFrame(onFrame: (frame: FrameWithAnnotations) => void) {
    if (!this.video || !this.canvas || !this.ctx) return
    if (this.video.videoWidth === 0 || this.video.videoHeight === 0) return

    const { videoWidth, videoHeight } = this.video
    const scale = Math.min(MAX_DIMENSION / videoWidth, MAX_DIMENSION / videoHeight, 1)
    const w = Math.round(videoWidth * scale)
    const h = Math.round(videoHeight * scale)

    this.canvas.width = w
    this.canvas.height = h
    this.ctx.drawImage(this.video, 0, 0, w, h)

    const originalDataUrl = this.canvas.toDataURL('image/jpeg', JPEG_QUALITY)
    const originalBase64 = originalDataUrl.split(',')[1] ?? ''

    const strokes = this.annotationProvider?.getStrokes() ?? []
    const ctx = this.annotationProvider?.getSourceContext() ?? null
    const transformedStrokes =
      strokes.length > 0 && ctx ? transformStrokes(strokes, ctx, w, h) : []

    if (transformedStrokes.length === 0) {
      onFrame({
        composite: originalBase64,
        original: originalBase64,
        strokesPng: null,
        hasStrokes: false,
      })
      return
    }

    paintStrokes(this.ctx, transformedStrokes)
    const compositeDataUrl = this.canvas.toDataURL('image/jpeg', JPEG_QUALITY)
    const compositeBase64 = compositeDataUrl.split(',')[1] ?? ''

    let strokesPngBase64: string | null = null
    if (this.strokesCanvas && this.strokesCtx) {
      this.strokesCanvas.width = w
      this.strokesCanvas.height = h
      this.strokesCtx.clearRect(0, 0, w, h)
      paintStrokes(this.strokesCtx, transformedStrokes)
      const dataUrl = this.strokesCanvas.toDataURL('image/png')
      strokesPngBase64 = dataUrl.split(',')[1] ?? null
    }

    onFrame({
      composite: compositeBase64,
      original: originalBase64,
      strokesPng: strokesPngBase64,
      hasStrokes: true,
    })
  }
}

export async function getScreenSources(): Promise<ScreenSource[]> {
  return window.electronAPI.screen.getSources()
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type ScaledStroke = {
  color: string
  width: number
  points: StrokePoint[]
}

function transformStrokes(
  strokes: Stroke[],
  context: SourceContext,
  frameWidth: number,
  frameHeight: number,
): ScaledStroke[] {
  // Strokes arrive in overlay-CSS-px relative to the overlay window's top-
  // left, which sits at displayBounds.x/y in screen-coordinate space. To get
  // absolute screen-px we add the display origin first; then per source kind:
  //   - display: scale = frame_w / display_w (origin cancels)
  //   - window with bounds known: subtract the window's absolute screen-origin
  //     and scale by frame_w / window_w; points outside the window's rect fall
  //     outside the canvas and get clipped on draw.
  //   - window with bounds unknown: best-effort fall back to display scaling.
  //     The strokes will be wrong, but we don't crash.
  const display = context.displayBounds
  if (context.kind === 'window' && context.windowBounds) {
    const win = context.windowBounds
    const scaleX = frameWidth / win.width
    const scaleY = frameHeight / win.height
    const widthScale = (scaleX + scaleY) / 2
    return strokes.map((s) => ({
      color: s.color,
      width: Math.max(1, s.width * widthScale),
      points: s.points.map((p) => ({
        x: (p.x + display.x - win.x) * scaleX,
        y: (p.y + display.y - win.y) * scaleY,
      })),
    }))
  }
  const scaleX = frameWidth / display.width
  const scaleY = frameHeight / display.height
  const widthScale = (scaleX + scaleY) / 2
  return strokes.map((s) => ({
    color: s.color,
    width: Math.max(1, s.width * widthScale),
    points: s.points.map((p) => ({ x: p.x * scaleX, y: p.y * scaleY })),
  }))
}

function paintStrokes(ctx: CanvasRenderingContext2D, strokes: ScaledStroke[]) {
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const stroke of strokes) {
    if (stroke.points.length < 1) continue
    ctx.strokeStyle = stroke.color
    ctx.lineWidth = stroke.width
    ctx.beginPath()
    const [first, ...rest] = stroke.points
    ctx.moveTo(first.x, first.y)
    for (const p of rest) {
      ctx.lineTo(p.x, p.y)
    }
    ctx.stroke()
  }
}
