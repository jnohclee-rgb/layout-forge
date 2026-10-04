import { CopyPlusIcon, CornerDownRightIcon, LayoutGridIcon, MousePointerClickIcon, RowsIcon, SquareIcon, Trash2Icon } from "lucide-react"
import { ITEM_COLORS } from "@/layout/defaults"
import { isValidLength } from "@/layout/css"
import { setLayoutType } from "@/layout/ops"
import { findNode } from "@/layout/tree"
import { CONTENT_KINDS } from "@/layout/content"
import type { Area, Bp, GridEff, Layout, LayoutNode, LayoutType, RespKey } from "@/layout/types"
import { OverrideBar } from "@/components/layout/override-bar"
import type { Recipe } from "@/layout/store"
import { cn } from "@/lib/utils"
import { CommitInput, Field, NumberInput, Section, SelectField, SliderField } from "@/components/fields"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

const GRID_SELF = ["auto", "start", "end", "center", "stretch", "baseline"]
const FLEX_SELF = ["auto", "flex-start", "flex-end", "center", "stretch", "baseline"]

interface Props {
  node: LayoutNode | null
  parentLayout: Layout | null
  parentEff: GridEff | null
  bp: Bp
  overrides: RespKey[]
  commit: (recipe: Recipe, key?: string) => void
  onFocus: (id: string) => void
  onDuplicate: (id: string) => void
  onRemove: (id: string) => void
  onResetOverrides: (id: string) => void
}

export function ItemInspector({ node, parentLayout, parentEff, bp, overrides, commit, onFocus, onDuplicate, onRemove, onResetOverrides }: Props) {
  const parentType: LayoutType = parentLayout?.type ?? "grid"
  const autoParent = parentLayout?.type === "grid" && !!parentLayout.auto
  if (!node) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-12 text-center text-sm text-muted-foreground">
        <MousePointerClickIcon className="size-8 opacity-40" />
        <p>Select an element on the canvas.</p>
        <p className="text-xs leading-relaxed">
          {parentType === "grid" && !autoParent
            ? "Drag across empty cells — new area."
            : "Drag elements and pull the handles."}
        </p>
        <p className="text-xs leading-relaxed">Double click a container to enter.</p>
      </div>
    )
  }

  const edit = (fn: (n: LayoutNode) => void, key?: string) =>
    commit((d) => {
      const n = findNode(d, node.id)
      if (n) fn(n)
    }, key ? `${node.id}:${key}` : undefined)

  const setArea = (k: keyof Area, v: number) => edit((n) => (n.area = { ...n.area, [k]: v }), `area-${k}`)
  const maxC = (parentEff?.columns.length ?? 1) + 1
  const maxR = (parentEff?.rows.length ?? 1) + 1
  const layoutType = node.layout?.type ?? "none"

  const setSpan = (axis: "c" | "r", v: number) =>
    edit((n) => {
      if (axis === "c") n.area = { ...n.area, c2: n.area.c1 + v }
      else n.area = { ...n.area, r2: n.area.r1 + v }
    }, `span-${axis}`)

  return (
    <div className="flex flex-col">
      <OverrideBar bp={bp} overrides={overrides} onReset={() => onResetOverrides(node.id)} />
      <Section
        title="Element"
        action={
          <div className="flex gap-1">
            <Button variant="ghost" size="icon-xs" onClick={() => onDuplicate(node.id)} aria-label="Duplicate" title="Duplicate (Ctrl+D)">
              <CopyPlusIcon />
            </Button>
            <Button variant="ghost" size="icon-xs" onClick={() => onRemove(node.id)} aria-label="Delete" title="Delete (Del)" className="text-destructive">
              <Trash2Icon />
            </Button>
          </div>
        }
      >
        <Field label="Name / class">
          <CommitInput value={node.name} onCommit={(v) => edit((n) => (n.name = v || n.name))} />
        </Field>
        <div className="flex flex-wrap gap-1.5">
          {ITEM_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => edit((n) => (n.color = c))}
              className={cn("size-5 rounded-full ring-offset-2 ring-offset-background transition", node.color === c && "ring-2 ring-foreground/60")}
              style={{ background: c }}
              aria-label={c}
            />
          ))}
        </div>
      </Section>

      {autoParent && (
        <Section title="Auto placement">
          <div className="grid grid-cols-2 gap-2">
            <Field label="column span">
              <NumberInput value={node.area.c2 - node.area.c1} min={1} max={12} onChange={(v) => setSpan("c", v)} />
            </Field>
            <Field label="row span">
              <NumberInput value={node.area.r2 - node.area.r1} min={1} max={12} onChange={(v) => setSpan("r", v)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <SelectField label="justify-self" value={node.justifySelf} options={GRID_SELF} onChange={(v) => edit((n) => (n.justifySelf = v))} />
            <SelectField label="align-self" value={node.alignSelf} options={GRID_SELF} onChange={(v) => edit((n) => (n.alignSelf = v))} />
          </div>
        </Section>
      )}

      {parentType === "grid" && !autoParent && (
        <Section title="grid-area">
          <div className="grid grid-cols-2 gap-2">
            <Field label="column-start">
              <NumberInput value={node.area.c1} min={1} max={maxC - 1} onChange={(v) => setArea("c1", v)} />
            </Field>
            <Field label="column-end">
              <NumberInput value={node.area.c2} min={2} max={maxC} onChange={(v) => setArea("c2", v)} />
            </Field>
            <Field label="row-start">
              <NumberInput value={node.area.r1} min={1} max={maxR - 1} onChange={(v) => setArea("r1", v)} />
            </Field>
            <Field label="row-end">
              <NumberInput value={node.area.r2} min={2} max={maxR} onChange={(v) => setArea("r2", v)} />
            </Field>
          </div>
          <code className="rounded-md bg-muted px-2 py-1.5 font-mono text-[11px] text-muted-foreground">
            grid-area: {node.area.r1} / {node.area.c1} / {node.area.r2} / {node.area.c2}
          </code>
          <div className="grid grid-cols-2 gap-2">
            <SelectField label="justify-self" value={node.justifySelf} options={GRID_SELF} onChange={(v) => edit((n) => (n.justifySelf = v))} />
            <SelectField label="align-self" value={node.alignSelf} options={GRID_SELF} onChange={(v) => edit((n) => (n.alignSelf = v))} />
          </div>
        </Section>
      )}

      {parentType === "flex" && (
        <Section title="flex item">
          <div className="grid grid-cols-3 gap-2">
            <Field label="grow">
              <NumberInput value={node.flex.grow} min={0} max={99} onChange={(v) => edit((n) => (n.flex.grow = v), "grow")} />
            </Field>
            <Field label="shrink">
              <NumberInput value={node.flex.shrink} min={0} max={99} onChange={(v) => edit((n) => (n.flex.shrink = v), "shrink")} />
            </Field>
            <Field label="basis">
              <CommitInput value={node.flex.basis} validate={(v) => isValidLength("flex-basis", v)} onCommit={(v) => edit((n) => (n.flex.basis = v || "auto"))} />
            </Field>
          </div>
          <div className="flex flex-wrap gap-1">
            {[
              ["0 1 auto", "by content"],
              ["1 1 0%", "flex: 1"],
              ["0 0 auto", "none"],
              ["1 1 auto", "auto"],
            ].map(([v, l]) => (
              <button
                key={v}
                onClick={() =>
                  edit((n) => {
                    const [g, s, b] = v.split(" ")
                    n.flex = { grow: Number(g), shrink: Number(s), basis: b }
                  })
                }
                className="rounded-md border px-1.5 py-0.5 font-mono text-[10px] hover:bg-muted"
              >
                {l}
              </button>
            ))}
          </div>
          <SelectField label="align-self" value={node.alignSelf} options={FLEX_SELF} onChange={(v) => edit((n) => (n.alignSelf = v))} />
        </Section>
      )}

      <Section title="Sizes">
        <div className="grid grid-cols-2 gap-2">
          <Field label="width">
            <CommitInput value={node.width} placeholder="auto" validate={(v) => isValidLength("width", v)} onCommit={(v) => edit((n) => (n.width = v === "auto" ? "" : v))} />
          </Field>
          <Field label="height">
            <CommitInput value={node.height} placeholder="auto" validate={(v) => isValidLength("height", v)} onCommit={(v) => edit((n) => (n.height = v === "auto" ? "" : v))} />
          </Field>
        </div>
        <Field label="min-height">
          <CommitInput value={node.minHeight} placeholder="—" validate={(v) => isValidLength("min-height", v)} onCommit={(v) => edit((n) => (n.minHeight = v))} />
        </Field>
        <SliderField label="padding" value={node.padding} min={0} max={64} onChange={(v) => edit((n) => (n.padding = v), "padding")} />
        <div className="flex items-center justify-between">
          <Label htmlFor="hidden" className="text-xs">
            Hide {bp === "base" ? "" : `from ${bp}`} <span className="font-mono text-muted-foreground">display: none</span>
          </Label>
          <Switch id="hidden" size="sm" checked={!!node.hidden} onCheckedChange={(v) => edit((n) => (n.hidden = v))} />
        </div>
        <SliderField label="border-radius (demo)" value={node.radius} min={0} max={32} onChange={(v) => edit((n) => (n.radius = v), "radius")} />
      </Section>

      <Section title="Content">
        <ToggleGroup
          variant="outline"
          size="sm"
          spacing={0}
          className="w-full"
          value={[layoutType]}
          onValueChange={(v) => v[0] && edit((n) => setLayoutType(n, v[0] === "none" ? null : (v[0] as LayoutType)))}
        >
          <ToggleGroupItem value="none" className="flex-1" disabled={bp !== "base" && node.children.length > 0}>
            <SquareIcon />
            Block
          </ToggleGroupItem>
          <ToggleGroupItem value="grid" className="flex-1">
            <LayoutGridIcon />
            Grid
          </ToggleGroupItem>
          <ToggleGroupItem value="flex" className="flex-1">
            <RowsIcon className="rotate-90" />
            Flex
          </ToggleGroupItem>
        </ToggleGroup>
        {!node.layout && (
          <SelectField
            label="Placeholder content"
            value={node.content ?? "auto"}
            options={CONTENT_KINDS}
            onChange={(v) => edit((n) => (n.content = v as LayoutNode["content"]))}
          />
        )}
        {node.layout?.type === "grid" && parentType === "grid" && !autoParent && (
          <div className="flex flex-col gap-2 rounded-lg border border-dashed p-2.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">subgrid columns</Label>
              <Switch
                size="sm"
                checked={node.layout.subgridColumns}
                onCheckedChange={(v) => edit((n) => n.layout?.type === "grid" && (n.layout.subgridColumns = v))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">subgrid rows</Label>
              <Switch
                size="sm"
                checked={node.layout.subgridRows}
                onCheckedChange={(v) => edit((n) => n.layout?.type === "grid" && (n.layout.subgridRows = v))}
              />
            </div>
            <p className="text-[11px] leading-snug text-muted-foreground">Tracks are taken from the parent grid.</p>
          </div>
        )}
        {node.layout && (
          <Button size="sm" onClick={() => onFocus(node.id)}>
            <CornerDownRightIcon />
            Edit content
          </Button>
        )}
      </Section>
    </div>
  )
}
