import { useMemo, useState } from "react"
import { DicesIcon, PlayIcon } from "lucide-react"
import { randomSeed, rng } from "@/lib/random"
import { type Pt, linePath, smoothPath, svgDataUri, svgToJsx } from "@/lib/svg"
import { usePersistent } from "@/lib/use-persistent"
import { ColorInput } from "@/components/color-input"
import { Field, Section, SliderField } from "@/components/fields"
import { PresetGrid, ToolLayout } from "@/components/tools/tool-layout"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

type Kind = "squiggle" | "zigzag" | "loops" | "scribble" | "double" | "circle" | "highlight" | "swoosh" | "dashes"

const KINDS: { id: Kind; name: string; place: "under" | "around" | "behind" }[] = [
  { id: "squiggle", name: "Wave", place: "under" },
  { id: "zigzag", name: "Zigzag", place: "under" },
  { id: "loops", name: "Loops", place: "under" },
  { id: "scribble", name: "Hand-drawn", place: "under" },
  { id: "double", name: "Double", place: "under" },
  { id: "dashes", name: "Dashed", place: "under" },
  { id: "swoosh", name: "Brush stroke", place: "under" },
  { id: "circle", name: "Outline", place: "around" },
  { id: "highlight", name: "Marker", place: "behind" },
]

interface State {
  kind: Kind
  amplitude: number
  frequency: number
  stroke: number
  roughness: number
  color: string
  seed: number
  animate: boolean
  duration: number
  word: string
}

const DEFAULTS: State = {
  kind: "squiggle",
  amplitude: 0.5,
  frequency: 6,
  stroke: 5,
  roughness: 0.3,
  color: "#ec4899",
  seed: 12,
  animate: true,
  duration: 1.2,
  word: "accent",
}

const VB: Record<"under" | "around" | "behind", [number, number]> = { under: [300, 30], around: [300, 110], behind: [300, 60] }

function shape(s: State): { d: string; fill: boolean; dash?: string }[] {
  const rand = rng(s.seed)
  const kind = KINDS.find((k) => k.id === s.kind) ?? KINDS[0]
  const [W, H] = VB[kind.place]
  const pad = s.stroke
  const amp = (H / 2 - pad) * s.amplitude
  const wobble = (scale: number) => (rand() - 0.5) * scale * s.roughness
  switch (s.kind) {
    case "squiggle":
    case "dashes": {
      const n = Math.max(1, s.frequency)
      const pts: Pt[] = []
      for (let i = 0; i <= n * 2; i++) pts.push([pad + ((W - pad * 2) * i) / (n * 2), H / 2 + (i % 2 ? amp : -amp) + wobble(amp)])
      return [{ d: smoothPath(pts, false), fill: false, dash: s.kind === "dashes" ? `${s.stroke * 2} ${s.stroke * 1.6}` : undefined }]
    }
    case "zigzag": {
      const n = Math.max(1, s.frequency)
      const pts: Pt[] = []
      for (let i = 0; i <= n * 2; i++) pts.push([pad + ((W - pad * 2) * i) / (n * 2), H / 2 + (i % 2 ? amp : -amp) + wobble(amp)])
      return [{ d: linePath(pts), fill: false }]
    }
    case "loops": {
      const n = Math.max(1, s.frequency)
      const r = Math.max(3, amp)
      const step = (W - pad * 2 - r * 2) / (n * Math.PI * 2)
      const pts: Pt[] = []
      const total = n * Math.PI * 2
      for (let t = 0; t <= total; t += 0.25) pts.push([pad + r + t * step - Math.sin(t) * r * 0.9, H / 2 + Math.cos(t) * r * 0.9 + wobble(2)])
      return [{ d: smoothPath(pts, false), fill: false }]
    }
    case "scribble": {
      const pts: Pt[] = []
      const k = 10
      for (let i = 0; i <= k; i++) pts.push([pad + ((W - pad * 2) * i) / k, H / 2 + Math.sin(i * 0.9) * amp * 0.3 + wobble(H * 0.6)])
      const back: Pt[] = []
      for (let i = k; i >= 2; i--) back.push([pad + ((W - pad * 2) * i) / k - 6, H / 2 + amp * 0.35 + wobble(H * 0.5)])
      return [{ d: smoothPath([...pts, ...back], false), fill: false }]
    }
    case "double": {
      const line = (y: number) => {
        const pts: Pt[] = []
        for (let i = 0; i <= 8; i++) pts.push([pad + ((W - pad * 2) * i) / 8 + wobble(6), y + wobble(H * 0.3)])
        return smoothPath(pts, false)
      }
      return [
        { d: line(H / 2 - amp * 0.6), fill: false },
        { d: line(H / 2 + amp * 0.6), fill: false },
      ]
    }
    case "swoosh": {
      const mid = H / 2
      const th = Math.max(2, s.stroke * 1.4)
      const top = `M${pad},${mid + th * 0.3} Q${W * 0.45},${mid - amp - th + wobble(6)} ${W - pad},${mid - amp * 0.4}`
      const bottom = ` Q${W * 0.5},${mid - amp + th + wobble(6)} ${pad},${mid + th * 0.3} Z`
      return [{ d: top + bottom, fill: true }]
    }
    case "circle": {
      const cx = W / 2
      const cy = H / 2
      const rx = W / 2 - pad - 4
      const ry = H / 2 - pad - 4
      const pts: Pt[] = []
      const start = -Math.PI * 0.55
      const turns = 1.12 + s.roughness * 0.1
      for (let i = 0; i <= 28; i++) {
        const a = start + (i / 28) * Math.PI * 2 * turns
        const drift = 1 + (i / 28) * 0.06 + wobble(0.08)
        pts.push([cx + Math.cos(a) * rx * drift, cy + Math.sin(a) * ry * drift])
      }
      return [{ d: smoothPath(pts, false), fill: false }]
    }
    case "highlight": {
      const top = H * 0.22
      const bottom = H * 0.88
      const pts: Pt[] = [
        [pad + wobble(10), top + wobble(10)],
        [W * 0.5, top - 2 + wobble(8)],
        [W - pad + wobble(10), top + 3 + wobble(10)],
        [W - pad - 4 + wobble(10), bottom + wobble(10)],
        [W * 0.5, bottom + 2 + wobble(8)],
        [pad + 4 + wobble(10), bottom - 2 + wobble(10)],
      ]
      return [{ d: smoothPath(pts, true, 0.4), fill: true }]
    }
  }
}

function buildSvg(s: State) {
  const kind = KINDS.find((k) => k.id === s.kind) ?? KINDS[0]
  const [W, H] = VB[kind.place]
  const paths = shape(s)
    .map((p) =>
      p.fill
        ? `  <path d="${p.d}" fill="${s.color}"${s.kind === "highlight" ? ' fill-opacity="0.45"' : ""} class="grow"/>`
        : `  <path d="${p.d}" fill="none" stroke="${s.color}" stroke-width="${s.stroke}" stroke-linecap="round" stroke-linejoin="round"${p.dash ? ` stroke-dasharray="${p.dash}"` : ' pathLength="1" class="draw"'}/>`,
    )
    .join("\n")
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" overflow="visible">\n${paths}\n</svg>`, W, H, place: kind.place }
}

const animCss = (d: number) => `.draw {
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  animation: line-draw ${d}s ease-out forwards;
}

.grow {
  transform-box: fill-box;
  transform-origin: left center;
  animation: line-grow ${d}s ease-out forwards;
}

@keyframes line-draw {
  to {
    stroke-dashoffset: 0;
  }
}

@keyframes line-grow {
  from {
    transform: scaleX(0);
  }
}`

export function LineTool() {
  const [s, set] = usePersistent<State>("lf-tool-line", DEFAULTS)
  const [replay, setReplay] = useState(0)
  const { svg, W, H, place } = useMemo(() => buildSvg(s), [s])
  const staticSvg = svg.replace(/ class="(draw|grow)"/g, "").replace(/ pathLength="1"/g, "")
  const posCss =
    place === "under"
      ? `  left: 0;\n  top: 88%;\n  width: 100%;\n  height: ${((H / W) * 100).toFixed(1)}%;\n  min-height: 0.35em;`
      : place === "around"
        ? "  left: -12%;\n  top: -28%;\n  width: 124%;\n  height: 156%;"
        : "  left: -4%;\n  top: 5%;\n  width: 108%;\n  height: 95%;\n  z-index: -1;"

  const outputs = [
    {
      id: "html",
      label: "HTML + CSS",
      lang: "html",
      file: "accent.html",
      code: `<h2>Make <span class="accent">${s.word}${svg.replace("<svg ", '<svg class="accent__line" aria-hidden="true" ').replace(/\n/g, "\n  ")}</span> noticeable</h2>\n\n<style>\n  .accent {\n    position: relative;\n    display: inline-block;\n    isolation: isolate;\n  }\n\n  .accent__line {\n    position: absolute;\n${posCss.replace(/^/gm, "  ")}\n    pointer-events: none;\n  }\n${s.animate ? `\n${animCss(s.duration).replace(/^/gm, "  ")}\n` : ""}</style>\n`,
    },
    { id: "svg", label: "SVG", lang: "html", file: "line.svg", code: `${staticSvg}\n` },
    ...(place === "under"
      ? [
          {
            id: "bg",
            label: "CSS background",
            lang: "css",
            file: "underline.css",
            code: `.underline {\n  padding-bottom: 0.3em;\n  background: url("${svgDataUri(staticSvg)}") left bottom / 100% 0.4em no-repeat;\n}\n`,
          },
        ]
      : []),
    {
      id: "jsx",
      label: "JSX",
      lang: "jsx",
      file: "Accent.jsx",
      code: `export function AccentLine(props) {\n  return (\n${svgToJsx(staticSvg)
        .replace("<svg ", "<svg {...props} ")
        .replace(' overflow="visible"', ' overflow="visible" aria-hidden="true"')
        .split("\n")
        .map((l) => `    ${l}`)
        .join("\n")}\n  )\n}\n`,
    },
  ]

  const controls = (
    <>
      <Section
        title="Type"
        action={
          <Button variant="ghost" size="xs" onClick={() => set({ seed: randomSeed() })}>
            <DicesIcon />
            Variant
          </Button>
        }
      >
        <PresetGrid
          items={KINDS}
          cols={3}
          active={s.kind}
          onPick={(k) => set({ kind: k.id })}
          render={(k) => <img src={svgDataUri(buildSvg({ ...s, kind: k.id, color: "#ec4899" }).svg.replace(/ class="(draw|grow)"/g, ""))} alt="" className="h-1/2 w-4/5 object-contain" />}
        />
      </Section>
      <Section title="Shape">
        {!["circle", "highlight"].includes(s.kind) && (
          <>
            <SliderField label="Amplitude" value={s.amplitude} min={0.05} max={1} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(amplitude) => set({ amplitude })} />
            {["squiggle", "zigzag", "loops", "dashes"].includes(s.kind) && <SliderField label="Frequency" value={s.frequency} min={1} max={20} unit="" onChange={(frequency) => set({ frequency })} />}
          </>
        )}
        {s.kind !== "highlight" && <SliderField label="Thickness" value={s.stroke} min={1} max={14} onChange={(stroke) => set({ stroke })} />}
        <SliderField label="Hand-drawn roughness" value={s.roughness} min={0} max={1} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(roughness) => set({ roughness })} />
        <Field label="Color">
          <ColorInput value={s.color} compact onChange={(color) => set({ color })} />
        </Field>
      </Section>
      <Section title="Animation">
        <div className="flex items-center justify-between">
          <Label htmlFor="draw" className="text-xs">
            Draw on appear
          </Label>
          <Switch id="draw" size="sm" checked={s.animate} onCheckedChange={(animate) => set({ animate })} />
        </div>
        {s.animate && (
          <>
            <SliderField label="Duration" value={s.duration} min={0.2} max={4} step={0.1} unit="s" onChange={(duration) => set({ duration })} />
            <Button variant="outline" size="xs" onClick={() => setReplay((r) => r + 1)}>
              <PlayIcon />
              Repeat
            </Button>
          </>
        )}
      </Section>
      <Section title="Preview">
        <Field label="Word">
          <input
            value={s.word}
            onChange={(e) => set({ word: e.target.value })}
            className="h-7 rounded-md border bg-transparent px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        </Field>
      </Section>
    </>
  )

  const posStyle: React.CSSProperties =
    place === "under"
      ? { left: 0, top: "88%", width: "100%", height: `${((H / W) * 100).toFixed(1)}%`, minHeight: "0.35em" }
      : place === "around"
        ? { left: "-12%", top: "-28%", width: "124%", height: "156%" }
        : { left: "-4%", top: "5%", width: "108%", height: "95%", zIndex: -1 }

  return (
    <ToolLayout controls={controls} outputs={outputs}>
      <style>{s.animate ? animCss(s.duration).replace(/(^|\n)([.@])/g, "$1.line-preview $2").replace(/\.line-preview @keyframes/g, "@keyframes") : ""}</style>
      <div className="line-preview flex h-full min-h-[460px] flex-col items-center justify-center gap-16 bg-background p-10 text-center">
        <h2 key={replay} className="max-w-3xl text-4xl leading-tight font-bold tracking-tight md:text-6xl">
          Make{" "}
          <span className="relative inline-block isolate">
            {s.word}
            <span className="pointer-events-none absolute" style={posStyle} dangerouslySetInnerHTML={{ __html: svg.replace("<svg ", '<svg width="100%" height="100%" ') }} />
          </span>{" "}
          noticeable
        </h2>
        <p key={`p${replay}`} className="text-lg text-muted-foreground">
          Underlines, outlines and markers for{" "}
          <span className="relative inline-block isolate font-medium text-foreground">
            landing pages
            <span className="pointer-events-none absolute" style={posStyle} dangerouslySetInnerHTML={{ __html: svg.replace("<svg ", '<svg width="100%" height="100%" ') }} />
          </span>
        </p>
      </div>
    </ToolLayout>
  )
}
