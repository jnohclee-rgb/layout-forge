import { useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { CodeBlock } from "@/components/code-block"
import { Button } from "@/components/ui/button"

export interface CodeOutput {
  id: string
  label: string
  code: string
  lang: string
  file: string
}

export function ToolLayout({ controls, children, outputs, footer }: { controls: ReactNode; children: ReactNode; outputs: CodeOutput[]; footer?: ReactNode }) {
  const [active, setActive] = useState(outputs[0]?.id)
  const current = outputs.find((o) => o.id === active) ?? outputs[0]
  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
      <aside className="shrink-0 border-b bg-background lg:w-80 lg:overflow-y-auto lg:border-r lg:border-b-0">{controls}</aside>
      <main className="canvas-bg relative min-h-[420px] min-w-0 flex-1 lg:overflow-auto">{children}</main>
      <aside className="flex min-h-[420px] shrink-0 flex-col gap-3 border-t bg-background p-4 lg:min-h-0 lg:w-[400px] lg:border-t-0 lg:border-l">
        {outputs.length > 1 && (
          <div className="flex flex-wrap gap-1">
            {outputs.map((o) => (
              <Button
                key={o.id}
                size="sm"
                variant={o.id === current?.id ? "secondary" : "ghost"}
                className={cn(o.id === current?.id && "ring-1 ring-border")}
                onClick={() => setActive(o.id)}
              >
                {o.label}
              </Button>
            ))}
          </div>
        )}
        {current && <CodeBlock code={current.code} lang={current.lang} filename={current.file} className="min-h-0 flex-1" />}
        {footer}
      </aside>
    </div>
  )
}

export function PresetGrid<T extends { id: string; name: string }>({
  items,
  active,
  onPick,
  render,
  cols = 3,
}: {
  items: T[]
  active?: string
  onPick: (item: T) => void
  render: (item: T) => ReactNode
  cols?: number
}) {
  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {items.map((it) => (
        <button
          key={it.id}
          onClick={() => onPick(it)}
          title={it.name}
          className={cn(
            "flex flex-col items-center gap-1 rounded-lg border p-1.5 text-[10px] text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/50",
            active === it.id && "border-primary bg-primary/5 text-foreground",
          )}
        >
          <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-md">{render(it)}</div>
          <span className="w-full truncate">{it.name}</span>
        </button>
      ))}
    </div>
  )
}
