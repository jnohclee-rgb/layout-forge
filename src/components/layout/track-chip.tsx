import { ArrowDownToLineIcon, ArrowLeftToLineIcon, ArrowRightToLineIcon, ArrowUpToLineIcon, Trash2Icon } from "lucide-react"
import { cn } from "@/lib/utils"
import { isValidTrack } from "@/layout/css"
import type { Axis } from "@/layout/types"
import { CommitInput } from "@/components/fields"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const PRESETS = ["1fr", "2fr", "auto", "min-content", "max-content", "100px", "200px", "minmax(0, 1fr)", "minmax(200px, 1fr)", "fit-content(300px)"]

export function TrackChip({
  axis,
  index,
  size,
  px,
  editable,
  canRemove,
  onSize,
  onInsert,
  onRemove,
}: {
  axis: Axis
  index: number
  size: string
  px: number
  editable: boolean
  canRemove: boolean
  onSize: (size: string) => void
  onInsert: (index: number) => void
  onRemove: () => void
}) {
  const vertical = axis === "rows"
  const chip = (
    <span
      className={cn(
        "flex h-full w-full items-center justify-center gap-1 overflow-hidden rounded-md border bg-background font-mono text-[10px] text-muted-foreground transition-colors",
        editable ? "hover:border-primary/50 hover:text-foreground" : "border-dashed opacity-70",
        vertical && "[writing-mode:vertical-rl] rotate-180",
      )}
    >
      <span className="truncate">{size}</span>
      <span className="hidden opacity-50 @[90px]:inline">{Math.round(px)}</span>
    </span>
  )
  if (!editable) return <div className="@container h-full w-full" title="subgrid: sizes are inherited from the parent">{chip}</div>
  return (
    <Popover>
      <PopoverTrigger className="@container h-full w-full cursor-pointer outline-none" title={`${vertical ? "Row" : "Column"} ${index + 1}: ${size}`}>
        {chip}
      </PopoverTrigger>
      <PopoverContent side={vertical ? "right" : "bottom"} className="w-64">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium">
            {vertical ? "Row" : "Column"} {index + 1}
          </span>
          <span className="font-mono text-[11px] text-muted-foreground">{Math.round(px)}px</span>
        </div>
        <CommitInput value={size} onCommit={onSize} validate={isValidTrack} placeholder="1fr, 200px, auto…" />
        <div className="flex flex-wrap gap-1">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => onSize(p)}
              className={cn(
                "rounded-md border px-1.5 py-0.5 font-mono text-[10px] transition-colors hover:bg-muted",
                p === size && "border-primary bg-primary/10 text-primary",
              )}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="flex gap-1 border-t pt-2">
          <Button variant="outline" size="xs" className="flex-1" onClick={() => onInsert(index)}>
            {vertical ? <ArrowUpToLineIcon /> : <ArrowLeftToLineIcon />}
            {vertical ? "Higher" : "Left"}
          </Button>
          <Button variant="outline" size="xs" className="flex-1" onClick={() => onInsert(index + 1)}>
            {vertical ? <ArrowDownToLineIcon /> : <ArrowRightToLineIcon />}
            {vertical ? "Lower" : "Right"}
          </Button>
          <Button variant="destructive" size="icon-xs" disabled={!canRemove} onClick={onRemove} aria-label="Delete">
            <Trash2Icon />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
