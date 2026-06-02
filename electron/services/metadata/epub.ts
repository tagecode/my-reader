import fs from 'node:fs/promises'
import { XMLParser } from 'fast-xml-parser'
import JSZip from 'jszip'
import path from 'node:path'

export interface EpubMetadata {
  title: string
  author: string | null
  coverBuffer: Buffer | null
  coverExt: string
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
})

function textVal(value: unknown): string | null {
  if (value == null) return null
  if (typeof value === 'string') return value.trim() || null
  if (typeof value === 'object' && value !== null && '#text' in value) {
    const t = (value as { '#text'?: string })['#text']
    return typeof t === 'string' ? t.trim() || null : null
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const t = textVal(item)
      if (t) return t
    }
  }
  return null
}

function resolvePath(root: string, href: string): string {
  const base = root.replace(/[^/]+$/, '')
  const joined = path.posix.normalize(path.posix.join(base, href))
  return joined.replace(/^(\.\.\/)+/, '')
}

export async function extractEpubMetadata(
  filePath: string,
): Promise<EpubMetadata> {
  const fallbackTitle = path.basename(filePath, path.extname(filePath))
  const buffer = await fs.readFile(filePath)
  const zip = await JSZip.loadAsync(buffer)

  const containerXml = await zip.file('META-INF/container.xml')?.async('string')
  if (!containerXml) {
    return { title: fallbackTitle, author: null, coverBuffer: null, coverExt: 'jpg' }
  }

  const container = parser.parse(containerXml) as {
    container?: {
      rootfiles?: { rootfile?: { '@_full-path'?: string } | { '@_full-path'?: string }[] }
    }
  }
  const rootfiles = container.container?.rootfiles?.rootfile
  const rootfile = Array.isArray(rootfiles) ? rootfiles[0] : rootfiles
  const opfPath = rootfile?.['@_full-path']
  if (!opfPath) {
    return { title: fallbackTitle, author: null, coverBuffer: null, coverExt: 'jpg' }
  }

  const opfXml = await zip.file(opfPath)?.async('string')
  if (!opfXml) {
    return { title: fallbackTitle, author: null, coverBuffer: null, coverExt: 'jpg' }
  }

  const opf = parser.parse(opfXml) as {
    package?: {
      metadata?: Record<string, unknown>
      manifest?: {
        item?:
          | { '@_id'?: string; '@_href'?: string; '@_media-type'?: string }
          | { '@_id'?: string; '@_href'?: string; '@_media-type'?: string }[]
      }
    }
  }

  const metadata = opf.package?.metadata ?? {}
  const title =
    textVal(metadata['dc:title']) ??
    textVal(metadata.title) ??
    fallbackTitle
  const author =
    textVal(metadata['dc:creator']) ??
    textVal(metadata.creator) ??
    null

  let coverHref: string | null = null
  const meta = metadata.meta
  const metas = Array.isArray(meta) ? meta : meta ? [meta] : []
  for (const m of metas) {
    if (
      typeof m === 'object' &&
      m !== null &&
      (m as { '@_name'?: string })['@_name'] === 'cover'
    ) {
      const coverId = (m as { '@_content'?: string })['@_content']
      if (coverId) {
        const items = opf.package?.manifest?.item
        const list = Array.isArray(items) ? items : items ? [items] : []
        const coverItem = list.find((i) => i['@_id'] === coverId)
        coverHref = coverItem?.['@_href'] ?? null
      }
    }
  }

  if (!coverHref) {
    const items = opf.package?.manifest?.item
    const list = Array.isArray(items) ? items : items ? [items] : []
    const coverItem = list.find(
      (i) =>
        i['@_id']?.toLowerCase().includes('cover') ||
        i['@_href']?.toLowerCase().includes('cover'),
    )
    coverHref = coverItem?.['@_href'] ?? null
  }

  let coverBuffer: Buffer | null = null
  let coverExt = 'jpg'
  if (coverHref) {
    const coverPath = resolvePath(opfPath, coverHref)
    const file = zip.file(coverPath)
    if (file) {
      const data = await file.async('nodebuffer')
      coverBuffer = Buffer.from(data)
      const ext = path.extname(coverHref).slice(1).toLowerCase()
      if (ext === 'png' || ext === 'gif' || ext === 'webp') coverExt = ext
    }
  }

  return { title, author, coverBuffer, coverExt }
}
