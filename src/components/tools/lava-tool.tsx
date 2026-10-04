import { useMemo } from "react"
import { DicesIcon, PlusIcon, XIcon } from "lucide-react"
import { randomSeed, rng } from "@/lib/random"
import { usePersistent } from "@/lib/use-persistent"
import { ColorInput } from "@/components/color-input"
import { Field, Section, SliderField } from "@/components/fields"
import { HtmlPreview } from "@/components/tools/html-preview"
import { ToolLayout } from "@/components/tools/tool-layout"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

interface State {
  count: number
  minSize: number
  maxSize: number
  speed: number
  goo: number
  colors: string[]
  bg1: string
  bg2: string
  cursor: boolean
  cursorSize: number
  seed: number
}

const DEFAULTS: State = {
  count: 8,
  minSize: 14,
  maxSize: 30,
  speed: 1,
  goo: 14,
  colors: ["#f472b6", "#fb923c", "#facc15"],
  bg1: "#3b0764",
  bg2: "#7c1d6f",
  cursor: true,
  cursorSize: 16,
  seed: 5,
}

const PRESETS: { id: string; name: string; colors: string[]; bg1: string; bg2: string }[] = [
  { id: "classic", name: "Classic", colors: ["#f472b6", "#fb923c", "#facc15"], bg1: "#3b0764", bg2: "#7c1d6f" },
  { id: "ocean", name: "Ocean", colors: ["#22d3ee", "#38bdf8", "#a5f3fc"], bg1: "#082f49", bg2: "#0c4a6e" },
  { id: "toxic", name: "Acid", colors: ["#a3e635", "#4ade80", "#fde047"], bg1: "#052e16", bg2: "#14532d" },
  { id: "mono", name: "Mono", colors: ["#ffffff", "#e5e5e5"], bg1: "#0a0a0a", bg2: "#262626" },
  { id: "candy", name: "Candy", colors: ["#f9a8d4", "#c4b5fd", "#93c5fd"], bg1: "#4c1d95", bg2: "#1e3a8a" },
]

function build(s: State) {
  const r = rng(s.seed)
  const blobs = Array.from({ length: s.count }, (_, i) => {
    const size = Math.round(s.minSize + r() * (s.maxSize - s.minSize))
    const pt = () => `${Math.round((r() - 0.5) * 70)}cqw, ${Math.round((r() - 0.5) * 70)}cqh`
    return {
      i,
      size,
      left: Math.round(r() * 80 + 5),
      top: Math.round(r() * 80 + 5),
      color: s.colors[i % s.colors.length],
      dur: ((14 + r() * 16) / s.speed).toFixed(1),
      delay: (-r() * 20).toFixed(1),
      a: pt(),
      b: pt(),
      c: pt(),
      s1: (0.8 + r() * 0.5).toFixed(2),
      s2: (0.8 + r() * 0.5).toFixed(2),
    }
  })
  const k = Math.round(s.goo * 1.8 + 8)
  const j = Math.round(k * 0.42)
  const css = `.lava {
  position: relative;
  overflow: hidden;
  width: 100%;
  height: 100%;
  min-height: 320px;
  container-type: size;
  background: linear-gradient(160deg, ${s.bg1}, ${s.bg2});
}

.lava__blobs {
  position: absolute;
  inset: 0;
  filter: url(#lava-goo);
}

.lava__blob {
  position: absolute;
  aspect-ratio: 1;
  border-radius: 50%;
  animation: lava-move 20s ease-in-out infinite alternate;
}

${blobs.map((b) => `.lava__blob:nth-child(${b.i + 1}) {\n  left: ${b.left}%;\n  top: ${b.top}%;\n  width: ${b.size}cqmin;\n  background: ${b.color};\n  animation-name: lava-${b.i};\n  animation-duration: ${b.dur}s;\n  animation-delay: ${b.delay}s;\n}`).join("\n\n")}
${
  s.cursor
    ? `
.lava__cursor {
  position: absolute;
  left: 0;
  top: 0;
  width: ${s.cursorSize}cqmin;
  aspect-ratio: 1;
  border-radius: 50%;
  background: ${s.colors[0]};
  opacity: 0;
  transform: translate(50cqw, 50cqh) translate(-50%, -50%);
  transition: transform 0.35s ease-out, opacity 0.3s;
}

.lava:hover .lava__cursor {
  opacity: 1;
}
`
    : ""
}
${blobs.map((b) => `@keyframes lava-${b.i} {\n  0% {\n    transform: translate(0, 0) scale(1);\n  }\n  33% {\n    transform: translate(${b.a}) scale(${b.s1});\n  }\n  66% {\n    transform: translate(${b.b}) scale(${b.s2});\n  }\n  100% {\n    transform: translate(${b.c}) scale(1);\n  }\n}`).join("\n\n")}

@media (prefers-reduced-motion: reduce) {
  .lava__blob {
    animation: none;
  }
}
`
  const html = `<div class="lava">\n  <svg width="0" height="0" aria-hidden="true" style="position: absolute">\n    <defs>\n      <filter id="lava-goo">\n        <feGaussianBlur in="SourceGraphic" stdDeviation="${s.goo}" result="blur" />\n        <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${k} -${j}" />\n      </filter>\n    </defs>\n  </svg>\n  <div class="lava__blobs">\n${blobs.map(() => '    <div class="lava__blob"></div>').join("\n")}\n${s.cursor ? '    <div class="lava__cursor"></div>\n' : ""}  </div>\n</div>`
  const js = s.cursor
    ? `const lava = document.querySelector(".lava")\nconst cursor = lava.querySelector(".lava__cursor")\n\nlava.addEventListener("pointermove", (e) => {\n  const r = lava.getBoundingClientRect()\n  cursor.style.transform = \`translate(\${e.clientX - r.left}px, \${e.clientY - r.top}px) translate(-50%, -50%)\`\n})\n`
    : undefined
  return { html, css, js }
}

export function LavaTool() {
  const [s, set] = usePersistent<State>("lf-tool-lava", DEFAULTS)
  const { html, css, js } = useMemo(() => build(s), [s])

  const outputs = [
    { id: "html", label: "HTML", lang: "html", file: "lava.html", code: `${html}\n` },
    { id: "css", label: "CSS", lang: "css", file: "lava.css", code: css },
    ...(js ? [{ id: "js", label: "JS", lang: "js", file: "lava.js", code: js }] : []),
  ]

  const controls = (
    <>
      <Section
        title="Templates"
        action={
          <Button variant="ghost" size="xs" onClick={() => set({ seed: randomSeed() })}>
            <DicesIcon />
            New motion
          </Button>
        }
      >
        <div className="grid grid-cols-3 gap-1.5">
          {PRESETS.map((p) => (
            <button key={p.id} onClick={() => set({ colors: p.colors, bg1: p.bg1, bg2: p.bg2 })} className="flex h-12 items-end rounded-lg border p-1.5 text-[10px] font-medium text-white" style={{ background: `radial-gradient(circle at 70% 30%, ${p.colors[0]}, transparent 55%), linear-gradient(160deg, ${p.bg1}, ${p.bg2})` }}>
              {p.name}
            </button>
          ))}
        </div>
      </Section>
      <Section title="Drops">
        <SliderField label="Count" value={s.count} min={2} max={16} unit="" onChange={(count) => set({ count })} />
        <SliderField label="Min size" value={s.minSize} min={6} max={40} unit="%" onChange={(minSize) => set({ minSize, maxSize: Math.max(minSize, s.maxSize) })} />
        <SliderField label="Max size" value={s.maxSize} min={8} max={60} unit="%" onChange={(maxSize) => set({ maxSize, minSize: Math.min(maxSize, s.minSize) })} />
        <SliderField label="Speed" value={s.speed} min={0.2} max={4} step={0.05} format={(v) => `×${v.toFixed(2)}`} onChange={(speed) => set({ speed })} />
        <SliderField label="Viscosity (merge)" value={s.goo} min={4} max={30} onChange={(goo) => set({ goo })} />
      </Section>
      <Section title="Interaction">
        <div className="flex items-center justify-between">
          <Label htmlFor="lv-c" className="text-xs">
            Drop follows cursor (+ JS)
          </Label>
          <Switch id="lv-c" size="sm" checked={s.cursor} onCheckedChange={(cursor) => set({ cursor })} />
        </div>
        {s.cursor && <SliderField label="Drop size" value={s.cursorSize} min={6} max={40} unit="%" onChange={(cursorSize) => set({ cursorSize })} />}
      </Section>
      <Section
        title="Colors"
        action={
          <Button variant="ghost" size="xs" disabled={s.colors.length >= 6} onClick={() => set({ colors: [...s.colors, "#ffffff"] })}>
            <PlusIcon />
          </Button>
        }
      >
        {s.colors.map((c, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className="flex-1">
              <ColorInput value={c} compact onChange={(v) => set({ colors: s.colors.map((x, j) => (j === i ? v : x)) })} />
            </div>
            <Button variant="ghost" size="icon-xs" disabled={s.colors.length <= 1} onClick={() => set({ colors: s.colors.filter((_, j) => j !== i) })} aria-label="Remove">
              <XIcon />
            </Button>
          </div>
        ))}
        <div className="grid grid-cols-2 gap-2">
          <Field label="Top background">
            <ColorInput value={s.bg1} compact onChange={(bg1) => set({ bg1 })} />
          </Field>
          <Field label="Bottom background">
            <ColorInput value={s.bg2} compact onChange={(bg2) => set({ bg2 })} />
          </Field>
        </div>
      </Section>
    </>
  )

  return (
    <ToolLayout controls={controls} outputs={outputs}>
      <HtmlPreview html={html} css={css} js={js} />
    </ToolLayout>
  )
}
