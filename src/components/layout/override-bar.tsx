import { RotateCcwIcon } from "lucide-react"
import type { Bp, RespKey } from "@/layout/types"
import { Button } from "@/components/ui/button"

const LABELS: Record<RespKey, string> = {
  layout: "layout",
  area: "area",
  flex: "flex",
  width: "width",
  height: "height",
  minHeight: "min-height",
  alignSelf: "align-self",
  justifySelf: "justify-self",
  padding: "padding",
  hidden: "visibility",
}

export function OverrideBar({ bp, overrides, onReset }: { bp: Bp; overrides: RespKey[]; onReset: () => void }) {
  if (bp === "base") return null
  return (
    <div className="mx-4 mt-3 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-2 text-[11px]">
      <span className="font-mono font-semibold text-primary">{bp}</span>
      <span className="min-w-0 flex-1 text-muted-foreground">
        {overrides.length === 0 ? "no overrides" : `overridden: ${overrides.map((k) => LABELS[k]).join(", ")}`}
      </span>
      {overrides.length > 0 && (
        <Button variant="ghost" size="icon-xs" onClick={onReset} title="Reset overrides" aria-label="Reset overrides">
          <RotateCcwIcon />
        </Button>
      )}
    </div>
  )
}
