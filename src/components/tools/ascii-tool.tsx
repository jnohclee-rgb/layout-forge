import { useEffect, useRef, useState } from "react"
import { CameraIcon, CircleIcon, FilmIcon, ImageDownIcon, ImageUpIcon, RefreshCwIcon } from "lucide-react"
import { toast } from "sonner"
import { download, downloadUrl } from "@/lib/clipboard"
import { sampleImage } from "@/lib/sample-image"
import { usePersistent } from "@/lib/use-persistent"
import { ColorInput } from "@/components/color-input"
import { Field, Section, SelectField, SliderField } from "@/components/fields"
import { ToolLayout } from "@/components/tools/tool-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

type Source = "donut" | "image" | "video" | "camera"
type ColorMode = "mono" | "source" | "gradient"

const CHARSETS: Record<string, string> = {
  standard: " .:-=+*#%@",
  detailed: " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tjfrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
  blocks: " ░▒▓█",
  binary: " 01",
  dots: " ·•●",
  slashes: " ./\\|X",
}

const FONT = 'ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace'
const CHAR_W = 0.6

interface State {
  source: Source
  cols: number
  charset: string
  custom: string
  colorMode: ColorMode
  fg: string
  bg: string
  g1: string
  g2: string
  contrast: number
  brightness: number
  invert: boolean
  speed: number
}

const DEFAULTS: State = {
  source: "donut",
  cols: 120,
  charset: "standard",
  custom: " .oO@",
  colorMode: "gradient",
  fg: "#4ade80",
  bg: "#050505",
  g1: "#22d3ee",
  g2: "#f472b6",
  contrast: 20,
  brightness: 0,
  invert: false,
  speed: 1,
}

const LIVE_SNIPPET = (s: State, chars: string) => `const video = document.querySelector("video")
const pre = document.querySelector("pre")
const CHARS = ${JSON.stringify(chars)}
const COLS = ${s.cols}
const sampler = document.createElement("canvas").getContext("2d", { willReadFrequently: true })

function frame() {
  if (video.videoWidth) {
    const rows = Math.round((COLS * video.videoHeight) / video.videoWidth / 2)
    sampler.canvas.width = COLS
    sampler.canvas.height = rows
    sampler.drawImage(video, 0, 0, COLS, rows)
    const d = sampler.getImageData(0, 0, COLS, rows).data
    let out = ""
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < COLS; x++) {
        const i = (y * COLS + x) * 4
        const l = (d[i] * 0.2126 + d[i + 1] * 0.7152 + d[i + 2] * 0.0722) / 255
        out += CHARS[Math.min(CHARS.length - 1, Math.floor(${s.invert ? "(1 - l)" : "l"} * CHARS.length))]
      }
      out += "\\n"
    }
    pre.textContent = out
  }
  requestAnimationFrame(frame)
}
frame()
`

function donutLum(cols: number, rows: number, A: number, B: number): Float32Array {
  const lum = new Float32Array(cols * rows)
  const z = new Float32Array(cols * rows)
  const cA = Math.cos(A)
  const sA = Math.sin(A)
  const cB = Math.cos(B)
  const sB = Math.sin(B)
  const K1 = Math.min(cols, rows * 2) * 0.32
  for (let th = 0; th < 6.283; th += 0.05) {
    const ct = Math.cos(th)
    const st = Math.sin(th)
    for (let ph = 0; ph < 6.283; ph += 0.015) {
      const cp = Math.cos(ph)
      const sp = Math.sin(ph)
      const cx = 2 + ct
      const ooz = 1 / (sp * cx * sA + st * cA + 5)
      const t = sp * cx * cA - st * sA
      const x = Math.floor(cols / 2 + K1 * 1.6 * ooz * (cp * cx * cB - t * sB))
      const y = Math.floor(rows / 2 + K1 * 0.8 * ooz * (cp * cx * sB + t * cB))
      const L = cp * ct * sB - cA * ct * sp - sA * st + cB * (cA * st - ct * sA * sp)
      const idx = y * cols + x
      if (y >= 0 && y < rows && x >= 0 && x < cols && ooz > z[idx]) {
        z[idx] = ooz
        lum[idx] = 0.22 + 0.78 * Math.max(0, L) / 1.42
      }
    }
  }
  return lum
}

function hexRgb(h: string): [number, number, number] {
  const v = parseInt(h.slice(1), 16)
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255]
}

export function AsciiTool() {
  const [s, set] = usePersistent<State>("lf-tool-ascii", DEFAULTS)
  const [imageSrc, setImageSrc] = useState(() => sampleImage())
  const [videoSrc, setVideoSrc] = useState<string | null>(null)
  const [snapshot, setSnapshot] = useState({ text: "", html: "" })
  const [boxW, setBoxW] = useState(900)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const lastFrame = useRef<{ chars: string[]; colors: string[] | null; cols: number; rows: number } | null>(null)
  const chars = s.charset === "custom" ? s.custom || " #" : CHARSETS[s.charset]

  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setBoxW(el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      imgRef.current = img
    }
    img.src = imageSrc
  }, [imageSrc])

  useEffect(() => {
    if (s.source !== "camera") {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [s.source])

  useEffect(() => () => streamRef.current?.getTracks().forEach((t) => t.stop()), [])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
      streamRef.current = stream
      set({ source: "camera" })
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
        }
      })
    } catch {
      toast.error("No camera access")
    }
  }

  useEffect(() => {
    const sampler = document.createElement("canvas").getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D
    let raf = 0
    let t = 0
    let last = performance.now()
    const g1 = hexRgb(s.g1)
    const g2 = hexRgb(s.g2)
    const cb = (s.contrast + 100) / 100
    const bb = s.brightness / 100
    const draw = () => {
      const now = performance.now()
      t += ((now - last) / 1000) * s.speed
      last = now
      const canvas = canvasRef.current
      if (!canvas) return
      const fontSize = Math.max(4, boxW / (s.cols * CHAR_W))
      const cellW = fontSize * CHAR_W
      const cellH = fontSize
      let cols = s.cols
      let rows = 0
      let lum: Float32Array
      let rgb: Uint8ClampedArray | null = null
      if (s.source === "donut") {
        rows = Math.round(cols * 0.5)
        lum = donutLum(cols, rows, t * 1.0, t * 0.5)
      } else {
        const media = s.source === "image" ? imgRef.current : videoRef.current
        const mw = s.source === "image" ? imgRef.current?.naturalWidth : videoRef.current?.videoWidth
        const mh = s.source === "image" ? imgRef.current?.naturalHeight : videoRef.current?.videoHeight
        if (!media || !mw || !mh) {
          if (s.source !== "image") raf = requestAnimationFrame(draw)
          else raf = requestAnimationFrame(draw)
          return
        }
        cols = s.cols
        rows = Math.max(1, Math.round(((cols * mh) / mw) * (cellW / cellH)))
        sampler.canvas.width = cols
        sampler.canvas.height = rows
        if (s.source === "camera") {
          sampler.save()
          sampler.scale(-1, 1)
          sampler.drawImage(media, -cols, 0, cols, rows)
          sampler.restore()
        } else sampler.drawImage(media, 0, 0, cols, rows)
        rgb = sampler.getImageData(0, 0, cols, rows).data
        lum = new Float32Array(cols * rows)
        for (let i = 0; i < cols * rows; i++) lum[i] = (rgb[i * 4] * 0.2126 + rgb[i * 4 + 1] * 0.7152 + rgb[i * 4 + 2] * 0.0722) / 255
      }
      canvas.width = Math.round(cols * cellW * devicePixelRatio)
      canvas.height = Math.round(rows * cellH * devicePixelRatio)
      canvas.style.height = `${rows * cellH}px`
      const ctx = canvas.getContext("2d") as CanvasRenderingContext2D
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)
      ctx.fillStyle = s.bg
      ctx.fillRect(0, 0, cols * cellW, rows * cellH)
      ctx.font = `${fontSize}px ${FONT}`
      ctx.textBaseline = "top"
      const outChars: string[] = []
      const outColors: string[] | null = s.colorMode === "mono" ? null : []
      if (s.colorMode === "mono") ctx.fillStyle = s.fg
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const i = y * cols + x
          let l = (lum[i] - 0.5) * cb + 0.5 + bb
          l = Math.max(0, Math.min(1, s.invert ? 1 - l : l))
          const ch = chars[Math.min(chars.length - 1, Math.floor(l * chars.length))]
          outChars.push(ch)
          if (ch === " ") {
            outColors?.push("")
            continue
          }
          if (outColors) {
            let c: string
            if (s.colorMode === "source" && rgb) c = `rgb(${rgb[i * 4]},${rgb[i * 4 + 1]},${rgb[i * 4 + 2]})`
            else c = `rgb(${Math.round(g1[0] + (g2[0] - g1[0]) * l)},${Math.round(g1[1] + (g2[1] - g1[1]) * l)},${Math.round(g1[2] + (g2[2] - g1[2]) * l)})`
            outColors.push(c)
            ctx.fillStyle = c
          }
          ctx.fillText(ch, x * cellW, y * cellH)
        }
      }
      lastFrame.current = { chars: outChars, colors: outColors, cols, rows }
      if (s.source !== "image") raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    const firstSnap = setTimeout(() => takeSnapshot(), 400)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(firstSnap)
    }
  }, [s, boxW, chars, imageSrc, videoSrc])

  function takeSnapshot() {
    const f = lastFrame.current
    if (!f) return
    let text = ""
    let html = ""
    for (let y = 0; y < f.rows; y++) {
      const row = f.chars.slice(y * f.cols, (y + 1) * f.cols)
      text += `${row.join("").replace(/\s+$/, "")}\n`
      if (f.colors) {
        let run = ""
        let runColor = ""
        const flush = () => {
          if (!run) return
          const esc = run.replace(/&/g, "&amp;").replace(/</g, "&lt;")
          html += runColor ? `<span style="color:${runColor}">${esc}</span>` : esc
          run = ""
        }
        row.forEach((ch, x) => {
          const c = f.colors?.[y * f.cols + x] ?? ""
          if (c !== runColor && ch !== " ") {
            flush()
            runColor = c
          }
          run += ch
        })
        flush()
        html += "\n"
      }
    }
    const pre = `<pre style="margin:0;padding:16px;background:${s.bg};color:${s.fg};font:12px/1 ${FONT.replace(/"/g, "'")};letter-spacing:0">`
    setSnapshot({ text, html: `${pre}${f.colors ? html : text.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</pre>` })
  }

  const exportPng = () => {
    const c = canvasRef.current
    if (c) downloadUrl("ascii.png", c.toDataURL("image/png"))
  }

  const outputs = [
    { id: "txt", label: "Text", lang: "text", file: "ascii.txt", code: snapshot.text || "…" },
    { id: "html", label: "HTML", lang: "html", file: "ascii.html", code: snapshot.html.length > 200000 ? `${snapshot.html.slice(0, 200000)}\n…` : snapshot.html },
    { id: "live", label: "JS: video → ASCII", lang: "js", file: "ascii-video.js", code: LIVE_SNIPPET(s, chars) },
  ]

  const controls = (
    <>
      <Section title="Source">
        <ToggleGroup
          variant="outline"
          size="sm"
          spacing={0}
          className="grid w-full grid-cols-4"
          value={[s.source]}
          onValueChange={(v) => {
            if (!v[0]) return
            if (v[0] === "camera") startCamera()
            else set({ source: v[0] as Source })
          }}
        >
          <ToggleGroupItem value="donut" className="text-xs">
            <CircleIcon />
            Torus
          </ToggleGroupItem>
          <ToggleGroupItem value="image" className="text-xs">
            <ImageUpIcon />
            Photo
          </ToggleGroupItem>
          <ToggleGroupItem value="video" className="text-xs">
            <FilmIcon />
            Video
          </ToggleGroupItem>
          <ToggleGroupItem value="camera" className="text-xs">
            <CameraIcon />
            Camera
          </ToggleGroupItem>
        </ToggleGroup>
        {s.source === "image" && (
          <label className="flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed text-xs text-muted-foreground hover:bg-muted/50">
            <ImageUpIcon className="size-4" />
            Choose image
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && setImageSrc(URL.createObjectURL(e.target.files[0]))} />
          </label>
        )}
        {s.source === "video" && (
          <label className="flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed text-xs text-muted-foreground hover:bg-muted/50">
            <FilmIcon className="size-4" />
            {videoSrc ? "Replace video" : "Choose video"}
            <input type="file" accept="video/*" className="sr-only" onChange={(e) => e.target.files?.[0] && setVideoSrc(URL.createObjectURL(e.target.files[0]))} />
          </label>
        )}
        {s.source === "donut" && <SliderField label="Rotation speed" value={s.speed} min={0} max={3} step={0.05} format={(v) => `×${v.toFixed(2)}`} onChange={(speed) => set({ speed })} />}
      </Section>
      <Section title="Symbols">
        <SliderField label="Columns" value={s.cols} min={30} max={260} unit="" onChange={(cols) => set({ cols })} />
        <SelectField
          label="Set"
          value={s.charset}
          options={[
            { value: "standard", label: "Standard" },
            { value: "detailed", label: "Detailed (70)" },
            { value: "blocks", label: "Blocks ░▒▓█" },
            { value: "binary", label: "Binary 01" },
            { value: "dots", label: "Dots ·•●" },
            { value: "slashes", label: "Strokes /\\|" },
            { value: "custom", label: "Custom" },
          ]}
          onChange={(charset) => set({ charset })}
        />
        {s.charset === "custom" && (
          <Field label="Light to dark">
            <Input value={s.custom} onChange={(e) => set({ custom: e.target.value })} className="h-8 font-mono" />
          </Field>
        )}
        <SliderField label="Contrast" value={s.contrast} min={-50} max={200} unit="" onChange={(contrast) => set({ contrast })} />
        <SliderField label="Brightness" value={s.brightness} min={-50} max={50} unit="" onChange={(brightness) => set({ brightness })} />
        <div className="flex items-center justify-between">
          <Label htmlFor="as-inv" className="text-xs">
            Invert
          </Label>
          <Switch id="as-inv" size="sm" checked={s.invert} onCheckedChange={(invert) => set({ invert })} />
        </div>
      </Section>
      <Section title="Color">
        <ToggleGroup variant="outline" size="sm" spacing={0} className="w-full" value={[s.colorMode]} onValueChange={(v) => v[0] && set({ colorMode: v[0] as ColorMode })}>
          <ToggleGroupItem value="mono" className="flex-1 text-xs">
            Mono
          </ToggleGroupItem>
          <ToggleGroupItem value="gradient" className="flex-1 text-xs">
            Gradient
          </ToggleGroupItem>
          <ToggleGroupItem value="source" className="flex-1 text-xs" disabled={s.source === "donut"}>
            From source
          </ToggleGroupItem>
        </ToggleGroup>
        {s.colorMode === "mono" && (
          <Field label="Symbols">
            <ColorInput value={s.fg} compact onChange={(fg) => set({ fg })} />
          </Field>
        )}
        {s.colorMode === "gradient" && (
          <div className="grid grid-cols-2 gap-2">
            <Field label="Dark">
              <ColorInput value={s.g1} compact onChange={(g1) => set({ g1 })} />
            </Field>
            <Field label="Light">
              <ColorInput value={s.g2} compact onChange={(g2) => set({ g2 })} />
            </Field>
          </div>
        )}
        <Field label="Background">
          <ColorInput value={s.bg} compact onChange={(bg) => set({ bg })} />
        </Field>
      </Section>
    </>
  )

  return (
    <ToolLayout
      controls={controls}
      outputs={outputs}
      footer={
        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" size="sm" onClick={takeSnapshot}>
            <RefreshCwIcon />
            Snapshot
          </Button>
          <Button variant="outline" size="sm" onClick={() => snapshot.text && download("ascii.txt", snapshot.text)}>
            .txt
          </Button>
          <Button variant="outline" size="sm" onClick={exportPng}>
            <ImageDownIcon />
            PNG
          </Button>
        </div>
      }
    >
      <div className="flex min-h-full items-center justify-center p-4 md:p-8" style={{ background: s.bg }}>
        <div ref={boxRef} className="w-full max-w-6xl">
          <canvas ref={canvasRef} className="block w-full" />
        </div>
        <video
          ref={videoRef}
          src={s.source === "video" ? (videoSrc ?? undefined) : undefined}
          className="hidden"
          muted
          loop
          autoPlay
          playsInline
        />
      </div>
    </ToolLayout>
  )
}
