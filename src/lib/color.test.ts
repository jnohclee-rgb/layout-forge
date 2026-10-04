import { describe, expect, it } from "vitest"
import { BLACK, WHITE, contrast, hexToOklch, mixHex, normalizeHex, oklchToHex, parseHex, rgbToHex } from "@/lib/color"

describe("color", () => {
  it("parses short, long and alpha hex values", () => {
    expect(parseHex("#fff")).toEqual({ r: 1, g: 1, b: 1 })
    expect(parseHex("000000")).toEqual({ r: 0, g: 0, b: 0 })
    expect(parseHex("#ff000080")).toEqual({ r: 1, g: 0, b: 0 })
  })

  it("rejects invalid hex values", () => {
    expect(parseHex("#12")).toBeNull()
    expect(parseHex("not-a-color")).toBeNull()
    expect(normalizeHex("zzz")).toBeNull()
  })

  it("round-trips hex through rgb", () => {
    for (const hex of ["#6d4aff", "#00a74c", "#ec4a42"]) {
      const rgb = parseHex(hex)!
      expect(rgbToHex(rgb)).toBe(hex)
    }
  })

  it("round-trips hex through oklch", () => {
    for (const hex of ["#6d4aff", "#22d3ee", "#808080"]) {
      expect(oklchToHex(hexToOklch(hex))).toBe(hex)
    }
  })

  it("computes WCAG contrast", () => {
    expect(contrast(BLACK, WHITE)).toBeCloseTo(21, 0)
    expect(contrast(WHITE, WHITE)).toBeCloseTo(1, 5)
  })

  it("mixes colors", () => {
    expect(mixHex("#000000", "#ffffff", 0)).toBe("#000000")
    expect(mixHex("#000000", "#ffffff", 1)).toBe("#ffffff")
  })
})
