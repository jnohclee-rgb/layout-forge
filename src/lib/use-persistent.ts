import { useEffect, useState } from "react"

export function usePersistent<T extends object>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? { ...initial, ...(JSON.parse(raw) as Partial<T>) } : initial
    } catch {
      return initial
    }
  })
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(value))
      } catch {
        return
      }
    }, 300)
    return () => clearTimeout(t)
  }, [key, value])
  const patch = (p: Partial<T>) => setValue((v) => ({ ...v, ...p }))
  return [value, patch, setValue] as const
}
