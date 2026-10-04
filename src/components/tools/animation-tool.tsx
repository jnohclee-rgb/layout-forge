import { useMemo, useState } from "react"
import { CopyPlusIcon, PauseIcon, PlayIcon, RotateCcwIcon, Trash2Icon } from "lucide-react"
import { type Bezier, BezierEditor, EASINGS, SpringPlot, bezierCss, spring } from "@/components/bezier-editor"
import { usePersistent } from "@/lib/use-persistent"
import { cn } from "@/lib/utils"
import { Field, IconButton, NumberInput, Section, SelectField, SliderField } from "@/components/fields"
import { ToolLayout } from "@/components/tools/tool-layout"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

interface Stop {
  id: string
  at: number
  x: number
  y: number
  scale: number
  rotate: number
  skew: number
  ry: number
  opacity: number
  blur: number
}

type StopValues = Omit<Stop, "id" | "at">
type Timing = "bezier" | "spring" | "steps"
type Trigger = "load" | "view" | "scroll"
type Target = "box" | "button" | "title" | "card"

interface State {
  preset: string
  stops: Stop[]
  unit: "px" | "%"
  duration: number
  delay: number
  iterations: number
  direction: "normal" | "alternate" | "reverse" | "alternate-reverse"
  fill: "none" | "forwards" | "backwards" | "both"
  timing: Timing
  bezier: Bezier
  stiffness: number
  damping: number
  mass: number
  steps: number
  name: string
  target: Target
  trigger: Trigger
  origin: string
  reduced: boolean
}

const BASE: StopValues = { x: 0, y: 0, scale: 1, rotate: 0, skew: 0, ry: 0, opacity: 1, blur: 0 }
const uid = () => Math.random().toString(36).slice(2, 8)
const stop = (at: number, over: Partial<StopValues> = {}): Stop => ({ id: uid(), at, ...BASE, ...over })

interface Preset {
  id: string
  name: string
  group: string
  dur: number
  ease: string
  iter: number
  dir?: State["direction"]
  fill?: State["fill"]
  origin?: string
  stops: [number, Partial<StopValues>][]
}

const PRESETS: Preset[] = [
  { id: "fade-in", name: "Fade", group: "Appear", dur: 0.6, ease: "outCubic", iter: 1, stops: [[0, { opacity: 0 }], [100, {}]] },
  { id: "fade-up", name: "Fade up", group: "Appear", dur: 0.7, ease: "outCubic", iter: 1, stops: [[0, { opacity: 0, y: 28 }], [100, {}]] },
  { id: "fade-down", name: "Fade down", group: "Appear", dur: 0.7, ease: "outCubic", iter: 1, stops: [[0, { opacity: 0, y: -28 }], [100, {}]] },
  { id: "fade-left", name: "Fade left", group: "Appear", dur: 0.7, ease: "outCubic", iter: 1, stops: [[0, { opacity: 0, x: -40 }], [100, {}]] },
  { id: "fade-right", name: "Fade right", group: "Appear", dur: 0.7, ease: "outCubic", iter: 1, stops: [[0, { opacity: 0, x: 40 }], [100, {}]] },
  { id: "zoom-in", name: "Zoom in", group: "Appear", dur: 0.6, ease: "outBack", iter: 1, stops: [[0, { opacity: 0, scale: 0.6 }], [100, {}]] },
  { id: "zoom-out", name: "Zoom out", group: "Appear", dur: 0.6, ease: "outCubic", iter: 1, stops: [[0, { opacity: 0, scale: 1.4 }], [100, {}]] },
  { id: "blur-in", name: "Blur in", group: "Appear", dur: 0.9, ease: "outCubic", iter: 1, stops: [[0, { opacity: 0, blur: 14, scale: 1.04 }], [100, {}]] },
  { id: "flip-in", name: "Flip in", group: "Appear", dur: 0.9, ease: "outCubic", iter: 1, stops: [[0, { opacity: 0, ry: -90 }], [100, {}]] },
  { id: "rotate-in", name: "Rotate in", group: "Appear", dur: 0.8, ease: "outBack", iter: 1, stops: [[0, { opacity: 0, rotate: -120, scale: 0.4 }], [100, {}]] },
  { id: "pulse", name: "Pulse", group: "Accent", dur: 1.4, ease: "inout", iter: 0, stops: [[0, {}], [50, { scale: 1.08 }], [100, {}]] },
  { id: "heartbeat", name: "Heartbeat", group: "Accent", dur: 1.3, ease: "ease", iter: 0, stops: [[0, {}], [14, { scale: 1.18 }], [28, {}], [42, { scale: 1.18 }], [70, {}], [100, {}]] },
  { id: "bounce", name: "Bounce", group: "Accent", dur: 1.2, ease: "ease", iter: 0, stops: [[0, {}], [20, {}], [40, { y: -30 }], [50, {}], [60, { y: -14 }], [70, {}], [80, { y: -5 }], [100, {}]] },
  { id: "shake", name: "Shake", group: "Accent", dur: 0.8, ease: "linear", iter: 1, stops: [[0, {}], [10, { x: -10 }], [20, { x: 10 }], [30, { x: -10 }], [40, { x: 10 }], [50, { x: -10 }], [60, { x: 10 }], [70, { x: -10 }], [80, { x: 10 }], [90, { x: -10 }], [100, {}]] },
  { id: "wobble", name: "Wobble", group: "Accent", dur: 1, ease: "ease", iter: 1, stops: [[0, {}], [15, { x: -25, rotate: -5 }], [30, { x: 20, rotate: 3 }], [45, { x: -15, rotate: -3 }], [60, { x: 10, rotate: 2 }], [75, { x: -5, rotate: -1 }], [100, {}]] },
  { id: "swing", name: "Swing", group: "Accent", dur: 1, ease: "ease", iter: 1, origin: "top center", stops: [[0, {}], [20, { rotate: 15 }], [40, { rotate: -10 }], [60, { rotate: 5 }], [80, { rotate: -5 }], [100, {}]] },
  { id: "tada", name: "Tada", group: "Accent", dur: 1, ease: "ease", iter: 1, stops: [[0, {}], [10, { scale: 0.9, rotate: -3 }], [20, { scale: 0.9, rotate: -3 }], [30, { scale: 1.1, rotate: 3 }], [40, { scale: 1.1, rotate: -3 }], [50, { scale: 1.1, rotate: 3 }], [60, { scale: 1.1, rotate: -3 }], [70, { scale: 1.1, rotate: 3 }], [80, { scale: 1.1, rotate: -3 }], [90, { scale: 1.1, rotate: 3 }], [100, {}]] },
  { id: "jello", name: "Jello", group: "Accent", dur: 1, ease: "ease", iter: 1, stops: [[0, {}], [22, { skew: -12.5 }], [33, { skew: 6.25 }], [44, { skew: -3.1 }], [55, { skew: 1.5 }], [66, { skew: -0.8 }], [77, { skew: 0.4 }], [100, {}]] },
  { id: "float", name: "Float", group: "Accent", dur: 3, ease: "inout", iter: 0, stops: [[0, {}], [50, { y: -14 }], [100, {}]] },
  { id: "wiggle", name: "Wiggle", group: "Accent", dur: 0.5, ease: "inout", iter: 0, stops: [[0, { rotate: -4 }], [50, { rotate: 4 }], [100, { rotate: -4 }]] },
  { id: "spin", name: "Spin", group: "Accent", dur: 1.2, ease: "linear", iter: 0, stops: [[0, {}], [100, { rotate: 360 }]] },
  { id: "flip", name: "Flip Y", group: "Accent", dur: 1.4, ease: "inout", iter: 0, stops: [[0, {}], [100, { ry: 360 }]] },
  { id: "blink", name: "Blink", group: "Accent", dur: 1, ease: "inout", iter: 0, stops: [[0, {}], [50, { opacity: 0.1 }], [100, {}]] },
  { id: "fade-out", name: "Fade out", group: "Exit", dur: 0.5, ease: "in", iter: 1, fill: "forwards", stops: [[0, {}], [100, { opacity: 0 }]] },
  { id: "fade-out-down", name: "Fade out down", group: "Exit", dur: 0.6, ease: "in", iter: 1, fill: "forwards", stops: [[0, {}], [100, { opacity: 0, y: 32 }]] },
  { id: "zoom-exit", name: "Zoom exit", group: "Exit", dur: 0.5, ease: "inBack", iter: 1, fill: "forwards", stops: [[0, {}], [100, { opacity: 0, scale: 0.5 }]] },
  { id: "slide-out", name: "Slide out", group: "Exit", dur: 0.6, ease: "in", iter: 1, fill: "forwards", stops: [[0, {}], [100, { opacity: 0, x: 120 }]] },
]

const GROUPS = ["Appear", "Accent", "Exit"]

const FIELDS: { key: keyof StopValues; label: string; min: number; max: number; step: number; unit?: string }[] = [
  { key: "x", label: "Offset X", min: -200, max: 200, step: 1 },
  { key: "y", label: "Offset Y", min: -200, max: 200, step: 1 },
  { key: "scale", label: "Scale", min: 0, max: 3, step: 0.01 },
  { key: "rotate", label: "Rotation", min: -360, max: 360, step: 1, unit: "°" },
  { key: "skew", label: "Tilt X", min: -60, max: 60, step: 0.5, unit: "°" },
  { key: "ry", label: "3D rotate Y", min: -180, max: 360, step: 1, unit: "°" },
  { key: "opacity", label: "Transparency", min: 0, max: 1, step: 0.01 },
  { key: "blur", label: "Blur", min: 0, max: 30, step: 0.5, unit: "px" },
]

function fromPreset(p: Preset, current: State): Partial<State> {
  return {
    preset: p.id,
    stops: p.stops.map(([at, over]) => stop(at, over)),
    duration: p.dur,
    bezier: (EASINGS.find((e) => e.id === p.ease) ?? EASINGS[1]).value,
    timing: "bezier",
    iterations: p.iter,
    direction: p.dir ?? "normal",
    fill: p.fill ?? (current.trigger === "view" ? "both" : "none"),
    origin: p.origin ?? "center",
    name: p.id,
  }
}

const DEFAULTS: State = {
  preset: "fade-up",
  stops: [stop(0, { opacity: 0, y: 28 }), stop(100)],
  unit: "px",
  duration: 0.7,
  delay: 0,
  iterations: 1,
  direction: "normal",
  fill: "none",
  timing: "bezier",
  bezier: EASINGS[5].value,
  stiffness: 170,
  damping: 14,
  mass: 1,
  steps: 6,
  name: "fade-up",
  target: "card",
  trigger: "load",
  origin: "center",
  reduced: true,
}

const fmt = (n: number) => String(Number(n.toFixed(3)))

function usage(stops: Stop[]) {
  const any = (f: (s: Stop) => boolean) => stops.some(f)
  return {
    move: any((s) => s.x !== 0 || s.y !== 0),
    scale: any((s) => s.scale !== 1),
    rotate: any((s) => s.rotate !== 0),
    skew: any((s) => s.skew !== 0),
    ry: any((s) => s.ry !== 0),
    opacity: any((s) => s.opacity !== 1),
    blur: any((s) => s.blur !== 0),
  }
}

function declarations(s: Stop, u: ReturnType<typeof usage>, unit: string): { transform?: string; opacity?: string; filter?: string } {
  const t: string[] = []
  if (u.ry) t.push("perspective(800px)")
  if (u.move) t.push(`translate(${fmt(s.x)}${unit}, ${fmt(s.y)}${unit})`)
  if (u.rotate) t.push(`rotate(${fmt(s.rotate)}deg)`)
  if (u.scale) t.push(`scale(${fmt(s.scale)})`)
  if (u.skew) t.push(`skewX(${fmt(s.skew)}deg)`)
  if (u.ry) t.push(`rotateY(${fmt(s.ry)}deg)`)
  return {
    transform: t.length ? t.join(" ") : undefined,
    opacity: u.opacity ? fmt(s.opacity) : undefined,
    filter: u.blur ? `blur(${fmt(s.blur)}px)` : undefined,
  }
}

function slug(name: string) {
  return name.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "anim"
}

interface Built {
  name: string
  duration: number
  timing: string
  keyframes: string
  shorthand: string
  stopsJs: string
  springValues: number[] | null
}

function build(s: State, name: string): Built {
  const u = usage(s.stops)
  const sorted = [...s.stops].sort((a, b) => a.at - b.at)
  const sp = s.timing === "spring" ? spring(s.stiffness, s.damping, s.mass) : null
  const timing = s.timing === "spring" ? (sp as ReturnType<typeof spring>).css : s.timing === "steps" ? `steps(${s.steps}, end)` : bezierCss(s.bezier)
  const duration = sp ? sp.settle : s.duration
  const keyframes = `@keyframes ${name} {\n${sorted
    .map((st) => {
      const d = declarations(st, u, s.unit)
      const lines = [d.transform && `transform: ${d.transform};`, d.opacity && `opacity: ${d.opacity};`, d.filter && `filter: ${d.filter};`].filter(Boolean)
      return `  ${fmt(st.at)}% {\n${lines.map((l) => `    ${l}`).join("\n")}\n  }`
    })
    .join("\n")}\n}`
  const parts = [name, `${fmt(duration)}s`, timing]
  if (s.delay > 0) parts.push(`${fmt(s.delay)}s`)
  if (s.iterations === 0) parts.push("infinite")
  else if (s.iterations !== 1) parts.push(String(s.iterations))
  if (s.direction !== "normal") parts.push(s.direction)
  const fill = s.trigger === "view" || s.trigger === "scroll" ? "both" : s.fill
  if (fill !== "none") parts.push(fill)
  const stopsJs = sorted
    .map((st) => {
      const d = declarations(st, u, s.unit)
      const props = [d.transform && `transform: ${JSON.stringify(d.transform)}`, d.opacity && `opacity: ${d.opacity}`, d.filter && `filter: ${JSON.stringify(d.filter)}`, `offset: ${fmt(st.at / 100)}`].filter(Boolean)
      return `    { ${props.join(", ")} },`
    })
    .join("\n")
  return { name, duration, timing, keyframes, shorthand: parts.join(" "), stopsJs, springValues: sp?.values ?? null }
}

function exportCss(s: State) {
  const n = slug(s.name)
  const b = build(s, n)
  const origin = s.origin !== "center" ? `  transform-origin: ${s.origin};\n` : ""
  const reduce = (cls: string) => (s.reduced ? `\n\n@media (prefers-reduced-motion: reduce) {\n  ${cls} {\n    animation: none;\n  }\n}` : "")
  if (s.trigger === "scroll") {
    return `.reveal {\n${origin}  animation: ${n} linear both;\n  animation-timeline: view();\n  animation-range: entry 0% cover 35%;\n}\n\n${b.keyframes}\n\n@supports not (animation-timeline: view()) {\n  .reveal {\n    animation: none;\n  }\n}${reduce(".reveal")}\n`
  }
  if (s.trigger === "view") {
    return `.reveal {\n${origin}  animation: ${b.shorthand};\n  animation-play-state: paused;\n}\n\n.reveal.is-visible {\n  animation-play-state: running;\n}\n\n${b.keyframes}${reduce(".reveal")}\n`
  }
  return `.animated {\n${origin}  animation: ${b.shorthand};\n}\n\n${b.keyframes}${reduce(".animated")}\n`
}

function exportTailwind(s: State) {
  const n = slug(s.name)
  const b = build(s, n)
  const kf = b.keyframes.split("\n").map((l) => `  ${l}`).join("\n")
  return `@theme {\n  --animate-${n}: ${b.shorthand};\n\n${kf}\n}\n`
}

function exportJs(s: State) {
  const n = slug(s.name)
  const b = build(s, n)
  const timing = b.timing
  const options = `{ duration: ${Math.round(b.duration * 1000)}, delay: ${Math.round(s.delay * 1000)}, iterations: ${s.iterations === 0 ? "Infinity" : s.iterations}, direction: "${s.direction}", fill: "${s.trigger === "load" ? s.fill : "both"}", easing: ${JSON.stringify(timing)} }`
  const frames = `[\n${b.stopsJs}\n  ]`
  if (s.trigger === "view") {
    return `const frames = ${frames}\nconst options = ${options}\n\nconst io = new IntersectionObserver(\n  (entries) => {\n    for (const entry of entries) {\n      if (!entry.isIntersecting) continue\n      entry.target.animate(frames, options)\n      io.unobserve(entry.target)\n    }\n  },\n  { threshold: 0.2 },\n)\n\ndocument.querySelectorAll(".reveal").forEach((el) => io.observe(el))\n`
  }
  return `const el = document.querySelector(".animated")\n\nconst animation = el.animate(\n  ${frames},\n  ${options},\n)\n\nanimation.finished.then(() => console.log("done"))\n`
}

function exportView() {
  return `const io = new IntersectionObserver(\n  (entries) => {\n    for (const entry of entries) {\n      if (!entry.isIntersecting) continue\n      entry.target.classList.add("is-visible")\n      io.unobserve(entry.target)\n    }\n  },\n  { threshold: 0.2 },\n)\n\ndocument.querySelectorAll(".reveal").forEach((el) => io.observe(el))\n`
}

function PreviewTarget({ target }: { target: Target }) {
  if (target === "box") return <div className="size-28 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 shadow-xl" />
  if (target === "button") return <button className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg">Try for free</button>
  if (target === "title") return <h2 className="text-center text-4xl font-bold tracking-tight">Animation<br />that you can see</h2>
  return (
    <div className="flex w-64 flex-col gap-3 rounded-2xl border bg-card p-5 shadow-xl">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-full bg-gradient-to-br from-sky-400 to-indigo-500" />
        <div className="flex flex-col gap-1.5">
          <div className="h-2.5 w-24 rounded-full bg-foreground/20" />
          <div className="h-2 w-16 rounded-full bg-foreground/10" />
        </div>
      </div>
      <div className="h-2 w-full rounded-full bg-foreground/10" />
      <div className="h-2 w-5/6 rounded-full bg-foreground/10" />
      <div className="mt-1 h-8 w-24 rounded-lg bg-primary/90" />
    </div>
  )
}

export function AnimationTool() {
  const [s, set] = usePersistent<State>("lf-tool-animation", DEFAULTS)
  const [selId, setSelId] = useState<string>(() => s.stops[0]?.id ?? "")
  const [playing, setPlaying] = useState(true)
  const [scrub, setScrub] = useState(0)
  const [replay, setReplay] = useState(0)

  const sel = s.stops.find((x) => x.id === selId) ?? s.stops[0]
  const preview = useMemo(() => build(s, "lf-preview"), [s])
  const sp = useMemo(() => (s.timing === "spring" ? spring(s.stiffness, s.damping, s.mass) : null), [s.timing, s.stiffness, s.damping, s.mass])
  const trackTiming = preview.timing

  const setStop = (id: string, patch: Partial<Stop>) => {
    const next = s.stops.map((x) => (x.id === id ? { ...x, ...patch } : x)).sort((a, b) => a.at - b.at)
    set({ stops: next })
  }

  const addStop = () => {
    const sorted = [...s.stops].sort((a, b) => a.at - b.at)
    const i = sorted.findIndex((x) => x.id === sel.id)
    const other = sorted[i + 1] ?? sorted[i - 1]
    if (!other) return
    const a = sorted[i]
    const mid = Math.round((a.at + other.at) / 2)
    const lerp = (k: keyof StopValues) => (a[k] + other[k]) / 2
    const created: Stop = { id: uid(), at: mid, x: lerp("x"), y: lerp("y"), scale: lerp("scale"), rotate: lerp("rotate"), skew: lerp("skew"), ry: lerp("ry"), opacity: lerp("opacity"), blur: lerp("blur") }
    set({ stops: [...s.stops, created].sort((p, q) => p.at - q.at) })
    setSelId(created.id)
  }

  const removeStop = () => {
    if (s.stops.length <= 2) return
    const rest = s.stops.filter((x) => x.id !== sel.id)
    set({ stops: rest })
    setSelId(rest[0].id)
  }

  const applyPreset = (p: Preset) => {
    const patch = fromPreset(p, s)
    set(patch)
    setSelId((patch.stops as Stop[])[0].id)
    setReplay((r) => r + 1)
  }

  const css = exportCss(s)
  const outputs = [
    { id: "css", label: "CSS", lang: "css", file: "animation.css", code: css },
    { id: "tw", label: "Tailwind v4", lang: "css", file: "theme.css", code: exportTailwind(s) },
    { id: "js", label: "WAAPI (JS)", lang: "js", file: "animation.js", code: exportJs(s) },
    ...(s.trigger === "view" ? [{ id: "io", label: "Observer", lang: "js", file: "reveal.js", code: exportView() }] : []),
    {
      id: "html",
      label: "HTML",
      lang: "html",
      file: "index.html",
      code: `<div class="${s.trigger === "load" ? "animated" : "reveal"}">\n  Content\n</div>\n`,
    },
  ]

  const scrubbing = !playing
  const dur = preview.duration
  const targetStyle: React.CSSProperties = scrubbing
    ? {
        animationName: "lf-preview",
        animationDuration: `${dur}s`,
        animationTimingFunction: preview.timing,
        animationPlayState: "paused",
        animationDelay: `${-(scrub / 100) * dur}s`,
        animationIterationCount: 1,
        animationFillMode: "both",
        transformOrigin: s.origin,
      }
    : { animation: preview.shorthand, transformOrigin: s.origin }

  const controls = (
    <>
      {GROUPS.map((g) => (
        <Section key={g} title={g}>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.filter((p) => p.group === g).map((p) => (
              <button
                key={p.id}
                onClick={() => applyPreset(p)}
                className={cn("rounded-md border px-2 py-1 text-xs transition-colors hover:bg-muted", s.preset === p.id && "border-primary bg-primary/10 text-primary")}
              >
                {p.name}
              </button>
            ))}
          </div>
        </Section>
      ))}
      <Section title="Frames (keyframes)">
        <div className="relative h-9 rounded-lg border bg-muted/40 px-3">
          <div className="absolute inset-x-3 top-1/2 h-px bg-border" />
          {s.stops.map((st) => (
            <button
              key={st.id}
              onClick={() => setSelId(st.id)}
              style={{ left: `calc(12px + (100% - 24px) * ${st.at / 100})` }}
              className={cn(
                "absolute top-1/2 flex size-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 bg-background text-[9px] font-mono transition",
                st.id === sel?.id ? "border-primary text-primary" : "text-muted-foreground",
              )}
              title={`${st.at}%`}
            >
              {Math.round(st.at)}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs text-muted-foreground">frame {sel?.at}%</span>
          <div className="flex">
            <IconButton label="Add frame next to it" onClick={addStop}>
              <CopyPlusIcon />
            </IconButton>
            <IconButton label="Delete frame" disabled={s.stops.length <= 2} onClick={removeStop}>
              <Trash2Icon />
            </IconButton>
          </div>
        </div>
        {sel && (
          <div className="flex flex-col gap-3 rounded-lg border p-3">
            <SliderField label="Frame position" value={sel.at} min={0} max={100} unit="%" onChange={(at) => setStop(sel.id, { at })} />
            {FIELDS.map((f) => (
              <SliderField
                key={f.key}
                label={f.key === "x" || f.key === "y" ? `${f.label} (${s.unit})` : f.label}
                value={sel[f.key]}
                min={f.min}
                max={f.max}
                step={f.step}
                unit={f.unit ?? ""}
                format={(v) => `${Number(v.toFixed(2))}${f.key === "x" || f.key === "y" ? s.unit : (f.unit ?? "")}`}
                onChange={(v) => setStop(sel.id, { [f.key]: v } as Partial<Stop>)}
              />
            ))}
          </div>
        )}
        <ToggleGroup variant="outline" size="sm" spacing={0} className="w-full" value={[s.unit]} onValueChange={(v) => v[0] && set({ unit: v[0] as State["unit"] })}>
          <ToggleGroupItem value="px" className="flex-1 font-mono text-xs">
            offset in px
          </ToggleGroupItem>
          <ToggleGroupItem value="%" className="flex-1 font-mono text-xs">
            offset in %
          </ToggleGroupItem>
        </ToggleGroup>
      </Section>
      <Section title="Time and curve">
        <ToggleGroup variant="outline" size="sm" spacing={0} className="w-full" value={[s.timing]} onValueChange={(v) => v[0] && set({ timing: v[0] as Timing })}>
          <ToggleGroupItem value="bezier" className="flex-1 text-xs">
            Curve
          </ToggleGroupItem>
          <ToggleGroupItem value="spring" className="flex-1 text-xs">
            Spring
          </ToggleGroupItem>
          <ToggleGroupItem value="steps" className="flex-1 text-xs">
            Steps
          </ToggleGroupItem>
        </ToggleGroup>
        {s.timing === "bezier" && (
          <>
            <BezierEditor value={s.bezier} onChange={(bezier) => set({ bezier })} />
            <div className="grid grid-cols-4 gap-1.5">
              {s.bezier.map((v, i) => (
                <NumberInput key={i} value={v} step={0.01} min={i % 2 === 0 ? 0 : -0.6} max={i % 2 === 0 ? 1 : 1.6} onChange={(n) => set({ bezier: s.bezier.map((x, j) => (j === i ? n : x)) as Bezier })} />
              ))}
            </div>
            <div className="flex flex-wrap gap-1">
              {EASINGS.map((e) => (
                <button
                  key={e.id}
                  onClick={() => set({ bezier: e.value })}
                  className={cn("rounded-md border px-1.5 py-0.5 font-mono text-[10px] hover:bg-muted", e.value.every((v, i) => v === s.bezier[i]) && "border-primary bg-primary/10 text-primary")}
                >
                  {e.name}
                </button>
              ))}
            </div>
          </>
        )}
        {s.timing === "spring" && sp && (
          <>
            <SpringPlot values={sp.values} />
            <SliderField label="Stiffness" value={s.stiffness} min={20} max={600} unit="" onChange={(stiffness) => set({ stiffness })} />
            <SliderField label="Falloff" value={s.damping} min={2} max={60} step={0.5} unit="" onChange={(damping) => set({ damping })} />
            <SliderField label="Mass" value={s.mass} min={0.2} max={5} step={0.1} format={(v) => v.toFixed(1)} onChange={(mass) => set({ mass })} />
            <p className="font-mono text-[11px] text-muted-foreground">duration picked automatically: {sp.settle}s · linear() with {sp.values.length} dots</p>
          </>
        )}
        {s.timing === "steps" && <SliderField label="Steps" value={s.steps} min={1} max={30} unit="" onChange={(steps) => set({ steps })} />}
        <div className="relative h-8 overflow-hidden rounded-lg border bg-muted/30">
          <style>{`@keyframes lf-track { from { left: 6px } to { left: calc(100% - 22px) } }`}</style>
          <div
            key={`${trackTiming}-${dur}`}
            className="absolute top-1/2 size-4 -translate-y-1/2 rounded-full bg-primary"
            style={{ animation: `lf-track ${Math.max(0.3, dur)}s ${trackTiming} infinite alternate` }}
          />
        </div>
        {s.timing !== "spring" && <SliderField label="Duration" value={s.duration} min={0.1} max={6} step={0.05} unit="s" onChange={(duration) => set({ duration })} />}
        <SliderField label="Delay" value={s.delay} min={0} max={3} step={0.05} unit="s" onChange={(delay) => set({ delay })} />
      </Section>
      <Section title="Repeat and fill">
        <SliderField label="Repeats (0 = ∞)" value={s.iterations} min={0} max={10} unit="" onChange={(iterations) => set({ iterations })} />
        <div className="grid grid-cols-2 gap-2">
          <SelectField label="direction" value={s.direction} options={["normal", "alternate", "reverse", "alternate-reverse"]} onChange={(direction) => set({ direction: direction as State["direction"] })} />
          <SelectField label="fill-mode" value={s.fill} options={["none", "forwards", "backwards", "both"]} onChange={(fill) => set({ fill: fill as State["fill"] })} />
        </div>
        <SelectField label="transform-origin" value={s.origin} options={["center", "top center", "bottom center", "left center", "right center", "top left", "bottom right"]} onChange={(origin) => set({ origin })} />
      </Section>
      <Section title="Run and export">
        <ToggleGroup variant="outline" size="sm" spacing={0} className="w-full" value={[s.trigger]} onValueChange={(v) => v[0] && set({ trigger: v[0] as Trigger })}>
          <ToggleGroupItem value="load" className="flex-1 text-xs">
            Instantly
          </ToggleGroupItem>
          <ToggleGroupItem value="view" className="flex-1 text-xs">
            On appear
          </ToggleGroupItem>
          <ToggleGroupItem value="scroll" className="flex-1 text-xs">
            On scroll
          </ToggleGroupItem>
        </ToggleGroup>
        <Field label="Animation name">
          <Input value={s.name} onChange={(e) => set({ name: e.target.value })} className="h-8 font-mono text-xs" />
        </Field>
        <div className="flex items-center justify-between">
          <Label htmlFor="an-red" className="text-xs">
            Disable on prefers-reduced-motion
          </Label>
          <Switch id="an-red" size="sm" checked={s.reduced} onCheckedChange={(reduced) => set({ reduced })} />
        </div>
      </Section>
    </>
  )

  return (
    <ToolLayout controls={controls} outputs={outputs}>
      <style>{preview.keyframes}</style>
      <div className="flex h-full min-h-[460px] flex-col">
        <div className="relative flex flex-1 items-center justify-center overflow-hidden p-8">
          <div key={`${replay}-${preview.shorthand}-${preview.keyframes.length}-${s.target}-${s.origin}-${scrubbing ? "s" : "p"}`} style={targetStyle}>
            <PreviewTarget target={s.target} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t bg-background/90 px-4 py-3 backdrop-blur">
          <IconButton
            label={playing ? "Pause and timeline" : "Play"}
            variant="outline"
            onClick={() => {
              setPlaying((p) => !p)
              setReplay((r) => r + 1)
            }}
          >
            {playing ? <PauseIcon /> : <PlayIcon />}
          </IconButton>
          <IconButton label="Repeat" variant="outline" onClick={() => setReplay((r) => r + 1)}>
            <RotateCcwIcon />
          </IconButton>
          <div className="flex min-w-48 flex-1 items-center gap-3">
            <Slider value={[scrubbing ? scrub : 0]} min={0} max={100} step={0.5} disabled={playing} onValueChange={(v) => setScrub(Array.isArray(v) ? (v[0] as number) : (v as number))} />
            <span className="w-12 text-right font-mono text-xs text-muted-foreground">{scrubbing ? `${Math.round(scrub)}%` : "▶"}</span>
          </div>
          <ToggleGroup variant="outline" size="sm" spacing={0} value={[s.target]} onValueChange={(v) => v[0] && set({ target: v[0] as Target })}>
            {(
              [
                ["card", "Card"],
                ["box", "Block"],
                ["button", "Button"],
                ["title", "Heading"],
              ] as [Target, string][]
            ).map(([v, l]) => (
              <ToggleGroupItem key={v} value={v} className="text-xs">
                {l}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </div>
    </ToolLayout>
  )
}
