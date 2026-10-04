import { normalizeHex } from "@/lib/color"
import { cn } from "@/lib/utils"
import { CommitInput } from "@/components/fields"

export function ColorInput({ value, onChange, compact }: { value: string; onChange: (hex: string) => void; compact?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <label
        className={cn("relative shrink-0 cursor-pointer overflow-hidden rounded-lg ring-1 ring-foreground/10", compact ? "size-7" : "size-8")}
        style={{ background: value }}
      >
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
      </label>
      <CommitInput
        value={value}
        validate={(v) => normalizeHex(v) !== null}
        onCommit={(v) => onChange(normalizeHex(v) as string)}
        className={cn("uppercase", compact ? "h-7" : "h-8")}
      />
    </div>
  )
}
