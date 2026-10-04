import { useMemo, useState } from "react"
import { copyText } from "@/lib/clipboard"
import { usePersistent } from "@/lib/use-persistent"
import { cn } from "@/lib/utils"
import { CommitInput, Field, NumberInput, Section, SliderField } from "@/components/fields"
import { ToolLayout } from "@/components/tools/tool-layout"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

const UNITS = ["px", "rem", "em", "pt", "%", "vw"] as const
type Unit = (typeof UNITS)[number]

const UNIT_HINT: Record<Unit, string> = {
  px: "absolute pixels",
  rem: "from root font-size (html)",
  em: "from parent font-size",
  pt: "typographic point, 1pt = 4/3px",
  "%": "from parent font-size",
  vw: "from viewport width",
}

interface State {
  root: number
  parent: number
  viewport: number
  value: number
  unit: Unit
  list: string
  minSize: number
  maxSize: number
  minVw: number
  maxVw: number
  scaleMinBase: number
  scaleMaxBase: number
  scaleMinRatio: number
  scaleMaxRatio: number
  stepsDown: number
  stepsUp: number
  prefix: string
}

const DEFAULTS: State = {
  root: 16,
  parent: 16,
  viewport: 1440,
  value: 24,
  unit: "px",
  list: "12, 14, 16, 18, 20, 24, 30, 36, 48, 60, 72",
  minSize: 18,
  maxSize: 24,
  minVw: 360,
  maxVw: 1280,
  scaleMinBase: 16,
  scaleMaxBase: 19,
  scaleMinRatio: 1.2,
  scaleMaxRatio: 1.25,
  stepsDown: 2,
  stepsUp: 5,
  prefix: "step",
}

const RATIOS = [
  { v: 1.067, n: "Minor second" },
  { v: 1.125, n: "Major second" },
  { v: 1.2, n: "Minor third" },
  { v: 1.25, n: "Major third" },
  { v: 1.333, n: "Perfect fourth" },
  { v: 1.414, n: "Tritone" },
  { v: 1.5, n: "Perfect fifth" },
  { v: 1.618, n: "Golden ratio" },
]

const fmt = (v: number, d = 4) => {
  if (!Number.isFinite(v)) return "—"
  return String(Number(v.toFixed(d)))
}

function toPx(v: number, unit: Unit, s: State) {
  switch (unit) {
    case "px":
      return v
    case "rem":
      return v * s.root
    case "em":
      return v * s.parent
    case "pt":
      return (v * 4) / 3
    case "%":
      return (v / 100) * s.parent
    case "vw":
      return (v / 100) * s.viewport
  }
}

function fromPx(px: number, unit: Unit, s: State) {
  switch (unit) {
    case "px":
      return px
    case "rem":
      return px / s.root
    case "em":
      return px / s.parent
    case "pt":
      return (px * 3) / 4
    case "%":
      return (px / s.parent) * 100
    case "vw":
      return (px / s.viewport) * 100
  }
}

function fluidClamp(minPx: number, maxPx: number, minVw: number, maxVw: number, root: number) {
  const slope = (maxPx - minPx) / (maxVw - minVw || 1)
  const intercept = minPx - slope * minVw
  const lo = Math.min(minPx, maxPx)
  const hi = Math.max(minPx, maxPx)
  return {
    css: `clamp(${fmt(lo / root)}rem, ${fmt(intercept / root)}rem + ${fmt(slope * 100)}vw, ${fmt(hi / root)}rem)`,
    at: (vw: number) => Math.min(hi, Math.max(lo, intercept + slope * vw)),
  }
}

const SAMPLE = "The quick brown fox jumps over the lazy dog"

export function UnitsTool() {
  const [s, set] = usePersistent<State>("lf-tool-units", DEFAULTS)
  const [simVw, setSimVw] = useState(960)
  const px = toPx(s.value, s.unit, s)

  const list = useMemo(
    () =>
      s.list
        .split(/[\s,;]+/)
        .map(Number)
        .filter((n) => Number.isFinite(n) && n > 0),
    [s.list],
  )

  const fluid = fluidClamp(s.minSize, s.maxSize, s.minVw, s.maxVw, s.root)

  const scale = useMemo(() => {
    const out: { step: number; min: number; max: number; css: string }[] = []
    for (let i = -s.stepsDown; i <= s.stepsUp; i++) {
      const min = s.scaleMinBase * Math.pow(s.scaleMinRatio, i)
      const max = s.scaleMaxBase * Math.pow(s.scaleMaxRatio, i)
      out.push({ step: i, min, max, css: fluidClamp(min, max, s.minVw, s.maxVw, s.root).css })
    }
    return out
  }, [s])

  const prefix = s.prefix.trim() || "step"
  const outputs = [
    {
      id: "scale",
      label: "Fluid scale",
      lang: "css",
      file: "type-scale.css",
      code: `:root {\n${scale.map((x) => `  --${prefix}-${x.step}: ${x.css};`).join("\n")}\n}\n`,
    },
    {
      id: "clamp",
      label: "clamp()",
      lang: "css",
      file: "fluid.css",
      code: `/* ${s.minSize}px @ ${s.minVw}px → ${s.maxSize}px @ ${s.maxVw}px */\n.fluid-text {\n  font-size: ${fluid.css};\n}\n`,
    },
    {
      id: "table",
      label: "px → rem",
      lang: "css",
      file: "font-sizes.css",
      code: `:root {\n${list.map((v) => `  --font-${v}: ${fmt(v / s.root)}rem; /* ${v}px */`).join("\n")}\n}\n`,
    },
    {
      id: "tailwind",
      label: "Tailwind v4",
      lang: "css",
      file: "theme.css",
      code: `@theme {\n${scale.map((x) => `  --text-${prefix}-${x.step}: ${x.css};`).join("\n")}\n}\n`,
    },
  ]

  const controls = (
    <>
      <Section title="Context">
        <div className="grid grid-cols-2 gap-2">
          <Field label="root font-size, px">
            <NumberInput value={s.root} min={1} max={100} onChange={(root) => set({ root })} />
          </Field>
          <Field label="parent font-size, px">
            <NumberInput value={s.parent} min={1} max={200} onChange={(parent) => set({ parent })} />
          </Field>
        </div>
        <SliderField label="Viewport width" value={s.viewport} min={320} max={2560} step={10} onChange={(viewport) => set({ viewport })} />
      </Section>
      <Section title="Fluid clamp()">
        <div className="grid grid-cols-2 gap-2">
          <Field label="min size, px">
            <NumberInput value={s.minSize} min={1} max={400} onChange={(minSize) => set({ minSize })} />
          </Field>
          <Field label="max size, px">
            <NumberInput value={s.maxSize} min={1} max={400} onChange={(maxSize) => set({ maxSize })} />
          </Field>
          <Field label="from width, px">
            <NumberInput value={s.minVw} min={200} max={4000} onChange={(minVw) => set({ minVw })} />
          </Field>
          <Field label="up to width, px">
            <NumberInput value={s.maxVw} min={200} max={4000} onChange={(maxVw) => set({ maxVw })} />
          </Field>
        </div>
      </Section>
      <Section title="Fluid scale">
        <div className="grid grid-cols-2 gap-2">
          <Field label="base at min">
            <NumberInput value={s.scaleMinBase} min={1} max={100} onChange={(scaleMinBase) => set({ scaleMinBase })} />
          </Field>
          <Field label="base at max">
            <NumberInput value={s.scaleMaxBase} min={1} max={100} onChange={(scaleMaxBase) => set({ scaleMaxBase })} />
          </Field>
          <Field label="ratio at min">
            <NumberInput value={s.scaleMinRatio} step={0.001} min={1} max={3} onChange={(scaleMinRatio) => set({ scaleMinRatio })} />
          </Field>
          <Field label="ratio at max">
            <NumberInput value={s.scaleMaxRatio} step={0.001} min={1} max={3} onChange={(scaleMaxRatio) => set({ scaleMaxRatio })} />
          </Field>
        </div>
        <div className="flex flex-wrap gap-1">
          {RATIOS.map((r) => (
            <button
              key={r.v}
              onClick={() => set({ scaleMaxRatio: r.v })}
              title={`${r.n} — for max width`}
              className={cn("rounded-md border px-1.5 py-0.5 font-mono text-[10px] hover:bg-muted", s.scaleMaxRatio === r.v && "border-primary bg-primary/10 text-primary")}
            >
              {r.v}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Field label="steps down">
            <NumberInput value={s.stepsDown} min={0} max={4} onChange={(stepsDown) => set({ stepsDown })} />
          </Field>
          <Field label="steps up">
            <NumberInput value={s.stepsUp} min={0} max={10} onChange={(stepsUp) => set({ stepsUp })} />
          </Field>
          <Field label="prefix">
            <CommitInput value={s.prefix} onCommit={(prefix) => set({ prefix })} />
          </Field>
        </div>
      </Section>
    </>
  )

  return (
    <ToolLayout controls={controls} outputs={outputs}>
      <div className="mx-auto flex max-w-4xl flex-col gap-6 p-4 md:p-8">
        <div className="flex flex-col gap-4 rounded-xl border bg-background p-5 shadow-sm">
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Value" className="w-36">
              <Input
                type="number"
                value={s.value}
                step="any"
                onChange={(e) => e.target.value !== "" && set({ value: Number(e.target.value) })}
                className="h-9 font-mono text-base"
              />
            </Field>
            <ToggleGroup variant="outline" size="sm" spacing={0} value={[s.unit]} onValueChange={(v) => v[0] && set({ unit: v[0] as Unit })}>
              {UNITS.map((u) => (
                <ToggleGroupItem key={u} value={u} className="h-9 px-3 font-mono">
                  {u}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {UNITS.map((u) => {
              const v = `${fmt(fromPx(px, u, s))}${u}`
              return (
                <button
                  key={u}
                  onClick={() => copyText(v, v)}
                  className={cn("flex flex-col items-start gap-0.5 rounded-lg border p-3 text-left transition-colors hover:border-primary/40 hover:bg-muted/50", u === s.unit && "border-primary/50 bg-primary/5")}
                >
                  <span className="font-mono text-lg font-semibold">{v}</span>
                  <span className="text-[11px] text-muted-foreground">{UNIT_HINT[u]}</span>
                </button>
              )
            })}
          </div>
          <p className="truncate border-t pt-4" style={{ fontSize: px }}>
            {SAMPLE}
          </p>
        </div>

        <div className="flex flex-col gap-4 rounded-xl border bg-background p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">Fluid preview</h3>
              <p className="font-mono text-xs break-all text-muted-foreground">{fluid.css}</p>
            </div>
            <span className="shrink-0 rounded-md bg-muted px-2 py-1 font-mono text-xs">{fmt(fluid.at(simVw), 2)}px</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">{simVw}px</span>
            <Slider value={[simVw]} min={320} max={1920} step={10} onValueChange={(v) => setSimVw(Array.isArray(v) ? (v[0] as number) : (v as number))} />
          </div>
          <div className="relative h-24 rounded-lg border border-dashed">
            <svg viewBox="0 0 320 96" preserveAspectRatio="none" className="absolute inset-0 size-full text-primary">
              {(() => {
                const xs = Array.from({ length: 33 }, (_, i) => 320 + (i / 32) * 1600)
                const max = Math.max(s.minSize, s.maxSize) * 1.15
                const pts = xs.map((x) => `${((x - 320) / 1600) * 320},${96 - (fluid.at(x) / max) * 96}`).join(" ")
                const cx = ((simVw - 320) / 1600) * 320
                return (
                  <>
                    <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                    <line x1={cx} x2={cx} y1="0" y2="96" stroke="currentColor" strokeOpacity="0.35" vectorEffect="non-scaling-stroke" />
                  </>
                )
              })()}
            </svg>
          </div>
          <p className="leading-tight" style={{ fontSize: fluid.at(simVw) }}>
            {SAMPLE}
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border bg-background p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Scale at {simVw}px</h3>
            <span className="text-xs text-muted-foreground">click — copy clamp()</span>
          </div>
          {[...scale].reverse().map((x) => {
            const size = fluidClamp(x.min, x.max, s.minVw, s.maxVw, s.root).at(simVw)
            return (
              <button
                key={x.step}
                onClick={() => copyText(x.css, `--${prefix}-${x.step}`)}
                className="grid grid-cols-[64px_120px_1fr] items-baseline gap-3 rounded-md px-2 py-1 text-left hover:bg-muted/60"
              >
                <span className="font-mono text-xs text-muted-foreground">
                  {prefix}-{x.step}
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {fmt(x.min, 1)}→{fmt(x.max, 1)}px
                </span>
                <span className="truncate leading-tight font-semibold" style={{ fontSize: size }}>
                  Typography
                </span>
              </button>
            )
          })}
        </div>

        <div className="flex flex-col gap-3 rounded-xl border bg-background p-5 shadow-sm">
          <h3 className="text-sm font-semibold">Size table</h3>
          <Input value={s.list} onChange={(e) => set({ list: e.target.value })} className="h-8 font-mono text-xs" placeholder="12, 14, 16…" />
          <div className="overflow-x-auto">
            <table className="w-full font-mono text-xs">
              <thead className="text-muted-foreground">
                <tr className="border-b text-left">
                  <th className="py-1.5 font-normal">px</th>
                  <th className="font-normal">rem</th>
                  <th className="font-normal">em</th>
                  <th className="font-normal">pt</th>
                  <th className="font-normal">vw</th>
                </tr>
              </thead>
              <tbody>
                {list.map((v) => (
                  <tr key={v} className="border-b last:border-b-0">
                    <td className="py-1.5">{v}</td>
                    {(["rem", "em", "pt", "vw"] as Unit[]).map((u) => {
                      const val = `${fmt(fromPx(v, u, s))}${u}`
                      return (
                        <td key={u}>
                          <button className="rounded px-1 hover:bg-muted" onClick={() => copyText(val, val)}>
                            {val}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ToolLayout>
  )
}
