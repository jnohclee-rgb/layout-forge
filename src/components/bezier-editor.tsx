import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react"
import { cn } from "@/lib/utils"

export type Bezier = [number, number, number, number]

export const EASINGS: { id: string; name: string; value: Bezier; keyword?: string }[] = [
  { id: "linear", name: "linear", value: [0, 0, 1, 1], keyword: "linear" },
  { id: "ease", name: "ease", value: [0.25, 0.1, 0.25, 1], keyword: "ease" },
  { id: "in", name: "ease-in", value: [0.42, 0, 1, 1], keyword: "ease-in" },
  { id: "out", name: "ease-out", value: [0, 0, 0.58, 1], keyword: "ease-out" },
  { id: "inout", name: "ease-in-out", value: [0.42, 0, 0.58, 1], keyword: "ease-in-out" },
  { id: "outCubic", name: "out cubic", value: [0.33, 1, 0.68, 1] },
  { id: "inOutCubic", name: "in-out cubic", value: [0.65, 0, 0.35, 1] },
  { id: "outQuint", name: "out quint", value: [0.22, 1, 0.36, 1] },
  { id: "outExpo", name: "out expo", value: [0.16, 1, 0.3, 1] },
  { id: "outBack", name: "out back", value: [0.34, 1.56, 0.64, 1] },
  { id: "inBack", name: "in back", value: [0.36, 0, 0.66, -0.56] },
  { id: "inOutBack", name: "in-out back", value: [0.68, -0.6, 0.32, 1.6] },
]

export function bezierCss(b: Bezier) {
  const hit = EASINGS.find((e) => e.keyword && e.value.every((v, i) => v === b[i]))
  return hit?.keyword ?? `cubic-bezier(${b.map((v) => Number(v.toFixed(2))).join(", ")})`
}

const SIZE = 200
const PAD = 28
const Y_MIN = -0.6
const Y_MAX = 1.6
const UNIT_Y = 110

export function BezierEditor({ value, onChange }: { value: Bezier; onChange: (b: Bezier) => void }) {
  const ref = useRef<SVGSVGElement>(null)
  const [drag, setDrag] = useState<0 | 1 | null>(null)
  const sx = (x: number) => PAD + x * SIZE
  const sy = (y: number) => PAD + (Y_MAX - y) * UNIT_Y
  const total = SIZE + PAD * 2
  const height = UNIT_Y * (Y_MAX - Y_MIN) + PAD * 2

  useEffect(() => {
    if (drag === null) return
    const move = (e: PointerEvent) => {
      const r = ref.current?.getBoundingClientRect()
      if (!r) return
      const px = ((e.clientX - r.left) / r.width) * total
      const py = ((e.clientY - r.top) / r.height) * height
      const x = Math.min(1, Math.max(0, (px - PAD) / SIZE))
      const y = Math.min(Y_MAX, Math.max(Y_MIN, Y_MAX - (py - PAD) / UNIT_Y))
      const next = [...value] as Bezier
      next[drag * 2] = Math.round(x * 100) / 100
      next[drag * 2 + 1] = Math.round(y * 100) / 100
      onChange(next)
    }
    const up = () => setDrag(null)
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
    return () => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
    }
  })

  const start = (e: ReactPointerEvent, i: 0 | 1) => {
    e.preventDefault()
    setDrag(i)
  }

  const [x1, y1, x2, y2] = value
  return (
    <svg ref={ref} viewBox={`0 0 ${total} ${height}`} className="w-full touch-none select-none rounded-lg border bg-muted/30">
      <line x1={sx(0)} x2={sx(1)} y1={sy(0)} y2={sy(0)} stroke="currentColor" strokeOpacity="0.2" />
      <line x1={sx(0)} x2={sx(1)} y1={sy(1)} y2={sy(1)} stroke="currentColor" strokeOpacity="0.2" />
      <line x1={sx(0)} x2={sx(0)} y1={sy(Y_MIN)} y2={sy(Y_MAX)} stroke="currentColor" strokeOpacity="0.12" />
      <line x1={sx(1)} x2={sx(1)} y1={sy(Y_MIN)} y2={sy(Y_MAX)} stroke="currentColor" strokeOpacity="0.12" />
      <line x1={sx(0)} y1={sy(0)} x2={sx(x1)} y2={sy(y1)} stroke="var(--primary)" strokeOpacity="0.5" strokeDasharray="3 3" />
      <line x1={sx(1)} y1={sy(1)} x2={sx(x2)} y2={sy(y2)} stroke="var(--primary)" strokeOpacity="0.5" strokeDasharray="3 3" />
      <path d={`M${sx(0)},${sy(0)} C${sx(x1)},${sy(y1)} ${sx(x2)},${sy(y2)} ${sx(1)},${sy(1)}`} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <circle cx={sx(0)} cy={sy(0)} r="4" fill="currentColor" />
      <circle cx={sx(1)} cy={sy(1)} r="4" fill="currentColor" />
      {[
        [x1, y1, 0],
        [x2, y2, 1],
      ].map(([x, y, i]) => (
        <circle
          key={i}
          cx={sx(x)}
          cy={sy(y)}
          r={drag === i ? 9 : 7}
          onPointerDown={(e) => start(e, i as 0 | 1)}
          className={cn("cursor-grab fill-background stroke-primary active:cursor-grabbing")}
          strokeWidth="3"
        />
      ))}
    </svg>
  )
}

export interface SpringResult {
  css: string
  settle: number
  values: number[]
}

export function spring(stiffness: number, damping: number, mass: number): SpringResult {
  const w0 = Math.sqrt(stiffness / mass)
  const zeta = damping / (2 * Math.sqrt(stiffness * mass))
  const f = (t: number) => {
    if (zeta < 0.999) {
      const wd = w0 * Math.sqrt(1 - zeta * zeta)
      return 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + ((zeta * w0) / wd) * Math.sin(wd * t))
    }
    if (zeta < 1.001) return 1 - Math.exp(-w0 * t) * (1 + w0 * t)
    const q = Math.sqrt(zeta * zeta - 1)
    const r1 = -w0 * (zeta - q)
    const r2 = -w0 * (zeta + q)
    return 1 - (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t)) / (r2 - r1)
  }
  let settle = 0.2
  for (let t = 0; t < 8; t += 0.005) if (Math.abs(f(t) - 1) > 0.003) settle = t + 0.005
  settle = Math.min(8, Math.max(0.2, settle))
  const n = 48
  const values = Array.from({ length: n + 1 }, (_, i) => (i === n ? 1 : Math.round(f((settle * i) / n) * 1000) / 1000))
  return { css: `linear(${values.join(", ")})`, settle: Math.round(settle * 100) / 100, values }
}

export function SpringPlot({ values }: { values: number[] }) {
  const w = 220
  const h = 110
  const max = Math.max(1.05, ...values)
  const min = Math.min(0, ...values)
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - 8 - ((v - min) / (max - min)) * (h - 16)}`).join(" ")
  const oneY = h - 8 - ((1 - min) / (max - min)) * (h - 16)
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full rounded-lg border bg-muted/30">
      <line x1="0" x2={w} y1={oneY} y2={oneY} stroke="currentColor" strokeOpacity="0.25" strokeDasharray="3 3" />
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  )
}
