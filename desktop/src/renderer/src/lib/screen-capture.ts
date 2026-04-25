// Screen capture utility for Electron's desktopCapturer.
// Captures frames at 1 FPS, resizes to ~1536px, and emits JPEG base64.

export type ScreenSource = {
  id: string
  name: string
  thumbnailDataURL: string
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

  async start(sourceId: string, onFrame: (base64Jpeg: string) => void) {
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
  }

  getSourceName(): string {
    return this.sourceName
  }

  setSourceName(name: string) {
    this.sourceName = name
  }

  private captureFrame(onFrame: (base64Jpeg: string) => void) {
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
    if (base64) {
      onFrame(base64)
    }
  }
}

export async function getScreenSources(): Promise<ScreenSource[]> {
  return window.electronAPI.screen.getSources()
}
