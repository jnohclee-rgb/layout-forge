import { useEffect, useRef, useState } from "react"
import { DicesIcon, ImageDownIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { oklchToHex } from "@/lib/color"
import { DEFAULT_MESH, MESH_PRESETS, type MeshState, meshCss, presetPoints, renderMeshPng } from "@/lib/mesh"
import { randomSeed, rng } from "@/lib/random"
import { usePersistent } from "@/lib/use-persistent"
import { cn } from "@/lib/utils"
import { ColorInput } from "@/components/color-input"
import { Field, IconButton, Section, SliderField } from "@/components/fields"
import { PresetGrid, ToolLayout } from "@/components/tools/tool-layout"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

export function MeshPreview({ state, className, children }: { state: MeshState; className?: string; children?: React.ReactNode }) {
  const [cls] = useState(() => `mesh-${Math.random().toString(36).slice(2, 8)}`)
  return (
    <div className={cn("relative overflow-hidden", className)}>
      <style>{meshCss(state, `.${cls}`)}</style>
      <div className={cls} style={{ position: "absolute", inset: 0 }} />
      {children}
    </div>
  )
}

export function MeshTool() {
  const [s, set] = usePersistent<MeshState>("lf-tool-mesh", DEFAULT_MESH)
  const [selected, setSelected] = useState(0)
  const [drag, setDrag] = useState<number | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const point = s.points[selected] ?? s.points[0]

  useEffect(() => {
    if (drag === null) return
    const move = (e: PointerEvent) => {
      const r = boxRef.current?.getBoundingClientRect()
      if (!r) return
      const x = Math.round(Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100)))
      const y = Math.round(Math.min(100, Math.max(0, ((e.clientY - r.top) / r.height) * 100)))
      set({ points: s.points.map((p, i) => (i === drag ? { ...p, x, y } : p)) })
    }
    const up = () => setDrag(null)
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
    return () => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
    }
  })

  const update = (patch: Partial<MeshState["points"][number]>) => set({ points: s.points.map((p, i) => (i === selected ? { ...p, ...patch } : p)) })

  const randomize = () => {
    const seed = randomSeed()
    const rand = rng(seed)
    const hue = rand() * 360
    const colors = Array.from({ length: s.points.length || 4 }, (_, i) =>
      oklchToHex({ l: 0.65 + rand() * 0.2, c: 0.12 + rand() * 0.08, h: (hue + i * (40 + rand() * 50)) % 360 }),
    )
    set({ seed, points: presetPoints(colors, seed), base: oklchToHex({ l: 0.25 + rand() * 0.6, c: 0.05, h: hue }) })
  }

  const outputs = [
    { id: "css", label: "CSS", lang: "css", file: "mesh.css", code: `${meshCss(s)}\n` },
    { id: "html", label: "HTML", lang: "html", file: "mesh.html", code: `<section class="mesh">\n  <h1>Hero</h1>\n</section>\n\n<style>\n${meshCss(s)}\n</style>\n` },
  ]

  const controls = (
    <>
      <Section
        title="Templates"
        action={
          <Button variant="ghost" size="xs" onClick={randomize}>
            <DicesIcon />
            Random
          </Button>
        }
      >
        <PresetGrid
          items={MESH_PRESETS}
          cols={4}
          onPick={(p) => {
            set({ base: p.base, points: presetPoints(p.colors, s.seed) })
            setSelected(0)
          }}
          render={(p) => <MeshPreview state={{ ...s, base: p.base, points: presetPoints(p.colors, s.seed), animate: false, grain: false }} className="size-full" />}
        />
      </Section>
      <Section
        title={`Points · ${s.points.length}`}
        action={
          <div className="flex">
            <IconButton
              label="Add point"
              disabled={s.points.length >= 8}
              onClick={() => {
                const rand = rng(Date.now())
                set({ points: [...s.points, { id: Math.random().toString(36).slice(2, 8), x: Math.round(rand() * 100), y: Math.round(rand() * 100), color: oklchToHex({ l: 0.75, c: 0.15, h: rand() * 360 }), size: 60 }] })
                setSelected(s.points.length)
              }}
            >
              <PlusIcon />
            </IconButton>
            <IconButton
              label="Delete point"
              disabled={s.points.length <= 1}
              onClick={() => {
                set({ points: s.points.filter((_, i) => i !== selected) })
                setSelected(0)
              }}
            >
              <Trash2Icon />
            </IconButton>
          </div>
        }
      >
        <div className="flex flex-wrap gap-1.5">
          {s.points.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setSelected(i)}
              className={cn("size-7 rounded-full ring-offset-2 ring-offset-background transition", i === selected ? "ring-2 ring-foreground/70" : "ring-1 ring-foreground/10")}
              style={{ background: p.color }}
              aria-label={`Point ${i + 1}`}
            />
          ))}
        </div>
        {point && (
          <div className="flex flex-col gap-3 rounded-lg border p-3">
            <ColorInput value={point.color} compact onChange={(color) => update({ color })} />
            <SliderField label="Size" value={point.size} min={10} max={150} unit="%" onChange={(size) => update({ size })} />
            <div className="grid grid-cols-2 gap-x-3">
              <SliderField label="X" value={point.x} min={0} max={100} unit="%" onChange={(x) => update({ x })} />
              <SliderField label="Y" value={point.y} min={0} max={100} unit="%" onChange={(y) => update({ y })} />
            </div>
          </div>
        )}
        <Field label="Background">
          <ColorInput value={s.base} compact onChange={(base) => set({ base })} />
        </Field>
        <SliderField label="Softness" value={s.softness} min={30} max={100} unit="%" onChange={(softness) => set({ softness })} />
      </Section>
      <Section title="Animation">
        <div className="flex items-center justify-between">
          <Label htmlFor="mesh-anim" className="text-xs">
            Animate (@property + @keyframes)
          </Label>
          <Switch id="mesh-anim" size="sm" checked={s.animate} onCheckedChange={(animate) => set({ animate })} />
        </div>
        {s.animate && (
          <>
            <SliderField label="Cycle" value={s.duration} min={3} max={60} unit="s" onChange={(duration) => set({ duration })} />
            <SliderField label="Motion amplitude" value={s.amplitude} min={2} max={45} unit="%" onChange={(amplitude) => set({ amplitude })} />
            <Button variant="outline" size="xs" onClick={() => set({ seed: randomSeed() })}>
              <DicesIcon />
              Another path
            </Button>
          </>
        )}
      </Section>
      <Section title="Grain">
        <div className="flex items-center justify-between">
          <Label htmlFor="mesh-grain" className="text-xs">
            Noise overlay (feTurbulence)
          </Label>
          <Switch id="mesh-grain" size="sm" checked={s.grain} onCheckedChange={(grain) => set({ grain })} />
        </div>
        {s.grain && <SliderField label="Intensity" value={s.grainOpacity} min={0.05} max={0.8} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(grainOpacity) => set({ grainOpacity })} />}
      </Section>
    </>
  )

  return (
    <ToolLayout
      controls={controls}
      outputs={outputs}
      footer={
        <Button variant="outline" size="sm" onClick={() => downloadPng(s)}>
          <ImageDownIcon />
          Download PNG 1920×1080
        </Button>
      }
    >
      <div className="flex h-full min-h-[460px] items-center justify-center p-6 md:p-10">
        <div ref={boxRef} className="relative aspect-video w-full max-w-5xl overflow-hidden rounded-2xl shadow-xl ring-1 ring-foreground/10">
          <MeshPreview state={s} className="absolute inset-0" />
          {s.points.map((p, i) => (
            <span
              key={p.id}
              onPointerDown={(e) => {
                e.preventDefault()
                setSelected(i)
                setDrag(i)
              }}
              className={cn(
                "absolute z-10 size-5 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-2 border-white shadow-lg transition-transform active:cursor-grabbing",
                i === selected && "scale-125 ring-2 ring-black/40",
              )}
              style={{ left: `${p.x}%`, top: `${p.y}%`, background: p.color }}
            />
          ))}
        </div>
      </div>
    </ToolLayout>
  )
}

function downloadPng(s: MeshState) {
  const a = document.createElement("a")
  a.href = renderMeshPng(s)
  a.download = "mesh-gradient.png"
  a.click()
}
