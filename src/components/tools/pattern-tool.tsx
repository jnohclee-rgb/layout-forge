import { hexWithAlpha } from "@/lib/color"
import { usePersistent } from "@/lib/use-persistent"
import { ColorInput } from "@/components/color-input"
import { Field, Section, SliderField } from "@/components/fields"
import { PresetGrid, ToolLayout } from "@/components/tools/tool-layout"

interface Params {
  fg: string
  bg: string
  size: number
  thickness: number
  opacity: number
}

interface Layer {
  image: string
  size?: string
  position?: string
}

interface Pattern {
  id: string
  name: string
  build: (p: Params & { c: string }) => Layer[]
}

const PATTERNS: Pattern[] = [
  { id: "dots", name: "Points", build: ({ c, size, thickness }) => [{ image: `radial-gradient(${c} ${thickness}px, transparent ${thickness}px)`, size: `${size}px ${size}px` }] },
  {
    id: "polka",
    name: "Polka dots",
    build: ({ c, size, thickness }) => [
      { image: `radial-gradient(${c} ${thickness}px, transparent ${thickness}px)`, size: `${size}px ${size}px`, position: "0 0" },
      { image: `radial-gradient(${c} ${thickness}px, transparent ${thickness}px)`, size: `${size}px ${size}px`, position: `${size / 2}px ${size / 2}px` },
    ],
  },
  {
    id: "grid",
    name: "Grid",
    build: ({ c, size, thickness }) => [
      { image: `linear-gradient(${c} ${thickness}px, transparent ${thickness}px)`, size: `${size}px ${size}px` },
      { image: `linear-gradient(90deg, ${c} ${thickness}px, transparent ${thickness}px)`, size: `${size}px ${size}px` },
    ],
  },
  {
    id: "graph",
    name: "Graph paper",
    build: ({ c, fg, size, thickness, opacity }) => {
      const faint = hexWithAlpha(fg, opacity * 0.45)
      const big = size * 5
      return [
        { image: `linear-gradient(${c} ${thickness + 1}px, transparent ${thickness + 1}px)`, size: `${big}px ${big}px` },
        { image: `linear-gradient(90deg, ${c} ${thickness + 1}px, transparent ${thickness + 1}px)`, size: `${big}px ${big}px` },
        { image: `linear-gradient(${faint} ${thickness}px, transparent ${thickness}px)`, size: `${size}px ${size}px` },
        { image: `linear-gradient(90deg, ${faint} ${thickness}px, transparent ${thickness}px)`, size: `${size}px ${size}px` },
      ]
    },
  },
  { id: "lines-h", name: "Lines", build: ({ c, size, thickness }) => [{ image: `linear-gradient(${c} ${thickness}px, transparent ${thickness}px)`, size: `100% ${size}px` }] },
  { id: "lines-v", name: "Verticals", build: ({ c, size, thickness }) => [{ image: `linear-gradient(90deg, ${c} ${thickness}px, transparent ${thickness}px)`, size: `${size}px 100%` }] },
  {
    id: "diagonal",
    name: "Diagonal",
    build: ({ c, size, thickness }) => [{ image: `repeating-linear-gradient(45deg, ${c} 0 ${thickness}px, transparent ${thickness}px ${size}px)` }],
  },
  {
    id: "hatch",
    name: "Hatching",
    build: ({ c, size, thickness }) => [
      { image: `repeating-linear-gradient(45deg, ${c} 0 ${thickness}px, transparent ${thickness}px ${size}px)` },
      { image: `repeating-linear-gradient(-45deg, ${c} 0 ${thickness}px, transparent ${thickness}px ${size}px)` },
    ],
  },
  {
    id: "checker",
    name: "Checkerboard",
    build: ({ c, size }) => [{ image: `repeating-conic-gradient(${c} 0 25%, transparent 0 50%)`, size: `${size}px ${size}px` }],
  },
  {
    id: "zigzag",
    name: "Zigzag",
    build: ({ c, size }) => {
      const h = size / 2
      return [
        { image: `linear-gradient(135deg, ${c} 25%, transparent 25%)`, size: `${size}px ${size}px`, position: `-${h}px 0` },
        { image: `linear-gradient(225deg, ${c} 25%, transparent 25%)`, size: `${size}px ${size}px`, position: `-${h}px 0` },
        { image: `linear-gradient(315deg, ${c} 25%, transparent 25%)`, size: `${size}px ${size}px`, position: "0 0" },
        { image: `linear-gradient(45deg, ${c} 25%, transparent 25%)`, size: `${size}px ${size}px`, position: "0 0" },
      ]
    },
  },
  {
    id: "diamonds",
    name: "Rhombuses",
    build: ({ c, size }) => {
      const h = size / 2
      return [
        { image: `linear-gradient(135deg, ${c} 25%, transparent 25%)`, size: `${size}px ${size}px`, position: `${h}px 0` },
        { image: `linear-gradient(225deg, ${c} 25%, transparent 25%)`, size: `${size}px ${size}px`, position: `${h}px 0` },
        { image: `linear-gradient(45deg, ${c} 25%, transparent 25%)`, size: `${size}px ${size}px`, position: "0 0" },
        { image: `linear-gradient(315deg, ${c} 25%, transparent 25%)`, size: `${size}px ${size}px`, position: "0 0" },
      ]
    },
  },
  {
    id: "triangles",
    name: "Triangles",
    build: ({ c, size }) => [{ image: `linear-gradient(45deg, ${c} 50%, transparent 50%)`, size: `${size}px ${size}px` }],
  },
  {
    id: "waves",
    name: "Waves",
    build: ({ c, size, thickness }) => {
      const r = size / 2
      return [
        { image: `radial-gradient(circle at 50% 0, transparent ${r - thickness}px, ${c} ${r - thickness}px ${r}px, transparent ${r}px)`, size: `${size}px ${r}px`, position: "0 0" },
        { image: `radial-gradient(circle at 50% 100%, transparent ${r - thickness}px, ${c} ${r - thickness}px ${r}px, transparent ${r}px)`, size: `${size}px ${r}px`, position: `${r}px 0` },
      ]
    },
  },
]

interface State extends Params {
  pattern: string
}

const DEFAULTS: State = { pattern: "dots", fg: "#6d4aff", bg: "#ffffff", size: 24, thickness: 2, opacity: 0.35 }

function layersFor(pattern: Pattern, p: Params): Layer[] {
  const c = hexWithAlpha(p.fg, p.opacity)
  return pattern.build({ ...p, c })
}

function styleFor(pattern: Pattern, p: Params): React.CSSProperties {
  const layers = layersFor(pattern, p)
  return {
    backgroundColor: p.bg,
    backgroundImage: layers.map((l) => l.image).join(", "),
    backgroundSize: layers.some((l) => l.size) ? layers.map((l) => l.size ?? "auto").join(", ") : undefined,
    backgroundPosition: layers.some((l) => l.position) ? layers.map((l) => l.position ?? "0 0").join(", ") : undefined,
  }
}

export function PatternTool() {
  const [s, set] = usePersistent<State>("lf-tool-pattern", DEFAULTS)
  const pattern = PATTERNS.find((p) => p.id === s.pattern) ?? PATTERNS[0]
  const style = styleFor(pattern, s)
  const decls: [string, string][] = Object.entries(style).filter(([, v]) => v !== undefined).map(([k, v]) => [k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`), String(v)])

  const css = `.pattern {\n${decls.map(([p, v]) => `  ${p}: ${p === "background-image" ? v.replace(/\), (?=(repeating-|radial-|linear-|conic-))/g, "),\n    ") : v};`).join("\n")}\n}\n`
  const tw = decls.map(([p, v]) => `[${p}:${v.replace(/,\s*/g, ",").replace(/\s+/g, "_")}]`).join(" ")

  const outputs = [
    { id: "css", label: "CSS", lang: "css", file: "pattern.css", code: css },
    { id: "tw", label: "Tailwind", lang: "jsx", file: "Pattern.jsx", code: `<div className="${tw}" />\n` },
    {
      id: "var",
      label: "Variables",
      lang: "css",
      file: "pattern-vars.css",
      code: `.pattern {\n  --pattern-color: ${hexWithAlpha(s.fg, s.opacity)};\n  --pattern-bg: ${s.bg};\n  --pattern-size: ${s.size}px;\n${decls
        .map(([p, v]) => {
          const c = hexWithAlpha(s.fg, s.opacity)
          return `  ${p}: ${v.split(c).join("var(--pattern-color)").replace(s.bg, "var(--pattern-bg)")};`
        })
        .join("\n")}\n}\n`,
    },
  ]

  const controls = (
    <>
      <Section title="Pattern">
        <PresetGrid
          items={PATTERNS}
          cols={4}
          active={s.pattern}
          onPick={(p) => set({ pattern: p.id })}
          render={(p) => <div className="size-full rounded-md ring-1 ring-foreground/10" style={styleFor(p, { ...s, size: Math.max(10, s.size / 2), thickness: Math.max(1, s.thickness / 1.5) })} />}
        />
      </Section>
      <Section title="Parameters">
        <SliderField label="Cell size" value={s.size} min={6} max={120} onChange={(size) => set({ size })} />
        <SliderField label="Thickness" value={s.thickness} min={1} max={Math.max(2, Math.floor(s.size / 2))} onChange={(thickness) => set({ thickness })} />
        <SliderField label="Opacity" value={s.opacity} min={0.03} max={1} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(opacity) => set({ opacity })} />
      </Section>
      <Section title="Colors">
        <Field label="Drawing">
          <ColorInput value={s.fg} compact onChange={(fg) => set({ fg })} />
        </Field>
        <Field label="Background">
          <ColorInput value={s.bg} compact onChange={(bg) => set({ bg })} />
        </Field>
        <button onClick={() => set({ fg: s.bg, bg: s.fg })} className="self-start text-xs text-muted-foreground underline-offset-2 hover:underline">
          Swap
        </button>
      </Section>
    </>
  )

  return (
    <ToolLayout controls={controls} outputs={outputs}>
      <div className="absolute inset-0" style={style} />
      <div className="relative flex h-full min-h-[420px] items-center justify-center p-10">
        <div className="rounded-xl border bg-background/85 px-6 py-4 text-center shadow-lg backdrop-blur">
          <p className="text-sm font-semibold">{pattern.name}</p>
          <p className="font-mono text-xs text-muted-foreground">
            {s.size}px · {s.thickness}px · {Math.round(s.opacity * 100)}%
          </p>
        </div>
      </div>
    </ToolLayout>
  )
}
