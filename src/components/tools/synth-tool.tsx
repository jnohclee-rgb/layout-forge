import { useMemo, useRef } from "react"
import { DicesIcon } from "lucide-react"
import { randomSeed, rng } from "@/lib/random"
import { usePersistent } from "@/lib/use-persistent"
import { ColorInput } from "@/components/color-input"
import { Field, Section, SliderField } from "@/components/fields"
import { ToolLayout } from "@/components/tools/tool-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

interface State {
  horizon: number
  sky: [string, string, string]
  sun: [string, string]
  sunSize: number
  sunRise: number
  stripes: number
  glow: number
  mountains: boolean
  mountainColor: string
  ridge: string
  mountainHeight: number
  grid: string
  floor: string
  line: number
  cell: number
  angle: number
  duration: number
  lineGlow: boolean
  stars: boolean
  tilt: boolean
  title: boolean
  text: string
  seed: number
}

const DEFAULTS: State = {
  horizon: 58,
  sky: ["#0b0221", "#4a0d67", "#ff2a6d"],
  sun: ["#ffd319", "#ff2975"],
  sunSize: 42,
  sunRise: 0.62,
  stripes: 7,
  glow: 40,
  mountains: true,
  mountainColor: "#14052a",
  ridge: "#f222ff",
  mountainHeight: 14,
  grid: "#ff2975",
  floor: "#0d0221",
  line: 2,
  cell: 60,
  angle: 76,
  duration: 1.2,
  lineGlow: true,
  stars: true,
  tilt: true,
  title: true,
  text: "OUTRUN",
  seed: 8,
}

const PRESETS: { id: string; name: string; patch: Partial<State> }[] = [
  { id: "outrun", name: "Outrun", patch: { sky: ["#0b0221", "#4a0d67", "#ff2a6d"], sun: ["#ffd319", "#ff2975"], grid: "#ff2975", ridge: "#f222ff", floor: "#0d0221", mountainColor: "#14052a" } },
  { id: "vapor", name: "Vaporwave", patch: { sky: ["#1a0b2e", "#7b2cbf", "#ff9ecd"], sun: ["#fffb96", "#ff71ce"], grid: "#01cdfe", ridge: "#05ffa1", floor: "#120326", mountainColor: "#2a0b4a" } },
  { id: "tron", name: "Tron", patch: { sky: ["#000005", "#001a33", "#004d66"], sun: ["#e0ffff", "#00e5ff"], grid: "#00e5ff", ridge: "#00e5ff", floor: "#000208", mountainColor: "#00121f", stripes: 4 } },
  { id: "matrix", name: "Matrix", patch: { sky: ["#000000", "#001a00", "#003b00"], sun: ["#ccffcc", "#00ff41"], grid: "#00ff41", ridge: "#00ff41", floor: "#000500", mountainColor: "#001100" } },
  { id: "sunset", name: "Sunset drive", patch: { sky: ["#1e1b4b", "#be185d", "#fb923c"], sun: ["#fef08a", "#f97316"], grid: "#fb7185", ridge: "#fde047", floor: "#1e0a2e", mountainColor: "#2e1065" } },
]

function sunMask(stripes: number) {
  if (stripes <= 0) return "none"
  const stops: string[] = ["#000 0 50%"]
  let y = 50
  const step = 50 / stripes
  for (let i = 0; i < stripes; i++) {
    const gap = (step * (i + 1)) / (stripes + 1)
    const a = y + step - gap
    stops.push(`#000 ${y.toFixed(1)}% ${a.toFixed(1)}%`, `transparent ${a.toFixed(1)}% ${(y + step).toFixed(1)}%`)
    y += step
  }
  return `linear-gradient(to bottom, ${stops.join(", ")})`
}

function ridgePolygon(seed: number) {
  const r = rng(seed)
  const pts: string[] = ["0% 100%"]
  const n = 28
  for (let i = 0; i <= n; i++) {
    const x = (i / n) * 100
    const center = Math.abs(x - 50) / 50
    const y = 100 - (20 + r() * 70) * (0.35 + center * 0.75)
    pts.push(`${x.toFixed(1)}% ${Math.max(0, y).toFixed(1)}%`)
  }
  pts.push("100% 100%")
  return `polygon(${pts.join(", ")})`
}

function starsBg(seed: number) {
  const r = rng(seed + 1)
  return Array.from({ length: 70 }, () => {
    const s = r() < 0.15 ? 2 : 1
    return `radial-gradient(${s}px ${s}px at ${(r() * 100).toFixed(1)}% ${(r() * 100).toFixed(1)}%, #fff 50%, transparent 51%)`
  }).join(",\n    ")
}

function build(s: State) {
  const css = `.synth {
  --mx: 0;
  --my: 0;
  position: relative;
  overflow: hidden;
  min-height: 100vh;
  background: linear-gradient(to bottom, ${s.sky[0]} 0%, ${s.sky[1]} ${Math.round(s.horizon * 0.55)}%, ${s.sky[2]} ${s.horizon}%);
  font-family: system-ui, sans-serif;
}
${
  s.stars
    ? `
.synth__stars {
  position: absolute;
  inset: 0 0 ${100 - s.horizon}% 0;
  background-image:
    ${starsBg(s.seed)};
  transform: translate(calc(var(--mx) * -6px), calc(var(--my) * -4px));
  animation: synth-twinkle 3s ease-in-out infinite alternate;
}
`
    : ""
}
.synth__sun-glow {
  position: absolute;
  left: 50%;
  top: ${s.horizon}%;
  width: ${s.sunSize}vmin;
  aspect-ratio: 1;
  transform: translate(calc(-50% + var(--mx) * -14px), calc(-${Math.round(s.sunRise * 100)}% + var(--my) * -8px));
  filter: drop-shadow(0 0 ${s.glow}px ${s.sun[1]});
}

.synth__sun {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: linear-gradient(to bottom, ${s.sun[0]}, ${s.sun[1]});${
    s.stripes > 0
      ? `
  -webkit-mask-image: ${sunMask(s.stripes)};
  mask-image: ${sunMask(s.stripes)};`
      : ""
  }
}
${
  s.mountains
    ? `
.synth__ridge {
  position: absolute;
  left: -2%;
  right: -2%;
  top: ${s.horizon - s.mountainHeight}%;
  height: ${s.mountainHeight}%;
  transform: translateX(calc(var(--mx) * -10px));
  filter: drop-shadow(0 -1px 0 ${s.ridge}) drop-shadow(0 0 6px ${s.ridge});
}

.synth__mountains {
  width: 100%;
  height: 100%;
  background: ${s.mountainColor};
  clip-path: ${ridgePolygon(s.seed)};
}
`
    : ""
}
.synth__floor {
  position: absolute;
  left: 0;
  right: 0;
  top: ${s.horizon}%;
  bottom: 0;
  overflow: hidden;
  background: ${s.floor};
  perspective: 300px;
  perspective-origin: 50% 0;
}

.synth__grid {
  position: absolute;
  left: -100%;
  right: -100%;
  top: 0;
  height: 400%;
  transform-origin: 50% 0;
  transform: rotateX(${s.angle}deg) translateX(calc(var(--mx) * -60px));
  background-image:
    linear-gradient(${s.grid} ${s.line}px, transparent ${s.line}px),
    linear-gradient(90deg, ${s.grid} ${s.line}px, transparent ${s.line}px);
  background-size: ${s.cell}px ${s.cell}px;
  -webkit-mask-image: linear-gradient(to bottom, transparent, #000 12%);
  mask-image: linear-gradient(to bottom, transparent, #000 12%);${s.lineGlow ? `\n  filter: drop-shadow(0 0 3px ${s.grid});` : ""}
  animation: synth-move ${s.duration}s linear infinite;
}

.synth__horizon {
  position: absolute;
  left: 0;
  right: 0;
  top: ${s.horizon}%;
  height: 2px;
  background: ${s.grid};
  box-shadow: 0 0 24px 6px ${s.grid};
}
${
  s.title
    ? `
.synth__title {
  position: absolute;
  left: 50%;
  top: ${Math.max(8, s.horizon - 42)}%;
  margin: 0;
  transform: translateX(-50%) skewX(-8deg);
  font-size: clamp(48px, 12vw, 160px);
  font-weight: 900;
  font-style: italic;
  letter-spacing: 0.04em;
  background: linear-gradient(to bottom, #ffffff 0%, ${s.sun[0]} 45%, ${s.sun[1]} 55%, ${s.sky[1]} 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  filter: drop-shadow(0 0 18px ${s.sun[1]});
}
`
    : ""
}
@keyframes synth-move {
  to {
    background-position: 0 ${s.cell}px;
  }
}
${
  s.stars
    ? `
@keyframes synth-twinkle {
  from {
    opacity: 0.45;
  }
  to {
    opacity: 1;
  }
}
`
    : ""
}`

  const html = `<section class="synth">
${s.stars ? '  <div class="synth__stars"></div>\n' : ""}  <div class="synth__sun-glow"><div class="synth__sun"></div></div>
${s.mountains ? '  <div class="synth__ridge"><div class="synth__mountains"></div></div>\n' : ""}  <div class="synth__floor"><div class="synth__grid"></div></div>
  <div class="synth__horizon"></div>
${s.title ? `  <h1 class="synth__title">${s.text}</h1>\n` : ""}</section>`

  const js = `const synth = document.querySelector(".synth")

addEventListener("pointermove", (e) => {
  synth.style.setProperty("--mx", ((e.clientX / innerWidth) * 2 - 1).toFixed(3))
  synth.style.setProperty("--my", ((e.clientY / innerHeight) * 2 - 1).toFixed(3))
})
`
  return { css, html, js }
}

export function SynthTool() {
  const [s, set] = usePersistent<State>("lf-tool-synth", DEFAULTS)
  const { css, html, js } = useMemo(() => build(s), [s])
  const hostRef = useRef<HTMLDivElement>(null)

  const outputs = [
    {
      id: "html",
      label: "HTML",
      lang: "html",
      file: "synthwave.html",
      code: `${html}\n\n<style>\n${css.replace(/^/gm, "  ").replace(/^ +$/gm, "")}\n</style>${s.tilt ? `\n\n<script>\n${js.replace(/^/gm, "  ").replace(/^ +$/gm, "")}</script>` : ""}\n`,
    },
    { id: "css", label: "CSS", lang: "css", file: "synthwave.css", code: `${css}\n` },
    ...(s.tilt ? [{ id: "js", label: "JS", lang: "js", file: "synthwave.js", code: js }] : []),
  ]

  const color = (label: string, value: string, onChange: (v: string) => void) => (
    <Field label={label}>
      <ColorInput value={value} compact onChange={onChange} />
    </Field>
  )

  const controls = (
    <>
      <Section
        title="Templates"
        action={
          <Button variant="ghost" size="xs" onClick={() => set({ seed: randomSeed() })}>
            <DicesIcon />
            Mountains and stars
          </Button>
        }
      >
        <div className="grid grid-cols-3 gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => set(p.patch)}
              className="flex h-11 items-end rounded-lg border p-1.5 text-[10px] font-semibold text-white"
              style={{ background: `linear-gradient(${p.patch.sky?.join(",")})`, boxShadow: `inset 0 -3px 0 ${p.patch.grid}` }}
            >
              {p.name}
            </button>
          ))}
        </div>
      </Section>
      <Section title="Grid">
        <SliderField label="Horizon" value={s.horizon} min={35} max={75} unit="%" onChange={(horizon) => set({ horizon })} />
        <SliderField label="Plane tilt" value={s.angle} min={55} max={86} unit="°" onChange={(angle) => set({ angle })} />
        <SliderField label="Cell" value={s.cell} min={20} max={160} onChange={(cell) => set({ cell })} />
        <SliderField label="Line thickness" value={s.line} min={1} max={6} onChange={(line) => set({ line })} />
        <SliderField label="Time per cell" value={s.duration} min={0.2} max={6} step={0.1} unit="s" onChange={(duration) => set({ duration })} />
        {color("Lines", s.grid, (grid) => set({ grid }))}
        {color("Floor", s.floor, (floor) => set({ floor }))}
        <div className="flex items-center justify-between">
          <Label htmlFor="sy-glow" className="text-xs">
            Line glow
          </Label>
          <Switch id="sy-glow" size="sm" checked={s.lineGlow} onCheckedChange={(lineGlow) => set({ lineGlow })} />
        </div>
      </Section>
      <Section title="Sky and sun">
        {color("Sky top", s.sky[0], (v) => set({ sky: [v, s.sky[1], s.sky[2]] }))}
        {color("Sky middle", s.sky[1], (v) => set({ sky: [s.sky[0], v, s.sky[2]] }))}
        {color("At the horizon", s.sky[2], (v) => set({ sky: [s.sky[0], s.sky[1], v] }))}
        <div className="grid grid-cols-2 gap-2">
          {color("Sun top", s.sun[0], (v) => set({ sun: [v, s.sun[1]] }))}
          {color("Sun bottom", s.sun[1], (v) => set({ sun: [s.sun[0], v] }))}
        </div>
        <SliderField label="Sun size" value={s.sunSize} min={10} max={80} unit="vmin" onChange={(sunSize) => set({ sunSize })} />
        <SliderField label="Above the horizon" value={s.sunRise} min={0.2} max={1} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(sunRise) => set({ sunRise })} />
        <SliderField label="Sun bands" value={s.stripes} min={0} max={12} unit="" onChange={(stripes) => set({ stripes })} />
        <SliderField label="Glow" value={s.glow} min={0} max={120} onChange={(glow) => set({ glow })} />
        <div className="flex items-center justify-between">
          <Label htmlFor="sy-stars" className="text-xs">
            Twinkling stars
          </Label>
          <Switch id="sy-stars" size="sm" checked={s.stars} onCheckedChange={(stars) => set({ stars })} />
        </div>
      </Section>
      <Section title="Mountains">
        <div className="flex items-center justify-between">
          <Label htmlFor="sy-mt" className="text-xs">
            Show
          </Label>
          <Switch id="sy-mt" size="sm" checked={s.mountains} onCheckedChange={(mountains) => set({ mountains })} />
        </div>
        {s.mountains && (
          <>
            <SliderField label="Height" value={s.mountainHeight} min={4} max={35} unit="%" onChange={(mountainHeight) => set({ mountainHeight })} />
            {color("Color", s.mountainColor, (mountainColor) => set({ mountainColor }))}
            {color("Neon edge", s.ridge, (ridge) => set({ ridge }))}
          </>
        )}
      </Section>
      <Section title="Interaction and text">
        <div className="flex items-center justify-between">
          <Label htmlFor="sy-tilt" className="text-xs">
            Cursor parallax (+ JS)
          </Label>
          <Switch id="sy-tilt" size="sm" checked={s.tilt} onCheckedChange={(tilt) => set({ tilt })} />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="sy-title" className="text-xs">
            Neon heading
          </Label>
          <Switch id="sy-title" size="sm" checked={s.title} onCheckedChange={(title) => set({ title })} />
        </div>
        {s.title && <Input value={s.text} onChange={(e) => set({ text: e.target.value })} className="h-8" />}
      </Section>
    </>
  )

  const scoped = css.replace(/min-height: 100vh;/, "height: 100%;")

  return (
    <ToolLayout controls={controls} outputs={outputs}>
      <style>{scoped}</style>
      <div
        ref={hostRef}
        className="absolute inset-0 [&>.synth]:h-full"
        onPointerMove={(e) => {
          if (!s.tilt) return
          const el = hostRef.current?.firstElementChild as HTMLElement | null
          const r = hostRef.current?.getBoundingClientRect()
          if (!el || !r) return
          el.style.setProperty("--mx", (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3))
          el.style.setProperty("--my", (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3))
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </ToolLayout>
  )
}
