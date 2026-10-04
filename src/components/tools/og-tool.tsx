import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { ImageDownIcon, ImageUpIcon, Loader2Icon } from "lucide-react"
import { toPng } from "html-to-image"
import { toast } from "sonner"
import { downloadUrl } from "@/lib/clipboard"
import { MESH_PRESETS, presetPoints } from "@/lib/mesh"
import { usePersistent } from "@/lib/use-persistent"
import { cn } from "@/lib/utils"
import { ColorInput } from "@/components/color-input"
import { Field, Section, SliderField } from "@/components/fields"
import { ToolLayout } from "@/components/tools/tool-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

type Template = "classic" | "article" | "minimal" | "center" | "quote" | "split"
type Bg = "gradient" | "mesh" | "solid" | "image"

interface State {
  template: Template
  eyebrow: string
  title: string
  subtitle: string
  site: string
  author: string
  emoji: string
  bg: Bg
  c1: string
  c2: string
  angle: number
  mesh: string
  text: string
  accent: string
  overlay: number
}

const DEFAULTS: State = {
  template: "classic",
  eyebrow: "Guide",
  title: "How to build a design system in a weekend",
  subtitle: "Palettes, grids and tokens — with ready-to-use code",
  site: "layoutforge.app",
  author: "Anna Smith",
  emoji: "✨",
  bg: "mesh",
  c1: "#4f46e5",
  c2: "#db2777",
  angle: 135,
  mesh: "cyber",
  text: "#ffffff",
  accent: "#fde047",
  overlay: 0.45,
}

const TEMPLATES: { id: Template; name: string }[] = [
  { id: "classic", name: "Classic" },
  { id: "article", name: "Article" },
  { id: "split", name: "Split" },
  { id: "center", name: "Center" },
  { id: "minimal", name: "Minimal" },
  { id: "quote", name: "Quote" },
]

interface N {
  tag: "div" | "img"
  style: Record<string, string | number>
  text?: string
  src?: string
  children?: N[]
}

const div = (style: N["style"], children: (N | string)[] = []): N => {
  const kids = children.filter((c) => c !== "")
  if (kids.length === 1 && typeof kids[0] === "string") return { tag: "div", style: { display: "flex", ...style }, text: kids[0] }
  return { tag: "div", style: { display: "flex", ...style }, children: kids.map((c) => (typeof c === "string" ? { tag: "div", style: { display: "flex" }, text: c } : c)) }
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("")

function background(s: State, image: string | null, forExport: boolean): N["style"] {
  if (s.bg === "solid") return { backgroundColor: s.c1 }
  if (s.bg === "gradient") return { backgroundImage: `linear-gradient(${s.angle}deg, ${s.c1}, ${s.c2})` }
  if (s.bg === "image") {
    const url = forExport ? "https://example.com/cover.jpg" : image
    return url
      ? { backgroundColor: "#000", backgroundImage: `linear-gradient(rgba(0,0,0,${s.overlay}), rgba(0,0,0,${s.overlay})), url(${url})`, backgroundSize: "cover", backgroundPosition: "center" }
      : { backgroundColor: s.c1 }
  }
  const p = MESH_PRESETS.find((m) => m.id === s.mesh) ?? MESH_PRESETS[0]
  const pts = presetPoints(p.colors, 3)
  return { backgroundColor: p.base, backgroundImage: pts.map((pt) => `radial-gradient(circle at ${pt.x}% ${pt.y}%, ${pt.color} 0%, transparent ${pt.size}%)`).join(", ") }
}

function titleSize(title: string, base: number) {
  return Math.round(Math.max(base * 0.58, Math.min(base, base - (title.length - 32) * 0.7)))
}

function build(s: State, image: string | null, forExport: boolean): N {
  const bg = background(s, image, forExport)
  const root = { width: 1200, height: 630, fontFamily: "Geist, Inter, sans-serif", color: s.text, ...bg }
  const pill = s.eyebrow ? div({ alignSelf: "flex-start", padding: "8px 18px", borderRadius: 999, backgroundColor: s.accent, color: "#0b0b0f", fontSize: 24, fontWeight: 700 }, [s.eyebrow]) : ""
  const logo = div({ alignItems: "center", gap: 14, fontSize: 26, fontWeight: 600 }, [
    div({ width: 44, height: 44, borderRadius: 12, backgroundColor: s.accent, color: "#0b0b0f", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800 }, [initials(s.site) || "•"]),
    s.site,
  ])
  const avatar = div({ alignItems: "center", gap: 16, fontSize: 26 }, [
    div({ width: 56, height: 56, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700 }, [initials(s.author)]),
    div({ flexDirection: "column" }, [div({ fontWeight: 600 }, [s.author]), div({ fontSize: 20, opacity: 0.7 }, [s.site])]),
  ])
  const visual: N =
    image && !forExport
      ? { tag: "img", src: image, style: { width: "100%", height: "100%", objectFit: "cover", borderRadius: 28 } }
      : forExport && image
        ? { tag: "img", src: "https://example.com/cover.jpg", style: { width: "100%", height: "100%", objectFit: "cover", borderRadius: 28 } }
        : div({ width: "100%", height: "100%", borderRadius: 28, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center", fontSize: 180 }, [s.emoji])

  switch (s.template) {
    case "classic":
      return div({ ...root, flexDirection: "column", justifyContent: "space-between", padding: 72 }, [
        logo,
        div({ flexDirection: "column", gap: 24 }, [pill, div({ fontSize: titleSize(s.title, 76), fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.02em" }, [s.title]), s.subtitle ? div({ fontSize: 30, opacity: 0.8, lineHeight: 1.3 }, [s.subtitle]) : ""]),
        div({ alignItems: "center", justifyContent: "space-between" }, [avatar, div({ fontSize: 40 }, [s.emoji])]),
      ])
    case "article":
      return div({ ...root, padding: 64, gap: 56, alignItems: "stretch" }, [
        div({ flexDirection: "column", justifyContent: "space-between", width: 640 }, [
          div({ flexDirection: "column", gap: 22 }, [pill, div({ fontSize: titleSize(s.title, 64), fontWeight: 800, lineHeight: 1.08, letterSpacing: "-0.02em" }, [s.title]), s.subtitle ? div({ fontSize: 26, opacity: 0.8, lineHeight: 1.35 }, [s.subtitle]) : ""]),
          avatar,
        ]),
        div({ flex: 1 }, [visual]),
      ])
    case "split":
      return div({ ...root, padding: 0 }, [
        div({ width: 520, height: 630, padding: 0 }, [image ? { ...visual, style: { ...visual.style, borderRadius: 0 } } : div({ width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.25)", alignItems: "center", justifyContent: "center", fontSize: 200 }, [s.emoji])]),
        div({ flex: 1, flexDirection: "column", justifyContent: "center", gap: 24, padding: 64 }, [pill, div({ fontSize: titleSize(s.title, 60), fontWeight: 800, lineHeight: 1.08 }, [s.title]), s.subtitle ? div({ fontSize: 26, opacity: 0.8, lineHeight: 1.35 }, [s.subtitle]) : "", div({ marginTop: 16, fontSize: 24, opacity: 0.75 }, [s.site])]),
      ])
    case "center":
      return div({ ...root, flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24, padding: 80, textAlign: "center" }, [
        div({ fontSize: 110 }, [s.emoji]),
        div({ fontSize: titleSize(s.title, 80), fontWeight: 900, lineHeight: 1.05, letterSpacing: "-0.03em", textAlign: "center", justifyContent: "center" }, [s.title]),
        s.subtitle ? div({ fontSize: 28, opacity: 0.8, textAlign: "center" }, [s.subtitle]) : "",
        div({ marginTop: 12, fontSize: 24, padding: "8px 20px", borderRadius: 999, border: "2px solid rgba(255,255,255,0.35)" }, [s.site]),
      ])
    case "minimal":
      return div({ ...root, backgroundColor: "#0b0b0f", backgroundImage: "none", padding: 72, flexDirection: "column", justifyContent: "space-between", borderLeft: `18px solid ${s.accent}` }, [
        div({ fontSize: 24, letterSpacing: "0.2em", textTransform: "uppercase", color: s.accent, fontWeight: 700 }, [s.eyebrow || s.site]),
        div({ fontSize: titleSize(s.title, 78), fontWeight: 700, lineHeight: 1.06, letterSpacing: "-0.02em", color: "#ffffff" }, [s.title]),
        div({ justifyContent: "space-between", fontSize: 24, color: "rgba(255,255,255,0.6)" }, [s.site, s.author]),
      ])
    case "quote":
      return div({ ...root, padding: 80, flexDirection: "column", justifyContent: "center", gap: 28 }, [
        div({ fontSize: 180, lineHeight: 0.6, color: s.accent, fontWeight: 900, height: 90 }, ["“"]),
        div({ fontSize: titleSize(s.title, 60), fontWeight: 600, lineHeight: 1.2, letterSpacing: "-0.01em" }, [s.title]),
        avatar,
      ])
  }
}

function render(n: N, key?: number): ReactNode {
  if (n.tag === "img") return <img key={key} src={n.src} alt="" style={n.style as CSSProperties} />
  return (
    <div key={key} style={n.style as CSSProperties}>
      {n.text ?? n.children?.map((c, i) => render(c, i))}
    </div>
  )
}

function toJsx(n: N, depth: number): string {
  const pad = "  ".repeat(depth)
  const style = `{{ ${Object.entries(n.style)
    .map(([k, v]) => `${k}: ${typeof v === "number" ? v : JSON.stringify(v)}`)
    .join(", ")} }}`
  if (n.tag === "img") return `${pad}<img src="${n.src}" style=${style} />`
  if (n.text !== undefined) return `${pad}<div style=${style}>${n.text.replace(/[{}<>]/g, (m) => `{"${m}"}`)}</div>`
  return `${pad}<div style=${style}>\n${(n.children ?? []).map((c) => toJsx(c, depth + 1)).join("\n")}\n${pad}</div>`
}

export function OgTool() {
  const [s, set] = usePersistent<State>("lf-tool-og", DEFAULTS)
  const [image, setImage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [fit, setFit] = useState(0.5)
  const stageRef = useRef<HTMLDivElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setFit(Math.min(1, (el.clientWidth - 48) / 1200)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const tree = build(s, image, false)
  const jsxTree = build(s, image, true)

  const exportPng = async (ratio: number) => {
    if (!stageRef.current) return
    setBusy(true)
    try {
      const url = await toPng(stageRef.current, { pixelRatio: ratio, width: 1200, height: 630, style: { transform: "none" }, cacheBust: true })
      downloadUrl(`og-image${ratio > 1 ? "@2x" : ""}.png`, url)
    } catch (e) {
      toast.error("Could not render PNG", { description: e instanceof Error ? e.message : undefined })
    } finally {
      setBusy(false)
    }
  }

  const outputs = [
    {
      id: "meta",
      label: "Meta tags",
      lang: "html",
      file: "head.html",
      code: `<meta property="og:title" content="${s.title}" />\n<meta property="og:description" content="${s.subtitle}" />\n<meta property="og:image" content="https://${s.site}/og-image.png" />\n<meta property="og:image:width" content="1200" />\n<meta property="og:image:height" content="630" />\n<meta property="og:type" content="article" />\n<meta name="twitter:card" content="summary_large_image" />\n<meta name="twitter:title" content="${s.title}" />\n<meta name="twitter:description" content="${s.subtitle}" />\n<meta name="twitter:image" content="https://${s.site}/og-image.png" />\n`,
    },
    {
      id: "next",
      label: "next/og",
      lang: "jsx",
      file: "opengraph-image.jsx",
      code: `import { ImageResponse } from "next/og"\n\nexport const size = { width: 1200, height: 630 }\nexport const contentType = "image/png"\n\nexport default async function Image() {\n  return new ImageResponse(\n    (\n${toJsx(jsxTree, 3)}\n    ),\n    size,\n  )\n}\n`,
    },
  ]

  const controls = (
    <>
      <Section title="Template">
        <div className="grid grid-cols-3 gap-1.5">
          {TEMPLATES.map((t) => (
            <Button key={t.id} size="sm" variant={s.template === t.id ? "secondary" : "outline"} className={cn(s.template === t.id && "ring-1 ring-primary/40")} onClick={() => set({ template: t.id })}>
              {t.name}
            </Button>
          ))}
        </div>
      </Section>
      <Section title="Text">
        <Field label="Eyebrow">
          <Input value={s.eyebrow} onChange={(e) => set({ eyebrow: e.target.value })} className="h-8" />
        </Field>
        <Field label="Heading" hint={`${s.title.length} chars`}>
          <Textarea value={s.title} onChange={(e) => set({ title: e.target.value })} className="min-h-16 text-sm" />
        </Field>
        <Field label="Subheading">
          <Textarea value={s.subtitle} onChange={(e) => set({ subtitle: e.target.value })} className="min-h-14 text-sm" />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Site">
            <Input value={s.site} onChange={(e) => set({ site: e.target.value })} className="h-8" />
          </Field>
          <Field label="Author">
            <Input value={s.author} onChange={(e) => set({ author: e.target.value })} className="h-8" />
          </Field>
        </div>
        <Field label="Emoji">
          <Input value={s.emoji} onChange={(e) => set({ emoji: e.target.value })} className="h-8" />
        </Field>
        <label className="flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed text-xs text-muted-foreground hover:bg-muted/50">
          <ImageUpIcon className="size-4" />
          {image ? "Replace image" : "Image (article / split / background)"}
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && setImage(URL.createObjectURL(e.target.files[0]))} />
        </label>
      </Section>
      <Section title="Background and colors">
        <ToggleGroup variant="outline" size="sm" spacing={0} className="grid w-full grid-cols-4" value={[s.bg]} onValueChange={(v) => v[0] && set({ bg: v[0] as Bg })}>
          <ToggleGroupItem value="mesh" className="text-xs">
            Mesh
          </ToggleGroupItem>
          <ToggleGroupItem value="gradient" className="text-xs">
            Gradient
          </ToggleGroupItem>
          <ToggleGroupItem value="solid" className="text-xs">
            Color
          </ToggleGroupItem>
          <ToggleGroupItem value="image" className="text-xs">
            Photo
          </ToggleGroupItem>
        </ToggleGroup>
        {s.bg === "mesh" && (
          <div className="flex flex-wrap gap-1">
            {MESH_PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => set({ mesh: p.id })}
                title={p.name}
                className="size-6 rounded-full"
                style={{ background: `linear-gradient(135deg, ${p.colors[0]}, ${p.colors[1]})`, boxShadow: s.mesh === p.id ? "0 0 0 2px var(--foreground)" : undefined }}
              />
            ))}
          </div>
        )}
        {(s.bg === "gradient" || s.bg === "solid") && (
          <div className="grid grid-cols-2 gap-2">
            <ColorInput value={s.c1} compact onChange={(c1) => set({ c1 })} />
            {s.bg === "gradient" && <ColorInput value={s.c2} compact onChange={(c2) => set({ c2 })} />}
          </div>
        )}
        {s.bg === "gradient" && <SliderField label="Angle" value={s.angle} min={0} max={360} unit="°" onChange={(angle) => set({ angle })} />}
        {s.bg === "image" && <SliderField label="Dimming" value={s.overlay} min={0} max={0.9} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(overlay) => set({ overlay })} />}
        <div className="grid grid-cols-2 gap-2">
          <Field label="Text">
            <ColorInput value={s.text} compact onChange={(text) => set({ text })} />
          </Field>
          <Field label="Accent">
            <ColorInput value={s.accent} compact onChange={(accent) => set({ accent })} />
          </Field>
        </div>
      </Section>
    </>
  )

  return (
    <ToolLayout
      controls={controls}
      outputs={outputs}
      footer={
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" onClick={() => exportPng(1)} disabled={busy}>
            {busy ? <Loader2Icon className="animate-spin" /> : <ImageDownIcon />}
            PNG 1200×630
          </Button>
          <Button size="sm" variant="outline" onClick={() => exportPng(2)} disabled={busy}>
            @2x
          </Button>
        </div>
      }
    >
      <div ref={boxRef} className="flex min-h-full flex-col items-center justify-center gap-6 p-6">
        <div className="overflow-hidden rounded-xl shadow-2xl ring-1 ring-foreground/10" style={{ width: 1200 * fit, height: 630 * fit }}>
          <div ref={stageRef} style={{ width: 1200, height: 630, transform: `scale(${fit})`, transformOrigin: "0 0" }}>
            {render(tree)}
          </div>
        </div>
        <div className="flex w-full max-w-xl flex-col overflow-hidden rounded-xl border bg-background shadow-sm">
          <div className="aspect-[1200/630] w-full overflow-hidden">
            <div style={{ width: 1200, height: 630, transform: `scale(${Math.min(576, 1200 * fit) / 1200})`, transformOrigin: "0 0" }}>{render(tree)}</div>
          </div>
          <div className="flex flex-col gap-0.5 border-t px-3 py-2">
            <span className="text-[11px] tracking-wide text-muted-foreground uppercase">{s.site}</span>
            <span className="line-clamp-1 text-sm font-semibold">{s.title}</span>
            <span className="line-clamp-1 text-xs text-muted-foreground">{s.subtitle}</span>
          </div>
        </div>
      </div>
    </ToolLayout>
  )
}
