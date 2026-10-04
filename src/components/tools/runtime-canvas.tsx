import { useEffect, useRef, useState, type RefObject } from "react"
import { type CanvasApi, startRuntime } from "@/lib/canvas-runtime"
import { cn } from "@/lib/utils"

export function RuntimeCanvas({ body, config, apiRef, className }: { body: string; config: object; apiRef: RefObject<CanvasApi | null>; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState<string | null>(null)
  const configRef = useRef(config)

  useEffect(() => {
    configRef.current = config
  })

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    let api: CanvasApi | null = null
    try {
      api = startRuntime(body, canvas, configRef.current)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
    apiRef.current = api
    return () => {
      api?.dispose()
      apiRef.current = null
    }
  }, [body, apiRef])

  useEffect(() => {
    apiRef.current?.update(config)
  }, [config, apiRef])

  return (
    <>
      <canvas ref={ref} className={cn("block size-full touch-none", className)} />
      {error && <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-destructive">Runtime error: {error}</div>}
    </>
  )
}
