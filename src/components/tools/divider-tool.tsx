import { useMemo } from "react"
import { DicesIcon } from "lucide-react"
import { mixHex } from "@/lib/color"
import { randomSeed, rng } from "@/lib/random"
import { type Pt, linePath, smoothPath, svgDataUri, svgToJsx } from "@/lib/svg"
import { usePersistent } from "@/lib/use-persistent"
import { ColorInput } from "@/components/color-input"
import { Field, Section, SliderField } from "@/components/fields"
import { PresetGrid, ToolLayout } from "@/components/tools/tool-layout"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

type Shape = "wave" | "curve" | "tilt" | "zigzag" | "clouds" | "steps" | "torn" | "arrow" | "book" | "drops"

const SHAPES: { id: Shape; name: string }[] = [
  { id: "wave", name: "Wave" },
  { id: "curve", name: "Arc" },
  { id: "tilt", name: "Tilt" },
  { id: "zigzag", name: "Teeth" },
  { id: "clouds", name: "Clouds" },
  { id: "steps", name: "Steps" },
  { id: "torn", name: "Torn edge" },
  { id: "arrow", name: "Arrow" },
  { id: "book", name: "Book" },
  { id: "drops", name: "Drops" },
]

interface State {
  shape: Shape
  height: number
  repeat: number
  layers: number
  edge: "bottom" | "top"
  flip: boolean
  invert: boolean
  color: string
  back: string
  section: string
  seed: number
}

const DEFAULTS: State = {
  shape: "wave",
  height: 120,
  repeat: 2,
  layers: 3,
  edge: "bottom",
  flip: false,
  invert: false,
  color: "#6d4aff",
  back: "#c4b5fd",
  section: "#ffffff",
  seed: 7,
}

const W = 1200

function edgePath(shape: Shape, H: number, n: number, seed: number): string {
  const rand = rng(seed)
  const close = ` L${W},${H} L0,${H} Z`
  switch (shape) {
    case "wave": {
      const pts: Pt[] = []
      const k = Math.max(1, n) * 8
      for (let i = 0; i <= k; i++) pts.push([(i / k) * W, H * 0.5 - Math.sin((i / k) * Math.PI * 2 * Math.max(1, n)) * H * 0.45])
      return smoothPath(pts, false) + close
    }
    case "curve":
      return `M0,${H} Q${W / 2},${-H * 0.95} ${W},${H} Z`
    case "tilt":
      return `M0,${H} L${W},0 L${W},${H} Z`
    case "zigzag": {
      const teeth = Math.max(1, n) * 6
      const pts: Pt[] = []
      for (let i = 0; i <= teeth * 2; i++) pts.push([(i / (teeth * 2)) * W, i % 2 ? 0 : H])
      return linePath(pts) + close
    }
    case "clouds": {
      const count = Math.max(2, n * 5)
      const r = W / count / 2
      let d = `M0,${H}`
      for (let i = 0; i < count; i++) {
        const rr = r * (0.9 + rand() * 0.6)
        const x2 = ((i + 1) / count) * W
        d += ` A${rr.toFixed(1)},${Math.min(H, rr * (0.8 + rand() * 0.8)).toFixed(1)} 0 0,1 ${x2.toFixed(1)},${H}`
      }
      return d + " Z"
    }
    case "steps": {
      const k = Math.max(2, n * 3)
      const pts: Pt[] = [[0, H]]
      for (let i = 0; i < k; i++) {
        const y = H - ((i + 1) / k) * H
        pts.push([(i / k) * W, y], [((i + 1) / k) * W, y])
      }
      return linePath(pts) + close
    }
    case "torn": {
      const k = 60 + n * 30
      const pts: Pt[] = []
      for (let i = 0; i <= k; i++) pts.push([(i / k) * W, H * 0.35 + (rand() - 0.5) * H * 0.6 + Math.sin(i * 0.3) * H * 0.1])
      return linePath(pts) + close
    }
    case "arrow":
      return `M0,0 L${W / 2 - H},0 L${W / 2},${H} L${W / 2 + H},0 L${W},0 L${W},${H} L0,${H} Z`
    case "book":
      return `M0,0 Q${W / 4},${H} ${W / 2},${H} Q${(W * 3) / 4},${H} ${W},0 L${W},${H} L0,${H} Z`
    case "drops": {
      const count = Math.max(3, n * 6)
      let d = `M0,0`
      for (let i = 0; i < count; i++) {
        const x1 = (i / count) * W
        const x2 = ((i + 1) / count) * W
        const depth = H * (0.4 + rand() * 0.6)
        d += ` C${x1},${depth} ${x2},${depth} ${x2},0`
      }
      return `${d} L${W},${H} L0,${H} Z`
    }
  }
}

function buildSvg(s: State) {
  const H = s.height
  const layers = Math.max(1, s.layers)
  const body: string[] = []
  for (let i = 0; i < layers; i++) {
    const depth = layers - 1 - i
    const offset = depth * H * 0.18
    const t = layers === 1 ? 1 : i / (layers - 1)
    const color = layers === 1 ? s.color : mixHex(s.back, s.color, t)
    const d = edgePath(s.shape, H, s.repeat, s.seed + depth * 13)
    body.push(`    <path d="${d}" fill="${color}"${depth ? ` transform="translate(0 ${(-offset).toFixed(1)})"` : ""}${depth ? ` fill-opacity="${(0.35 + 0.65 * t).toFixed(2)}"` : ""}/>`)
  }
  const extra = layers > 1 ? Math.round((layers - 1) * H * 0.18) : 0
  const sx = s.flip ? -1 : 1
  const sy = s.invert ? -1 : 1
  const transform = sx === 1 && sy === 1 ? "" : ` transform="translate(${sx === -1 ? W : 0} ${sy === -1 ? H - extra : 0}) scale(${sx} ${sy})"`
  const vb = `0 ${-extra} ${W} ${H + extra}`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" preserveAspectRatio="none">\n  <g${transform}>\n${body.join("\n")}\n  </g>\n</svg>`
  return { svg, totalH: H + extra }
}

export function DividerTool() {
  const [s, set] = usePersistent<State>("lf-tool-divider", DEFAULTS)
  const { svg, totalH } = useMemo(() => buildSvg(s), [s])
  const uri = svgDataUri(svg)
  const placed = s.edge === "top" ? "top" : "bottom"
  const svgFlipped = s.edge === "top" ? svg.replace("<svg ", '<svg style="transform: rotate(180deg)" ') : svg

  const outputs = [
    {
      id: "css",
      label: "CSS",
      lang: "css",
      file: "divider.css",
      code: `.section {\n  position: relative;\n  background: ${s.section};\n}\n\n.section::after {\n  content: "";\n  position: absolute;\n  ${placed}: -1px;\n  left: 0;\n  width: 100%;\n  height: clamp(${Math.round(totalH * 0.4)}px, ${((totalH / W) * 100).toFixed(2)}vw, ${totalH}px);\n  background: url("${uri}") center / 100% 100% no-repeat;${
        s.edge === "top" ? "\n  transform: rotate(180deg);" : ""
      }\n  pointer-events: none;\n}\n`,
    },
    { id: "svg", label: "SVG", lang: "html", file: "divider.svg", code: `${svg}\n` },
    {
      id: "jsx",
      label: "JSX",
      lang: "jsx",
      file: "Divider.jsx",
      code: `export function Divider({ className }) {\n  return (\n${svgToJsx(svgFlipped)
        .replace(/ style="transform: rotate\(180deg\)"/, ' style={{ transform: "rotate(180deg)" }}')
        .replace("<svg ", '<svg className={className} width="100%" height="' + totalH + '" ')
        .split("\n")
        .map((l) => `    ${l}`)
        .join("\n")}\n  )\n}\n`,
    },
  ]

  const controls = (
    <>
      <Section
        title="Shape"
        action={
          <Button variant="ghost" size="xs" onClick={() => set({ seed: randomSeed() })}>
            <DicesIcon />
            Variant
          </Button>
        }
      >
        <PresetGrid
          items={SHAPES}
          cols={5}
          active={s.shape}
          onPick={(x) => set({ shape: x.id })}
          render={(x) => (
            <svg viewBox={`0 0 ${W} 300`} preserveAspectRatio="none" className="h-full w-full text-primary">
              <path d={edgePath(x.id, 300, 1, s.seed)} fill="currentColor" />
            </svg>
          )}
        />
      </Section>
      <Section title="Parameters">
        <SliderField label="Height" value={s.height} min={20} max={400} onChange={(height) => set({ height })} />
        <SliderField label="Repeats" value={s.repeat} min={1} max={8} unit="" onChange={(repeat) => set({ repeat })} />
        <SliderField label="Layers (stack)" value={s.layers} min={1} max={5} unit="" onChange={(layers) => set({ layers })} />
        <ToggleGroup variant="outline" size="sm" spacing={0} className="w-full" value={[s.edge]} onValueChange={(v) => v[0] && set({ edge: v[0] as State["edge"] })}>
          <ToggleGroupItem value="bottom" className="flex-1 text-xs">
            Section bottom
          </ToggleGroupItem>
          <ToggleGroupItem value="top" className="flex-1 text-xs">
            Section top
          </ToggleGroupItem>
        </ToggleGroup>
        <div className="flex items-center justify-between">
          <Label htmlFor="flip" className="text-xs">
            Flip horizontally
          </Label>
          <Switch id="flip" size="sm" checked={s.flip} onCheckedChange={(flip) => set({ flip })} />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="inv" className="text-xs">
            Invert shape
          </Label>
          <Switch id="inv" size="sm" checked={s.invert} onCheckedChange={(invert) => set({ invert })} />
        </div>
      </Section>
      <Section title="Colors">
        <Field label="Next section (front layer)">
          <ColorInput value={s.color} compact onChange={(color) => set({ color })} />
        </Field>
        {s.layers > 1 && (
          <Field label="Back layer">
            <ColorInput value={s.back} compact onChange={(back) => set({ back })} />
          </Field>
        )}
        <Field label="Current section">
          <ColorInput value={s.section} compact onChange={(section) => set({ section })} />
        </Field>
      </Section>
    </>
  )

  const content = (
    <div className="flex flex-col justify-center gap-2 px-8 py-14" style={{ background: s.section }}>
      <div className="h-3.5 w-56 rounded-full bg-black/15" />
      <div className="h-2.5 w-80 max-w-full rounded-full bg-black/10" />
      <div className="h-2.5 w-64 max-w-full rounded-full bg-black/10" />
    </div>
  )
  const next = <div className="h-32" style={{ background: s.color }} />
  const divider = (
    <div className="relative w-full" style={{ background: s.section, aspectRatio: `${W} / ${totalH}` }}>
      <img src={uri} alt="" className="absolute inset-0 size-full" style={s.edge === "top" ? { transform: "rotate(180deg)" } : undefined} />
    </div>
  )

  return (
    <ToolLayout controls={controls} outputs={outputs}>
      <div className="flex min-h-full items-center p-4 md:p-10">
        <div className="w-full overflow-hidden rounded-xl border shadow-sm">
          {s.edge === "bottom" ? (
            <>
              {content}
              {divider}
              {next}
            </>
          ) : (
            <>
              {next}
              {divider}
              {content}
            </>
          )}
        </div>
      </div>
    </ToolLayout>
  )
}
