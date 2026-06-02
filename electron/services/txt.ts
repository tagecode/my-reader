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

const MAX_TXT_BYTES = 12 * 1024 * 1024

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

export async function readTxtFile(
  filePath: string,
  encoding: string,
): Promise<{ text: string; encoding: string; truncated: boolean }> {
  const buf = await fs.readFile(filePath)
  const truncated = buf.length > MAX_TXT_BYTES
  const slice = truncated ? buf.subarray(0, MAX_TXT_BYTES) : buf
  const text = iconv.decode(slice, encoding)
  return { text, encoding, truncated }
}
