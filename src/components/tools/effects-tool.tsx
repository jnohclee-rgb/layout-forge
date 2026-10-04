import { useEffect, useMemo, useRef } from "react"
import { PlusIcon, XIcon } from "lucide-react"
import { hexWithAlpha, mixHex } from "@/lib/color"
import { randomSeed, rng } from "@/lib/random"
import { usePersistent } from "@/lib/use-persistent"
import { cn } from "@/lib/utils"
import { ColorInput } from "@/components/color-input"
import { Field, Section, SliderField } from "@/components/fields"
import { ToolLayout } from "@/components/tools/tool-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

type Mode = "border" | "neon" | "gradtext" | "button" | "glitch" | "card"
type BtnStyle = "shine" | "glow" | "gradient" | "press" | "arrow" | "ripple" | "magnetic"

interface State {
  mode: Mode
  dark: boolean
  bStyle: "conic" | "comet" | "pulse"
  bWidth: number
  bRadius: number
  bSpeed: number
  bGlow: number
  bColors: string[]
  bBg: string
  nText: string
  nColor: string
  nIntensity: number
  nFlicker: boolean
  nSize: number
  nTube: boolean
  nBox: boolean
  gText: string
  gColors: string[]
  gSpeed: number
  gAngle: number
  gSize: number
  gShimmer: boolean
  btnStyle: BtnStyle
  btnText: string
  btnC1: string
  btnC2: string
  btnRadius: number
  btnSize: number
  glText: string
  glC1: string
  glC2: string
  glSpeed: number
  glSize: number
  glHover: boolean
  glSeed: number
  cdStyle: "spotlight" | "tilt" | "both"
  cdColor: string
  cdRadius: number
  cdSize: number
  cdTilt: number
}

const DEFAULTS: State = {
  mode: "border",
  dark: true,
  bStyle: "conic",
  bWidth: 2,
  bRadius: 20,
  bSpeed: 4,
  bGlow: 18,
  bColors: ["#22d3ee", "#a855f7", "#f472b6"],
  bBg: "#0d0d18",
  nText: "OPEN 24/7",
  nColor: "#ff2bd6",
  nIntensity: 1,
  nFlicker: true,
  nSize: 64,
  nTube: false,
  nBox: false,
  gText: "Gradient in motion",
  gColors: ["#22d3ee", "#a855f7", "#f472b6"],
  gSpeed: 5,
  gAngle: 90,
  gSize: 56,
  gShimmer: false,
  btnStyle: "shine",
  btnText: "Start for free",
  btnC1: "#6366f1",
  btnC2: "#ec4899",
  btnRadius: 14,
  btnSize: 17,
  glText: "GLITCH",
  glC1: "#00f0ff",
  glC2: "#ff2a6d",
  glSpeed: 1,
  glSize: 88,
  glHover: false,
  glSeed: 5,
  cdStyle: "both",
  cdColor: "#818cf8",
  cdRadius: 20,
  cdSize: 320,
  cdTilt: 10,
}

interface Output {
  html: string
  css: string
  js?: string
}

const stripe = (css: string) => css.replace(/\n{3,}/g, "\n\n").trim() + "\n"

function borderFx(s: State): Output {
  const [c1, c2, c3] = [s.bColors[0], s.bColors[1] ?? s.bColors[0], s.bColors[2] ?? s.bColors[1] ?? s.bColors[0]]
  const list = s.bColors.length ? s.bColors : ["#fff"]
  const conic = `conic-gradient(from var(--fx-angle), ${[...list, list[0]].join(", ")})`
  const comet = `conic-gradient(from var(--fx-angle), transparent 0 62%, ${c1} 82%, ${c2} 94%, ${c3} 100%)`
  const grad = s.bStyle === "conic" ? conic : s.bStyle === "comet" ? comet : `linear-gradient(135deg, ${list.join(", ")})`
  const animated = s.bStyle !== "pulse"
  const css = stripe(`${animated ? `@property --fx-angle {\n  syntax: "<angle>";\n  inherits: false;\n  initial-value: 0deg;\n}\n\n` : ""}.fx-border {
  position: relative;
  isolation: isolate;
  max-width: 360px;
  padding: 28px 32px;
  border-radius: ${s.bRadius}px;
  background: ${s.bBg};
  color: #e5e7eb;
  font-family: system-ui, sans-serif;
}

.fx-border h3 {
  margin: 0 0 8px;
  font-size: 20px;
  color: #fff;
}

.fx-border p {
  margin: 0;
  font-size: 14px;
  line-height: 1.55;
  opacity: 0.75;
}

.fx-border::before,
.fx-border::after {
  content: "";
  position: absolute;
  border-radius: inherit;
  background: ${grad};${animated ? `\n  animation: fx-spin ${s.bSpeed}s linear infinite;` : ""}
}

.fx-border::before {
  inset: 0;
  z-index: -1;
  padding: ${s.bWidth}px;
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  mask-composite: exclude;
}

.fx-border::after {
  inset: 0;
  z-index: -2;
  filter: blur(${s.bGlow}px);
  opacity: ${s.bStyle === "pulse" ? "0.35" : "0.55"};${s.bStyle === "pulse" ? "\n  animation: fx-pulse 2.4s ease-in-out infinite;" : ""}
}
${animated ? `\n@keyframes fx-spin {\n  to {\n    --fx-angle: 360deg;\n  }\n}\n` : `\n@keyframes fx-pulse {\n  50% {\n    opacity: 0.8;\n  }\n}\n`}`)
  return { html: `<div class="fx-border">\n  <h3>Glowing border</h3>\n  <p>The gradient runs along the block outline.</p>\n</div>`, css }
}

function neonShadow(color: string, k: number) {
  return [`0 0 ${Math.round(2 * k)}px #fff`, `0 0 ${Math.round(6 * k)}px #fff`, `0 0 ${Math.round(12 * k)}px ${color}`, `0 0 ${Math.round(24 * k)}px ${color}`, `0 0 ${Math.round(48 * k)}px ${color}`, `0 0 ${Math.round(80 * k)}px ${color}`].join(", ")
}

function neonFx(s: State): Output {
  const shadow = neonShadow(s.nColor, s.nIntensity)
  const tubeShadow = `0 0 ${Math.round(8 * s.nIntensity)}px ${s.nColor}, 0 0 ${Math.round(24 * s.nIntensity)}px ${s.nColor}, 0 0 ${Math.round(60 * s.nIntensity)}px ${s.nColor}`
  const active = s.nTube ? tubeShadow : shadow
  const text = `.fx-neon {
  margin: 0;
  font: 700 ${s.nSize}px/1.1 system-ui, sans-serif;
  letter-spacing: 0.04em;
  ${s.nTube ? `color: transparent;\n  -webkit-text-stroke: 2px ${s.nColor};` : "color: #fff;"}
  text-shadow: ${active};${s.nFlicker ? "\n  animation: fx-flicker 3.2s infinite;" : ""}
}`
  const box = s.nBox
    ? `\n\n.fx-neon-sign {
  display: inline-block;
  padding: 18px 36px;
  border: 4px solid ${s.nTube ? s.nColor : "#fff"};
  border-radius: 18px;
  box-shadow: 0 0 ${Math.round(8 * s.nIntensity)}px ${s.nColor}, inset 0 0 ${Math.round(8 * s.nIntensity)}px ${s.nColor}, 0 0 ${Math.round(40 * s.nIntensity)}px ${s.nColor};${s.nFlicker ? "\n  animation: fx-flicker-box 3.2s infinite;" : ""}
}`
    : ""
  const flick = s.nFlicker
    ? `\n\n@keyframes fx-flicker {\n  0%, 18%, 22%, 25%, 53%, 57%, 100% {\n    text-shadow: ${active};\n    opacity: 1;\n  }\n  20%, 24%, 55% {\n    text-shadow: none;\n    opacity: 0.7;\n  }\n}${s.nBox ? `\n\n@keyframes fx-flicker-box {\n  0%, 18%, 22%, 25%, 53%, 57%, 100% {\n    opacity: 1;\n  }\n  20%, 24%, 55% {\n    opacity: 0.55;\n  }\n}` : ""}`
    : ""
  const html = s.nBox ? `<div class="fx-neon-sign">\n  <h2 class="fx-neon">${s.nText}</h2>\n</div>` : `<h2 class="fx-neon">${s.nText}</h2>`
  return { html, css: stripe(text + box + flick) }
}

function gradFx(s: State): Output {
  const list = s.gColors.length ? s.gColors : ["#fff"]
  const grad = `linear-gradient(${s.gAngle}deg, ${[...list, list[0]].join(", ")})`
  const shimmer = s.gShimmer ? `linear-gradient(110deg, transparent 40%, rgb(255 255 255 / 0.85) 50%, transparent 60%), ` : ""
  const sizes = s.gShimmer ? "200% 100%, 300% 100%" : "300% 100%"
  const css = `.fx-gradient-text {
  margin: 0;
  font: 800 ${s.gSize}px/1.1 system-ui, sans-serif;
  letter-spacing: -0.02em;
  background: ${shimmer}${grad};
  background-size: ${sizes};
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
  animation: fx-flow ${s.gSpeed}s linear infinite;
}

@keyframes fx-flow {
  to {
    background-position: ${s.gShimmer ? "-200% 0, 300% 0" : "300% 0"};
  }
}
`
  return { html: `<h2 class="fx-gradient-text">${s.gText}</h2>`, css }
}

function buttonFx(s: State): Output {
  const dark = mixHex(s.btnC1, "#000000", 0.35)
  const py = Math.round(s.btnSize * 0.8)
  const px = Math.round(s.btnSize * 1.7)
  const base = `.fx-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: ${py}px ${px}px;
  border: 0;
  border-radius: ${s.btnRadius}px;
  font: 600 ${s.btnSize}px/1 system-ui, sans-serif;
  color: #fff;
  cursor: pointer;
  overflow: hidden;`
  let body = ""
  let html = `<button class="fx-btn">${s.btnText}</button>`
  let js: string | undefined
  switch (s.btnStyle) {
    case "shine":
      body = `${base}\n  background: linear-gradient(135deg, ${s.btnC1}, ${s.btnC2});\n}\n\n.fx-btn::after {\n  content: "";\n  position: absolute;\n  top: 0;\n  left: -80%;\n  width: 50%;\n  height: 100%;\n  background: linear-gradient(120deg, transparent, rgb(255 255 255 / 0.55), transparent);\n  transform: skewX(-20deg);\n  transition: left 0.7s ease;\n}\n\n.fx-btn:hover::after {\n  left: 130%;\n}`
      break
    case "glow":
      body = `${base}\n  background: linear-gradient(135deg, ${s.btnC1}, ${s.btnC2});\n  box-shadow: 0 0 0 0 ${hexWithAlpha(s.btnC1, 0.6)};\n  animation: fx-ring 1.8s infinite;\n  transition: filter 0.2s, transform 0.2s;\n}\n\n.fx-btn:hover {\n  filter: brightness(1.12);\n  transform: translateY(-2px);\n}\n\n@keyframes fx-ring {\n  70% {\n    box-shadow: 0 0 0 18px ${hexWithAlpha(s.btnC1, 0)};\n  }\n  100% {\n    box-shadow: 0 0 0 0 ${hexWithAlpha(s.btnC1, 0)};\n  }\n}`
      break
    case "gradient":
      body = `${base}\n  background: linear-gradient(90deg, ${s.btnC1}, ${s.btnC2}, ${s.btnC1});\n  background-size: 200% 100%;\n  box-shadow: 0 8px 24px ${hexWithAlpha(s.btnC1, 0.35)};\n  transition: background-position 0.6s ease, transform 0.2s, box-shadow 0.2s;\n}\n\n.fx-btn:hover {\n  background-position: 100% 0;\n  transform: translateY(-3px);\n  box-shadow: 0 14px 30px ${hexWithAlpha(s.btnC2, 0.45)};\n}`
      break
    case "press":
      body = `${base}\n  background: ${s.btnC1};\n  box-shadow: 0 6px 0 ${dark}, 0 14px 20px rgb(0 0 0 / 0.25);\n  transition: transform 0.1s, box-shadow 0.1s;\n}\n\n.fx-btn:hover {\n  transform: translateY(-1px);\n}\n\n.fx-btn:active {\n  transform: translateY(5px);\n  box-shadow: 0 1px 0 ${dark}, 0 4px 8px rgb(0 0 0 / 0.25);\n}`
      break
    case "arrow":
      html = `<button class="fx-btn">\n  ${s.btnText}\n  <span class="fx-btn__arrow">→</span>\n</button>`
      body = `${base}\n  background: ${s.btnC1};\n  transition: background 0.25s, padding 0.25s;\n}\n\n.fx-btn__arrow {\n  display: inline-block;\n  transition: transform 0.25s ease;\n}\n\n.fx-btn:hover {\n  background: ${s.btnC2};\n}\n\n.fx-btn:hover .fx-btn__arrow {\n  transform: translateX(6px);\n}`
      break
    case "ripple":
      body = `${base}\n  background: linear-gradient(135deg, ${s.btnC1}, ${s.btnC2});\n}\n\n.fx-ripple {\n  position: absolute;\n  border-radius: 50%;\n  background: rgb(255 255 255 / 0.5);\n  transform: scale(0);\n  animation: fx-ripple 0.65s ease-out forwards;\n  pointer-events: none;\n}\n\n@keyframes fx-ripple {\n  to {\n    transform: scale(4);\n    opacity: 0;\n  }\n}`
      js = `document.querySelectorAll(".fx-btn").forEach((btn) => {\n  btn.addEventListener("click", (e) => {\n    const r = btn.getBoundingClientRect()\n    const size = Math.max(r.width, r.height)\n    const dot = document.createElement("span")\n    dot.className = "fx-ripple"\n    dot.style.width = dot.style.height = size + "px"\n    dot.style.left = e.clientX - r.left - size / 2 + "px"\n    dot.style.top = e.clientY - r.top - size / 2 + "px"\n    btn.appendChild(dot)\n    dot.addEventListener("animationend", () => dot.remove())\n  })\n})\n`
      break
    case "magnetic":
      body = `${base}\n  background: linear-gradient(135deg, ${s.btnC1}, ${s.btnC2});\n  box-shadow: 0 10px 30px ${hexWithAlpha(s.btnC1, 0.4)};\n  transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);\n  will-change: transform;\n}`
      js = `document.querySelectorAll(".fx-btn").forEach((btn) => {\n  const strength = 0.35\n\n  btn.addEventListener("pointermove", (e) => {\n    const r = btn.getBoundingClientRect()\n    const x = e.clientX - (r.left + r.width / 2)\n    const y = e.clientY - (r.top + r.height / 2)\n    btn.style.transform = \`translate(\${x * strength}px, \${y * strength}px)\`\n  })\n\n  btn.addEventListener("pointerleave", () => {\n    btn.style.transform = ""\n  })\n})\n`
      break
  }
  return { html, css: stripe(body), js }
}

function glitchFx(s: State): Output {
  const r = rng(s.glSeed)
  const frames = (n: number) =>
    Array.from({ length: n + 1 }, (_, i) => {
      const top = Math.round(r() * 90)
      const bottom = Math.round(r() * (100 - top) * 0.8)
      return `  ${Math.round((i / n) * 100)}% {\n    clip-path: inset(${top}% 0 ${bottom}% 0);\n    transform: translate(${Math.round((r() - 0.5) * 10)}px, ${Math.round((r() - 0.5) * 4)}px);\n  }`
    }).join("\n")
  const sel = s.glHover ? ".fx-glitch:hover" : ".fx-glitch"
  const css = `.fx-glitch {
  position: relative;
  margin: 0;
  font: 900 ${s.glSize}px/1 system-ui, sans-serif;
  letter-spacing: 0.04em;
  color: #fff;
}

.fx-glitch::before,
.fx-glitch::after {
  content: attr(data-text);
  position: absolute;
  inset: 0;
  overflow: hidden;
  ${s.glHover ? "opacity: 0;\n  " : ""}clip-path: inset(0 0 0 0);
}

.fx-glitch::before {
  left: 3px;
  color: ${s.glC1};
  text-shadow: -2px 0 ${s.glC1};
}

.fx-glitch::after {
  left: -3px;
  color: ${s.glC2};
  text-shadow: 2px 0 ${s.glC2};
}

${sel}::before {
  ${s.glHover ? "opacity: 1;\n  " : ""}animation: fx-glitch-a ${(2.2 / s.glSpeed).toFixed(2)}s infinite linear alternate-reverse;
}

${sel}::after {
  ${s.glHover ? "opacity: 1;\n  " : ""}animation: fx-glitch-b ${(1.7 / s.glSpeed).toFixed(2)}s infinite linear alternate-reverse;
}

@keyframes fx-glitch-a {
${frames(9)}
}

@keyframes fx-glitch-b {
${frames(9)}
}
`
  return { html: `<h1 class="fx-glitch" data-text="${s.glText}">${s.glText}</h1>`, css }
}

function cardFx(s: State): Output {
  const spot = s.cdStyle !== "tilt"
  const tilt = s.cdStyle !== "spotlight"
  const css = `.fx-card {
  position: relative;
  width: ${s.cdSize}px;
  padding: 28px;
  border: 1px solid rgb(255 255 255 / 0.1);
  border-radius: ${s.cdRadius}px;
  background: #11111c;
  color: #e5e7eb;
  font-family: system-ui, sans-serif;
  overflow: hidden;${tilt ? "\n  transform-style: preserve-3d;\n  transition: transform 0.2s ease-out;\n  will-change: transform;" : ""}
}

.fx-card h3 {
  margin: 0 0 8px;
  font-size: 20px;
  color: #fff;
}

.fx-card p {
  margin: 0;
  font-size: 14px;
  line-height: 1.55;
  opacity: 0.75;
}
${
  spot
    ? `
.fx-card::before,
.fx-card::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  opacity: 0;
  transition: opacity 0.3s;
  pointer-events: none;
}

.fx-card::before {
  background: radial-gradient(${Math.round(s.cdSize * 0.9)}px circle at var(--mx, 50%) var(--my, 50%), ${hexWithAlpha(s.cdColor, 0.28)}, transparent 60%);
}

.fx-card::after {
  padding: 1px;
  background: radial-gradient(${Math.round(s.cdSize * 0.7)}px circle at var(--mx, 50%) var(--my, 50%), ${s.cdColor}, transparent 60%);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  mask-composite: exclude;
}

.fx-card:hover::before,
.fx-card:hover::after {
  opacity: 1;
}
`
    : ""
}`
  const js = `document.querySelectorAll(".fx-card").forEach((card) => {
  card.addEventListener("pointermove", (e) => {
    const r = card.getBoundingClientRect()
    const x = e.clientX - r.left
    const y = e.clientY - r.top
${spot ? `    card.style.setProperty("--mx", \`\${x}px\`)\n    card.style.setProperty("--my", \`\${y}px\`)\n` : ""}${tilt ? `    const rx = (0.5 - y / r.height) * ${s.cdTilt}\n    const ry = (x / r.width - 0.5) * ${s.cdTilt}\n    card.style.transform = \`perspective(900px) rotateX(\${rx}deg) rotateY(\${ry}deg) scale(1.02)\`\n` : ""}  })
${tilt ? `\n  card.addEventListener("pointerleave", () => {\n    card.style.transform = ""\n  })\n` : ""}})
`
  return { html: `<div class="fx-card">\n  <h3>Card with effect</h3>\n  <p>Hover: the light follows the mouse${tilt ? ", and the card tilts slightly" : ""}.</p>\n</div>`, css: stripe(css), js }
}

function build(s: State): Output {
  switch (s.mode) {
    case "border":
      return borderFx(s)
    case "neon":
      return neonFx(s)
    case "gradtext":
      return gradFx(s)
    case "button":
      return buttonFx(s)
    case "glitch":
      return glitchFx(s)
    case "card":
      return cardFx(s)
  }
}

const MODES: { id: Mode; label: string }[] = [
  { id: "border", label: "Frame" },
  { id: "neon", label: "Neon" },
  { id: "gradtext", label: "Text" },
  { id: "button", label: "Button" },
  { id: "glitch", label: "Glitch" },
  { id: "card", label: "Card" },
]

export function EffectsTool() {
  const [s, set] = usePersistent<State>("lf-tool-effects", DEFAULTS)
  const out = useMemo(() => build(s), [s])
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    host.innerHTML = out.html
    if (!out.js) return
    try {
      new Function(out.js)()
    } catch {
      return
    }
  }, [out.html, out.js])

  const html = `${out.html}`
  const outputs = [
    { id: "html", label: "HTML", lang: "html", file: "index.html", code: `${html}\n` },
    { id: "css", label: "CSS", lang: "css", file: "effect.css", code: out.css },
    ...(out.js ? [{ id: "js", label: "JS", lang: "js", file: "effect.js", code: out.js }] : []),
  ]

  const col = (label: string, value: string, onChange: (v: string) => void) => (
    <Field label={label}>
      <ColorInput value={value} compact onChange={onChange} />
    </Field>
  )

  const colorList = (key: "bColors" | "gColors", max = 5) => (
    <>
      {s[key].map((c, i) => (
        <div key={i} className="flex items-center gap-1">
          <div className="flex-1">
            <ColorInput value={c} compact onChange={(v) => set({ [key]: s[key].map((x, j) => (j === i ? v : x)) } as Partial<State>)} />
          </div>
          <Button variant="ghost" size="icon-xs" disabled={s[key].length <= 1} onClick={() => set({ [key]: s[key].filter((_, j) => j !== i) } as Partial<State>)} aria-label="Remove">
            <XIcon />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="xs" disabled={s[key].length >= max} onClick={() => set({ [key]: [...s[key], "#ffffff"] } as Partial<State>)}>
        <PlusIcon />
        Add color
      </Button>
    </>
  )

  const switchRow = (id: string, label: string, checked: boolean, onChange: (v: boolean) => void) => (
    <div className="flex items-center justify-between">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Switch id={id} size="sm" checked={checked} onCheckedChange={onChange} />
    </div>
  )

  const controls = (
    <>
      <Section title="Effect">
        <ToggleGroup variant="outline" size="sm" spacing={0} className="grid w-full grid-cols-3" value={[s.mode]} onValueChange={(v) => v[0] && set({ mode: v[0] as Mode })}>
          {MODES.map((m) => (
            <ToggleGroupItem key={m.id} value={m.id} className="text-xs">
              {m.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        {switchRow("fx-dark", "Dark preview scene", s.dark, (dark) => set({ dark }))}
      </Section>

      {s.mode === "border" && (
        <Section title="Animated border">
          <ToggleGroup variant="outline" size="sm" spacing={0} className="w-full" value={[s.bStyle]} onValueChange={(v) => v[0] && set({ bStyle: v[0] as State["bStyle"] })}>
            <ToggleGroupItem value="conic" className="flex-1 text-xs">
              Rotation
            </ToggleGroupItem>
            <ToggleGroupItem value="comet" className="flex-1 text-xs">
              Comet
            </ToggleGroupItem>
            <ToggleGroupItem value="pulse" className="flex-1 text-xs">
              Pulse
            </ToggleGroupItem>
          </ToggleGroup>
          <SliderField label="Thickness" value={s.bWidth} min={1} max={8} onChange={(bWidth) => set({ bWidth })} />
          <SliderField label="Rounding" value={s.bRadius} min={0} max={48} onChange={(bRadius) => set({ bRadius })} />
          {s.bStyle !== "pulse" && <SliderField label="Revolution time" value={s.bSpeed} min={0.8} max={14} step={0.1} unit="s" onChange={(bSpeed) => set({ bSpeed })} />}
          <SliderField label="Glow" value={s.bGlow} min={0} max={60} onChange={(bGlow) => set({ bGlow })} />
          {colorList("bColors")}
          {col("Block background", s.bBg, (bBg) => set({ bBg }))}
        </Section>
      )}

      {s.mode === "neon" && (
        <Section title="Neon text">
          <Field label="Text">
            <Input value={s.nText} onChange={(e) => set({ nText: e.target.value })} className="h-8" />
          </Field>
          {col("Glow color", s.nColor, (nColor) => set({ nColor }))}
          <div className="flex flex-wrap gap-1.5">
            {["#ff2bd6", "#22d3ee", "#a3e635", "#fbbf24", "#f43f5e", "#818cf8"].map((c) => (
              <button key={c} onClick={() => set({ nColor: c })} className="size-6 rounded-full ring-1 ring-foreground/10" style={{ background: c, boxShadow: s.nColor === c ? "0 0 0 2px var(--foreground)" : undefined }} />
            ))}
          </div>
          <SliderField label="Glow brightness" value={s.nIntensity} min={0.3} max={2.2} step={0.05} format={(v) => v.toFixed(2)} onChange={(nIntensity) => set({ nIntensity })} />
          <SliderField label="Size" value={s.nSize} min={24} max={140} onChange={(nSize) => set({ nSize })} />
          {switchRow("nf", "Flicker", s.nFlicker, (nFlicker) => set({ nFlicker }))}
          {switchRow("nt", "Outlined tube", s.nTube, (nTube) => set({ nTube }))}
          {switchRow("nb", "Sign frame", s.nBox, (nBox) => set({ nBox }))}
        </Section>
      )}

      {s.mode === "gradtext" && (
        <Section title="Gradient text">
          <Field label="Text">
            <Input value={s.gText} onChange={(e) => set({ gText: e.target.value })} className="h-8" />
          </Field>
          <SliderField label="Size" value={s.gSize} min={20} max={120} onChange={(gSize) => set({ gSize })} />
          <SliderField label="Cycle time" value={s.gSpeed} min={1} max={20} step={0.5} unit="s" onChange={(gSpeed) => set({ gSpeed })} />
          <SliderField label="Gradient angle" value={s.gAngle} min={0} max={360} unit="°" onChange={(gAngle) => set({ gAngle })} />
          {switchRow("gs", "Shimmer glare", s.gShimmer, (gShimmer) => set({ gShimmer }))}
          {colorList("gColors")}
        </Section>
      )}

      {s.mode === "button" && (
        <Section title="Button">
          <div className="grid grid-cols-2 gap-1.5">
            {(
              [
                ["shine", "Glare"],
                ["glow", "Pulse ring"],
                ["gradient", "Gradient"],
                ["press", "3D press"],
                ["arrow", "Arrow"],
                ["ripple", "Ripple (JS)"],
                ["magnetic", "Magnet (JS)"],
              ] as [BtnStyle, string][]
            ).map(([id, label]) => (
              <Button key={id} size="sm" variant={s.btnStyle === id ? "secondary" : "outline"} className={cn(s.btnStyle === id && "ring-1 ring-primary/40")} onClick={() => set({ btnStyle: id })}>
                {label}
              </Button>
            ))}
          </div>
          <Field label="Text">
            <Input value={s.btnText} onChange={(e) => set({ btnText: e.target.value })} className="h-8" />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            {col("Color 1", s.btnC1, (btnC1) => set({ btnC1 }))}
            {col("Color 2", s.btnC2, (btnC2) => set({ btnC2 }))}
          </div>
          <SliderField label="Rounding" value={s.btnRadius} min={0} max={40} onChange={(btnRadius) => set({ btnRadius })} />
          <SliderField label="Size" value={s.btnSize} min={12} max={30} onChange={(btnSize) => set({ btnSize })} />
        </Section>
      )}

      {s.mode === "glitch" && (
        <Section
          title="Glitch text"
          action={
            <Button variant="ghost" size="xs" onClick={() => set({ glSeed: randomSeed() })}>
              Another glitch
            </Button>
          }
        >
          <Field label="Text">
            <Input value={s.glText} onChange={(e) => set({ glText: e.target.value })} className="h-8" />
          </Field>
          <SliderField label="Size" value={s.glSize} min={28} max={160} onChange={(glSize) => set({ glSize })} />
          <SliderField label="Speed" value={s.glSpeed} min={0.3} max={4} step={0.05} format={(v) => `×${v.toFixed(2)}`} onChange={(glSpeed) => set({ glSpeed })} />
          <div className="grid grid-cols-2 gap-2">
            {col("Channel 1", s.glC1, (glC1) => set({ glC1 }))}
            {col("Channel 2", s.glC2, (glC2) => set({ glC2 }))}
          </div>
          {switchRow("gh", "On hover only", s.glHover, (glHover) => set({ glHover }))}
        </Section>
      )}

      {s.mode === "card" && (
        <Section title="Interactive card">
          <ToggleGroup variant="outline" size="sm" spacing={0} className="w-full" value={[s.cdStyle]} onValueChange={(v) => v[0] && set({ cdStyle: v[0] as State["cdStyle"] })}>
            <ToggleGroupItem value="spotlight" className="flex-1 text-xs">
              Light
            </ToggleGroupItem>
            <ToggleGroupItem value="tilt" className="flex-1 text-xs">
              Tilt
            </ToggleGroupItem>
            <ToggleGroupItem value="both" className="flex-1 text-xs">
              Both
            </ToggleGroupItem>
          </ToggleGroup>
          {s.cdStyle !== "tilt" && col("Light color", s.cdColor, (cdColor) => set({ cdColor }))}
          {s.cdStyle !== "spotlight" && <SliderField label="Tilt angle" value={s.cdTilt} min={2} max={30} unit="°" onChange={(cdTilt) => set({ cdTilt })} />}
          <SliderField label="Width" value={s.cdSize} min={220} max={480} onChange={(cdSize) => set({ cdSize })} />
          <SliderField label="Rounding" value={s.cdRadius} min={0} max={40} onChange={(cdRadius) => set({ cdRadius })} />
        </Section>
      )}
    </>
  )

  return (
    <ToolLayout controls={controls} outputs={outputs}>
      <style>{out.css}</style>
      <div className={cn("absolute inset-0 flex items-center justify-center p-8 transition-colors", s.dark ? "bg-[#07070d]" : "bg-[#f4f4f6]")}>
        <div ref={hostRef} />
      </div>
    </ToolLayout>
  )
}
