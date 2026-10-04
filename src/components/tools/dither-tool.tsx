import { useEffect, useMemo, useRef, useState } from "react"
import { ImageDownIcon, ImageUpIcon } from "lucide-react"
import { downloadUrl } from "@/lib/clipboard"
import { sampleImage } from "@/lib/sample-image"
import { usePersistent } from "@/lib/use-persistent"
import { cn } from "@/lib/utils"
import { ColorInput } from "@/components/color-input"
import { Section, SelectField, SliderField } from "@/components/fields"
import { ToolLayout } from "@/components/tools/tool-layout"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

const DITHER_SRC = String.raw`function dither(src, opts) {
  var w = src.width, h = src.height, d = src.data;
  var pal = opts.palette.map(function (hex) { var v = parseInt(hex.slice(1), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; });
  pal.sort(function (a, b) { return (a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722) - (b[0] * 0.2126 + b[1] * 0.7152 + b[2] * 0.0722); });
  var n = pal.length, lum = new Float32Array(w * h);
  var c = (opts.contrast + 100) / 100, b = opts.brightness / 100;
  for (var i = 0; i < w * h; i++) {
    var l = (d[i * 4] * 0.2126 + d[i * 4 + 1] * 0.7152 + d[i * 4 + 2] * 0.0722) / 255;
    l = (l - 0.5) * c + 0.5 + b + (opts.bias || 0);
    lum[i] = Math.max(0, Math.min(1, opts.invert ? 1 - l : l));
  }
  var out = new ImageData(w, h), o = out.data;
  function put(i, k) { var p = pal[Math.max(0, Math.min(n - 1, k))]; o[i * 4] = p[0]; o[i * 4 + 1] = p[1]; o[i * 4 + 2] = p[2]; o[i * 4 + 3] = 255; }
  var algo = opts.algorithm;
  if (algo === "threshold" || algo.indexOf("bayer") === 0) {
    var size = algo === "bayer2" ? 2 : algo === "bayer8" ? 8 : 4;
    var M = [[0]];
    while (M.length < size) {
      var s = M.length, N = [];
      for (var y = 0; y < s * 2; y++) { N.push([]); for (var x = 0; x < s * 2; x++) N[y].push(4 * M[y % s][x % s] + [[0, 2], [3, 1]][Math.floor(y / s)][Math.floor(x / s)]); }
      M = N;
    }
    var area = size * size;
    for (var y2 = 0; y2 < h; y2++) for (var x2 = 0; x2 < w; x2++) {
      var i2 = y2 * w + x2;
      var t = algo === "threshold" ? 0.5 : (M[y2 % size][x2 % size] + 0.5) / area;
      put(i2, Math.floor(lum[i2] * (n - 1) + t));
    }
    return out;
  }
  var kernels = {
    floyd: [[1, 0, 7 / 16], [-1, 1, 3 / 16], [0, 1, 5 / 16], [1, 1, 1 / 16]],
    atkinson: [[1, 0, 1 / 8], [2, 0, 1 / 8], [-1, 1, 1 / 8], [0, 1, 1 / 8], [1, 1, 1 / 8], [0, 2, 1 / 8]],
    sierra: [[1, 0, 2 / 4], [-1, 1, 1 / 4], [0, 1, 1 / 4]]
  };
  var K = kernels[algo] || kernels.floyd;
  for (var y3 = 0; y3 < h; y3++) for (var x3 = 0; x3 < w; x3++) {
    var i3 = y3 * w + x3, v = lum[i3];
    var k = Math.round(Math.max(0, Math.min(1, v)) * (n - 1));
    var err = v - k / (n - 1 || 1);
    put(i3, k);
    for (var e = 0; e < K.length; e++) {
      var xx = x3 + K[e][0], yy = y3 + K[e][1];
      if (xx >= 0 && xx < w && yy < h) lum[yy * w + xx] += err * K[e][2];
    }
  }
  return out;
}
`

const ditherFn = new Function(`${DITHER_SRC}; return dither;`)() as (src: ImageData, opts: object) => ImageData

type Algo = "threshold" | "bayer2" | "bayer4" | "bayer8" | "floyd" | "atkinson" | "sierra" | "halftone" | "lines"

const ALGOS: { value: Algo; label: string }[] = [
  { value: "floyd", label: "Floyd–Steinberg" },
  { value: "atkinson", label: "Atkinson (Mac)" },
  { value: "sierra", label: "Sierra Lite" },
  { value: "bayer2", label: "Bayer 2×2" },
  { value: "bayer4", label: "Bayer 4×4" },
  { value: "bayer8", label: "Bayer 8×8" },
  { value: "threshold", label: "Threshold" },
  { value: "halftone", label: "Halftone: dots" },
  { value: "lines", label: "Halftone: lines" },
]

const PALETTES: { id: string; name: string; colors: string[] }[] = [
  { id: "mono", name: "B/W", colors: ["#000000", "#ffffff"] },
  { id: "gameboy", name: "Game Boy", colors: ["#0f380f", "#306230", "#8bac0f", "#9bbc0f"] },
  { id: "mac", name: "Mac Paint", colors: ["#1a1a1a", "#f4f1e8"] },
  { id: "sepia", name: "Sepia", colors: ["#2b1d0e", "#7a5230", "#c9a27a", "#f3e6d0"] },
  { id: "synth", name: "Synth", colors: ["#120458", "#7a04eb", "#ff2a6d", "#fdf500"] },
  { id: "blueprint", name: "Blueprint", colors: ["#0b3d91", "#e8f1ff"] },
  { id: "risograph", name: "Risograph", colors: ["#1d1f73", "#ff48b0", "#fff7e6"] },
]

interface State {
  algorithm: Algo
  scale: number
  palette: string[]
  brightness: number
  contrast: number
  invert: boolean
  cell: number
  angle: number
  animate: boolean
  lens: boolean
}

const DEFAULTS: State = {
  algorithm: "atkinson",
  scale: 3,
  palette: ["#1a1a1a", "#f4f1e8"],
  brightness: 0,
  contrast: 10,
  invert: false,
  cell: 8,
  angle: 45,
  animate: false,
  lens: true,
}

function halftone(src: ImageData, s: State, angleDeg: number, scaleUp: number): { canvas: HTMLCanvasElement; svg: string } {
  const w = src.width * scaleUp
  const h = src.height * scaleUp
  const c = document.createElement("canvas")
  c.width = w
  c.height = h
  const ctx = c.getContext("2d") as CanvasRenderingContext2D
  const pal = [...s.palette].sort((a, b) => lumHex(a) - lumHex(b))
  const dark = pal[0]
  const light = pal[pal.length - 1]
  ctx.fillStyle = s.invert ? dark : light
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = s.invert ? light : dark
  ctx.strokeStyle = s.invert ? light : dark
  const cell = s.cell * scaleUp
  const a = (angleDeg * Math.PI) / 180
  const cos = Math.cos(a)
  const sin = Math.sin(a)
  const diag = Math.hypot(w, h)
  const cb = (s.contrast + 100) / 100
  const bb = s.brightness / 100
  const sample = (x: number, y: number) => {
    const sx = Math.min(src.width - 1, Math.max(0, Math.floor(x / scaleUp)))
    const sy = Math.min(src.height - 1, Math.max(0, Math.floor(y / scaleUp)))
    const i = (sy * src.width + sx) * 4
    const l = (src.data[i] * 0.2126 + src.data[i + 1] * 0.7152 + src.data[i + 2] * 0.0722) / 255
    return Math.max(0, Math.min(1, (l - 0.5) * cb + 0.5 + bb))
  }
  const dots: string[] = []
  for (let v = -diag; v < diag; v += cell) {
    if (s.algorithm === "lines") {
      ctx.beginPath()
      for (let u = -diag; u < diag; u += cell / 3) {
        const x = w / 2 + u * cos - v * sin
        const y = h / 2 + u * sin + v * cos
        if (x < -cell || y < -cell || x > w + cell || y > h + cell) continue
        const t = (1 - sample(x, y)) * cell * 0.9
        ctx.lineWidth = Math.max(0.2, t)
        ctx.lineTo(x, y)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(x, y)
      }
      continue
    }
    for (let u = -diag; u < diag; u += cell) {
      const x = w / 2 + u * cos - v * sin
      const y = h / 2 + u * sin + v * cos
      if (x < -cell || y < -cell || x > w + cell || y > h + cell) continue
      const r = (cell / 2) * Math.sqrt(1 - sample(x, y)) * 1.25
      if (r < 0.3) continue
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
      if (dots.length < 40000) dots.push(`<circle cx="${(x / scaleUp).toFixed(1)}" cy="${(y / scaleUp).toFixed(1)}" r="${(r / scaleUp).toFixed(2)}"/>`)
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${src.width} ${src.height}">\n  <rect width="${src.width}" height="${src.height}" fill="${s.invert ? dark : light}"/>\n  <g fill="${s.invert ? light : dark}">\n    ${dots.join("\n    ")}\n  </g>\n</svg>`
  return { canvas: c, svg }
}

function lumHex(h: string) {
  const v = parseInt(h.slice(1), 16)
  return ((v >> 16) & 255) * 0.2126 + ((v >> 8) & 255) * 0.7152 + (v & 255) * 0.0722
}

export function DitherTool() {
  const [s, set] = usePersistent<State>("lf-tool-dither", DEFAULTS)
  const [src, setSrc] = useState(() => sampleImage())
  const [source, setSource] = useState<ImageData | null>(null)
  const [lens, setLens] = useState<{ x: number; y: number } | null>(null)
  const [svg, setSvg] = useState("")
  const outRef = useRef<HTMLCanvasElement>(null)
  const raster = s.algorithm === "halftone" || s.algorithm === "lines"
  const scale = raster ? 1 : s.scale

  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      const maxW = 1200
      const w = Math.min(maxW, img.naturalWidth)
      const h = Math.round((w * img.naturalHeight) / img.naturalWidth)
      const c = document.createElement("canvas")
      c.width = w
      c.height = h
      const ctx = c.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D
      ctx.drawImage(img, 0, 0, w, h)
      setSource(ctx.getImageData(0, 0, w, h))
    }
    img.src = src
  }, [src])

  const small = useMemo(() => {
    if (!source) return null
    const w = Math.max(8, Math.round(source.width / scale))
    const h = Math.max(8, Math.round(source.height / scale))
    const c = document.createElement("canvas")
    c.width = source.width
    c.height = source.height
    c.getContext("2d")?.putImageData(source, 0, 0)
    const d = document.createElement("canvas")
    d.width = w
    d.height = h
    const dctx = d.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D
    dctx.drawImage(c, 0, 0, w, h)
    return dctx.getImageData(0, 0, w, h)
  }, [source, scale])

  useEffect(() => {
    if (!small || !outRef.current) return
    let raf = 0
    const start = performance.now()
    const render = () => {
      const t = (performance.now() - start) / 1000
      const out = outRef.current
      if (!out) return
      if (raster) {
        const { canvas, svg: svgText } = halftone(small, s, s.angle + (s.animate ? t * 12 : 0), 1)
        out.width = canvas.width
        out.height = canvas.height
        out.getContext("2d")?.drawImage(canvas, 0, 0)
        if (!s.animate) setSvg(svgText)
      } else {
        const res = ditherFn(small, { ...s, bias: s.animate ? Math.sin(t * 1.4) * 0.18 : 0 })
        out.width = res.width
        out.height = res.height
        out.getContext("2d")?.putImageData(res, 0, 0)
      }
      if (s.animate) raf = requestAnimationFrame(render)
    }
    render()
    return () => cancelAnimationFrame(raf)
  }, [small, s, raster])

  const exportPng = () => {
    const out = outRef.current
    if (!out) return
    const c = document.createElement("canvas")
    const k = raster ? 1 : scale
    c.width = out.width * k
    c.height = out.height * k
    const ctx = c.getContext("2d") as CanvasRenderingContext2D
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(out, 0, 0, c.width, c.height)
    downloadUrl(`dither-${s.algorithm}.png`, c.toDataURL("image/png"))
  }

  const outputs = [
    {
      id: "js",
      label: "JS function",
      lang: "js",
      file: "dither.js",
      code: `${DITHER_SRC}\nconst canvas = document.querySelector("canvas")\nconst ctx = canvas.getContext("2d")\nconst result = dither(ctx.getImageData(0, 0, canvas.width, canvas.height), ${JSON.stringify(
        { algorithm: raster ? "floyd" : s.algorithm, palette: s.palette, brightness: s.brightness, contrast: s.contrast, invert: s.invert },
        null,
        2,
      )})\nctx.putImageData(result, 0, 0)\n`,
    },
    { id: "css", label: "CSS", lang: "css", file: "pixelated.css", code: `.dithered {\n  image-rendering: pixelated;\n  image-rendering: crisp-edges;\n}\n` },
    ...(raster && svg ? [{ id: "svg", label: "Halftone SVG", lang: "html", file: "halftone.svg", code: svg.length > 60000 ? `${svg.slice(0, 60000)}\n…` : svg }] : []),
  ]

  const controls = (
    <>
      <Section title="Image">
        <label
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const f = e.dataTransfer.files[0]
            if (f) setSrc(URL.createObjectURL(f))
          }}
          className="flex h-14 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-xs text-muted-foreground hover:bg-muted/50"
        >
          <ImageUpIcon className="size-4" />
          Drop or choose a photo
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && setSrc(URL.createObjectURL(e.target.files[0]))} />
        </label>
      </Section>
      <Section title="Algorithm">
        <SelectField label="Method" value={s.algorithm} options={ALGOS} onChange={(v) => set({ algorithm: v as Algo })} />
        {raster ? (
          <>
            <SliderField label="Halftone step" value={s.cell} min={3} max={30} onChange={(cell) => set({ cell })} />
            <SliderField label="Angle" value={s.angle} min={0} max={180} unit="°" onChange={(angle) => set({ angle })} />
          </>
        ) : (
          <SliderField label="Pixel size" value={s.scale} min={1} max={12} unit="×" onChange={(scale) => set({ scale })} />
        )}
        <SliderField label="Brightness" value={s.brightness} min={-50} max={50} unit="" onChange={(brightness) => set({ brightness })} />
        <SliderField label="Contrast" value={s.contrast} min={-50} max={150} unit="" onChange={(contrast) => set({ contrast })} />
        <div className="flex items-center justify-between">
          <Label htmlFor="dt-inv" className="text-xs">
            Invert
          </Label>
          <Switch id="dt-inv" size="sm" checked={s.invert} onCheckedChange={(invert) => set({ invert })} />
        </div>
      </Section>
      <Section title="Palette">
        <div className="flex flex-wrap gap-1.5">
          {PALETTES.map((p) => (
            <button
              key={p.id}
              onClick={() => set({ palette: p.colors })}
              className={cn("flex items-center gap-1 rounded-md border py-1 pr-2 pl-1 text-xs hover:bg-muted", JSON.stringify(p.colors) === JSON.stringify(s.palette) && "border-primary")}
            >
              <span className="flex">
                {p.colors.map((c) => (
                  <span key={c} className="size-3" style={{ background: c }} />
                ))}
              </span>
              {p.name}
            </button>
          ))}
        </div>
        {s.palette.map((c, i) => (
          <ColorInput key={i} value={c} compact onChange={(v) => set({ palette: s.palette.map((x, j) => (j === i ? v : x)) })} />
        ))}
      </Section>
      <Section title="Animation and interaction">
        <div className="flex items-center justify-between">
          <Label htmlFor="dt-anim" className="text-xs">
            {raster ? "Rotate halftone" : "Threshold pulse"}
          </Label>
          <Switch id="dt-anim" size="sm" checked={s.animate} onCheckedChange={(animate) => set({ animate })} />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="dt-lens" className="text-xs">
            Magnifier with the original under the cursor
          </Label>
          <Switch id="dt-lens" size="sm" checked={s.lens} onCheckedChange={(lens) => set({ lens })} />
        </div>
      </Section>
    </>
  )

  return (
    <ToolLayout
      controls={controls}
      outputs={outputs}
      footer={
        <Button size="sm" onClick={exportPng}>
          <ImageDownIcon />
          Download PNG
        </Button>
      }
    >
      <div className="flex min-h-full items-center justify-center p-4 md:p-10">
        <div
          className="relative w-full max-w-5xl overflow-hidden rounded-xl shadow-xl ring-1 ring-foreground/10"
          onPointerMove={(e) => {
            if (!s.lens) return
            const r = e.currentTarget.getBoundingClientRect()
            setLens({ x: e.clientX - r.left, y: e.clientY - r.top })
          }}
          onPointerLeave={() => setLens(null)}
        >
          <canvas ref={outRef} className="block h-auto w-full [image-rendering:pixelated]" />
          {s.lens && lens && (
            <>
              <img src={src} alt="" className="pointer-events-none absolute inset-0 size-full" style={{ clipPath: `circle(90px at ${lens.x}px ${lens.y}px)` }} />
              <span className="pointer-events-none absolute size-[180px] -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white/80" style={{ left: lens.x, top: lens.y }} />
            </>
          )}
        </div>
      </div>
    </ToolLayout>
  )
}
