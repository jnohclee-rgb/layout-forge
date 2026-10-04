import { hexWithAlpha } from "@/lib/color"
import { rng } from "@/lib/random"

export interface MeshPoint {
  id: string
  x: number
  y: number
  color: string
  size: number
}

export interface MeshState {
  base: string
  points: MeshPoint[]
  softness: number
  animate: boolean
  duration: number
  amplitude: number
  grain: boolean
  grainOpacity: number
  seed: number
}

export const MESH_PRESETS: { id: string; name: string; base: string; colors: string[] }[] = [
  { id: "aurora", name: "Aurora", base: "#0b1026", colors: ["#22d3ee", "#a78bfa", "#34d399", "#6366f1"] },
  { id: "sunset", name: "Sunset", base: "#fde68a", colors: ["#fb7185", "#f97316", "#facc15", "#c084fc"] },
  { id: "ocean", name: "Ocean", base: "#0c4a6e", colors: ["#38bdf8", "#2dd4bf", "#1d4ed8", "#a5f3fc"] },
  { id: "candy", name: "Candy", base: "#fdf2f8", colors: ["#f9a8d4", "#a5b4fc", "#fcd34d", "#86efac"] },
  { id: "forest", name: "Forest", base: "#052e16", colors: ["#4ade80", "#a3e635", "#14b8a6", "#166534"] },
  { id: "noir", name: "Noir", base: "#09090b", colors: ["#3f3f46", "#7c3aed", "#18181b", "#52525b"] },
  { id: "peach", name: "Peach", base: "#fff7ed", colors: ["#fdba74", "#fda4af", "#fef08a", "#fed7aa"] },
  { id: "cyber", name: "Cyber", base: "#020617", colors: ["#f0abfc", "#22d3ee", "#e11d48", "#4f46e5"] },
]

export function presetPoints(colors: string[], seed: number): MeshPoint[] {
  const rand = rng(seed)
  return colors.map((color, i) => ({
    id: `${seed}-${i}`,
    x: Math.round(10 + rand() * 80),
    y: Math.round(10 + rand() * 80),
    color,
    size: Math.round(45 + rand() * 30),
  }))
}

export const GRAIN_URI =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"

function frames(p: MeshPoint, i: number, s: MeshState) {
  const rand = rng(s.seed * 31 + i * 7)
  const phase = rand() * Math.PI * 2
  const out: [number, number][] = []
  for (let k = 0; k < 3; k++) {
    const a = phase + (k * Math.PI * 2) / 3
    const r = s.amplitude * (0.6 + rand() * 0.4)
    out.push([Math.round(Math.min(100, Math.max(0, p.x + Math.cos(a) * r))), Math.round(Math.min(100, Math.max(0, p.y + Math.sin(a) * r)))])
  }
  return out
}

export function meshGradients(s: MeshState, vars: boolean) {
  return s.points
    .map((p, i) => {
      const pos = vars ? `var(--mesh-x${i + 1}) var(--mesh-y${i + 1})` : `${p.x}% ${p.y}%`
      return `radial-gradient(${p.size}% ${p.size}% at ${pos}, ${p.color} 0%, ${hexWithAlpha(p.color, 0)} ${s.softness}%)`
    })
    .join(",\n    ")
}

export function meshCss(s: MeshState, selector = ".mesh") {
  const anim = s.animate
  const props = anim
    ? s.points
        .map(
          (p, i) =>
            `@property --mesh-x${i + 1} {\n  syntax: "<percentage>";\n  inherits: false;\n  initial-value: ${p.x}%;\n}\n\n@property --mesh-y${i + 1} {\n  syntax: "<percentage>";\n  inherits: false;\n  initial-value: ${p.y}%;\n}\n\n`,
        )
        .join("")
    : ""
  const name = `mesh-move-${selector.replace(/[^\w-]/g, "")}`
  const keyframes = anim
    ? (() => {
        const fr = s.points.map((p, i) => frames(p, i, s))
        const stop = (k: number) =>
          s.points.map((p, i) => (k === 0 ? `--mesh-x${i + 1}: ${p.x}%; --mesh-y${i + 1}: ${p.y}%;` : `--mesh-x${i + 1}: ${fr[i][k - 1][0]}%; --mesh-y${i + 1}: ${fr[i][k - 1][1]}%;`)).join(" ")
        return `\n\n@keyframes ${name} {\n  0%,\n  100% {\n    ${stop(0)}\n  }\n  25% {\n    ${stop(1)}\n  }\n  50% {\n    ${stop(2)}\n  }\n  75% {\n    ${stop(3)}\n  }\n}\n`
      })()
    : "\n"
  const grain = s.grain
    ? `\n\n${selector}::after {\n  content: "";\n  position: absolute;\n  inset: 0;\n  background-image: url("${GRAIN_URI}");\n  opacity: ${s.grainOpacity};\n  mix-blend-mode: overlay;\n  pointer-events: none;\n}`
    : ""
  return `${props}${selector} {\n  position: relative;\n  isolation: isolate;\n  background-color: ${s.base};\n  background-image:\n    ${meshGradients(s, anim)};${
    anim ? `\n  animation: ${name} ${s.duration}s ease-in-out infinite;` : ""
  }\n}${grain}${keyframes}`
}

export function renderMeshPng(s: MeshState, w = 1920, h = 1080): string {
  const c = document.createElement("canvas")
  c.width = w
  c.height = h
  const ctx = c.getContext("2d")
  if (!ctx) return ""
  ctx.fillStyle = s.base
  ctx.fillRect(0, 0, w, h)
  for (const p of s.points) {
    const rx = (p.size / 100) * w
    const ry = (p.size / 100) * h
    ctx.save()
    ctx.translate((p.x / 100) * w, (p.y / 100) * h)
    ctx.scale(1, ry / rx)
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx * (s.softness / 100))
    g.addColorStop(0, p.color)
    g.addColorStop(1, hexWithAlpha(p.color, 0))
    ctx.fillStyle = g
    ctx.fillRect(-rx * 2, -rx * 2, rx * 4, rx * 4)
    ctx.restore()
  }
  return c.toDataURL("image/png")
}

export const DEFAULT_MESH: MeshState = {
  base: MESH_PRESETS[0].base,
  points: presetPoints(MESH_PRESETS[0].colors, 7),
  softness: 100,
  animate: true,
  duration: 14,
  amplitude: 18,
  grain: true,
  grainOpacity: 0.25,
  seed: 7,
}
