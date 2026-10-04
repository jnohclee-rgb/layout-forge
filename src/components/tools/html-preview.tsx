import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

export function HtmlPreview({ html, css, js, className }: { html: string; css: string; js?: string; className?: string }) {
  const host = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = host.current
    if (!el) return
    el.innerHTML = html
    if (!js) return
    try {
      new Function(js)()
    } catch {
      return
    }
  }, [html, js])

  return (
    <>
      <style>{css}</style>
      <div ref={host} className={cn("absolute inset-0", className)} />
    </>
  )
}
