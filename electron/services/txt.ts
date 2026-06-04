import fs from 'node:fs/promises'
import iconv from 'iconv-lite'
import jschardet from 'jschardet'

export const TXT_ENCODINGS = [
  'UTF-8',
  'GBK',
  'GB18030',
  'Big5',
] as const

export type TxtEncoding = (typeof TXT_ENCODINGS)[number]

/** 单次分块读取的默认字节数（512KB） */
export const TXT_CHUNK_BYTES = 512 * 1024

/** 小于等于此大小的文件可一次性读入内存 */
export const TXT_SMALL_FILE_BYTES = TXT_CHUNK_BYTES

export interface TxtFileInfo {
  totalBytes: number
  chunkBytes: number
}

export interface TxtChunkResult {
  text: string
  encoding: string
  byteOffset: number
  byteLength: number
  totalBytes: number
  hasMore: boolean
}

function normalizeEncoding(name: string): TxtEncoding {
  const upper = name.toUpperCase().replace(/[_-]/g, '')
  if (upper.includes('UTF8') || upper === 'ASCII') return 'UTF-8'
  if (upper.includes('GB18030')) return 'GB18030'
  if (upper.includes('GBK') || upper.includes('GB2312')) return 'GBK'
  if (upper.includes('BIG5') || upper.includes('BIG5HKSCS')) return 'Big5'
  return 'UTF-8'
}

export function detectTxtEncoding(buffer: Buffer): TxtEncoding {
  const sample = buffer.subarray(0, Math.min(buffer.length, 64 * 1024))
  const detected = jschardet.detect(sample)
  if (detected?.encoding) {
    return normalizeEncoding(detected.encoding)
  }
  return 'UTF-8'
}

/** 在非文件末尾时，将分块边界对齐到换行或完整字符，避免截断多字节字符。 */
function alignChunkEnd(
  buffer: Buffer,
  encoding: string,
  atEof: boolean,
): Buffer {
  if (atEof || buffer.length === 0) return buffer

  const tailSearchStart = Math.max(0, buffer.length - 4096)
  const lastNewline = buffer.lastIndexOf(0x0a)
  if (lastNewline >= tailSearchStart) {
    return buffer.subarray(0, lastNewline + 1)
  }

  const enc = encoding.toUpperCase()
  if (enc.includes('UTF-8') || enc === 'UTF-8') {
    let end = buffer.length
    while (end > 0 && (buffer[end - 1]! & 0xc0) === 0x80) end--
    if (end > 0) {
      const lead = buffer[end - 1]!
      const seqLen =
        lead >= 0xf0 ? 4 : lead >= 0xe0 ? 3 : lead >= 0xc0 ? 2 : 1
      if (buffer.length - (end - 1) < seqLen) end--
    }
    return buffer.subarray(0, Math.max(0, end))
  }

  if (enc === 'GBK' || enc === 'BIG5' || enc.includes('18030')) {
    const evenLen = buffer.length % 2 === 0 ? buffer.length : buffer.length - 1
    return buffer.subarray(0, evenLen)
  }

  return buffer
}

export async function getTxtFileInfo(filePath: string): Promise<TxtFileInfo> {
  const stat = await fs.stat(filePath)
  return { totalBytes: stat.size, chunkBytes: TXT_CHUNK_BYTES }
}

export async function readTxtChunk(
  filePath: string,
  encoding: string,
  byteOffset: number,
  maxBytes = TXT_CHUNK_BYTES,
): Promise<TxtChunkResult> {
  const stat = await fs.stat(filePath)
  const totalBytes = stat.size
  const safeOffset = Math.max(0, Math.min(byteOffset, totalBytes))

  if (safeOffset >= totalBytes) {
    return {
      text: '',
      encoding,
      byteOffset: safeOffset,
      byteLength: 0,
      totalBytes,
      hasMore: false,
    }
  }

  const toRead = Math.min(maxBytes, totalBytes - safeOffset)
  const atEof = safeOffset + toRead >= totalBytes

  const handle = await fs.open(filePath, 'r')
  try {
    const buf = Buffer.alloc(toRead)
    const { bytesRead } = await handle.read(buf, 0, toRead, safeOffset)
    let slice: Buffer = buf.subarray(0, bytesRead)
    slice = Buffer.from(alignChunkEnd(slice, encoding, atEof))
    const text = iconv.decode(slice, encoding)
    const byteLength = slice.length

    return {
      text,
      encoding,
      byteOffset: safeOffset,
      byteLength,
      totalBytes,
      hasMore: safeOffset + byteLength < totalBytes,
    }
  } finally {
    await handle.close()
  }
}

export async function readTxtFile(
  filePath: string,
  encoding: string,
): Promise<{ text: string; encoding: string; truncated: boolean }> {
  const stat = await fs.stat(filePath)
  const buf = await fs.readFile(filePath)
  const text = iconv.decode(buf, encoding)
  return {
    text,
    encoding,
    truncated: stat.size > TXT_SMALL_FILE_BYTES,
  }
}
