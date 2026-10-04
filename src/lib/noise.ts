import { rng } from "@/lib/random"

const G = [
  [1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1],
]

export function simplex2(seed: number) {
  const rand = rng(seed)
  const p = Array.from({ length: 256 }, (_, i) => i)
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[p[i], p[j]] = [p[j], p[i]]
  }
  const perm = new Uint8Array(512)
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255]
  const F2 = 0.5 * (Math.sqrt(3) - 1)
  const G2 = (3 - Math.sqrt(3)) / 6
  return (x: number, y: number) => {
    const s = (x + y) * F2
    const i = Math.floor(x + s)
    const j = Math.floor(y + s)
    const t = (i + j) * G2
    const x0 = x - (i - t)
    const y0 = y - (j - t)
    const i1 = x0 > y0 ? 1 : 0
    const j1 = x0 > y0 ? 0 : 1
    const x1 = x0 - i1 + G2
    const y1 = y0 - j1 + G2
    const x2 = x0 - 1 + 2 * G2
    const y2 = y0 - 1 + 2 * G2
    const ii = i & 255
    const jj = j & 255
    const corner = (gi: number, cx: number, cy: number) => {
      const tt = 0.5 - cx * cx - cy * cy
      if (tt < 0) return 0
      const g = G[gi % 8]
      return tt * tt * tt * tt * (g[0] * cx + g[1] * cy)
    }
    const n0 = corner(perm[ii + perm[jj]], x0, y0)
    const n1 = corner(perm[ii + i1 + perm[jj + j1]], x1, y1)
    const n2 = corner(perm[ii + 1 + perm[jj + 1]], x2, y2)
    return 70 * (n0 + n1 + n2)
  }
}

export function fbm(noise: (x: number, y: number) => number, x: number, y: number, octaves: number) {
  let sum = 0
  let amp = 1
  let freq = 1
  let norm = 0
  for (let o = 0; o < octaves; o++) {
    sum += noise(x * freq, y * freq) * amp
    norm += amp
    amp *= 0.5
    freq *= 2
  }
  return sum / norm
}
