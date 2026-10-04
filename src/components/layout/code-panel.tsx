import { useMemo, useState } from "react"
import { DownloadIcon, Maximize2Icon } from "lucide-react"
import { generateCss, generateDocument, generateHtml, generateJsx } from "@/layout/export"
import { usedBreakpoints } from "@/layout/responsive"
import type { LayoutNode } from "@/layout/types"
import { CodeBlock } from "@/components/code-block"
import { download } from "@/lib/clipboard"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

type Format = "css" | "tailwind"

function useCode(root: LayoutNode, format: Format, areas: boolean, demo: boolean, content: boolean) {
  return useMemo(() => {
    const opts = { areas, demo, content }
    if (format === "tailwind") return [{ code: generateJsx(root, opts), lang: "jsx", file: "Layout.jsx" }]
    return [
      { code: generateCss(root, opts), lang: "css", file: "styles.css" },
      { code: generateHtml(root, opts), lang: "html", file: "index.html" },
    ]
  }, [root, format, areas, demo, content])
}

export function CodePanel({ root, content, onContent }: { root: LayoutNode; content: boolean; onContent: (v: boolean) => void }) {
  const [format, setFormat] = useState<Format>("css")
  const [areas, setAreas] = useState(true)
  const [demo, setDemo] = useState(true)
  const [open, setOpen] = useState(false)
  const blocks = useCode(root, format, areas, demo, content)
  const bps = [...usedBreakpoints(root)].filter((b) => b !== "base")

  const controls = (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <ToggleGroup variant="outline" size="sm" spacing={0} value={[format]} onValueChange={(v) => v[0] && setFormat(v[0] as Format)}>
        <ToggleGroupItem value="css">HTML + CSS</ToggleGroupItem>
        <ToggleGroupItem value="tailwind">Tailwind JSX</ToggleGroupItem>
      </ToggleGroup>
      {format === "css" && (
        <div className="flex items-center gap-2">
          <Switch size="sm" id="areas" checked={areas} onCheckedChange={setAreas} />
          <Label htmlFor="areas" className="text-xs">
            template-areas
          </Label>
        </div>
      )}
      <div className="flex items-center gap-2">
        <Switch size="sm" id="demo" checked={demo} onCheckedChange={setDemo} />
        <Label htmlFor="demo" className="text-xs">
          Demo styles
        </Label>
      </div>
      <div className="flex items-center gap-2">
        <Switch size="sm" id="content" checked={content} onCheckedChange={onContent} />
        <Label htmlFor="content" className="text-xs">
          Placeholders
        </Label>
      </div>
      {bps.length > 0 && (
        <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary">@media: {bps.join(", ")}</span>
      )}
    </div>
  )

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-4">
      {controls}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={() => setOpen(true)}>
          <Maximize2Icon />
          Expand
        </Button>
        <Button variant="outline" size="sm" className="flex-1" onClick={() => download("layout.html", generateDocument(root, { areas, demo, content }))}>
          <DownloadIcon />
          .html
        </Button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        {blocks.map((b) => (
          <CodeBlock key={b.file} code={b.code} lang={b.lang} filename={b.file} className="min-h-32 flex-1" />
        ))}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex h-[85vh] max-w-[min(1100px,95vw)] flex-col sm:max-w-[min(1100px,95vw)]">
          <DialogHeader>
            <DialogTitle>Export code</DialogTitle>
          </DialogHeader>
          {controls}
          <div className="grid min-h-0 flex-1 gap-3 lg:grid-flow-col lg:auto-cols-fr">
            {blocks.map((b) => (
              <CodeBlock key={b.file} code={b.code} lang={b.lang} filename={b.file} className="min-h-0" />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
