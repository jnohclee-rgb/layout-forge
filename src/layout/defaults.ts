import type { Area, FlexLayout, GridLayout, LayoutNode, Track } from "@/layout/types"

export const ITEM_COLORS = [
  "#6366f1",
  "#ec4899",
  "#14b8a6",
  "#f59e0b",
  "#3b82f6",
  "#ef4444",
  "#22c55e",
  "#a855f7",
  "#06b6d4",
  "#f97316",
]

export function uid() {
  return Math.random().toString(36).slice(2, 10)
}

export function track(size = "1fr"): Track {
  return { id: uid(), size }
}

export function gridLayout(columns: string[] = ["1fr", "1fr", "1fr"], rows: string[] = ["1fr", "1fr"], gap = 12): GridLayout {
  return {
    type: "grid",
    columns: columns.map(track),
    rows: rows.map(track),
    subgridColumns: false,
    subgridRows: false,
    columnGap: gap,
    rowGap: gap,
    justifyItems: "normal",
    alignItems: "normal",
    justifyContent: "normal",
    alignContent: "normal",
  }
}

export function flexLayout(partial: Partial<FlexLayout> = {}): FlexLayout {
  return {
    type: "flex",
    direction: "row",
    wrap: "nowrap",
    justifyContent: "normal",
    alignItems: "normal",
    alignContent: "normal",
    columnGap: 12,
    rowGap: 12,
    ...partial,
  }
}

let colorCursor = 0

export function nextColor() {
  const c = ITEM_COLORS[colorCursor % ITEM_COLORS.length]
  colorCursor++
  return c
}

export function area(c1: number, c2: number, r1: number, r2: number): Area {
  return { c1, c2, r1, r2 }
}

export function createNode(partial: Partial<LayoutNode> = {}): LayoutNode {
  return {
    id: uid(),
    name: "item",
    color: nextColor(),
    layout: null,
    padding: 12,
    radius: 8,
    area: area(1, 2, 1, 2),
    flex: { grow: 0, shrink: 1, basis: "auto" },
    width: "",
    height: "",
    minHeight: "",
    alignSelf: "auto",
    justifySelf: "auto",
    children: [],
    ...partial,
  }
}

export function cloneNode(node: LayoutNode): LayoutNode {
  return {
    ...(JSON.parse(JSON.stringify(node)) as LayoutNode),
    id: uid(),
    children: node.children.map(cloneNode),
    layout: node.layout
      ? node.layout.type === "grid"
        ? { ...node.layout, columns: node.layout.columns.map((t) => track(t.size)), rows: node.layout.rows.map((t) => track(t.size)) }
        : { ...node.layout }
      : null,
  }
}

const g = (name: string, a: Area, extra: Partial<LayoutNode> = {}) => createNode({ name, area: a, ...extra })
const f = (name: string, extra: Partial<LayoutNode> = {}) => createNode({ name, ...extra })

export function rootNode(type: "grid" | "flex"): LayoutNode {
  return createNode({
    name: type === "grid" ? "layout" : "container",
    color: "#64748b",
    padding: 16,
    radius: 0,
    minHeight: "100vh",
    layout: type === "grid" ? gridLayout() : flexLayout(),
  })
}

export interface Preset {
  id: string
  name: string
  type: "grid" | "flex"
  build: () => Pick<LayoutNode, "layout" | "children">
}

export const PRESETS: Preset[] = [
  {
    id: "holy-grail",
    name: "Holy Grail",
    type: "grid",
    build: () => ({
      layout: gridLayout(["220px", "1fr", "220px"], ["auto", "1fr", "auto"], 16),
      children: [
        g("header", area(1, 4, 1, 2)),
        g("nav", area(1, 2, 2, 3)),
        g("main", area(2, 3, 2, 3)),
        g("aside", area(3, 4, 2, 3)),
        g("footer", area(1, 4, 3, 4)),
      ],
    }),
  },
  {
    id: "dashboard",
    name: "Dashboard",
    type: "grid",
    build: () => ({
      layout: gridLayout(["240px", "1fr", "1fr", "1fr"], ["64px", "140px", "1fr"], 16),
      children: [
        g("sidebar", area(1, 2, 1, 4)),
        g("topbar", area(2, 5, 1, 2)),
        g("stat-users", area(2, 3, 2, 3)),
        g("stat-sales", area(3, 4, 2, 3)),
        g("stat-orders", area(4, 5, 2, 3)),
        g("chart", area(2, 5, 3, 4)),
      ],
    }),
  },
  {
    id: "bento",
    name: "Bento",
    type: "grid",
    build: () => ({
      layout: gridLayout(["1fr", "1fr", "1fr", "1fr"], ["1fr", "1fr", "1fr"], 12),
      children: [
        g("hero", area(1, 3, 1, 3)),
        g("tile-a", area(3, 4, 1, 2)),
        g("tile-b", area(4, 5, 1, 3)),
        g("tile-c", area(3, 4, 2, 4)),
        g("tile-d", area(1, 2, 3, 4)),
        g("tile-e", area(2, 3, 3, 4)),
        g("tile-f", area(4, 5, 3, 4)),
      ],
    }),
  },
  {
    id: "twelve",
    name: "12 columns",
    type: "grid",
    build: () => ({
      layout: gridLayout(Array(12).fill("1fr"), ["auto", "1fr", "auto"], 16),
      children: [
        g("header", area(1, 13, 1, 2)),
        g("content", area(1, 9, 2, 3)),
        g("sidebar", area(9, 13, 2, 3)),
        g("footer", area(1, 13, 3, 4)),
      ],
    }),
  },
  {
    id: "subgrid-cards",
    name: "Cards on subgrid",
    type: "grid",
    build: () => ({
      layout: gridLayout(["1fr", "1fr", "1fr"], ["auto", "1fr", "auto"], 16),
      children: [1, 2, 3].map((i) => {
        const card = g(`card-${i}`, area(i, i + 1, 1, 4), {
          padding: 12,
          layout: { ...gridLayout(["1fr"], ["auto", "1fr", "auto"], 8), subgridRows: true },
        })
        card.children = [
          g(`title-${i}`, area(1, 2, 1, 2)),
          g(`body-${i}`, area(1, 2, 2, 3)),
          g(`actions-${i}`, area(1, 2, 3, 4)),
        ]
        return card
      }),
    }),
  },
  {
    id: "navbar",
    name: "Navbar",
    type: "flex",
    build: () => ({
      layout: flexLayout({ justifyContent: "space-between", alignItems: "center" }),
      children: [
        f("logo"),
        f("nav", {
          layout: flexLayout({ columnGap: 8, alignItems: "center" }),
          padding: 8,
          children: [f("link-1"), f("link-2"), f("link-3")],
        }),
        f("actions"),
      ],
    }),
  },
  {
    id: "cards-wrap",
    name: "Cards (wrap)",
    type: "flex",
    build: () => ({
      layout: flexLayout({ wrap: "wrap", columnGap: 16, rowGap: 16, alignContent: "flex-start" }),
      children: [1, 2, 3, 4, 5, 6].map((i) => f(`card-${i}`, { flex: { grow: 1, shrink: 1, basis: "220px" }, height: "140px" })),
    }),
  },
  {
    id: "sidebar",
    name: "Sidebar + content",
    type: "flex",
    build: () => ({
      layout: flexLayout({ columnGap: 16 }),
      children: [
        f("sidebar", { width: "240px", flex: { grow: 0, shrink: 0, basis: "auto" } }),
        f("main", {
          flex: { grow: 1, shrink: 1, basis: "0%" },
          layout: flexLayout({ direction: "column", rowGap: 12 }),
          children: [f("toolbar"), f("content", { flex: { grow: 1, shrink: 1, basis: "auto" } })],
        }),
      ],
    }),
  },
  {
    id: "center",
    name: "Centering",
    type: "flex",
    build: () => ({
      layout: flexLayout({ justifyContent: "center", alignItems: "center" }),
      children: [f("modal", { width: "320px", height: "200px" })],
    }),
  },
  {
    id: "stack",
    name: "Vertical stack",
    type: "flex",
    build: () => ({
      layout: flexLayout({ direction: "column", rowGap: 12 }),
      children: [f("title"), f("subtitle"), f("body", { flex: { grow: 1, shrink: 1, basis: "auto" } }), f("cta", { alignSelf: "flex-start" })],
    }),
  },
]
