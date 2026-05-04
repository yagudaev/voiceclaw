import { useEffect, useRef, useState } from 'react'

const STROKE_COLOR = '#FF6B3D'
const STROKE_WIDTH_CSS = 4

export function DrawCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const strokesRef = useRef<Stroke[]>([])
  const activeStrokeRef = useRef<Stroke | null>(null)
  const [mode, setMode] = useState<'idle' | 'draw'>('idle')

  useEffect(() => {
    void window.electronAPI.drawOverlay.ready()

    const offMode = window.electronAPI.drawOverlay.onMode((next) => {
      setMode(next)
    })

    const offClear = window.electronAPI.drawOverlay.onClear(() => {
      strokesRef.current = []
      activeStrokeRef.current = null
      paint()
      window.electronAPI.drawOverlay.sendStrokes([])
    })

    const offBounds = window.electronAPI.drawOverlay.onBounds(() => {
      sizeCanvasToWindow()
      paint()
    })

    const onResize = () => {
      sizeCanvasToWindow()
      paint()
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        void window.electronAPI.drawOverlay.setMode('idle')
      }
    }
    window.addEventListener('resize', onResize)
    window.addEventListener('keydown', onKeyDown)
    sizeCanvasToWindow()

    return () => {
      offMode()
      offClear()
      offBounds()
      window.removeEventListener('resize', onResize)
      window.removeEventListener('keydown', onKeyDown)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function sizeCanvasToWindow() {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.round(window.innerWidth * dpr)
    canvas.height = Math.round(window.innerHeight * dpr)
    canvas.style.width = `${window.innerWidth}px`
    canvas.style.height = `${window.innerHeight}px`
    const ctx = canvas.getContext('2d')
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  function paint() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    const all = activeStrokeRef.current
      ? [...strokesRef.current, activeStrokeRef.current]
      : strokesRef.current
    for (const stroke of all) {
      drawStroke(ctx, stroke)
    }
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (mode !== 'draw') return
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.setPointerCapture(e.pointerId)
    const stroke: Stroke = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      color: STROKE_COLOR,
      width: STROKE_WIDTH_CSS,
      points: [{ x: e.clientX, y: e.clientY }],
    }
    activeStrokeRef.current = stroke
    paint()
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (mode !== 'draw') return
    const stroke = activeStrokeRef.current
    if (!stroke) return
    stroke.points.push({ x: e.clientX, y: e.clientY })
    paint()
  }

  function onPointerUp() {
    if (mode !== 'draw') return
    const stroke = activeStrokeRef.current
    if (!stroke) return
    activeStrokeRef.current = null
    if (stroke.points.length >= 2) {
      strokesRef.current.push(stroke)
      window.electronAPI.drawOverlay.sendStrokes(strokesRef.current)
    }
    paint()
  }

  function onClearClick() {
    strokesRef.current = []
    activeStrokeRef.current = null
    paint()
    void window.electronAPI.drawOverlay.clear()
    window.electronAPI.drawOverlay.sendStrokes([])
  }

  function onDoneClick() {
    void window.electronAPI.drawOverlay.setMode('idle')
  }

  function onContextMenu(e: React.MouseEvent<HTMLCanvasElement>) {
    if (mode !== 'draw') return
    e.preventDefault()
    void window.electronAPI.drawOverlay.setMode('idle')
  }

  return (
    <>
      <canvas
        ref={canvasRef}
        className={`draw-overlay__canvas ${mode === 'draw' ? 'draw-overlay__canvas--drawing' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onContextMenu={onContextMenu}
      />
      {mode === 'draw' && (
        <div className="draw-overlay__toolbar">
          <button type="button" className="draw-overlay__button" onClick={onClearClick}>
            Clear
          </button>
          <button
            type="button"
            className="draw-overlay__button draw-overlay__button--primary"
            onClick={onDoneClick}
          >
            Done (Esc / right-click)
          </button>
        </div>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Stroke = {
  id: string
  color: string
  width: number
  points: { x: number; y: number }[]
}

function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  if (stroke.points.length < 1) return
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
