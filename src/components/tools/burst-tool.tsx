import { useMemo } from "react"
import { DicesIcon } from "lucide-react"
import { hexWithAlpha } from "@/lib/color"
import { randomSeed, rng } from "@/lib/random"
import { svgDataUri } from "@/lib/svg"
import { usePersistent } from "@/lib/use-persistent"
import { ColorInput } from "@/components/color-input"
import { Field, Section, SliderField } from "@/components/fields"
import { ToolLayout } from "@/components/tools/tool-layout"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

type Mode = "sunburst" | "rings" | "spiral" | "twist" | "speed"

const MODES: { id: Mode; name: string; kind: "css" | "svg" }[] = [
  { id: "sunburst", name: "Sunburst", kind: "css" },
  { id: "rings", name: "Rings", kind: "css" },
  { id: "spiral", name: "Spiral", kind: "svg" },
  { id: "twist", name: "Vortex", kind: "svg" },
  { id: "speed", name: "Speed", kind: "svg" },
]

interface State {
  mode: Mode
  rays: number
  c1: string
  c2: string
  cx: number
  cy: number
  rotation: number
  softness: number
  ring: number
  turns: number
  stroke: number
  twist: number
  inner: number
  variance: number
  fade: boolean
  fadeColor: string
  seed: number
}

const DEFAULTS: State = {
  mode: "sunburst",
  rays: 24,
  c1: "#fbbf24",
  c2: "#f59e0b",
  cx: 50,
  cy: 60,
  rotation: 0,
  softness: 0,
  ring: 24,
  turns: 9,
  stroke: 6,
  twist: 120,
  inner: 18,
  variance: 0.5,
  fade: false,
  fadeColor: "#fff7ed",
  seed: 9,
}

const S = 1000

function svgFor(s: State) {
  const cx = (s.cx / 100) * S
  const cy = (s.cy / 100) * S
  const R = S * 1.15
  let body = ""
  if (s.mode === "spiral") {
    const turns = s.turns
    const gap = R / turns
    const pts: string[] = []
    const total = turns * Math.PI * 2
    for (let t = 0; t <= total; t += 0.05) {
      const r = (gap * t) / (Math.PI * 2)
      const a = t + (s.rotation * Math.PI) / 180
      pts.push(`${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`)
    }
    body = `  <polyline points="${pts.join(" ")}" fill="none" stroke="${s.c1}" stroke-width="${s.stroke}" stroke-linecap="round"/>`
  } else if (s.mode === "twist") {
    const n = s.rays
    const step = (Math.PI * 2) / n
    const tw = (s.twist * Math.PI) / 180
    const rot = (s.rotation * Math.PI) / 180
    const parts: string[] = []
    for (let i = 0; i < n; i += 2) {
      const a0 = i * step + rot
      const a1 = a0 + step
      const k = 24
      const out: string[] = []
      const back: string[] = []
      for (let j = 0; j <= k; j++) {
        const r = (R * j) / k
        const off = tw * (r / R)
        out.push(`${(cx + Math.cos(a0 + off) * r).toFixed(1)},${(cy + Math.sin(a0 + off) * r).toFixed(1)}`)
        back.unshift(`${(cx + Math.cos(a1 + off) * r).toFixed(1)},${(cy + Math.sin(a1 + off) * r).toFixed(1)}`)
      }
      parts.push(`M${out.join(" L")} L${back.join(" L")} Z`)
    }
    body = `  <path d="${parts.join(" ")}" fill="${s.c1}"/>`
  } else {
    const rand = rng(s.seed)
    const n = s.rays * 2
    const parts: string[] = []
    const rot = (s.rotation * Math.PI) / 180
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rot + (rand() - 0.5) * 0.05
      const w = ((Math.PI * 2) / n) * (0.15 + rand() * 0.35)
      const r0 = (s.inner / 100) * S * 0.6 + rand() * s.variance * S * 0.35
      parts.push(
        `M${(cx + Math.cos(a - w) * R).toFixed(1)},${(cy + Math.sin(a - w) * R).toFixed(1)} L${(cx + Math.cos(a) * r0).toFixed(1)},${(cy + Math.sin(a) * r0).toFixed(1)} L${(cx + Math.cos(a + w) * R).toFixed(1)},${(cy + Math.sin(a + w) * R).toFixed(1)} Z`,
      )
    }
    body = `  <path d="${parts.join(" ")}" fill="${s.c1}"/>`
  }
  const fade = s.fade
    ? `\n  <defs>\n    <radialGradient id="fade" cx="${s.cx}%" cy="${s.cy}%" r="75%">\n      <stop offset="0" stop-color="${s.fadeColor}" stop-opacity="0"/>\n      <stop offset="1" stop-color="${s.fadeColor}"/>\n    </radialGradient>\n  </defs>\n  <rect width="${S}" height="${S}" fill="url(#fade)"/>`
    : ""
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" preserveAspectRatio="xMidYMid slice">\n  <rect width="${S}" height="${S}" fill="${s.c2}"/>\n${body}${fade}\n</svg>`
}

function cssFor(s: State): [string, string][] {
  const fade = s.fade ? `radial-gradient(circle at ${s.cx}% ${s.cy}%, ${hexWithAlpha(s.fadeColor, 0)} 0%, ${s.fadeColor} 75%), ` : ""
  if (s.mode === "sunburst") {
    const step = 360 / s.rays
    const half = step / 2
    const soft = (s.softness / 100) * half
    const r = (v: number) => Number(v.toFixed(2))
    const stops = soft > 0 ? `${s.c1} 0deg ${r(half - soft)}deg, ${s.c2} ${r(half + soft)}deg ${r(step - soft)}deg, ${s.c1} ${r(step)}deg` : `${s.c1} 0deg ${r(half)}deg, ${s.c2} ${r(half)}deg ${r(step)}deg`
    return [["background", `${fade}repeating-conic-gradient(from ${s.rotation}deg at ${s.cx}% ${s.cy}%, ${stops})`]]
  }
  const w = s.ring
  const soft = (s.softness / 100) * (w / 2)
  const stops = soft > 0 ? `${s.c1} 0 ${w - soft}px, ${s.c2} ${w + soft}px ${w * 2 - soft}px, ${s.c1} ${w * 2}px` : `${s.c1} 0 ${w}px, ${s.c2} ${w}px ${w * 2}px`
  return [["background", `${fade}repeating-radial-gradient(circle at ${s.cx}% ${s.cy}%, ${stops})`]]
}

export function BurstTool() {
  const [s, set] = usePersistent<State>("lf-tool-burst", DEFAULTS)
  const isCss = MODES.find((m) => m.id === s.mode)?.kind === "css"
  const svg = useMemo(() => (isCss ? "" : svgFor(s)), [s, isCss])
  const uri = svg ? svgDataUri(svg) : ""
  const decls = isCss ? cssFor(s) : [["background", `${s.c2} url("${uri}") center / cover no-repeat`] as [string, string]]

  const outputs = isCss
    ? [
        { id: "css", label: "CSS", lang: "css", file: "burst.css", code: `.burst {\n${decls.map(([p, v]) => `  ${p}: ${v};`).join("\n")}\n}\n` },
        { id: "tw", label: "Tailwind", lang: "jsx", file: "Burst.jsx", code: `<div className="[background:${decls[0][1].replace(/,\s*/g, ",").replace(/\s+/g, "_")}]" />\n` },
      ]
    : [
        { id: "svg", label: "SVG", lang: "html", file: `${s.mode}.svg`, code: `${svg}\n` },
        { id: "css", label: "CSS background", lang: "css", file: "burst.css", code: `.burst {\n  background: ${s.c2} url("${s.mode}.svg") center / cover no-repeat;\n}\n` },
      ]

  const controls = (
    <>
      <Section
        title="Type"
        action={
          s.mode === "speed" ? (
            <Button variant="ghost" size="xs" onClick={() => set({ seed: randomSeed() })}>
              <DicesIcon />
              Variant
            </Button>
          ) : undefined
        }
      >
        <ToggleGroup variant="outline" size="sm" spacing={0} className="grid w-full grid-cols-3" value={[s.mode]} onValueChange={(v) => v[0] && set({ mode: v[0] as Mode })}>
          {MODES.map((m) => (
            <ToggleGroupItem key={m.id} value={m.id} className="text-xs">
              {m.name}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <p className="text-[11px] text-muted-foreground">{isCss ? "Pure CSS" : "SVG: file or CSS background"}</p>
      </Section>
      <Section title="Parameters">
        {(s.mode === "sunburst" || s.mode === "twist" || s.mode === "speed") && <SliderField label="Rays" value={s.rays} min={4} max={80} step={s.mode === "twist" ? 2 : 1} unit="" onChange={(rays) => set({ rays })} />}
        {s.mode === "rings" && <SliderField label="Ring width" value={s.ring} min={4} max={120} onChange={(ring) => set({ ring })} />}
        {(s.mode === "sunburst" || s.mode === "rings") && <SliderField label="Edge softness" value={s.softness} min={0} max={100} unit="%" onChange={(softness) => set({ softness })} />}
        {s.mode === "spiral" && (
          <>
            <SliderField label="Turns" value={s.turns} min={2} max={40} unit="" onChange={(turns) => set({ turns })} />
            <SliderField label="Thickness" value={s.stroke} min={1} max={40} onChange={(stroke) => set({ stroke })} />
          </>
        )}
        {s.mode === "twist" && <SliderField label="Twist" value={s.twist} min={-360} max={360} unit="°" onChange={(twist) => set({ twist })} />}
        {s.mode === "speed" && (
          <>
            <SliderField label="Empty center" value={s.inner} min={0} max={80} unit="%" onChange={(inner) => set({ inner })} />
            <SliderField label="Length spread" value={s.variance} min={0} max={1} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(variance) => set({ variance })} />
          </>
        )}
        {s.mode !== "rings" && <SliderField label="Rotation" value={s.rotation} min={0} max={360} unit="°" onChange={(rotation) => set({ rotation })} />}
        <SliderField label="Center X" value={s.cx} min={0} max={100} unit="%" onChange={(cx) => set({ cx })} />
        <SliderField label="Center Y" value={s.cy} min={0} max={100} unit="%" onChange={(cy) => set({ cy })} />
      </Section>
      <Section title="Colors">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Drawing">
            <ColorInput value={s.c1} compact onChange={(c1) => set({ c1 })} />
          </Field>
          <Field label="Background">
            <ColorInput value={s.c2} compact onChange={(c2) => set({ c2 })} />
          </Field>
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="fade" className="text-xs">
            Dissolve to edges
          </Label>
          <Switch id="fade" size="sm" checked={s.fade} onCheckedChange={(fade) => set({ fade })} />
        </div>
        {s.fade && (
          <Field label="Dissolve color">
            <ColorInput value={s.fadeColor} compact onChange={(fadeColor) => set({ fadeColor })} />
          </Field>
        )}
      </Section>
    </>
  )

  return (
    <ToolLayout controls={controls} outputs={outputs}>
      <div className="absolute inset-0" style={{ background: isCss ? decls[0][1] : `${s.c2} url("${uri}") center / cover no-repeat` }} />
    </ToolLayout>
  )
}
