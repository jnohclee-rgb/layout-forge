let cache: string | null = null

export function sampleImage(): string {
  if (cache) return cache
  const w = 1200
  const h = 800
  const c = document.createElement("canvas")
  c.width = w
  c.height = h
  const ctx = c.getContext("2d")
  if (!ctx) return ""
  const sky = ctx.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, "#1e1b4b")
  sky.addColorStop(0.45, "#7c3aed")
  sky.addColorStop(0.7, "#f472b6")
  sky.addColorStop(1, "#fdba74")
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, h)
  const sun = ctx.createRadialGradient(w * 0.62, h * 0.6, 10, w * 0.62, h * 0.6, 220)
  sun.addColorStop(0, "rgba(255,247,214,1)")
  sun.addColorStop(0.35, "rgba(253,224,171,0.9)")
  sun.addColorStop(1, "rgba(253,186,116,0)")
  ctx.fillStyle = sun
  ctx.fillRect(0, 0, w, h)
  const ridge = (base: number, amp: number, color: string, seed: number) => {
    ctx.beginPath()
    ctx.moveTo(0, h)
    for (let x = 0; x <= w; x += 8) {
      const y = base + Math.sin(x * 0.006 + seed) * amp + Math.sin(x * 0.017 + seed * 2) * amp * 0.4 + Math.sin(x * 0.045 + seed) * amp * 0.12
      ctx.lineTo(x, y)
    }
    ctx.lineTo(w, h)
    ctx.closePath()
    ctx.fillStyle = color
    ctx.fill()
  }
  ridge(h * 0.62, 60, "rgba(76,29,149,0.75)", 1)
  ridge(h * 0.72, 50, "rgba(49,17,99,0.9)", 3)
  ridge(h * 0.84, 40, "#1e0b3d", 5)
  for (let i = 0; i < 120; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.2 + ((i * 37) % 60) / 100})`
    ctx.beginPath()
    ctx.arc((i * 997) % w, ((i * 613) % (h * 0.4)) + 4, ((i * 7) % 3) * 0.6 + 0.6, 0, Math.PI * 2)
    ctx.fill()
  }
  cache = c.toDataURL("image/jpeg", 0.9)
  return cache
}
