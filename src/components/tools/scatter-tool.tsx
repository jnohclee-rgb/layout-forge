import { useMemo } from "react"
import { DicesIcon, PlusIcon, XIcon } from "lucide-react"
import { randomSeed, rng } from "@/lib/random"
import { svgDataUri } from "@/lib/svg"
import { usePersistent } from "@/lib/use-persistent"
import { cn } from "@/lib/utils"
import { ColorInput } from "@/components/color-input"
import { Field, Section, SliderField } from "@/components/fields"
import { ToolLayout } from "@/components/tools/tool-layout"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

type ShapeId = "circle" | "ring" | "square" | "triangle" | "plus" | "cross" | "star" | "squiggle" | "half" | "dots"

const SHAPE_LABEL: Record<ShapeId, string> = {
  circle: "Circle",
  ring: "Ring",
  square: "Square",
  triangle: "Triangle",
  plus: "Plus",
  cross: "Cross",
  star: "Star",
  squiggle: "Squiggle",
  half: "Semicircle",
  dots: "Three dots",
}

interface State {
  shapes: ShapeId[]
  count: number
  minSize: number
  maxSize: number
  spacing: number
  rotate: boolean
  stroke: number
  colors: string[]
  bg: string
  opacityMin: number
  tile: number
  seed: number
}

const DEFAULTS: State = {
  shapes: ["circle", "ring", "plus", "triangle", "squiggle"],
  count: 28,
  minSize: 10,
  maxSize: 26,
  spacing: 1.2,
  rotate: true,
  stroke: 3,
  colors: ["#6d4aff", "#ec4899", "#f59e0b", "#14b8a6"],
  bg: "#fffbf5",
  opacityMin: 0.7,
  tile: 360,
  seed: 2024,
}

function shapeSvg(id: ShapeId, s: number, color: string, stroke: number) {
  const h = s / 2
  const st = `fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round"`
  switch (id) {
    case "circle":
      return `<circle r="${h}" fill="${color}"/>`
    case "ring":
      return `<circle r="${Math.max(1, h - stroke / 2)}" ${st}/>`
    case "square":
      return `<rect x="${-h}" y="${-h}" width="${s}" height="${s}" rx="${s * 0.15}" fill="${color}"/>`
    case "triangle":
      return `<path d="M0,${-h} L${h * 0.95},${h * 0.7} L${-h * 0.95},${h * 0.7} Z" fill="${color}"/>`
    case "plus":
      return `<path d="M0,${-h} V${h} M${-h},0 H${h}" ${st}/>`
    case "cross":
      return `<path d="M${-h * 0.75},${-h * 0.75} L${h * 0.75},${h * 0.75} M${h * 0.75},${-h * 0.75} L${-h * 0.75},${h * 0.75}" ${st}/>`
    case "star": {
      const pts = Array.from({ length: 10 }, (_, i) => {
        const a = -Math.PI / 2 + (i * Math.PI) / 5
        const r = i % 2 ? h * 0.45 : h
        return `${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`
      }).join(" ")
      return `<polygon points="${pts}" fill="${color}"/>`
    }
    case "squiggle": {
      const q = s / 4
      return `<path d="M${-h},0 q${q / 2},${-q} ${q},0 t${q},0 t${q},0 t${q},0" ${st}/>`
    }
    case "half":
      return `<path d="M${-h},${h * 0.3} A${h},${h} 0 0,1 ${h},${h * 0.3} Z" fill="${color}"/>`
    case "dots":
      return [-1, 0, 1].map((k) => `<circle cx="${k * h * 0.7}" r="${Math.max(1.5, s * 0.12)}" fill="${color}"/>`).join("")
  }
}

function buildTile(s: State) {
  const rand = rng(s.seed)
  const T = s.tile
  const items: { x: number; y: number; size: number; shape: ShapeId; color: string; rot: number; op: number }[] = []
  const shapes = s.shapes.length ? s.shapes : (["circle"] as ShapeId[])
  const wrapDist = (a: number, b: number) => {
    const d = Math.abs(a - b)
    return Math.min(d, T - d)
  }
  for (let i = 0; i < s.count; i++) {
    for (let attempt = 0; attempt < 40; attempt++) {
      const size = s.minSize + rand() * (s.maxSize - s.minSize)
      const x = rand() * T
      const y = rand() * T
      const ok = items.every((it) => Math.hypot(wrapDist(it.x, x), wrapDist(it.y, y)) > ((it.size + size) / 2) * s.spacing)
      if (!ok) continue
      items.push({
        x,
        y,
        size,
        shape: shapes[Math.floor(rand() * shapes.length)],
        color: s.colors[Math.floor(rand() * s.colors.length)] ?? "#000",
        rot: s.rotate ? Math.round(rand() * 360) : 0,
        op: Math.round((s.opacityMin + rand() * (1 - s.opacityMin)) * 100) / 100,
      })
      break
    }
  }
  const out: string[] = []
  for (const it of items) {
    for (const dx of [-T, 0, T]) {
      for (const dy of [-T, 0, T]) {
        const x = it.x + dx
        const y = it.y + dy
        if (x + it.size < 0 || x - it.size > T || y + it.size < 0 || y - it.size > T) continue
        out.push(
          `  <g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${it.rot})"${it.op < 1 ? ` opacity="${it.op}"` : ""}>${shapeSvg(it.shape, Math.round(it.size), it.color, s.stroke)}</g>`,
        )
      }
    }
  }
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${T}" height="${T}" viewBox="0 0 ${T} ${T}">\n  <rect width="${T}" height="${T}" fill="${s.bg}"/>\n${out.join("\n")}\n</svg>`,
    placed: items.length,
  }
}

export function ScatterTool() {
  const [s, set] = usePersistent<State>("lf-tool-scatter", DEFAULTS)
  const { svg, placed } = useMemo(() => buildTile(s), [s])
  const uri = svgDataUri(svg)
  const toggle = (id: ShapeId) => set({ shapes: s.shapes.includes(id) ? s.shapes.filter((x) => x !== id) : [...s.shapes, id] })

  const outputs = [
    { id: "css", label: "CSS background", lang: "css", file: "scatter.css", code: `.scatter-bg {\n  background: url("${uri}") 0 0 / ${s.tile}px ${s.tile}px repeat;\n}\n` },
    { id: "svg", label: "SVG tile", lang: "html", file: "scatter-tile.svg", code: `${svg}\n` },
  ]

  const controls = (
    <>
      <Section
        title="Shapes"
        action={
          <Button variant="ghost" size="xs" onClick={() => set({ seed: randomSeed() })}>
            <DicesIcon />
            Shuffle
          </Button>
        }
      >
        <div className="grid grid-cols-5 gap-1.5">
          {(Object.keys(SHAPE_LABEL) as ShapeId[]).map((id) => (
            <button
              key={id}
              onClick={() => toggle(id)}
              title={SHAPE_LABEL[id]}
              className={cn(
                "flex aspect-square items-center justify-center rounded-lg border transition-colors hover:bg-muted/60",
                s.shapes.includes(id) ? "border-primary bg-primary/5 text-foreground" : "text-muted-foreground opacity-50",
              )}
            >
              <svg viewBox="-16 -16 32 32" className="size-6" dangerouslySetInnerHTML={{ __html: shapeSvg(id, 22, "currentColor", 3) }} />
            </button>
          ))}
        </div>
      </Section>
      <Section title="Layout">
        <SliderField label="Count" value={s.count} min={1} max={150} unit="" onChange={(count) => set({ count })} />
        <SliderField label="Min size" value={s.minSize} min={4} max={80} onChange={(minSize) => set({ minSize, maxSize: Math.max(minSize, s.maxSize) })} />
        <SliderField label="Max size" value={s.maxSize} min={4} max={120} onChange={(maxSize) => set({ maxSize, minSize: Math.min(maxSize, s.minSize) })} />
        <SliderField label="Gap between" value={s.spacing} min={0.5} max={4} step={0.05} format={(v) => `×${v.toFixed(2)}`} onChange={(spacing) => set({ spacing })} />
        <SliderField label="Line thickness" value={s.stroke} min={1} max={10} onChange={(stroke) => set({ stroke })} />
        <SliderField label="Min opacity" value={s.opacityMin} min={0.05} max={1} step={0.05} format={(v) => `${Math.round(v * 100)}%`} onChange={(opacityMin) => set({ opacityMin })} />
        <SliderField label="Tile size" value={s.tile} min={120} max={800} step={10} onChange={(tile) => set({ tile })} />
        <div className="flex items-center justify-between">
          <Label htmlFor="rot" className="text-xs">
            Random rotation
          </Label>
          <Switch id="rot" size="sm" checked={s.rotate} onCheckedChange={(rotate) => set({ rotate })} />
        </div>
        <p className="font-mono text-[11px] text-muted-foreground">
          placed {placed} of {s.count} · seamless tile
        </p>
      </Section>
      <Section
        title="Colors"
        action={
          <Button variant="ghost" size="xs" disabled={s.colors.length >= 8} onClick={() => set({ colors: [...s.colors, "#0ea5e9"] })}>
            <PlusIcon />
          </Button>
        }
      >
        {s.colors.map((c, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className="flex-1">
              <ColorInput value={c} compact onChange={(v) => set({ colors: s.colors.map((x, j) => (j === i ? v : x)) })} />
            </div>
            <Button variant="ghost" size="icon-xs" disabled={s.colors.length <= 1} onClick={() => set({ colors: s.colors.filter((_, j) => j !== i) })} aria-label="Remove">
              <XIcon />
            </Button>
          </div>
        ))}
        <Field label="Background">
          <ColorInput value={s.bg} compact onChange={(bg) => set({ bg })} />
        </Field>
      </Section>
    </>
  )

  return (
    <ToolLayout controls={controls} outputs={outputs}>
      <div className="absolute inset-0" style={{ background: `url("${uri}") 24px 24px / ${s.tile}px ${s.tile}px repeat` }} />
      <div className="pointer-events-none absolute top-6 left-6 rounded-md border-2 border-dashed border-foreground/40" style={{ width: s.tile, height: s.tile }} />
    </ToolLayout>
  )
}
