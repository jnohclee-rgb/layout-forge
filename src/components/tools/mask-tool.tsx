import { useState } from "react"
import { ImageUpIcon } from "lucide-react"
import { sampleImage } from "@/lib/sample-image"
import { svgDataUri } from "@/lib/svg"
import { usePersistent } from "@/lib/use-persistent"
import { Section, SliderField } from "@/components/fields"
import { PresetGrid, ToolLayout } from "@/components/tools/tool-layout"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

type Mode = "linear" | "radial" | "edges" | "shape" | "halftone" | "stripes"

interface State {
  mode: Mode
  angle: number
  start: number
  end: number
  rx: number
  ry: number
  cx: number
  cy: number
  feather: number
  edge: number
  shape: string
  shapeSize: number
  dot: number
  spacing: number
  stripe: number
  invert: boolean
}

const DEFAULTS: State = {
  mode: "linear",
  angle: 180,
  start: 40,
  end: 100,
  rx: 60,
  ry: 60,
  cx: 50,
  cy: 50,
  feather: 40,
  edge: 18,
  shape: "blob",
  shapeSize: 90,
  dot: 3,
  spacing: 10,
  stripe: 6,
  invert: false,
}

const SHAPES: { id: string; name: string; d: string }[] = [
  { id: "blob", name: "Blob", d: "M78,18 C92,32 96,58 84,76 C72,94 44,98 26,88 C8,78 2,52 10,32 C18,12 40,2 58,4 C66,5 72,12 78,18 Z" },
  { id: "circle", name: "Circle", d: "M50,2 A48,48 0 1,1 49.9,2 Z" },
  { id: "heart", name: "Heart", d: "M50,90 C20,68 4,50 4,30 C4,14 16,4 30,4 C40,4 46,10 50,18 C54,10 60,4 70,4 C84,4 96,14 96,30 C96,50 80,68 50,90 Z" },
  { id: "star", name: "Star", d: "M50,2 L62,36 L98,38 L70,60 L80,96 L50,75 L20,96 L30,60 L2,38 L38,36 Z" },
  { id: "hex", name: "Hexagon", d: "M50,2 L92,26 L92,74 L50,98 L8,74 L8,26 Z" },
  { id: "arch", name: "Arch", d: "M10,98 L10,45 C10,20 28,4 50,4 C72,4 90,20 90,45 L90,98 Z" },
  { id: "squircle", name: "Superellipse", d: "M50,2 C88,2 98,12 98,50 C98,88 88,98 50,98 C12,98 2,88 2,50 C2,12 12,2 50,2 Z" },
  { id: "brush", name: "Brush stroke", d: "M4,40 C20,30 40,34 60,28 C76,24 90,26 97,32 C99,46 96,58 90,66 C70,70 50,66 30,72 C18,76 8,72 3,62 C1,54 2,46 4,40 Z" },
]

const shapeUri = (d: string) => svgDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="${d}" fill="#000"/></svg>`)

function maskDecls(s: State): [string, string][] {
  const on = s.invert ? "transparent" : "#000"
  const off = s.invert ? "#000" : "transparent"
  const fade = `linear-gradient(${s.angle}deg, ${on} ${s.start}%, ${off} ${s.end}%)`
  switch (s.mode) {
    case "linear":
      return [["mask-image", fade]]
    case "radial":
      return [["mask-image", `radial-gradient(${s.rx}% ${s.ry}% at ${s.cx}% ${s.cy}%, ${on} ${100 - s.feather}%, ${off} 100%)`]]
    case "edges": {
      const g = (dir: string) => `linear-gradient(${dir}, ${off}, ${on} ${s.edge}%, ${on} ${100 - s.edge}%, ${off})`
      return [
        ["mask-image", `${g("to right")}, ${g("to bottom")}`],
        ["mask-composite", "intersect"],
      ]
    }
    case "shape": {
      const shape = SHAPES.find((x) => x.id === s.shape) ?? SHAPES[0]
      return [
        ["mask-image", `url("${shapeUri(shape.d)}")`],
        ["mask-size", `${s.shapeSize}%`],
        ["mask-repeat", "no-repeat"],
        ["mask-position", "center"],
      ]
    }
    case "halftone":
      return [
        ["mask-image", `${fade}, radial-gradient(circle, #000 ${s.dot}px, transparent ${s.dot + 0.5}px)`],
        ["mask-size", `100% 100%, ${s.spacing}px ${s.spacing}px`],
        ["mask-composite", "add"],
      ]
    case "stripes":
      return [
        ["mask-image", `${fade}, repeating-linear-gradient(${s.angle + 45}deg, #000 0 ${s.stripe}px, transparent ${s.stripe}px ${s.stripe * 2}px)`],
        ["mask-composite", "add"],
      ]
  }
}

const WEBKIT_COMPOSITE: Record<string, string> = { intersect: "source-in", add: "source-over", subtract: "source-out", exclude: "xor" }

function withPrefixes(decls: [string, string][]): [string, string][] {
  return decls.flatMap(([p, v]): [string, string][] => [[`-webkit-${p}`, p === "mask-composite" ? (WEBKIT_COMPOSITE[v] ?? v) : v], [p, v]])
}

const camel = (p: string) => p.replace(/^-webkit-/, "Webkit-").replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())

export function MaskTool() {
  const [s, set] = usePersistent<State>("lf-tool-mask", DEFAULTS)
  const [upload, setUpload] = useState<string | null>(null)
  const decls = withPrefixes(maskDecls(s))
  const style = Object.fromEntries(decls.map(([p, v]) => [camel(p), v])) as React.CSSProperties
  const css = `.masked {\n${decls.map(([p, v]) => `  ${p}: ${v};`).join("\n")}\n}\n`
  const tw = maskDecls(s)
    .map(([p, v]) => `[${p}:${v.replace(/,\s*/g, ",").replace(/\s+/g, "_")}]`)
    .join(" ")

  const outputs = [
    { id: "css", label: "CSS", lang: "css", file: "mask.css", code: css },
    { id: "tw", label: "Tailwind", lang: "jsx", file: "Masked.jsx", code: `<img className="${tw}" src="…" alt="" />\n` },
  ]

  const fadeControls = (
    <>
      <SliderField label="Angle" value={s.angle} min={0} max={360} unit="°" onChange={(angle) => set({ angle })} />
      <SliderField label="Dissolve start" value={s.start} min={0} max={100} unit="%" onChange={(start) => set({ start: Math.min(start, s.end) })} />
      <SliderField label="Dissolve end" value={s.end} min={0} max={100} unit="%" onChange={(end) => set({ end: Math.max(end, s.start) })} />
    </>
  )

  const controls = (
    <>
      <Section title="Mask type">
        <ToggleGroup variant="outline" size="sm" spacing={0} className="grid w-full grid-cols-3" value={[s.mode]} onValueChange={(v) => v[0] && set({ mode: v[0] as Mode })}>
          {(
            [
              ["linear", "Linear"],
              ["radial", "Radial"],
              ["edges", "Edges"],
              ["shape", "Shape"],
              ["halftone", "Points"],
              ["stripes", "Stripes"],
            ] as [Mode, string][]
          ).map(([v, l]) => (
            <ToggleGroupItem key={v} value={v} className="text-xs">
              {l}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        {s.mode !== "shape" && (
          <div className="flex items-center justify-between">
            <Label htmlFor="invert" className="text-xs">
              Invert
            </Label>
            <Switch id="invert" size="sm" checked={s.invert} onCheckedChange={(invert) => set({ invert })} />
          </div>
        )}
      </Section>
      <Section title="Parameters">
        {s.mode === "linear" && fadeControls}
        {s.mode === "radial" && (
          <>
            <SliderField label="Width" value={s.rx} min={10} max={120} unit="%" onChange={(rx) => set({ rx })} />
            <SliderField label="Height" value={s.ry} min={10} max={120} unit="%" onChange={(ry) => set({ ry })} />
            <SliderField label="Center X" value={s.cx} min={0} max={100} unit="%" onChange={(cx) => set({ cx })} />
            <SliderField label="Center Y" value={s.cy} min={0} max={100} unit="%" onChange={(cy) => set({ cy })} />
            <SliderField label="Feathering" value={s.feather} min={0} max={100} unit="%" onChange={(feather) => set({ feather })} />
          </>
        )}
        {s.mode === "edges" && <SliderField label="Dissolve width" value={s.edge} min={1} max={50} unit="%" onChange={(edge) => set({ edge })} />}
        {s.mode === "shape" && (
          <>
            <PresetGrid
              items={SHAPES}
              cols={4}
              active={s.shape}
              onPick={(x) => set({ shape: x.id })}
              render={(x) => (
                <svg viewBox="0 0 100 100" className="size-4/5">
                  <path d={x.d} fill="currentColor" />
                </svg>
              )}
            />
            <SliderField label="Size" value={s.shapeSize} min={20} max={150} unit="%" onChange={(shapeSize) => set({ shapeSize })} />
          </>
        )}
        {s.mode === "halftone" && (
          <>
            {fadeControls}
            <SliderField label="Dot radius" value={s.dot} min={1} max={12} onChange={(dot) => set({ dot })} />
            <SliderField label="Grid step" value={s.spacing} min={4} max={40} onChange={(spacing) => set({ spacing })} />
          </>
        )}
        {s.mode === "stripes" && (
          <>
            {fadeControls}
            <SliderField label="Band width" value={s.stripe} min={1} max={30} onChange={(stripe) => set({ stripe })} />
          </>
        )}
      </Section>
      <Section title="Image">
        <label className="flex h-8 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed text-xs text-muted-foreground hover:bg-muted/50">
          <ImageUpIcon className="size-4" />
          {upload ? "Replace" : "Upload your own"}
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && setUpload(URL.createObjectURL(e.target.files[0]))} />
        </label>
      </Section>
    </>
  )

  return (
    <ToolLayout controls={controls} outputs={outputs}>
      <div className="flex h-full min-h-[460px] items-center justify-center p-6 md:p-10">
        <div className="aspect-[3/2] w-full max-w-4xl" style={{ ...style, background: `center / cover no-repeat url(${upload ?? sampleImage()})` }} />
      </div>
    </ToolLayout>
  )
}
