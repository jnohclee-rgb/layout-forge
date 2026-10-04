import { current, isDraft, produce } from "immer"
import { normalizeDraft } from "@/layout/tree"
import type { Bp, LayoutNode, NodeOverride, RespKey } from "@/layout/types"

export const BREAKPOINTS: { id: Bp; min: number; frame: number; label: string }[] = [
  { id: "base", min: 0, frame: 390, label: "Base" },
  { id: "sm", min: 640, frame: 640, label: "sm" },
  { id: "md", min: 768, frame: 768, label: "md" },
  { id: "lg", min: 1024, frame: 1024, label: "lg" },
  { id: "xl", min: 1280, frame: 1280, label: "xl" },
]

export const RESP_KEYS: RespKey[] = ["layout", "area", "flex", "width", "height", "minHeight", "alignSelf", "justifySelf", "padding", "hidden"]
const SHARED_KEYS = ["name", "color", "radius", "content"] as const

export const bpIndex = (bp: Bp) => BREAKPOINTS.findIndex((b) => b.id === bp)
export const bpInfo = (bp: Bp) => BREAKPOINTS[bpIndex(bp)]
export const prevBp = (bp: Bp): Bp => BREAKPOINTS[Math.max(0, bpIndex(bp) - 1)].id

export function bpForWidth(width: number): Bp {
  let out: Bp = "base"
  for (const b of BREAKPOINTS) if (width >= b.min) out = b.id
  return out
}

function value(n: LayoutNode | NodeOverride, k: RespKey) {
  return k === "hidden" ? !!n.hidden : n[k]
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

function resolveNode(node: LayoutNode, idx: number): LayoutNode {
  let out: LayoutNode = { ...node, responsive: undefined }
  if (node.responsive) {
    for (const b of BREAKPOINTS.slice(1, idx + 1)) {
      const o = node.responsive[b.id as Exclude<Bp, "base">]
      if (o) out = { ...out, ...o }
    }
  }
  out.children = node.children.map((c) => resolveNode(c, idx))
  return out
}

export function resolveTree(root: LayoutNode, bp: Bp): LayoutNode {
  const r = resolveNode(root, bpIndex(bp))
  normalizeDraft(r)
  return r
}

function index(root: LayoutNode) {
  const map = new Map<string, LayoutNode>()
  const walk = (n: LayoutNode) => {
    map.set(n.id, n)
    n.children.forEach(walk)
  }
  walk(root)
  return map
}

export function applyAtBp(d: LayoutNode, bp: Exclude<Bp, "base">, recipe: (draft: LayoutNode) => void | LayoutNode) {
  const snapshot = isDraft(d) ? current(d) : d
  const before = resolveTree(snapshot, bp)
  const after = produce(before, recipe as (draft: LayoutNode) => void)
  if (after === before) return
  const inherited = index(resolveTree(snapshot, prevBp(bp)))
  const beforeIdx = index(before)
  const draftIdx = index(d)

  const rebuild = (a: LayoutNode): LayoutNode => {
    const target = draftIdx.get(a.id)
    if (!target) return { ...a, responsive: undefined, children: a.children.map(rebuild) }
    const b = beforeIdx.get(a.id) as LayoutNode
    for (const k of SHARED_KEYS) {
      if (!same(a[k], b[k])) (target as unknown as Record<string, unknown>)[k] = a[k]
    }
    for (const k of RESP_KEYS) {
      const next = value(a, k)
      if (same(next, value(b, k))) continue
      const responsive = (target.responsive ??= {})
      const o = (responsive[bp] ??= {}) as Record<string, unknown>
      const inh = inherited.get(a.id)
      if (inh && same(next, value(inh, k))) delete o[k]
      else o[k] = JSON.parse(JSON.stringify(next))
      if (Object.keys(o).length === 0) delete responsive[bp]
    }
    const kids = a.children.map(rebuild)
    if (kids.length !== target.children.length || kids.some((k, i) => k !== target.children[i])) target.children = kids
    return target
  }
  rebuild(after)
}

export function overridesAt(node: LayoutNode, bp: Bp): RespKey[] {
  if (bp === "base") return []
  return Object.keys(node.responsive?.[bp] ?? {}) as RespKey[]
}

export function usedBreakpoints(root: LayoutNode): Set<Bp> {
  const used = new Set<Bp>(["base"])
  const walk = (n: LayoutNode) => {
    for (const [k, v] of Object.entries(n.responsive ?? {})) if (v && Object.keys(v).length) used.add(k as Bp)
    n.children.forEach(walk)
  }
  walk(root)
  return used
}
