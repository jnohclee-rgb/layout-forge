import type { CSSProperties, HTMLAttributes, ReactNode } from "react"
import { EyeOffIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { contentKind } from "@/layout/content"
import { nodeDecls, toStyle } from "@/layout/css"
import type { Layout, LayoutNode } from "@/layout/types"
import { useCanvas } from "@/components/layout/canvas-context"
import { Placeholder } from "@/components/layout/placeholder"

interface NodeViewProps extends HTMLAttributes<HTMLDivElement> {
  node: LayoutNode
  parentLayout: Layout | null
  overlay?: ReactNode
  styleOverride?: CSSProperties
}

export function NodeView({ node, parentLayout, overlay, styleOverride, className, ...rest }: NodeViewProps) {
  const canvas = useCanvas()
  const ghost = node.hidden && canvas.overlay
  const base = toStyle(nodeDecls(ghost ? { ...node, hidden: false } : node, parentLayout, { demo: true }))
  const style = { ...base, ...(ghost ? { opacity: 0.35, border: `1px dashed ${node.color}` } : null), ...styleOverride }
  const hasChildren = node.layout !== null && node.children.length > 0
  return (
    <div data-node-id={node.id} className={cn("relative min-w-0", className)} style={style} {...rest}>
      {hasChildren ? (
        node.children.map((ch) => <NodeView key={ch.id} node={ch} parentLayout={node.layout} />)
      ) : canvas.content ? (
        <>
          <Placeholder kind={contentKind(node)} />
          {canvas.overlay && (
            <span className="pointer-events-none absolute -top-2 left-1.5 z-10 rounded bg-background px-1 font-mono text-[9px] leading-4 shadow-sm ring-1 ring-border" style={{ color: node.color }}>
              {node.name}
            </span>
          )}
        </>
      ) : (
        <span className="pointer-events-none block truncate font-mono text-[11px] leading-tight font-medium" style={{ color: node.color }}>
          {node.name}
        </span>
      )}
      {ghost && (
        <span className="pointer-events-none absolute right-1 bottom-1 flex items-center gap-1 rounded bg-background px-1 font-mono text-[9px] text-muted-foreground">
          <EyeOffIcon className="size-2.5" />
          hidden
        </span>
      )}
      {overlay}
    </div>
  )
}
