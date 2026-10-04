import { useEffect, useRef, useState } from "react"
import { FilmIcon, ImagesIcon, PlusIcon, SparklesIcon, XIcon } from "lucide-react"
import { copyText } from "@/lib/clipboard"
import { usePersistent } from "@/lib/use-persistent"
import { cn } from "@/lib/utils"
import { Field, NumberInput, Section, SliderField } from "@/components/fields"
import { ToolLayout } from "@/components/tools/tool-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

type Source = "demo" | "video" | "frames"

interface Caption {
  id: string
  at: number
  text: string
}

interface State {
  source: Source
  length: number
  smoothing: number
  fit: "cover" | "contain"
  dim: number
  captions: Caption[]
  videoName: string
  framePattern: string
  frameCount: number
}

const DEFAULTS: State = {
  source: "demo",
  length: 400,
  smoothing: 0.12,
  fit: "cover",
  dim: 0.25,
  captions: [
    { id: "a", at: 12, text: "Scroll drives time" },
    { id: "b", at: 50, text: "Every frame — on scroll" },
    { id: "c", at: 88, text: "Like on Apple sites" },
  ],
  videoName: "video.mp4",
  framePattern: "frames/frame-{i}.webp",
  frameCount: 120,
}

const FFMPEG_VIDEO = "ffmpeg -i input.mp4 -c:v libx264 -g 1 -crf 22 -an -movflags faststart video.mp4"
const FFMPEG_FRAMES = "ffmpeg -i input.mp4 -vf fps=30,scale=1600:-1 frames/frame-%04d.webp"

function drawDemo(ctx: CanvasRenderingContext2D, w: number, h: number, p: number) {
  const hue = 250 + p * 120
  const g = ctx.createLinearGradient(0, 0, w, h)
  g.addColorStop(0, `hsl(${hue} 70% 18%)`)
  g.addColorStop(1, `hsl(${hue + 60} 80% 35%)`)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  const cx = w / 2
  const cy = h / 2
  const size = Math.min(w, h) * (0.18 + p * 0.12)
  const ay = p * Math.PI * 2.2
  const ax = p * Math.PI * 1.1 + 0.4
  const verts = [-1, 1].flatMap((x) => [-1, 1].flatMap((y) => [-1, 1].map((z) => [x, y, z])))
  const proj = verts.map(([x, y, z]) => {
    const x1 = x * Math.cos(ay) - z * Math.sin(ay)
    const z1 = x * Math.sin(ay) + z * Math.cos(ay)
    const y1 = y * Math.cos(ax) - z1 * Math.sin(ax)
    const z2 = y * Math.sin(ax) + z1 * Math.cos(ax)
    const k = 3 / (z2 + 4)
    return [cx + x1 * size * k * 1.6, cy + y1 * size * k * 1.6]
  })
  ctx.lineWidth = Math.max(2, size / 40)
  ctx.strokeStyle = `hsl(${hue + 120} 90% 75%)`
  ctx.shadowColor = ctx.strokeStyle
  ctx.shadowBlur = 24
  for (let i = 0; i < 8; i++) {
    for (let j = i + 1; j < 8; j++) {
      const d = verts[i].reduce((s, v, k) => s + (v !== verts[j][k] ? 1 : 0), 0)
      if (d !== 1) continue
      ctx.beginPath()
      ctx.moveTo(proj[i][0], proj[i][1])
      ctx.lineTo(proj[j][0], proj[j][1])
      ctx.stroke()
    }
  }
  ctx.shadowBlur = 0
  for (let r = 0; r < 3; r++) {
    ctx.beginPath()
    ctx.strokeStyle = `hsla(${hue + r * 40} 90% 70% / ${0.25 - r * 0.06})`
    ctx.lineWidth = 1.5
    ctx.ellipse(cx, cy, size * (2 + r * 0.6), size * (0.6 + r * 0.2), p * Math.PI + r, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.fillStyle = "rgba(255,255,255,0.55)"
  ctx.font = `500 ${Math.max(12, w / 70)}px ui-monospace, monospace`
  ctx.fillText(`frame ${String(Math.round(p * 119) + 1).padStart(3, "0")} / 120`, 24, h - 24)
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number, fit: State["fit"]) {
  const s = fit === "cover" ? Math.max(w / img.naturalWidth, h / img.naturalHeight) : Math.min(w / img.naturalWidth, h / img.naturalHeight)
  const dw = img.naturalWidth * s
  const dh = img.naturalHeight * s
  ctx.fillStyle = "#000"
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh)
}

function exportCode(s: State) {
  const caps = [...s.captions].sort((a, b) => a.at - b.at)
  const capHtml = caps.map((c) => `    <p class="scroll-video__caption" data-at="${(c.at / 100).toFixed(2)}">${c.text}</p>`).join("\n")
  const media =
    s.source === "frames"
      ? `    <canvas class="scroll-video__media"></canvas>`
      : `    <video class="scroll-video__media" src="${s.videoName}" muted playsinline preload="auto"></video>`
  const css = `<style>
  .scroll-video {
    position: relative;
    height: ${s.length}vh;
  }

  .scroll-video__sticky {
    position: sticky;
    top: 0;
    height: 100vh;
    overflow: hidden;
    background: #000;
  }

  .scroll-video__media {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: ${s.fit};
  }
${
  s.dim > 0
    ? `
  .scroll-video__sticky::after {
    content: "";
    position: absolute;
    inset: 0;
    background: rgb(0 0 0 / ${s.dim});
    pointer-events: none;
  }
`
    : ""
}
  .scroll-video__caption {
    position: absolute;
    z-index: 1;
    left: 50%;
    bottom: 14%;
    max-width: 80%;
    margin: 0;
    color: #fff;
    font: 600 clamp(24px, 4vw, 56px) / 1.1 system-ui, sans-serif;
    text-align: center;
    opacity: 0;
    transform: translate(-50%, 24px);
    transition: opacity 0.4s, transform 0.4s;
  }

  .scroll-video__caption.is-visible {
    opacity: 1;
    transform: translate(-50%, 0);
  }
</style>`
  const progressFn = `  const progress = () => {
    const r = section.getBoundingClientRect();
    const total = r.height - innerHeight;
    return Math.min(1, Math.max(0, -r.top / total));
  };
  const showCaptions = (p) => captions.forEach((c) => c.classList.toggle("is-visible", Math.abs(p - Number(c.dataset.at)) < 0.1));`
  const script =
    s.source === "frames"
      ? `<script>
(() => {
  const section = document.querySelector(".scroll-video");
  const canvas = section.querySelector("canvas");
  const ctx = canvas.getContext("2d");
  const captions = [...section.querySelectorAll("[data-at]")];
  const count = ${s.frameCount};
  const src = (i) => "${s.framePattern}".replace("{i}", String(i + 1).padStart(4, "0"));
  const frames = Array.from({ length: count }, (_, i) => Object.assign(new Image(), { src: src(i) }));
  let current = 0;
  let drawn = -1;
${progressFn}
  const draw = (i) => {
    const img = frames[i];
    if (!img.complete || !img.naturalWidth) return;
    const w = (canvas.width = canvas.clientWidth * devicePixelRatio);
    const h = (canvas.height = canvas.clientHeight * devicePixelRatio);
    const s = Math.${s.fit === "cover" ? "max" : "min"}(w / img.naturalWidth, h / img.naturalHeight);
    ctx.drawImage(img, (w - img.naturalWidth * s) / 2, (h - img.naturalHeight * s) / 2, img.naturalWidth * s, img.naturalHeight * s);
    drawn = i;
  };
  const tick = () => {
    const p = progress();
    current += (p - current) * ${s.smoothing};
    const i = Math.round(current * (count - 1));
    if (i !== drawn) draw(i);
    showCaptions(p);
    requestAnimationFrame(tick);
  };
  frames[0].onload = () => draw(0);
  tick();
})();
</script>`
      : `<script>
(() => {
  const section = document.querySelector(".scroll-video");
  const video = section.querySelector("video");
  const captions = [...section.querySelectorAll("[data-at]")];
  let current = 0;
${progressFn}
  const tick = () => {
    const p = progress();
    if (video.duration) {
      const target = p * video.duration;
      current += (target - current) * ${s.smoothing};
      if (Math.abs(target - current) > 0.001) video.currentTime = current;
    }
    showCaptions(p);
    requestAnimationFrame(tick);
  };
  video.pause();
  tick();
})();
</script>`
  const html = `<section class="scroll-video">\n  <div class="scroll-video__sticky">\n${media}\n${capHtml}\n  </div>\n</section>\n\n${css}\n\n${script}\n`

  const react = `import { useEffect, useRef } from "react"

const CAPTIONS = ${JSON.stringify(caps.map((c) => ({ at: c.at / 100, text: c.text })), null, 2)}

export function ScrollVideo({ src = "${s.videoName}", length = "${s.length}vh", smoothing = ${s.smoothing} }) {
  const sectionRef = useRef(null)
  const videoRef = useRef(null)
  const captionRefs = useRef([])

  useEffect(() => {
    let raf = 0
    let current = 0
    const tick = () => {
      const section = sectionRef.current
      const video = videoRef.current
      const r = section.getBoundingClientRect()
      const p = Math.min(1, Math.max(0, -r.top / (r.height - innerHeight)))
      if (video.duration) {
        const target = p * video.duration
        current += (target - current) * smoothing
        if (Math.abs(target - current) > 0.001) video.currentTime = current
      }
      captionRefs.current.forEach((el, i) => el?.classList.toggle("is-visible", Math.abs(p - CAPTIONS[i].at) < 0.1))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [smoothing])

  return (
    <section ref={sectionRef} className="scroll-video" style={{ height: length }}>
      <div className="scroll-video__sticky">
        <video ref={videoRef} className="scroll-video__media" src={src} muted playsInline preload="auto" />
        {CAPTIONS.map((c, i) => (
          <p key={c.text} ref={(el) => (captionRefs.current[i] = el)} className="scroll-video__caption">
            {c.text}
          </p>
        ))}
      </div>
    </section>
  )
}
`
  return { html, react, css: css.replace(/^<style>\n|<\/style>$/g, "").replace(/^ {2}/gm, "") }
}

export function ScrollVideoTool() {
  const [s, set] = usePersistent<State>("lf-tool-scroll", DEFAULTS)
  const [video, setVideo] = useState<string | null>(null)
  const [frames, setFrames] = useState<HTMLImageElement[]>([])
  const [viewH, setViewH] = useState(600)
  const [progress, setProgress] = useState(0)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const sectionRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const state = useRef({ target: 0, current: 0 })
  const source: Source = s.source === "video" && !video ? "demo" : s.source === "frames" && frames.length === 0 ? "demo" : s.source

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setViewH(el.clientHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const scroller = scrollerRef.current
      const section = sectionRef.current
      if (!scroller || !section) return
      const total = section.offsetHeight - scroller.clientHeight
      const p = Math.min(1, Math.max(0, (scroller.scrollTop - section.offsetTop) / (total || 1)))
      const st = state.current
      st.target = p
      st.current += (st.target - st.current) * s.smoothing
      setProgress((old) => (Math.abs(old - p) > 0.002 ? p : old))
      const canvas = canvasRef.current
      if (source === "video") {
        const v = videoRef.current
        if (v?.duration && Math.abs(v.currentTime - st.current * v.duration) > 0.01) v.currentTime = st.current * v.duration
        return
      }
      if (!canvas) return
      const w = canvas.clientWidth * devicePixelRatio
      const h = canvas.clientHeight * devicePixelRatio
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      if (source === "frames") drawCover(ctx, frames[Math.round(st.current * (frames.length - 1))], w, h, s.fit)
      else drawDemo(ctx, w, h, st.current)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [source, frames, s.smoothing, s.fit])

  const loadFrames = (files: FileList | null) => {
    if (!files?.length) return
    const list = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
    const imgs = list.map((f) => Object.assign(new Image(), { src: URL.createObjectURL(f) }))
    setFrames(imgs)
    set({ source: "frames", frameCount: imgs.length })
  }

  const code = exportCode(s)
  const outputs = [
    { id: "html", label: "HTML + JS", lang: "html", file: "scroll-video.html", code: code.html },
    { id: "react", label: "React", lang: "jsx", file: "ScrollVideo.jsx", code: code.react },
    { id: "css", label: "CSS", lang: "css", file: "scroll-video.css", code: code.css },
  ]

  const controls = (
    <>
      <Section title="Source">
        <ToggleGroup variant="outline" size="sm" spacing={0} className="w-full" value={[s.source]} onValueChange={(v) => v[0] && set({ source: v[0] as Source })}>
          <ToggleGroupItem value="demo" className="flex-1 text-xs">
            <SparklesIcon />
            Demo
          </ToggleGroupItem>
          <ToggleGroupItem value="video" className="flex-1 text-xs">
            <FilmIcon />
            Video
          </ToggleGroupItem>
          <ToggleGroupItem value="frames" className="flex-1 text-xs">
            <ImagesIcon />
            Frames
          </ToggleGroupItem>
        </ToggleGroup>
        {s.source === "video" && (
          <>
            <label className="flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed text-xs text-muted-foreground hover:bg-muted/50">
              <FilmIcon className="size-4" />
              {video ? "Replace video" : "Upload video"}
              <input
                type="file"
                accept="video/*"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (!f) return
                  setVideo(URL.createObjectURL(f))
                  set({ videoName: f.name })
                }}
              />
            </label>
            <p className="text-[11px] leading-snug text-muted-foreground">For smooth scrubbing, re-encode the video:</p>
            <button onClick={() => copyText(FFMPEG_VIDEO, "Command")} className="rounded-md bg-muted p-2 text-left font-mono text-[10px] break-all hover:bg-muted/70">
              {FFMPEG_VIDEO}
            </button>
          </>
        )}
        {s.source === "frames" && (
          <>
            <label className="flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed text-xs text-muted-foreground hover:bg-muted/50">
              <ImagesIcon className="size-4" />
              {frames.length ? `Frames: ${frames.length} — replace` : "Choose frames (multiple files)"}
              <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => loadFrames(e.target.files)} />
            </label>
            <p className="text-[11px] leading-snug text-muted-foreground">Extract frames from video:</p>
            <button onClick={() => copyText(FFMPEG_FRAMES, "Command")} className="rounded-md bg-muted p-2 text-left font-mono text-[10px] break-all hover:bg-muted/70">
              {FFMPEG_FRAMES}
            </button>
            <Field label="Path template in export">
              <Input value={s.framePattern} onChange={(e) => set({ framePattern: e.target.value })} className="h-7 font-mono text-xs" />
            </Field>
            <Field label="Frame count">
              <NumberInput value={s.frameCount} min={2} max={2000} onChange={(frameCount) => set({ frameCount })} />
            </Field>
          </>
        )}
        {source === "demo" && s.source !== "demo" && <p className="text-[11px] text-amber-600">No file selected — demo.</p>}
      </Section>
      <Section title="Behavior">
        <SliderField label="Scroll length" value={s.length} min={150} max={1000} step={10} unit="vh" onChange={(length) => set({ length })} />
        <SliderField label="Smoothing" value={s.smoothing} min={0.02} max={1} step={0.01} format={(v) => (v >= 1 ? "off" : v.toFixed(2))} onChange={(smoothing) => set({ smoothing })} />
        <ToggleGroup variant="outline" size="sm" spacing={0} className="w-full" value={[s.fit]} onValueChange={(v) => v[0] && set({ fit: v[0] as State["fit"] })}>
          <ToggleGroupItem value="cover" className="flex-1 font-mono text-xs">
            cover
          </ToggleGroupItem>
          <ToggleGroupItem value="contain" className="flex-1 font-mono text-xs">
            contain
          </ToggleGroupItem>
        </ToggleGroup>
        <SliderField label="Dimming" value={s.dim} min={0} max={0.8} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(dim) => set({ dim })} />
      </Section>
      <Section
        title="Captions"
        action={
          <Button variant="ghost" size="xs" onClick={() => set({ captions: [...s.captions, { id: Math.random().toString(36).slice(2, 7), at: 50, text: "New caption" }] })}>
            <PlusIcon />
          </Button>
        }
      >
        {s.captions.map((c) => (
          <div key={c.id} className="flex flex-col gap-1.5 rounded-lg border p-2">
            <div className="flex items-center gap-1">
              <Input value={c.text} onChange={(e) => set({ captions: s.captions.map((x) => (x.id === c.id ? { ...x, text: e.target.value } : x)) })} className="h-7 text-xs" />
              <Button variant="ghost" size="icon-xs" onClick={() => set({ captions: s.captions.filter((x) => x.id !== c.id) })} aria-label="Delete">
                <XIcon />
              </Button>
            </div>
            <SliderField label="Position" value={c.at} min={0} max={100} unit="%" onChange={(at) => set({ captions: s.captions.map((x) => (x.id === c.id ? { ...x, at } : x)) })} />
          </div>
        ))}
      </Section>
    </>
  )

  return (
    <ToolLayout controls={controls} outputs={outputs}>
      <div ref={scrollerRef} className="absolute inset-0 overflow-y-auto bg-black text-white">
        <div className="flex flex-col items-center justify-center gap-2 bg-neutral-950 text-center" style={{ height: viewH * 0.6 }}>
          <p className="text-2xl font-semibold">Scroll down</p>
          <p className="animate-bounce text-sm text-white/60">↓</p>
        </div>
        <div ref={sectionRef} className="relative" style={{ height: (viewH * s.length) / 100 }}>
          <div className="sticky top-0 overflow-hidden" style={{ height: viewH }}>
            {source === "video" ? (
              <video ref={videoRef} src={video ?? undefined} muted playsInline preload="auto" className="block size-full" style={{ objectFit: s.fit }} />
            ) : (
              <canvas ref={canvasRef} className="block size-full" />
            )}
            {s.dim > 0 && <div className="pointer-events-none absolute inset-0" style={{ background: `rgb(0 0 0 / ${s.dim})` }} />}
            {s.captions.map((c) => {
              const d = Math.abs(progress * 100 - c.at)
              const visible = d < 10
              return (
                <p
                  key={c.id}
                  className={cn("absolute bottom-[14%] left-1/2 m-0 max-w-[80%] text-center text-2xl leading-tight font-semibold transition-all duration-500 md:text-4xl", visible ? "opacity-100" : "opacity-0")}
                  style={{ transform: `translate(-50%, ${visible ? 0 : 24}px)` }}
                >
                  {c.text}
                </p>
              )
            })}
            <div className="absolute top-4 right-4 bottom-4 w-1 overflow-hidden rounded-full bg-white/15">
              <div className="w-full rounded-full bg-white" style={{ height: `${progress * 100}%` }} />
            </div>
            <span className="absolute top-4 left-4 rounded bg-black/50 px-2 py-0.5 font-mono text-xs">{Math.round(progress * 100)}%</span>
          </div>
        </div>
        <div className="flex items-center justify-center bg-neutral-950 text-white/60" style={{ height: viewH * 0.6 }}>
          Section end
        </div>
      </div>
    </ToolLayout>
  )
}
