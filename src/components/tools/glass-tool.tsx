import { ImageUpIcon } from "lucide-react"
import { useState } from "react"
import { hexToRgbString } from "@/lib/color"
import { DEFAULT_MESH, GRAIN_URI, MESH_PRESETS, presetPoints } from "@/lib/mesh"
import { sampleImage } from "@/lib/sample-image"
import { usePersistent } from "@/lib/use-persistent"
import { ColorInput } from "@/components/color-input"
import { Field, Section, SliderField } from "@/components/fields"
import { MeshPreview } from "@/components/tools/mesh-tool"
import { ToolLayout } from "@/components/tools/tool-layout"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

interface State {
  blur: number
  opacity: number
  tint: string
  saturate: number
  borderOpacity: number
  borderWidth: number
  radius: number
  shadow: number
  highlight: boolean
  noise: boolean
  bg: "mesh" | "image" | "blobs"
  preset: string
}

const DEFAULTS: State = {
  blur: 16,
  opacity: 0.16,
  tint: "#ffffff",
  saturate: 160,
  borderOpacity: 0.3,
  borderWidth: 1,
  radius: 24,
  shadow: 0.25,
  highlight: true,
  noise: false,
  bg: "mesh",
  preset: "cyber",
}

const PRESETS: { id: string; name: string; patch: Partial<State> }[] = [
  { id: "frost", name: "Frost", patch: { blur: 20, opacity: 0.2, tint: "#ffffff", saturate: 180, borderOpacity: 0.35, shadow: 0.2 } },
  { id: "clear", name: "Transparent", patch: { blur: 8, opacity: 0.08, tint: "#ffffff", saturate: 120, borderOpacity: 0.25, shadow: 0.1 } },
  { id: "dark", name: "Dark", patch: { blur: 24, opacity: 0.35, tint: "#0f172a", saturate: 140, borderOpacity: 0.15, shadow: 0.4 } },
  { id: "tinted", name: "Colored", patch: { blur: 18, opacity: 0.22, tint: "#a78bfa", saturate: 200, borderOpacity: 0.4, shadow: 0.25 } },
  { id: "heavy", name: "Matte", patch: { blur: 40, opacity: 0.3, tint: "#ffffff", saturate: 110, borderOpacity: 0.2, noise: true } },
]

function glassDecls(s: State): [string, string][] {
  const filter = `blur(${s.blur}px) saturate(${s.saturate}%)`
  const shadows = [`0 8px 32px ${hexToRgbString("#000000", s.shadow)}`]
  if (s.highlight) shadows.push(`inset 0 1px 0 ${hexToRgbString("#ffffff", Math.min(1, s.borderOpacity + 0.2))}`)
  const out: [string, string][] = [["background-color", hexToRgbString(s.tint, s.opacity)]]
  if (s.noise) out.push(["background-image", `url("${GRAIN_URI}")`], ["background-blend-mode", "overlay"])
  out.push(
    ["-webkit-backdrop-filter", filter],
    ["backdrop-filter", filter],
    ["border", `${s.borderWidth}px solid ${hexToRgbString("#ffffff", s.borderOpacity)}`],
    ["border-radius", `${s.radius}px`],
    ["box-shadow", shadows.join(", ")],
  )
  return out
}

const camel = (p: string) => p.replace(/^-webkit-/, "Webkit-").replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())

export function GlassTool() {
  const [s, set] = usePersistent<State>("lf-tool-glass", DEFAULTS)
  const [upload, setUpload] = useState<string | null>(null)
  const decls = glassDecls(s)
  const style = Object.fromEntries(decls.map(([p, v]) => [camel(p), v])) as React.CSSProperties
  const meshPreset = MESH_PRESETS.find((p) => p.id === s.preset) ?? MESH_PRESETS[0]
  const text = "text-white"

  const css = `.glass {\n${decls.map(([p, v]) => `  ${p}: ${v};`).join("\n")}\n}\n`
  const tw = [
    `bg-[${hexToRgbString(s.tint, s.opacity).replace(/\s*\/\s*/g, "/").replace(/\s+/g, "_")}]`,
    `backdrop-blur-[${s.blur}px]`,
    `backdrop-saturate-[${s.saturate / 100}]`,
    `border-[${s.borderWidth}px]`,
    `border-[${hexToRgbString("#ffffff", s.borderOpacity).replace(/\s*\/\s*/g, "/").replace(/\s+/g, "_")}]`,
    `rounded-[${s.radius}px]`,
    `shadow-[${decls.find(([p]) => p === "box-shadow")?.[1].replace(/,\s*/g, ",").replace(/\s*\/\s*/g, "/").replace(/\s+/g, "_")}]`,
  ].join(" ")

  const outputs = [
    { id: "css", label: "CSS", lang: "css", file: "glass.css", code: css },
    { id: "tw", label: "Tailwind", lang: "jsx", file: "Glass.jsx", code: `<div className="${tw}">\n  …\n</div>\n` },
  ]

  const controls = (
    <>
      <Section title="Templates">
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button key={p.id} onClick={() => set(p.patch)} className="rounded-md border px-2 py-1 text-xs hover:bg-muted">
              {p.name}
            </button>
          ))}
        </div>
      </Section>
      <Section title="Glass">
        <SliderField label="Blur" value={s.blur} min={0} max={60} onChange={(blur) => set({ blur })} />
        <SliderField label="Opacity" value={s.opacity} min={0} max={0.8} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(opacity) => set({ opacity })} />
        <SliderField label="Background saturation" value={s.saturate} min={50} max={300} unit="%" onChange={(saturate) => set({ saturate })} />
        <Field label="Hue">
          <ColorInput value={s.tint} compact onChange={(tint) => set({ tint })} />
        </Field>
        <div className="flex items-center justify-between">
          <Label htmlFor="g-noise" className="text-xs">
            Grain (frosting)
          </Label>
          <Switch id="g-noise" size="sm" checked={s.noise} onCheckedChange={(noise) => set({ noise })} />
        </div>
      </Section>
      <Section title="Edges and shadow">
        <SliderField label="Frame" value={s.borderOpacity} min={0} max={1} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(borderOpacity) => set({ borderOpacity })} />
        <SliderField label="Border thickness" value={s.borderWidth} min={0} max={4} onChange={(borderWidth) => set({ borderWidth })} />
        <SliderField label="Radius" value={s.radius} min={0} max={48} onChange={(radius) => set({ radius })} />
        <SliderField label="Shadow" value={s.shadow} min={0} max={0.8} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(shadow) => set({ shadow })} />
        <div className="flex items-center justify-between">
          <Label htmlFor="g-hl" className="text-xs">
            Top glare
          </Label>
          <Switch id="g-hl" size="sm" checked={s.highlight} onCheckedChange={(highlight) => set({ highlight })} />
        </div>
      </Section>
      <Section title="Preview background">
        <ToggleGroup variant="outline" size="sm" spacing={0} className="w-full" value={[s.bg]} onValueChange={(v) => v[0] && set({ bg: v[0] as State["bg"] })}>
          <ToggleGroupItem value="mesh" className="flex-1 text-xs">
            Mesh
          </ToggleGroupItem>
          <ToggleGroupItem value="blobs" className="flex-1 text-xs">
            Blotches
          </ToggleGroupItem>
          <ToggleGroupItem value="image" className="flex-1 text-xs">
            Photo
          </ToggleGroupItem>
        </ToggleGroup>
        {s.bg === "mesh" && (
          <div className="flex flex-wrap gap-1">
            {MESH_PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => set({ preset: p.id })}
                title={p.name}
                className="size-6 rounded-full ring-offset-2 ring-offset-background"
                style={{ background: `linear-gradient(135deg, ${p.colors[0]}, ${p.colors[1]})`, boxShadow: s.preset === p.id ? "0 0 0 2px var(--foreground)" : undefined }}
              />
            ))}
          </div>
        )}
        {s.bg === "image" && (
          <label className="flex h-8 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed text-xs text-muted-foreground hover:bg-muted/50">
            <ImageUpIcon className="size-4" />
            Your own image
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && setUpload(URL.createObjectURL(e.target.files[0]))} />
          </label>
        )}
      </Section>
    </>
  )

  const card = (
    <div className={`relative z-10 flex w-[min(100%,360px)] flex-col gap-4 p-6 ${text}`} style={style}>
      <div className="flex items-center gap-3">
        <div className="size-11 rounded-full bg-gradient-to-br from-white/70 to-white/20" />
        <div>
          <p className="text-sm font-semibold">Anna Smith</p>
          <p className="text-xs opacity-75">Product Designer</p>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <div className="h-9 rounded-lg border border-white/25 bg-white/10 px-3 text-xs leading-9 opacity-90">anna@studio.design</div>
        <div className="h-9 rounded-lg border border-white/25 bg-white/10 px-3 text-xs leading-9 opacity-90">••••••••••</div>
      </div>
      <button className="h-9 rounded-lg bg-white text-sm font-medium text-neutral-900">Enter</button>
    </div>
  )

  return (
    <ToolLayout controls={controls} outputs={outputs}>
      <div className="absolute inset-0 overflow-hidden">
        {s.bg === "mesh" && (
          <MeshPreview
            state={{ ...DEFAULT_MESH, base: meshPreset.base, points: presetPoints(meshPreset.colors, 11), animate: true, duration: 10, amplitude: 25, grain: false }}
            className="absolute inset-0"
          />
        )}
        {s.bg === "image" && <div className="absolute inset-0" style={{ background: `center / cover no-repeat url(${upload ?? sampleImage()})` }} />}
        {s.bg === "blobs" && (
          <div className="absolute inset-0 bg-slate-900">
            <div className="glass-float absolute top-[15%] left-[20%] size-56 rounded-full bg-fuchsia-500" />
            <div className="glass-float absolute right-[18%] bottom-[12%] size-64 rounded-full bg-cyan-400 [animation-delay:-4s]" />
            <div className="glass-float absolute top-[45%] left-[48%] size-40 rounded-full bg-amber-300 [animation-delay:-8s]" />
          </div>
        )}
        <div className="relative flex h-full min-h-[460px] flex-col items-center justify-center gap-6 p-8">
          <div className={`z-10 flex items-center gap-5 px-5 py-2.5 text-sm ${text}`} style={{ ...style, borderRadius: 999 }}>
            <span className="font-semibold">Studio</span>
            <span className="opacity-75">Work</span>
            <span className="opacity-75">Blog</span>
            <span className="opacity-75">Contacts</span>
          </div>
          {card}
        </div>
      </div>
    </ToolLayout>
  )
}
