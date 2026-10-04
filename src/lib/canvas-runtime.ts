export interface CanvasApi {
  update: (cfg: object) => void
  restart: () => void
  snapshot: () => string
  svg: () => string | null
  dispose: () => void
}

const HEAD = String.raw`var cfg = Object.assign({}, config);
var ctx = canvas.getContext("2d");
var W = 1, H = 1, DPR = 1;
var mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, active: false, down: false };
function rng(seed) {
  var a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    var t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hexRgb(h) {
  var v = parseInt(String(h).replace("#", "").slice(0, 6), 16) || 0;
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}
function mixRgb(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
function paletteAt(list, t) {
  t = Math.max(0, Math.min(1, t));
  if (list.length === 1) return list[0];
  var f = t * (list.length - 1), i = Math.min(list.length - 2, Math.floor(f));
  return mixRgb(list[i], list[i + 1], f - i);
}
function rgbStr(c, a) {
  var r = Math.round(c[0]), g = Math.round(c[1]), b = Math.round(c[2]);
  return a === undefined || a >= 1 ? "rgb(" + r + "," + g + "," + b + ")" : "rgba(" + r + "," + g + "," + b + "," + a + ")";
}
function rgbHex(c) {
  return "#" + c.map(function (v) { return Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0"); }).join("");
}
function makeNoise3(seed) {
  var r = rng(seed), p = new Uint8Array(512), perm = [];
  for (var i = 0; i < 256; i++) perm[i] = i;
  for (var j = 255; j > 0; j--) { var k = Math.floor(r() * (j + 1)); var tmp = perm[j]; perm[j] = perm[k]; perm[k] = tmp; }
  for (var q = 0; q < 512; q++) p[q] = perm[q & 255];
  function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function grad(h, x, y, z) {
    var u = (h & 15) < 8 ? x : y, v = (h & 15) < 4 ? y : ((h & 15) === 12 || (h & 15) === 14 ? x : z);
    return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
  }
  return function (x, y, z) {
    var X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
    x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
    var u = fade(x), v = fade(y), w = fade(z);
    var A = p[X] + Y, AA = p[A] + Z, AB = p[A + 1] + Z, B = p[X + 1] + Y, BA = p[B] + Z, BB = p[B + 1] + Z;
    function L(a, b, t) { return a + t * (b - a); }
    return L(L(L(grad(p[AA], x, y, z), grad(p[BA], x - 1, y, z), u), L(grad(p[AB], x, y - 1, z), grad(p[BB], x - 1, y - 1, z), u), v),
      L(L(grad(p[AA + 1], x, y, z - 1), grad(p[BA + 1], x - 1, y, z - 1), u), L(grad(p[AB + 1], x, y - 1, z - 1), grad(p[BB + 1], x - 1, y - 1, z - 1), u), v), w);
  };
}
`

const TAIL = String.raw`function resize() {
  var r = canvas.getBoundingClientRect();
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = Math.max(1, Math.round(r.width));
  H = Math.max(1, Math.round(r.height));
  canvas.width = Math.round(W * DPR);
  canvas.height = Math.round(H * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (typeof onResize === "function") onResize();
}
function onMove(e) {
  var r = canvas.getBoundingClientRect();
  mouse.tx = (e.clientX - r.left) / r.width;
  mouse.ty = (e.clientY - r.top) / r.height;
  mouse.active = mouse.tx >= 0 && mouse.tx <= 1 && mouse.ty >= 0 && mouse.ty <= 1;
}
function onDown() { mouse.down = mouse.active; }
function onUp() { mouse.down = false; }
window.addEventListener("pointermove", onMove);
window.addEventListener("pointerdown", onDown);
window.addEventListener("pointerup", onUp);
var ro = new ResizeObserver(resize);
ro.observe(canvas);
var raf = 0, last = performance.now(), time = 0;
resize();
setup();
function loop(now) {
  raf = requestAnimationFrame(loop);
  var dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  time += dt * (cfg.speed === undefined ? 1 : cfg.speed);
  mouse.x += (mouse.tx - mouse.x) * 0.12;
  mouse.y += (mouse.ty - mouse.y) * 0.12;
  frame(time, dt);
}
raf = requestAnimationFrame(loop);
return {
  update: function (next) {
    var need = REBUILD.some(function (k) { return JSON.stringify(next[k]) !== JSON.stringify(cfg[k]); });
    Object.assign(cfg, next);
    if (need) setup();
  },
  restart: function () { setup(); },
  snapshot: function () { return canvas.toDataURL("image/png"); },
  svg: function () { return typeof toSVG === "function" ? toSVG() : null; },
  dispose: function () {
    cancelAnimationFrame(raf);
    ro.disconnect();
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerdown", onDown);
    window.removeEventListener("pointerup", onUp);
  }
};
`

export function runtimeSource(body: string) {
  return `${HEAD}${body}\n${TAIL}`
}

export function startRuntime(body: string, canvas: HTMLCanvasElement, config: object): CanvasApi {
  const factory = new Function("canvas", "config", runtimeSource(body)) as (c: HTMLCanvasElement, cfg: object) => CanvasApi
  return factory(canvas, config)
}

const indent = (s: string, pad: string) =>
  s
    .trimEnd()
    .split("\n")
    .map((l) => (l ? pad + l : l))
    .join("\n")

export function runtimeHtml(body: string, config: object, title: string, bg: string) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      html, body { margin: 0; height: 100%; background: ${bg}; }
      canvas { display: block; width: 100%; height: 100vh; }
    </style>
  </head>
  <body>
    <canvas id="art"></canvas>
    <script>
      function createArt(canvas, config) {
${indent(runtimeSource(body), "        ")}
      }

      createArt(document.getElementById("art"), ${JSON.stringify(config)});
    </script>
  </body>
</html>
`
}

export function runtimeModule(body: string, config: object, name: string) {
  return `export const ${name}Config = ${JSON.stringify(config, null, 2)}

export function create${name[0].toUpperCase()}${name.slice(1)}(canvas, config = ${name}Config) {
${indent(runtimeSource(body), "  ")}
}
`
}

export function runtimeReact(name: string) {
  const fn = `create${name[0].toUpperCase()}${name.slice(1)}`
  const comp = `${name[0].toUpperCase()}${name.slice(1)}`
  return `import { useEffect, useRef } from "react"
import { ${fn}, ${name}Config } from "./${name}"

export function ${comp}({ className, config = ${name}Config }) {
  const ref = useRef(null)

  useEffect(() => {
    const art = ${fn}(ref.current, config)
    return () => art.dispose()
  }, [config])

  return <canvas ref={ref} className={className} style={{ display: "block", width: "100%", height: "100%" }} />
}
`
}
