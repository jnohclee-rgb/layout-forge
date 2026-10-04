import type { ContentKind, LayoutNode } from "@/layout/types"

export const CONTENT_KINDS: { value: ContentKind; label: string }[] = [
  { value: "auto", label: "Auto (by name)" },
  { value: "heading", label: "Heading" },
  { value: "text", label: "Short text" },
  { value: "long", label: "Long text" },
  { value: "image", label: "Image" },
  { value: "button", label: "Button" },
  { value: "list", label: "List / menu" },
  { value: "card", label: "Card" },
]

const RULES: [RegExp, Exclude<ContentKind, "auto">][] = [
  [/img|image|photo|hero|media|cover|avatar|gallery|banner|pic/, "image"],
  [/btn|button|cta|action/, "button"],
  [/nav|menu|links|list|tabs/, "list"],
  [/card|tile|stat|post|product/, "card"],
  [/title|heading|header|topbar|logo|brand/, "heading"],
  [/article|body|content|main|desc|text/, "long"],
]

export function contentKind(node: LayoutNode): Exclude<ContentKind, "auto"> {
  if (node.content && node.content !== "auto") return node.content
  const name = node.name.toLowerCase()
  for (const [re, kind] of RULES) if (re.test(name)) return kind
  return "text"
}

export const TEXT = {
  heading: "Block heading",
  text: "A short paragraph to check line wrapping.",
  long:
    "Long text checks how the block behaves with real content: wrapping, auto row height and minimum column width. Note the link without spaces — it often breaks a grid without minmax(0, 1fr): https://example.com/very-long-url-without-any-spaces-that-breaks-layouts",
  button: "Learn more",
  list: ["Home", "Catalog", "Contacts"],
  image: "https://placehold.co/640x360",
}

export const PLACEHOLDER_CSS = `img {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  border-radius: 6px;
}

h3,
p,
ul {
  margin: 0;
}

ul {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 0;
  list-style: none;
}

button {
  padding: 8px 14px;
  border: 0;
  border-radius: 6px;
  background: #111;
  color: #fff;
  font: inherit;
}

.ph-stack {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

`

const TW = {
  img: "block w-full aspect-video object-cover rounded-md",
  ul: "flex flex-wrap gap-3",
  button: "rounded-md bg-neutral-900 px-3.5 py-2 text-white",
  h3: "text-lg font-semibold",
  stack: "flex flex-col items-start gap-2",
}

export function placeholderMarkup(kind: Exclude<ContentKind, "auto">, jsx: boolean): string[] {
  const cls = (tw: string, css?: string) => (jsx ? ` className="${tw}"` : css ? ` class="${css}"` : "")
  const close = jsx ? " />" : ">"
  const h3 = `<h3${cls(TW.h3)}>${TEXT.heading}</h3>`
  const p = (t: string) => `<p>${t}</p>`
  const button = `<button${cls(TW.button)}>${TEXT.button}</button>`
  switch (kind) {
    case "heading":
      return [h3]
    case "text":
      return [p(TEXT.text)]
    case "long":
      return [p(TEXT.long)]
    case "image":
      return [`<img${cls(TW.img)} src="${TEXT.image}" alt=""${close}`]
    case "button":
      return [button]
    case "list":
      return [`<ul${cls(TW.ul)}>`, ...TEXT.list.map((t) => `  <li>${t}</li>`), "</ul>"]
    case "card":
      return [`<div${cls(TW.stack, "ph-stack")}>`, `  ${h3}`, `  ${p(TEXT.text)}`, `  ${button}`, "</div>"]
  }
}
