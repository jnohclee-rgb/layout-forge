import { describe, expect, it } from "vitest"
import { slug } from "@/layout/export"

describe("layout export", () => {
  it("slugifies names into class names", () => {
    expect(slug("Main Header")).toBe("main-header")
    expect(slug("Привет мир")).toBe("privet-mir")
  })

  it("avoids reserved CSS keywords", () => {
    expect(slug("auto")).not.toBe("auto")
  })
})
