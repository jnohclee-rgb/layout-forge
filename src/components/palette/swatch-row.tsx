import { cn } from "@/lib/utils"
import { formatColor, readableOn, type ColorFormat } from "@/lib/color"
import type { Scale } from "@/lib/palette"
import { copyText } from "@/lib/clipboard"

function grade(ratio: number) {
  if (ratio >= 7) return "AAA"
  if (ratio >= 4.5) return "AA"
  if (ratio >= 3) return "L"
  return ""
}

export function SwatchRow({ scale, format, compact }: { scale: Scale; format: ColorFormat; compact?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-xs font-medium">{scale.name}</span>
        <span className="font-mono text-[10px] text-muted-foreground">{scale.swatches.find((s) => s.isBase)?.hex ?? ""}</span>
      </div>
      <div className="grid grid-cols-11 overflow-hidden rounded-lg ring-1 ring-foreground/5">
        {scale.swatches.map((s) => {
          const fg = readableOn(s.rgb)
          const ratio = Math.max(s.onWhite, s.onBlack)
          const on = s.onWhite >= s.onBlack ? "white" : "black"
          const value = formatColor(s.rgb, format)
          return (
            <button
              key={s.step}
              onClick={() => copyText(value, value)}
              title={`${scale.name}-${s.step} · ${value}\ncontrast with white ${s.onWhite.toFixed(2)} · with black ${s.onBlack.toFixed(2)}`}
              className={cn(
                "group relative flex flex-col justify-between p-1.5 text-left transition-transform hover:z-10 hover:scale-y-110 hover:rounded-md hover:shadow-lg",
                compact ? "h-12" : "h-20",
              )}
              style={{ background: s.hex, color: fg.r === 1 ? "#fff" : "#000" }}
            >
              <span className="flex items-center gap-1 font-mono text-[10px] font-semibold">
                {s.step}
                {s.isBase && <span className="size-1.5 rounded-full bg-current" />}
              </span>
              {!compact && (
                <span className="flex flex-col gap-0.5">
                  <span className="truncate font-mono text-[9px] opacity-80 group-hover:opacity-100">{s.hex.slice(1)}</span>
                  <span className="font-mono text-[9px] opacity-70" title={`on ${on}`}>
                    {ratio.toFixed(1)} {grade(ratio)}
                  </span>
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
