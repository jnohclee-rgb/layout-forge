export type Rgb = { r: number; g: number; b: number }
export type Oklch = { l: number; c: number; h: number }
export type ColorFormat = "hex" | "oklch" | "hsl" | "rgb"

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const round = (v: number, d: number) => Number(v.toFixed(d))

export function parseHex(input: string): Rgb | null {
  let s = input.trim().replace(/^#/, "")
  if (s.length === 3 || s.length === 4) s = s.slice(0, 3).split("").map((ch) => ch + ch).join("")
  else if (s.length === 8) s = s.slice(0, 6)
  if (!/^[0-9a-fA-F]{6}$/.test(s)) return null
  const n = parseInt(s, 16)
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 }
}

export function normalizeHex(input: string): string | null {
  const rgb = parseHex(input)
  return rgb ? rgbToHex(rgb) : null
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const h = (v: number) => Math.round(clamp01(v) * 255).toString(16).padStart(2, "0")
  return `#${h(r)}${h(g)}${h(b)}`
}

const toLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))
const fromLinear = (v: number) => (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055)

export function rgbToOklch(rgb: Rgb): Oklch {
  const r = toLinear(rgb.r)
  const g = toLinear(rgb.g)
  const b = toLinear(rgb.b)
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  const c = Math.sqrt(A * A + B * B)
  let h = (Math.atan2(B, A) * 180) / Math.PI
  if (h < 0) h += 360
  return { l: L, c, h: c < 1e-4 ? 0 : h }
}

function oklchToLinear({ l, c, h }: Oklch): Rgb {
  const hr = (h * Math.PI) / 180
  const A = c * Math.cos(hr)
  const B = c * Math.sin(hr)
  const l_ = l + 0.3963377774 * A + 0.2158037573 * B
  const m_ = l - 0.1055613458 * A - 0.0638541728 * B
  const s_ = l - 0.0894841775 * A - 1.291485548 * B
  const L = l_ ** 3
  const M = m_ ** 3
  const S = s_ ** 3
  return {
    r: 4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S,
    g: -1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S,
    b: -0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S,
  }
}

export function inGamut(color: Oklch): boolean {
  const { r, g, b } = oklchToLinear(color)
  const e = 1e-5
  return r >= -e && r <= 1 + e && g >= -e && g <= 1 + e && b >= -e && b <= 1 + e
}

export function clampChroma(color: Oklch): Oklch {
  if (inGamut(color)) return color
  let lo = 0
  let hi = color.c
  for (let i = 0; i < 28; i++) {
    const mid = (lo + hi) / 2
    if (inGamut({ ...color, c: mid })) lo = mid
    else hi = mid
  }
  return { ...color, c: lo }
}

export function oklchToRgb(color: Oklch): Rgb {
  const lin = oklchToLinear(clampChroma(color))
  return { r: clamp01(fromLinear(lin.r)), g: clamp01(fromLinear(lin.g)), b: clamp01(fromLinear(lin.b)) }
}

export function hexToOklch(hex: string): Oklch {
  return rgbToOklch(parseHex(hex) ?? { r: 0, g: 0, b: 0 })
}

export function oklchToHex(color: Oklch): string {
  return rgbToHex(oklchToRgb(color))
}

export function rgbToHsl({ r, g, b }: Rgb) {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  let h = 0
  let s = 0
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
  }
  return { h, s: s * 100, l: l * 100 }
}

export function luminance({ r, g, b }: Rgb): number {
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
}

export function contrast(a: Rgb, b: Rgb): number {
  const la = luminance(a)
  const lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

export function formatColor(rgb: Rgb, format: ColorFormat): string {
  if (format === "hex") return rgbToHex(rgb)
  if (format === "rgb") return `rgb(${Math.round(rgb.r * 255)} ${Math.round(rgb.g * 255)} ${Math.round(rgb.b * 255)})`
  if (format === "hsl") {
    const { h, s, l } = rgbToHsl(rgb)
    return `hsl(${round(h, 1)} ${round(s, 1)}% ${round(l, 1)}%)`
  }
  const o = rgbToOklch(rgb)
  return `oklch(${round(o.l, 3)} ${round(o.c, 3)} ${round(o.h, 1)})`
}

export const WHITE: Rgb = { r: 1, g: 1, b: 1 }
export const BLACK: Rgb = { r: 0, g: 0, b: 0 }

export function readableOn(rgb: Rgb): Rgb {
  return contrast(rgb, WHITE) >= contrast(rgb, BLACK) ? WHITE : BLACK
}

export function randomHex(): string {
  return oklchToHex({ l: 0.55 + Math.random() * 0.15, c: 0.12 + Math.random() * 0.1, h: Math.random() * 360 })
}

export function hexToRgbString(hex: string, alpha = 1): string {
  const rgb = parseHex(hex) ?? { r: 0, g: 0, b: 0 }
  const c = `${Math.round(rgb.r * 255)} ${Math.round(rgb.g * 255)} ${Math.round(rgb.b * 255)}`
  return alpha >= 1 ? `rgb(${c})` : `rgb(${c} / ${Number(alpha.toFixed(3))})`
}

export function hexWithAlpha(hex: string, alpha: number): string {
  const base = normalizeHex(hex) ?? "#000000"
  if (alpha >= 1) return base
  return base + Math.round(Math.max(0, alpha) * 255).toString(16).padStart(2, "0")
}

export function mixHex(a: string, b: string, t: number): string {
  const x = hexToOklch(a)
  const y = hexToOklch(b)
  let dh = y.h - x.h
  if (Math.abs(dh) > 180) dh -= Math.sign(dh) * 360
  const h = x.c < 0.02 ? y.h : y.c < 0.02 ? x.h : x.h + dh * t
  return oklchToHex({ l: x.l + (y.l - x.l) * t, c: x.c + (y.c - x.c) * t, h: (h + 360) % 360 })
}
