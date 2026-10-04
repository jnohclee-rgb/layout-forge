import type { CSSProperties } from "react"
import type { AutoRepeat, GridEff, Layout, LayoutNode } from "@/layout/types"

export type Decl = [string, string]

export interface DeclOptions {
  explicit?: GridEff
  demo?: boolean
  areaName?: string
  templateAreas?: string[]
  skipSize?: boolean
  skipItem?: boolean
}

export function trackList(sizes: string[]): string {
  if (sizes.length === 0) return "none"
  const out: string[] = []
  let i = 0
  while (i < sizes.length) {
    let j = i
    while (j + 1 < sizes.length && sizes[j + 1] === sizes[i]) j++
    const run = j - i + 1
    if (run >= 3) out.push(`repeat(${run}, ${sizes[i]})`)
    else for (let k = 0; k < run; k++) out.push(sizes[i])
    i = j + 1
  }
  return out.join(" ")
}

function gapDecls(col: number | null, row: number | null): Decl[] {
  if (col !== null && row !== null && col === row) return col > 0 ? [["gap", `${col}px`]] : []
  const out: Decl[] = []
  if (row !== null && row > 0) out.push(["row-gap", `${row}px`])
  if (col !== null && col > 0) out.push(["column-gap", `${col}px`])
  return out
}

export function autoTrack(a: AutoRepeat) {
  return `repeat(${a.mode}, minmax(${a.min}, ${a.max}))`
}

export function nodeDecls(node: LayoutNode, parentLayout: Layout | null, o: DeclOptions = {}): Decl[] {
  const d: Decl[] = []
  const layout = node.layout
  const parent = parentLayout?.type ?? null
  const autoParent = parentLayout?.type === "grid" && !!parentLayout.auto
  if (layout?.type === "grid" && layout.auto) {
    d.push(["display", "grid"])
    d.push(["grid-template-columns", autoTrack(layout.auto)])
    if (layout.autoRows && layout.autoRows !== "auto") d.push(["grid-auto-rows", layout.autoRows])
    d.push(...gapDecls(layout.columnGap, layout.rowGap))
    if (layout.justifyItems !== "normal") d.push(["justify-items", layout.justifyItems])
    if (layout.alignItems !== "normal") d.push(["align-items", layout.alignItems])
    if (layout.justifyContent !== "normal") d.push(["justify-content", layout.justifyContent])
    if (layout.alignContent !== "normal") d.push(["align-content", layout.alignContent])
  } else if (layout?.type === "grid") {
    const subCols = !o.explicit && parent === "grid" && !autoParent && layout.subgridColumns
    const subRows = !o.explicit && parent === "grid" && !autoParent && layout.subgridRows
    d.push(["display", "grid"])
    d.push(["grid-template-columns", subCols ? "subgrid" : trackList(o.explicit?.columns ?? layout.columns.map((t) => t.size))])
    d.push(["grid-template-rows", subRows ? "subgrid" : trackList(o.explicit?.rows ?? layout.rows.map((t) => t.size))])
    if (o.templateAreas) d.push(["grid-template-areas", o.templateAreas.map((r) => `"${r}"`).join("\n    ")])
    d.push(...gapDecls(subCols ? null : (o.explicit?.columnGap ?? layout.columnGap), subRows ? null : (o.explicit?.rowGap ?? layout.rowGap)))
    if (layout.justifyItems !== "normal") d.push(["justify-items", layout.justifyItems])
    if (layout.alignItems !== "normal") d.push(["align-items", layout.alignItems])
    if (layout.justifyContent !== "normal") d.push(["justify-content", layout.justifyContent])
    if (layout.alignContent !== "normal") d.push(["align-content", layout.alignContent])
  } else if (layout?.type === "flex") {
    d.push(["display", "flex"])
    if (layout.direction !== "row") d.push(["flex-direction", layout.direction])
    if (layout.wrap !== "nowrap") d.push(["flex-wrap", layout.wrap])
    d.push(...gapDecls(layout.columnGap, layout.rowGap))
    if (layout.justifyContent !== "normal") d.push(["justify-content", layout.justifyContent])
    if (layout.alignItems !== "normal") d.push(["align-items", layout.alignItems])
    if (layout.alignContent !== "normal") d.push(["align-content", layout.alignContent])
  }
  if (!o.skipItem && autoParent) {
    const cs = node.area.c2 - node.area.c1
    const rs = node.area.r2 - node.area.r1
    if (cs > 1) d.push(["grid-column", `span ${cs}`])
    if (rs > 1) d.push(["grid-row", `span ${rs}`])
    if (node.justifySelf !== "auto") d.push(["justify-self", node.justifySelf])
    if (node.alignSelf !== "auto") d.push(["align-self", node.alignSelf])
  } else if (!o.skipItem && parent === "grid") {
    if (o.areaName) d.push(["grid-area", o.areaName])
    else {
      d.push(["grid-column", `${node.area.c1} / ${node.area.c2}`])
      d.push(["grid-row", `${node.area.r1} / ${node.area.r2}`])
    }
    if (node.justifySelf !== "auto") d.push(["justify-self", node.justifySelf])
    if (node.alignSelf !== "auto") d.push(["align-self", node.alignSelf])
  }
  if (!o.skipItem && parent === "flex") {
    const { grow, shrink, basis } = node.flex
    if (!(grow === 0 && shrink === 1 && basis === "auto")) d.push(["flex", `${grow} ${shrink} ${basis}`])
    if (node.alignSelf !== "auto") d.push(["align-self", node.alignSelf])
  }
  if (!o.skipSize) {
    if (node.width) d.push(["width", node.width])
    if (node.height) d.push(["height", node.height])
    if (node.minHeight) d.push(["min-height", node.minHeight])
  }
  if (node.padding > 0) d.push(["padding", `${node.padding}px`])
  if (o.demo) {
    if (node.radius > 0) d.push(["border-radius", `${node.radius}px`])
    d.push(["background", `${node.color}1f`])
    d.push(["border", `1px solid ${node.color}66`])
  }
  if (node.hidden && !o.skipItem) {
    const i = d.findIndex(([p]) => p === "display")
    if (i >= 0) d[i] = ["display", "none"]
    else d.unshift(["display", "none"])
  }
  return d
}

const camel = (p: string) => (p.startsWith("--") ? p : p.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()))

export function toStyle(decls: Decl[]): CSSProperties {
  const s: Record<string, string> = {}
  for (const [p, v] of decls) s[camel(p)] = v.replace(/\n\s*/g, " ")
  return s as CSSProperties
}

export function isValidTrack(value: string) {
  const v = value.trim()
  if (!v || /^repeat\(/i.test(v)) return false
  if (typeof CSS === "undefined" || !CSS.supports) return true
  return CSS.supports("grid-template-columns", v) && !/\s/.test(v.replace(/\([^)]*\)/g, ""))
}

export function isValidSize(value: string) {
  const v = value.trim()
  if (!v) return false
  if (typeof CSS === "undefined" || !CSS.supports) return true
  return CSS.supports("width", v) || CSS.supports("grid-template-columns", `minmax(${v}, 1fr)`)
}

export function isValidLength(prop: string, value: string) {
  const v = value.trim()
  if (!v) return true
  if (typeof CSS === "undefined" || !CSS.supports) return true
  return CSS.supports(prop, v)
}
