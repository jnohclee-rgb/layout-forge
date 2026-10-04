import { Suspense, lazy, type ComponentType } from "react"
import {
  ArrowUpRightIcon,
  AppWindowIcon,
  CloudMoonIcon,
  FlameIcon,
  SnowflakeIcon,
  TimerIcon,
  WandSparklesIcon,
  BlendIcon,
  BoxIcon,
  Gamepad2Icon,
  GemIcon,
  LaptopIcon,
  PuzzleIcon,
  ShareIcon,
  SunsetIcon,
  TerminalIcon,
  WindIcon,
  ScanLineIcon,
  CircleDashedIcon,
  ClapperboardIcon,
  DropletsIcon,
  GlassWaterIcon,
  Grid3x3Icon,
  ImageIcon,
  MountainIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  RulerIcon,
  ScissorsIcon,
  ShapesIcon,
  SlashIcon,
  SparkleIcon,
  SquareDashedIcon,
  SunIcon,
  WavesIcon,
} from "lucide-react"
import { usePersistent } from "@/lib/use-persistent"
import { cn } from "@/lib/utils"
import { AsciiTool } from "@/components/tools/ascii-tool"
import { BauhausTool } from "@/components/tools/bauhaus-tool"
import { DitherTool } from "@/components/tools/dither-tool"
import { FaviconTool } from "@/components/tools/favicon-tool"
import { FlowTool } from "@/components/tools/flow-tool"
import { LowPolyTool } from "@/components/tools/lowpoly-tool"
import { MockupTool } from "@/components/tools/mockup-tool"
import { OgTool } from "@/components/tools/og-tool"
import { PixelTool } from "@/components/tools/pixel-tool"
import { SynthTool } from "@/components/tools/synth-tool"
import { AnimationTool } from "@/components/tools/animation-tool"
import { ArrowTool } from "@/components/tools/arrow-tool"
import { AuroraTool } from "@/components/tools/aurora-tool"
import { EffectsTool } from "@/components/tools/effects-tool"
import { LavaTool } from "@/components/tools/lava-tool"
import { ParticlesTool } from "@/components/tools/particles-tool"
import { BlobTool } from "@/components/tools/blob-tool"
import { BurstTool } from "@/components/tools/burst-tool"
import { ClipPathTool } from "@/components/tools/clip-path-tool"
import { DividerTool } from "@/components/tools/divider-tool"
import { GlassTool } from "@/components/tools/glass-tool"
import { ImageTool } from "@/components/tools/image-tool"
import { LineTool } from "@/components/tools/line-tool"
import { MaskTool } from "@/components/tools/mask-tool"
import { MeshTool } from "@/components/tools/mesh-tool"
import { PatternTool } from "@/components/tools/pattern-tool"
import { ScatterTool } from "@/components/tools/scatter-tool"
import { ScrollVideoTool } from "@/components/tools/scroll-video-tool"
import { ShadowTool } from "@/components/tools/shadow-tool"
import { TopoTool } from "@/components/tools/topo-tool"
import { UnitsTool } from "@/components/tools/units-tool"
import { WaveTool } from "@/components/tools/wave-tool"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface Tool {
  id: string
  label: string
  icon: ComponentType<{ className?: string }>
  view: ComponentType
}

const ThreeTool = lazy(() => import("@/components/tools/three-tool").then((m) => ({ default: m.ThreeTool })))

const GROUPS: { title: string; tools: Tool[] }[] = [
  {
    title: "Backgrounds",
    tools: [
      { id: "mesh", label: "Mesh gradient", icon: DropletsIcon, view: MeshTool },
      { id: "pattern", label: "Patterns", icon: Grid3x3Icon, view: PatternTool },
      { id: "scatter", label: "Shape backgrounds", icon: ShapesIcon, view: ScatterTool },
      { id: "topo", label: "Contours", icon: MountainIcon, view: TopoTool },
      { id: "burst", label: "Rays and spirals", icon: SunIcon, view: BurstTool },
      { id: "aurora", label: "Aurora", icon: CloudMoonIcon, view: AuroraTool },
      { id: "lava", label: "Lava lamp", icon: FlameIcon, view: LavaTool },
      { id: "image", label: "Photo as background", icon: ImageIcon, view: ImageTool },
    ],
  },
  {
    title: "Generative",
    tools: [
      { id: "bauhaus", label: "Bauhaus grids", icon: PuzzleIcon, view: BauhausTool },
      { id: "lowpoly", label: "Low-poly / Voronoi", icon: GemIcon, view: LowPolyTool },
      { id: "flow", label: "Flow field", icon: WindIcon, view: FlowTool },
      { id: "dither", label: "Dither and halftone", icon: ScanLineIcon, view: DitherTool },
      { id: "ascii", label: "ASCII art", icon: TerminalIcon, view: AsciiTool },
      { id: "pixel", label: "Pixel-art", icon: Gamepad2Icon, view: PixelTool },
      { id: "synth", label: "Synthwave", icon: SunsetIcon, view: SynthTool },
    ],
  },
  {
    title: "Shapes and decor",
    tools: [
      { id: "divider", label: "Dividers", icon: SlashIcon, view: DividerTool },
      { id: "wave", label: "Waves", icon: WavesIcon, view: WaveTool },
      { id: "blob", label: "Blob", icon: CircleDashedIcon, view: BlobTool },
      { id: "clip", label: "clip-path", icon: ScissorsIcon, view: ClipPathTool },
      { id: "line", label: "Lines and squiggles", icon: SparkleIcon, view: LineTool },
      { id: "arrow", label: "Arrows", icon: ArrowUpRightIcon, view: ArrowTool },
    ],
  },
  {
    title: "Effects",
    tools: [
      { id: "glass", label: "Glassmorphism", icon: GlassWaterIcon, view: GlassTool },
      { id: "mask", label: "CSS mask", icon: SquareDashedIcon, view: MaskTool },
      { id: "fx", label: "CSS effects", icon: WandSparklesIcon, view: EffectsTool },
      { id: "shadow", label: "Shadows", icon: BlendIcon, view: ShadowTool },
    ],
  },
  {
    title: "3D and motion",
    tools: [
      { id: "three", label: "3D scenes", icon: BoxIcon, view: ThreeTool },
      { id: "animation", label: "CSS animations", icon: TimerIcon, view: AnimationTool },
      { id: "particles", label: "Particles", icon: SnowflakeIcon, view: ParticlesTool },
      { id: "scroll", label: "Scroll video", icon: ClapperboardIcon, view: ScrollVideoTool },
    ],
  },
  {
    title: "Media and assets",
    tools: [
      { id: "mockup", label: "Mockups", icon: LaptopIcon, view: MockupTool },
      { id: "og", label: "OG images", icon: ShareIcon, view: OgTool },
      { id: "favicon", label: "Favicon", icon: AppWindowIcon, view: FaviconTool },
    ],
  },
  {
    title: "Typography",
    tools: [{ id: "units", label: "Font units", icon: RulerIcon, view: UnitsTool }],
  },
]

const ALL = GROUPS.flatMap((g) => g.tools)

export function ToolsView() {
  const [s, set] = usePersistent("lf-tools", { tool: "mesh", collapsed: false })
  const tool = ALL.find((t) => t.id === s.tool) ?? ALL[0]
  const View = tool.view
  return (
    <div className="flex h-full min-h-0 flex-col md:flex-row">
      <nav
        className={cn(
          "flex shrink-0 gap-1 overflow-x-auto border-b bg-background p-2 md:flex-col md:overflow-x-hidden md:overflow-y-auto md:border-r md:border-b-0",
          s.collapsed ? "md:w-14" : "md:w-52",
        )}
      >
        <button
          onClick={() => set({ collapsed: !s.collapsed })}
          className="hidden h-8 items-center gap-2 rounded-md px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground md:flex"
          aria-label={s.collapsed ? "Expand panel" : "Collapse panel"}
        >
          {s.collapsed ? <PanelLeftOpenIcon className="size-4" /> : <PanelLeftCloseIcon className="size-4" />}
          {!s.collapsed && "Collapse"}
        </button>
        {GROUPS.map((g) => (
          <div key={g.title} className="flex shrink-0 gap-1 md:flex-col">
            {!s.collapsed && <p className="hidden px-2 pt-3 pb-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase md:block">{g.title}</p>}
            {s.collapsed && <span className="mx-2 my-1.5 hidden h-px bg-border md:block" />}
            {g.tools.map((t) => {
              const btn = (
                <button
                  key={t.id}
                  onClick={() => set({ tool: t.id })}
                  className={cn(
                    "flex h-8 shrink-0 items-center gap-2 rounded-md px-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                    t.id === tool.id && "bg-secondary font-medium text-foreground",
                    s.collapsed && "md:justify-center md:px-0",
                  )}
                >
                  <t.icon className="size-4 shrink-0" />
                  <span className={cn("truncate", s.collapsed && "md:hidden")}>{t.label}</span>
                </button>
              )
              return s.collapsed ? (
                <Tooltip key={t.id}>
                  <TooltipTrigger render={btn} />
                  <TooltipContent side="right">{t.label}</TooltipContent>
                </Tooltip>
              ) : (
                btn
              )
            })}
          </div>
        ))}
      </nav>
      <div className="min-h-0 min-w-0 flex-1">
        <Suspense fallback={<div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading…</div>}>
          <View key={tool.id} />
        </Suspense>
      </div>
    </div>
  )
}
