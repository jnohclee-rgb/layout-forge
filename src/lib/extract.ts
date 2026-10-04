import { type Oklch, oklchToHex, rgbToOklch } from "@/lib/color"

export interface Extracted {
  hex: string
  weight: number
  oklch: Oklch
}

type Lab = [number, number, number]

function toLab(r: number, g: number, b: number): Lab {
  const o = rgbToOklch({ r: r / 255, g: g / 255, b: b / 255 })
  const h = (o.h * Math.PI) / 180
  return [o.l, o.c * Math.cos(h), o.c * Math.sin(h)]
}

function fromLab([l, a, b]: Lab): Oklch {
  const c = Math.sqrt(a * a + b * b)
  let h = (Math.atan2(b, a) * 180) / Math.PI
  if (h < 0) h += 360
  return { l, c, h }
}

const dist = (p: Lab, q: Lab) => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2

async function loadPixels(file: Blob, size = 96): Promise<Lab[]> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, size / Math.max(bitmap.width, bitmap.height))
  const w = Math.max(1, Math.round(bitmap.width * scale))
  const h = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext("2d", { willReadFrequently: true })
  if (!ctx) throw new Error("Canvas unavailable")
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()
  const data = ctx.getImageData(0, 0, w, h).data
  const out: Lab[] = []
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue
    out.push(toLab(data[i], data[i + 1], data[i + 2]))
  }
  return out
}

function kmeans(points: Lab[], k: number): { center: Lab; size: number }[] {
  if (points.length === 0) return []
  const centers: Lab[] = [points[Math.floor(points.length / 2)]]
  const d2 = new Float64Array(points.length).fill(Infinity)
  while (centers.length < k) {
    const last = centers[centers.length - 1]
    let total = 0
    for (let i = 0; i < points.length; i++) {
      d2[i] = Math.min(d2[i], dist(points[i], last))
      total += d2[i]
    }
    if (total === 0) break
    let r = ((centers.length * 7919) % 1000) / 1000 * total
    let idx = 0
    while (idx < points.length - 1 && r > d2[idx]) r -= d2[idx++]
    centers.push(points[idx])
  }
  const assign = new Int32Array(points.length)
  for (let iter = 0; iter < 16; iter++) {
    let moved = false
    for (let i = 0; i < points.length; i++) {
      let best = 0
      let bd = Infinity
      for (let c = 0; c < centers.length; c++) {
        const d = dist(points[i], centers[c])
        if (d < bd) {
          bd = d
          best = c
        }
      }
      if (assign[i] !== best) {
        assign[i] = best
        moved = true
      }
    }
    const sums = centers.map(() => [0, 0, 0, 0])
    for (let i = 0; i < points.length; i++) {
      const s = sums[assign[i]]
      s[0] += points[i][0]
      s[1] += points[i][1]
      s[2] += points[i][2]
      s[3]++
    }
    sums.forEach((s, c) => {
      if (s[3] > 0) centers[c] = [s[0] / s[3], s[1] / s[3], s[2] / s[3]]
    })
    if (!moved && iter > 0) break
  }
  const sizes = centers.map(() => 0)
  for (let i = 0; i < points.length; i++) sizes[assign[i]]++
  return centers.map((center, i) => ({ center, size: sizes[i] })).filter((c) => c.size > 0)
}

export async function extractColors(file: Blob, k = 8): Promise<Extracted[]> {
  const points = await loadPixels(file)
  const clusters = kmeans(points, k)
  const total = points.length || 1
  const merged: Extracted[] = []
  for (const cl of clusters.sort((a, b) => b.size - a.size)) {
    const near = merged.find((m) => {
      const o = m.oklch
      const h = (o.h * Math.PI) / 180
      return dist([o.l, o.c * Math.cos(h), o.c * Math.sin(h)], cl.center) < 0.0016
    })
    if (near) {
      near.weight += cl.size / total
      continue
    }
    const oklch = fromLab(cl.center)
    merged.push({ hex: oklchToHex(oklch), weight: cl.size / total, oklch })
  }
  return merged
}

export function pickBase(colors: Extracted[]): Extracted | null {
  if (colors.length === 0) return null
  const score = (c: Extracted) => c.oklch.c * Math.sqrt(c.weight) * (c.oklch.l > 0.2 && c.oklch.l < 0.9 ? 1 : 0.3)
  return [...colors].sort((a, b) => score(b) - score(a))[0]
}
