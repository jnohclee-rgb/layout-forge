import { cloneNode, createNode, flexLayout, gridLayout, track } from "@/layout/defaults"
import { effAt, findNode, findParent, firstFreeCell, gridEff, shiftForInsert, shiftForRemove, uniqueName } from "@/layout/tree"
import type { Axis, LayoutNode, LayoutType } from "@/layout/types"

export function insertTrack(node: LayoutNode, axis: Axis, index: number, size?: string) {
  if (node.layout?.type !== "grid") return
  const list = node.layout[axis]
  const ref = list[Math.min(index, list.length - 1)]?.size ?? "1fr"
  list.splice(index, 0, track(size ?? ref))
  shiftForInsert(node.children, axis, index)
}

export function removeTrack(node: LayoutNode, axis: Axis, index: number) {
  if (node.layout?.type !== "grid" || node.layout[axis].length <= 1) return
  node.layout[axis].splice(index, 1)
  shiftForRemove(node.children, axis, index)
}

export function setTrackCount(node: LayoutNode, axis: Axis, count: number) {
  if (node.layout?.type !== "grid") return
  while (node.layout[axis].length < count) insertTrack(node, axis, node.layout[axis].length)
  while (node.layout[axis].length > count && node.layout[axis].length > 1) removeTrack(node, axis, node.layout[axis].length - 1)
}

export function setLayoutType(node: LayoutNode, type: LayoutType | null) {
  if ((node.layout?.type ?? null) === type) return
  if (type === null) {
    node.layout = null
    node.children = []
    return
  }
  if (type === "flex") {
    node.layout = flexLayout()
    return
  }
  const n = node.children.length
  const cols = n === 0 ? 2 : Math.min(n, 3)
  const rows = n === 0 ? 2 : Math.ceil(n / cols)
  node.layout = gridLayout(Array(cols).fill("1fr"), Array(rows).fill("1fr"), 8)
  node.children.forEach((ch, i) => {
    const c = (i % cols) + 1
    const r = Math.floor(i / cols) + 1
    ch.area = { c1: c, c2: c + 1, r1: r, r2: r + 1 }
  })
}

export function addChild(root: LayoutNode, parentId: string, partial: Partial<LayoutNode> = {}) {
  const parent = findNode(root, parentId)
  if (!parent?.layout) return null
  const child = createNode({ name: uniqueName(root, partial.name ?? "item"), ...partial })
  if (parent.layout.type === "grid" && !partial.area) {
    const eff = effAt(root, parentId) ?? gridEff(parent, null)
    if (eff) child.area = firstFreeCell(parent, eff)
  }
  parent.children.push(child)
  return child.id
}

export function removeNode(root: LayoutNode, id: string) {
  const parent = findParent(root, id)
  if (!parent) return
  parent.children = parent.children.filter((c) => c.id !== id)
}

export function duplicateNode(root: LayoutNode, id: string, newId?: string) {
  const parent = findParent(root, id)
  const node = findNode(root, id)
  if (!parent || !node) return null
  const copy = cloneNode(node)
  if (newId) copy.id = newId
  const rename = (n: LayoutNode) => {
    n.name = uniqueName(root, n.name)
    n.children.forEach(rename)
  }
  rename(copy)
  if (parent.layout?.type === "grid") {
    const eff = effAt(root, parent.id)
    if (eff) {
      const free = firstFreeCell(parent, eff)
      const w = node.area.c2 - node.area.c1
      const h = node.area.r2 - node.area.r1
      copy.area = { c1: free.c1, c2: free.c1 + w, r1: free.r1, r2: free.r1 + h }
    }
  }
  const idx = parent.children.findIndex((c) => c.id === id)
  parent.children.splice(idx + 1, 0, copy)
  return copy.id
}

export function reorderChild(parent: LayoutNode, id: string, refId: string, before: boolean) {
  const moving = parent.children.find((c) => c.id === id)
  if (!moving || id === refId) return
  const rest = parent.children.filter((c) => c.id !== id)
  const idx = rest.findIndex((c) => c.id === refId)
  if (idx < 0) return
  rest.splice(before ? idx : idx + 1, 0, moving)
  parent.children = rest
}

export function moveChild(parent: LayoutNode, id: string, delta: number) {
  const idx = parent.children.findIndex((c) => c.id === id)
  const to = idx + delta
  if (idx < 0 || to < 0 || to >= parent.children.length) return
  const [item] = parent.children.splice(idx, 1)
  parent.children.splice(to, 0, item)
}
