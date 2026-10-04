import { useMemo } from "react"
import { DicesIcon } from "lucide-react"
import { fbm, simplex2 } from "@/lib/noise"
import { randomSeed } from "@/lib/random"
import { type Pt, linePath, smoothPath, svgDataUri } from "@/lib/svg"
import { usePersistent } from "@/lib/use-persistent"
import { ColorInput } from "@/components/color-input"
import { Field, Section, SliderField } from "@/components/fields"
import { ToolLayout } from "@/components/tools/tool-layout"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

interface State {
  seed: number
  scale: number
  octaves: number
  levels: number
  stroke: number
  color: string
  bg: string
  opacity: number
  accentEvery: number
  accent: string
  accentWidth: number
  smooth: boolean
  width: number
  height: number
}

const DEFAULTS: State = {
  seed: 314,
  scale: 3,
  octaves: 3,
  levels: 18,
  stroke: 1.2,
  color: "#6d4aff",
  bg: "#faf7ff",
  opacity: 0.55,
  accentEvery: 5,
  accent: "#6d4aff",
  accentWidth: 2.4,
  smooth: true,
  width: 1200,
  height: 800,
}

const PRESETS: { id: string; name: string; patch: Partial<State> }[] = [
  { id: "light", name: "Map", patch: { color: "#6d4aff", accent: "#6d4aff", bg: "#faf7ff", opacity: 0.55 } },
  { id: "night", name: "Night", patch: { color: "#22d3ee", accent: "#a78bfa", bg: "#0b1020", opacity: 0.5 } },
  { id: "paper", name: "Paper", patch: { color: "#78716c", accent: "#44403c", bg: "#f5f0e6", opacity: 0.6 } },
  { id: "mono", name: "Mono", patch: { color: "#ffffff", accent: "#ffffff", bg: "#111111", opacity: 0.35 } },
]

function contours(s: State) {
  const W = s.width
  const H = s.height
  const step = 8
  const nx = Math.ceil(W / step) + 1
  const ny = Math.ceil(H / step) + 1
  const noise = simplex2(s.seed)
  const freq = s.scale / 1000
  const field = new Float32Array(nx * ny)
  let min = Infinity
  let max = -Infinity
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const v = fbm(noise, i * step * freq, j * step * freq, s.octaves)
      field[j * nx + i] = v
      if (v < min) min = v
      if (v > max) max = v
    }
  }
  const at = (i: number, j: number) => field[j * nx + i]
  const result: { level: number; d: string }[] = []
  for (let k = 1; k <= s.levels; k++) {
    const t = min + ((max - min) * k) / (s.levels + 1)
    const segs: [Pt, Pt][] = []
    for (let j = 0; j < ny - 1; j++) {
      for (let i = 0; i < nx - 1; i++) {
        const a = at(i, j)
        const b = at(i + 1, j)
        const c = at(i + 1, j + 1)
        const d = at(i, j + 1)
        const idx = (a > t ? 8 : 0) | (b > t ? 4 : 0) | (c > t ? 2 : 0) | (d > t ? 1 : 0)
        if (idx === 0 || idx === 15) continue
        const x = i * step
        const y = j * step
        const lerp = (v1: number, v2: number) => (t - v1) / (v2 - v1 || 1e-9)
        const top: Pt = [x + lerp(a, b) * step, y]
        const right: Pt = [x + step, y + lerp(b, c) * step]
        const bottom: Pt = [x + lerp(d, c) * step, y + step]
        const left: Pt = [x, y + lerp(a, d) * step]
        const center = (a + b + c + d) / 4 > t
        switch (idx) {
          case 1:
          case 14:
            segs.push([left, bottom])
            break
          case 2:
          case 13:
            segs.push([bottom, right])
            break
          case 3:
          case 12:
            segs.push([left, right])
            break
          case 4:
          case 11:
            segs.push([top, right])
            break
          case 6:
          case 9:
            segs.push([top, bottom])
            break
          case 7:
          case 8:
            segs.push([left, top])
            break
          case 5:
            if (center) segs.push([left, top], [bottom, right])
            else segs.push([left, bottom], [top, right])
            break
          case 10:
            if (center) segs.push([left, bottom], [top, right])
            else segs.push([left, top], [bottom, right])
            break
        }
      }
    }
    const key = (p: Pt) => `${Math.round(p[0] * 10)},${Math.round(p[1] * 10)}`
    const adj = new Map<string, number[]>()
    segs.forEach((sg, n) => {
      for (const p of sg) {
        const kk = key(p)
        const list = adj.get(kk)
        if (list) list.push(n)
        else adj.set(kk, [n])
      }
    })
    const used = new Uint8Array(segs.length)
    const parts: string[] = []
    for (let n = 0; n < segs.length; n++) {
      if (used[n]) continue
      used[n] = 1
      const line: Pt[] = [segs[n][0], segs[n][1]]
      for (const dir of [1, -1]) {
        for (;;) {
          const end = dir === 1 ? line[line.length - 1] : line[0]
          const next = (adj.get(key(end)) ?? []).find((m) => !used[m])
          if (next === undefined) break
          used[next] = 1
          const sg = segs[next]
          const p = key(sg[0]) === key(end) ? sg[1] : sg[0]
          if (dir === 1) line.push(p)
          else line.unshift(p)
        }
      }
      if (line.length < 3) continue
      const thin = line.filter((_, i) => i % 2 === 0 || i === line.length - 1)
      const closed = key(line[0]) === key(line[line.length - 1])
      parts.push(s.smooth && thin.length > 3 ? smoothPath(closed ? thin.slice(0, -1) : thin, closed) : linePath(thin))
    }
    if (parts.length) result.push({ level: k, d: parts.join(" ") })
  }
  return result
}

function buildSvg(s: State) {
  const lines = contours(s)
  const body = lines
    .map((l) => {
      const accent = s.accentEvery > 0 && l.level % s.accentEvery === 0
      return `  <path d="${l.d}" stroke="${accent ? s.accent : s.color}" stroke-width="${accent ? s.accentWidth : s.stroke}"/>`
    })
    .join("\n")
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s.width} ${s.height}" preserveAspectRatio="xMidYMid slice">\n  <rect width="${s.width}" height="${s.height}" fill="${s.bg}"/>\n  <g fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="${s.opacity}">\n${body}\n  </g>\n</svg>`
}

export function TopoTool() {
  const [s, set] = usePersistent<State>("lf-tool-topo", DEFAULTS)
  const svg = useMemo(() => buildSvg(s), [s])
  const uri = useMemo(() => svgDataUri(svg), [svg])
  const kb = Math.round(new Blob([svg]).size / 1024)

  const outputs = [
    { id: "svg", label: "SVG", lang: "html", file: "topography.svg", code: `${svg}\n` },
    { id: "css", label: "CSS background", lang: "css", file: "topography.css", code: `.topography {\n  background: ${s.bg} url("topography.svg") center / cover no-repeat;\n}\n` },
  ]

  const controls = (
    <>
      <Section
        title="Relief"
        action={
          <Button variant="ghost" size="xs" onClick={() => set({ seed: randomSeed() })}>
            <DicesIcon />
            New
          </Button>
        }
      >
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button key={p.id} onClick={() => set(p.patch)} className="rounded-md border px-2 py-1 text-xs hover:bg-muted">
              {p.name}
            </button>
          ))}
        </div>
        <SliderField label="Scale" value={s.scale} min={0.5} max={10} step={0.1} format={(v) => v.toFixed(1)} onChange={(scale) => set({ scale })} />
        <SliderField label="Detail (octaves)" value={s.octaves} min={1} max={6} unit="" onChange={(octaves) => set({ octaves })} />
        <SliderField label="Lines" value={s.levels} min={3} max={50} unit="" onChange={(levels) => set({ levels })} />
        <div className="flex items-center justify-between">
          <Label htmlFor="smooth" className="text-xs">
            Smoothing
          </Label>
          <Switch id="smooth" size="sm" checked={s.smooth} onCheckedChange={(smooth) => set({ smooth })} />
        </div>
      </Section>
      <Section title="Style">
        <Field label="Lines">
          <ColorInput value={s.color} compact onChange={(color) => set({ color })} />
        </Field>
        <SliderField label="Thickness" value={s.stroke} min={0.3} max={5} step={0.1} format={(v) => `${v.toFixed(1)}px`} onChange={(stroke) => set({ stroke })} />
        <SliderField label="Opacity" value={s.opacity} min={0.05} max={1} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(opacity) => set({ opacity })} />
        <Field label="Background">
          <ColorInput value={s.bg} compact onChange={(bg) => set({ bg })} />
        </Field>
      </Section>
      <Section title="Accent lines">
        <SliderField label="Every Nth (0 — off)" value={s.accentEvery} min={0} max={10} unit="" onChange={(accentEvery) => set({ accentEvery })} />
        {s.accentEvery > 0 && (
          <>
            <Field label="Color">
              <ColorInput value={s.accent} compact onChange={(accent) => set({ accent })} />
            </Field>
            <SliderField label="Thickness" value={s.accentWidth} min={0.5} max={8} step={0.1} format={(v) => `${v.toFixed(1)}px`} onChange={(accentWidth) => set({ accentWidth })} />
          </>
        )}
      </Section>
      <Section title="Canvas">
        <SliderField label="Width" value={s.width} min={400} max={2400} step={50} onChange={(width) => set({ width })} />
        <SliderField label="Height" value={s.height} min={300} max={1600} step={50} onChange={(height) => set({ height })} />
        <p className="font-mono text-[11px] text-muted-foreground">SVG size ≈ {kb} KB</p>
      </Section>
    </>
  )

  return (
    <ToolLayout controls={controls} outputs={outputs}>
      <div className="absolute inset-0" style={{ background: `${s.bg} url("${uri}") center / cover no-repeat` }} />
    </ToolLayout>
  )
}
