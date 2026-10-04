import { useRef } from "react"
import { CameraIcon, DicesIcon, PlusIcon, RotateCcwIcon, XIcon } from "lucide-react"
import { type CanvasApi, runtimeHtml, runtimeModule, runtimeReact } from "@/lib/canvas-runtime"
import { downloadUrl } from "@/lib/clipboard"
import { randomSeed } from "@/lib/random"
import { usePersistent } from "@/lib/use-persistent"
import { ColorInput } from "@/components/color-input"
import { Field, Section, SliderField } from "@/components/fields"
import { RuntimeCanvas } from "@/components/tools/runtime-canvas"
import { ToolLayout } from "@/components/tools/tool-layout"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

const BODY = String.raw`var REBUILD = ["count", "seed", "style", "bg", "scale", "curl", "colors", "colorMode", "width", "length"];
var noise = null, parts = [], cols = [], lines = [];
function field(x, y, t) {
  var n = noise(x * cfg.scale / 1000, y * cfg.scale / 1000, t * cfg.evolve * 0.15);
  return n * Math.PI * 2 * cfg.curl;
}
function colorFor(x, y, ang, k) {
  if (cfg.colorMode === "angle") return paletteAt(cols, (Math.sin(ang) + 1) / 2);
  if (cfg.colorMode === "random") return cols[k % cols.length];
  return paletteAt(cols, (x / W) * 0.7 + (y / H) * 0.3);
}
function spawn(p, r) {
  p.x = r() * W; p.y = r() * H; p.life = 40 + r() * 200; p.k = Math.floor(r() * 1000);
}
function trace() {
  var r = rng(cfg.seed + 7);
  lines = [];
  var seeds = Math.max(20, Math.round(cfg.count / 8));
  for (var i = 0; i < seeds; i++) {
    var x = r() * W, y = r() * H, pts = [[x, y]], k = i;
    for (var s = 0; s < cfg.length; s++) {
      var a = field(x, y, 0);
      x += Math.cos(a) * 2.5; y += Math.sin(a) * 2.5;
      if (x < 0 || y < 0 || x > W || y > H) break;
      pts.push([x, y]);
    }
    if (pts.length > 4) lines.push({ pts: pts, c: colorFor(pts[0][0], pts[0][1], field(pts[0][0], pts[0][1], 0), k) });
  }
}
function setup() {
  noise = makeNoise3(cfg.seed);
  cols = cfg.colors.map(hexRgb);
  var r = rng(cfg.seed);
  parts = [];
  for (var i = 0; i < cfg.count; i++) { var p = {}; spawn(p, r); p.life = r() * 240; parts.push(p); }
  ctx.fillStyle = cfg.bg;
  ctx.fillRect(0, 0, W, H);
  if (cfg.style === "static") {
    trace();
    lines.forEach(function (l) {
      ctx.beginPath();
      ctx.moveTo(l.pts[0][0], l.pts[0][1]);
      for (var i = 1; i < l.pts.length; i++) ctx.lineTo(l.pts[i][0], l.pts[i][1]);
      ctx.strokeStyle = rgbStr(l.c, cfg.opacity);
      ctx.lineWidth = cfg.width;
      ctx.lineCap = "round";
      ctx.stroke();
    });
  }
}
function onResize() { if (noise) setup(); }
var rr = rng(99);
function frame(t, dt) {
  if (cfg.style === "static") return;
  ctx.fillStyle = rgbStr(hexRgb(cfg.bg), 1 - cfg.trail);
  ctx.fillRect(0, 0, W, H);
  ctx.lineWidth = cfg.width;
  ctx.lineCap = "round";
  var mx = mouse.x * W, my = mouse.y * H, R = cfg.radius, act = cfg.mouse !== "none" && mouse.active;
  var step = cfg.flow * 60 * dt;
  for (var i = 0; i < parts.length; i++) {
    var p = parts[i];
    var a = field(p.x, p.y, t);
    var vx = Math.cos(a), vy = Math.sin(a);
    if (act) {
      var dx = p.x - mx, dy = p.y - my, d = Math.sqrt(dx * dx + dy * dy) || 1;
      if (d < R) {
        var f = (1 - d / R) * 2.5;
        if (cfg.mouse === "repel") { vx += (dx / d) * f; vy += (dy / d) * f; }
        else if (cfg.mouse === "attract") { vx -= (dx / d) * f; vy -= (dy / d) * f; }
        else { vx += (-dy / d) * f; vy += (dx / d) * f; }
      }
    }
    var nx = p.x + vx * step, ny = p.y + vy * step;
    ctx.strokeStyle = rgbStr(colorFor(p.x, p.y, a, p.k), cfg.opacity);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(nx, ny);
    ctx.stroke();
    p.x = nx; p.y = ny; p.life -= 1;
    if (p.life <= 0 || p.x < -10 || p.y < -10 || p.x > W + 10 || p.y > H + 10) spawn(p, rr);
  }
}
function toSVG() {
  if (!lines.length) trace();
  var body = lines.map(function (l) {
    return '  <polyline points="' + l.pts.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" ") + '" stroke="' + rgbHex(l.c) + '"/>';
  }).join("\n");
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="xMidYMid slice">\n  <rect width="' + W + '" height="' + H + '" fill="' + cfg.bg + '"/>\n  <g fill="none" stroke-width="' + cfg.width + '" stroke-linecap="round" stroke-opacity="' + cfg.opacity + '">\n' + body + "\n  </g>\n</svg>";
}
`

interface State {
  style: "live" | "static"
  count: number
  scale: number
  curl: number
  flow: number
  evolve: number
  speed: number
  trail: number
  width: number
  opacity: number
  length: number
  colors: string[]
  colorMode: "position" | "angle" | "random"
  bg: string
  mouse: "none" | "repel" | "attract" | "swirl"
  radius: number
  seed: number
}

const DEFAULTS: State = {
  style: "live",
  count: 2500,
  scale: 2.5,
  curl: 1.2,
  flow: 1.4,
  evolve: 1,
  speed: 1,
  trail: 0.94,
  width: 1.2,
  opacity: 0.6,
  length: 120,
  colors: ["#22d3ee", "#a78bfa", "#f472b6", "#fbbf24"],
  colorMode: "position",
  bg: "#0a0a12",
  mouse: "swirl",
  radius: 160,
  seed: 4,
}

const PRESETS: { id: string; name: string; patch: Partial<State> }[] = [
  { id: "aurora", name: "Aurora", patch: { colors: ["#22d3ee", "#a78bfa", "#f472b6", "#fbbf24"], bg: "#0a0a12", colorMode: "position", width: 1.2, trail: 0.94 } },
  { id: "ink", name: "Ink", patch: { colors: ["#111111"], bg: "#f5f0e6", colorMode: "random", width: 0.8, opacity: 0.35, trail: 0.985 } },
  { id: "fire", name: "Flame", patch: { colors: ["#7c2d12", "#ea580c", "#facc15", "#fef9c3"], bg: "#0c0402", colorMode: "angle", width: 1.4 } },
  { id: "ocean", name: "Current", patch: { colors: ["#0c4a6e", "#0ea5e9", "#a5f3fc"], bg: "#020617", colorMode: "angle", curl: 0.8, scale: 1.6 } },
  { id: "silk", name: "Silk", patch: { colors: ["#fda4af", "#fde68a", "#c4b5fd"], bg: "#fffaf5", colorMode: "position", width: 0.6, opacity: 0.25, trail: 0.99 } },
]

export function FlowTool() {
  const [s, set] = usePersistent<State>("lf-tool-flow", DEFAULTS)
  const api = useRef<CanvasApi | null>(null)

  const outputs = [
    { id: "html", label: "Live HTML", lang: "html", file: "flow-field.html", code: runtimeHtml(BODY, s, "Flow field", s.bg) },
    { id: "js", label: "JS module", lang: "js", file: "flowField.js", code: runtimeModule(BODY, s, "flowField") },
    { id: "react", label: "React", lang: "jsx", file: "FlowField.jsx", code: runtimeReact("flowField") },
  ]

  const controls = (
    <>
      <Section
        title="Field"
        action={
          <Button variant="ghost" size="xs" onClick={() => set({ seed: randomSeed() })}>
            <DicesIcon />
            New
          </Button>
        }
      >
        <ToggleGroup variant="outline" size="sm" spacing={0} className="w-full" value={[s.style]} onValueChange={(v) => v[0] && set({ style: v[0] as State["style"] })}>
          <ToggleGroupItem value="live" className="flex-1 text-xs">
            Live particles
          </ToggleGroupItem>
          <ToggleGroupItem value="static" className="flex-1 text-xs">
            Streamlines
          </ToggleGroupItem>
        </ToggleGroup>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button key={p.id} onClick={() => set(p.patch)} className="rounded-md border px-2 py-1 text-xs hover:bg-muted">
              {p.name}
            </button>
          ))}
        </div>
        <SliderField label="Noise scale" value={s.scale} min={0.3} max={10} step={0.1} format={(v) => v.toFixed(1)} onChange={(scale) => set({ scale })} />
        <SliderField label="Vorticity" value={s.curl} min={0.2} max={4} step={0.05} format={(v) => v.toFixed(2)} onChange={(curl) => set({ curl })} />
        {s.style === "live" ? (
          <>
            <SliderField label="Particles" value={s.count} min={200} max={12000} step={100} unit="" onChange={(count) => set({ count })} />
            <SliderField label="Flow speed" value={s.flow} min={0.2} max={5} step={0.1} format={(v) => v.toFixed(1)} onChange={(flow) => set({ flow })} />
            <SliderField label="Field change" value={s.evolve} min={0} max={5} step={0.05} format={(v) => v.toFixed(2)} onChange={(evolve) => set({ evolve })} />
            <SliderField label="Trail length" value={s.trail} min={0.5} max={0.995} step={0.005} format={(v) => `${Math.round(v * 100)}%`} onChange={(trail) => set({ trail })} />
          </>
        ) : (
          <>
            <SliderField label="Lines (×8)" value={s.count} min={200} max={12000} step={100} unit="" onChange={(count) => set({ count })} />
            <SliderField label="Line length" value={s.length} min={10} max={400} unit="" onChange={(length) => set({ length })} />
          </>
        )}
      </Section>
      {s.style === "live" && (
        <Section title="Cursor">
          <ToggleGroup variant="outline" size="sm" spacing={0} className="grid w-full grid-cols-4" value={[s.mouse]} onValueChange={(v) => v[0] && set({ mouse: v[0] as State["mouse"] })}>
            <ToggleGroupItem value="none" className="text-xs">
              None
            </ToggleGroupItem>
            <ToggleGroupItem value="repel" className="text-xs">
              Repel
            </ToggleGroupItem>
            <ToggleGroupItem value="attract" className="text-xs">
              Attract
            </ToggleGroupItem>
            <ToggleGroupItem value="swirl" className="text-xs">
              Vortex
            </ToggleGroupItem>
          </ToggleGroup>
          {s.mouse !== "none" && <SliderField label="Radius" value={s.radius} min={30} max={500} onChange={(radius) => set({ radius })} />}
        </Section>
      )}
      <Section
        title="Color"
        action={
          <Button variant="ghost" size="xs" disabled={s.colors.length >= 6} onClick={() => set({ colors: [...s.colors, "#ffffff"] })}>
            <PlusIcon />
          </Button>
        }
      >
        <ToggleGroup variant="outline" size="sm" spacing={0} className="w-full" value={[s.colorMode]} onValueChange={(v) => v[0] && set({ colorMode: v[0] as State["colorMode"] })}>
          <ToggleGroupItem value="position" className="flex-1 text-xs">
            In place
          </ToggleGroupItem>
          <ToggleGroupItem value="angle" className="flex-1 text-xs">
            By corner
          </ToggleGroupItem>
          <ToggleGroupItem value="random" className="flex-1 text-xs">
            Random
          </ToggleGroupItem>
        </ToggleGroup>
        {s.colors.map((c, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className="flex-1">
              <ColorInput value={c} compact onChange={(v) => set({ colors: s.colors.map((x, j) => (j === i ? v : x)) })} />
            </div>
            <Button variant="ghost" size="icon-xs" disabled={s.colors.length <= 1} onClick={() => set({ colors: s.colors.filter((_, j) => j !== i) })} aria-label="Remove">
              <XIcon />
            </Button>
          </div>
        ))}
        <Field label="Background">
          <ColorInput value={s.bg} compact onChange={(bg) => set({ bg })} />
        </Field>
        <SliderField label="Thickness" value={s.width} min={0.3} max={5} step={0.1} format={(v) => v.toFixed(1)} onChange={(width) => set({ width })} />
        <SliderField label="Opacity" value={s.opacity} min={0.05} max={1} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(opacity) => set({ opacity })} />
      </Section>
    </>
  )

  return (
    <ToolLayout
      controls={controls}
      outputs={outputs}
      footer={
        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" size="sm" onClick={() => api.current?.restart()}>
            <RotateCcwIcon />
            Again
          </Button>
          <Button variant="outline" size="sm" onClick={() => api.current && downloadUrl("flow-field.png", api.current.snapshot())}>
            <CameraIcon />
            PNG
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const svg = api.current?.svg()
              if (svg) downloadUrl("flow-field.svg", URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" })))
            }}
          >
            SVG
          </Button>
        </div>
      }
    >
      <div className="absolute inset-0">
        <RuntimeCanvas body={BODY} config={s} apiRef={api} />
      </div>
    </ToolLayout>
  )
}
