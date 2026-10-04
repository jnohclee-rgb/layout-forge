import { useEffect, useMemo, useRef, useState } from "react"
import { DicesIcon } from "lucide-react"
import { randomSeed, rng } from "@/lib/random"
import { type Pt, smoothPath, svgToJsx } from "@/lib/svg"
import { usePersistent } from "@/lib/use-persistent"
import { cn } from "@/lib/utils"
import { ColorInput } from "@/components/color-input"
import { Field, Section, SliderField } from "@/components/fields"
import { ToolLayout } from "@/components/tools/tool-layout"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

type Head = "open" | "filled" | "barb" | "dot" | "none"

interface State {
  pts: [Pt, Pt, Pt, Pt]
  roughness: number
  stroke: number
  color: string
  head: Head
  tail: Head
  headSize: number
  dashed: boolean
  seed: number
}

const VW = 600
const VH = 400

const PRESETS: { id: string; name: string; pts: [Pt, Pt, Pt, Pt] }[] = [
  { id: "bend", name: "Bend", pts: [[90, 300], [140, 110], [360, 70], [500, 160]] },
  { id: "s", name: "S-curve", pts: [[80, 320], [380, 360], [220, 40], [520, 80]] },
  { id: "arc", name: "Arc", pts: [[100, 280], [160, 60], [440, 60], [500, 280]] },
  { id: "loop", name: "Loop", pts: [[70, 300], [560, 60], [80, 60], [530, 300]] },
  { id: "hook", name: "Hook", pts: [[120, 80], [520, 60], [520, 340], [260, 300]] },
  { id: "straight", name: "Straight", pts: [[100, 300], [230, 230], [370, 170], [500, 100]] },
]

const DEFAULTS: State = {
  pts: PRESETS[0].pts,
  roughness: 0.35,
  stroke: 4,
  color: "#0f172a",
  head: "open",
  tail: "none",
  headSize: 18,
  dashed: false,
  seed: 5,
}

function cubic(p: [Pt, Pt, Pt, Pt], t: number): Pt {
  const u = 1 - t
  const a = u * u * u
  const b = 3 * u * u * t
  const c = 3 * u * t * t
  const d = t * t * t
  return [a * p[0][0] + b * p[1][0] + c * p[2][0] + d * p[3][0], a * p[0][1] + b * p[1][1] + c * p[2][1] + d * p[3][1]]
}

const r1 = (v: number) => Math.round(v * 10) / 10

function headPath(tip: Pt, from: Pt, kind: Head, size: number, stroke: number, color: string, wob: () => number) {
  if (kind === "none") return ""
  const ang = Math.atan2(tip[1] - from[1], tip[0] - from[0])
  const spread = 0.5
  const wing = (side: number): Pt => [tip[0] - Math.cos(ang + side * spread) * size + wob(), tip[1] - Math.sin(ang + side * spread) * size + wob()]
  const a = wing(1)
  const b = wing(-1)
  const lineAttrs = `fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round"`
  if (kind === "open") return `  <path d="M${r1(a[0])},${r1(a[1])} L${r1(tip[0])},${r1(tip[1])} L${r1(b[0])},${r1(b[1])}" ${lineAttrs}/>`
  if (kind === "barb") return `  <path d="M${r1(a[0])},${r1(a[1])} Q${r1((a[0] + tip[0]) / 2 + wob())},${r1((a[1] + tip[1]) / 2 + wob())} ${r1(tip[0])},${r1(tip[1])}" ${lineAttrs}/>`
  if (kind === "filled") return `  <path d="M${r1(a[0])},${r1(a[1])} L${r1(tip[0])},${r1(tip[1])} L${r1(b[0])},${r1(b[1])} Z" fill="${color}" stroke="${color}" stroke-width="${stroke / 2}" stroke-linejoin="round"/>`
  return `  <circle cx="${r1(tip[0])}" cy="${r1(tip[1])}" r="${r1(Math.max(stroke, size / 3.5))}" fill="${color}"/>`
}

function buildSvg(s: State) {
  const rand = rng(s.seed)
  const phases = [rand() * 10, rand() * 10, rand() * 10]
  const len = Math.hypot(s.pts[3][0] - s.pts[0][0], s.pts[3][1] - s.pts[0][1])
  const N = 36
  const samples: Pt[] = []
  for (let i = 0; i <= N; i++) {
    const t = i / N
    const p = cubic(s.pts, t)
    const q = cubic(s.pts, Math.min(1, t + 0.01))
    const p0 = cubic(s.pts, Math.max(0, t - 0.01))
    const dx = q[0] - p0[0]
    const dy = q[1] - p0[1]
    const l = Math.hypot(dx, dy) || 1
    const env = Math.sin(Math.PI * t)
    const off = (Math.sin(t * 9 + phases[0]) * 0.6 + Math.sin(t * 23 + phases[1]) * 0.3 + Math.sin(t * 47 + phases[2]) * 0.1) * s.roughness * len * 0.025 * env
    samples.push([p[0] - (dy / l) * off, p[1] + (dx / l) * off])
  }
  const wob = () => (rand() - 0.5) * s.roughness * 6
  const body = `  <path d="${smoothPath(samples, false)}" fill="none" stroke="${s.color}" stroke-width="${s.stroke}" stroke-linecap="round"${s.dashed ? ` stroke-dasharray="${s.stroke * 3} ${s.stroke * 2.2}"` : ""}/>`
  const head = headPath(samples[N], samples[N - 3], s.head, s.headSize, s.stroke, s.color, wob)
  const tail = headPath(samples[0], samples[3], s.tail, s.headSize, s.stroke, s.color, wob)
  const all = [...samples, ...s.pts]
  const pad = s.headSize + s.stroke * 2
  const minX = Math.max(0, Math.floor(Math.min(...all.map((p) => p[0])) - pad))
  const minY = Math.max(0, Math.floor(Math.min(...all.map((p) => p[1])) - pad))
  const maxX = Math.min(VW, Math.ceil(Math.max(...samples.map((p) => p[0])) + pad))
  const maxY = Math.min(VH, Math.ceil(Math.max(...samples.map((p) => p[1])) + pad))
  const inner = [body, head, tail].filter(Boolean).join("\n")
  return {
    preview: inner,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${maxX - minX} ${maxY - minY}" width="${maxX - minX}" height="${maxY - minY}">\n${inner}\n</svg>`,
  }
}

export function ArrowTool() {
  const [s, set] = usePersistent<State>("lf-tool-arrow", DEFAULTS)
  const [drag, setDrag] = useState<number | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const { svg, preview } = useMemo(() => buildSvg(s), [s])

  useEffect(() => {
    if (drag === null) return
    const move = (e: PointerEvent) => {
      const r = boxRef.current?.getBoundingClientRect()
      if (!r) return
      const x = Math.round(Math.min(VW, Math.max(0, ((e.clientX - r.left) / r.width) * VW)))
      const y = Math.round(Math.min(VH, Math.max(0, ((e.clientY - r.top) / r.height) * VH)))
      const pts = s.pts.map((p, i) => (i === drag ? [x, y] : p)) as State["pts"]
      set({ pts })
    }
    const up = () => setDrag(null)
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
    return () => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
    }
  })

  const outputs = [
    { id: "svg", label: "SVG", lang: "html", file: "arrow.svg", code: `${svg}\n` },
    {
      id: "jsx",
      label: "JSX",
      lang: "jsx",
      file: "Arrow.jsx",
      code: `export function Arrow(props) {\n  return (\n${svgToJsx(svg)
        .replace("<svg ", '<svg aria-hidden="true" {...props} ')
        .split("\n")
        .map((l) => `    ${l}`)
        .join("\n")}\n  )\n}\n`,
    },
  ]

  const headToggle = (value: Head, onChange: (h: Head) => void) => (
    <ToggleGroup variant="outline" size="sm" spacing={0} className="grid w-full grid-cols-5" value={[value]} onValueChange={(v) => v[0] && onChange(v[0] as Head)}>
      {(
        [
          ["open", "›"],
          ["filled", "▶"],
          ["barb", "⌒"],
          ["dot", "●"],
          ["none", "—"],
        ] as [Head, string][]
      ).map(([v, l]) => (
        <ToggleGroupItem key={v} value={v} className="text-xs" title={v}>
          {l}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )

  const controls = (
    <>
      <Section
        title="Shape"
        action={
          <Button variant="ghost" size="xs" onClick={() => set({ seed: randomSeed() })}>
            <DicesIcon />
            Handwriting
          </Button>
        }
      >
        <div className="grid grid-cols-3 gap-1.5">
          {PRESETS.map((p) => (
            <Button key={p.id} variant="outline" size="sm" onClick={() => set({ pts: p.pts })}>
              {p.name}
            </Button>
          ))}
        </div>
        <p className="text-[11px] leading-snug text-muted-foreground">Round points are ends, square ones are the curve.</p>
        <SliderField label="Hand-drawn roughness" value={s.roughness} min={0} max={1.5} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(roughness) => set({ roughness })} />
      </Section>
      <Section title="Arrowheads">
        <Field label="At the end">{headToggle(s.head, (head) => set({ head }))}</Field>
        <Field label="At start">{headToggle(s.tail, (tail) => set({ tail }))}</Field>
        <SliderField label="Size" value={s.headSize} min={6} max={50} onChange={(headSize) => set({ headSize })} />
      </Section>
      <Section title="Line">
        <SliderField label="Thickness" value={s.stroke} min={1} max={14} onChange={(stroke) => set({ stroke })} />
        <Field label="Color">
          <ColorInput value={s.color} compact onChange={(color) => set({ color })} />
        </Field>
        <div className="flex items-center justify-between">
          <Label htmlFor="dash" className="text-xs">
            Dashed
          </Label>
          <Switch id="dash" size="sm" checked={s.dashed} onCheckedChange={(dashed) => set({ dashed })} />
        </div>
      </Section>
    </>
  )

  return (
    <ToolLayout controls={controls} outputs={outputs}>
      <div className="flex h-full min-h-[460px] items-center justify-center p-6 md:p-10">
        <div ref={boxRef} className="relative aspect-[3/2] w-full max-w-3xl touch-none rounded-xl border bg-white shadow-sm select-none">
          <svg viewBox={`0 0 ${VW} ${VH}`} className="absolute inset-0 size-full">
            <path
              d={`M${s.pts[0][0]},${s.pts[0][1]} L${s.pts[1][0]},${s.pts[1][1]} M${s.pts[3][0]},${s.pts[3][1]} L${s.pts[2][0]},${s.pts[2][1]}`}
              stroke="var(--primary)"
              strokeOpacity="0.35"
              strokeDasharray="4 4"
              fill="none"
            />
            <g dangerouslySetInnerHTML={{ __html: preview }} />
          </svg>
          {s.pts.map((p, i) => (
            <span
              key={i}
              onPointerDown={(e) => {
                e.preventDefault()
                setDrag(i)
              }}
              className={cn(
                "absolute z-10 size-3.5 -translate-x-1/2 -translate-y-1/2 cursor-grab border-2 border-primary bg-background shadow active:cursor-grabbing",
                i === 0 || i === 3 ? "rounded-full" : "rounded-[3px]",
                drag === i && "scale-125",
              )}
              style={{ left: `${(p[0] / VW) * 100}%`, top: `${(p[1] / VH) * 100}%` }}
            />
          ))}
        </div>
      </div>
    </ToolLayout>
  )
}
