import {
  type ColorFormat,
  type Oklch,
  type Rgb,
  BLACK,
  WHITE,
  clampChroma,
  contrast,
  formatColor,
  hexToOklch,
  oklchToHex,
  oklchToRgb,
  parseHex,
} from "@/lib/color"

export const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const
const L_TARGETS = [0.971, 0.936, 0.885, 0.808, 0.704, 0.637, 0.577, 0.505, 0.444, 0.396, 0.258]
const C_FACTORS = [0.1, 0.22, 0.4, 0.65, 0.88, 1, 0.97, 0.88, 0.75, 0.62, 0.45]

export type Step = (typeof STEPS)[number]

export interface Swatch {
  step: Step
  hex: string
  rgb: Rgb
  oklch: Oklch
  isBase: boolean
  onWhite: number
  onBlack: number
}

export interface Scale {
  id: string
  name: string
  swatches: Swatch[]
}

export interface ScaleOptions {
  hueShift: number
  chroma: number
  anchor: boolean
}

export type Harmony = "monochromatic" | "complementary" | "analogous" | "triadic" | "split" | "tetradic"

export const HARMONIES: { value: Harmony; label: string }[] = [
  { value: "monochromatic", label: "Monochromatic" },
  { value: "complementary", label: "Complementary" },
  { value: "analogous", label: "Analogous" },
  { value: "triadic", label: "Triadic" },
  { value: "split", label: "Split complementary" },
  { value: "tetradic", label: "Tetradic" },
]

const HARMONY_OFFSETS: Record<Harmony, { name: string; offset: number; chroma?: number }[]> = {
  monochromatic: [{ name: "secondary", offset: 0, chroma: 0.45 }],
  complementary: [{ name: "secondary", offset: 180 }],
  analogous: [
    { name: "secondary", offset: -30 },
    { name: "accent", offset: 30 },
  ],
  triadic: [
    { name: "secondary", offset: 120 },
    { name: "accent", offset: 240 },
  ],
  split: [
    { name: "secondary", offset: 150 },
    { name: "accent", offset: 210 },
  ],
  tetradic: [
    { name: "secondary", offset: 90 },
    { name: "accent", offset: 180 },
    { name: "tertiary", offset: 270 },
  ],
}

export const SEMANTIC = [
  { name: "success", h: 150 },
  { name: "warning", h: 75 },
  { name: "danger", h: 27 },
  { name: "info", h: 245 },
]

const wrapHue = (h: number) => ((h % 360) + 360) % 360

export function harmonySeeds(baseHex: string, harmony: Harmony): { name: string; hex: string }[] {
  const base = hexToOklch(baseHex)
  return HARMONY_OFFSETS[harmony].map((o) => ({
    name: o.name,
    hex: oklchToHex(clampChroma({ l: base.l, c: base.c * (o.chroma ?? 1), h: wrapHue(base.h + o.offset) })),
  }))
}

function nearestIndex(l: number) {
  let best = 0
  for (let i = 1; i < L_TARGETS.length; i++) {
    if (Math.abs(L_TARGETS[i] - l) < Math.abs(L_TARGETS[best] - l)) best = i
  }
  return best
}

export function makeScale(base: Oklch, opts: ScaleOptions, exactHex?: string): Swatch[] {
  const i0 = nearestIndex(base.l)
  const delta = base.l - L_TARGETS[i0]
  const last = L_TARGETS.length - 1
  return STEPS.map((step, i) => {
    const dist = Math.abs(i - i0)
    const side = i < i0 ? i0 : last - i0
    const t = side === 0 ? 1 : 1 - dist / (side + 1)
    const l = opts.anchor ? L_TARGETS[i] + delta * t : L_TARGETS[i]
    const c = Math.min(0.37, base.c * (C_FACTORS[i] / C_FACTORS[i0]) * opts.chroma)
    const h = wrapHue(base.h + (opts.hueShift * (i0 - i)) / last)
    const isBase = opts.anchor && i === i0
    const useExact = isBase && exactHex && opts.chroma === 1
    const ok = clampChroma({ l: Math.min(0.995, Math.max(0.12, l)), c, h })
    const rgb = useExact ? (parseHex(exactHex) as Rgb) : oklchToRgb(ok)
    return {
      step,
      rgb,
      hex: formatColor(rgb, "hex"),
      oklch: useExact ? hexToOklch(exactHex) : ok,
      isBase,
      onWhite: contrast(rgb, WHITE),
      onBlack: contrast(rgb, BLACK),
    }
  })
}

export function makeScaleFromHex(hex: string, opts: ScaleOptions): Swatch[] {
  return makeScale(hexToOklch(hex), opts, hex)
}

export interface PaletteSettings {
  base: string
  harmony: Harmony
  hueShift: number
  chroma: number
  anchor: boolean
  neutralTint: number
  semantic: boolean
  seeds: { id: string; name: string; hex: string }[]
}

export function buildScales(s: PaletteSettings): Scale[] {
  const opts: ScaleOptions = { hueShift: s.hueShift, chroma: s.chroma, anchor: s.anchor }
  const base = hexToOklch(s.base)
  const scales: Scale[] = [{ id: "primary", name: "primary", swatches: makeScaleFromHex(s.base, opts) }]
  for (const seed of s.seeds) {
    if (parseHex(seed.hex)) scales.push({ id: seed.id, name: seed.name, swatches: makeScaleFromHex(seed.hex, opts) })
  }
  scales.push({
    id: "neutral",
    name: "neutral",
    swatches: makeScale({ l: 0.637, c: s.neutralTint, h: base.h }, { ...opts, chroma: 1, hueShift: 0 }),
  })
  if (s.semantic) {
    const c = Math.max(0.14, Math.min(0.2, base.c))
    for (const sem of SEMANTIC) {
      scales.push({ id: sem.name, name: sem.name, swatches: makeScale({ l: 0.637, c, h: sem.h }, { ...opts, hueShift: 0, chroma: 1 }) })
    }
  }
  return scales
}

export function slugToken(name: string) {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "color"
  )
}

export type ExportKind = "css" | "tailwind4" | "tailwind3" | "scss" | "json" | "shadcn"

export const EXPORT_KINDS: { value: ExportKind; label: string; lang: string; file: string }[] = [
  { value: "css", label: "CSS", lang: "css", file: "tokens.css" },
  { value: "tailwind4", label: "Tailwind v4", lang: "css", file: "theme.css" },
  { value: "tailwind3", label: "Tailwind v3", lang: "js", file: "tailwind.config.js" },
  { value: "scss", label: "SCSS", lang: "scss", file: "_tokens.scss" },
  { value: "json", label: "JSON", lang: "json", file: "tokens.json" },
  { value: "shadcn", label: "shadcn/ui", lang: "css", file: "globals.css" },
]

export interface ExportOptions {
  format: ColorFormat
  prefix: string
}

function varName(prefix: string, scale: string, step: number | string) {
  const p = slugToken(prefix)
  return `${prefix.trim() ? `${p}-` : ""}${slugToken(scale)}-${step}`
}

function pick(scales: Scale[], name: string, step: Step) {
  const scale = scales.find((s) => s.id === name) ?? scales[0]
  return scale.swatches.find((w) => w.step === step) as Swatch
}

function bestOn(scales: Scale[], name: string, steps: Step[]) {
  for (const st of steps) {
    const w = pick(scales, name, st)
    if (w.onWhite >= 4.5) return w
  }
  return pick(scales, name, steps[steps.length - 1])
}

export function shadcnTheme(scales: Scale[]) {
  const accentId = scales.find((s) => !["primary", "neutral", ...SEMANTIC.map((x) => x.name)].includes(s.id))?.id ?? "primary"
  const chartIds = scales.filter((s) => s.id !== "neutral").map((s) => s.id)
  const chart = (i: number, step: Step) => pick(scales, chartIds[i % chartIds.length], step)
  const danger = scales.some((s) => s.id === "danger") ? "danger" : "primary"
  const primary = bestOn(scales, "primary", [500, 600, 700, 800])
  const light: Record<string, Swatch | "white"> = {
    background: "white",
    foreground: pick(scales, "neutral", 950),
    card: "white",
    "card-foreground": pick(scales, "neutral", 950),
    popover: "white",
    "popover-foreground": pick(scales, "neutral", 950),
    primary,
    "primary-foreground": pick(scales, "primary", 50),
    secondary: pick(scales, "neutral", 100),
    "secondary-foreground": pick(scales, "neutral", 900),
    muted: pick(scales, "neutral", 100),
    "muted-foreground": pick(scales, "neutral", 500),
    accent: pick(scales, accentId, 100),
    "accent-foreground": pick(scales, accentId, 900),
    destructive: pick(scales, danger, 600),
    border: pick(scales, "neutral", 200),
    input: pick(scales, "neutral", 200),
    ring: pick(scales, "primary", 400),
    "chart-1": chart(0, 500),
    "chart-2": chart(1, 500),
    "chart-3": chart(2, 500),
    "chart-4": chart(3, 500),
    "chart-5": chart(4, 500),
    sidebar: pick(scales, "neutral", 50),
    "sidebar-foreground": pick(scales, "neutral", 950),
    "sidebar-primary": primary,
    "sidebar-primary-foreground": pick(scales, "primary", 50),
    "sidebar-accent": pick(scales, accentId, 100),
    "sidebar-accent-foreground": pick(scales, accentId, 900),
    "sidebar-border": pick(scales, "neutral", 200),
    "sidebar-ring": pick(scales, "primary", 400),
  }
  const dark: Record<string, Swatch | "white"> = {
    background: pick(scales, "neutral", 950),
    foreground: pick(scales, "neutral", 50),
    card: pick(scales, "neutral", 900),
    "card-foreground": pick(scales, "neutral", 50),
    popover: pick(scales, "neutral", 900),
    "popover-foreground": pick(scales, "neutral", 50),
    primary: pick(scales, "primary", 400),
    "primary-foreground": pick(scales, "primary", 950),
    secondary: pick(scales, "neutral", 800),
    "secondary-foreground": pick(scales, "neutral", 50),
    muted: pick(scales, "neutral", 800),
    "muted-foreground": pick(scales, "neutral", 400),
    accent: pick(scales, accentId, 900),
    "accent-foreground": pick(scales, accentId, 100),
    destructive: pick(scales, danger, 400),
    border: pick(scales, "neutral", 800),
    input: pick(scales, "neutral", 800),
    ring: pick(scales, "primary", 500),
    "chart-1": chart(0, 400),
    "chart-2": chart(1, 400),
    "chart-3": chart(2, 400),
    "chart-4": chart(3, 400),
    "chart-5": chart(4, 400),
    sidebar: pick(scales, "neutral", 900),
    "sidebar-foreground": pick(scales, "neutral", 50),
    "sidebar-primary": pick(scales, "primary", 400),
    "sidebar-primary-foreground": pick(scales, "primary", 950),
    "sidebar-accent": pick(scales, accentId, 900),
    "sidebar-accent-foreground": pick(scales, accentId, 100),
    "sidebar-border": pick(scales, "neutral", 800),
    "sidebar-ring": pick(scales, "primary", 500),
  }
  return { light, dark }
}

function swatchValue(w: Swatch | "white", format: ColorFormat) {
  return formatColor(w === "white" ? WHITE : w.rgb, format)
}

export function exportPalette(scales: Scale[], kind: ExportKind, opts: ExportOptions): string {
  const { format, prefix } = opts
  if (kind === "css") {
    const lines = scales.flatMap((s) => [
      `  /* ${s.name} */`,
      ...s.swatches.map((w) => `  --${varName(prefix, s.name, w.step)}: ${formatColor(w.rgb, format)};`),
    ])
    return `:root {\n${lines.join("\n")}\n}\n`
  }
  if (kind === "tailwind4") {
    const lines = scales.map((s) =>
      s.swatches.map((w) => `  --color-${varName(prefix, s.name, w.step)}: ${formatColor(w.rgb, format)};`).join("\n"),
    )
    return `@import "tailwindcss";\n\n@theme {\n${lines.join("\n\n")}\n}\n`
  }
  if (kind === "tailwind3") {
    const p = prefix.trim() ? `${slugToken(prefix)}-` : ""
    const body = scales
      .map((s) => {
        const steps = s.swatches.map((w) => `          ${w.step}: "${formatColor(w.rgb, format)}",`).join("\n")
        return `        "${p}${slugToken(s.name)}": {\n${steps}\n          DEFAULT: "${formatColor(s.swatches[5].rgb, format)}",\n        },`
      })
      .join("\n")
    return `/** @type {import('tailwindcss').Config} */\nmodule.exports = {\n  theme: {\n    extend: {\n      colors: {\n${body}\n      },\n    },\n  },\n}\n`
  }
  if (kind === "scss") {
    const vars = scales
      .map((s) => s.swatches.map((w) => `$${varName(prefix, s.name, w.step)}: ${formatColor(w.rgb, format)};`).join("\n"))
      .join("\n\n")
    const maps = scales
      .map((s) => {
        const entries = s.swatches.map((w) => `  ${w.step}: $${varName(prefix, s.name, w.step)},`).join("\n")
        return `$${varName(prefix, s.name, "scale")}: (\n${entries}\n);`
      })
      .join("\n\n")
    return `${vars}\n\n${maps}\n`
  }
  if (kind === "json") {
    const color: Record<string, Record<string, { $type: string; $value: string }>> = {}
    for (const s of scales) {
      color[slugToken(s.name)] = Object.fromEntries(
        s.swatches.map((w) => [String(w.step), { $type: "color", $value: formatColor(w.rgb, format) }]),
      )
    }
    const root = prefix.trim() ? { [slugToken(prefix)]: { color } } : { color }
    return `${JSON.stringify(root, null, 2)}\n`
  }
  const theme = shadcnTheme(scales)
  const block = (sel: string, map: Record<string, Swatch | "white">, radius: boolean) =>
    `${sel} {\n${radius ? "  --radius: 0.625rem;\n" : ""}${Object.entries(map)
      .map(([k, v]) => `  --${k}: ${swatchValue(v, format)};`)
      .join("\n")}\n}`
  return `${block(":root", theme.light, true)}\n\n${block(".dark", theme.dark, false)}\n`
}

export function themeVars(scales: Scale[], mode: "light" | "dark"): Record<string, string> {
  const theme = shadcnTheme(scales)[mode]
  return Object.fromEntries(Object.entries(theme).map(([k, v]) => [`--pv-${k}`, swatchValue(v, "hex")]))
}
