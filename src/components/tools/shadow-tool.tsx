import { CopyPlusIcon, PlusIcon, Trash2Icon, WandSparklesIcon } from "lucide-react"
import { hexToRgbString, parseHex, readableOn } from "@/lib/color"
import { usePersistent } from "@/lib/use-persistent"
import { cn } from "@/lib/utils"
import { ColorInput } from "@/components/color-input"
import { Field, IconButton, Section, SliderField } from "@/components/fields"
import { PresetGrid, ToolLayout } from "@/components/tools/tool-layout"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

interface Layer {
  id: string
  x: number
  y: number
  blur: number
  spread: number
  color: string
  opacity: number
  inset: boolean
}

interface State {
  layers: Layer[]
  selected: number
  bg: string
  surface: string
  radius: number
  size: number
  count: number
  distance: number
  blur: number
  opacity: number
  angle: number
  tint: string
}

const id = () => Math.random().toString(36).slice(2, 8)
const L = (x: number, y: number, blur: number, spread: number, opacity: number, color = "#0f172a", inset = false): Layer => ({
  id: id(),
  x,
  y,
  blur,
  spread,
  color,
  opacity,
  inset,
})

function smooth(count: number, distance: number, blur: number, opacity: number, angle: number, color: string): Layer[] {
  const rad = (angle * Math.PI) / 180
  return Array.from({ length: count }, (_, i) => {
    const t = (i + 1) / count
    const e = t * t
    const d = distance * e
    return L(
      Math.round(Math.cos(rad) * d * 10) / 10,
      Math.round(Math.sin(rad) * d * 10) / 10,
      Math.round(blur * e * 10) / 10,
      0,
      Math.round(((opacity * (1.4 - t * 0.8)) / count) * 1000) / 1000,
      color,
    )
  })
}

const PRESETS: { id: string; name: string; layers: () => Layer[]; bg?: string; surface?: string }[] = [
  { id: "xs", name: "Thin", layers: () => [L(0, 1, 2, 0, 0.06), L(0, 1, 3, 0, 0.1)] },
  { id: "soft", name: "Soft", layers: () => [L(0, 4, 6, -1, 0.08), L(0, 10, 15, -3, 0.1)] },
  { id: "smooth", name: "Smooth", layers: () => smooth(6, 40, 60, 0.35, 90, "#0f172a") },
  { id: "lift", name: "Lift", layers: () => [L(0, 2, 4, 0, 0.04), L(0, 8, 16, -4, 0.08), L(0, 24, 48, -12, 0.18)] },
  { id: "float", name: "Floating", layers: () => [L(0, 50, 100, -20, 0.25), L(0, 30, 60, -30, 0.3)] },
  { id: "hard", name: "Brutal", layers: () => [L(6, 6, 0, 0, 1, "#111111")] },
  { id: "inner", name: "Inner", layers: () => [L(0, 2, 6, 0, 0.12, "#0f172a", true)] },
  { id: "glow", name: "Glow", layers: () => [L(0, 0, 24, 2, 0.55, "#7c3aed"), L(0, 0, 4, 1, 0.4, "#a78bfa")] },
  {
    id: "neu",
    name: "Neumorphism",
    layers: () => [L(10, 10, 24, 0, 0.18, "#94a3b8"), L(-10, -10, 24, 0, 0.9, "#ffffff")],
    bg: "#e2e8f0",
    surface: "#e2e8f0",
  },
  { id: "ring", name: "Ring", layers: () => [L(0, 0, 0, 1, 0.12), L(0, 1, 3, 0, 0.1)] },
  { id: "long", name: "Long", layers: () => Array.from({ length: 12 }, (_, i) => L(i + 1, i + 1, 0, 0, 0.06)) },
  { id: "layered", name: "Multilayer", layers: () => smooth(8, 80, 100, 0.5, 90, "#0f172a") },
]

const DEFAULTS: State = {
  layers: PRESETS[3].layers(),
  selected: 0,
  bg: "#f1f5f9",
  surface: "#ffffff",
  radius: 16,
  size: 220,
  count: 6,
  distance: 40,
  blur: 60,
  opacity: 0.35,
  angle: 90,
  tint: "#0f172a",
}

function layerCss(l: Layer) {
  return `${l.inset ? "inset " : ""}${l.x}px ${l.y}px ${l.blur}px ${l.spread}px ${hexToRgbString(l.color, l.opacity)}`
}

export function ShadowTool() {
  const [s, set] = usePersistent<State>("lf-tool-shadow", DEFAULTS)
  const layer = s.layers[s.selected] ?? s.layers[0]
  const shadow = s.layers.map(layerCss).join(", ")
  const ink = readableOn(parseHex(s.surface) ?? { r: 1, g: 1, b: 1 }).r === 1 ? "#ffffff" : "#0f172a"
  const updateLayer = (patch: Partial<Layer>) => set({ layers: s.layers.map((l, i) => (i === s.selected ? { ...l, ...patch } : l)) })

  const outputs = [
    {
      id: "css",
      label: "CSS",
      lang: "css",
      file: "shadow.css",
      code: `.card {\n  border-radius: ${s.radius}px;\n  box-shadow:\n    ${s.layers.map(layerCss).join(",\n    ")};\n}\n`,
    },
    {
      id: "var",
      label: "Token",
      lang: "css",
      file: "tokens.css",
      code: `:root {\n  --shadow-custom:\n    ${s.layers.map(layerCss).join(",\n    ")};\n}\n\n.card {\n  box-shadow: var(--shadow-custom);\n}\n`,
    },
    {
      id: "tw",
      label: "Tailwind",
      lang: "jsx",
      file: "Card.jsx",
      code: `<div className="rounded-[${s.radius}px] shadow-[${s.layers.map(layerCss).join(",").replace(/\s*\/\s*/g, "/").replace(/\s+/g, "_")}]" />\n\n/* or in @theme */\n@theme {\n  --shadow-custom: ${shadow};\n}\n`,
    },
    {
      id: "drop",
      label: "drop-shadow",
      lang: "css",
      file: "drop-shadow.css",
      code: `.icon {\n  filter: ${s.layers
        .filter((l) => !l.inset)
        .map((l) => `drop-shadow(${l.x}px ${l.y}px ${Math.round(l.blur / 2)}px ${hexToRgbString(l.color, l.opacity)})`)
        .join("\n    ")};\n}\n`,
    },
  ]

  const controls = (
    <>
      <Section title="Templates">
        <PresetGrid
          items={PRESETS}
          cols={4}
          onPick={(p) => set({ layers: p.layers(), selected: 0, ...(p.bg ? { bg: p.bg, surface: p.surface } : {}) })}
          render={(p) => (
            <div className="flex size-full items-center justify-center" style={{ background: p.bg ?? "#f1f5f9" }}>
              <div className="size-1/2 rounded-md" style={{ background: p.surface ?? "#fff", boxShadow: p.layers().map(layerCss).join(", ") }} />
            </div>
          )}
        />
      </Section>
      <Section
        title={`Layers · ${s.layers.length}`}
        action={
          <div className="flex">
            <IconButton label="Add layer" onClick={() => set({ layers: [...s.layers, L(0, 4, 12, 0, 0.15)], selected: s.layers.length })}>
              <PlusIcon />
            </IconButton>
            <IconButton label="Duplicate" onClick={() => set({ layers: [...s.layers, { ...layer, id: id() }], selected: s.layers.length })}>
              <CopyPlusIcon />
            </IconButton>
            <IconButton
              label="Delete layer"
              disabled={s.layers.length <= 1}
              onClick={() => set({ layers: s.layers.filter((_, i) => i !== s.selected), selected: Math.max(0, s.selected - 1) })}
            >
              <Trash2Icon />
            </IconButton>
          </div>
        }
      >
        <div className="flex flex-col gap-1">
          {s.layers.map((l, i) => (
            <button
              key={l.id}
              onClick={() => set({ selected: i })}
              className={cn(
                "flex items-center gap-2 rounded-md border px-2 py-1 text-left font-mono text-[11px] transition-colors hover:bg-muted/60",
                i === s.selected && "border-primary bg-primary/5",
              )}
            >
              <span className="size-3 shrink-0 rounded-sm ring-1 ring-foreground/10" style={{ background: l.color, opacity: Math.max(0.25, l.opacity) }} />
              <span className="truncate">{layerCss(l)}</span>
            </button>
          ))}
        </div>
        {layer && (
          <div className="flex flex-col gap-3 rounded-lg border p-3">
            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
              <SliderField label="x" value={layer.x} min={-100} max={100} onChange={(x) => updateLayer({ x })} />
              <SliderField label="y" value={layer.y} min={-100} max={100} onChange={(y) => updateLayer({ y })} />
              <SliderField label="blur" value={layer.blur} min={0} max={200} onChange={(blur) => updateLayer({ blur })} />
              <SliderField label="spread" value={layer.spread} min={-50} max={50} onChange={(spread) => updateLayer({ spread })} />
            </div>
            <ColorInput value={layer.color} compact onChange={(color) => updateLayer({ color })} />
            <SliderField label="Opacity" value={layer.opacity} min={0} max={1} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(opacity) => updateLayer({ opacity })} />
            <div className="flex items-center justify-between">
              <Label htmlFor="inset" className="text-xs">
                inset
              </Label>
              <Switch id="inset" size="sm" checked={layer.inset} onCheckedChange={(inset) => updateLayer({ inset })} />
            </div>
          </div>
        )}
      </Section>
      <Section title="Smooth shadow generator">
        <SliderField label="Layers" value={s.count} min={2} max={12} unit="" onChange={(count) => set({ count })} />
        <SliderField label="Distance" value={s.distance} min={0} max={150} onChange={(distance) => set({ distance })} />
        <SliderField label="Blur" value={s.blur} min={0} max={250} onChange={(blur) => set({ blur })} />
        <SliderField label="Intensity" value={s.opacity} min={0.02} max={1} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(opacity) => set({ opacity })} />
        <SliderField label="Light direction" value={s.angle} min={0} max={360} unit="°" onChange={(angle) => set({ angle })} />
        <Field label="Shadow color">
          <ColorInput value={s.tint} compact onChange={(tint) => set({ tint })} />
        </Field>
        <Button size="sm" onClick={() => set({ layers: smooth(s.count, s.distance, s.blur, s.opacity, s.angle, s.tint), selected: 0 })}>
          <WandSparklesIcon />
          Generate layers
        </Button>
      </Section>
      <Section title="Preview">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Background">
            <ColorInput value={s.bg} compact onChange={(bg) => set({ bg })} />
          </Field>
          <Field label="Card">
            <ColorInput value={s.surface} compact onChange={(surface) => set({ surface })} />
          </Field>
        </div>
        <SliderField label="border-radius" value={s.radius} min={0} max={120} onChange={(radius) => set({ radius })} />
        <SliderField label="Size" value={s.size} min={80} max={400} onChange={(size) => set({ size })} />
      </Section>
    </>
  )

  return (
    <ToolLayout controls={controls} outputs={outputs}>
      <div className="flex h-full min-h-[420px] items-center justify-center p-10 transition-colors" style={{ background: s.bg }}>
        <div
          className="flex flex-col justify-end p-5 transition-[box-shadow,border-radius]"
          style={{ width: s.size * 1.3, height: s.size, background: s.surface, borderRadius: s.radius, boxShadow: shadow }}
        >
          <div className="h-2.5 w-2/3 rounded-full bg-current opacity-15" style={{ color: ink }} />
          <div className="mt-2 h-2.5 w-1/3 rounded-full bg-current opacity-10" style={{ color: ink }} />
        </div>
      </div>
    </ToolLayout>
  )
}
