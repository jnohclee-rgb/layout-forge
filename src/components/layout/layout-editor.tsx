import { useEffect, useMemo, useRef, useState } from "react"
import {
  ChevronRightIcon,
  EyeIcon,
  EyeOffIcon,
  FileInputIcon,
  LayoutTemplateIcon,
  PencilIcon,
  PlusIcon,
  Redo2Icon,
  RotateCcwIcon,
  ScanIcon,
  TypeIcon,
  Undo2Icon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { PRESETS, rootNode, uid } from "@/layout/defaults"
import { addChild, duplicateNode, insertTrack, moveChild, removeNode, removeTrack, reorderChild } from "@/layout/ops"
import { BREAKPOINTS, applyAtBp, bpForWidth, bpInfo, overridesAt, resolveTree, usedBreakpoints } from "@/layout/responsive"
import type { LayoutDoc, Recipe } from "@/layout/store"
import { countNodes, effAt, findNode, findPath, isSubgridAxis } from "@/layout/tree"
import type { Area, Axis, Bp, LayoutNode } from "@/layout/types"
import { IconButton } from "@/components/fields"
import { CanvasContext } from "@/components/layout/canvas-context"
import { CodePanel } from "@/components/layout/code-panel"
import { ContainerPanel } from "@/components/layout/container-panel"
import { FlexCanvas } from "@/components/layout/flex-canvas"
import { GridCanvas } from "@/components/layout/grid-canvas"
import type { Edge } from "@/components/layout/handles"
import { ImportDialog } from "@/components/layout/import-dialog"
import { ItemInspector } from "@/components/layout/item-inspector"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

function isTyping(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null
  if (!t) return false
  return t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) || !!t.closest("[role=dialog],[role=listbox],[role=menu]")
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setWidth(Math.round(el.getBoundingClientRect().width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, width] as const
}

export function LayoutEditor({ doc, kind }: { doc: LayoutDoc; kind: "grid" | "flex" }) {
  const { root, commit, undo, redo, canUndo, canRedo } = doc
  const [focusId, setFocusId] = useState(root.id)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [overlay, setOverlay] = useState(true)
  const [content, setContent] = useState(false)
  const [viewport, setViewport] = useState<"fit" | Bp>("fit")
  const [tab, setTab] = useState("props")
  const [importOpen, setImportOpen] = useState(false)
  const [innerRef, innerWidth] = useWidth<HTMLDivElement>()

  const bp: Bp = viewport === "fit" ? bpForWidth(innerWidth) : viewport
  const view = useMemo(() => resolveTree(root, bp), [root, bp])
  const used = useMemo(() => usedBreakpoints(root), [root])

  const commitBp = (recipe: Recipe, key?: string) => {
    if (bp === "base") commit(recipe, key)
    else
      commit(
        (d) => {
          applyAtBp(d, bp, recipe)
        },
        key ? `${bp}:${key}` : undefined,
      )
  }

  const rawPath = findPath(view, focusId) ?? [view]
  let cut = rawPath.length
  while (cut > 1 && !rawPath[cut - 1].layout) cut--
  const path = rawPath.slice(0, cut)
  const focus = path[path.length - 1]
  const parent = path.length > 1 ? path[path.length - 2] : null
  const parentIsGrid = parent?.layout?.type === "grid" && !parent.layout.auto
  const autoGrid = focus.layout?.type === "grid" && !!focus.layout.auto
  const eff = focus.layout?.type === "grid" ? effAt(view, focus.id) : null
  const selected = focus.children.find((c) => c.id === selectedId) ?? null
  const baseSelected = selected ? findNode(root, selected.id) : null

  const editFocus = (fn: (n: LayoutNode) => void) =>
    commitBp((d) => {
      const n = findNode(d, focus.id)
      if (n) fn(n)
    })

  const drillIn = (id: string) => {
    setFocusId(id)
    setSelectedId(null)
  }

  const goUp = () => {
    if (!parent) return
    setSelectedId(focus.id)
    setFocusId(parent.id)
  }

  const add = (partial: Partial<LayoutNode> = {}) => {
    const id = uid()
    commitBp((d) => {
      addChild(d, focus.id, { ...partial, id })
    })
    setSelectedId(id)
  }

  const remove = (id: string) => {
    commitBp((d) => removeNode(d, id))
    setSelectedId(null)
  }

  const duplicate = (id: string) => {
    const newId = uid()
    commitBp((d) => {
      duplicateNode(d, id, newId)
    })
    setSelectedId(newId)
  }

  const setArea = (id: string, area: Area) =>
    commitBp((d) => {
      const n = findNode(d, id)
      if (n) n.area = area
    })

  const resetOverrides = (id: string) =>
    commit((d) => {
      const n = findNode(d, id)
      if (n?.responsive && bp !== "base") delete n.responsive[bp]
    })

  const onTrackSize = (axis: Axis, i: number, size: string) =>
    editFocus((n) => {
      if (n.layout?.type === "grid" && n.layout[axis][i]) n.layout[axis][i].size = size
    })

  const onFlexResize = (id: string, edge: Edge, w: number, h: number) =>
    commitBp((d) => {
      const n = findNode(d, id)
      const p = findNode(d, focus.id)
      if (!n || p?.layout?.type !== "flex") return
      const horizontal = p.layout.direction.startsWith("row")
      const apply = (axisMain: boolean, px: number, prop: "width" | "height") => {
        if (axisMain && n.flex.basis !== "auto") n.flex.basis = `${px}px`
        else n[prop] = `${px}px`
        if (axisMain) n.flex.grow = 0
      }
      if (edge.includes("e")) apply(horizontal, w, "width")
      if (edge.includes("s")) apply(!horizontal, h, "height")
    })

  const applyPreset = (id: string) => {
    const preset = PRESETS.find((p) => p.id === id)
    if (!preset) return
    commit((d) => {
      const n = findNode(d, focus.id)
      if (!n) return
      const built = preset.build()
      n.layout = built.layout
      n.children = built.children
      if (n.responsive) for (const o of Object.values(n.responsive)) if (o) delete o.layout
    })
    setSelectedId(null)
  }

  const reset = () => {
    commit(() => rootNode(kind))
    setFocusId(root.id)
    setSelectedId(null)
  }

  const importTree = (node: LayoutNode) => {
    commit(() => node)
    setFocusId(node.id)
    setSelectedId(null)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e)) return
      const mod = e.ctrlKey || e.metaKey
      const key = e.key.toLowerCase()
      if (mod && key === "z") {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
        return
      }
      if (mod && key === "y") {
        e.preventDefault()
        redo()
        return
      }
      if (mod && key === "d" && selected) {
        e.preventDefault()
        duplicate(selected.id)
        return
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selected) {
        e.preventDefault()
        remove(selected.id)
        return
      }
      if (e.key === "Escape") {
        if (selected) setSelectedId(null)
        else goUp()
        return
      }
      if (e.key === "Enter" && selected?.layout) {
        drillIn(selected.id)
        return
      }
      if (!selected || !e.key.startsWith("Arrow")) return
      e.preventDefault()
      const dir = e.key.slice(5)
      if (focus.layout?.type === "flex" || autoGrid) {
        commitBp((d) => {
          const p = findNode(d, focus.id)
          if (p) moveChild(p, selected.id, dir === "Left" || dir === "Up" ? -1 : 1)
        })
        return
      }
      if (!eff) return
      const a = { ...selected.area }
      const dx = dir === "Left" ? -1 : dir === "Right" ? 1 : 0
      const dy = dir === "Up" ? -1 : dir === "Down" ? 1 : 0
      if (e.shiftKey) {
        a.c2 = Math.max(a.c1 + 1, Math.min(eff.columns.length + 1, a.c2 + dx))
        a.r2 = Math.max(a.r1 + 1, Math.min(eff.rows.length + 1, a.r2 + dy))
      } else {
        const w = a.c2 - a.c1
        const h = a.r2 - a.r1
        a.c1 = Math.max(1, Math.min(eff.columns.length - w + 1, a.c1 + dx))
        a.r1 = Math.max(1, Math.min(eff.rows.length - h + 1, a.r1 + dy))
        a.c2 = a.c1 + w
        a.r2 = a.r1 + h
      }
      setArea(selected.id, a)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  const presets = PRESETS.filter((p) => p.type === focus.layout?.type)
  const otherPresets = PRESETS.filter((p) => p.type !== focus.layout?.type)
  const explicitGrid = focus.layout?.type === "grid" && !autoGrid
  const framePadding = !overlay ? 0 : explicitGrid ? "32px 12px 12px 42px" : autoGrid ? "36px 12px 12px" : 12
  const info = bpInfo(bp)

  return (
    <div className="flex h-full min-h-0">
      <aside className="hidden w-72 shrink-0 overflow-y-auto border-r bg-background md:block">
        <ContainerPanel
          key={focus.id}
          node={focus}
          isRoot={path.length === 1}
          parentIsGrid={parentIsGrid}
          eff={eff}
          bp={bp}
          overrides={overridesAt(findNode(root, focus.id) ?? focus, bp)}
          onResetOverrides={() => resetOverrides(focus.id)}
          commit={commitBp}
          onAdded={setSelectedId}
        />
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-11 shrink-0 items-center gap-1 border-b bg-background px-2">
          <nav className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto">
            {path.map((n, i) => (
              <div key={n.id} className="flex items-center gap-0.5">
                {i > 0 && <ChevronRightIcon className="size-3.5 shrink-0 text-muted-foreground" />}
                <Button variant={i === path.length - 1 ? "secondary" : "ghost"} size="xs" className="font-mono" onClick={() => drillIn(n.id)}>
                  <span className="size-2 rounded-full" style={{ background: n.color }} />
                  {n.name}
                  <span className="text-muted-foreground">{n.layout?.type === "grid" && n.layout.auto ? "auto-grid" : n.layout?.type}</span>
                </Button>
              </div>
            ))}
          </nav>
          <Button variant="ghost" size="sm" onClick={() => add()}>
            <PlusIcon />
            <span className="hidden xl:inline">Element</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
              <LayoutTemplateIcon />
              <span className="hidden xl:inline">Templates</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel>{focus.layout?.type === "grid" ? "Grid" : "Flex"}</DropdownMenuLabel>
                {presets.map((p) => (
                  <DropdownMenuItem key={p.id} onClick={() => applyPreset(p.id)}>
                    {p.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel>{focus.layout?.type === "grid" ? "Flex" : "Grid"}</DropdownMenuLabel>
                {otherPresets.map((p) => (
                  <DropdownMenuItem key={p.id} onClick={() => applyPreset(p.id)}>
                    {p.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <IconButton label="Import CSS / HTML" onClick={() => setImportOpen(true)}>
            <FileInputIcon />
          </IconButton>
          <Separator orientation="vertical" className="mx-1 h-5" />
          <div className="hidden items-center gap-0.5 rounded-lg border p-0.5 sm:flex">
            <IconButton label="Window width" active={viewport === "fit"} onClick={() => setViewport("fit")} className="size-6">
              <ScanIcon />
            </IconButton>
            {BREAKPOINTS.map((b) => (
              <Tooltip key={b.id}>
                <TooltipTrigger
                  render={
                    <button
                      onClick={() => setViewport(b.id)}
                      className={cn(
                        "relative h-6 rounded-md px-1.5 font-mono text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                        viewport === b.id && "bg-secondary text-foreground",
                        viewport === "fit" && bp === b.id && "text-primary",
                      )}
                    />
                  }
                >
                  {b.label}
                  {used.has(b.id) && b.id !== "base" && <span className="absolute top-0.5 right-0.5 size-1 rounded-full bg-primary" />}
                </TooltipTrigger>
                <TooltipContent>{b.id === "base" ? "Mobile, no media query · 390px" : `@media (min-width: ${b.min}px)`}</TooltipContent>
              </Tooltip>
            ))}
          </div>
          <IconButton label={content ? "Hide placeholder content" : "Show placeholder content"} active={content} onClick={() => setContent((c) => !c)}>
            <TypeIcon />
          </IconButton>
          <IconButton label={overlay ? "Preview mode" : "Edit mode"} active={!overlay} onClick={() => setOverlay((o) => !o)}>
            {overlay ? <EyeIcon /> : <EyeOffIcon />}
          </IconButton>
          <Separator orientation="vertical" className="mx-1 h-5" />
          <IconButton label="Undo (Ctrl+Z)" onClick={undo} disabled={!canUndo}>
            <Undo2Icon />
          </IconButton>
          <IconButton label="Redo (Ctrl+Shift+Z)" onClick={redo} disabled={!canRedo}>
            <Redo2Icon />
          </IconButton>
          <IconButton label="Reset" onClick={reset}>
            <RotateCcwIcon />
          </IconButton>
        </div>

        <div className={cn("flex h-7 shrink-0 items-center gap-2 border-b px-3 font-mono text-[11px]", bp === "base" ? "bg-background text-muted-foreground" : "bg-primary/10 text-primary")}>
          <PencilIcon className="size-3" />
          {bp === "base" ? (
            <span>All screens · base</span>
          ) : (
            <span>
              {bp} · from {info.min}px
            </span>
          )}
          <span className="ml-auto text-muted-foreground">{viewport === "fit" ? `${innerWidth}px` : `${info.frame}px`}</span>
        </div>

        <div className="canvas-bg min-h-0 flex-1 overflow-auto p-4 md:p-8">
          <div
            className={cn("mx-auto h-full min-h-[420px] rounded-xl border bg-background shadow-sm", viewport === "fit" ? "w-full" : "w-fit")}
            style={{ padding: framePadding }}
          >
            <div ref={innerRef} className="h-full" style={{ width: viewport === "fit" ? "100%" : info.frame }}>
              <CanvasContext.Provider value={{ overlay, content }}>
                {explicitGrid && eff && (
                  <GridCanvas
                    node={focus}
                    eff={eff}
                    colsEditable={!isSubgridAxis(view, focus.id, "columns")}
                    rowsEditable={!isSubgridAxis(view, focus.id, "rows")}
                    selectedId={selectedId}
                    overlay={overlay}
                    onSelect={setSelectedId}
                    onFocus={drillIn}
                    onArea={setArea}
                    onCreate={(area) => add({ area })}
                    onTrackSize={onTrackSize}
                    onTrackInsert={(axis, i) => editFocus((n) => insertTrack(n, axis, i))}
                    onTrackRemove={(axis, i) => editFocus((n) => removeTrack(n, axis, i))}
                  />
                )}
                {(focus.layout?.type === "flex" || autoGrid) && (
                  <FlexCanvas
                    node={focus}
                    selectedId={selectedId}
                    overlay={overlay}
                    onSelect={setSelectedId}
                    onFocus={drillIn}
                    onAdd={() => add()}
                    onReorder={(id, refId, before) =>
                      editFocus((n) => {
                        reorderChild(n, id, refId, before)
                      })
                    }
                    onResize={onFlexResize}
                  />
                )}
              </CanvasContext.Provider>
            </div>
          </div>
        </div>

        <div className="flex h-7 shrink-0 items-center gap-3 border-t bg-background px-3 text-[11px] text-muted-foreground">
          <span>{countNodes(root) - 1} elements</span>
          <span className="hidden truncate md:inline">
            {explicitGrid
              ? "Arrows — nudge · Shift+arrows — resize · Del · Ctrl+D · Esc"
              : "Arrows — nudge · Del · Ctrl+D · Enter — enter · Esc — up"}
          </span>
        </div>
      </section>

      <aside className="hidden w-[340px] shrink-0 flex-col border-l bg-background lg:flex">
        <Tabs value={tab} onValueChange={(v) => setTab(v as string)} className="flex min-h-0 flex-1 flex-col gap-0">
          <div className="border-b p-2">
            <TabsList className="w-full">
              <TabsTrigger value="props">Properties</TabsTrigger>
              <TabsTrigger value="code">Code</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="props" className="min-h-0 overflow-y-auto">
            <ItemInspector
              key={selected?.id ?? "none"}
              node={selected}
              parentLayout={focus.layout}
              parentEff={eff}
              bp={bp}
              overrides={baseSelected ? overridesAt(baseSelected, bp) : []}
              commit={commitBp}
              onFocus={drillIn}
              onDuplicate={duplicate}
              onRemove={remove}
              onResetOverrides={resetOverrides}
            />
          </TabsContent>
          <TabsContent value="code" className="min-h-0">
            <CodePanel root={root} content={content} onContent={setContent} />
          </TabsContent>
        </Tabs>
      </aside>

      <ImportDialog open={importOpen} onOpenChange={setImportOpen} onImport={importTree} />
    </div>
  )
}
