import type { PointerEvent as ReactPointerEvent } from "react"
import { cn } from "@/lib/utils"

export type Edge = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw"

const POS: Record<Edge, string> = {
  n: "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize",
  s: "left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-ns-resize",
  e: "right-0 top-1/2 translate-x-1/2 -translate-y-1/2 cursor-ew-resize",
  w: "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize",
  ne: "right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize",
  nw: "left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize",
  se: "right-0 bottom-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize",
  sw: "left-0 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize",
}

export function Handles({ edges, onStart }: { edges: Edge[]; onStart: (e: ReactPointerEvent, edge: Edge) => void }) {
  return (
    <>
      {edges.map((edge) => (
        <span
          key={edge}
          onPointerDown={(e) => {
            e.stopPropagation()
            e.preventDefault()
            onStart(e, edge)
          }}
          className={cn("absolute z-20 size-2.5 rounded-[3px] border-2 border-primary bg-background shadow-sm", POS[edge])}
        />
      ))}
    </>
  )
}

export function SelectionFrame({ label, sub }: { label?: string; sub?: string }) {
  return (
    <>
      <span className="pointer-events-none absolute -inset-px z-10 rounded-[inherit] ring-2 ring-primary" />
      {label && (
        <span className="pointer-events-none absolute -top-5 left-0 z-20 flex items-center gap-1 rounded bg-primary px-1.5 py-px font-mono text-[10px] whitespace-nowrap text-primary-foreground">
          {label}
          {sub && <span className="opacity-70">{sub}</span>}
        </span>
      )}
    </>
  )
}

export function ContainerBadge({ name, type }: { name: string; type: string }) {
  return (
    <span className="pointer-events-none absolute -top-2 right-1.5 z-10 rounded bg-background px-1 font-mono text-[9px] leading-4 text-muted-foreground shadow-sm ring-1 ring-border">
      {name} · {type}
    </span>
  )
}
