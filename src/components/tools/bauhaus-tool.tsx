import { useMemo } from "react"
import { DicesIcon, PlusIcon, XIcon } from "lucide-react"
import { randomSeed, rng } from "@/lib/random"
import { usePersistent } from "@/lib/use-persistent"
import { cn } from "@/lib/utils"
import { ColorInput } from "@/components/color-input"
import { Field, Section, SliderField } from "@/components/fields"
import { ToolLayout } from "@/components/tools/tool-layout"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

type Kind = "quarter" | "half" | "circle" | "ring" | "triangle" | "diamond" | "leaf" | "stripes" | "dots" | "arch" | "cross"

const KINDS: { id: Kind; name: string; css: string }[] = [
  { id: "quarter", name: "Quarter", css: "border-radius: 100% 0 0 0;" },
  { id: "half", name: "Semicircle", css: "top: 50%;\n  border-radius: 50% 50% 0 0 / 100% 100% 0 0;" },
  { id: "circle", name: "Circle", css: "inset: 14%;\n  border-radius: 50%;" },
  { id: "ring", name: "Ring", css: "background: radial-gradient(circle, transparent 37%, var(--fg) 38% 62%, transparent 63%);" },
  { id: "triangle", name: "Triangle", css: "clip-path: polygon(0 0, 100% 100%, 0 100%);" },
  { id: "diamond", name: "Rhombus", css: "clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);" },
  { id: "leaf", name: "Leaf", css: "border-radius: 0 100% 0 100%;" },
  { id: "stripes", name: "Stripes", css: "background: repeating-linear-gradient(0deg, var(--fg) 0 12.5%, transparent 12.5% 25%);" },
  { id: "dots", name: "Points", css: "background: radial-gradient(circle, var(--fg) 30%, transparent 32%) 0 0 / 33.333% 33.333%;" },
  { id: "arch", name: "Arch", css: "inset: 18% 18% 0;\n  border-radius: 999px 999px 0 0;" },
  { id: "cross", name: "Cross", css: "clip-path: polygon(35% 0, 65% 0, 65% 35%, 100% 35%, 100% 65%, 65% 65%, 65% 100%, 35% 100%, 35% 65%, 0 65%, 0 35%, 35% 35%);" },
]

type Anim = "none" | "rotate" | "breathe" | "flip"
type Stagger = "wave" | "radial" | "random"

interface State {
  cols: number
  rows: number
  kinds: Kind[]
  colors: string[]
  bg: string
  density: number
  gap: number
  radius: number
  anim: Anim
  duration: number
  stagger: Stagger
  hover: boolean
  seed: number
}

const DEFAULTS: State = {
  cols: 8,
  rows: 5,
  kinds: ["quarter", "half", "circle", "ring", "triangle", "leaf", "stripes", "dots"],
  colors: ["#e63946", "#ffbe0b", "#1d3557", "#111111", "#f1e9da"],
  bg: "#f1e9da",
  density: 0.9,
  gap: 0,
  radius: 0,
  anim: "rotate",
  duration: 8,
  stagger: "wave",
  hover: true,
  seed: 1919,
}

const PALETTES: { id: string; name: string; colors: string[]; bg: string }[] = [
  { id: "bauhaus", name: "Bauhaus", colors: ["#e63946", "#ffbe0b", "#1d3557", "#111111", "#f1e9da"], bg: "#f1e9da" },
  { id: "pastel", name: "Pastel", colors: ["#fbcfe8", "#bfdbfe", "#bbf7d0", "#fde68a", "#ddd6fe"], bg: "#fffaf5" },
  { id: "earth", name: "Land", colors: ["#9c6644", "#e6ccb2", "#7f5539", "#ddb892", "#344e41"], bg: "#ede0d4" },
  { id: "mono", name: "Mono", colors: ["#111111", "#f5f5f5", "#737373", "#d4d4d4"], bg: "#f5f5f5" },
  { id: "neon", name: "Neon", colors: ["#f72585", "#7209b7", "#4cc9f0", "#fee440", "#0b0b14"], bg: "#0b0b14" },
  { id: "ocean", name: "Sea", colors: ["#03045e", "#0077b6", "#00b4d8", "#90e0ef", "#caf0f8"], bg: "#caf0f8" },
]

interface Tile {
  kind: Kind | "empty"
  bg: string
  fg: string
  rot: number
  delay: number
}

function tiles(s: State): Tile[] {
  const r = rng(s.seed)
  const kinds = s.kinds.length ? s.kinds : (["circle"] as Kind[])
  const out: Tile[] = []
  const cx = (s.cols - 1) / 2
  const cy = (s.rows - 1) / 2
  const maxD = Math.hypot(cx, cy) || 1
  for (let y = 0; y < s.rows; y++) {
    for (let x = 0; x < s.cols; x++) {
      const bg = s.colors[Math.floor(r() * s.colors.length)]
      let fg = s.colors[Math.floor(r() * s.colors.length)]
      for (let k = 0; k < 6 && fg === bg && s.colors.length > 1; k++) fg = s.colors[Math.floor(r() * s.colors.length)]
      const kind = r() < s.density ? kinds[Math.floor(r() * kinds.length)] : "empty"
      const rot = Math.floor(r() * 4) * 90
      const t = s.stagger === "wave" ? (x + y) / (s.cols + s.rows - 2 || 1) : s.stagger === "radial" ? Math.hypot(x - cx, y - cy) / maxD : r()
      out.push({ kind, bg, fg, rot, delay: -Number((t * s.duration * 0.6).toFixed(2)) })
    }
  }
  return out
}

function buildCss(s: State) {
  const anim =
    s.anim === "rotate"
      ? `\n  animation: bh-rotate ${s.duration}s cubic-bezier(0.7, 0, 0.3, 1) infinite;\n  animation-delay: var(--d);`
      : s.anim === "breathe"
        ? `\n  animation: bh-breathe ${s.duration / 2}s ease-in-out infinite;\n  animation-delay: var(--d);`
        : s.anim === "flip"
          ? `\n  animation: bh-flip ${s.duration}s cubic-bezier(0.7, 0, 0.3, 1) infinite;\n  animation-delay: var(--d);`
          : ""
  const keyframes =
    s.anim === "rotate"
      ? `\n@keyframes bh-rotate {\n  0%, 20% { rotate: 0deg; }\n  25%, 45% { rotate: 90deg; }\n  50%, 70% { rotate: 180deg; }\n  75%, 95% { rotate: 270deg; }\n  100% { rotate: 360deg; }\n}\n`
      : s.anim === "breathe"
        ? `\n@keyframes bh-breathe {\n  0%, 100% { scale: 1; }\n  50% { scale: 0.55; }\n}\n`
        : s.anim === "flip"
          ? `\n@keyframes bh-flip {\n  0%, 40% { rotate: y 0deg; }\n  50%, 90% { rotate: y 180deg; }\n  100% { rotate: y 360deg; }\n}\n`
          : ""
  const used = Array.from(new Set(tiles(s).map((t) => t.kind))).filter((k) => k !== "empty")
  return `.bauhaus {
  display: grid;
  grid-template-columns: repeat(${s.cols}, 1fr);
  gap: ${s.gap}px;
  padding: ${s.gap}px;
  background: ${s.bg};
}

.bauhaus > div {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: ${s.radius}px;
  background: var(--bg);${s.anim === "flip" ? "\n  perspective: 600px;" : ""}
}

.bauhaus i {
  position: absolute;
  inset: 0;
  background: var(--fg);
  transform: rotate(var(--r));
  transition: transform 0.6s cubic-bezier(0.6, 0, 0.2, 1);${anim}
}
${s.hover ? `\n.bauhaus > div:hover i {\n  transform: rotate(calc(var(--r) + 90deg));\n}\n` : ""}
${KINDS.filter((k) => used.includes(k.id))
  .map((k) => `.bh-${k.id} i {\n  ${k.css}\n}`)
  .join("\n\n")}
${tiles(s).some((t) => t.kind === "empty") ? "\n.bh-empty i {\n  display: none;\n}\n" : ""}${keyframes}
@media (prefers-reduced-motion: reduce) {
  .bauhaus i {
    animation: none;
  }
}`
}

function shapeSvg(kind: Kind, size: number, fg: string): string {
  const s = size
  switch (kind) {
    case "quarter":
      return `<path d="M${s},0 A${s},${s} 0 0,0 0,${s} L${s},${s} Z" fill="${fg}"/>`
    case "half":
      return `<path d="M0,${s} A${s / 2},${s / 2} 0 0,1 ${s},${s} Z" fill="${fg}"/>`
    case "circle":
      return `<circle cx="${s / 2}" cy="${s / 2}" r="${s * 0.36}" fill="${fg}"/>`
    case "ring":
      return `<circle cx="${s / 2}" cy="${s / 2}" r="${s * 0.25}" fill="none" stroke="${fg}" stroke-width="${s * 0.12}"/>`
    case "triangle":
      return `<path d="M0,0 L${s},${s} L0,${s} Z" fill="${fg}"/>`
    case "diamond":
      return `<path d="M${s / 2},0 L${s},${s / 2} L${s / 2},${s} L0,${s / 2} Z" fill="${fg}"/>`
    case "leaf":
      return `<path d="M0,0 A${s},${s} 0 0,1 ${s},${s} A${s},${s} 0 0,1 0,0 Z" fill="${fg}"/>`
    case "stripes":
      return Array.from({ length: 4 }, (_, i) => `<rect x="0" y="${s - (i * 2 + 1) * (s / 8)}" width="${s}" height="${s / 8}" fill="${fg}"/>`).join("")
    case "dots":
      return Array.from({ length: 9 }, (_, i) => `<circle cx="${((i % 3) + 0.5) * (s / 3)}" cy="${(Math.floor(i / 3) + 0.5) * (s / 3)}" r="${s * 0.1}" fill="${fg}"/>`).join("")
    case "arch":
      return `<path d="M${s * 0.18},${s} L${s * 0.18},${s * 0.5} A${s * 0.32},${s * 0.32} 0 0,1 ${s * 0.82},${s * 0.5} L${s * 0.82},${s} Z" fill="${fg}"/>`
    case "cross":
      return `<path d="M${s * 0.35},0 H${s * 0.65} V${s * 0.35} H${s} V${s * 0.65} H${s * 0.65} V${s} H${s * 0.35} V${s * 0.65} H0 V${s * 0.35} H${s * 0.35} Z" fill="${fg}"/>`
  }
}

function buildSvg(s: State, list: Tile[]) {
  const size = 100
  const step = size + s.gap
  const w = s.cols * step + s.gap
  const h = s.rows * step + s.gap
  const body = list
    .map((t, i) => {
      const x = s.gap + (i % s.cols) * step
      const y = s.gap + Math.floor(i / s.cols) * step
      const shape = t.kind === "empty" ? "" : `<g transform="rotate(${t.rot} ${size / 2} ${size / 2})">${shapeSvg(t.kind, size, t.fg)}</g>`
      return `  <g transform="translate(${x} ${y})"><rect width="${size}" height="${size}" rx="${s.radius}" fill="${t.bg}"/>${shape}</g>`
    })
    .join("\n")
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">\n  <rect width="${w}" height="${h}" fill="${s.bg}"/>\n${body}\n</svg>`
}

export function BauhausTool() {
  const [s, set] = usePersistent<State>("lf-tool-bauhaus", DEFAULTS)
  const list = useMemo(() => tiles(s), [s])
  const css = useMemo(() => buildCss(s), [s])
  const html = `<div class="bauhaus">\n${list.map((t) => `  <div class="bh-${t.kind}" style="--bg: ${t.bg}; --fg: ${t.fg}; --r: ${t.rot}deg; --d: ${t.delay}s"><i></i></div>`).join("\n")}\n</div>`

  const outputs = [
    { id: "html", label: "HTML + CSS", lang: "html", file: "bauhaus.html", code: `${html}\n\n<style>\n${css.replace(/^/gm, "  ").replace(/^ +$/gm, "")}\n</style>\n` },
    { id: "css", label: "CSS", lang: "css", file: "bauhaus.css", code: `${css}\n` },
    { id: "svg", label: "SVG", lang: "html", file: "bauhaus.svg", code: `${buildSvg(s, list)}\n` },
  ]

  const toggle = (k: Kind) => set({ kinds: s.kinds.includes(k) ? s.kinds.filter((x) => x !== k) : [...s.kinds, k] })

  const controls = (
    <>
      <Section
        title="Grid"
        action={
          <Button variant="ghost" size="xs" onClick={() => set({ seed: randomSeed() })}>
            <DicesIcon />
            Shuffle
          </Button>
        }
      >
        <SliderField label="Columns" value={s.cols} min={2} max={20} unit="" onChange={(cols) => set({ cols })} />
        <SliderField label="Rows" value={s.rows} min={1} max={14} unit="" onChange={(rows) => set({ rows })} />
        <SliderField label="Fill" value={s.density} min={0.1} max={1} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(density) => set({ density })} />
        <SliderField label="Gap" value={s.gap} min={0} max={24} onChange={(gap) => set({ gap })} />
        <SliderField label="Tile rounding" value={s.radius} min={0} max={40} onChange={(radius) => set({ radius })} />
      </Section>
      <Section title="Shapes">
        <div className="grid grid-cols-4 gap-1.5">
          {KINDS.map((k) => (
            <button
              key={k.id}
              onClick={() => toggle(k.id)}
              title={k.name}
              className={cn("rounded-lg border p-1 transition", s.kinds.includes(k.id) ? "border-primary bg-primary/5" : "opacity-40")}
            >
              <svg viewBox="0 0 100 100" className="aspect-square w-full" dangerouslySetInnerHTML={{ __html: `<rect width="100" height="100" rx="8" fill="#f1e9da"/>${shapeSvg(k.id, 100, "#1d3557")}` }} />
            </button>
          ))}
        </div>
      </Section>
      <Section title="Animation">
        <ToggleGroup variant="outline" size="sm" spacing={0} className="grid w-full grid-cols-4" value={[s.anim]} onValueChange={(v) => v[0] && set({ anim: v[0] as Anim })}>
          <ToggleGroupItem value="none" className="text-xs">
            None
          </ToggleGroupItem>
          <ToggleGroupItem value="rotate" className="text-xs">
            Rotation
          </ToggleGroupItem>
          <ToggleGroupItem value="breathe" className="text-xs">
            Breathing
          </ToggleGroupItem>
          <ToggleGroupItem value="flip" className="text-xs">
            3D flip
          </ToggleGroupItem>
        </ToggleGroup>
        {s.anim !== "none" && (
          <>
            <SliderField label="Cycle" value={s.duration} min={2} max={30} step={0.5} unit="s" onChange={(duration) => set({ duration })} />
            <ToggleGroup variant="outline" size="sm" spacing={0} className="w-full" value={[s.stagger]} onValueChange={(v) => v[0] && set({ stagger: v[0] as Stagger })}>
              <ToggleGroupItem value="wave" className="flex-1 text-xs">
                Wavy
              </ToggleGroupItem>
              <ToggleGroupItem value="radial" className="flex-1 text-xs">
                From center
              </ToggleGroupItem>
              <ToggleGroupItem value="random" className="flex-1 text-xs">
                Scattered
              </ToggleGroupItem>
            </ToggleGroup>
          </>
        )}
        <div className="flex items-center justify-between">
          <Label htmlFor="bh-hover" className="text-xs">
            Rotate on hover
          </Label>
          <Switch id="bh-hover" size="sm" checked={s.hover} onCheckedChange={(hover) => set({ hover })} />
        </div>
      </Section>
      <Section
        title="Palette"
        action={
          <Button variant="ghost" size="xs" disabled={s.colors.length >= 8} onClick={() => set({ colors: [...s.colors, "#ffffff"] })}>
            <PlusIcon />
          </Button>
        }
      >
        <div className="flex flex-wrap gap-1.5">
          {PALETTES.map((p) => (
            <button key={p.id} onClick={() => set({ colors: p.colors, bg: p.bg })} className="flex items-center gap-1 rounded-md border py-1 pr-2 pl-1 text-xs hover:bg-muted">
              <span className="flex">
                {p.colors.slice(0, 4).map((c) => (
                  <span key={c} className="size-3 first:rounded-l-sm last:rounded-r-sm" style={{ background: c }} />
                ))}
              </span>
              {p.name}
            </button>
          ))}
        </div>
        {s.colors.map((c, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className="flex-1">
              <ColorInput value={c} compact onChange={(v) => set({ colors: s.colors.map((x, j) => (j === i ? v : x)) })} />
            </div>
            <Button variant="ghost" size="icon-xs" disabled={s.colors.length <= 2} onClick={() => set({ colors: s.colors.filter((_, j) => j !== i) })} aria-label="Remove">
              <XIcon />
            </Button>
          </div>
        ))}
        <Field label="Background / gaps">
          <ColorInput value={s.bg} compact onChange={(bg) => set({ bg })} />
        </Field>
      </Section>
    </>
  )

  return (
    <ToolLayout controls={controls} outputs={outputs}>
      <style>{css}</style>
      <div className="flex min-h-full items-center justify-center p-4 md:p-10">
        <div className="bauhaus w-full max-w-5xl overflow-hidden rounded-xl shadow-xl">
          {list.map((t, i) => (
            <div key={i} className={`bh-${t.kind}`} style={{ "--bg": t.bg, "--fg": t.fg, "--r": `${t.rot}deg`, "--d": `${t.delay}s` } as React.CSSProperties}>
              <i />
            </div>
          ))}
        </div>
      </div>
    </ToolLayout>
  )
}
