import { useMemo } from "react"
import { DicesIcon } from "lucide-react"
import { mixHex } from "@/lib/color"
import { randomSeed, rng } from "@/lib/random"
import { type Pt, linePath, smoothPath, svgDataUri, svgToJsx } from "@/lib/svg"
import { usePersistent } from "@/lib/use-persistent"
import { ColorInput } from "@/components/color-input"
import { Field, Section, SliderField } from "@/components/fields"
import { ToolLayout } from "@/components/tools/tool-layout"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

type Style = "smooth" | "peaks" | "steps"

interface State {
  width: number
  height: number
  layers: number
  amplitude: number
  segments: number
  randomness: number
  seed: number
  style: Style
  edge: "bottom" | "top"
  from: string
  to: string
  section: string
  fade: boolean
}

const DEFAULTS: State = {
  width: 1440,
  height: 320,
  layers: 3,
  amplitude: 60,
  segments: 6,
  randomness: 0.5,
  seed: 4242,
  style: "smooth",
  edge: "bottom",
  from: "#a78bfa",
  to: "#6d4aff",
  section: "#ffffff",
  fade: true,
}

function buildWave(s: State) {
  const W = s.width
  const H = s.height
  const rand = rng(s.seed)
  const paths: { d: string; color: string; opacity: number }[] = []
  for (let k = 0; k < s.layers; k++) {
    const baseline = H * (0.25 + (0.55 * (k + 1)) / (s.layers + 1))
    const amp = (s.amplitude / 100) * H * 0.3
    const pts: Pt[] = []
    for (let j = 0; j <= s.segments; j++) {
      const factor = 1 - s.randomness + s.randomness * rand()
      const sign = (j + k) % 2 === 0 ? -1 : 1
      const jitter = s.randomness * (rand() - 0.5) * (W / s.segments) * 0.4
      const x = j === 0 || j === s.segments ? (j / s.segments) * W : (j / s.segments) * W + jitter
      pts.push([x, baseline + sign * amp * factor])
    }
    const mapped: Pt[] = s.edge === "bottom" ? pts : pts.map(([x, y]) => [x, H - y])
    const closeY = s.edge === "bottom" ? H : 0
    let d: string
    if (s.style === "smooth") d = smoothPath(mapped, false)
    else if (s.style === "peaks") d = linePath(mapped)
    else {
      const stepPts: Pt[] = []
      mapped.forEach((p, i) => {
        if (i > 0) stepPts.push([p[0], mapped[i - 1][1]])
        stepPts.push(p)
      })
      d = linePath(stepPts)
    }
    d += ` L${W},${closeY} L0,${closeY} Z`
    const t = s.layers === 1 ? 1 : k / (s.layers - 1)
    paths.push({ d, color: mixHex(s.from, s.to, t), opacity: s.fade ? Math.round((0.3 + (0.7 * (k + 1)) / s.layers) * 100) / 100 : 1 })
  }
  const body = paths.map((p) => `  <path d="${p.d}" fill="${p.color}"${p.opacity < 1 ? ` fill-opacity="${p.opacity}"` : ""} />`).join("\n")
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">\n${body}\n</svg>`,
    front: paths[paths.length - 1]?.color ?? s.to,
  }
}

export function WaveTool() {
  const [s, set] = usePersistent<State>("lf-tool-wave", DEFAULTS)
  const { svg, front } = useMemo(() => buildWave(s), [s])
  const uri = svgDataUri(svg)
  const ratio = (s.height / s.width) * 100

  const outputs = [
    { id: "svg", label: "SVG", lang: "html", file: "wave.svg", code: `${svg}\n` },
    {
      id: "css",
      label: "CSS background",
      lang: "css",
      file: "wave.css",
      code: `.wave-divider {\n  aspect-ratio: ${s.width} / ${s.height};\n  background: url("${uri}") ${s.edge} / 100% 100% no-repeat;\n}\n`,
    },
    {
      id: "jsx",
      label: "JSX",
      lang: "jsx",
      file: "Wave.jsx",
      code: `export function Wave(props) {\n  return (\n${svgToJsx(svg)
        .replace("<svg ", '<svg className="block h-auto w-full" {...props} ')
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
            Random
          </Button>
        }
      >
        <ToggleGroup variant="outline" size="sm" spacing={0} className="w-full" value={[s.style]} onValueChange={(v) => v[0] && set({ style: v[0] as Style })}>
          <ToggleGroupItem value="smooth" className="flex-1 text-xs">
            Smooth
          </ToggleGroupItem>
          <ToggleGroupItem value="peaks" className="flex-1 text-xs">
            Peaks
          </ToggleGroupItem>
          <ToggleGroupItem value="steps" className="flex-1 text-xs">
            Steps
          </ToggleGroupItem>
        </ToggleGroup>
        <SliderField label="Layers" value={s.layers} min={1} max={6} unit="" onChange={(layers) => set({ layers })} />
        <SliderField label="Amplitude" value={s.amplitude} min={0} max={100} unit="%" onChange={(amplitude) => set({ amplitude })} />
        <SliderField label="Frequency" value={s.segments} min={2} max={30} unit="" onChange={(segments) => set({ segments })} />
        <SliderField label="Randomness" value={s.randomness} min={0} max={1} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(randomness) => set({ randomness })} />
        <ToggleGroup variant="outline" size="sm" spacing={0} className="w-full" value={[s.edge]} onValueChange={(v) => v[0] && set({ edge: v[0] as State["edge"] })}>
          <ToggleGroupItem value="bottom" className="flex-1 text-xs">
            Bottom of section
          </ToggleGroupItem>
          <ToggleGroupItem value="top" className="flex-1 text-xs">
            Top of section
          </ToggleGroupItem>
        </ToggleGroup>
      </Section>
      <Section title="viewBox size">
        <SliderField label="Width" value={s.width} min={320} max={2560} step={10} onChange={(width) => set({ width })} />
        <SliderField label="Height" value={s.height} min={40} max={800} step={10} onChange={(height) => set({ height })} />
      </Section>
      <Section title="Colors">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Back layer">
            <ColorInput value={s.from} compact onChange={(from) => set({ from })} />
          </Field>
          <Field label="Front layer">
            <ColorInput value={s.to} compact onChange={(to) => set({ to })} />
          </Field>
        </div>
        <Field label="Section background">
          <ColorInput value={s.section} compact onChange={(section) => set({ section })} />
        </Field>
        <div className="flex items-center justify-between">
          <Label htmlFor="fade" className="text-xs">
            Depth transparency
          </Label>
          <Switch id="fade" size="sm" checked={s.fade} onCheckedChange={(fade) => set({ fade })} />
        </div>
      </Section>
    </>
  )

  const sectionBlock = (
    <div className="flex h-36 flex-col justify-center gap-2 px-8" style={{ background: s.section }}>
      <div className="h-3 w-48 rounded-full bg-black/15" />
      <div className="h-2.5 w-72 max-w-full rounded-full bg-black/10" />
    </div>
  )
  const frontBlock = <div className="h-28" style={{ background: front }} />

  return (
    <ToolLayout controls={controls} outputs={outputs}>
      <div className="flex min-h-full items-center p-4 md:p-10">
        <div className="w-full overflow-hidden rounded-xl border shadow-sm">
          {s.edge === "top" ? frontBlock : sectionBlock}
          <div className="relative w-full" style={{ paddingBottom: `${ratio}%`, background: s.section }}>
            <img src={uri} alt="" className="absolute inset-0 size-full" />
          </div>
          {s.edge === "top" ? sectionBlock : frontBlock}
        </div>
      </div>
    </ToolLayout>
  )
}
