import path from 'node:path'
import { XMLParser } from 'fast-xml-parser'
import yauzl from 'yauzl'

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

function normalizeZipPath(entryPath: string): string {
  return entryPath.replace(/\\/g, '/').replace(/^\/+/, '')
}

function openZip(filePath: string): Promise<yauzl.ZipFile> {
  return new Promise((resolve, reject) => {
    yauzl.open(filePath, { lazyEntries: true }, (err, zipfile) => {
      if (err || !zipfile) reject(err ?? new Error('Failed to open EPUB'))
      else resolve(zipfile)
    })
  })
}

function readEntryBuffer(
  zipfile: yauzl.ZipFile,
  entry: yauzl.Entry,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    zipfile.openReadStream(entry, (err, stream) => {
      if (err || !stream) {
        reject(err ?? new Error('Failed to read EPUB entry'))
        return
      }
      const chunks: Buffer[] = []
      stream.on('data', (chunk: Buffer) => chunks.push(chunk))
      stream.on('end', () => resolve(Buffer.concat(chunks)))
      stream.on('error', reject)
    })
  })
}

async function readZipTargets(
  filePath: string,
  targetPaths: string[],
): Promise<Map<string, Buffer>> {
  if (targetPaths.length === 0) return new Map()

  const wanted = new Set(targetPaths.map(normalizeZipPath))
  const result = new Map<string, Buffer>()
  const zipfile = await openZip(filePath)

  return new Promise((resolve, reject) => {
    const finish = (err?: Error) => {
      zipfile.close()
      if (err) reject(err)
      else resolve(result)
    }

    zipfile.on('entry', (entry) => {
      const entryPath = normalizeZipPath(entry.fileName)
      if (wanted.has(entryPath)) {
        void readEntryBuffer(zipfile, entry)
          .then((buf) => {
            result.set(entryPath, buf)
            if (result.size >= wanted.size) finish()
            else zipfile.readEntry()
          })
          .catch((err: Error) => finish(err))
        return
      }
      zipfile.readEntry()
    })
    zipfile.on('end', () => finish())
    zipfile.on('error', (err) => finish(err))
    zipfile.readEntry()
  })
}

function resolveCoverHref(opf: {
  package?: {
    metadata?: Record<string, unknown>
    manifest?: {
      item?:
        | { '@_id'?: string; '@_href'?: string; '@_media-type'?: string }
        | { '@_id'?: string; '@_href'?: string; '@_media-type'?: string }[]
    }
  }
}): string | null {
  const metadata = opf.package?.metadata ?? {}
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
        if (coverItem?.['@_href']) return coverItem['@_href']
      }
    }
  }

  const items = opf.package?.manifest?.item
  const list = Array.isArray(items) ? items : items ? [items] : []
  const coverItem = list.find(
    (i) =>
      i['@_id']?.toLowerCase().includes('cover') ||
      i['@_href']?.toLowerCase().includes('cover'),
  )
  return coverItem?.['@_href'] ?? null
}

export async function extractEpubMetadata(
  filePath: string,
): Promise<EpubMetadata> {
  const fallbackTitle = path.basename(filePath, path.extname(filePath))

  const containerFiles = await readZipTargets(filePath, [
    'META-INF/container.xml',
  ])
  const containerXml = containerFiles
    .get('META-INF/container.xml')
    ?.toString('utf8')
  if (!containerXml) {
    return { title: fallbackTitle, author: null, coverBuffer: null, coverExt: 'jpg' }
  }

  const container = parser.parse(containerXml) as {
    container?: {
      rootfiles?: {
        rootfile?: { '@_full-path'?: string } | { '@_full-path'?: string }[]
      }
    }
  }
  const rootfiles = container.container?.rootfiles?.rootfile
  const rootfile = Array.isArray(rootfiles) ? rootfiles[0] : rootfiles
  const opfPath = rootfile?.['@_full-path']
  if (!opfPath) {
    return { title: fallbackTitle, author: null, coverBuffer: null, coverExt: 'jpg' }
  }

  const opfFiles = await readZipTargets(filePath, [normalizeZipPath(opfPath)])
  const opfXml = opfFiles.get(normalizeZipPath(opfPath))?.toString('utf8')
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

  const coverHref = resolveCoverHref(opf)
  let coverBuffer: Buffer | null = null
  let coverExt = 'jpg'
  if (coverHref) {
    const coverPath = normalizeZipPath(resolvePath(opfPath, coverHref))
    const coverFiles = await readZipTargets(filePath, [coverPath])
    coverBuffer = coverFiles.get(coverPath) ?? null
    if (coverBuffer) {
      const ext = path.extname(coverHref).slice(1).toLowerCase()
      if (ext === 'png' || ext === 'gif' || ext === 'webp') coverExt = ext
    }
  }

  return { title, author, coverBuffer, coverExt }
}
