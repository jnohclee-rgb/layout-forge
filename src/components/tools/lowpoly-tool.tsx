import { useRef } from "react"
import { CameraIcon, DicesIcon, PlusIcon, XIcon } from "lucide-react"
import { type CanvasApi, runtimeHtml, runtimeModule, runtimeReact } from "@/lib/canvas-runtime"
import { downloadUrl } from "@/lib/clipboard"
import { randomSeed } from "@/lib/random"
import { usePersistent } from "@/lib/use-persistent"
import { ColorInput } from "@/components/color-input"
import { Field, Section, SliderField } from "@/components/fields"
import { RuntimeCanvas } from "@/components/tools/runtime-canvas"
import { ToolLayout } from "@/components/tools/tool-layout"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

const BODY = String.raw`var REBUILD = ["count", "seed"];
var base = [];
var shapes = [];
function setup() {
  var r = rng(cfg.seed);
  base = [];
  var n = Math.max(8, Math.round(cfg.count));
  var edge = Math.max(3, Math.round(Math.sqrt(n) / 1.4));
  for (var i = 0; i < n; i++) base.push({ x: 0.02 + r() * 0.96, y: 0.02 + r() * 0.96, z: r(), p: r() * 6.283, q: r() * 6.283, s: 0.5 + r(), fixed: false, h: r() * 2 - 1 });
  for (var k = 0; k <= edge; k++) {
    var t = k / edge;
    base.push({ x: t, y: 0, z: r(), fixed: true, h: r() * 2 - 1 }, { x: t, y: 1, z: r(), fixed: true, h: r() * 2 - 1 });
    if (k > 0 && k < edge) base.push({ x: 0, y: t, z: r(), fixed: true, h: r() * 2 - 1 }, { x: 1, y: t, z: r(), fixed: true, h: r() * 2 - 1 });
  }
}
function positions(t) {
  var cell = Math.sqrt((W * H) / base.length);
  return base.map(function (b) {
    if (b.fixed || !cfg.animate) return [b.x * W, b.y * H, b.z];
    return [b.x * W + Math.sin(t * 0.5 * b.s + b.p) * cfg.drift * cell, b.y * H + Math.cos(t * 0.45 * b.s + b.q) * cfg.drift * cell, b.z];
  });
}
function circum(a, b, c) {
  var d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]));
  if (Math.abs(d) < 1e-9) return [0, 0, Infinity];
  var a2 = a[0] * a[0] + a[1] * a[1], b2 = b[0] * b[0] + b[1] * b[1], c2 = c[0] * c[0] + c[1] * c[1];
  var x = (a2 * (b[1] - c[1]) + b2 * (c[1] - a[1]) + c2 * (a[1] - b[1])) / d;
  var y = (a2 * (c[0] - b[0]) + b2 * (a[0] - c[0]) + c2 * (b[0] - a[0])) / d;
  return [x, y, (a[0] - x) * (a[0] - x) + (a[1] - y) * (a[1] - y)];
}
function delaunay(p) {
  var n = p.length, d = Math.max(W, H) * 10;
  var pts = p.concat([[W / 2 - d, H / 2 - d], [W / 2 + d, H / 2 - d], [W / 2, H / 2 + d]]);
  var tris = [[n, n + 1, n + 2, circum(pts[n], pts[n + 1], pts[n + 2])]];
  for (var i = 0; i < n; i++) {
    var x = pts[i][0], y = pts[i][1], edges = {}, keep = [];
    for (var j = 0; j < tris.length; j++) {
      var tr = tris[j], c = tr[3], dx = x - c[0], dy = y - c[1];
      if (dx * dx + dy * dy < c[2]) {
        [[tr[0], tr[1]], [tr[1], tr[2]], [tr[2], tr[0]]].forEach(function (e) {
          var key = e[0] < e[1] ? e[0] + "_" + e[1] : e[1] + "_" + e[0];
          edges[key] = edges[key] ? null : e;
        });
      } else keep.push(tr);
    }
    for (var k in edges) if (edges[k]) keep.push([edges[k][0], edges[k][1], i, circum(pts[edges[k][0]], pts[edges[k][1]], pts[i])]);
    tris = keep;
  }
  return tris.filter(function (t) { return t[0] < n && t[1] < n && t[2] < n; });
}
function clip(poly, px, py, nx, ny) {
  var out = [];
  for (var i = 0; i < poly.length; i++) {
    var a = poly[i], b = poly[(i + 1) % poly.length];
    var da = (a[0] - px) * nx + (a[1] - py) * ny, db = (b[0] - px) * nx + (b[1] - py) * ny;
    if (da <= 0) out.push(a);
    if ((da <= 0) !== (db <= 0)) { var t = da / (da - db); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
  }
  return out;
}
function gradientColor(cols, x, y) {
  var a = cfg.angle * Math.PI / 180;
  var t = ((x / W - 0.5) * Math.cos(a) + (y / H - 0.5) * Math.sin(a)) / (Math.abs(Math.cos(a)) * 0.5 + Math.abs(Math.sin(a)) * 0.5) * 0.5 + 0.5;
  return paletteAt(cols, t);
}
function frame(t) {
  var pts = positions(t);
  var cols = cfg.colors.map(hexRgb);
  var lit = cfg.interactive && mouse.active;
  var lx = lit ? mouse.x * W : W * 0.25, ly = lit ? mouse.y * H : H * 0.15;
  var cell = Math.sqrt((W * H) / base.length);
  shapes = [];
  if (cfg.mode === "voronoi") {
    for (var i = 0; i < pts.length; i++) {
      var s = pts[i];
      var poly = [[0, 0], [W, 0], [W, H], [0, H]];
      var order = [];
      for (var j = 0; j < pts.length; j++) if (j !== i) order.push([j, (pts[j][0] - s[0]) * (pts[j][0] - s[0]) + (pts[j][1] - s[1]) * (pts[j][1] - s[1])]);
      order.sort(function (a, b) { return a[1] - b[1]; });
      for (var o = 0; o < order.length && poly.length; o++) {
        var r2 = 0;
        for (var v = 0; v < poly.length; v++) r2 = Math.max(r2, (poly[v][0] - s[0]) * (poly[v][0] - s[0]) + (poly[v][1] - s[1]) * (poly[v][1] - s[1]));
        if (order[o][1] > 4 * r2) break;
        var q = pts[order[o][0]];
        poly = clip(poly, (s[0] + q[0]) / 2, (s[1] + q[1]) / 2, q[0] - s[0], q[1] - s[1]);
      }
      if (poly.length < 3) continue;
      if (cfg.gap > 0) poly = poly.map(function (v) { var dx = v[0] - s[0], dy = v[1] - s[1], l = Math.sqrt(dx * dx + dy * dy) || 1, k = Math.max(0, 1 - cfg.gap / l); return [s[0] + dx * k, s[1] + dy * k]; });
      var dist = Math.sqrt((s[0] - lx) * (s[0] - lx) + (s[1] - ly) * (s[1] - ly));
      var glow = Math.exp(-(dist * dist) / (2 * Math.pow(Math.max(W, H) * 0.18, 2)));
      var shade = 1 + (s[2] - 0.5) * 0.35 * cfg.depth + glow * cfg.light * 0.6 + base[i].h * cfg.variance;
      var c = gradientColor(cols, s[0], s[1]).map(function (v) { return v * shade; });
      shapes.push({ pts: poly, fill: c });
    }
  } else {
    var tris = delaunay(pts.map(function (p) { return [p[0], p[1]]; }));
    var L = 0;
    for (var ti = 0; ti < tris.length; ti++) {
      var A = pts[tris[ti][0]], B = pts[tris[ti][1]], C = pts[tris[ti][2]];
      var za = (A[2] - 0.5) * cfg.depth * cell, zb = (B[2] - 0.5) * cfg.depth * cell, zc = (C[2] - 0.5) * cfg.depth * cell;
      var ux = B[0] - A[0], uy = B[1] - A[1], uz = zb - za, vx = C[0] - A[0], vy = C[1] - A[1], vz = zc - za;
      var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; }
      var nl = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      var cx = (A[0] + B[0] + C[0]) / 3, cy = (A[1] + B[1] + C[1]) / 3;
      var ldx = lx - cx, ldy = ly - cy, ldz = Math.max(W, H) * 0.5;
      L = Math.sqrt(ldx * ldx + ldy * ldy + ldz * ldz);
      var dot = (nx * ldx + ny * ldy + nz * ldz) / (nl * L);
      var hv = (base[tris[ti][0]].h + base[tris[ti][1]].h + base[tris[ti][2]].h) / 3;
      var shade2 = 1 + (dot - 0.85) * cfg.light * 2.2 + hv * cfg.variance;
      var col = gradientColor(cols, cx, cy).map(function (v) { return v * shade2; });
      shapes.push({ pts: [[A[0], A[1]], [B[0], B[1]], [C[0], C[1]]], fill: col });
    }
  }
  ctx.fillStyle = cfg.bg;
  ctx.fillRect(0, 0, W, H);
  var sc = hexRgb(cfg.strokeColor);
  for (var si = 0; si < shapes.length; si++) {
    var sh = shapes[si];
    ctx.beginPath();
    ctx.moveTo(sh.pts[0][0], sh.pts[0][1]);
    for (var pi = 1; pi < sh.pts.length; pi++) ctx.lineTo(sh.pts[pi][0], sh.pts[pi][1]);
    ctx.closePath();
    ctx.fillStyle = rgbStr(sh.fill);
    ctx.fill();
    if (cfg.stroke > 0) {
      ctx.strokeStyle = rgbStr(sc, cfg.strokeOpacity);
      ctx.lineWidth = cfg.stroke;
      ctx.stroke();
    } else if (cfg.mode !== "voronoi" || cfg.gap === 0) {
      ctx.strokeStyle = rgbStr(sh.fill);
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
  }
}
function toSVG() {
  var sc = hexRgb(cfg.strokeColor);
  var stroke = cfg.stroke > 0 ? ' stroke="' + rgbHex(sc) + '" stroke-opacity="' + cfg.strokeOpacity + '" stroke-width="' + cfg.stroke + '"' : "";
  var body = shapes.map(function (s) {
    var d = "M" + s.pts.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" L") + " Z";
    var fill = rgbHex(s.fill);
    return '  <path d="' + d + '" fill="' + fill + '"' + (stroke || ' stroke="' + fill + '" stroke-width="0.6"') + "/>";
  }).join("\n");
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="xMidYMid slice">\n  <rect width="' + W + '" height="' + H + '" fill="' + cfg.bg + '"/>\n' + body + "\n</svg>";
}
`

interface State {
  mode: "lowpoly" | "voronoi"
  count: number
  colors: string[]
  bg: string
  angle: number
  variance: number
  stroke: number
  strokeColor: string
  strokeOpacity: number
  gap: number
  seed: number
  animate: boolean
  drift: number
  speed: number
  interactive: boolean
  light: number
  depth: number
}

const DEFAULTS: State = {
  mode: "lowpoly",
  count: 140,
  colors: ["#0f172a", "#4338ca", "#db2777", "#f59e0b"],
  bg: "#0f172a",
  angle: 35,
  variance: 0.06,
  stroke: 0,
  strokeColor: "#ffffff",
  strokeOpacity: 0.15,
  gap: 0,
  seed: 21,
  animate: true,
  drift: 0.35,
  speed: 1,
  interactive: true,
  light: 0.6,
  depth: 1.2,
}

const PRESETS: { id: string; name: string; patch: Partial<State> }[] = [
  { id: "night", name: "Night", patch: { colors: ["#0f172a", "#4338ca", "#db2777", "#f59e0b"], bg: "#0f172a", stroke: 0 } },
  { id: "ice", name: "Ice", patch: { colors: ["#e0f2fe", "#7dd3fc", "#0ea5e9", "#1e3a8a"], bg: "#e0f2fe", stroke: 0 } },
  { id: "forest", name: "Forest", patch: { colors: ["#052e16", "#15803d", "#84cc16", "#fef08a"], bg: "#052e16" } },
  { id: "mesh", name: "Frame", patch: { colors: ["#020617", "#0f172a"], bg: "#020617", stroke: 1, strokeColor: "#38bdf8", strokeOpacity: 0.45 } },
  { id: "stained", name: "Stained glass", patch: { mode: "voronoi", colors: ["#f43f5e", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6"], bg: "#111827", gap: 3, variance: 0.15 } },
  { id: "cells", name: "Cells", patch: { mode: "voronoi", colors: ["#fef3c7", "#fdba74", "#f472b6"], bg: "#fff7ed", gap: 6, variance: 0.08, stroke: 0 } },
]

export function LowPolyTool() {
  const [s, set] = usePersistent<State>("lf-tool-lowpoly", DEFAULTS)
  const api = useRef<CanvasApi | null>(null)

  const outputs = [
    { id: "html", label: "Live HTML", lang: "html", file: "lowpoly.html", code: runtimeHtml(BODY, s, "Low-poly", s.bg) },
    { id: "js", label: "JS module", lang: "js", file: "lowpoly.js", code: runtimeModule(BODY, s, "lowpoly") },
    { id: "react", label: "React", lang: "jsx", file: "Lowpoly.jsx", code: runtimeReact("lowpoly") },
  ]

  const controls = (
    <>
      <Section
        title="Mode"
        action={
          <Button variant="ghost" size="xs" onClick={() => set({ seed: randomSeed() })}>
            <DicesIcon />
            New points
          </Button>
        }
      >
        <ToggleGroup variant="outline" size="sm" spacing={0} className="w-full" value={[s.mode]} onValueChange={(v) => v[0] && set({ mode: v[0] as State["mode"] })}>
          <ToggleGroupItem value="lowpoly" className="flex-1 text-xs">
            Low-poly
          </ToggleGroupItem>
          <ToggleGroupItem value="voronoi" className="flex-1 text-xs">
            Voronoi
          </ToggleGroupItem>
        </ToggleGroup>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button key={p.id} onClick={() => set(p.patch)} className="rounded-md border px-2 py-1 text-xs hover:bg-muted">
              {p.name}
            </button>
          ))}
        </div>
        <SliderField label="Points" value={s.count} min={10} max={500} unit="" onChange={(count) => set({ count })} />
        <SliderField label="Relief (depth)" value={s.depth} min={0} max={3} step={0.05} format={(v) => v.toFixed(2)} onChange={(depth) => set({ depth })} />
        <SliderField label="Hue spread" value={s.variance} min={0} max={0.4} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(variance) => set({ variance })} />
        {s.mode === "voronoi" && <SliderField label="Gap between cells" value={s.gap} min={0} max={20} onChange={(gap) => set({ gap })} />}
      </Section>
      <Section title="Motion and interaction">
        <div className="flex items-center justify-between">
          <Label htmlFor="lp-anim" className="text-xs">
            Point drift
          </Label>
          <Switch id="lp-anim" size="sm" checked={s.animate} onCheckedChange={(animate) => set({ animate })} />
        </div>
        {s.animate && (
          <>
            <SliderField label="Amplitude" value={s.drift} min={0} max={1.5} step={0.01} format={(v) => v.toFixed(2)} onChange={(drift) => set({ drift })} />
            <SliderField label="Speed" value={s.speed} min={0.05} max={4} step={0.05} format={(v) => `×${v.toFixed(2)}`} onChange={(speed) => set({ speed })} />
          </>
        )}
        <div className="flex items-center justify-between">
          <Label htmlFor="lp-int" className="text-xs">
            Light follows the cursor
          </Label>
          <Switch id="lp-int" size="sm" checked={s.interactive} onCheckedChange={(interactive) => set({ interactive })} />
        </div>
        <SliderField label="Light intensity" value={s.light} min={0} max={1.5} step={0.01} format={(v) => v.toFixed(2)} onChange={(light) => set({ light })} />
      </Section>
      <Section
        title="Gradient"
        action={
          <Button variant="ghost" size="xs" disabled={s.colors.length >= 6} onClick={() => set({ colors: [...s.colors, "#ffffff"] })}>
            <PlusIcon />
          </Button>
        }
      >
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
        <SliderField label="Angle" value={s.angle} min={0} max={360} unit="°" onChange={(angle) => set({ angle })} />
        <Field label="Background / gaps">
          <ColorInput value={s.bg} compact onChange={(bg) => set({ bg })} />
        </Field>
      </Section>
      <Section title="Stroke">
        <SliderField label="Thickness" value={s.stroke} min={0} max={4} step={0.25} onChange={(stroke) => set({ stroke })} />
        {s.stroke > 0 && (
          <>
            <ColorInput value={s.strokeColor} compact onChange={(strokeColor) => set({ strokeColor })} />
            <SliderField label="Opacity" value={s.strokeOpacity} min={0.05} max={1} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(strokeOpacity) => set({ strokeOpacity })} />
          </>
        )}
      </Section>
    </>
  )

  return (
    <ToolLayout
      controls={controls}
      outputs={outputs}
      footer={
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" onClick={() => api.current && downloadUrl("lowpoly.png", api.current.snapshot())}>
            <CameraIcon />
            PNG
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const svg = api.current?.svg()
              if (svg) downloadUrl("lowpoly.svg", URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" })))
            }}
          >
            Frame SVG
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
