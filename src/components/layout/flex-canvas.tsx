import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react"
import { PlusIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { nodeDecls, toStyle } from "@/layout/css"
import type { Layout, LayoutNode } from "@/layout/types"
import { ContainerBadge, Handles, SelectionFrame, type Edge } from "@/components/layout/handles"
import { NodeView } from "@/components/layout/node-view"
import { Button } from "@/components/ui/button"

type Target = { refId: string; before: boolean; line: { x: number; y: number; w: number; h: number } }
type Drag =
  | { kind: "reorder"; id: string; sx: number; sy: number; x: number; y: number; active: boolean; target: Target | null }
  | { kind: "resize"; id: string; edge: Edge; sx: number; sy: number; w0: number; h0: number; w: number; h: number }

export interface FlexCanvasProps {
  node: LayoutNode
  selectedId: string | null
  overlay: boolean
  onSelect: (id: string | null) => void
  onFocus: (id: string) => void
  onReorder: (id: string, refId: string, before: boolean) => void
  onResize: (id: string, edge: Edge, width: number, height: number) => void
  onAdd: () => void
}

const snap = (v: number) => Math.max(16, Math.round(v / 4) * 4)

export function FlexCanvas(p: FlexCanvasProps) {
  const { node, overlay } = p
  const layout = node.layout as Layout
  const isFlex = layout.type === "flex"
  const boxRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<Drag | null>(null)
  const [drag, setDragState] = useState<Drag | null>(null)
  const [tracks, setTracks] = useState(0)
  const horizontal = layout.type === "flex" ? layout.direction.startsWith("row") : true
  const reversed = layout.type === "flex" && layout.direction.endsWith("reverse")

  useLayoutEffect(() => {
    if (isFlex || !boxRef.current) return
    const count = getComputedStyle(boxRef.current).gridTemplateColumns.split(" ").filter(Boolean).length
    if (count !== tracks) setTracks(count)
  })

  useEffect(() => {
    const box = boxRef.current
    if (!box || isFlex) return
    const ro = new ResizeObserver(() => setTracks(getComputedStyle(box).gridTemplateColumns.split(" ").filter(Boolean).length))
    ro.observe(box)
    return () => ro.disconnect()
  }, [isFlex])

  const setDrag = (d: Drag | null) => {
    dragRef.current = d
    setDragState(d)
  }

  const findTarget = (x: number, y: number, dragId: string): Target | null => {
    const box = boxRef.current
    if (!box) return null
    const base = box.getBoundingClientRect()
    let best: { el: HTMLElement; rect: DOMRect; dist: number } | null = null
    box.querySelectorAll<HTMLElement>(":scope > [data-node-id]").forEach((el) => {
      if (el.dataset.nodeId === dragId) return
      const rect = el.getBoundingClientRect()
      const dx = Math.max(rect.left - x, 0, x - rect.right)
      const dy = Math.max(rect.top - y, 0, y - rect.bottom)
      const dist = Math.hypot(dx, dy)
      if (!best || dist < best.dist) best = { el, rect, dist }
    })
    if (!best) return null
    const { el, rect } = best as { el: HTMLElement; rect: DOMRect }
    const firstHalf = horizontal ? x < rect.left + rect.width / 2 : y < rect.top + rect.height / 2
    const before = reversed ? !firstHalf : firstHalf
    const line = horizontal
      ? { x: (firstHalf ? rect.left - 3 : rect.right + 1) - base.left, y: rect.top - base.top, w: 2, h: rect.height }
      : { x: rect.left - base.left, y: (firstHalf ? rect.top - 3 : rect.bottom + 1) - base.top, w: rect.width, h: 2 }
    return { refId: el.dataset.nodeId as string, before, line }
  }

  const active = drag !== null
  useEffect(() => {
    if (!active) return
    const move = (e: PointerEvent) => {
      const d = dragRef.current
      if (!d) return
      if (d.kind === "reorder") {
        const moved = d.active || Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 5
        setDrag({ ...d, x: e.clientX, y: e.clientY, active: moved, target: moved ? findTarget(e.clientX, e.clientY, d.id) : null })
        return
      }
      const w = d.edge.includes("e") ? snap(d.w0 + e.clientX - d.sx) : d.w0
      const h = d.edge.includes("s") ? snap(d.h0 + e.clientY - d.sy) : d.h0
      if (w !== d.w || h !== d.h) setDrag({ ...d, w, h })
    }
    const up = () => {
      const d = dragRef.current
      setDrag(null)
      if (!d) return
      if (d.kind === "reorder") {
        if (d.active && d.target) p.onReorder(d.id, d.target.refId, d.target.before)
        return
      }
      if (d.w !== d.w0 || d.h !== d.h0) p.onResize(d.id, d.edge, d.w, d.h)
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
    window.addEventListener("pointercancel", up)
    return () => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
      window.removeEventListener("pointercancel", up)
    }
  })

  const startReorder = (e: ReactPointerEvent, child: LayoutNode) => {
    if (e.button !== 0) return
    e.stopPropagation()
    p.onSelect(child.id)
    if (!overlay) return
    e.preventDefault()
    setDrag({ kind: "reorder", id: child.id, sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY, active: false, target: null })
  }

  const startResize = (e: ReactPointerEvent, child: LayoutNode, edge: Edge) => {
    const el = boxRef.current?.querySelector<HTMLElement>(`:scope > [data-node-id="${child.id}"]`)
    if (!el) return
    const r = el.getBoundingClientRect()
    setDrag({ kind: "resize", id: child.id, edge, sx: e.clientX, sy: e.clientY, w0: Math.round(r.width), h0: Math.round(r.height), w: Math.round(r.width), h: Math.round(r.height) })
  }

  const rootStyle = toStyle(nodeDecls(node, null, { skipSize: true }))
  const dragged = drag?.kind === "reorder" && drag.active ? node.children.find((c) => c.id === drag.id) : null

  return (
    <div className="relative h-full">
      <div
        ref={boxRef}
        className="relative h-full"
        style={rootStyle}
        onPointerDown={(e) => {
          if (e.target === e.currentTarget) p.onSelect(null)
        }}
      >
        {node.children.map((child) => {
          const selected = p.selectedId === child.id
          const resizing = drag?.kind === "resize" && drag.id === child.id ? drag : null
          const override = resizing
            ? {
                ...(resizing.edge.includes("e") ? { width: resizing.w, flexBasis: horizontal ? "auto" : undefined, flexGrow: horizontal ? 0 : undefined } : {}),
                ...(resizing.edge.includes("s") ? { height: resizing.h, flexBasis: !horizontal ? "auto" : undefined, flexGrow: !horizontal ? 0 : undefined } : {}),
              }
            : undefined
          return (
            <NodeView
              key={child.id}
              node={child}
              parentLayout={node.layout}
              styleOverride={override}
              className={cn(
                "select-none",
                overlay && "cursor-grab",
                selected && "z-[3]",
                dragged?.id === child.id && "opacity-40",
              )}
              onPointerDown={(e) => startReorder(e, child)}
              onDoubleClick={(e) => {
                e.stopPropagation()
                if (child.layout) p.onFocus(child.id)
              }}
              overlay={
                <>
                  {child.layout && child.children.length > 0 && <ContainerBadge name={child.name} type={child.layout.type} />}
                  {selected && <SelectionFrame label={child.name} sub={resizing ? `${resizing.w} × ${resizing.h}` : undefined} />}
                  {selected && overlay && isFlex && <Handles edges={["e", "s", "se"]} onStart={(e, edge) => startResize(e, child, edge)} />}
                </>
              }
            />
          )
        })}
        {node.children.length === 0 && (
          <div className="pointer-events-auto m-auto flex flex-col items-center gap-2 text-sm text-muted-foreground">
            Container is empty
            <Button size="sm" variant="outline" onClick={p.onAdd}>
              <PlusIcon />
              Add element
            </Button>
          </div>
        )}
        {drag?.kind === "reorder" && drag.target && (
          <span
            className="pointer-events-none absolute z-30 rounded-full bg-primary shadow-[0_0_0_3px] shadow-primary/25"
            style={{ left: drag.target.line.x, top: drag.target.line.y, width: drag.target.line.w, height: drag.target.line.h }}
          />
        )}
      </div>
      {!isFlex && overlay && layout.type === "grid" && layout.auto && (
        <span className="pointer-events-none absolute -top-7 right-0 rounded-md bg-primary/10 px-2 py-0.5 font-mono text-[11px] text-primary">
          {layout.auto.mode} → {tracks} {tracks === 1 ? "column" : "columns"}
        </span>
      )}
      {dragged && drag?.kind === "reorder" && (
        <div
          className="pointer-events-none fixed z-50 rounded-md border bg-background px-2 py-1 font-mono text-xs shadow-lg"
          style={{ left: drag.x + 12, top: drag.y + 12, borderColor: dragged.color, color: dragged.color }}
        >
          {dragged.name}
        </div>
      )}
    </div>
  )
}
