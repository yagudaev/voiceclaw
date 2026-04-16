// Screen capture utility for Electron's desktopCapturer.
// Captures frames at 1 FPS, resizes to ~768px, and emits JPEG base64.

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

const MAX_DIMENSION = 768
const CAPTURE_INTERVAL_MS = 1000 // 1 FPS
const JPEG_QUALITY = 0.7

export class ScreenCapture {
  private stream: MediaStream | null = null
  private video: HTMLVideoElement | null = null
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private intervalId: ReturnType<typeof setInterval> | null = null
  private sourceName = ''

  async start(sourceId: string, onFrame: (base64Jpeg: string) => void) {
    // Request screen capture stream using Electron's chromeMediaSource
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: sourceId,
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
