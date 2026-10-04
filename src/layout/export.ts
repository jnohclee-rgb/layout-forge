import { PLACEHOLDER_CSS, contentKind, placeholderMarkup } from "@/layout/content"
import { type Decl, nodeDecls } from "@/layout/css"
import { BREAKPOINTS, resolveTree, usedBreakpoints } from "@/layout/responsive"
import { effAt } from "@/layout/tree"
import type { Bp, GridEff, Layout, LayoutNode } from "@/layout/types"

export interface CodeOptions {
  areas: boolean
  demo: boolean
  content: boolean
}

const TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m",
  н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch", ъ: "",
  ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
}

const RESERVED = new Set(["auto", "span", "inherit", "initial", "unset", "revert", "default", "none"])

export function slug(name: string) {
  const s = name
    .trim()
    .toLowerCase()
    .split("")
    .map((ch) => TRANSLIT[ch] ?? ch)
    .join("")
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
  if (!s) return "item"
  if (/^[0-9]/.test(s) || RESERVED.has(s)) return `el-${s}`
  return s
}

export function classMap(root: LayoutNode) {
  const used = new Map<string, number>()
  const map = new Map<string, string>()
  const walk = (n: LayoutNode) => {
    const base = slug(n.name)
    const count = used.get(base) ?? 0
    used.set(base, count + 1)
    map.set(n.id, count === 0 ? base : `${base}-${count + 1}`)
    n.children.forEach(walk)
  }
  walk(root)
  return map
}

function templateAreas(node: LayoutNode, eff: GridEff, classes: Map<string, string>, parent: Layout | null) {
  const layout = node.layout
  if (layout?.type !== "grid" || layout.auto || node.children.length === 0) return null
  if (parent?.type === "grid" && (layout.subgridColumns || layout.subgridRows)) return null
  const cols = eff.columns.length
  const rows = eff.rows.length
  const grid: string[][] = Array.from({ length: rows }, () => Array(cols).fill("."))
  for (const ch of node.children) {
    const a = ch.area
    if (a.c1 < 1 || a.r1 < 1 || a.c2 > cols + 1 || a.r2 > rows + 1) return null
    for (let r = a.r1 - 1; r < a.r2 - 1; r++) {
      for (let c = a.c1 - 1; c < a.c2 - 1; c++) {
        if (grid[r][c] !== ".") return null
        grid[r][c] = classes.get(ch.id) as string
      }
    }
  }
  const widths = Array.from({ length: cols }, (_, c) => Math.max(...grid.map((row) => row[c].length)))
  return grid.map((row) => row.map((cell, c) => cell.padEnd(widths[c])).join(" ").trimEnd())
}

interface Entry {
  node: LayoutNode
  cls: string
  per: Decl[][]
}

interface Collected {
  bps: Bp[]
  entries: Entry[]
}

function index(root: LayoutNode) {
  const nodes = new Map<string, LayoutNode>()
  const parents = new Map<string, LayoutNode>()
  const walk = (n: LayoutNode) => {
    nodes.set(n.id, n)
    n.children.forEach((c) => {
      parents.set(c.id, n)
      walk(c)
    })
  }
  walk(root)
  return { nodes, parents }
}

function collect(root: LayoutNode, opts: CodeOptions, forceLines: boolean): Collected {
  const classes = classMap(root)
  const used = usedBreakpoints(root)
  const bps = BREAKPOINTS.map((b) => b.id).filter((b) => used.has(b))
  const trees = bps.map((b) => resolveTree(root, b))
  const idx = trees.map(index)

  const areasByContainer = new Map<string, (string[] | null)[]>()
  if (opts.areas && !forceLines) {
    const walk = (n: LayoutNode) => {
      if (n.layout?.type === "grid") {
        const list = trees.map((tree, i) => {
          const rn = idx[i].nodes.get(n.id) as LayoutNode
          const eff = effAt(tree, n.id)
          return eff ? templateAreas(rn, eff, classes, idx[i].parents.get(n.id)?.layout ?? null) : null
        })
        if (list.every((x) => x !== null)) areasByContainer.set(n.id, list)
      }
      n.children.forEach(walk)
    }
    walk(root)
  }

  const entries: Entry[] = []
  const walk = (n: LayoutNode) => {
    const per = trees.map((_, i) => {
      const rn = idx[i].nodes.get(n.id) as LayoutNode
      const parent = idx[i].parents.get(n.id) ?? null
      const areas = areasByContainer.get(n.id)?.[i] ?? undefined
      const areaName = parent && areasByContainer.has(parent.id) ? classes.get(n.id) : undefined
      return nodeDecls(rn, parent?.layout ?? null, { demo: opts.demo, areaName, templateAreas: areas })
    })
    entries.push({ node: n, cls: classes.get(n.id) as string, per })
    n.children.forEach(walk)
  }
  walk(root)
  return { bps, entries }
}

const RESET: Record<string, string> = {
  display: "block",
  "flex-direction": "row",
  "flex-wrap": "nowrap",
  "justify-content": "normal",
  "align-items": "normal",
  "align-content": "normal",
  "justify-items": "normal",
  "row-gap": "0",
  "column-gap": "0",
  "grid-template-columns": "none",
  "grid-template-rows": "none",
  "grid-template-areas": "none",
  "grid-auto-rows": "auto",
  "grid-column": "auto",
  "grid-row": "auto",
  "grid-area": "auto",
  "justify-self": "auto",
  "align-self": "auto",
  flex: "0 1 auto",
  width: "auto",
  height: "auto",
  "min-height": "auto",
  padding: "0",
  "border-radius": "0",
}

function expandGap(decls: Decl[]): Decl[] {
  return decls.flatMap(([p, v]): Decl[] => (p === "gap" ? [["row-gap", v], ["column-gap", v]] : [[p, v]]))
}

function diffDecls(prev: Decl[], cur: Decl[]): Decl[] {
  const a = new Map(expandGap(prev))
  const b = expandGap(cur)
  const out: Decl[] = []
  for (const [p, v] of b) if (a.get(p) !== v) out.push([p, v])
  const has = new Set(b.map(([p]) => p))
  for (const [p] of a) if (!has.has(p)) out.push([p, RESET[p] ?? "initial"])
  return out
}

const rule = (cls: string, decls: Decl[], pad = "") =>
  `${pad}.${cls} {\n${decls.map(([p, v]) => `${pad}  ${p}: ${v.replace(/\n/g, `\n${pad}`)};`).join("\n")}\n${pad}}`

export function generateCss(root: LayoutNode, opts: CodeOptions) {
  const { bps, entries } = collect(root, opts, false)
  const reset = `*,\n*::before,\n*::after {\n  box-sizing: border-box;\n}\n\nbody {\n  margin: 0;\n  font-family: system-ui, sans-serif;\n}\n\n${opts.content ? PLACEHOLDER_CSS : ""}`
  const blocks = [entries.map((e) => rule(e.cls, e.per[0])).join("\n\n")]
  for (let i = 1; i < bps.length; i++) {
    const rules = entries
      .map((e) => ({ cls: e.cls, decls: diffDecls(e.per[i - 1], e.per[i]) }))
      .filter((r) => r.decls.length > 0)
      .map((r) => rule(r.cls, r.decls, "  "))
    if (rules.length === 0) continue
    const min = BREAKPOINTS.find((b) => b.id === bps[i])?.min
    blocks.push(`@media (min-width: ${min}px) {\n${rules.join("\n\n")}\n}`)
  }
  return reset + blocks.join("\n\n") + "\n"
}

function escapeText(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function renderTree(root: LayoutNode, attr: (node: LayoutNode) => string, baseIndent: number, content: boolean, jsx: boolean) {
  const lines: string[] = []
  const walk = (node: LayoutNode, depth: number) => {
    const pad = "  ".repeat(depth + baseIndent)
    const open = `<div ${attr(node)}>`
    if (node.children.length === 0) {
      if (!content) {
        lines.push(`${pad}${open}${escapeText(node.name)}</div>`)
        return
      }
      lines.push(`${pad}${open}`)
      placeholderMarkup(contentKind(node), jsx).forEach((l) => lines.push(`${pad}  ${l}`))
      lines.push(`${pad}</div>`)
      return
    }
    lines.push(`${pad}${open}`)
    node.children.forEach((c) => walk(c, depth + 1))
    lines.push(`${pad}</div>`)
  }
  walk(root, 0)
  return lines.join("\n")
}

export function generateHtml(root: LayoutNode, opts: CodeOptions) {
  const classes = classMap(root)
  return renderTree(root, (n) => `class="${classes.get(n.id)}"`, 0, opts.content, false) + "\n"
}

export function generateDocument(root: LayoutNode, opts: CodeOptions) {
  const classes = classMap(root)
  const css = generateCss(root, opts)
    .trimEnd()
    .split("\n")
    .map((l) => (l ? `      ${l}` : l))
    .join("\n")
  const body = renderTree(root, (n) => `class="${classes.get(n.id)}"`, 2, opts.content, false)
  return `<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="utf-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1" />\n    <title>Layout</title>\n    <style>\n${css}\n    </style>\n  </head>\n  <body>\n${body}\n  </body>\n</html>\n`
}

const us = (v: string) => v.trim().replace(/\s*,\s*/g, ",").replace(/\s+/g, "_")

function space(prefix: string, v: string) {
  const px = parseFloat(v)
  if (v === "0") return `${prefix}-0`
  if (v.endsWith("px") && Number.isFinite(px) && px % 4 === 0) return `${prefix}-${px / 4}`
  return `${prefix}-[${us(v)}]`
}

const ALIGN: Record<string, string> = {
  start: "start",
  "flex-start": "start",
  end: "end",
  "flex-end": "end",
  center: "center",
  stretch: "stretch",
  baseline: "baseline",
  normal: "normal",
  auto: "auto",
  "space-between": "between",
  "space-around": "around",
  "space-evenly": "evenly",
}

function sizeClass(prefix: string, v: string) {
  if (v === "100%") return `${prefix}-full`
  if (v === "auto") return `${prefix}-auto`
  if (v === "100vh" && prefix !== "w") return `${prefix}-screen`
  if (v === "100vw" && prefix === "w") return "w-screen"
  return `${prefix}-[${us(v)}]`
}

function lineClasses(pre: "col" | "row", v: string) {
  if (v === "auto") return [`${pre}-auto`]
  const span = v.match(/^span (\d+)$/)
  if (span) return [`${pre}-span-${span[1]}`]
  const [a, b] = v.split("/").map((s) => s.trim())
  return [`${pre}-start-${a}`, `${pre}-end-${b}`]
}

function tailwindFor([p, v]: Decl): string[] {
  switch (p) {
    case "display":
      return [v === "none" ? "hidden" : v]
    case "grid-template-columns":
    case "grid-template-rows": {
      const pre = p.endsWith("columns") ? "grid-cols" : "grid-rows"
      if (v === "subgrid" || v === "none") return [`${pre}-${v}`]
      const m = v.match(/^repeat\((\d+), minmax\(0, ?1fr\)\)$/)
      if (m) return [`${pre}-${m[1]}`]
      return [`${pre}-[${us(v)}]`]
    }
    case "grid-auto-rows":
      return [v === "auto" ? "auto-rows-auto" : `auto-rows-[${us(v)}]`]
    case "gap":
      return [space("gap", v)]
    case "column-gap":
      return [space("gap-x", v)]
    case "row-gap":
      return [space("gap-y", v)]
    case "padding":
      return [space("p", v)]
    case "justify-items":
      return [`justify-items-${ALIGN[v] ?? v}`]
    case "align-items":
      return [`items-${ALIGN[v] ?? v}`]
    case "justify-content":
      return [`justify-${ALIGN[v] ?? v}`]
    case "align-content":
      return [`content-${ALIGN[v] ?? v}`]
    case "justify-self":
      return [`justify-self-${ALIGN[v] ?? v}`]
    case "align-self":
      return [`self-${ALIGN[v] ?? v}`]
    case "flex-direction":
      return [`flex-${v.replace("column", "col")}`]
    case "flex-wrap":
      return [`flex-${v}`]
    case "flex": {
      if (v === "1 1 0%") return ["flex-1"]
      if (v === "0 0 auto") return ["flex-none"]
      if (v === "1 1 auto") return ["flex-auto"]
      if (v === "0 1 auto") return ["flex-initial"]
      return [`flex-[${us(v)}]`]
    }
    case "grid-column":
      return lineClasses("col", v)
    case "grid-row":
      return lineClasses("row", v)
    case "width":
      return [sizeClass("w", v)]
    case "height":
      return [sizeClass("h", v)]
    case "min-height":
      return [sizeClass("min-h", v)]
    case "border-radius":
      return [v === "0" ? "rounded-none" : `rounded-[${v}]`]
    case "background":
      return [`bg-[${v}]`]
    case "border": {
      const color = v.split(" ").pop()
      return ["border", `border-[${color}]`]
    }
    default:
      return [`[${p}:${us(v)}]`]
  }
}

export function generateJsx(root: LayoutNode, opts: CodeOptions) {
  const { bps, entries } = collect(root, { ...opts, areas: false }, true)
  const byId = new Map(entries.map((e) => [e.node.id, e]))
  const classesFor = (n: LayoutNode) => {
    const e = byId.get(n.id) as Entry
    const list = e.per[0].flatMap(tailwindFor)
    for (let i = 1; i < bps.length; i++) list.push(...diffDecls(e.per[i - 1], e.per[i]).flatMap(tailwindFor).map((c) => `${bps[i]}:${c}`))
    return list.join(" ")
  }
  const tree = renderTree(root, (n) => `className="${classesFor(n)}"`, 2, opts.content, true)
  return `export default function Layout() {\n  return (\n${tree}\n  )\n}\n`
}
