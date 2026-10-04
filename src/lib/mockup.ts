import { luminance, parseHex } from "@/lib/color"

export type Kind = "browser" | "laptop" | "phone" | "tablet" | "monitor" | "watch" | "image" | "text" | "shape"

export interface Item {
  id: string
  name: string
  kind: Kind
  x: number
  y: number
  w: number
  rot: number
  rx: number
  ry: number
  opacity: number
  shadow: number
  glare: boolean
  flip: boolean
  locked: boolean
  hidden: boolean
  src: string | null
  frame: string
  dark: boolean
  url: string
  radius: number
  text: string
  fs: number
  weight: number
  color: string
  color2: string
  shape: "rect" | "circle"
  blur: number
}

export const NAT: Record<Kind, [number, number]> = {
  browser: [1100, 731],
  laptop: [1180, 671],
  phone: [300, 650],
  tablet: [780, 585],
  monitor: [900, 662],
  watch: [200, 320],
  image: [800, 500],
  text: [600, 160],
  shape: [400, 400],
}

export const KIND_LABEL: Record<Kind, string> = {
  browser: "Browser",
  laptop: "Laptop",
  phone: "Phone",
  tablet: "Tablet",
  monitor: "Monitor",
  watch: "Watch",
  image: "Image",
  text: "Text",
  shape: "Shape",
}

export const HAS_SCREEN: Kind[] = ["browser", "laptop", "phone", "tablet", "monitor", "watch", "image"]
export const HAS_FRAME: Kind[] = ["laptop", "phone", "tablet", "monitor", "watch"]
export const HAS_TILT: Kind[] = ["browser", "laptop", "phone", "tablet", "monitor", "watch", "image"]

export const FRAMES: { id: string; name: string; color: string }[] = [
  { id: "black", name: "Black", color: "#0b0b0f" },
  { id: "silver", name: "Silver", color: "#d4d4d8" },
  { id: "white", name: "White", color: "#f5f5f4" },
  { id: "gold", name: "Gold", color: "#e9d7b5" },
  { id: "blue", name: "Blue", color: "#1f3a5f" },
  { id: "pink", name: "Pink", color: "#f4c2d0" },
]

const DEFAULT_W: Record<Kind, number> = { browser: 560, laptop: 640, phone: 190, tablet: 420, monitor: 520, watch: 120, image: 420, text: 420, shape: 220 }

export const uid = () => Math.random().toString(36).slice(2, 9)

export function mkItem(kind: Kind, over: Partial<Item> = {}): Item {
  return {
    id: uid(),
    name: KIND_LABEL[kind],
    kind,
    x: 0,
    y: 0,
    w: DEFAULT_W[kind],
    rot: 0,
    rx: 0,
    ry: 0,
    opacity: 1,
    shadow: kind === "text" || kind === "shape" ? 0 : 0.35,
    glare: false,
    flip: false,
    locked: false,
    hidden: false,
    src: null,
    frame: "#0b0b0f",
    dark: false,
    url: "layoutforge.app",
    radius: 18,
    text: "New design",
    fs: 64,
    weight: 800,
    color: "#ffffff",
    color2: "#ec4899",
    shape: "rect",
    blur: 0,
    ...over,
  }
}

export const heightOf = (i: Pick<Item, "kind" | "w">) => (i.w * NAT[i.kind][1]) / NAT[i.kind][0]

export const RATIOS: Record<string, [number, number]> = { "16:10": [1600, 1000], "16:9": [1600, 900], "1:1": [1200, 1200], "4:5": [1080, 1350], "9:16": [1080, 1920] }

export function frameRing(color: string) {
  const rgb = parseHex(color) ?? { r: 0, g: 0, b: 0 }
  return luminance(rgb) > 0.45 ? "rgb(0 0 0 / 0.18)" : "#2a2a33"
}

export interface V {
  t: string
  c?: string
  s?: Record<string, string | number>
  a?: Record<string, string>
  k?: (V | string)[]
}

const v = (t: string, c?: string, s?: V["s"], k?: V["k"], a?: V["a"]): V => ({ t, c, s, k, a })

function scr(i: Item, src: string, style: V["s"]): V {
  return v("div", `mk-scr${i.glare ? " glare" : ""}`, style, [v("img", "mk-img", undefined, undefined, { src, alt: "" })])
}

function frameStyle(i: Item): V["s"] {
  return { "--mk-frame": i.frame, "--mk-ring": frameRing(i.frame) }
}

export function deviceTree(i: Item, src: string): V {
  switch (i.kind) {
    case "browser":
      return v("div", `mk-browser${i.dark ? " mk-dark" : ""}`, undefined, [
        v("div", "mk-browser__bar", undefined, [
          v("span", "mk-browser__dot", { background: "#ff5f57" }),
          v("span", "mk-browser__dot", { background: "#febc2e" }),
          v("span", "mk-browser__dot", { background: "#28c840" }),
          v("div", "mk-browser__url", undefined, [i.url]),
        ]),
        scr(i, src, { height: 687, flex: "none" }),
      ])
    case "phone":
      return v("div", "mk-phone", frameStyle(i), [scr(i, src, { borderRadius: 40, height: "100%" }), v("div", "mk-phone__island")])
    case "tablet":
      return v("div", "mk-tablet", frameStyle(i), [scr(i, src, { borderRadius: 18, height: "100%" })])
    case "laptop":
      return v("div", "mk-laptop", frameStyle(i), [v("div", "mk-laptop__lid", undefined, [scr(i, src, { borderRadius: 6, height: 602 })]), v("div", "mk-laptop__base")])
    case "monitor":
      return v("div", "mk-monitor", frameStyle(i), [
        v("div", "mk-monitor__body", undefined, [scr(i, src, { borderRadius: 6, height: 486 })]),
        v("div", "mk-monitor__neck"),
        v("div", "mk-monitor__foot"),
      ])
    case "watch":
      return v("div", "mk-watch", frameStyle(i), [
        v("div", "mk-watch__strap mk-watch__strap--top"),
        v("div", "mk-watch__body", undefined, [scr(i, src, { borderRadius: 40, height: "100%" })]),
        v("div", "mk-watch__strap mk-watch__strap--bottom"),
        v("div", "mk-watch__crown"),
      ])
    case "image":
      return v("div", "mk-image", undefined, [scr(i, src, { borderRadius: i.radius, height: "100%" })])
    case "text":
      return v("div", "mk-text", { fontSize: i.fs, fontWeight: i.weight, color: i.color }, [i.text])
    case "shape": {
      const style: NonNullable<V["s"]> = { background: `linear-gradient(135deg, ${i.color}, ${i.color2})`, borderRadius: i.shape === "circle" ? "50%" : i.radius }
      if (i.blur > 0) style.filter = `blur(${i.blur}px)`
      return v("div", "mk-shape", style)
    }
  }
}

const kebab = (k: string) => (k.startsWith("--") ? k : k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`))
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

export function toHtml(n: V | string, depth = 0): string {
  if (typeof n === "string") return esc(n)
  const pad = "  ".repeat(depth)
  const style = n.s
    ? Object.entries(n.s)
        .map(([k, val]) => `${kebab(k)}: ${typeof val === "number" && !/^(flex|opacity|font-weight|z-index)$/.test(kebab(k)) ? `${val}px` : val}`)
        .join("; ")
    : ""
  const attrs = [n.c ? `class="${n.c}"` : "", style ? `style="${style}"` : "", ...Object.entries(n.a ?? {}).map(([k, val]) => `${k}="${esc(val)}"`)].filter(Boolean).join(" ")
  const open = `<${n.t}${attrs ? ` ${attrs}` : ""}`
  if (n.t === "img") return `${pad}${open} />`
  if (!n.k || n.k.length === 0) return `${pad}${open}></${n.t}>`
  if (n.k.length === 1 && typeof n.k[0] === "string") return `${pad}${open}>${esc(n.k[0])}</${n.t}>`
  return `${pad}${open}>\n${n.k.map((c) => toHtml(c, depth + 1)).join("\n")}\n${pad}</${n.t}>`
}

export const MK_CSS = `.mk-scr { position: relative; overflow: hidden; background: #e5e7eb; }
.mk-scr.glare::after { content: ""; position: absolute; inset: 0; background: linear-gradient(115deg, rgb(255 255 255 / 0.24), transparent 38%); pointer-events: none; }
.mk-img { display: block; width: 100%; height: 100%; object-fit: cover; object-position: top; }
.mk-browser { display: flex; flex-direction: column; width: 1100px; height: 731px; overflow: hidden; border-radius: 14px; background: #fff; }
.mk-browser__bar { display: flex; flex: none; align-items: center; gap: 8px; height: 44px; padding: 0 16px; border-bottom: 1px solid #e5e7eb; background: #f3f4f6; }
.mk-browser__dot { width: 12px; height: 12px; border-radius: 50%; }
.mk-browser__url { flex: 1; max-width: 420px; height: 26px; margin: 0 auto; overflow: hidden; border-radius: 8px; background: #fff; color: #6b7280; font: 13px/26px system-ui, sans-serif; text-align: center; white-space: nowrap; }
.mk-dark.mk-browser { background: #111827; }
.mk-dark .mk-browser__bar { border-color: #374151; background: #1f2937; }
.mk-dark .mk-browser__url { background: #111827; color: #9ca3af; }
.mk-phone { position: relative; box-sizing: border-box; width: 300px; height: 650px; padding: 12px; border-radius: 52px; background: var(--mk-frame); box-shadow: inset 0 0 0 2px var(--mk-ring), inset 0 0 0 5px rgb(0 0 0 / 0.35); }
.mk-phone__island { position: absolute; top: 24px; left: 50%; width: 92px; height: 27px; border-radius: 20px; background: #000; transform: translateX(-50%); }
.mk-tablet { box-sizing: border-box; width: 780px; height: 585px; padding: 22px; border-radius: 38px; background: var(--mk-frame); box-shadow: inset 0 0 0 2px var(--mk-ring); }
.mk-laptop { display: flex; flex-direction: column; align-items: center; width: 1180px; height: 671px; }
.mk-laptop__lid { box-sizing: border-box; width: 1000px; height: 647px; padding: 18px 18px 27px; border-radius: 22px 22px 0 0; background: var(--mk-frame); box-shadow: inset 0 0 0 2px var(--mk-ring); }
.mk-laptop__base { position: relative; flex: none; width: 1180px; height: 24px; border-radius: 0 0 24px 24px; background: linear-gradient(#d1d5db, #9ca3af 70%, #6b7280); }
.mk-laptop__base::before { content: ""; position: absolute; top: 0; left: 50%; width: 160px; height: 10px; border-radius: 0 0 12px 12px; background: #6b7280; transform: translateX(-50%); }
.mk-monitor { display: flex; flex-direction: column; align-items: center; width: 900px; height: 662px; }
.mk-monitor__body { box-sizing: border-box; width: 900px; height: 558px; padding: 18px 18px 54px; border-radius: 22px; background: var(--mk-frame); box-shadow: inset 0 0 0 2px var(--mk-ring); }
.mk-monitor__neck { width: 120px; height: 90px; background: linear-gradient(90deg, #9ca3af, #e5e7eb 50%, #9ca3af); clip-path: polygon(14% 0, 86% 0, 100% 100%, 0 100%); }
.mk-monitor__foot { width: 300px; height: 14px; border-radius: 7px; background: linear-gradient(#e5e7eb, #9ca3af); }
.mk-watch { position: relative; width: 200px; height: 320px; }
.mk-watch__strap { position: absolute; left: 40px; width: 120px; height: 70px; background: var(--mk-frame); filter: brightness(0.9); }
.mk-watch__strap--top { top: 0; border-radius: 30px 30px 6px 6px; }
.mk-watch__strap--bottom { bottom: 0; border-radius: 6px 6px 30px 30px; }
.mk-watch__body { position: absolute; top: 40px; left: 0; box-sizing: border-box; width: 200px; height: 240px; padding: 12px; border-radius: 52px; background: var(--mk-frame); box-shadow: inset 0 0 0 2px var(--mk-ring), inset 0 0 0 5px rgb(0 0 0 / 0.35); }
.mk-watch__crown { position: absolute; top: 110px; right: -7px; width: 10px; height: 44px; border-radius: 5px; background: var(--mk-frame); box-shadow: inset 0 0 0 1px var(--mk-ring); }
.mk-image { width: 800px; height: 500px; }
.mk-text { display: flex; align-items: center; justify-content: center; width: 600px; height: 160px; font-family: Geist, system-ui, sans-serif; line-height: 1.05; letter-spacing: -0.02em; text-align: center; }
.mk-shape { width: 400px; height: 400px; }`

export interface Template {
  id: string
  name: string
  build: (W: number, H: number) => Item[]
}

const T = (kind: Kind, W: number, H: number, fx: number, fy: number, fw: number, over: Partial<Item> = {}) => mkItem(kind, { x: W * fx, y: H * fy, w: W * fw, ...over })

export const TEMPLATES: Template[] = [
  { id: "duo", name: "Laptop + phone", build: (W, H) => [T("laptop", W, H, 0.45, 0.5, 0.64, { rx: 6, ry: -10 }), T("phone", W, H, 0.83, 0.64, 0.15, { rot: 6, ry: -10 })] },
  { id: "fan", name: "Three phones", build: (W, H) => [T("phone", W, H, 0.3, 0.56, 0.2, { rot: -10 }), T("phone", W, H, 0.7, 0.56, 0.2, { rot: 10 }), T("phone", W, H, 0.5, 0.5, 0.22)] },
  { id: "browser3d", name: "3D browser", build: (W, H) => [T("browser", W, H, 0.56, 0.42, 0.55, { rx: 8, ry: -14, opacity: 0.55, shadow: 0.2 }), T("browser", W, H, 0.46, 0.55, 0.62, { rx: 8, ry: -14 })] },
  { id: "tabphone", name: "Tablet + phone", build: (W, H) => [T("tablet", W, H, 0.44, 0.5, 0.5, { rot: -4 }), T("phone", W, H, 0.79, 0.56, 0.17, { rot: 4 })] },
  { id: "watchphone", name: "Phone + watch", build: (W, H) => [T("phone", W, H, 0.42, 0.5, 0.22, { rot: -6 }), T("watch", W, H, 0.64, 0.6, 0.12, { rot: 8 })] },
  { id: "cascade", name: "Browser cascade", build: (W, H) => [T("browser", W, H, 0.38, 0.36, 0.5, { ry: -8 }), T("browser", W, H, 0.5, 0.5, 0.5, { ry: -8 }), T("browser", W, H, 0.62, 0.64, 0.5, { ry: -8 })] },
  { id: "desk", name: "Monitor + phone", build: (W, H) => [T("monitor", W, H, 0.44, 0.5, 0.56), T("phone", W, H, 0.8, 0.62, 0.15, { rot: 5 })] },
]

export function exportScene(items: Item[], W: number, H: number, bgCss: string, float: boolean) {
  const shots = new Map<string, number>()
  const body = items
    .filter((i) => !i.hidden)
    .map((i) => {
      const h = heightOf(i)
      const key = i.src ?? "demo"
      if (HAS_SCREEN.includes(i.kind) && !shots.has(key)) shots.set(key, shots.size + 1)
      const src = `screenshot-${shots.get(key) ?? 1}.png`
      const [nw, nh] = NAT[i.kind]
      const k = i.w / nw
      const visual = [i.rx || i.ry || i.flip ? `transform: perspective(1800px) rotateX(${i.rx}deg) rotateY(${i.ry}deg)${i.flip ? " scaleX(-1)" : ""}` : "", i.shadow > 0 ? `filter: drop-shadow(0 ${Math.round(40 * i.shadow + 10)}px ${Math.round(60 * i.shadow + 10)}px rgb(0 0 0 / ${i.shadow}))` : ""].filter(Boolean).join("; ")
      const tree = toHtml(deviceTree(i, src), 4)
      return `    <div class="mk-item" style="left: ${Math.round(i.x - i.w / 2)}px; top: ${Math.round(i.y - h / 2)}px; width: ${Math.round(i.w)}px; height: ${Math.round(h)}px; transform: rotate(${Math.round(i.rot * 10) / 10}deg);${i.opacity < 1 ? ` opacity: ${i.opacity};` : ""}">\n      <div class="mk-visual"${visual ? ` style="${visual}"` : ""}>\n        <div class="mk-scale" style="width: ${nw}px; height: ${nh}px; transform: scale(${Math.round(k * 10000) / 10000})">\n${tree}\n        </div>\n      </div>\n    </div>`
    })
    .join("\n")
  const css = `.mockup-wrap {\n  position: relative;\n  width: 100%;\n  max-width: ${W}px;\n  aspect-ratio: ${W} / ${H};\n  overflow: hidden;\n  background: ${bgCss};\n}\n\n.mockup-scene {\n  position: absolute;\n  top: 0;\n  left: 0;\n  width: ${W}px;\n  height: ${H}px;\n  transform-origin: 0 0;\n}\n\n.mk-item {\n  position: absolute;\n}\n\n.mk-visual {\n  position: absolute;\n  inset: 0;${float ? "\n  animation: mk-float 6s ease-in-out infinite;" : ""}\n}\n\n.mk-scale {\n  transform-origin: 0 0;\n}\n\n${MK_CSS}${float ? "\n\n@keyframes mk-float {\n  0%, 100% {\n    translate: 0 0;\n  }\n  50% {\n    translate: 0 -14px;\n  }\n}" : ""}\n`
  const html = `<div class="mockup-wrap">\n  <div class="mockup-scene">\n${body}\n  </div>\n</div>\n`
  const js = `const wrap = document.querySelector(".mockup-wrap")\nconst scene = wrap.querySelector(".mockup-scene")\n\nnew ResizeObserver(() => {\n  scene.style.transform = \`scale(\${wrap.clientWidth / ${W}})\`\n}).observe(wrap)\n`
  return { html, css, js }
}
