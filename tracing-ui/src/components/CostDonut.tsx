"use client"

import { useEffect, useRef } from "react"
import {
  Chart,
  DoughnutController,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js"

// Register only the pieces we use. Chart.js is tree-shakeable but each chart
// component has to register its own controllers up front.
Chart.register(DoughnutController, ArcElement, Tooltip, Legend)

export type CostSlice = {
  label: string
  value: number
  color: string
}

export function CostDonut({ slices }: { slices: CostSlice[] }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const chartRef = useRef<Chart | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return
    const ctx = canvasRef.current.getContext("2d")
    if (!ctx) return
    // Tear down any prior chart instance bound to this canvas. Chart.js keeps
    // a singleton-per-canvas registry and will throw if we try to mount twice.
    chartRef.current?.destroy()
    chartRef.current = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: slices.map((s) => s.label),
        datasets: [
          {
            data: slices.map((s) => s.value),
            backgroundColor: slices.map((s) => s.color),
            borderColor: "#18181b",
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "62%",
        plugins: {
          legend: {
            position: "right",
            labels: { color: "#d4d4d8", font: { size: 12 } },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const value = Number(ctx.parsed)
                return ` ${ctx.label}: $${value.toFixed(4)}`
              },
            },
          },
        },
      },
    })
    return () => {
      chartRef.current?.destroy()
      chartRef.current = null
    }
  }, [slices])

  return (
    <div className="relative h-72 w-full">
      <canvas ref={canvasRef} />
    </div>
  )
}
