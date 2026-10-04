import { useState } from "react"
import { FileInputIcon } from "lucide-react"
import { toast } from "sonner"
import { IMPORT_EXAMPLE, importLayout } from "@/layout/import"
import type { LayoutNode } from "@/layout/types"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function ImportDialog({ open, onOpenChange, onImport }: { open: boolean; onOpenChange: (v: boolean) => void; onImport: (root: LayoutNode) => void }) {
  const [css, setCss] = useState("")
  const [html, setHtml] = useState("")
  const [error, setError] = useState<string | null>(null)

  const run = () => {
    try {
      const res = importLayout(css, html)
      onImport(res.root)
      onOpenChange(false)
      toast.success(`Elements imported: ${res.count}`, { description: res.warnings.join(" · ") || undefined })
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not import")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import CSS / HTML</DialogTitle>
          <DialogDescription>
            Paste container CSS or HTML with &lt;style&gt;.
          </DialogDescription>
        </DialogHeader>
        <div className="grid min-h-0 flex-1 gap-3 md:grid-cols-2">
          <div className="flex min-h-0 flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">CSS or a full HTML document</Label>
              <Button variant="ghost" size="xs" onClick={() => setCss(IMPORT_EXAMPLE)}>
                Example
              </Button>
            </div>
            <Textarea
              value={css}
              onChange={(e) => setCss(e.target.value)}
              spellCheck={false}
              placeholder={".layout {\n  display: grid;\n  grid-template-columns: 200px 1fr;\n  grid-template-areas: \"nav main\";\n}"}
              className="h-72 resize-none font-mono text-xs md:h-96"
            />
          </div>
          <div className="flex min-h-0 flex-col gap-1.5">
            <Label className="text-xs">HTML (optional)</Label>
            <Textarea
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              spellCheck={false}
              placeholder={'<div class="layout">\n  <nav class="nav"></nav>\n  <main class="main"></main>\n</div>'}
              className="h-72 resize-none font-mono text-xs md:h-96"
            />
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <span className="mr-auto self-center text-xs text-muted-foreground">The current layout will be replaced (undo with Ctrl+Z)</span>
          <Button onClick={run} disabled={!css.trim() && !html.trim()}>
            <FileInputIcon />
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
