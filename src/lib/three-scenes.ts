export type SceneId = "blob" | "waves" | "galaxy" | "knot" | "gradient" | "glass" | "globe" | "terrain" | "shapes" | "tunnel"

export type ShapeId = "sphere" | "torus" | "knot" | "cube" | "capsule" | "icosa"

export interface ThreeConfig {
  scene: SceneId
  c1: string
  c2: string
  c3: string
  background: string
  transparent: boolean
  speed: number
  amplitude: number
  frequency: number
  detail: number
  count: number
  rotation: number
  parallax: number
  zoom: number
  wireframe: boolean
  style: "points" | "wire" | "solid"
  shape: ShapeId
}

export const THREE_VERSION = "0.186.1"

const NOISE = String.raw`var NOISE = [
  "vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }",
  "vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }",
  "vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }",
  "vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }",
  "float snoise(vec3 v) {",
  "  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);",
  "  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);",
  "  vec3 i = floor(v + dot(v, C.yyy));",
  "  vec3 x0 = v - i + dot(i, C.xxx);",
  "  vec3 g = step(x0.yzx, x0.xyz);",
  "  vec3 l = 1.0 - g;",
  "  vec3 i1 = min(g.xyz, l.zxy);",
  "  vec3 i2 = max(g.xyz, l.zxy);",
  "  vec3 x1 = x0 - i1 + C.xxx;",
  "  vec3 x2 = x0 - i2 + C.yyy;",
  "  vec3 x3 = x0 - D.yyy;",
  "  i = mod289(i);",
  "  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));",
  "  float n_ = 0.142857142857;",
  "  vec3 ns = n_ * D.wyz - D.xzx;",
  "  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);",
  "  vec4 x_ = floor(j * ns.z);",
  "  vec4 y_ = floor(j - 7.0 * x_);",
  "  vec4 x = x_ * ns.x + ns.yyyy;",
  "  vec4 y = y_ * ns.x + ns.yyyy;",
  "  vec4 h = 1.0 - abs(x) - abs(y);",
  "  vec4 b0 = vec4(x.xy, y.xy);",
  "  vec4 b1 = vec4(x.zw, y.zw);",
  "  vec4 s0 = floor(b0) * 2.0 + 1.0;",
  "  vec4 s1 = floor(b1) * 2.0 + 1.0;",
  "  vec4 sh = -step(h, vec4(0.0));",
  "  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;",
  "  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;",
  "  vec3 p0 = vec3(a0.xy, h.x);",
  "  vec3 p1 = vec3(a0.zw, h.y);",
  "  vec3 p2 = vec3(a1.xy, h.z);",
  "  vec3 p3 = vec3(a1.zw, h.w);",
  "  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));",
  "  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;",
  "  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);",
  "  m = m * m;",
  "  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));",
  "}"
].join("\n");
`

const SCENES: Record<SceneId, string> = {
  blob: String.raw`var REBUILD = ["detail", "wireframe"];
function build() {
  var u = uniforms();
  var mat = new THREE.ShaderMaterial({
    uniforms: u,
    wireframe: !!cfg.wireframe,
    vertexShader: [NOISE,
      "uniform float uTime; uniform float uAmp; uniform float uFreq;",
      "varying float vD; varying vec3 vN; varying vec3 vV;",
      "void main() {",
      "  float d = snoise(normal * uFreq + vec3(uTime * 0.35));",
      "  vD = d;",
      "  vec3 p = position + normal * d * uAmp;",
      "  vec4 mv = modelViewMatrix * vec4(p, 1.0);",
      "  vN = normalize(normalMatrix * normal);",
      "  vV = -mv.xyz;",
      "  gl_Position = projectionMatrix * mv;",
      "}"].join("\n"),
    fragmentShader: [
      "uniform vec3 uC1; uniform vec3 uC2; uniform vec3 uC3;",
      "varying float vD; varying vec3 vN; varying vec3 vV;",
      "void main() {",
      "  float t = clamp(vD * 0.5 + 0.5, 0.0, 1.0);",
      "  vec3 c = mix(uC1, uC2, smoothstep(0.0, 0.6, t));",
      "  c = mix(c, uC3, smoothstep(0.55, 1.0, t));",
      "  float f = pow(1.0 - max(dot(normalize(vN), normalize(vV)), 0.0), 2.5);",
      "  c += f * 0.45;",
      "  gl_FragColor = vec4(c, 1.0);",
      "  #include <colorspace_fragment>",
      "}"].join("\n")
  });
  var mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1, Math.round(cfg.detail)), mat);
  return { object: mesh, tick: function (t) { sync(u, t); mesh.rotation.y = t * cfg.rotation * 0.3; mesh.rotation.x = t * cfg.rotation * 0.15; } };
}
`,
  waves: String.raw`var REBUILD = ["detail", "style"];
function build() {
  var u = uniforms();
  var seg = Math.round(cfg.detail * 2);
  var geo = new THREE.PlaneGeometry(8, 8, seg, seg);
  var mat = new THREE.ShaderMaterial({
    uniforms: u,
    side: THREE.DoubleSide,
    wireframe: cfg.style === "wire",
    defines: cfg.style === "points" ? { IS_POINTS: "" } : {},
    transparent: cfg.style === "points",
    depthWrite: cfg.style !== "points",
    vertexShader: [NOISE,
      "uniform float uTime; uniform float uAmp; uniform float uFreq;",
      "varying float vH;",
      "void main() {",
      "  vec3 p = position;",
      "  float h = snoise(vec3(p.x * uFreq * 0.35, p.y * uFreq * 0.35, uTime * 0.25));",
      "  p.z += h * uAmp;",
      "  vH = h;",
      "  vec4 mv = modelViewMatrix * vec4(p, 1.0);",
      "  gl_PointSize = 14.0 / -mv.z;",
      "  gl_Position = projectionMatrix * mv;",
      "}"].join("\n"),
    fragmentShader: [
      "uniform vec3 uC1; uniform vec3 uC2; uniform vec3 uC3;",
      "varying float vH;",
      "void main() {",
      "  #ifdef IS_POINTS",
      "  if (length(gl_PointCoord - 0.5) > 0.5) discard;",
      "  #endif",
      "  float t = clamp(vH * 0.5 + 0.5, 0.0, 1.0);",
      "  vec3 c = mix(mix(uC1, uC2, smoothstep(0.0, 0.5, t)), uC3, smoothstep(0.5, 1.0, t));",
      "  gl_FragColor = vec4(c, 1.0);",
      "  #include <colorspace_fragment>",
      "}"].join("\n")
  });
  var obj = cfg.style === "points" ? new THREE.Points(geo, mat) : new THREE.Mesh(geo, mat);
  obj.rotation.x = -Math.PI / 2.6;
  return { object: obj, tick: function (t) { sync(u, t); obj.rotation.z = t * cfg.rotation * 0.05; } };
}
`,
  galaxy: String.raw`var REBUILD = ["count", "amplitude", "frequency", "detail", "c1", "c2", "c3"];
function build() {
  var n = Math.round(cfg.count);
  var pos = new Float32Array(n * 3);
  var colors = new Float32Array(n * 3);
  var a = new THREE.Color(cfg.c1), b = new THREE.Color(cfg.c2), c = new THREE.Color(cfg.c3), tmp = new THREE.Color();
  var arms = Math.max(2, Math.round(cfg.frequency * 2));
  function jitter(r) { return Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * 0.4 * r; }
  for (var i = 0; i < n; i++) {
    var r = Math.pow(Math.random(), 1.5) * 3;
    var branch = ((i % arms) / arms) * Math.PI * 2;
    var spin = r * cfg.amplitude * 2;
    pos[i * 3] = Math.cos(branch + spin) * r + jitter(r);
    pos[i * 3 + 1] = jitter(r) * 0.5;
    pos[i * 3 + 2] = Math.sin(branch + spin) * r + jitter(r);
    tmp.copy(a).lerp(b, Math.min(1, r / 2));
    if (r > 2) tmp.lerp(c, Math.min(1, r - 2));
    colors[i * 3] = tmp.r; colors[i * 3 + 1] = tmp.g; colors[i * 3 + 2] = tmp.b;
  }
  var geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  var mat = new THREE.PointsMaterial({ size: 0.012 + cfg.detail / 3000, vertexColors: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
  var pts = new THREE.Points(geo, mat);
  pts.rotation.x = 0.55;
  return { object: pts, tick: function (t) { pts.rotation.y = t * cfg.rotation * 0.15; } };
}
`,
  knot: String.raw`var REBUILD = ["detail"];
function build() {
  var group = new THREE.Group();
  var geo = new THREE.TorusKnotGeometry(0.9, 0.3, Math.round(cfg.detail * 4), Math.max(8, Math.round(cfg.detail / 2)), 2, 3);
  var mat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0.25, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08, iridescence: 1, iridescenceIOR: 1.6 });
  var mesh = new THREE.Mesh(geo, mat);
  group.add(mesh);
  group.add(new THREE.AmbientLight(0xffffff, 0.4));
  var lights = [0, 1, 2].map(function () { var l = new THREE.PointLight(0xffffff, 40, 0, 2); group.add(l); return l; });
  return {
    object: group,
    tick: function (t) {
      var cs = [cfg.c1, cfg.c2, cfg.c3];
      lights.forEach(function (l, i) {
        var a = t * 0.6 + (i * Math.PI * 2) / 3;
        l.position.set(Math.cos(a) * 3, Math.sin(a * 1.3) * 2, Math.sin(a) * 3);
        l.color.set(cs[i]);
      });
      mat.wireframe = !!cfg.wireframe;
      mesh.rotation.x = t * cfg.rotation * 0.2;
      mesh.rotation.y = t * cfg.rotation * 0.3;
      mesh.scale.setScalar(1 + Math.sin(t * 1.5) * cfg.amplitude * 0.15);
    }
  };
}
`,
  gradient: String.raw`var REBUILD = [];
function build() {
  var u = uniforms();
  var mat = new THREE.ShaderMaterial({
    uniforms: u,
    depthTest: false,
    vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
    fragmentShader: [NOISE,
      "uniform float uTime; uniform float uAmp; uniform float uFreq;",
      "uniform vec3 uC1; uniform vec3 uC2; uniform vec3 uC3;",
      "varying vec2 vUv;",
      "float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }",
      "void main() {",
      "  vec2 uv = vUv;",
      "  float n1 = snoise(vec3(uv * uFreq, uTime * 0.12));",
      "  float n2 = snoise(vec3(uv * uFreq * 1.7 + 4.0, uTime * 0.18));",
      "  vec2 w = uv + vec2(n1, n2) * 0.25 * uAmp;",
      "  float a = smoothstep(-0.2, 1.2, w.x + n2 * 0.3);",
      "  float b = smoothstep(0.0, 1.0, w.y + n1 * 0.3);",
      "  vec3 c = mix(mix(uC1, uC2, a), uC3, b * 0.85);",
      "  c += (hash(uv * 900.0 + fract(uTime)) - 0.5) * 0.035;",
      "  gl_FragColor = vec4(c, 1.0);",
      "  #include <colorspace_fragment>",
      "}"].join("\n")
  });
  var mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  mesh.frustumCulled = false;
  return { object: mesh, tick: function (t) { sync(u, t); } };
}
`,
  glass: String.raw`var REBUILD = ["detail", "shape", "count"];
function geometryFor(kind, seg) {
  if (kind === "torus") return new THREE.TorusGeometry(0.72, 0.3, Math.max(8, Math.round(seg / 2)), seg);
  if (kind === "knot") return new THREE.TorusKnotGeometry(0.62, 0.22, seg * 2, Math.max(8, Math.round(seg / 3)), 2, 3);
  if (kind === "cube") return new THREE.BoxGeometry(1.25, 1.25, 1.25);
  if (kind === "capsule") return new THREE.CapsuleGeometry(0.45, 0.9, 12, seg);
  if (kind === "icosa") return new THREE.IcosahedronGeometry(0.95, 1);
  return new THREE.SphereGeometry(0.95, seg, seg);
}
function build() {
  var group = new THREE.Group();
  var orbs = [];
  for (var i = 0; i < 8; i++) {
    var orb = new THREE.Mesh(new THREE.SphereGeometry(0.5 + (i % 3) * 0.16, 28, 28), new THREE.MeshBasicMaterial({ color: cfg.c1 }));
    orbs.push(orb);
    group.add(orb);
  }
  var seg = Math.max(8, Math.round(cfg.detail));
  var n = Math.max(1, Math.round(cfg.count));
  var mat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: cfg.amplitude, transmission: 1, thickness: 1.8, ior: cfg.frequency, dispersion: 0.5, clearcoat: 1, clearcoatRoughness: 0.1, specularIntensity: 1 });
  var pieces = [];
  for (var k = 0; k < n; k++) {
    var m = new THREE.Mesh(geometryFor(cfg.shape, seg), mat);
    var s = n === 1 ? 1.35 : 0.95 - Math.min(0.35, n * 0.04);
    m.scale.setScalar(s);
    pieces.push(m);
    group.add(m);
  }
  group.add(new THREE.AmbientLight(0xffffff, 1.4));
  var key = new THREE.DirectionalLight(0xffffff, 3.2);
  key.position.set(3, 4, 5);
  group.add(key);
  return {
    object: group,
    tick: function (t) {
      var cs = [cfg.c1, cfg.c2, cfg.c3];
      orbs.forEach(function (o, i) {
        var a = t * 0.35 + i * 0.8;
        o.position.set(Math.cos(a) * 1.7, Math.sin(a * 1.3) * 0.9, -0.9 - (i % 3) * 0.45);
        o.material.color.set(cs[i % 3]);
      });
      mat.roughness = cfg.amplitude;
      mat.ior = cfg.frequency;
      pieces.forEach(function (p, i) {
        var spread = (i - (pieces.length - 1) / 2) * 1.75;
        p.position.set(spread, Math.sin(t * 0.7 + i) * 0.18, 0);
        p.rotation.x = t * cfg.rotation * 0.25 + i;
        p.rotation.y = t * cfg.rotation * 0.35 + i * 0.7;
      });
    }
  };
}
`,
  globe: String.raw`var REBUILD = ["count", "frequency", "detail", "amplitude", "c1", "c2", "c3"];
function hash3(x, y, z) { var h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return h - Math.floor(h); }
function vnoise(x, y, z) {
  var xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  var xf = x - xi, yf = y - yi, zf = z - zi;
  var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  function h(a, b, c) { return hash3(xi + a, yi + b, zi + c); }
  function L(a, b, t) { return a + (b - a) * t; }
  return L(L(L(h(0, 0, 0), h(1, 0, 0), u), L(h(0, 1, 0), h(1, 1, 0), u), v), L(L(h(0, 0, 1), h(1, 0, 1), u), L(h(0, 1, 1), h(1, 1, 1), u), v), w);
}
function fbm3(x, y, z) { return vnoise(x, y, z) * 0.5 + vnoise(x * 2.1, y * 2.1, z * 2.1) * 0.3 + vnoise(x * 4.3, y * 4.3, z * 4.3) * 0.2; }
function build() {
  var group = new THREE.Group();
  var n = Math.max(500, Math.round(cfg.count));
  var land = [];
  var golden = Math.PI * (3 - Math.sqrt(5));
  for (var i = 0; i < n; i++) {
    var y = 1 - (i / (n - 1)) * 2, r = Math.sqrt(1 - y * y), th = golden * i;
    var x = Math.cos(th) * r, z = Math.sin(th) * r;
    if (fbm3(x * cfg.frequency + 3.1, y * cfg.frequency + 1.7, z * cfg.frequency + 5.3) > 0.54) land.push(x, y, z);
  }
  var geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(land, 3));
  var dots = new THREE.Points(geo, new THREE.PointsMaterial({ color: cfg.c1, size: 0.006 + cfg.detail * 0.0022, sizeAttenuation: true }));
  var ocean = new THREE.Mesh(new THREE.SphereGeometry(0.992, 48, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(cfg.c2).multiplyScalar(0.16) }));
  var glow = new THREE.Mesh(new THREE.SphereGeometry(1.2, 48, 48), new THREE.ShaderMaterial({
    uniforms: { uC: { value: new THREE.Color(cfg.c2) } },
    side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    vertexShader: "varying vec3 vN; void main() { vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: ["uniform vec3 uC; varying vec3 vN;",
      "void main() {",
      "  float i = pow(max(0.0, 0.62 - dot(vN, vec3(0.0, 0.0, 1.0))), 3.0);",
      "  gl_FragColor = vec4(uC * i * 2.2, i);",
      "  #include <colorspace_fragment>",
      "}"].join("\n")
  }));
  group.add(ocean, dots, glow);
  var arcs = [];
  var lp = land.length / 3;
  var nA = Math.round(cfg.amplitude);
  for (var a = 0; a < nA && lp > 2; a++) {
    var i1 = Math.floor(Math.random() * lp), i2 = Math.floor(Math.random() * lp);
    var A = new THREE.Vector3(land[i1 * 3], land[i1 * 3 + 1], land[i1 * 3 + 2]);
    var B = new THREE.Vector3(land[i2 * 3], land[i2 * 3 + 1], land[i2 * 3 + 2]);
    var mid = A.clone().add(B).multiplyScalar(0.5);
    if (mid.length() < 0.05) continue;
    mid.normalize().multiplyScalar(1 + A.distanceTo(B) * 0.55);
    var pts = new THREE.QuadraticBezierCurve3(A.clone().multiplyScalar(1.004), mid, B.clone().multiplyScalar(1.004)).getPoints(60);
    var line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: cfg.c3, transparent: true, opacity: 0.95 }));
    arcs.push({ line: line, off: Math.random() * 2 });
    group.add(line);
  }
  group.rotation.x = 0.38;
  group.rotation.z = 0.12;
  return {
    object: group,
    tick: function (t) {
      group.rotation.y = t * cfg.rotation * 0.15;
      dots.material.color.set(cfg.c1);
      glow.material.uniforms.uC.value.set(cfg.c2);
      arcs.forEach(function (ar) {
        var p = (t * 0.28 + ar.off) % 2;
        var head = p < 1 ? p : 1, tail = p > 1 ? p - 1 : 0;
        ar.line.geometry.setDrawRange(Math.floor(tail * 60), Math.max(0, Math.floor((head - tail) * 61)));
        ar.line.material.color.set(cfg.c3);
      });
    }
  };
}
`,
  terrain: String.raw`var REBUILD = ["detail"];
function build() {
  var u = uniforms();
  u.uBg = { value: new THREE.Color(cfg.background) };
  var seg = Math.max(16, Math.round(cfg.detail));
  var geo = new THREE.PlaneGeometry(18, 30, seg, Math.round(seg * 1.6));
  var vs = [NOISE,
    "uniform float uTime; uniform float uAmp; uniform float uFreq;",
    "varying float vH; varying float vFade;",
    "void main() {",
    "  vec3 p = position;",
    "  float road = smoothstep(0.8, 3.6, abs(p.x));",
    "  float y = (p.y + uTime * 2.0) * 0.18 * uFreq;",
    "  float h = (snoise(vec3(p.x * 0.18 * uFreq, y, 0.0)) * 0.7 + snoise(vec3(p.x * 0.4 * uFreq, y * 2.2, 3.0)) * 0.3) * 0.5 + 0.5;",
    "  p.z += h * uAmp * 3.0 * road;",
    "  vH = h * road;",
    "  vec4 mv = modelViewMatrix * vec4(p, 1.0);",
    "  vFade = clamp((-mv.z - 4.0) / 24.0, 0.0, 1.0);",
    "  gl_Position = projectionMatrix * mv;",
    "}"].join("\n");
  var solid = new THREE.Mesh(geo, new THREE.ShaderMaterial({
    uniforms: u, vertexShader: vs, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
    fragmentShader: ["uniform vec3 uBg; uniform vec3 uC2; varying float vH; varying float vFade;",
      "void main() {",
      "  vec3 c = mix(uBg, uC2 * 0.18, vH * 0.6);",
      "  c = mix(c, uBg, smoothstep(0.35, 1.0, vFade));",
      "  gl_FragColor = vec4(c, 1.0);",
      "  #include <colorspace_fragment>",
      "}"].join("\n")
  }));
  var wire = new THREE.Mesh(geo, new THREE.ShaderMaterial({
    uniforms: u, vertexShader: vs, wireframe: true,
    fragmentShader: ["uniform vec3 uBg; uniform vec3 uC1; uniform vec3 uC2; uniform vec3 uC3; varying float vH; varying float vFade;",
      "void main() {",
      "  vec3 c = mix(uC1, uC2, smoothstep(0.0, 0.5, vH));",
      "  c = mix(c, uC3, smoothstep(0.55, 1.0, vH));",
      "  c = mix(c, uBg, smoothstep(0.35, 1.0, vFade));",
      "  gl_FragColor = vec4(c, 1.0);",
      "  #include <colorspace_fragment>",
      "}"].join("\n")
  }));
  var group = new THREE.Group();
  [solid, wire].forEach(function (m) { m.rotation.x = -Math.PI / 2; m.position.set(0, -1.2, -8); group.add(m); });
  var sun = new THREE.Mesh(new THREE.CircleGeometry(3.4, 64), new THREE.MeshBasicMaterial({ color: cfg.c3, fog: false }));
  sun.position.set(0, 1.6, -26);
  group.add(sun);
  return {
    object: group,
    tick: function (t) {
      sync(u, t);
      u.uBg.value.set(cfg.background);
      sun.material.color.set(cfg.c3);
      sun.visible = !!cfg.wireframe;
    }
  };
}
`,
  shapes: String.raw`var REBUILD = ["count", "shape", "frequency"];
function build() {
  var group = new THREE.Group();
  var n = Math.max(1, Math.round(cfg.count));
  var kind = cfg.shape;
  var geo = kind === "cube" ? new THREE.BoxGeometry(0.8, 0.8, 0.8)
    : kind === "torus" ? new THREE.TorusGeometry(0.42, 0.16, 10, 20)
    : kind === "knot" ? new THREE.TorusKnotGeometry(0.34, 0.11, 60, 8)
    : kind === "capsule" ? new THREE.CapsuleGeometry(0.28, 0.5, 4, 10)
    : kind === "icosa" ? new THREE.IcosahedronGeometry(0.5, 0)
    : new THREE.SphereGeometry(0.45, 14, 10);
  var mat = new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.38, metalness: 0.12 });
  var mesh = new THREE.InstancedMesh(geo, mat, n);
  var cols = [new THREE.Color(cfg.c1), new THREE.Color(cfg.c2), new THREE.Color(cfg.c3)];
  var tmp = new THREE.Color();
  var sp = cfg.frequency * 3.2;
  var px = [], py = [], pz = [], ph = [], rs = [], sc = [];
  for (var i = 0; i < n; i++) {
    px.push((Math.random() * 2 - 1) * sp * 1.5);
    py.push((Math.random() * 2 - 1) * sp * 0.85);
    pz.push((Math.random() * 2 - 1) * sp * 0.8 - sp * 0.2);
    ph.push(Math.random() * 6.283);
    rs.push(0.3 + Math.random());
    sc.push(0.5 + Math.random() * 1.1);
    var a = Math.floor(Math.random() * 3), b = Math.floor(Math.random() * 3);
    tmp.copy(cols[a]).lerp(cols[b], Math.random());
    mesh.setColorAt(i, tmp);
  }
  mesh.instanceColor.needsUpdate = true;
  group.add(mesh);
  group.add(new THREE.AmbientLight(0xffffff, 1.1));
  var key = new THREE.DirectionalLight(0xffffff, 2.6);
  key.position.set(3, 5, 4);
  group.add(key);
  var fill = new THREE.PointLight(0xffffff, 30, 0, 2);
  fill.position.set(-4, -2, 3);
  group.add(fill);
  var m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();
  return {
    object: group,
    tick: function (t) {
      fill.color.set(cfg.c3);
      for (var i = 0; i < n; i++) {
        e.set(ph[i] + t * rs[i] * cfg.rotation, ph[i] * 1.3 + t * rs[i] * cfg.rotation * 0.7, 0);
        q.setFromEuler(e);
        p.set(px[i], py[i] + Math.sin(t * 0.6 + ph[i]) * cfg.amplitude, pz[i]);
        s.setScalar(sc[i]);
        m4.compose(p, q, s);
        mesh.setMatrixAt(i, m4);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
  };
}
`,
  tunnel: String.raw`var REBUILD = ["count", "detail"];
function build() {
  var group = new THREE.Group();
  var n = Math.max(6, Math.round(cfg.count));
  var seg = Math.max(3, Math.round(cfg.detail));
  var spacing = 1.1, total = n * spacing;
  scene.fog = new THREE.Fog(cfg.background, 2, total * 0.85);
  var geo = new THREE.TorusGeometry(2.4, 0.028, 6, seg);
  var rings = [];
  for (var i = 0; i < n; i++) {
    var ring = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: cfg.c1 }));
    rings.push(ring);
    group.add(ring);
  }
  var c1 = new THREE.Color(), c2 = new THREE.Color(), c3 = new THREE.Color();
  return {
    object: group,
    tick: function (t) {
      c1.set(cfg.c1); c2.set(cfg.c2); c3.set(cfg.c3);
      scene.fog.color.set(cfg.background);
      for (var i = 0; i < n; i++) {
        var r = rings[i];
        var rel = (i * spacing + t * cfg.frequency * 3) % total;
        r.position.z = cfg.zoom + 2 - total + rel;
        var u = ((i / n) + t * 0.05) % 1;
        if (u < 0.5) r.material.color.copy(c1).lerp(c2, u * 2); else r.material.color.copy(c2).lerp(c3, (u - 0.5) * 2);
        r.rotation.z = i * cfg.amplitude * 0.1 + t * cfg.rotation * 0.2;
        r.scale.setScalar(1 + Math.sin(t * 1.4 + i * 0.5) * 0.06);
      }
    }
  };
}
`,
}

const RUNTIME_HEAD = String.raw`var cfg = Object.assign({}, config);
var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
var last = performance.now();
var time = 0;
var mouse = { x: 0, y: 0, tx: 0, ty: 0 };
var current = null;
function uniforms() {
  return {
    uTime: { value: 0 }, uAmp: { value: cfg.amplitude }, uFreq: { value: cfg.frequency },
    uC1: { value: new THREE.Color(cfg.c1) }, uC2: { value: new THREE.Color(cfg.c2) }, uC3: { value: new THREE.Color(cfg.c3) }
  };
}
function sync(u, t) {
  u.uTime.value = t; u.uAmp.value = cfg.amplitude; u.uFreq.value = cfg.frequency;
  u.uC1.value.set(cfg.c1); u.uC2.value.set(cfg.c2); u.uC3.value.set(cfg.c3);
}
`

const RUNTIME_TAIL = String.raw`function disposeObject(o) {
  o.traverse(function (n) {
    if (n.geometry) n.geometry.dispose();
    if (n.material) (Array.isArray(n.material) ? n.material : [n.material]).forEach(function (m) { m.dispose(); });
  });
}
function rebuild() {
  if (current) { scene.remove(current.object); disposeObject(current.object); }
  current = build();
  scene.add(current.object);
}
function resize() {
  var w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
function onMove(e) {
  var r = canvas.getBoundingClientRect();
  mouse.tx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
  mouse.ty = Math.max(-1, Math.min(1, -(((e.clientY - r.top) / r.height) * 2 - 1)));
}
window.addEventListener("pointermove", onMove);
var ro = new ResizeObserver(resize);
ro.observe(canvas);
var raf = 0;
function loop() {
  raf = requestAnimationFrame(loop);
  var now = performance.now();
  time += Math.min(0.1, (now - last) / 1000) * cfg.speed;
  last = now;
  var t = time;
  mouse.x += (mouse.tx - mouse.x) * 0.05;
  mouse.y += (mouse.ty - mouse.y) * 0.05;
  renderer.setClearColor(cfg.background, cfg.transparent ? 0 : 1);
  camera.position.set(mouse.x * cfg.parallax, mouse.y * cfg.parallax, cfg.zoom);
  camera.lookAt(0, 0, 0);
  current.tick(t);
  renderer.render(scene, camera);
}
resize();
rebuild();
loop();
return {
  update: function (next) {
    var keys = ["scene"].concat(REBUILD);
    var need = keys.some(function (k) { return next[k] !== cfg[k]; });
    Object.assign(cfg, next);
    if (need) rebuild();
  },
  snapshot: function () { renderer.render(scene, camera); return canvas.toDataURL("image/png"); },
  dispose: function () {
    cancelAnimationFrame(raf);
    ro.disconnect();
    window.removeEventListener("pointermove", onMove);
    if (current) disposeObject(current.object);
    renderer.dispose();
  }
};
`

export function sceneSource(id: SceneId) {
  return `${RUNTIME_HEAD}${NOISE}${SCENES[id]}${RUNTIME_TAIL}`
}

export const SCENE_PRESETS: { id: SceneId; name: string; config: Partial<ThreeConfig> }[] = [
  { id: "blob", name: "Liquid sphere", config: { amplitude: 0.35, frequency: 1.4, detail: 48, zoom: 4, rotation: 0.5, c1: "#4f46e5", c2: "#ec4899", c3: "#fde68a", background: "#0b0b14" } },
  { id: "waves", name: "Wave grid", config: { amplitude: 0.7, frequency: 1.2, detail: 64, zoom: 6, rotation: 0.3, style: "points", c1: "#22d3ee", c2: "#a855f7", c3: "#f472b6", background: "#05010f" } },
  { id: "galaxy", name: "Galaxy", config: { amplitude: 0.5, frequency: 2.5, detail: 20, count: 40000, zoom: 6, rotation: 1, c1: "#fde68a", c2: "#f97316", c3: "#6366f1", background: "#000000" } },
  { id: "knot", name: "Pearl", config: { amplitude: 0.3, frequency: 1, detail: 32, zoom: 5, rotation: 0.6, c1: "#f0abfc", c2: "#67e8f9", c3: "#fcd34d", background: "#0f0f12" } },
  { id: "gradient", name: "Live gradient", config: { amplitude: 1, frequency: 1.6, detail: 1, zoom: 4, rotation: 0, c1: "#6d28d9", c2: "#f472b6", c3: "#fbbf24", background: "#000000" } },
  { id: "glass", name: "Glass", config: { amplitude: 0.12, frequency: 1.5, detail: 40, count: 3, shape: "sphere", zoom: 5.5, rotation: 0.6, c1: "#f43f5e", c2: "#6366f1", c3: "#facc15", background: "#0b0b14" } },
  { id: "globe", name: "Globe", config: { amplitude: 14, frequency: 1.4, detail: 4, count: 16000, zoom: 3.6, rotation: 1, c1: "#7dd3fc", c2: "#2563eb", c3: "#fde047", background: "#030712" } },
  { id: "terrain", name: "Landscape", config: { amplitude: 1, frequency: 1, detail: 70, zoom: 6, wireframe: true, c1: "#22d3ee", c2: "#a855f7", c3: "#ff4d8d", background: "#07010f", parallax: 0.4 } },
  { id: "shapes", name: "Floating shapes", config: { amplitude: 0.35, frequency: 1, count: 90, shape: "icosa", zoom: 8, rotation: 0.6, c1: "#6366f1", c2: "#ec4899", c3: "#fbbf24", background: "#0b0b14" } },
  { id: "tunnel", name: "Tunnel", config: { amplitude: 1.2, frequency: 1, detail: 6, count: 36, zoom: 4, rotation: 1, c1: "#22d3ee", c2: "#a855f7", c3: "#f472b6", background: "#02010a", parallax: 0.3 } },
]

export const DEFAULT_THREE: ThreeConfig = {
  scene: "blob",
  c1: "#4f46e5",
  c2: "#ec4899",
  c3: "#fde68a",
  background: "#0b0b14",
  transparent: false,
  speed: 1,
  amplitude: 0.35,
  frequency: 1.4,
  detail: 48,
  count: 40000,
  rotation: 0.5,
  parallax: 0.6,
  zoom: 4,
  wireframe: false,
  style: "points",
  shape: "sphere",
}

const indent = (s: string, pad: string) =>
  s
    .trimEnd()
    .split("\n")
    .map((l) => (l ? pad + l : l))
    .join("\n")

export function exportHtml(c: ThreeConfig) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>3D background</title>
    <style>
      html, body { margin: 0; height: 100%; background: ${c.transparent ? "transparent" : c.background}; }
      canvas { display: block; width: 100%; height: 100vh; }
    </style>
    <script type="importmap">
      { "imports": { "three": "https://cdn.jsdelivr.net/npm/three@${THREE_VERSION}/build/three.module.js" } }
    </script>
  </head>
  <body>
    <canvas id="scene"></canvas>
    <script type="module">
      import * as THREE from "three";

      function createScene(canvas, config) {
${indent(sceneSource(c.scene), "        ")}
      }

      createScene(document.getElementById("scene"), ${JSON.stringify(c)});
    </script>
  </body>
</html>
`
}

export function exportModule(c: ThreeConfig) {
  return `import * as THREE from "three"

export const sceneConfig = ${JSON.stringify(c, null, 2)}

export function createScene(canvas, config = sceneConfig) {
${indent(sceneSource(c.scene), "  ")}
}
`
}

export function exportReact() {
  return `import { useEffect, useRef } from "react"
import { createScene, sceneConfig } from "./scene"

export function Scene3D({ className, config = sceneConfig }) {
  const ref = useRef(null)

  useEffect(() => {
    const scene = createScene(ref.current, config)
    return () => scene.dispose()
  }, [config])

  return <canvas ref={ref} className={className} style={{ display: "block", width: "100%", height: "100%" }} />
}
`
}
