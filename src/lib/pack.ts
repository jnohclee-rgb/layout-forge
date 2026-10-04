const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

export function crc32(data: Uint8Array) {
  let c = 0xffffffff
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

export async function dataUrlBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url)
  return new Uint8Array(await res.arrayBuffer())
}

export function buildIco(images: { size: number; png: Uint8Array }[]): Uint8Array {
  const header = 6 + images.length * 16
  const total = header + images.reduce((s, i) => s + i.png.length, 0)
  const out = new Uint8Array(total)
  const v = new DataView(out.buffer)
  v.setUint16(0, 0, true)
  v.setUint16(2, 1, true)
  v.setUint16(4, images.length, true)
  let offset = header
  images.forEach((img, i) => {
    const e = 6 + i * 16
    v.setUint8(e, img.size >= 256 ? 0 : img.size)
    v.setUint8(e + 1, img.size >= 256 ? 0 : img.size)
    v.setUint8(e + 2, 0)
    v.setUint8(e + 3, 0)
    v.setUint16(e + 4, 1, true)
    v.setUint16(e + 6, 32, true)
    v.setUint32(e + 8, img.png.length, true)
    v.setUint32(e + 12, offset, true)
    out.set(img.png, offset)
    offset += img.png.length
  })
  return out
}

export function buildZip(files: { name: string; data: Uint8Array | string }[]): Blob {
  const enc = new TextEncoder()
  const parts: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0
  const now = new Date()
  const time = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2)
  const date = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()
  for (const f of files) {
    const name = enc.encode(f.name)
    const data = typeof f.data === "string" ? enc.encode(f.data) : f.data
    const crc = crc32(data)
    const local = new Uint8Array(30 + name.length)
    const lv = new DataView(local.buffer)
    lv.setUint32(0, 0x04034b50, true)
    lv.setUint16(4, 20, true)
    lv.setUint16(6, 0x0800, true)
    lv.setUint16(8, 0, true)
    lv.setUint16(10, time, true)
    lv.setUint16(12, date, true)
    lv.setUint32(14, crc, true)
    lv.setUint32(18, data.length, true)
    lv.setUint32(22, data.length, true)
    lv.setUint16(26, name.length, true)
    lv.setUint16(28, 0, true)
    local.set(name, 30)
    const cd = new Uint8Array(46 + name.length)
    const cv = new DataView(cd.buffer)
    cv.setUint32(0, 0x02014b50, true)
    cv.setUint16(4, 20, true)
    cv.setUint16(6, 20, true)
    cv.setUint16(8, 0x0800, true)
    cv.setUint16(10, 0, true)
    cv.setUint16(12, time, true)
    cv.setUint16(14, date, true)
    cv.setUint32(16, crc, true)
    cv.setUint32(20, data.length, true)
    cv.setUint32(24, data.length, true)
    cv.setUint16(28, name.length, true)
    cv.setUint32(42, offset, true)
    cd.set(name, 46)
    parts.push(local, data)
    central.push(cd)
    offset += local.length + data.length
  }
  const cdSize = central.reduce((s, c) => s + c.length, 0)
  const end = new Uint8Array(22)
  const ev = new DataView(end.buffer)
  ev.setUint32(0, 0x06054b50, true)
  ev.setUint16(8, files.length, true)
  ev.setUint16(10, files.length, true)
  ev.setUint32(12, cdSize, true)
  ev.setUint32(16, offset, true)
  return new Blob([...parts, ...central, end].map((p) => p.slice().buffer as ArrayBuffer), { type: "application/zip" })
}
