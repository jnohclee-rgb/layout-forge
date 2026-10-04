import { useRef } from "react"
import { CameraIcon, DicesIcon, PlusIcon, RotateCcwIcon, XIcon } from "lucide-react"
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

const BODY = String.raw`var REBUILD = ["mode", "count", "seed", "colors", "gap", "size"];
var P = [], cols = [], R = null, sprites = {}, drops = [], gridPts = [], fs = 14;
var KANA = "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789".split("");
function sprite(c) {
  var k = c.join(",");
  if (sprites[k]) return sprites[k];
  var s = 64, cv = document.createElement("canvas");
  cv.width = s; cv.height = s;
  var g = cv.getContext("2d"), gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  gr.addColorStop(0, rgbStr(c, 1)); gr.addColorStop(0.25, rgbStr(c, 0.55)); gr.addColorStop(1, rgbStr(c, 0));
  g.fillStyle = gr; g.fillRect(0, 0, s, s);
  sprites[k] = cv;
  return cv;
}
function spawn(p, init) {
  var m = cfg.mode, z = R();
  p.z = z; p.ph = R() * 6.283; p.c = cols[Math.floor(R() * cols.length)]; p.k = R();
  p.x = R() * W; p.y = init ? R() * H : (m === "snow" || m === "rain" || m === "confetti" ? -20 : H + 20);
  p.vx = 0; p.vy = 0; p.bx = 0; p.by = 0; p.life = 1; p.rot = R() * 6.283; p.vr = (R() - 0.5) * 6;
  if (m === "snow") { p.s = (0.7 + z * 2.6) * cfg.size; p.by = 25 + 55 * z; p.bx = (R() - 0.5) * 10; }
  else if (m === "rain") { p.s = (10 + 18 * z) * cfg.size; p.by = 650 + 500 * z; p.x = R() * (W + 300) - 150; }
  else if (m === "fireflies") { p.s = (7 + 15 * z) * cfg.size; p.x = R() * W; p.y = R() * H; p.bx = (R() - 0.5) * 14; p.by = (R() - 0.5) * 14; }
  else if (m === "confetti") { p.s = (5 + 5 * z) * cfg.size; p.by = 70 + 130 * z; p.bx = (R() - 0.5) * 40; }
  else if (m === "bubbles") { p.s = (6 + 30 * z * z) * cfg.size; p.by = -(15 + 55 * (1 - z)); p.bx = (R() - 0.5) * 8; }
  else if (m === "constellation") { p.s = (1 + R() * 1.6) * cfg.size; p.x = R() * W; p.y = R() * H; p.bx = (R() - 0.5) * 36; p.by = (R() - 0.5) * 36; }
  else if (m === "stars") { p.x = R() * 2 - 1; p.y = R() * 2 - 1; p.z = init ? R() : 1; p.pz = p.z; }
  else if (m === "embers") { p.s = (1 + R() * 3) * cfg.size; p.by = -(30 + 100 * R()); p.bx = (R() - 0.5) * 30; p.life = 0.4 + R() * 0.6; p.max = p.life; if (init) p.y = R() * H; }
  p.vx = p.bx; p.vy = p.by;
}
function setup() {
  R = rng(cfg.seed);
  cols = cfg.colors.map(hexRgb);
  P = []; drops = []; gridPts = [];
  var m = cfg.mode;
  if (m === "matrix") {
    fs = Math.max(8, Math.round(cfg.size * 14));
    var n = Math.ceil(W / fs) + 1;
    for (var i = 0; i < n; i++) drops.push({ y: R() * H, v: 6 + R() * 14, acc: 0 });
  } else if (m === "grid") {
    var cell = Math.max(10, cfg.gap), cx = Math.ceil(W / cell) + 1, cy = Math.ceil(H / cell) + 1;
    for (var a = 0; a < cx; a++) for (var b = 0; b < cy; b++) gridPts.push({ x: a * cell + (W - (cx - 1) * cell) / 2, y: b * cell + (H - (cy - 1) * cell) / 2, ox: 0, oy: 0 });
  } else {
    for (var j = 0; j < Math.round(cfg.count); j++) { var p = {}; spawn(p, true); P.push(p); }
  }
  ctx.fillStyle = cfg.transparent ? "rgba(0,0,0,0)" : cfg.bg;
  ctx.clearRect(0, 0, W, H);
  if (!cfg.transparent) ctx.fillRect(0, 0, W, H);
}
function onResize() { if (R) setup(); }
function frame(t, dt) {
  var m = cfg.mode, sp = cfg.speed, d = dt * sp;
  var mx = mouse.x * W, my = mouse.y * H, act = cfg.mouse !== "none" && mouse.active, rad = cfg.radius;
  var trailing = m === "stars" || m === "embers" || m === "matrix" || m === "fireflies";
  if (cfg.transparent) ctx.clearRect(0, 0, W, H);
  else { ctx.fillStyle = rgbStr(hexRgb(cfg.bg), trailing ? Math.max(0.04, 1 - cfg.trail) : 1); ctx.fillRect(0, 0, W, H); }
  function force(p) {
    if (!act) return;
    var dx = p.x - mx, dy = p.y - my, d2 = dx * dx + dy * dy;
    if (d2 > rad * rad || d2 < 1) return;
    var dd = Math.sqrt(d2), f = (1 - dd / rad) * 900 * dt, nx = dx / dd, ny = dy / dd;
    if (cfg.mouse === "repel") { p.vx += nx * f; p.vy += ny * f; }
    else if (cfg.mouse === "attract") { p.vx -= nx * f; p.vy -= ny * f; }
    else { p.vx += -ny * f; p.vy += nx * f; }
  }
  function relax(p) {
    var k = Math.min(1, dt * 1.6);
    p.vx += (p.bx + cfg.wind - p.vx) * k;
    p.vy += (p.by - p.vy) * k;
  }
  if (m === "snow") {
    for (var i = 0; i < P.length; i++) {
      var p = P[i];
      force(p); relax(p);
      p.x += (p.vx + Math.sin(t * 0.8 + p.ph) * 14 * p.z) * d; p.y += p.vy * d;
      if (p.y > H + 10 || p.x < -20 || p.x > W + 20) { spawn(p, false); if (cfg.wind > 0) p.x = R() * W - 40; }
      ctx.fillStyle = rgbStr(p.c, 0.35 + 0.65 * p.z);
      ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, 6.283); ctx.fill();
    }
  } else if (m === "rain") {
    ctx.lineCap = "round";
    for (var r = 0; r < P.length; r++) {
      var q = P[r];
      q.x += (q.vx + cfg.wind * 2) * d; q.y += q.by * d;
      var sl = cfg.wind * 2 / q.by;
      if (q.y > H + 20) spawn(q, false);
      ctx.strokeStyle = rgbStr(q.c, 0.25 + 0.5 * q.z);
      ctx.lineWidth = Math.max(0.6, q.z * 1.4 * cfg.size);
      ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x - sl * q.s, q.y - q.s); ctx.stroke();
      if (q.y > H - 4 && q.z > 0.6) { ctx.strokeStyle = rgbStr(q.c, 0.3); ctx.beginPath(); ctx.ellipse(q.x, H - 2, 6 * q.z, 1.6, 0, 0, 6.283); ctx.stroke(); }
    }
  } else if (m === "fireflies") {
    ctx.globalCompositeOperation = "lighter";
    for (var f = 0; f < P.length; f++) {
      var fp = P[f];
      fp.bx += (Math.sin(t * 0.6 + fp.ph * 3) * 10 - fp.bx) * dt * 0.8; fp.by += (Math.cos(t * 0.5 + fp.ph * 2) * 10 - fp.by) * dt * 0.8;
      force(fp); relax(fp);
      fp.x += fp.vx * d; fp.y += fp.vy * d;
      if (fp.x < -20) fp.x = W + 20; if (fp.x > W + 20) fp.x = -20; if (fp.y < -20) fp.y = H + 20; if (fp.y > H + 20) fp.y = -20;
      var pulse = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * (1 + fp.k * 2) + fp.ph));
      ctx.globalAlpha = pulse;
      var sz = fp.s * 3.2;
      ctx.drawImage(sprite(fp.c), fp.x - sz / 2, fp.y - sz / 2, sz, sz);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  } else if (m === "confetti") {
    for (var c = 0; c < P.length; c++) {
      var cp = P[c];
      force(cp); relax(cp);
      cp.x += (cp.vx + Math.sin(t + cp.ph) * 30) * d; cp.y += cp.vy * d; cp.rot += cp.vr * d;
      if (cp.y > H + 20) spawn(cp, false);
      ctx.save(); ctx.translate(cp.x, cp.y); ctx.rotate(cp.rot);
      ctx.scale(1, Math.cos(t * 2 + cp.ph));
      ctx.fillStyle = rgbStr(cp.c, 0.9);
      if (cp.k < 0.3) { ctx.beginPath(); ctx.arc(0, 0, cp.s * 0.5, 0, 6.283); ctx.fill(); }
      else ctx.fillRect(-cp.s, -cp.s * 0.5, cp.s * 2, cp.s);
      ctx.restore();
    }
  } else if (m === "bubbles") {
    for (var b = 0; b < P.length; b++) {
      var bp = P[b];
      force(bp); relax(bp);
      bp.x += (bp.vx + Math.sin(t * 0.9 + bp.ph) * 12) * d; bp.y += bp.vy * d;
      if (bp.y < -bp.s * 2) spawn(bp, false);
      var grd = ctx.createRadialGradient(bp.x - bp.s * 0.3, bp.y - bp.s * 0.3, bp.s * 0.05, bp.x, bp.y, bp.s);
      grd.addColorStop(0, rgbStr([255, 255, 255], 0.55)); grd.addColorStop(0.5, rgbStr(bp.c, 0.08)); grd.addColorStop(1, rgbStr(bp.c, 0.3));
      ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(bp.x, bp.y, bp.s, 0, 6.283); ctx.fill();
      ctx.strokeStyle = rgbStr(bp.c, 0.55); ctx.lineWidth = 1; ctx.stroke();
    }
  } else if (m === "constellation") {
    var L = cfg.link, L2 = L * L;
    for (var n = 0; n < P.length; n++) {
      var np = P[n];
      force(np); relax(np);
      np.x += np.vx * d; np.y += np.vy * d;
      if (np.x < -10) np.x = W + 10; if (np.x > W + 10) np.x = -10; if (np.y < -10) np.y = H + 10; if (np.y > H + 10) np.y = -10;
    }
    ctx.lineWidth = 1;
    for (var a = 0; a < P.length; a++) {
      var pa = P[a];
      for (var e = a + 1; e < P.length; e++) {
        var pe = P[e], ddx = pa.x - pe.x, ddy = pa.y - pe.y, dd2 = ddx * ddx + ddy * ddy;
        if (dd2 < L2) { ctx.strokeStyle = rgbStr(pa.c, (1 - Math.sqrt(dd2) / L) * 0.55); ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pe.x, pe.y); ctx.stroke(); }
      }
      if (mouse.active) {
        var ex = pa.x - mx, ey = pa.y - my, e2 = ex * ex + ey * ey, ml = L * 1.4;
        if (e2 < ml * ml) { ctx.strokeStyle = rgbStr(pa.c, (1 - Math.sqrt(e2) / ml) * 0.8); ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(mx, my); ctx.stroke(); }
      }
      ctx.fillStyle = rgbStr(pa.c, 0.9); ctx.beginPath(); ctx.arc(pa.x, pa.y, pa.s, 0, 6.283); ctx.fill();
    }
  } else if (m === "stars") {
    var vx = W / 2 + (mouse.x - 0.5) * W * 0.35, vy = H / 2 + (mouse.y - 0.5) * H * 0.35, sc = Math.max(W, H) * 0.5;
    ctx.lineCap = "round";
    for (var s = 0; s < P.length; s++) {
      var sp2 = P[s];
      sp2.pz = sp2.z; sp2.z -= d * 0.32;
      if (sp2.z <= 0.02) { spawn(sp2, false); continue; }
      var x1 = vx + (sp2.x / sp2.z) * sc * 0.18, y1 = vy + (sp2.y / sp2.z) * sc * 0.18, x0 = vx + (sp2.x / sp2.pz) * sc * 0.18, y0 = vy + (sp2.y / sp2.pz) * sc * 0.18;
      if (x1 < -50 || x1 > W + 50 || y1 < -50 || y1 > H + 50) { spawn(sp2, false); continue; }
      var depth = 1 - sp2.z;
      ctx.strokeStyle = rgbStr(sp2.c, Math.min(1, depth * 1.3));
      ctx.lineWidth = Math.max(0.5, depth * 2.6 * cfg.size);
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    }
  } else if (m === "embers") {
    ctx.globalCompositeOperation = "lighter";
    for (var k = 0; k < P.length; k++) {
      var ep = P[k];
      force(ep); relax(ep);
      ep.x += (ep.vx + Math.sin(t * 2 + ep.ph) * 20) * d; ep.y += ep.vy * d; ep.life -= dt * sp * 0.25;
      if (ep.life <= 0 || ep.y < -20) { spawn(ep, false); continue; }
      var al = ep.life / ep.max, sz2 = ep.s * 5 * (0.4 + al);
      ctx.globalAlpha = Math.min(1, al * 1.4);
      ctx.drawImage(sprite(ep.c), ep.x - sz2 / 2, ep.y - sz2 / 2, sz2, sz2);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  } else if (m === "matrix") {
    ctx.font = fs + "px monospace";
    ctx.textBaseline = "top";
    var head = cols[0], tail = cols[Math.min(1, cols.length - 1)];
    for (var i2 = 0; i2 < drops.length; i2++) {
      var dr = drops[i2];
      dr.acc += d * dr.v;
      while (dr.acc >= 1) {
        dr.acc -= 1; dr.y += fs;
        var ch = KANA[Math.floor(Math.random() * KANA.length)];
        ctx.fillStyle = rgbStr(tail, 0.9); ctx.fillText(ch, i2 * fs, dr.y - fs);
        ctx.fillStyle = rgbStr(mixRgb(head, [255, 255, 255], 0.65), 1); ctx.fillText(ch, i2 * fs, dr.y);
      }
      if (dr.y > H && Math.random() > 0.97) { dr.y = -fs * Math.random() * 10; dr.v = 6 + Math.random() * 14; }
      if (act && Math.abs(i2 * fs - mx) < rad * 0.5 && cfg.mouse === "attract") dr.v = Math.min(40, dr.v + dt * 30);
    }
  } else if (m === "grid") {
    var ccx = W / 2, ccy = H / 2, c0 = cols[0], c1 = cols[Math.min(1, cols.length - 1)];
    for (var g = 0; g < gridPts.length; g++) {
      var gp = gridPts[g], tx = 0, ty = 0, near = 0;
      if (act) {
        var gx = gp.x - mx, gy = gp.y - my, gd = Math.sqrt(gx * gx + gy * gy);
        if (gd < rad && gd > 0.01) {
          near = 1 - gd / rad;
          var push = near * near * rad * 0.35;
          if (cfg.mouse === "repel") { tx = (gx / gd) * push; ty = (gy / gd) * push; }
          else if (cfg.mouse === "attract") { tx = -(gx / gd) * push; ty = -(gy / gd) * push; }
          else { tx = -(gy / gd) * push; ty = (gx / gd) * push; }
        }
      }
      gp.ox += (tx - gp.ox) * Math.min(1, dt * 9); gp.oy += (ty - gp.oy) * Math.min(1, dt * 9);
      var wd = Math.sqrt((gp.x - ccx) * (gp.x - ccx) + (gp.y - ccy) * (gp.y - ccy));
      var wave = 0.5 + 0.5 * Math.sin(wd * 0.025 - t * 2.2);
      var rr = cfg.size * (1.2 + wave * 1.1 + near * 3);
      ctx.fillStyle = rgbStr(mixRgb(c0, c1, Math.min(1, near * 1.4 + wave * 0.25)), 0.35 + 0.65 * Math.max(wave * 0.6, near));
      ctx.beginPath(); ctx.arc(gp.x + gp.ox, gp.y + gp.oy, rr, 0, 6.283); ctx.fill();
    }
  }
}
`

type Mode = "snow" | "rain" | "fireflies" | "confetti" | "bubbles" | "constellation" | "stars" | "embers" | "matrix" | "grid"

interface State {
  mode: Mode
  count: number
  size: number
  speed: number
  wind: number
  link: number
  gap: number
  trail: number
  mouse: "none" | "repel" | "attract" | "swirl"
  radius: number
  colors: string[]
  bg: string
  transparent: boolean
  seed: number
}

const PRESETS: { id: Mode; name: string; patch: Partial<State> }[] = [
  { id: "snow", name: "Snow", patch: { mode: "snow", count: 420, size: 1, speed: 1, wind: 0, colors: ["#ffffff", "#dbeafe"], bg: "#0b1730", mouse: "repel" } },
  { id: "rain", name: "Rain", patch: { mode: "rain", count: 380, size: 1, speed: 1, wind: 40, colors: ["#93c5fd", "#bfdbfe"], bg: "#0a0f1e", mouse: "none" } },
  { id: "fireflies", name: "Fireflies", patch: { mode: "fireflies", count: 70, size: 1, speed: 1, wind: 0, trail: 0.3, colors: ["#fde047", "#a3e635"], bg: "#050b06", mouse: "attract" } },
  { id: "confetti", name: "Confetti", patch: { mode: "confetti", count: 180, size: 1, speed: 1, wind: 0, colors: ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7"], bg: "#111827", mouse: "repel" } },
  { id: "bubbles", name: "Bubbles", patch: { mode: "bubbles", count: 45, size: 1, speed: 1, wind: 0, colors: ["#7dd3fc", "#c4b5fd"], bg: "#082f49", mouse: "repel" } },
  { id: "constellation", name: "Constellations", patch: { mode: "constellation", count: 110, size: 1, speed: 1, wind: 0, link: 140, colors: ["#a5b4fc", "#f0abfc"], bg: "#0a0a1a", mouse: "attract" } },
  { id: "stars", name: "Warp", patch: { mode: "stars", count: 700, size: 1, speed: 1, trail: 0.7, colors: ["#ffffff", "#a5f3fc", "#fde68a"], bg: "#000000", mouse: "none" } },
  { id: "embers", name: "Sparks", patch: { mode: "embers", count: 170, size: 1, speed: 1, wind: 0, trail: 0.6, colors: ["#f97316", "#fbbf24", "#ef4444"], bg: "#0c0402", mouse: "swirl" } },
  { id: "matrix", name: "Matrix", patch: { mode: "matrix", size: 1, speed: 1, trail: 0.9, colors: ["#00ff41", "#00b32c"], bg: "#000000", mouse: "attract" } },
  { id: "grid", name: "Dot grid", patch: { mode: "grid", gap: 28, size: 1.2, speed: 1, colors: ["#6366f1", "#f472b6"], bg: "#0a0a14", mouse: "repel", radius: 140 } },
]

const DEFAULTS: State = {
  mode: "snow",
  count: 420,
  size: 1,
  speed: 1,
  wind: 0,
  link: 140,
  gap: 28,
  trail: 0.6,
  mouse: "repel",
  radius: 150,
  colors: ["#ffffff", "#dbeafe"],
  bg: "#0b1730",
  transparent: false,
  seed: 11,
}

const NO_COUNT: Mode[] = ["matrix", "grid"]
const WINDY: Mode[] = ["snow", "rain", "confetti", "embers", "bubbles", "fireflies"]
const TRAILING: Mode[] = ["stars", "embers", "matrix", "fireflies"]

export function ParticlesTool() {
  const [s, set] = usePersistent<State>("lf-tool-particles", DEFAULTS)
  const api = useRef<CanvasApi | null>(null)

  const outputs = [
    { id: "html", label: "Live HTML", lang: "html", file: "particles.html", code: runtimeHtml(BODY, s, "Particles", s.transparent ? "transparent" : s.bg) },
    { id: "js", label: "JS module", lang: "js", file: "particles.js", code: runtimeModule(BODY, s, "particles") },
    { id: "react", label: "React", lang: "jsx", file: "Particles.jsx", code: runtimeReact("particles") },
  ]

  const controls = (
    <>
      <Section
        title="Effect"
        action={
          <Button variant="ghost" size="xs" onClick={() => set({ seed: randomSeed() })}>
            <DicesIcon />
            New set
          </Button>
        }
      >
        <div className="grid grid-cols-2 gap-1.5">
          {PRESETS.map((p) => (
            <Button key={p.id} size="sm" variant={s.mode === p.id ? "secondary" : "outline"} className={cn("justify-start", s.mode === p.id && "ring-1 ring-primary/40")} onClick={() => set(p.patch)}>
              {p.name}
            </Button>
          ))}
        </div>
      </Section>
      <Section title="Parameters">
        {!NO_COUNT.includes(s.mode) && <SliderField label="Particles" value={s.count} min={10} max={s.mode === "constellation" ? 260 : 3000} step={10} unit="" onChange={(count) => set({ count })} />}
        {s.mode === "grid" && <SliderField label="Grid step" value={s.gap} min={12} max={80} onChange={(gap) => set({ gap })} />}
        <SliderField label="Size" value={s.size} min={0.3} max={3} step={0.05} format={(v) => `×${v.toFixed(2)}`} onChange={(size) => set({ size })} />
        <SliderField label="Speed" value={s.speed} min={0} max={4} step={0.05} format={(v) => `×${v.toFixed(2)}`} onChange={(speed) => set({ speed })} />
        {WINDY.includes(s.mode) && <SliderField label="Wind" value={s.wind} min={-150} max={150} unit="" onChange={(wind) => set({ wind })} />}
        {s.mode === "constellation" && <SliderField label="Link distance" value={s.link} min={40} max={300} onChange={(link) => set({ link })} />}
        {TRAILING.includes(s.mode) && !s.transparent && <SliderField label="Trail length" value={s.trail} min={0} max={0.97} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(trail) => set({ trail })} />}
      </Section>
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
        {s.mouse !== "none" && <SliderField label="Influence radius" value={s.radius} min={30} max={500} onChange={(radius) => set({ radius })} />}
      </Section>
      <Section
        title="Colors"
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
        <Field label="Background">
          <ColorInput value={s.bg} compact onChange={(bg) => set({ bg })} />
        </Field>
        <div className="flex items-center justify-between">
          <Label htmlFor="pt-tr" className="text-xs">
            Transparent background
          </Label>
          <Switch id="pt-tr" size="sm" checked={s.transparent} onCheckedChange={(transparent) => set({ transparent })} />
        </div>
      </Section>
    </>
  )

  return (
    <ToolLayout
      controls={controls}
      outputs={outputs}
      footer={
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" onClick={() => api.current?.restart()}>
            <RotateCcwIcon />
            Again
          </Button>
          <Button variant="outline" size="sm" onClick={() => api.current && downloadUrl("particles.png", api.current.snapshot())}>
            <CameraIcon />
            PNG
          </Button>
        </div>
      }
    >
      <div className={cn("absolute inset-0", s.transparent && "bg-[repeating-conic-gradient(#d4d4d8_0_25%,#fafafa_0_50%)] bg-[length:20px_20px]")}>
        <RuntimeCanvas body={BODY} config={s} apiRef={api} />
      </div>
    </ToolLayout>
  )
}
