import type { CSSProperties } from "react"
import { BellIcon, CheckCircle2Icon, SearchIcon, TriangleAlertIcon } from "lucide-react"
import { contrast, parseHex } from "@/lib/color"
import { type Scale, SEMANTIC, themeVars } from "@/lib/palette"

const BARS = [42, 68, 54, 88, 61, 74, 96, 58, 80, 70, 92, 66]

export function ThemePreview({ scales, mode }: { scales: Scale[]; mode: "light" | "dark" }) {
  const vars = themeVars(scales, mode)
  const sem = Object.fromEntries(
    SEMANTIC.map(({ name }) => {
      const s = scales.find((x) => x.id === name)
      const pick = (step: number) => s?.swatches.find((w) => w.step === step)?.hex ?? "transparent"
      return [name, mode === "light" ? { bg: pick(100), fg: pick(800), dot: pick(500) } : { bg: pick(950), fg: pick(200), dot: pick(400) }]
    }),
  )
  const ratio = contrast(parseHex(vars["--pv-primary"])!, parseHex(vars["--pv-primary-foreground"])!)

  return (
    <div
      style={vars as CSSProperties}
      className="overflow-hidden rounded-xl border border-(--pv-border) bg-(--pv-background) text-(--pv-foreground) shadow-sm"
    >
      <div className="flex items-center gap-3 border-b border-(--pv-border) px-4 py-3">
        <div className="size-6 rounded-md bg-(--pv-primary)" />
        <span className="text-sm font-semibold">Acme</span>
        <nav className="ml-4 hidden gap-4 text-xs text-(--pv-muted-foreground) sm:flex">
          <span className="text-(--pv-foreground)">Overview</span>
          <span>Projects</span>
          <span>Command</span>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <div className="hidden h-7 items-center gap-1.5 rounded-md border border-(--pv-input) px-2 text-xs text-(--pv-muted-foreground) md:flex">
            <SearchIcon className="size-3.5" />
            Search…
          </div>
          <BellIcon className="size-4 text-(--pv-muted-foreground)" />
        </div>
      </div>

      <div className="grid gap-4 p-4 md:grid-cols-[1.2fr_1fr]">
        <div className="flex flex-col gap-3 rounded-lg border border-(--pv-border) bg-(--pv-card) p-4 text-(--pv-card-foreground)">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">New project</p>
              <p className="text-xs text-(--pv-muted-foreground)">Create a project and invite your team.</p>
            </div>
            <span className="rounded-full bg-(--pv-accent) px-2 py-0.5 text-[10px] font-medium text-(--pv-accent-foreground)">Beta</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium">Name</span>
            <div className="h-8 rounded-md border border-(--pv-input) px-2.5 text-xs leading-8 text-(--pv-muted-foreground) ring-2 ring-(--pv-ring)/40">
              My design project
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="h-8 rounded-md bg-(--pv-primary) px-3 text-xs font-medium text-(--pv-primary-foreground)">Create</button>
            <button className="h-8 rounded-md bg-(--pv-secondary) px-3 text-xs font-medium text-(--pv-secondary-foreground)">Draft</button>
            <button className="h-8 rounded-md border border-(--pv-border) px-3 text-xs font-medium">Cancel</button>
            <button className="h-8 rounded-md px-3 text-xs font-medium text-(--pv-destructive)">Delete</button>
          </div>
          <p className="font-mono text-[10px] text-(--pv-muted-foreground)">
            primary / primary-foreground: {ratio.toFixed(2)} {ratio >= 4.5 ? "✓ AA" : "✗ < 4.5"}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <div className="rounded-lg border border-(--pv-border) bg-(--pv-card) p-4">
            <div className="mb-3 flex items-baseline justify-between">
              <span className="text-xs font-medium">Revenue</span>
              <span className="text-lg font-semibold">$ 1.2M</span>
            </div>
            <div className="flex h-20 items-end gap-1">
              {BARS.map((h, i) => (
                <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${h}%`, background: `var(--pv-chart-${(i % 5) + 1})` }} />
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(sem).map(([name, c]) => (
              <span key={name} className="flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: c.bg, color: c.fg }}>
                <span className="size-1.5 rounded-full" style={{ background: c.dot }} />
                {name}
              </span>
            ))}
          </div>
          {sem.success && (
            <div className="flex gap-2 rounded-lg p-3 text-xs" style={{ background: sem.success.bg, color: sem.success.fg }}>
              <CheckCircle2Icon className="size-4 shrink-0" />
              Changes saved
            </div>
          )}
          {sem.warning && (
            <div className="flex gap-2 rounded-lg p-3 text-xs" style={{ background: sem.warning.bg, color: sem.warning.fg }}>
              <TriangleAlertIcon className="size-4 shrink-0" />
              2 days of trial left
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
