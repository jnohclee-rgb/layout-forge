import type { Area, Axis, GridEff, LayoutNode } from "@/layout/types"

export function findNode(root: LayoutNode, id: string): LayoutNode | null {
  if (root.id === id) return root
  for (const child of root.children) {
    const hit = findNode(child, id)
    if (hit) return hit
  }
  return null
}

export function findPath(root: LayoutNode, id: string): LayoutNode[] | null {
  if (root.id === id) return [root]
  for (const child of root.children) {
    const sub = findPath(child, id)
    if (sub) return [root, ...sub]
  }
  return null
}

export function findParent(root: LayoutNode, id: string): LayoutNode | null {
  const path = findPath(root, id)
  return path && path.length > 1 ? path[path.length - 2] : null
}

export function gridEff(node: LayoutNode, parentEff: GridEff | null): GridEff | null {
  const layout = node.layout
  if (!layout || layout.type !== "grid" || layout.auto) return null
  const subCols = layout.subgridColumns && parentEff
  const subRows = layout.subgridRows && parentEff
  return {
    columns: subCols ? parentEff.columns.slice(node.area.c1 - 1, node.area.c2 - 1) : layout.columns.map((t) => t.size),
    rows: subRows ? parentEff.rows.slice(node.area.r1 - 1, node.area.r2 - 1) : layout.rows.map((t) => t.size),
    columnGap: subCols ? parentEff.columnGap : layout.columnGap,
    rowGap: subRows ? parentEff.rowGap : layout.rowGap,
  }
}

export function effAt(root: LayoutNode, id: string): GridEff | null {
  const path = findPath(root, id)
  if (!path) return null
  let eff: GridEff | null = null
  for (const node of path) eff = gridEff(node, eff)
  return eff
}

export function isSubgridAxis(root: LayoutNode, id: string, axis: Axis) {
  const path = findPath(root, id)
  if (!path) return false
  const node = path[path.length - 1]
  const parent = path[path.length - 2]
  if (!node.layout || node.layout.type !== "grid" || !parent?.layout || parent.layout.type !== "grid") return false
  return axis === "columns" ? node.layout.subgridColumns : node.layout.subgridRows
}

export function clampArea(a: Area, cols: number, rows: number): Area {
  const c1 = Math.min(Math.max(1, a.c1), Math.max(1, cols))
  const r1 = Math.min(Math.max(1, a.r1), Math.max(1, rows))
  const c2 = Math.min(Math.max(c1 + 1, a.c2), Math.max(c1 + 1, cols + 1))
  const r2 = Math.min(Math.max(r1 + 1, a.r2), Math.max(r1 + 1, rows + 1))
  return { c1, c2, r1, r2 }
}

function sameArea(a: Area, b: Area) {
  return a.c1 === b.c1 && a.c2 === b.c2 && a.r1 === b.r1 && a.r2 === b.r2
}

export function normalizeDraft(node: LayoutNode, parentEff: GridEff | null = null) {
  const eff = gridEff(node, parentEff)
  for (const child of node.children) {
    if (eff) {
      const next = clampArea(child.area, eff.columns.length, eff.rows.length)
      if (!sameArea(next, child.area)) child.area = next
    }
    normalizeDraft(child, eff)
  }
}

export function shiftForInsert(children: LayoutNode[], axis: Axis, index: number) {
  const line = index + 1
  for (const ch of children) {
    const a = ch.area
    if (axis === "columns") {
      if (a.c1 >= line) {
        a.c1++
        a.c2++
      } else if (a.c2 > line) a.c2++
    } else {
      if (a.r1 >= line) {
        a.r1++
        a.r2++
      } else if (a.r2 > line) a.r2++
    }
  }
}

export function shiftForRemove(children: LayoutNode[], axis: Axis, index: number) {
  const line = index + 1
  for (const ch of children) {
    const a = ch.area
    if (axis === "columns") {
      if (a.c1 > line) a.c1--
      if (a.c2 > line) a.c2--
      if (a.c2 <= a.c1) a.c2 = a.c1 + 1
    } else {
      if (a.r1 > line) a.r1--
      if (a.r2 > line) a.r2--
      if (a.r2 <= a.r1) a.r2 = a.r1 + 1
    }
  }
}

export function firstFreeCell(node: LayoutNode, eff: GridEff): Area {
  const cols = eff.columns.length
  const rows = eff.rows.length
  for (let r = 1; r <= rows; r++) {
    for (let c = 1; c <= cols; c++) {
      const taken = node.children.some((ch) => ch.area.c1 <= c && c < ch.area.c2 && ch.area.r1 <= r && r < ch.area.r2)
      if (!taken) return { c1: c, c2: c + 1, r1: r, r2: r + 1 }
    }
  }
  return { c1: 1, c2: 2, r1: 1, r2: 2 }
}

export function uniqueName(root: LayoutNode, base: string) {
  const names = new Set<string>()
  const walk = (n: LayoutNode) => {
    names.add(n.name)
    n.children.forEach(walk)
  }
  walk(root)
  if (!names.has(base)) return base
  let i = 2
  while (names.has(`${base}-${i}`)) i++
  return `${base}-${i}`
}

export function countNodes(node: LayoutNode): number {
  return 1 + node.children.reduce((s, c) => s + countNodes(c), 0)
}
