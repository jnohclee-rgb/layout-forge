import { toast } from "sonner"

export async function copyText(text: string, what = "Code") {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(`${what} copied`)
  } catch {
    toast.error("Could not copy")
  }
}

export function download(name: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadUrl(name: string, url: string) {
  const a = document.createElement("a")
  a.href = url
  a.download = name
  a.click()
}

export function downloadBlob(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  downloadUrl(name, url)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
