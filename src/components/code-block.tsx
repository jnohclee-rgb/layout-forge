import { useMemo, useState } from "react"
import { CheckIcon, CopyIcon, DownloadIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { copyText, download } from "@/lib/clipboard"
import { IconButton } from "@/components/fields"

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
const span = (cls: string, s: string) => `<span class="${cls}">${esc(s)}</span>`

const RULES: Record<string, [RegExp, string][]> = {
  css: [
    [/\/\*[\s\S]*?\*\//y, "tok-comment"],
    [/"[^"]*"|'[^']*'/y, "tok-string"],
    [/@[\w-]+/y, "tok-keyword"],
    [/--[\w-]+(?=\s*:)/y, "tok-prop"],
    [/[\w-]+(?=\s*:(?!:))/y, "tok-prop"],
    [/[.#:]?[\w-]+(?=[^{};]*\{)/y, "tok-selector"],
    [/#[0-9a-fA-F]{3,8}\b/y, "tok-number"],
    [/-?\d*\.?\d+(px|fr|%|rem|em|vh|vw|deg)?/y, "tok-number"],
    [/[\w-]+(?=\()/y, "tok-fn"],
  ],
  js: [
    [/\/\*[\s\S]*?\*\/|\/\/.*/y, "tok-comment"],
    [/"[^"]*"|'[^']*'|`[^`]*`/y, "tok-string"],
    [/\b(export|default|function|return|const|module|exports|import|from)\b/y, "tok-keyword"],
    [/[\w$]+(?=\s*:)/y, "tok-prop"],
    [/-?\d*\.?\d+/y, "tok-number"],
  ],
  html: [
    [/<!--[\s\S]*?-->/y, "tok-comment"],
    [/<\/?[\w!-]+/y, "tok-tag"],
    [/\/?>/y, "tok-tag"],
    [/[\w-]+(?==)/y, "tok-attr"],
    [/"[^"]*"/y, "tok-string"],
  ],
  json: [
    [/"[^"]*"(?=\s*:)/y, "tok-prop"],
    [/"[^"]*"/y, "tok-string"],
    [/-?\d*\.?\d+/y, "tok-number"],
  ],
}
RULES.scss = [[/\$[\w-]+/y, "tok-prop"], ...RULES.css]
RULES.jsx = [
  [/\b(export|default|function|return)\b/y, "tok-keyword"],
  [/<\/?[\w.]+/y, "tok-tag"],
  [/\/?>/y, "tok-tag"],
  [/[\w-]+(?==)/y, "tok-attr"],
  [/"[^"]*"/y, "tok-string"],
]

function highlight(code: string, lang: string): string {
  if (lang === "html" && /<style>[\s\S]*?<\/style>/.test(code)) {
    return code
      .split(/(<style>[\s\S]*?<\/style>)/)
      .map((part): string => {
        const m = part.match(/^<style>([\s\S]*)<\/style>$/)
        return m ? `${tokenize("<style>", "html")}${tokenize(m[1], "css")}${tokenize("</style>", "html")}` : tokenize(part, "html")
      })
      .join("")
  }
  return tokenize(code, lang)
}

function tokenize(code: string, lang: string): string {
  const rules = RULES[lang] ?? []
  let out = ""
  let i = 0
  let plain = ""
  while (i < code.length) {
    let matched = false
    for (const [re, cls] of rules) {
      re.lastIndex = i
      const m = re.exec(code)
      if (m && m[0].length > 0) {
        if (plain) {
          out += esc(plain)
          plain = ""
        }
        out += span(cls, m[0])
        i += m[0].length
        matched = true
        break
      }
    }
    if (!matched) {
      const ch = code[i]
      plain += ch
      i++
      if (/[\w-]/.test(ch)) {
        while (i < code.length && /[\w-]/.test(code[i])) plain += code[i++]
      }
    }
  }
  return out + esc(plain)
}

export function CodeBlock({
  code,
  lang,
  filename,
  className,
}: {
  code: string
  lang: string
  filename?: string
  className?: string
}) {
  const html = useMemo(() => highlight(code, lang), [code, lang])
  const [copied, setCopied] = useState(false)
  return (
    <div className={cn("group relative flex min-h-0 flex-col overflow-hidden rounded-lg border bg-muted/40", className)}>
      <div className="flex items-center justify-between gap-2 border-b bg-muted/50 py-1 pr-1 pl-3">
        <span className="truncate font-mono text-[11px] text-muted-foreground">{filename ?? lang}</span>
        <div className="flex items-center">
          {filename && (
            <IconButton label="Download" onClick={() => download(filename, code)}>
              <DownloadIcon />
            </IconButton>
          )}
          <IconButton
            label="Copy"
            onClick={() => {
              copyText(code)
              setCopied(true)
              setTimeout(() => setCopied(false), 1200)
            }}
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
          </IconButton>
        </div>
      </div>
      <pre className="code-view min-h-0 flex-1 overflow-auto p-3 font-mono text-[12px] leading-relaxed">
        <code dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
    </div>
  )
}
