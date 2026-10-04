import { Suspense, lazy, useState } from "react"
import { useTheme } from "@/lib/theme"
import { LayoutGridIcon, MoonIcon, PaletteIcon, RowsIcon, SparklesIcon, SunIcon } from "lucide-react"
import { rootNode } from "@/layout/defaults"
import { useLayoutDoc } from "@/layout/store"
import { IconButton } from "@/components/fields"
import { SocialLinks } from "@/components/social-links"
import { LayoutEditor } from "@/components/layout/layout-editor"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const PaletteTool = lazy(() => import("@/components/palette/palette-tool").then((m) => ({ default: m.PaletteTool })))
const ToolsView = lazy(() => import("@/components/tools/tools-view").then((m) => ({ default: m.ToolsView })))

function Loading() {
  return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading…</div>
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const dark = resolvedTheme === "dark"
  return (
    <IconButton label={dark ? "Light theme" : "Dark theme"} onClick={() => setTheme(dark ? "light" : "dark")}>
      {dark ? <SunIcon /> : <MoonIcon />}
    </IconButton>
  )
}

export default function App() {
  const [tab, setTab] = useState(() => {
    try {
      return localStorage.getItem("lf-tab") ?? "grid"
    } catch {
      return "grid"
    }
  })
  const gridDoc = useLayoutDoc("lf-grid", () => rootNode("grid"))
  const flexDoc = useLayoutDoc("lf-flex", () => rootNode("flex"))

  const changeTab = (v: string) => {
    setTab(v)
    try {
      localStorage.setItem("lf-tab", v)
    } catch {
      return
    }
  }

  return (
    <Tabs value={tab} onValueChange={(v) => changeTab(v as string)} className="flex h-dvh flex-col gap-0 bg-background">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b px-3">
        <div className="flex items-center gap-2">
          <div className="grid size-7 grid-cols-2 gap-0.5 rounded-lg bg-primary p-1.5">
            <span className="rounded-[2px] bg-primary-foreground" />
            <span className="rounded-[2px] bg-primary-foreground/60" />
            <span className="col-span-2 rounded-[2px] bg-primary-foreground/80" />
          </div>
          <span className="hidden text-sm font-semibold tracking-tight sm:inline">Layout Forge</span>
          <SocialLinks />
        </div>
        <TabsList className="mx-auto">
          <TabsTrigger value="grid" className="px-3">
            <LayoutGridIcon />
            Grid
          </TabsTrigger>
          <TabsTrigger value="flex" className="px-3">
            <RowsIcon className="rotate-90" />
            Flex
          </TabsTrigger>
          <TabsTrigger value="palette" className="px-3">
            <PaletteIcon />
            Palette
          </TabsTrigger>
          <TabsTrigger value="tools" className="px-3">
            <SparklesIcon />
            Generators
          </TabsTrigger>
        </TabsList>
        <ThemeToggle />
      </header>
      <TabsContent value="grid" className="min-h-0">
        <LayoutEditor doc={gridDoc} kind="grid" />
      </TabsContent>
      <TabsContent value="flex" className="min-h-0">
        <LayoutEditor doc={flexDoc} kind="flex" />
      </TabsContent>
      <TabsContent value="palette" className="min-h-0">
        <Suspense fallback={<Loading />}>
          <PaletteTool />
        </Suspense>
      </TabsContent>
      <TabsContent value="tools" className="min-h-0">
        <Suspense fallback={<Loading />}>
          <ToolsView />
        </Suspense>
      </TabsContent>
    </Tabs>
  )
}
