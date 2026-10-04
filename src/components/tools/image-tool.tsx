import { useEffect, useRef, useState } from "react"
import { ImageDownIcon, ImageUpIcon, RotateCcwIcon } from "lucide-react"
import { hexToRgbString, parseHex } from "@/lib/color"
import { sampleImage } from "@/lib/sample-image"
import { usePersistent } from "@/lib/use-persistent"
import { ColorInput } from "@/components/color-input"
import { Field, Section, SelectField, SliderField } from "@/components/fields"
import { ToolLayout } from "@/components/tools/tool-layout"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

interface State {
  blur: number
  brightness: number
  contrast: number
  saturate: number
  hue: number
  grayscale: number
  duotone: boolean
  dark: string
  light: string
  overlay: boolean
  overlayType: "linear" | "radial"
  overlayFrom: string
  overlayTo: string
  overlayOpacity: number
  overlayAngle: number
  blend: GlobalCompositeOperation
  vignette: number
  grain: number
  pixelate: number
  width: number
  format: "image/webp" | "image/jpeg" | "image/png"
  quality: number
}

const DEFAULTS: State = {
  blur: 0,
  brightness: 100,
  contrast: 100,
  saturate: 100,
  hue: 0,
  grayscale: 0,
  duotone: false,
  dark: "#1e1b4b",
  light: "#f9a8d4",
  overlay: true,
  overlayType: "linear",
  overlayFrom: "#0f172a",
  overlayTo: "#0f172a",
  overlayOpacity: 0,
  overlayAngle: 180,
  blend: "source-over",
  vignette: 0,
  grain: 0,
  pixelate: 1,
  width: 1920,
  format: "image/webp",
  quality: 0.85,
}

const RESET = { ...DEFAULTS }

const PRESETS: { id: string; name: string; patch: Partial<State> }[] = [
  { id: "hero", name: "Behind text", patch: { brightness: 85, overlay: true, overlayType: "linear", overlayFrom: "#000000", overlayTo: "#000000", overlayOpacity: 0.55, overlayAngle: 180, blend: "source-over", vignette: 0.3 } },
  { id: "soft", name: "Soft background", patch: { blur: 18, brightness: 108, saturate: 120, overlayOpacity: 0.15, overlayFrom: "#ffffff", overlayTo: "#ffffff", grain: 0.08 } },
  { id: "duo", name: "Duotone", patch: { duotone: true, dark: "#1e1b4b", light: "#f472b6", contrast: 115, grain: 0.1 } },
  { id: "noir", name: "Noir", patch: { grayscale: 100, contrast: 130, brightness: 90, vignette: 0.6, grain: 0.15 } },
  { id: "dream", name: "Dream", patch: { blur: 4, saturate: 140, hue: -15, overlay: true, overlayType: "linear", overlayFrom: "#7c3aed", overlayTo: "#f97316", overlayOpacity: 0.45, blend: "soft-light" } },
  { id: "film", name: "Film", patch: { contrast: 108, saturate: 85, brightness: 104, overlayFrom: "#fde68a", overlayTo: "#0f766e", overlayOpacity: 0.25, blend: "overlay", grain: 0.22, vignette: 0.35 } },
  { id: "pixel", name: "Pixels", patch: { pixelate: 18, saturate: 130, overlayOpacity: 0 } },
  { id: "dark", name: "Dimming", patch: { brightness: 60, saturate: 70, blur: 2, overlayOpacity: 0.2, overlayFrom: "#020617", overlayTo: "#020617" } },
]

const BLENDS: GlobalCompositeOperation[] = ["source-over", "multiply", "screen", "overlay", "soft-light", "color", "luminosity", "hard-light"]
const cssBlend = (b: GlobalCompositeOperation) => (b === "source-over" ? "normal" : b)

function render(img: HTMLImageElement, canvas: HTMLCanvasElement, w: number, s: State) {
  const h = Math.round((w * img.naturalHeight) / img.naturalWidth)
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext("2d", { willReadFrequently: true })
  if (!ctx) return
  const scale = w / 1200
  const blur = s.blur * scale
  ctx.filter = `blur(${blur}px) brightness(${s.brightness}%) contrast(${s.contrast}%) saturate(${s.saturate}%) hue-rotate(${s.hue}deg) grayscale(${s.grayscale}%)`
  const pad = blur * 3
  if (s.pixelate > 1) {
    const sw = Math.max(1, Math.round(w / s.pixelate))
    const sh = Math.max(1, Math.round(h / s.pixelate))
    const tmp = document.createElement("canvas")
    tmp.width = sw
    tmp.height = sh
    const tctx = tmp.getContext("2d")
    tctx?.drawImage(img, 0, 0, sw, sh)
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(tmp, -pad, -pad, w + pad * 2, h + pad * 2)
    ctx.imageSmoothingEnabled = true
  } else {
    ctx.drawImage(img, -pad, -pad, w + pad * 2, h + pad * 2)
  }
  ctx.filter = "none"

  if (s.duotone) {
    const d = parseHex(s.dark) ?? { r: 0, g: 0, b: 0 }
    const l = parseHex(s.light) ?? { r: 1, g: 1, b: 1 }
    const data = ctx.getImageData(0, 0, w, h)
    const px = data.data
    for (let i = 0; i < px.length; i += 4) {
      const t = (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255
      px[i] = (d.r + (l.r - d.r) * t) * 255
      px[i + 1] = (d.g + (l.g - d.g) * t) * 255
      px[i + 2] = (d.b + (l.b - d.b) * t) * 255
    }
    ctx.putImageData(data, 0, 0)
  }

  if (s.overlay && s.overlayOpacity > 0) {
    let g: CanvasGradient
    if (s.overlayType === "linear") {
      const a = ((s.overlayAngle - 90) * Math.PI) / 180
      const len = Math.abs(w * Math.cos(a)) + Math.abs(h * Math.sin(a))
      const cx = w / 2
      const cy = h / 2
      g = ctx.createLinearGradient(cx - (Math.cos(a) * len) / 2, cy - (Math.sin(a) * len) / 2, cx + (Math.cos(a) * len) / 2, cy + (Math.sin(a) * len) / 2)
    } else {
      g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.hypot(w, h) / 2)
    }
    g.addColorStop(0, s.overlayType === "linear" ? hexToRgbString(s.overlayFrom, s.overlayFrom === s.overlayTo ? 0 : 1) : hexToRgbString(s.overlayFrom, 0))
    g.addColorStop(1, s.overlayTo)
    ctx.save()
    ctx.globalAlpha = s.overlayOpacity
    ctx.globalCompositeOperation = s.blend
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
    ctx.restore()
  }

  if (s.vignette > 0) {
    const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.hypot(w, h) / 2)
    g.addColorStop(0, "rgba(0,0,0,0)")
    g.addColorStop(1, `rgba(0,0,0,${s.vignette})`)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
  }

  if (s.grain > 0) {
    const n = document.createElement("canvas")
    n.width = 256
    n.height = 256
    const nctx = n.getContext("2d")
    if (nctx) {
      const nd = nctx.createImageData(256, 256)
      for (let i = 0; i < nd.data.length; i += 4) {
        const v = Math.random() * 255
        nd.data[i] = v
        nd.data[i + 1] = v
        nd.data[i + 2] = v
        nd.data[i + 3] = 255
      }
      nctx.putImageData(nd, 0, 0)
      ctx.save()
      ctx.globalAlpha = s.grain
      ctx.globalCompositeOperation = "overlay"
      ctx.fillStyle = ctx.createPattern(n, "repeat") as CanvasPattern
      ctx.fillRect(0, 0, w, h)
      ctx.restore()
    }
  }
}

export function ImageTool() {
  const [s, set, replace] = usePersistent<State>("lf-tool-image", DEFAULTS)
  const [src, setSrc] = useState<string>(() => sampleImage())
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  const [split, setSplit] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const i = new Image()
    i.onload = () => {
      setImg(i)
      setSize({ w: i.naturalWidth, h: i.naturalHeight })
    }
    i.src = src
  }, [src])

  useEffect(() => {
    if (!img || !canvasRef.current) return
    const id = requestAnimationFrame(() => canvasRef.current && render(img, canvasRef.current, Math.min(1200, img.naturalWidth), s))
    return () => cancelAnimationFrame(id)
  }, [img, s])

  const exportImage = () => {
    if (!img) return
    const c = document.createElement("canvas")
    render(img, c, Math.min(s.width, img.naturalWidth * 2), s)
    const ext = s.format.split("/")[1]
    const a = document.createElement("a")
    a.href = c.toDataURL(s.format, s.quality)
    a.download = `background.${ext === "jpeg" ? "jpg" : ext}`
    a.click()
  }

  const filter = [
    s.blur && `blur(${s.blur}px)`,
    s.brightness !== 100 && `brightness(${s.brightness}%)`,
    s.contrast !== 100 && `contrast(${s.contrast}%)`,
    s.saturate !== 100 && `saturate(${s.saturate}%)`,
    s.hue && `hue-rotate(${s.hue}deg)`,
    s.grayscale && `grayscale(${s.grayscale}%)`,
  ]
    .filter(Boolean)
    .join(" ")
  const overlayCss =
    s.overlay && s.overlayOpacity > 0
      ? s.overlayType === "linear"
        ? `linear-gradient(${s.overlayAngle}deg, ${s.overlayFrom === s.overlayTo ? hexToRgbString(s.overlayFrom, 0) : s.overlayFrom}, ${s.overlayTo})`
        : `radial-gradient(circle, ${hexToRgbString(s.overlayFrom, 0)}, ${s.overlayTo})`
      : null
  const ext = s.format.split("/")[1] === "jpeg" ? "jpg" : s.format.split("/")[1]

  const outputs = [
    {
      id: "baked",
      label: "Ready file",
      lang: "css",
      file: "background.css",
      code: `.hero {\n  background: url("background.${ext}") center / cover no-repeat;\n}\n`,
    },
    {
      id: "live",
      label: "CSS effects",
      lang: "css",
      file: "background-live.css",
      code: `.hero {\n  position: relative;\n  isolation: isolate;\n  overflow: hidden;\n}\n\n.hero__bg {\n  position: absolute;\n  inset: ${s.blur ? `-${s.blur * 2}px` : "0"};\n  z-index: -2;\n  background: url("photo.jpg") center / cover no-repeat;${filter ? `\n  filter: ${filter};` : ""}\n}\n${
        overlayCss
          ? `\n.hero::before {\n  content: "";\n  position: absolute;\n  inset: 0;\n  z-index: -1;\n  background: ${overlayCss};\n  opacity: ${s.overlayOpacity};\n  mix-blend-mode: ${cssBlend(s.blend)};\n}\n`
          : ""
      }${s.vignette ? `\n.hero::after {\n  content: "";\n  position: absolute;\n  inset: 0;\n  z-index: -1;\n  background: radial-gradient(circle, transparent 35%, rgb(0 0 0 / ${s.vignette}));\n}\n` : ""}`,
    },
  ]

  const controls = (
    <>
      <Section
        title="Image"
        action={
          <Button variant="ghost" size="xs" onClick={() => replace(RESET)}>
            <RotateCcwIcon />
            Reset
          </Button>
        }
      >
        <label
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const f = e.dataTransfer.files[0]
            if (f) setSrc(URL.createObjectURL(f))
          }}
          className="flex h-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-xs text-muted-foreground hover:bg-muted/50"
        >
          <ImageUpIcon className="size-4" />
          Drop or choose a photo
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && setSrc(URL.createObjectURL(e.target.files[0]))} />
        </label>
        {size && (
          <p className="font-mono text-[11px] text-muted-foreground">
            source {size.w}×{size.h}
          </p>
        )}
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button key={p.id} onClick={() => replace({ ...RESET, width: s.width, format: s.format, quality: s.quality, ...p.patch })} className="rounded-md border px-2 py-1 text-xs hover:bg-muted">
              {p.name}
            </button>
          ))}
        </div>
      </Section>
      <Section title="Correction">
        <SliderField label="Blur" value={s.blur} min={0} max={60} onChange={(blur) => set({ blur })} />
        <SliderField label="Brightness" value={s.brightness} min={20} max={200} unit="%" onChange={(brightness) => set({ brightness })} />
        <SliderField label="Contrast" value={s.contrast} min={20} max={200} unit="%" onChange={(contrast) => set({ contrast })} />
        <SliderField label="Saturation" value={s.saturate} min={0} max={300} unit="%" onChange={(saturate) => set({ saturate })} />
        <SliderField label="Hue shift" value={s.hue} min={-180} max={180} unit="°" onChange={(hue) => set({ hue })} />
        <SliderField label="Desaturation" value={s.grayscale} min={0} max={100} unit="%" onChange={(grayscale) => set({ grayscale })} />
        <SliderField label="Pixelation" value={s.pixelate} min={1} max={60} unit="×" onChange={(pixelate) => set({ pixelate })} />
      </Section>
      <Section title="Duotone">
        <div className="flex items-center justify-between">
          <Label htmlFor="duo" className="text-xs">
            Enable
          </Label>
          <Switch id="duo" size="sm" checked={s.duotone} onCheckedChange={(duotone) => set({ duotone })} />
        </div>
        {s.duotone && (
          <div className="grid grid-cols-2 gap-2">
            <Field label="Shadows">
              <ColorInput value={s.dark} compact onChange={(dark) => set({ dark })} />
            </Field>
            <Field label="Highlights">
              <ColorInput value={s.light} compact onChange={(light) => set({ light })} />
            </Field>
          </div>
        )}
      </Section>
      <Section title="Overlay">
        <ToggleGroup variant="outline" size="sm" spacing={0} className="w-full" value={[s.overlayType]} onValueChange={(v) => v[0] && set({ overlay: true, overlayType: v[0] as State["overlayType"] })}>
          <ToggleGroupItem value="linear" className="flex-1 text-xs">
            Linear
          </ToggleGroupItem>
          <ToggleGroupItem value="radial" className="flex-1 text-xs">
            Radial
          </ToggleGroupItem>
        </ToggleGroup>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Color 1">
            <ColorInput value={s.overlayFrom} compact onChange={(overlayFrom) => set({ overlayFrom })} />
          </Field>
          <Field label="Color 2">
            <ColorInput value={s.overlayTo} compact onChange={(overlayTo) => set({ overlayTo })} />
          </Field>
        </div>
        <SliderField label="Opacity" value={s.overlayOpacity} min={0} max={1} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(overlayOpacity) => set({ overlay: true, overlayOpacity })} />
        {s.overlayType === "linear" && <SliderField label="Angle" value={s.overlayAngle} min={0} max={360} unit="°" onChange={(overlayAngle) => set({ overlayAngle })} />}
        <SelectField label="Blend mode" value={s.blend} options={BLENDS.map((b) => ({ value: b, label: cssBlend(b) }))} onChange={(v) => set({ blend: v as GlobalCompositeOperation })} />
      </Section>
      <Section title="Finish">
        <SliderField label="Vignette" value={s.vignette} min={0} max={1} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(vignette) => set({ vignette })} />
        <SliderField label="Grain" value={s.grain} min={0} max={0.6} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(grain) => set({ grain })} />
      </Section>
      <Section title="Export">
        <SliderField label="Width" value={s.width} min={640} max={3840} step={64} onChange={(width) => set({ width })} />
        <div className="grid grid-cols-2 gap-2">
          <SelectField
            label="Format"
            value={s.format}
            options={[
              { value: "image/webp", label: "WebP" },
              { value: "image/jpeg", label: "JPEG" },
              { value: "image/png", label: "PNG" },
            ]}
            onChange={(v) => set({ format: v as State["format"] })}
          />
          <SliderField label="Quality" value={s.quality} min={0.4} max={1} step={0.01} format={(v) => `${Math.round(v * 100)}`} onChange={(quality) => set({ quality })} />
        </div>
      </Section>
    </>
  )

  return (
    <ToolLayout
      controls={controls}
      outputs={outputs}
      footer={
        <Button size="sm" onClick={exportImage} disabled={!img}>
          <ImageDownIcon />
          Download {ext.toUpperCase()} {s.width}px
        </Button>
      }
    >
      <div className="flex h-full min-h-[460px] flex-col items-center justify-center gap-3 p-6 md:p-10">
        <div className="relative w-full max-w-5xl overflow-hidden rounded-xl shadow-xl ring-1 ring-foreground/10" onPointerDown={() => setSplit(true)} onPointerUp={() => setSplit(false)} onPointerLeave={() => setSplit(false)}>
          <canvas ref={canvasRef} className="block h-auto w-full" />
          {split && <img src={src} alt="" className="absolute inset-0 size-full object-cover" />}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center text-white">
            <h2 className="text-2xl font-semibold drop-shadow md:text-4xl">Heading over background</h2>
            <p className="text-sm opacity-80">Check text readability</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Hold the preview — original</p>
      </div>
    </ToolLayout>
  )
}
