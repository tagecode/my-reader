import { protocol } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { Readable } from 'node:stream'

export function registerLocalFileProtocol(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'myreader',
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        stream: true,
        corsEnabled: true,
      },
    },
  ])
}

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  const mimeTypes: Record<string, string> = {
    '.epub': 'application/epub+zip',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
  }
  return mimeTypes[ext] ?? 'application/octet-stream'
}

function resolveFilePath(requestUrl: string): string | null {
  const url = new URL(requestUrl)
  const filePath = decodeURIComponent(
    url.searchParams.get('path') ?? url.pathname.slice(1),
  )
  if (!filePath || !fs.existsSync(filePath)) return null
  return filePath
}

function parseRangeHeader(
  rangeHeader: string,
  fileSize: number,
): { start: number; end: number } | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader)
  if (!match) return null

  let start = match[1] ? Number.parseInt(match[1], 10) : 0
  let end = match[2] ? Number.parseInt(match[2], 10) : fileSize - 1

  if (Number.isNaN(start) || Number.isNaN(end)) return null
  if (start < 0) start = 0
  if (end >= fileSize) end = fileSize - 1
  if (start > end) return null

  return { start, end }
}

export function setupLocalFileProtocol(): void {
  protocol.handle('myreader', (request) => {
    const filePath = resolveFilePath(request.url)
    if (!filePath) {
      return new Response('Not found', { status: 404 })
    }

    const stat = fs.statSync(filePath)
    const type = getMimeType(filePath)
    const rangeHeader = request.headers.get('Range')

    if (rangeHeader) {
      const range = parseRangeHeader(rangeHeader, stat.size)
      if (range) {
        const { start, end } = range
        const chunkSize = end - start + 1
        const stream = fs.createReadStream(filePath, { start, end })
        return new Response(Readable.toWeb(stream), {
          status: 206,
          headers: {
            'Content-Type': type,
            'Content-Length': String(chunkSize),
            'Content-Range': `bytes ${start}-${end}/${stat.size}`,
            'Accept-Ranges': 'bytes',
          },
        })
      }
    }

    const stream = fs.createReadStream(filePath)
    return new Response(Readable.toWeb(stream), {
      headers: {
        'Content-Type': type,
        'Content-Length': String(stat.size),
        'Accept-Ranges': 'bytes',
      },
    })
  })
}

export function toMyReaderUrl(filePath: string): string {
  return `myreader://open?path=${encodeURIComponent(filePath)}`
}
