import { useEffect, useRef, useState } from 'react'

interface AudioLevelMeterProps {
  getLevel: () => number
  active: boolean
}

export function AudioLevelMeter({ getLevel, active }: AudioLevelMeterProps) {
  const [level, setLevel] = useState(0)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (!active) {
      setLevel(0)
      return
    }

    const tick = () => {
      setLevel(getLevel())
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [active, getLevel])

  const width = Math.min(100, level * 500)

  return (
    <div className="h-1 bg-muted rounded-full overflow-hidden">
      <div
        className="h-full bg-green-500 transition-[width] duration-100"
        style={{ width: `${width}%` }}
      />
    </div>
  )
}
