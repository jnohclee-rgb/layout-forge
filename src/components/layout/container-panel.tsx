import { ArrowDownIcon, ArrowLeftIcon, ArrowRightIcon, ArrowUpIcon, LayoutGridIcon, PlusIcon, RowsIcon } from "lucide-react"
import { uid } from "@/layout/defaults"
import { isValidLength, isValidSize, isValidTrack, trackList } from "@/layout/css"
import { addChild, setLayoutType, setTrackCount } from "@/layout/ops"
import { findNode } from "@/layout/tree"
import type { Axis, Bp, FlexLayout, GridEff, GridLayout, LayoutNode, RespKey } from "@/layout/types"
import type { Recipe } from "@/layout/store"
import { CommitInput, Field, Section, SelectField, SliderField, Stepper } from "@/components/fields"
import { OverrideBar } from "@/components/layout/override-bar"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

const GRID_ALIGN = ["normal", "start", "end", "center", "stretch", "baseline"]
const GRID_CONTENT = ["normal", "start", "end", "center", "stretch", "space-between", "space-around", "space-evenly"]
const FLEX_JUSTIFY = ["normal", "flex-start", "flex-end", "center", "space-between", "space-around", "space-evenly"]
const FLEX_ALIGN = ["normal", "flex-start", "flex-end", "center", "stretch", "baseline"]
const FLEX_CONTENT = ["normal", "flex-start", "flex-end", "center", "stretch", "space-between", "space-around", "space-evenly"]

interface PanelProps {
  node: LayoutNode
  isRoot: boolean
  parentIsGrid: boolean
  eff: GridEff | null
  bp: Bp
  overrides: RespKey[]
  onResetOverrides: () => void
  commit: (recipe: Recipe, key?: string) => void
  onAdded: (id: string) => void
}

export function ContainerPanel({ node, isRoot, parentIsGrid, eff, bp, overrides, onResetOverrides, commit, onAdded }: PanelProps) {
  const edit = (fn: (n: LayoutNode) => void, key?: string) =>
    commit((d) => {
      const n = findNode(d, node.id)
      if (n) fn(n)
    }, key ? `${node.id}:${key}` : undefined)

  const add = () => {
    const id = uid()
    commit((d) => {
      addChild(d, node.id, { id })
    })
    onAdded(id)
  }

  return (
    <div className="flex flex-col">
      <OverrideBar bp={bp} overrides={overrides} onReset={onResetOverrides} />
      <Section title={isRoot ? "Root container" : "Container"}>
        <Field label="Name / class">
          <CommitInput value={node.name} onCommit={(v) => edit((n) => (n.name = v || n.name))} />
        </Field>
        <ToggleGroup
          variant="outline"
          size="sm"
          spacing={0}
          className="w-full"
          value={[node.layout?.type ?? "grid"]}
          onValueChange={(v) => v[0] && edit((n) => setLayoutType(n, v[0] as "grid" | "flex"))}
        >
          <ToggleGroupItem value="grid" className="flex-1">
            <LayoutGridIcon />
            Grid
          </ToggleGroupItem>
          <ToggleGroupItem value="flex" className="flex-1">
            <RowsIcon className="rotate-90" />
            Flex
          </ToggleGroupItem>
        </ToggleGroup>
      </Section>
      {node.layout?.type === "grid" && <GridModeSection node={node} layout={node.layout} edit={edit} onAdded={onAdded} commit={commit} />}
      {node.layout?.type === "grid" && !node.layout.auto && eff && <GridSection node={node} layout={node.layout} eff={eff} parentIsGrid={parentIsGrid} edit={edit} />}
      {node.layout?.type === "grid" && node.layout.auto && <AutoGridSection layout={node.layout} edit={edit} />}
      {node.layout?.type === "flex" && <FlexSection layout={node.layout} edit={edit} />}
      <Section title="Block">
        <SliderField label="padding" value={node.padding} min={0} max={64} onChange={(v) => edit((n) => (n.padding = v), "padding")} />
        {isRoot && (
          <Field label="min-height">
            <CommitInput value={node.minHeight} placeholder="100vh" validate={(v) => isValidLength("min-height", v)} onCommit={(v) => edit((n) => (n.minHeight = v))} />
          </Field>
        )}
        <Button variant="outline" size="sm" onClick={add}>
          <PlusIcon />
          Add element
        </Button>
      </Section>
    </div>
  )
}

function GridModeSection({
  node,
  layout,
  edit,
  commit,
  onAdded,
}: {
  node: LayoutNode
  layout: GridLayout
  edit: (fn: (n: LayoutNode) => void, key?: string) => void
  commit: (recipe: Recipe, key?: string) => void
  onAdded: (id: string) => void
}) {
  const mode = layout.auto?.mode ?? "explicit"
  const setCount = (count: number) => {
    if (count > node.children.length) {
      const id = uid()
      commit((d) => {
        addChild(d, node.id, { id, name: "card" })
      })
      onAdded(id)
    } else {
      edit((n) => {
        n.children = n.children.slice(0, count)
      })
    }
  }
  return (
    <Section title="Grid mode">
      <ToggleGroup
        variant="outline"
        size="sm"
        spacing={0}
        className="w-full"
        value={[mode]}
        onValueChange={(v) => {
          const m = v[0]
          if (!m) return
          edit((n) => {
            if (n.layout?.type !== "grid") return
            if (m === "explicit") n.layout.auto = null
            else n.layout.auto = { mode: m as "auto-fill" | "auto-fit", min: n.layout.auto?.min ?? "200px", max: n.layout.auto?.max ?? "1fr" }
          })
        }}
      >
        <ToggleGroupItem value="explicit" className="flex-1 text-xs">
          Tracks
        </ToggleGroupItem>
        <ToggleGroupItem value="auto-fill" className="flex-1 font-mono text-xs">
          auto-fill
        </ToggleGroupItem>
        <ToggleGroupItem value="auto-fit" className="flex-1 font-mono text-xs">
          auto-fit
        </ToggleGroupItem>
      </ToggleGroup>
      {layout.auto && (
        <div className="flex items-center justify-between">
          <Label className="text-xs">Elements</Label>
          <Stepper value={node.children.length} min={0} max={48} onChange={setCount} />
        </div>
      )}
      {layout.auto && (
        <p className="text-[11px] leading-snug text-muted-foreground">
          {layout.auto.mode === "auto-fill"
            ? "Empty columns are kept."
            : "Empty columns collapse."}
        </p>
      )}
    </Section>
  )
}

function AutoGridSection({ layout, edit }: { layout: GridLayout; edit: (fn: (n: LayoutNode) => void, key?: string) => void }) {
  const setGrid = (fn: (l: GridLayout) => void, key?: string) =>
    edit((n) => {
      if (n.layout?.type === "grid") fn(n.layout)
    }, key)
  const auto = layout.auto!
  return (
    <>
      <Section title="Columns">
        <div className="grid grid-cols-2 gap-2">
          <Field label="min">
            <CommitInput value={auto.min} validate={isValidSize} onCommit={(v) => setGrid((l) => l.auto && (l.auto.min = v))} />
          </Field>
          <Field label="max">
            <CommitInput value={auto.max} validate={isValidTrack} onCommit={(v) => setGrid((l) => l.auto && (l.auto.max = v))} />
          </Field>
        </div>
        <code className="rounded-md bg-muted px-2 py-1.5 font-mono text-[11px] leading-snug break-all text-muted-foreground">
          repeat({auto.mode}, minmax({auto.min}, {auto.max}))
        </code>
        <Field label="grid-auto-rows">
          <CommitInput value={layout.autoRows ?? "auto"} validate={isValidTrack} onCommit={(v) => setGrid((l) => (l.autoRows = v))} />
        </Field>
      </Section>
      <Section title="Padding">
        <SliderField label="column-gap" value={layout.columnGap} min={0} max={64} onChange={(v) => setGrid((l) => (l.columnGap = v), "cgap")} />
        <SliderField label="row-gap" value={layout.rowGap} min={0} max={64} onChange={(v) => setGrid((l) => (l.rowGap = v), "rgap")} />
      </Section>
      <Section title="Alignment">
        <div className="grid grid-cols-2 gap-2">
          <SelectField label="justify-items" value={layout.justifyItems} options={GRID_ALIGN} onChange={(v) => setGrid((l) => (l.justifyItems = v))} />
          <SelectField label="align-items" value={layout.alignItems} options={GRID_ALIGN} onChange={(v) => setGrid((l) => (l.alignItems = v))} />
          <SelectField label="justify-content" value={layout.justifyContent} options={GRID_CONTENT} onChange={(v) => setGrid((l) => (l.justifyContent = v))} />
          <SelectField label="align-content" value={layout.alignContent} options={GRID_CONTENT} onChange={(v) => setGrid((l) => (l.alignContent = v))} />
        </div>
      </Section>
    </>
  )
}

function TrackAxis({
  axis,
  node,
  layout,
  eff,
  edit,
}: {
  axis: Axis
  node: LayoutNode
  layout: GridLayout
  eff: GridEff
  edit: (fn: (n: LayoutNode) => void, key?: string) => void
}) {
  const sub = axis === "columns" ? layout.subgridColumns : layout.subgridRows
  const sizes = eff[axis]
  const title = axis === "columns" ? "Columns" : "Rows"
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{title}</Label>
        {sub ? (
          <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary">subgrid · {sizes.length}</span>
        ) : (
          <Stepper value={sizes.length} max={24} onChange={(v) => edit((n) => setTrackCount(n, axis, v))} />
        )}
      </div>
      <code className="rounded-md bg-muted px-2 py-1.5 font-mono text-[11px] leading-snug break-all text-muted-foreground">
        {sub ? "subgrid" : trackList(sizes)}
      </code>
      {!sub && (
        <div className="flex items-center gap-1.5">
          <span className="shrink-0 text-[11px] text-muted-foreground">All =</span>
          <CommitInput
            key={`${node.id}-${axis}`}
            value=""
            placeholder="1fr"
            validate={isValidTrack}
            onCommit={(v) =>
              v &&
              edit((n) => {
                if (n.layout?.type === "grid") n.layout[axis].forEach((t) => (t.size = v))
              })
            }
          />
        </div>
      )}
    </div>
  )
}

function GridSection({
  node,
  layout,
  eff,
  parentIsGrid,
  edit,
}: {
  node: LayoutNode
  layout: GridLayout
  eff: GridEff
  parentIsGrid: boolean
  edit: (fn: (n: LayoutNode) => void, key?: string) => void
}) {
  const setGrid = (fn: (l: GridLayout) => void, key?: string) =>
    edit((n) => {
      if (n.layout?.type === "grid") fn(n.layout)
    }, key)
  return (
    <>
      <Section title="Tracks">
        {parentIsGrid && (
          <div className="flex flex-col gap-2 rounded-lg border border-dashed p-2.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">subgrid columns</Label>
              <Switch size="sm" checked={layout.subgridColumns} onCheckedChange={(v) => setGrid((l) => (l.subgridColumns = v))} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">subgrid rows</Label>
              <Switch size="sm" checked={layout.subgridRows} onCheckedChange={(v) => setGrid((l) => (l.subgridRows = v))} />
            </div>
          </div>
        )}
        <TrackAxis axis="columns" node={node} layout={layout} eff={eff} edit={edit} />
        <TrackAxis axis="rows" node={node} layout={layout} eff={eff} edit={edit} />
        <p className="text-[11px] leading-snug text-muted-foreground">Click a track size above the canvas for fine tuning.</p>
      </Section>
      <Section title="Padding">
        <SliderField
          label="column-gap"
          value={eff.columnGap}
          min={0}
          max={64}
          disabled={parentIsGrid && layout.subgridColumns}
          onChange={(v) => setGrid((l) => (l.columnGap = v), "cgap")}
        />
        <SliderField
          label="row-gap"
          value={eff.rowGap}
          min={0}
          max={64}
          disabled={parentIsGrid && layout.subgridRows}
          onChange={(v) => setGrid((l) => (l.rowGap = v), "rgap")}
        />
      </Section>
      <Section title="Alignment">
        <div className="grid grid-cols-2 gap-2">
          <SelectField label="justify-items" value={layout.justifyItems} options={GRID_ALIGN} onChange={(v) => setGrid((l) => (l.justifyItems = v))} />
          <SelectField label="align-items" value={layout.alignItems} options={GRID_ALIGN} onChange={(v) => setGrid((l) => (l.alignItems = v))} />
          <SelectField label="justify-content" value={layout.justifyContent} options={GRID_CONTENT} onChange={(v) => setGrid((l) => (l.justifyContent = v))} />
          <SelectField label="align-content" value={layout.alignContent} options={GRID_CONTENT} onChange={(v) => setGrid((l) => (l.alignContent = v))} />
        </div>
      </Section>
    </>
  )
}

const DIRECTIONS: { value: FlexLayout["direction"]; icon: typeof ArrowRightIcon }[] = [
  { value: "row", icon: ArrowRightIcon },
  { value: "row-reverse", icon: ArrowLeftIcon },
  { value: "column", icon: ArrowDownIcon },
  { value: "column-reverse", icon: ArrowUpIcon },
]

function FlexSection({ layout, edit }: { layout: FlexLayout; edit: (fn: (n: LayoutNode) => void, key?: string) => void }) {
  const setFlex = (fn: (l: FlexLayout) => void, key?: string) =>
    edit((n) => {
      if (n.layout?.type === "flex") fn(n.layout)
    }, key)
  return (
    <>
      <Section title="Direction">
        <ToggleGroup
          variant="outline"
          size="sm"
          spacing={0}
          className="w-full"
          value={[layout.direction]}
          onValueChange={(v) => v[0] && setFlex((l) => (l.direction = v[0] as FlexLayout["direction"]))}
        >
          {DIRECTIONS.map(({ value, icon: Icon }) => (
            <ToggleGroupItem key={value} value={value} className="flex-1" title={value}>
              <Icon />
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <p className="-mt-1 font-mono text-[11px] text-muted-foreground">flex-direction: {layout.direction}</p>
        <SelectField
          label="flex-wrap"
          value={layout.wrap}
          options={["nowrap", "wrap", "wrap-reverse"]}
          onChange={(v) => setFlex((l) => (l.wrap = v as FlexLayout["wrap"]))}
        />
      </Section>
      <Section title="Alignment">
        <SelectField label="justify-content" value={layout.justifyContent} options={FLEX_JUSTIFY} onChange={(v) => setFlex((l) => (l.justifyContent = v))} />
        <div className="grid grid-cols-2 gap-2">
          <SelectField label="align-items" value={layout.alignItems} options={FLEX_ALIGN} onChange={(v) => setFlex((l) => (l.alignItems = v))} />
          <SelectField label="align-content" value={layout.alignContent} options={FLEX_CONTENT} onChange={(v) => setFlex((l) => (l.alignContent = v))} />
        </div>
      </Section>
      <Section title="Padding">
        <SliderField label="column-gap" value={layout.columnGap} min={0} max={64} onChange={(v) => setFlex((l) => (l.columnGap = v), "cgap")} />
        <SliderField label="row-gap" value={layout.rowGap} min={0} max={64} onChange={(v) => setFlex((l) => (l.rowGap = v), "rgap")} />
      </Section>
    </>
  )
}
