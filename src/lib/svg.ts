export type Pt = [number, number]

const r = (v: number) => Math.round(v * 10) / 10

export function smoothPath(pts: Pt[], closed: boolean, tension = 1): string {
  const n = pts.length
  if (n < 2) return ""
  const at = (i: number): Pt => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))])
  let d = `M${r(pts[0][0])},${r(pts[0][1])}`
  const segments = closed ? n : n - 1
  for (let i = 0; i < segments; i++) {
    const p0 = at(i - 1)
    const p1 = at(i)
    const p2 = at(i + 1)
    const p3 = at(i + 2)
    const c1: Pt = [p1[0] + ((p2[0] - p0[0]) / 6) * tension, p1[1] + ((p2[1] - p0[1]) / 6) * tension]
    const c2: Pt = [p2[0] - ((p3[0] - p1[0]) / 6) * tension, p2[1] - ((p3[1] - p1[1]) / 6) * tension]
    d += ` C${r(c1[0])},${r(c1[1])} ${r(c2[0])},${r(c2[1])} ${r(p2[0])},${r(p2[1])}`
  }
  return closed ? `${d} Z` : d
}

export function linePath(pts: Pt[]): string {
  return pts.map((p, i) => `${i === 0 ? "M" : "L"}${r(p[0])},${r(p[1])}`).join(" ")
}

export function svgDataUri(svg: string) {
  const compact = svg.replace(/\n\s*/g, " ").replace(/"/g, "'")
  return `data:image/svg+xml,${compact.replace(/[\r\n%#()<>?[\\\]^`{|}]/g, encodeURIComponent)}`
}

export function svgToJsx(svg: string) {
  return svg
    .replace(/stroke-width=/g, "strokeWidth=")
    .replace(/stop-color=/g, "stopColor=")
    .replace(/stop-opacity=/g, "stopOpacity=")
    .replace(/fill-opacity=/g, "fillOpacity=")
    .replace(/stroke-linejoin=/g, "strokeLinejoin=")
    .replace(/xmlns:xlink="[^"]*"/g, "")
}
