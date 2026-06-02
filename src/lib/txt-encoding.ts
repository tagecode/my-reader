import jschardet from 'jschardet'
import iconv from 'iconv-lite'

export const TXT_ENCODINGS = [
  'UTF-8',
  'GBK',
  'GB18030',
  'Big5',
  'UTF-16LE',
  'UTF-16BE',
] as const

export type TxtEncoding = (typeof TXT_ENCODINGS)[number]

function normalizeEncoding(name: string): TxtEncoding {
  const upper = name.toUpperCase().replace(/[_-]/g, '')
  if (upper.includes('UTF8') || upper === 'ASCII') return 'UTF-8'
  if (upper.includes('GB18030')) return 'GB18030'
  if (upper.includes('GBK') || upper.includes('GB2312')) return 'GBK'
  if (upper.includes('BIG5') || upper.includes('BIG5HKSCS')) return 'Big5'
  if (upper.includes('UTF16LE')) return 'UTF-16LE'
  if (upper.includes('UTF16BE')) return 'UTF-16BE'
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

export function decodeTxtBuffer(buffer: Buffer, encoding: string): string {
  try {
    return iconv.decode(buffer, encoding)
  } catch {
    return iconv.decode(buffer, 'UTF-8')
  }
}

export async function readTxtChunkBase64(
  readFileBase64: (path: string) => Promise<string>,
  filePath: string,
  encoding: string,
  offset: number,
  chunkSize: number,
): Promise<{ text: string; nextOffset: number; done: boolean }> {
  const fullBase64 = await readFileBase64(filePath)
  const binary = atob(fullBase64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

  const buf = Buffer.from(bytes)
  const fullText = decodeTxtBuffer(buf, encoding)
  const text = fullText.slice(offset, offset + chunkSize)
  const nextOffset = offset + text.length
  return {
    text,
    nextOffset,
    done: nextOffset >= fullText.length,
  }
}
