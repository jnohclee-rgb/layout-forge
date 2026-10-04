import { useEffect, useMemo, useState } from "react"
import { ImageUpIcon, Loader2Icon, PackageIcon } from "lucide-react"
import { toast } from "sonner"
import { downloadBlob } from "@/lib/clipboard"
import { buildIco, buildZip, dataUrlBytes } from "@/lib/pack"
import { usePersistent } from "@/lib/use-persistent"
import { cn } from "@/lib/utils"
import { ColorInput } from "@/components/color-input"
import { Field, Section, SelectField, SliderField } from "@/components/fields"
import { ToolLayout } from "@/components/tools/tool-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

type Source = "text" | "emoji" | "image"
type Shape = "square" | "rounded" | "squircle" | "circle"

interface State {
  source: Source
  text: string
  emoji: string
  font: string
  weight: number
  fg: string
  bgMode: "solid" | "gradient" | "none"
  bg: string
  bg2: string
  shape: Shape
  padding: number
  scale: number
  dark: boolean
  darkBg: string
  darkFg: string
  name: string
  theme: string
}

const DEFAULTS: State = {
  source: "text",
  text: "LF",
  emoji: "🚀",
  font: "sans",
  weight: 800,
  fg: "#ffffff",
  bgMode: "gradient",
  bg: "#6d28d9",
  bg2: "#db2777",
  shape: "rounded",
  padding: 0.12,
  scale: 0.62,
  dark: true,
  darkBg: "#fafafa",
  darkFg: "#6d28d9",
  name: "Layout Forge",
  theme: "#6d28d9",
}

const FONTS: Record<string, string> = {
  sans: "Geist, Inter, system-ui, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  mono: "ui-monospace, Menlo, Consolas, monospace",
  rounded: "ui-rounded, 'SF Pro Rounded', 'Nunito', system-ui, sans-serif",
}

function shapePath(ctx: CanvasRenderingContext2D, size: number, shape: Shape) {
  ctx.beginPath()
  if (shape === "circle") ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
  else if (shape === "square") ctx.rect(0, 0, size, size)
  else if (shape === "rounded") ctx.roundRect(0, 0, size, size, size * 0.22)
  else {
    const n = 5
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2
      const c = Math.cos(a)
      const s = Math.sin(a)
      const x = size / 2 + (size / 2) * Math.sign(c) * Math.pow(Math.abs(c), 2 / n)
      const y = size / 2 + (size / 2) * Math.sign(s) * Math.pow(Math.abs(s), 2 / n)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
  }
}

function renderIcon(s: State, size: number, img: HTMLImageElement | null, mode: "normal" | "solid" | "maskable" = "normal") {
  const c = document.createElement("canvas")
  c.width = size
  c.height = size
  const ctx = c.getContext("2d") as CanvasRenderingContext2D
  const fillBg = () => {
    if (s.bgMode === "none" && mode === "normal") return
    if (s.bgMode === "gradient") {
      const g = ctx.createLinearGradient(0, 0, size, size)
      g.addColorStop(0, s.bg)
      g.addColorStop(1, s.bg2)
      ctx.fillStyle = g
    } else ctx.fillStyle = s.bgMode === "none" ? "#ffffff" : s.bg
    if (mode === "normal") {
      shapePath(ctx, size, s.shape)
      ctx.fill()
    } else ctx.fillRect(0, 0, size, size)
  }
  fillBg()
  const safe = mode === "maskable" ? 0.8 : 1
  const pad = size * (mode === "normal" ? s.padding : s.padding * 0.6)
  const box = (size - pad * 2) * safe
  const ox = (size - box) / 2
  if (s.source === "image" && img) {
    const k = Math.min(box / img.naturalWidth, box / img.naturalHeight)
    const w = img.naturalWidth * k
    const h = img.naturalHeight * k
    ctx.drawImage(img, ox + (box - w) / 2, ox + (box - h) / 2, w, h)
  } else {
    const content = s.source === "emoji" ? s.emoji : s.text
    const fontSize = box * s.scale * (s.source === "text" && content.length > 2 ? 2 / content.length + 0.2 : 1)
    ctx.font = `${s.source === "emoji" ? 400 : s.weight} ${fontSize}px ${s.source === "emoji" ? "'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif" : FONTS[s.font]}`
    ctx.fillStyle = s.fg
    ctx.textAlign = "center"
    ctx.textBaseline = "alphabetic"
    const m = ctx.measureText(content)
    const asc = m.actualBoundingBoxAscent
    const desc = m.actualBoundingBoxDescent
    ctx.fillText(content, size / 2, size / 2 + (asc - desc) / 2)
  }
  return c
}

function buildSvg(s: State, imgUrl: string | null) {
  const shape =
    s.shape === "circle"
      ? `<circle class="bg" cx="50" cy="50" r="50"/>`
      : s.shape === "square"
        ? `<rect class="bg" width="100" height="100"/>`
        : s.shape === "rounded"
          ? `<rect class="bg" width="100" height="100" rx="22"/>`
          : `<path class="bg" d="M50,0 C90,0 100,10 100,50 C100,90 90,100 50,100 C10,100 0,90 0,50 C0,10 10,0 50,0 Z"/>`
  const defs = s.bgMode === "gradient" ? `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${s.bg}"/><stop offset="1" stop-color="${s.bg2}"/></linearGradient></defs>` : ""
  const bgFill = s.bgMode === "gradient" ? "url(#g)" : s.bg
  const box = 100 - s.padding * 200
  const content = s.source === "emoji" ? s.emoji : s.text
  const size = (box * s.scale * (s.source === "text" && content.length > 2 ? 2 / content.length + 0.2 : 1)).toFixed(1)
  const body =
    s.source === "image" && imgUrl
      ? `<image href="${imgUrl}" x="${s.padding * 100}" y="${s.padding * 100}" width="${box}" height="${box}" preserveAspectRatio="xMidYMid meet"/>`
      : `<text class="fg" x="50" y="50" dy=".35em" text-anchor="middle" font-family="${(s.source === "emoji" ? "sans-serif" : FONTS[s.font]).replace(/"/g, "'")}" font-size="${size}" font-weight="${s.source === "emoji" ? 400 : s.weight}">${content.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</text>`
  const dark = s.dark && s.bgMode !== "none" ? `@media (prefers-color-scheme: dark) { .bg { fill: ${s.darkBg}; } .fg { fill: ${s.darkFg}; } }` : ""
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">\n  <style>.bg { fill: ${bgFill}; } .fg { fill: ${s.fg}; } ${dark}</style>\n  ${defs}\n  ${s.bgMode === "none" ? "" : shape}\n  ${body}\n</svg>\n`
}

const SNIPPET = (s: State) => `<link rel="icon" href="/favicon.ico" sizes="48x48" />
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<link rel="manifest" href="/site.webmanifest" />
<meta name="theme-color" content="${s.theme}" />
`

const MANIFEST = (s: State) =>
  JSON.stringify(
    {
      name: s.name,
      short_name: s.name.split(" ")[0],
      icons: [
        { src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
        { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
        { src: "/maskable-icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
      theme_color: s.theme,
      background_color: s.bgMode === "none" ? "#ffffff" : s.bg,
      display: "standalone",
    },
    null,
    2,
  ) + "\n"

export function FaviconTool() {
  const [s, set] = usePersistent<State>("lf-tool-favicon", DEFAULTS)
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [imgUrl, setImgUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!imgUrl) return
    const i = new Image()
    i.onload = () => setImg(i)
    i.src = imgUrl
  }, [imgUrl])

  useEffect(() => {
    document.fonts?.ready.then(() => setTick((t) => t + 1))
  }, [])

  const previews = useMemo(() => {
    void tick
    const make = (size: number, mode: "normal" | "solid" | "maskable" = "normal") => renderIcon(s, size, img, mode).toDataURL("image/png")
    return { big: make(256), s16: make(16), s32: make(32), s48: make(48), s64: make(64), s128: make(128), apple: make(180, "solid"), mask: make(256, "maskable") }
  }, [s, img, tick])

  const svg = buildSvg(s, null)

  const exportZip = async () => {
    setBusy(true)
    try {
      const png = async (size: number, mode: "normal" | "solid" | "maskable" = "normal") => dataUrlBytes(renderIcon(s, size, img, mode).toDataURL("image/png"))
      const ico = buildIco([
        { size: 16, png: await png(16) },
        { size: 32, png: await png(32) },
        { size: 48, png: await png(48) },
      ])
      let svgText = svg
      if (s.source === "image" && imgUrl) {
        const c = renderIcon({ ...s, bgMode: "none" }, 256, img)
        svgText = buildSvg(s, c.toDataURL("image/png"))
      }
      const zip = buildZip([
        { name: "favicon.ico", data: ico },
        { name: "favicon.svg", data: svgText },
        { name: "favicon-16x16.png", data: await png(16) },
        { name: "favicon-32x32.png", data: await png(32) },
        { name: "apple-touch-icon.png", data: await png(180, "solid") },
        { name: "android-chrome-192x192.png", data: await png(192) },
        { name: "android-chrome-512x512.png", data: await png(512) },
        { name: "maskable-icon-512x512.png", data: await png(512, "maskable") },
        { name: "site.webmanifest", data: MANIFEST(s) },
        { name: "head.html", data: SNIPPET(s) },
      ])
      downloadBlob("favicon-package.zip", zip)
    } catch (e) {
      toast.error("Could not build the archive", { description: e instanceof Error ? e.message : undefined })
    } finally {
      setBusy(false)
    }
  }

  const outputs = [
    { id: "html", label: "HTML", lang: "html", file: "head.html", code: SNIPPET(s) },
    { id: "svg", label: "favicon.svg", lang: "html", file: "favicon.svg", code: svg },
    { id: "manifest", label: "Manifest", lang: "json", file: "site.webmanifest", code: MANIFEST(s) },
  ]

  const controls = (
    <>
      <Section title="Content">
        <ToggleGroup variant="outline" size="sm" spacing={0} className="w-full" value={[s.source]} onValueChange={(v) => v[0] && set({ source: v[0] as Source })}>
          <ToggleGroupItem value="text" className="flex-1 text-xs">
            Letters
          </ToggleGroupItem>
          <ToggleGroupItem value="emoji" className="flex-1 text-xs">
            Emoji
          </ToggleGroupItem>
          <ToggleGroupItem value="image" className="flex-1 text-xs">
            Picture
          </ToggleGroupItem>
        </ToggleGroup>
        {s.source === "text" && (
          <>
            <Input value={s.text} maxLength={4} onChange={(e) => set({ text: e.target.value })} className="h-9 text-center text-lg font-bold" />
            <div className="grid grid-cols-2 gap-2">
              <SelectField
                label="Font"
                value={s.font}
                options={[
                  { value: "sans", label: "Grotesque" },
                  { value: "serif", label: "Serif" },
                  { value: "mono", label: "Mono" },
                  { value: "rounded", label: "Rounded" },
                ]}
                onChange={(font) => set({ font })}
              />
              <SelectField label="Saturation" value={String(s.weight)} options={["400", "500", "600", "700", "800", "900"]} onChange={(v) => set({ weight: Number(v) })} />
            </div>
          </>
        )}
        {s.source === "emoji" && <Input value={s.emoji} onChange={(e) => set({ emoji: e.target.value })} className="h-10 text-center text-2xl" />}
        {s.source === "image" && (
          <label className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed text-xs text-muted-foreground hover:bg-muted/50">
            <ImageUpIcon className="size-4" />
            {imgUrl ? "Replace" : "Logo SVG / PNG"}
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && setImgUrl(URL.createObjectURL(e.target.files[0]))} />
          </label>
        )}
        <SliderField label="Content size" value={s.scale} min={0.3} max={1.2} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(scale) => set({ scale })} />
        <SliderField label="Padding" value={s.padding} min={0} max={0.3} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(padding) => set({ padding })} />
        <Field label="Symbol color">
          <ColorInput value={s.fg} compact onChange={(fg) => set({ fg })} />
        </Field>
      </Section>
      <Section title="Background and shape">
        <ToggleGroup variant="outline" size="sm" spacing={0} className="grid w-full grid-cols-4" value={[s.shape]} onValueChange={(v) => v[0] && set({ shape: v[0] as Shape })}>
          <ToggleGroupItem value="square" className="text-xs">
            Square
          </ToggleGroupItem>
          <ToggleGroupItem value="rounded" className="text-xs">
            Rounded
          </ToggleGroupItem>
          <ToggleGroupItem value="squircle" className="text-xs">
            Squircle
          </ToggleGroupItem>
          <ToggleGroupItem value="circle" className="text-xs">
            Circle
          </ToggleGroupItem>
        </ToggleGroup>
        <ToggleGroup variant="outline" size="sm" spacing={0} className="w-full" value={[s.bgMode]} onValueChange={(v) => v[0] && set({ bgMode: v[0] as State["bgMode"] })}>
          <ToggleGroupItem value="solid" className="flex-1 text-xs">
            Color
          </ToggleGroupItem>
          <ToggleGroupItem value="gradient" className="flex-1 text-xs">
            Gradient
          </ToggleGroupItem>
          <ToggleGroupItem value="none" className="flex-1 text-xs">
            Transparent
          </ToggleGroupItem>
        </ToggleGroup>
        {s.bgMode !== "none" && (
          <div className="grid grid-cols-2 gap-2">
            <ColorInput value={s.bg} compact onChange={(bg) => set({ bg })} />
            {s.bgMode === "gradient" && <ColorInput value={s.bg2} compact onChange={(bg2) => set({ bg2 })} />}
          </div>
        )}
      </Section>
      <Section title="Browser dark theme">
        <div className="flex items-center justify-between">
          <Label htmlFor="fv-dark" className="text-xs">
            Separate colors in favicon.svg
          </Label>
          <Switch id="fv-dark" size="sm" checked={s.dark} onCheckedChange={(dark) => set({ dark })} />
        </div>
        {s.dark && (
          <div className="grid grid-cols-2 gap-2">
            <Field label="Background">
              <ColorInput value={s.darkBg} compact onChange={(darkBg) => set({ darkBg })} />
            </Field>
            <Field label="Symbol">
              <ColorInput value={s.darkFg} compact onChange={(darkFg) => set({ darkFg })} />
            </Field>
          </div>
        )}
      </Section>
      <Section title="App (manifest)">
        <Field label="Name">
          <Input value={s.name} onChange={(e) => set({ name: e.target.value })} className="h-8" />
        </Field>
        <Field label="theme-color">
          <ColorInput value={s.theme} compact onChange={(theme) => set({ theme })} />
        </Field>
      </Section>
    </>
  )

  const tab = (dark: boolean) => (
    <div className={cn("flex items-end gap-1 rounded-t-xl px-2 pt-2", dark ? "bg-neutral-900" : "bg-neutral-200")}>
      <div className={cn("flex h-9 w-56 items-center gap-2 rounded-t-lg px-3 text-xs", dark ? "bg-neutral-800 text-neutral-100" : "bg-white text-neutral-800")}>
        <img src={dark && s.dark && s.bgMode !== "none" ? renderIcon({ ...s, bg: s.darkBg, bg2: s.darkBg, fg: s.darkFg }, 32, img).toDataURL() : previews.s32} alt="" className="size-4" />
        <span className="truncate">{s.name}</span>
      </div>
      <div className={cn("flex h-9 w-40 items-center gap-2 px-3 text-xs opacity-60", dark ? "text-neutral-300" : "text-neutral-600")}>
        <span className="size-4 rounded-full bg-current opacity-30" />
        Another tab
      </div>
    </div>
  )

  return (
    <ToolLayout
      controls={controls}
      outputs={outputs}
      footer={
        <Button size="sm" onClick={exportZip} disabled={busy}>
          {busy ? <Loader2Icon className="animate-spin" /> : <PackageIcon />}
          Download package (.zip)
        </Button>
      }
    >
      <div className="flex min-h-full flex-col items-center justify-center gap-8 p-6 md:p-10">
        <div className="flex flex-wrap items-end justify-center gap-6">
          <div className="rounded-2xl bg-[repeating-conic-gradient(#e5e7eb_0_25%,#fff_0_50%)] bg-[length:16px_16px] p-4 shadow-sm ring-1 ring-foreground/10">
            <img src={previews.big} alt="" className="size-40" />
          </div>
          <div className="flex items-end gap-4">
            {[
              [previews.s16, 16],
              [previews.s32, 32],
              [previews.s48, 48],
              [previews.s64, 64],
              [previews.s128, 128],
            ].map(([src, size]) => (
              <div key={size} className="flex flex-col items-center gap-1.5">
                <img src={src as string} alt="" style={{ width: size as number, height: size as number, imageRendering: (size as number) < 48 ? "pixelated" : undefined }} />
                <span className="font-mono text-[10px] text-muted-foreground">{size}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex w-full max-w-xl flex-col gap-3">
          {tab(false)}
          {tab(true)}
        </div>
        <div className="flex flex-wrap items-start justify-center gap-10">
          <div className="flex flex-col items-center gap-2">
            <div className="flex gap-4 rounded-3xl bg-gradient-to-br from-sky-400 to-indigo-600 p-5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  {i === 1 ? <img src={previews.apple} alt="" className="size-14 rounded-[14px] shadow-md" /> : <div className="size-14 rounded-[14px] bg-white/30" />}
                  <span className="text-[10px] text-white">{i === 1 ? s.name.split(" ")[0] : "App"}</span>
                </div>
              ))}
            </div>
            <span className="text-xs text-muted-foreground">iOS · apple-touch-icon</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="flex gap-4 rounded-3xl bg-neutral-800 p-5">
              <img src={previews.mask} alt="" className="size-14 rounded-full" />
              <img src={previews.mask} alt="" className="size-14 rounded-[30%]" />
              <img src={previews.mask} alt="" className="size-14 rounded-xl" />
            </div>
            <span className="text-xs text-muted-foreground">Android · maskable (different masks)</span>
          </div>
        </div>
      </div>
    </ToolLayout>
  )
}
