export interface Track {
  id: string
  size: string
}

export interface GridLayout {
  type: "grid"
  columns: Track[]
  rows: Track[]
  subgridColumns: boolean
  subgridRows: boolean
  columnGap: number
  rowGap: number
  justifyItems: string
  alignItems: string
  justifyContent: string
  alignContent: string
  auto?: AutoRepeat | null
  autoRows?: string
}

export interface AutoRepeat {
  mode: "auto-fill" | "auto-fit"
  min: string
  max: string
}

export interface FlexLayout {
  type: "flex"
  direction: "row" | "row-reverse" | "column" | "column-reverse"
  wrap: "nowrap" | "wrap" | "wrap-reverse"
  justifyContent: string
  alignItems: string
  alignContent: string
  columnGap: number
  rowGap: number
}

export type Layout = GridLayout | FlexLayout
export type LayoutType = Layout["type"]

export interface Area {
  c1: number
  c2: number
  r1: number
  r2: number
}

export interface FlexItem {
  grow: number
  shrink: number
  basis: string
}

export interface LayoutNode {
  id: string
  name: string
  color: string
  layout: Layout | null
  padding: number
  radius: number
  area: Area
  flex: FlexItem
  width: string
  height: string
  minHeight: string
  alignSelf: string
  justifySelf: string
  hidden?: boolean
  content?: ContentKind
  responsive?: Partial<Record<Exclude<Bp, "base">, NodeOverride>>
  children: LayoutNode[]
}

export type Bp = "base" | "sm" | "md" | "lg" | "xl"

export type RespKey = "layout" | "area" | "flex" | "width" | "height" | "minHeight" | "alignSelf" | "justifySelf" | "padding" | "hidden"

export type NodeOverride = Partial<Pick<LayoutNode, RespKey>>

export type ContentKind = "auto" | "heading" | "text" | "long" | "image" | "button" | "list" | "card"

export interface GridEff {
  columns: string[]
  rows: string[]
  columnGap: number
  rowGap: number
}

export type Axis = "columns" | "rows"
