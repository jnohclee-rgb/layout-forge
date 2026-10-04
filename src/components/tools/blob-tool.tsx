import { useMemo } from "react"
import { DicesIcon } from "lucide-react"
import { randomSeed, rng } from "@/lib/random"
import { type Pt, smoothPath, svgDataUri, svgToJsx } from "@/lib/svg"
import { usePersistent } from "@/lib/use-persistent"
import { cn } from "@/lib/utils"
import { ColorInput } from "@/components/color-input"
import { Field, Section, SliderField } from "@/components/fields"
import { ToolLayout } from "@/components/tools/tool-layout"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

type Fill = "solid" | "gradient" | "outline"
type Mode = "svg" | "css"

interface State {
  mode: Mode
  points: number
  randomness: number
  seed: number
  fill: Fill
  c1: string
  c2: string
  stroke: number
  animate: boolean
  duration: number
}

const DEFAULTS: State = {
  mode: "svg",
  points: 6,
  randomness: 0.5,
  seed: 1337,
  fill: "gradient",
  c1: "#6d4aff",
  c2: "#ec4899",
  stroke: 4,
  animate: false,
  duration: 8,
}

const BOX = 200

function blobPath(points: number, randomness: number, seed: number) {
  const rand = rng(seed)
  const pts: Pt[] = []
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2 + (rand() - 0.5) * randomness * (Math.PI / points) * 0.6
    const r = 80 * (1 - randomness * 0.45 * rand())
    pts.push([BOX / 2 + Math.cos(a) * r, BOX / 2 + Math.sin(a) * r])
  }
  return smoothPath(pts, true)
}

function blobRadius(seed: number) {
  const rand = rng(seed)
  const v = () => Math.round(25 + rand() * 50)
  const [a, b, c, d] = [v(), v(), v(), v()]
  return `${a}% ${100 - a}% ${100 - b}% ${b}% / ${c}% ${d}% ${100 - d}% ${100 - c}%`
}

function buildSvg(s: State, seed = s.seed, withAnim = s.animate) {
  const d = blobPath(s.points, s.randomness, seed)
  const fillAttr = s.fill === "outline" ? `fill="none" stroke="${s.c1}" stroke-width="${s.stroke}" stroke-linejoin="round"` : `fill="${s.fill === "gradient" ? "url(#blob-gradient)" : s.c1}"`
  const defs =
    s.fill === "gradient"
      ? `  <defs>\n    <linearGradient id="blob-gradient" x1="0" y1="0" x2="1" y2="1">\n      <stop offset="0%" stop-color="${s.c1}" />\n      <stop offset="100%" stop-color="${s.c2}" />\n    </linearGradient>\n  </defs>\n`
      : ""
  let anim = ""
  if (withAnim) {
    const frames = [seed, seed + 1, seed + 2, seed].map((x) => blobPath(s.points, s.randomness, x))
    anim = `\n    <animate attributeName="d" dur="${s.duration}s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.333;0.667;1" keySplines="0.45 0 0.55 1;0.45 0 0.55 1;0.45 0 0.55 1" values="${frames.join(";")}" />\n  `
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BOX} ${BOX}">\n${defs}  <path d="${d}" ${fillAttr}>${anim}</path>\n</svg>`
}

function cssBackground(s: State) {
  return s.fill === "gradient" ? `linear-gradient(135deg, ${s.c1}, ${s.c2})` : s.fill === "solid" ? s.c1 : "transparent"
}

export function BlobTool() {
  const [s, set] = usePersistent<State>("lf-tool-blob", DEFAULTS)
  const svg = useMemo(() => buildSvg(s), [s])
  const radius = blobRadius(s.seed)
  const variations = Array.from({ length: 8 }, (_, i) => s.seed + (i + 1) * 101)

  const cssCode = `.blob {\n  width: 320px;\n  aspect-ratio: 1;\n  background: ${cssBackground(s)};${s.fill === "outline" ? `\n  border: ${s.stroke}px solid ${s.c1};` : ""}\n  border-radius: ${radius};${
    s.animate ? `\n  animation: blob-morph ${s.duration}s ease-in-out infinite;` : ""
  }\n}\n${
    s.animate
      ? `\n@keyframes blob-morph {\n  0%,\n  100% {\n    border-radius: ${radius};\n  }\n  33% {\n    border-radius: ${blobRadius(s.seed + 1)};\n  }\n  66% {\n    border-radius: ${blobRadius(s.seed + 2)};\n  }\n}\n`
      : ""
  }`

  const outputs =
    s.mode === "svg"
      ? [
          { id: "svg", label: "SVG", lang: "html", file: "blob.svg", code: `${svg}\n` },
          {
            id: "jsx",
            label: "JSX",
            lang: "jsx",
            file: "Blob.jsx",
            code: `export function Blob(props) {\n  return (\n${svgToJsx(svg)
              .replace("<svg ", "<svg {...props} ")
              .split("\n")
              .map((l) => `    ${l}`)
              .join("\n")}\n  )\n}\n`,
          },
          {
            id: "css",
            label: "CSS background",
            lang: "css",
            file: "blob-bg.css",
            code: `.hero {\n  background: url("${svgDataUri(buildSvg(s, s.seed, false))}") center / 60% no-repeat;\n}\n`,
          },
        ]
      : [{ id: "css", label: "CSS", lang: "css", file: "blob.css", code: cssCode }]

  const controls = (
    <>
      <Section
        title="Type"
        action={
          <Button variant="ghost" size="xs" onClick={() => set({ seed: randomSeed() })}>
            <DicesIcon />
            Random
          </Button>
        }
      >
        <ToggleGroup variant="outline" size="sm" spacing={0} className="w-full" value={[s.mode]} onValueChange={(v) => v[0] && set({ mode: v[0] as Mode })}>
          <ToggleGroupItem value="svg" className="flex-1 text-xs">
            SVG path
          </ToggleGroupItem>
          <ToggleGroupItem value="css" className="flex-1 text-xs">
            CSS border-radius
          </ToggleGroupItem>
        </ToggleGroup>
        <p className="text-[11px] leading-snug text-muted-foreground">
          {s.mode === "svg"
            ? "Any number of bends, gradient, morphing."
            : "Pure CSS: border-radius, up to 4 bends."}
        </p>
      </Section>
      {s.mode === "svg" && (
        <Section title="Shape">
          <SliderField label="Bends" value={s.points} min={3} max={14} unit="" onChange={(points) => set({ points })} />
          <SliderField label="Roughness" value={s.randomness} min={0} max={1} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(randomness) => set({ randomness })} />
        </Section>
      )}
      <Section title="Fill">
        <ToggleGroup variant="outline" size="sm" spacing={0} className="w-full" value={[s.fill]} onValueChange={(v) => v[0] && set({ fill: v[0] as Fill })}>
          <ToggleGroupItem value="solid" className="flex-1 text-xs">
            Color
          </ToggleGroupItem>
          <ToggleGroupItem value="gradient" className="flex-1 text-xs">
            Gradient
          </ToggleGroupItem>
          <ToggleGroupItem value="outline" className="flex-1 text-xs">
            Outline
          </ToggleGroupItem>
        </ToggleGroup>
        <div className="grid grid-cols-2 gap-2">
          <Field label={s.fill === "gradient" ? "From" : "Color"}>
            <ColorInput value={s.c1} compact onChange={(c1) => set({ c1 })} />
          </Field>
          {s.fill === "gradient" && (
            <Field label="Before">
              <ColorInput value={s.c2} compact onChange={(c2) => set({ c2 })} />
            </Field>
          )}
        </div>
        {s.fill === "outline" && <SliderField label="Thickness" value={s.stroke} min={1} max={16} onChange={(stroke) => set({ stroke })} />}
      </Section>
      <Section title="Animation">
        <div className="flex items-center justify-between">
          <Label htmlFor="animate" className="text-xs">
            Morphing
          </Label>
          <Switch id="animate" size="sm" checked={s.animate} onCheckedChange={(animate) => set({ animate })} />
        </div>
        {s.animate && <SliderField label="Duration" value={s.duration} min={2} max={30} unit="s" onChange={(duration) => set({ duration })} />}
      </Section>
      <Section title="Variations">
        <div className="grid grid-cols-4 gap-1.5">
          {variations.map((v) => (
            <button
              key={v}
              onClick={() => set({ seed: v })}
              className="aspect-square rounded-lg border p-1.5 transition-colors hover:border-primary/40 hover:bg-muted/50"
              title={`seed ${v}`}
            >
              {s.mode === "svg" ? (
                <img src={svgDataUri(buildSvg(s, v, false))} alt="" className="size-full" />
              ) : (
                <div className="size-full" style={{ background: cssBackground(s), borderRadius: blobRadius(v), border: s.fill === "outline" ? `2px solid ${s.c1}` : undefined }} />
              )}
            </button>
          ))}
        </div>
        <p className="font-mono text-[11px] text-muted-foreground">seed: {s.seed}</p>
      </Section>
    </>
  )

  return (
    <ToolLayout controls={controls} outputs={outputs}>
      <div className="flex h-full min-h-[460px] items-center justify-center p-10">
        {s.mode === "svg" ? (
          <div className="w-[min(100%,420px)]" dangerouslySetInnerHTML={{ __html: svg }} />
        ) : (
          <div
            className={cn("aspect-square w-[min(100%,360px)]", s.animate && "blob-morph")}
            style={
              {
                background: cssBackground(s),
                border: s.fill === "outline" ? `${s.stroke}px solid ${s.c1}` : undefined,
                borderRadius: radius,
                "--blob-a": radius,
                "--blob-b": blobRadius(s.seed + 1),
                "--blob-c": blobRadius(s.seed + 2),
                animationDuration: `${s.duration}s`,
              } as React.CSSProperties
            }
          />
        )}
      </div>
    </ToolLayout>
  )
}
