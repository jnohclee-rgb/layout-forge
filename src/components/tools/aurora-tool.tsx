import { useMemo } from "react"
import { DicesIcon, PlusIcon, XIcon } from "lucide-react"
import { hexWithAlpha } from "@/lib/color"
import { GRAIN_URI } from "@/lib/mesh"
import { randomSeed, rng } from "@/lib/random"
import { usePersistent } from "@/lib/use-persistent"
import { cn } from "@/lib/utils"
import { ColorInput } from "@/components/color-input"
import { Field, Section, SliderField } from "@/components/fields"
import { HtmlPreview } from "@/components/tools/html-preview"
import { ToolLayout } from "@/components/tools/tool-layout"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

interface State {
  colors: string[]
  base: string
  ribbons: number
  blur: number
  intensity: number
  speed: number
  curtain: boolean
  curtainOpacity: number
  stars: boolean
  grain: boolean
  hero: boolean
  seed: number
}

const DEFAULTS: State = {
  colors: ["#34d399", "#22d3ee", "#818cf8", "#e879f9"],
  base: "#050816",
  ribbons: 5,
  blur: 70,
  intensity: 0.75,
  speed: 1,
  curtain: true,
  curtainOpacity: 0.3,
  stars: true,
  grain: true,
  hero: true,
  seed: 7,
}

const PRESETS: { id: string; name: string; colors: string[]; base: string }[] = [
  { id: "polar", name: "Polar", colors: ["#34d399", "#22d3ee", "#818cf8", "#e879f9"], base: "#050816" },
  { id: "violet", name: "Violet", colors: ["#a78bfa", "#f472b6", "#60a5fa", "#c084fc"], base: "#0b0420" },
  { id: "sunrise", name: "Dawn", colors: ["#fb7185", "#fbbf24", "#f97316", "#f0abfc"], base: "#1a0a14" },
  { id: "ice", name: "Ice", colors: ["#bae6fd", "#7dd3fc", "#a5f3fc", "#c7d2fe"], base: "#04121f" },
  { id: "toxic", name: "Toxic", colors: ["#a3e635", "#4ade80", "#2dd4bf", "#facc15"], base: "#030a05" },
]

const stars = (seed: number) => {
  const r = rng(seed + 3)
  return Array.from({ length: 60 }, () => {
    const sz = r() < 0.15 ? 2 : 1
    return `radial-gradient(${sz}px ${sz}px at ${(r() * 100).toFixed(1)}% ${(r() * 70).toFixed(1)}%, rgb(255 255 255 / ${(0.5 + r() * 0.5).toFixed(2)}) 50%, transparent 51%)`
  }).join(",\n    ")
}

function build(s: State) {
  const r = rng(s.seed)
  const ribbons = Array.from({ length: s.ribbons }, (_, i) => {
    const color = s.colors[i % s.colors.length]
    const top = Math.round(4 + r() * 58)
    const h = Math.round(22 + r() * 30)
    const dur = ((16 + r() * 16) / s.speed).toFixed(1)
    const x1 = Math.round((r() - 0.5) * 24)
    const x2 = Math.round((r() - 0.5) * 24)
    const y1 = Math.round((r() - 0.5) * 20)
    const y2 = Math.round((r() - 0.5) * 20)
    const rot1 = ((r() - 0.5) * 14).toFixed(1)
    const rot2 = ((r() - 0.5) * 14).toFixed(1)
    const sc1 = (0.8 + r() * 0.6).toFixed(2)
    const sc2 = (0.8 + r() * 0.6).toFixed(2)
    return { i, color, top, h, dur, kf: `@keyframes aurora-r${i} {\n  0% {\n    transform: translate(${x1}%, ${y1}%) rotate(${rot1}deg) scaleY(${sc1});\n  }\n  100% {\n    transform: translate(${x2}%, ${y2}%) rotate(${rot2}deg) scaleY(${sc2});\n  }\n}` }
  })
  const css = `.aurora {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  min-height: 100%;
  background: ${s.base};
}

.aurora__ribbon {
  position: absolute;
  left: -25%;
  width: 150%;
  border-radius: 50%;
  filter: blur(${s.blur}px);
  opacity: ${s.intensity};
  mix-blend-mode: screen;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
  animation-direction: alternate;
}

${ribbons
  .map(
    (b) =>
      `.aurora__ribbon:nth-child(${b.i + 1}) {\n  top: ${b.top}%;\n  height: ${b.h}%;\n  background: linear-gradient(90deg, transparent, ${b.color} 30%, ${b.color} 70%, transparent);\n  animation-name: aurora-r${b.i};\n  animation-duration: ${b.dur}s;\n}`,
  )
  .join("\n\n")}
${
  s.curtain
    ? `
.aurora__curtain {
  position: absolute;
  inset: -10% -10% 30%;
  background: repeating-linear-gradient(90deg, transparent 0 3%, ${hexWithAlpha(s.colors[0], s.curtainOpacity)} 5%, transparent 8%, ${hexWithAlpha(s.colors[1] ?? s.colors[0], s.curtainOpacity * 0.8)} 11%, transparent 14%);
  -webkit-mask-image: linear-gradient(to bottom, #000, transparent 80%);
  mask-image: linear-gradient(to bottom, #000, transparent 80%);
  filter: blur(6px);
  mix-blend-mode: screen;
  transform-origin: 50% 0;
  animation: aurora-sway ${(11 / s.speed).toFixed(1)}s ease-in-out infinite alternate;
}
`
    : ""
}${
    s.stars
      ? `
.aurora__stars {
  position: absolute;
  inset: 0;
  background-image:
    ${stars(s.seed)};
  animation: aurora-twinkle 5s ease-in-out infinite alternate;
}
`
      : ""
  }${
    s.grain
      ? `
.aurora::after {
  content: "";
  position: absolute;
  inset: 0;
  background-image: url("${GRAIN_URI}");
  opacity: 0.18;
  mix-blend-mode: overlay;
  pointer-events: none;
}
`
      : ""
  }
${ribbons.map((b) => b.kf).join("\n\n")}
${s.curtain ? `\n@keyframes aurora-sway {\n  from {\n    transform: skewX(-6deg) translateX(-3%) scaleY(0.9);\n  }\n  to {\n    transform: skewX(6deg) translateX(3%) scaleY(1.1);\n  }\n}\n` : ""}${s.stars ? `\n@keyframes aurora-twinkle {\n  from {\n    opacity: 0.4;\n  }\n  to {\n    opacity: 1;\n  }\n}\n` : ""}
@media (prefers-reduced-motion: reduce) {
  .aurora__ribbon,
  .aurora__curtain,
  .aurora__stars {
    animation: none;
  }
}
`
  const html = `<div class="aurora">\n${s.stars ? '  <div class="aurora__stars"></div>\n' : ""}${ribbons.map(() => '  <div class="aurora__ribbon"></div>').join("\n")}\n${s.curtain ? '  <div class="aurora__curtain"></div>\n' : ""}</div>`
  return { html, css: css.replace(/\n{3,}/g, "\n\n") }
}

export function AuroraTool() {
  const [s, set] = usePersistent<State>("lf-tool-aurora", DEFAULTS)
  const { html, css } = useMemo(() => build(s), [s])

  const outputs = [
    { id: "html", label: "HTML", lang: "html", file: "aurora.html", code: `${html}\n` },
    { id: "css", label: "CSS", lang: "css", file: "aurora.css", code: css },
  ]

  const controls = (
    <>
      <Section
        title="Templates"
        action={
          <Button variant="ghost" size="xs" onClick={() => set({ seed: randomSeed() })}>
            <DicesIcon />
            Other ribbons
          </Button>
        }
      >
        <div className="grid grid-cols-3 gap-1.5">
          {PRESETS.map((p) => (
            <button key={p.id} onClick={() => set({ colors: p.colors, base: p.base })} className="flex h-12 items-end rounded-lg border p-1.5 text-[10px] font-medium text-white" style={{ background: `linear-gradient(135deg, ${p.base}, ${p.colors[0]}88, ${p.colors[2]}88)` }}>
              {p.name}
            </button>
          ))}
        </div>
      </Section>
      <Section title="Ribbons">
        <SliderField label="Count" value={s.ribbons} min={2} max={8} unit="" onChange={(ribbons) => set({ ribbons })} />
        <SliderField label="Blur" value={s.blur} min={10} max={160} onChange={(blur) => set({ blur })} />
        <SliderField label="Brightness" value={s.intensity} min={0.15} max={1} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(intensity) => set({ intensity })} />
        <SliderField label="Speed" value={s.speed} min={0.2} max={4} step={0.05} format={(v) => `×${v.toFixed(2)}`} onChange={(speed) => set({ speed })} />
      </Section>
      <Section
        title="Colors"
        action={
          <Button variant="ghost" size="xs" disabled={s.colors.length >= 6} onClick={() => set({ colors: [...s.colors, "#ffffff"] })}>
            <PlusIcon />
          </Button>
        }
      >
        {s.colors.map((c, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className="flex-1">
              <ColorInput value={c} compact onChange={(v) => set({ colors: s.colors.map((x, j) => (j === i ? v : x)) })} />
            </div>
            <Button variant="ghost" size="icon-xs" disabled={s.colors.length <= 1} onClick={() => set({ colors: s.colors.filter((_, j) => j !== i) })} aria-label="Remove">
              <XIcon />
            </Button>
          </div>
        ))}
        <Field label="Background">
          <ColorInput value={s.base} compact onChange={(base) => set({ base })} />
        </Field>
      </Section>
      <Section title="Layers and details">
        <div className="flex items-center justify-between">
          <Label htmlFor="au-c" className="text-xs">
            Curtain stripes
          </Label>
          <Switch id="au-c" size="sm" checked={s.curtain} onCheckedChange={(curtain) => set({ curtain })} />
        </div>
        {s.curtain && <SliderField label="Curtain brightness" value={s.curtainOpacity} min={0.05} max={0.8} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(curtainOpacity) => set({ curtainOpacity })} />}
        <div className="flex items-center justify-between">
          <Label htmlFor="au-s" className="text-xs">
            Stars
          </Label>
          <Switch id="au-s" size="sm" checked={s.stars} onCheckedChange={(stars) => set({ stars })} />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="au-g" className="text-xs">
            Grain
          </Label>
          <Switch id="au-g" size="sm" checked={s.grain} onCheckedChange={(grain) => set({ grain })} />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="au-h" className="text-xs">
            Hero text in preview
          </Label>
          <Switch id="au-h" size="sm" checked={s.hero} onCheckedChange={(hero) => set({ hero })} />
        </div>
      </Section>
    </>
  )

  return (
    <ToolLayout controls={controls} outputs={outputs}>
      <HtmlPreview html={html} css={css} />
      {s.hero && (
        <div className={cn("pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 p-8 text-center text-white")}>
          <h2 className="max-w-xl text-3xl font-semibold drop-shadow-lg md:text-5xl">The north in your interface</h2>
          <p className="max-w-md text-sm text-white/70">Pure CSS</p>
        </div>
      )}
    </ToolLayout>
  )
}
