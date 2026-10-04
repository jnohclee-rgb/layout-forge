import { useRef } from "react"
import { CameraIcon, DicesIcon } from "lucide-react"
import { type CanvasApi, runtimeHtml, runtimeModule, runtimeReact } from "@/lib/canvas-runtime"
import { downloadUrl } from "@/lib/clipboard"
import { randomSeed } from "@/lib/random"
import { usePersistent } from "@/lib/use-persistent"
import { cn } from "@/lib/utils"
import { ColorInput } from "@/components/color-input"
import { Field, Section, SliderField } from "@/components/fields"
import { RuntimeCanvas } from "@/components/tools/runtime-canvas"
import { ToolLayout } from "@/components/tools/tool-layout"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

const BODY = String.raw`var REBUILD = ["seed", "pixel"];
var low = document.createElement("canvas"), lctx = low.getContext("2d"), img = null, buf = null, LW = 1, LH = 1;
var noise = null, stars = [], clouds = [];
var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
function u32(c) { return (255 << 24) | (Math.round(c[2]) << 16) | (Math.round(c[1]) << 8) | Math.round(c[0]); }
function onResize() {
  LW = Math.max(16, Math.ceil(W / cfg.pixel));
  LH = Math.max(16, Math.ceil(H / cfg.pixel));
  low.width = LW; low.height = LH;
  img = lctx.createImageData(LW, LH);
  buf = new Uint32Array(img.data.buffer);
}
function setup() {
  onResize();
  noise = makeNoise3(cfg.seed);
  var r = rng(cfg.seed);
  stars = [];
  for (var i = 0; i < 260; i++) stars.push([r(), r() * 0.7, r() * 6.28, r()]);
  clouds = [];
  for (var c = 0; c < 7; c++) clouds.push([r(), 0.08 + r() * 0.35, 0.06 + r() * 0.1, 0.4 + r() * 0.8, r()]);
}
function fbm(x, y) { return noise(x, y, 0) * 0.6 + noise(x * 2.1, y, 1) * 0.28 + noise(x * 4.3, y, 2) * 0.12; }
function set(x, y, v) { if (x >= 0 && y >= 0 && x < LW && y < LH) buf[y * LW + x] = v; }
function frame(t) {
  var sky = cfg.sky.map(hexRgb), horizon = Math.floor(LH * cfg.horizon);
  var px = (mouse.active && cfg.parallax ? (mouse.x - 0.5) : 0) * 30;
  var py = (mouse.active && cfg.parallax ? (mouse.y - 0.5) : 0) * 10;
  for (var y = 0; y < LH; y++) {
    var ty = Math.min(1, y / Math.max(1, horizon + LH * 0.15));
    for (var x = 0; x < LW; x++) {
      var d = cfg.dither ? (BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.5) / cfg.bands : 0;
      var q = Math.max(0, Math.min(1, Math.round((ty + d) * cfg.bands) / cfg.bands));
      buf[y * LW + x] = u32(paletteAt(sky, q));
    }
  }
  if (cfg.stars) {
    for (var s = 0; s < stars.length; s++) {
      var st = stars[s];
      var tw = 0.5 + 0.5 * Math.sin(t * (1 + st[3] * 3) + st[2]);
      if (tw < 0.25) continue;
      var sx = Math.floor((st[0] * LW + px * 0.1 + LW) % LW), sy = Math.floor(st[1] * horizon);
      var b = 150 + tw * 105;
      set(sx, sy, u32([b, b, Math.min(255, b + 20)]));
      if (st[3] > 0.92 && tw > 0.8) { var bb = u32([b * 0.6, b * 0.6, b * 0.7]); set(sx + 1, sy, bb); set(sx - 1, sy, bb); set(sx, sy + 1, bb); set(sx, sy - 1, bb); }
    }
  }
  var sunR = Math.max(2, Math.round(LH * cfg.sunSize)), scx = Math.round(LW / 2 + px * 0.2), scy = Math.round(horizon * cfg.sunY + py * 0.2);
  var sunA = hexRgb(cfg.sun), sunB = hexRgb(cfg.sun2);
  for (var yy = -sunR; yy <= sunR; yy++) {
    var k = (yy + sunR) / (2 * sunR);
    if (cfg.stripes && yy > 0 && yy % Math.max(3, Math.round(sunR / 4)) < 1 + Math.floor((yy / sunR) * 3)) continue;
    var cc = u32(mixRgb(sunA, sunB, k));
    for (var xx = -sunR; xx <= sunR; xx++) if (xx * xx + yy * yy <= sunR * sunR) set(scx + xx, scy + yy, cc);
  }
  if (cfg.clouds) {
    var cloud = u32(hexRgb(cfg.cloud));
    for (var ci = 0; ci < clouds.length; ci++) {
      var cl = clouds[ci];
      var cw = Math.round(cl[2] * LW), ch = Math.max(2, Math.round(cw * 0.28));
      var cxp = Math.round(((cl[0] * LW + t * cl[3] * 3 + px * 0.3) % (LW + cw * 2)) - cw), cyp = Math.round(cl[1] * horizon);
      for (var a = 0; a < 3; a++) {
        var ox = Math.round(cw * (0.2 + a * 0.3)), r0 = Math.round(ch * (a === 1 ? 1 : 0.7));
        for (var y2 = -r0; y2 <= 0; y2++) for (var x2 = -r0 * 2; x2 <= r0 * 2; x2++) if ((x2 * x2) / 4 + y2 * y2 <= r0 * r0) set(cxp + ox + x2, cyp + y2, cloud);
      }
      for (var bx = 0; bx < cw * 1.3; bx++) set(cxp + bx, cyp + 1, cloud);
    }
  }
  var layers = cfg.layers.map(hexRgb), n = layers.length;
  for (var li = 0; li < n; li++) {
    var depth = (li + 1) / n;
    var col = u32(layers[li]), edge = u32(mixRgb(layers[li], [255, 255, 255], 0.15));
    var base = horizon + Math.round(LH * 0.06 * li);
    var amp = LH * (0.22 - li * 0.03);
    var off = t * cfg.scroll * (2 + li * 6) + px * depth;
    if (cfg.scene === "city" && li === n - 1) {
      var win = u32(hexRgb(cfg.window));
      for (var x3 = 0; x3 < LW; x3++) {
        var wx = x3 + Math.floor(off), bw = 7 + (Math.abs(Math.floor(wx / 9)) % 4) * 2, bi = Math.floor(wx / bw);
        var hh = Math.round(LH * 0.12 + Math.abs(noise(bi * 0.71, 3.3, 0)) * LH * 0.32);
        var top = LH - hh + Math.round(py * depth * 0.3);
        for (var y3 = Math.max(0, top); y3 < LH; y3++) {
          var lx = ((wx % bw) + bw) % bw, ly = y3 - top;
          var lit = lx > 1 && lx < bw - 2 && ly > 2 && ly % 4 === 1 && lx % 3 === 0 && Math.sin(bi * 12.9 + ly * 3.1 + Math.floor(t * 0.5 + bi) * 1.7) > 0.1;
          buf[y3 * LW + x3] = lit ? win : col;
        }
      }
      continue;
    }
    for (var x4 = 0; x4 < LW; x4++) {
      var h = cfg.scene === "hills" ? Math.sin((x4 + off) * 0.03 / (li + 1) + li) * 0.5 + fbm((x4 + off) * 0.01, li * 5) * 0.5 : fbm((x4 + off) * (0.012 + li * 0.004), li * 5.7) * 1.4;
      var top2 = Math.round(base - h * amp + py * depth * 0.4);
      for (var y4 = Math.max(0, top2); y4 < LH; y4++) buf[y4 * LW + x4] = y4 === top2 && li < n - 1 ? edge : col;
    }
  }
  lctx.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(low, 0, 0, LW * cfg.pixel, LH * cfg.pixel);
}
`

interface State {
  scene: "mountains" | "hills" | "city"
  pixel: number
  sky: string[]
  bands: number
  dither: boolean
  horizon: number
  sun: string
  sun2: string
  sunSize: number
  sunY: number
  stripes: boolean
  stars: boolean
  clouds: boolean
  cloud: string
  layers: string[]
  window: string
  scroll: number
  speed: number
  parallax: boolean
  seed: number
}

const THEMES: { id: string; name: string; patch: Partial<State> }[] = [
  { id: "sunset", name: "Sunset", patch: { scene: "mountains", sky: ["#2e1065", "#db2777", "#fdba74"], sun: "#fef3c7", sun2: "#fb923c", stripes: false, stars: false, clouds: true, cloud: "#fbcfe8", layers: ["#a21caf", "#6b21a8", "#3b0764", "#1e0533"] } },
  { id: "night", name: "Night", patch: { scene: "mountains", sky: ["#020617", "#1e1b4b", "#3730a3"], sun: "#f1f5f9", sun2: "#cbd5e1", sunSize: 0.06, sunY: 0.35, stripes: false, stars: true, clouds: false, layers: ["#334155", "#1e293b", "#0f172a", "#020617"] } },
  { id: "day", name: "Day", patch: { scene: "hills", sky: ["#0ea5e9", "#7dd3fc", "#e0f2fe"], sun: "#fef9c3", sun2: "#fde047", stripes: false, stars: false, clouds: true, cloud: "#ffffff", layers: ["#bbf7d0", "#4ade80", "#16a34a", "#14532d"] } },
  { id: "synth", name: "Synthwave", patch: { scene: "mountains", sky: ["#0b0221", "#5b0e6b", "#ff2a6d"], sun: "#ffd319", sun2: "#ff2975", sunSize: 0.2, sunY: 0.78, stripes: true, stars: true, clouds: false, layers: ["#3b0a5c", "#22053a", "#0d0221"] } },
  { id: "city", name: "Night city", patch: { scene: "city", sky: ["#0f172a", "#312e81", "#7c3aed"], sun: "#fde68a", sun2: "#f59e0b", sunSize: 0.08, sunY: 0.4, stripes: false, stars: true, clouds: false, layers: ["#4c1d95", "#2e1065", "#0b0b1a"], window: "#fde047" } },
  { id: "dawn", name: "Dawn", patch: { scene: "hills", sky: ["#1e3a8a", "#f472b6", "#fde68a"], sun: "#fffbeb", sun2: "#fdba74", stripes: false, stars: false, clouds: true, cloud: "#fce7f3", layers: ["#c084fc", "#7e22ce", "#4c1d95"] } },
]

const DEFAULTS: State = {
  scene: "mountains",
  pixel: 5,
  sky: ["#2e1065", "#db2777", "#fdba74"],
  bands: 10,
  dither: true,
  horizon: 0.62,
  sun: "#fef3c7",
  sun2: "#fb923c",
  sunSize: 0.14,
  sunY: 0.75,
  stripes: false,
  stars: false,
  clouds: true,
  cloud: "#fbcfe8",
  layers: ["#a21caf", "#6b21a8", "#3b0764", "#1e0533"],
  window: "#fde047",
  scroll: 1,
  speed: 1,
  parallax: true,
  seed: 3,
}

export function PixelTool() {
  const [s, set] = usePersistent<State>("lf-tool-pixel", DEFAULTS)
  const api = useRef<CanvasApi | null>(null)

  const outputs = [
    { id: "html", label: "Live HTML", lang: "html", file: "pixel-scene.html", code: runtimeHtml(BODY, s, "Pixel scene", s.sky[0]) },
    { id: "js", label: "JS module", lang: "js", file: "pixelScene.js", code: runtimeModule(BODY, s, "pixelScene") },
    { id: "react", label: "React", lang: "jsx", file: "PixelScene.jsx", code: runtimeReact("pixelScene") },
  ]

  const controls = (
    <>
      <Section
        title="Scene"
        action={
          <Button variant="ghost" size="xs" onClick={() => set({ seed: randomSeed() })}>
            <DicesIcon />
            New terrain
          </Button>
        }
      >
        <div className="grid grid-cols-3 gap-1.5">
          {THEMES.map((th) => (
            <button
              key={th.id}
              onClick={() => set(th.patch)}
              className={cn("flex h-12 items-end rounded-lg border p-1.5 text-[10px] font-medium text-white shadow-sm")}
              style={{ background: `linear-gradient(${th.patch.sky?.join(",")})`, textShadow: "0 1px 2px #0008" }}
            >
              {th.name}
            </button>
          ))}
        </div>
        <ToggleGroup variant="outline" size="sm" spacing={0} className="w-full" value={[s.scene]} onValueChange={(v) => v[0] && set({ scene: v[0] as State["scene"] })}>
          <ToggleGroupItem value="mountains" className="flex-1 text-xs">
            Mountains
          </ToggleGroupItem>
          <ToggleGroupItem value="hills" className="flex-1 text-xs">
            Hills
          </ToggleGroupItem>
          <ToggleGroupItem value="city" className="flex-1 text-xs">
            City
          </ToggleGroupItem>
        </ToggleGroup>
        <SliderField label="Pixel size" value={s.pixel} min={2} max={12} onChange={(pixel) => set({ pixel })} />
        <SliderField label="Horizon" value={s.horizon} min={0.3} max={0.85} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(horizon) => set({ horizon })} />
      </Section>
      <Section title="Animation">
        <SliderField label="Parallax scroll" value={s.scroll} min={0} max={6} step={0.1} format={(v) => v.toFixed(1)} onChange={(scroll) => set({ scroll })} />
        <SliderField label="Overall speed" value={s.speed} min={0} max={3} step={0.05} format={(v) => `×${v.toFixed(2)}`} onChange={(speed) => set({ speed })} />
        <div className="flex items-center justify-between">
          <Label htmlFor="px-par" className="text-xs">
            Cursor parallax
          </Label>
          <Switch id="px-par" size="sm" checked={s.parallax} onCheckedChange={(parallax) => set({ parallax })} />
        </div>
      </Section>
      <Section title="Sky">
        {s.sky.map((c, i) => (
          <ColorInput key={i} value={c} compact onChange={(v) => set({ sky: s.sky.map((x, j) => (j === i ? v : x)) })} />
        ))}
        <SliderField label="Gradient bands" value={s.bands} min={3} max={32} unit="" onChange={(bands) => set({ bands })} />
        <div className="flex items-center justify-between">
          <Label htmlFor="px-dith" className="text-xs">
            Dithering between bands
          </Label>
          <Switch id="px-dith" size="sm" checked={s.dither} onCheckedChange={(dither) => set({ dither })} />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="px-stars" className="text-xs">
            Stars
          </Label>
          <Switch id="px-stars" size="sm" checked={s.stars} onCheckedChange={(stars) => set({ stars })} />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="px-cl" className="text-xs">
            Clouds
          </Label>
          <Switch id="px-cl" size="sm" checked={s.clouds} onCheckedChange={(clouds) => set({ clouds })} />
        </div>
        {s.clouds && <ColorInput value={s.cloud} compact onChange={(cloud) => set({ cloud })} />}
      </Section>
      <Section title="Sun / moon">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Top">
            <ColorInput value={s.sun} compact onChange={(sun) => set({ sun })} />
          </Field>
          <Field label="Bottom">
            <ColorInput value={s.sun2} compact onChange={(sun2) => set({ sun2 })} />
          </Field>
        </div>
        <SliderField label="Size" value={s.sunSize} min={0.02} max={0.35} step={0.01} format={(v) => v.toFixed(2)} onChange={(sunSize) => set({ sunSize })} />
        <SliderField label="Height" value={s.sunY} min={0.1} max={1.1} step={0.01} format={(v) => v.toFixed(2)} onChange={(sunY) => set({ sunY })} />
        <div className="flex items-center justify-between">
          <Label htmlFor="px-str" className="text-xs">
            Stripes (retro sun)
          </Label>
          <Switch id="px-str" size="sm" checked={s.stripes} onCheckedChange={(stripes) => set({ stripes })} />
        </div>
      </Section>
      <Section title="Relief layers (far → near)">
        {s.layers.map((c, i) => (
          <ColorInput key={i} value={c} compact onChange={(v) => set({ layers: s.layers.map((x, j) => (j === i ? v : x)) })} />
        ))}
        {s.scene === "city" && (
          <Field label="Windows">
            <ColorInput value={s.window} compact onChange={(window) => set({ window })} />
          </Field>
        )}
      </Section>
    </>
  )

  return (
    <ToolLayout
      controls={controls}
      outputs={outputs}
      footer={
        <Button variant="outline" size="sm" onClick={() => api.current && downloadUrl("pixel-scene.png", api.current.snapshot())}>
          <CameraIcon />
          PNG snapshot
        </Button>
      }
    >
      <div className="absolute inset-0 bg-black">
        <RuntimeCanvas body={BODY} config={s} apiRef={api} className="[image-rendering:pixelated]" />
      </div>
    </ToolLayout>
  )
}
