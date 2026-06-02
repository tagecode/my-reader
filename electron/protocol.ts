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

export function setupLocalFileProtocol(): void {
  protocol.handle('myreader', (request) => {
    const url = new URL(request.url)
    const filePath = decodeURIComponent(
      url.searchParams.get('path') ?? url.pathname.slice(1),
    )
    if (!filePath || !fs.existsSync(filePath)) {
      return new Response('Not found', { status: 404 })
    }
    const stat = fs.statSync(filePath)
    const stream = fs.createReadStream(filePath)
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
    const type = mimeTypes[ext] ?? 'application/octet-stream'
    return new Response(Readable.toWeb(stream), {
      headers: {
        'Content-Type': type,
        'Content-Length': String(stat.size),
      },
    })
  })
}

export function toMyReaderUrl(filePath: string): string {
  return `myreader://open?path=${encodeURIComponent(filePath)}`
}
