import { describe, expect, it } from "vitest"
import { HARMONIES, STEPS, exportPalette, harmonySeeds, makeScaleFromHex, slugToken } from "@/lib/palette"
import type { Scale, ScaleOptions } from "@/lib/palette"

const opts: ScaleOptions = { hueShift: 0, chroma: 1, anchor: true }

describe("palette", () => {
  it("builds a scale with every step", () => {
    const scale = makeScaleFromHex("#6d4aff", opts)
    expect(scale).toHaveLength(STEPS.length)
    expect(scale.map((s) => s.step)).toEqual([...STEPS])
  })

  it("makes lighter steps lighter than darker ones", () => {
    const scale = makeScaleFromHex("#6d4aff", opts)
    expect(scale[0].oklch.l).toBeGreaterThan(scale[scale.length - 1].oklch.l)
  })

  it("returns seeds for every harmony", () => {
    for (const h of HARMONIES) expect(harmonySeeds("#6d4aff", h.value).length).toBeGreaterThan(0)
  })

  it("slugifies token names", () => {
    expect(slugToken("  Brand Blue! ")).toBe("brand-blue")
    expect(slugToken("***")).toBe("color")
  })

  it("exports CSS custom properties", () => {
    const scales: Scale[] = [{ id: "primary", name: "primary", swatches: makeScaleFromHex("#6d4aff", opts) }]
    const css = exportPalette(scales, "css", { format: "hex", prefix: "" })
    expect(css).toContain("--primary-500")
    expect(css).toContain(":root")
  })
})
