import { useState, type ReactElement, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export function Section({ title, action, children, className }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("flex flex-col gap-3 border-b px-4 py-4 last:border-b-0", className)}>
      <div className="flex min-h-6 items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  )
}

export function Field({ label, children, hint, className }: { label: string; children: ReactNode; hint?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs font-normal text-muted-foreground">{label}</Label>
        {hint && <span className="font-mono text-[11px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

export function SelectField({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string
  value: string
  options: { value: string; label?: string }[] | string[]
  onChange: (v: string) => void
  disabled?: boolean
}) {
  const items = options.map((o) => (typeof o === "string" ? { value: o, label: o } : { value: o.value, label: o.label ?? o.value }))
  return (
    <Field label={label}>
      <Select items={items} value={value} onValueChange={(v) => v !== null && onChange(v as string)} disabled={disabled}>
        <SelectTrigger size="sm" className="w-full font-mono text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((o) => (
            <SelectItem key={o.value} value={o.value} className="font-mono text-xs">
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}

export function SliderField({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "px",
  onChange,
  disabled,
  format,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  onChange: (v: number) => void
  disabled?: boolean
  format?: (v: number) => string
}) {
  return (
    <Field label={label} hint={disabled ? "inherited" : format ? format(value) : `${value}${unit}`}>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onValueChange={(v) => onChange(Array.isArray(v) ? (v[0] as number) : (v as number))}
        className="py-1.5"
      />
    </Field>
  )
}

export function CommitInput({
  value,
  onCommit,
  validate,
  className,
  placeholder,
  autoFocus,
}: {
  value: string
  onCommit: (v: string) => void
  validate?: (v: string) => boolean
  className?: string
  placeholder?: string
  autoFocus?: boolean
}) {
  const [draft, setDraft] = useState(value)
  const [prev, setPrev] = useState(value)
  const [invalid, setInvalid] = useState(false)
  if (value !== prev) {
    setPrev(value)
    setDraft(value)
    setInvalid(false)
  }
  const commit = () => {
    const v = draft.trim()
    if (v === value) return
    if (validate && !validate(v)) {
      setInvalid(true)
      return
    }
    setInvalid(false)
    onCommit(v)
  }
  return (
    <Input
      value={draft}
      autoFocus={autoFocus}
      placeholder={placeholder}
      aria-invalid={invalid || undefined}
      onChange={(e) => {
        setDraft(e.target.value)
        setInvalid(false)
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          commit()
          ;(e.target as HTMLInputElement).blur()
        }
        if (e.key === "Escape") {
          setDraft(value)
          setInvalid(false)
          ;(e.target as HTMLInputElement).blur()
        }
      }}
      className={cn("h-7 font-mono text-xs", className)}
    />
  )
}

export function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  className,
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  className?: string
}) {
  return (
    <Input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => {
        const n = Number(e.target.value)
        if (e.target.value === "" || !Number.isFinite(n)) return
        onChange(Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n)))
      }}
      className={cn("h-7 font-mono text-xs", className)}
    />
  )
}

export function IconButton({
  label,
  children,
  onClick,
  disabled,
  active,
  variant = "ghost",
  side = "bottom",
  className,
}: {
  label: string
  children: ReactElement | ReactNode
  onClick?: () => void
  disabled?: boolean
  active?: boolean
  variant?: "ghost" | "outline" | "secondary" | "default" | "destructive"
  side?: "top" | "bottom" | "left" | "right"
  className?: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant={active ? "secondary" : variant}
            size="icon-sm"
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            aria-pressed={active}
            className={className}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side={side}>{label}</TooltipContent>
    </Tooltip>
  )
}

export function Stepper({ value, min = 1, max = 24, onChange }: { value: number; min?: number; max?: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center rounded-lg border">
      <Button variant="ghost" size="icon-xs" disabled={value <= min} onClick={() => onChange(value - 1)} aria-label="Less">
        −
      </Button>
      <span className="w-7 text-center font-mono text-xs tabular-nums">{value}</span>
      <Button variant="ghost" size="icon-xs" disabled={value >= max} onClick={() => onChange(value + 1)} aria-label="More">
        +
      </Button>
    </div>
  )
}
