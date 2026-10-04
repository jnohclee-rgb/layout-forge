import { ImageIcon } from "lucide-react"
import { TEXT } from "@/layout/content"
import type { ContentKind } from "@/layout/types"

const H3 = () => <h3 className="text-lg leading-snug font-semibold">{TEXT.heading}</h3>
const Btn = () => <button className="pointer-events-none rounded-md bg-neutral-900 px-3.5 py-2 text-sm text-white dark:bg-neutral-100 dark:text-neutral-900">{TEXT.button}</button>

export function Placeholder({ kind }: { kind: Exclude<ContentKind, "auto"> }) {
  switch (kind) {
    case "heading":
      return <H3 />
    case "text":
      return <p className="text-sm">{TEXT.text}</p>
    case "long":
      return <p className="text-sm">{TEXT.long}</p>
    case "image":
      return (
        <div className="flex aspect-video w-full items-center justify-center rounded-md bg-gradient-to-br from-foreground/10 to-foreground/25 text-foreground/40">
          <ImageIcon className="size-6" />
        </div>
      )
    case "button":
      return <Btn />
    case "list":
      return (
        <ul className="flex flex-wrap gap-3 text-sm">
          {TEXT.list.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      )
    case "card":
      return (
        <div className="flex flex-col items-start gap-2">
          <H3 />
          <p className="text-sm">{TEXT.text}</p>
          <Btn />
        </div>
      )
  }
}
