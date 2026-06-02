import fs from 'node:fs/promises'
import path from 'node:path'
import { app } from 'electron'

export function getCoversDir(): string {
  return path.join(app.getPath('userData'), 'covers')
}

export async function ensureCoversDir(): Promise<string> {
  const dir = getCoversDir()
  await fs.mkdir(dir, { recursive: true })
  return dir
}

export async function saveCover(
  bookId: string,
  data: Buffer,
  ext = 'jpg',
): Promise<string> {
  const dir = await ensureCoversDir()
  const coverPath = path.join(dir, `${bookId}.${ext}`)
  await fs.writeFile(coverPath, data)
  return coverPath
}

export async function removeCover(coverPath: string | null): Promise<void> {
  if (!coverPath) return
  try {
    await fs.unlink(coverPath)
  } catch {
    // ignore missing file
  }
}

export async function readCoverBase64(
  coverPath: string | null,
): Promise<string | null> {
  if (!coverPath) return null
  try {
    const buf = await fs.readFile(coverPath)
    const ext = path.extname(coverPath).slice(1) || 'jpeg'
    const mime =
      ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg'
    return `data:${mime};base64,${buf.toString('base64')}`
  } catch {
    return null
  }
}
