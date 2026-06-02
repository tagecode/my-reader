import fs from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { createBook, detectFormat } from '../db/books'
import { saveCover } from './covers'
import { extractMetadata } from './metadata'

export interface ImportResult {
  success: boolean
  bookId?: string
  error?: string
}

export async function importBookFromPath(filePath: string): Promise<ImportResult> {
  try {
    const format = detectFormat(filePath)
    if (!format) {
      return {
        success: false,
        error: '不支持的格式，MVP 仅支持 EPUB、TXT、PDF',
      }
    }

    const stat = await fs.stat(filePath)
    if (!stat.isFile()) {
      return { success: false, error: '路径不是有效文件' }
    }

    const meta = await extractMetadata(filePath, format)
    const bookId = randomUUID()
    let coverPath: string | null = null

    if (meta.coverBuffer) {
      coverPath = await saveCover(bookId, meta.coverBuffer, meta.coverExt)
    }

    const book = createBook({
      id: bookId,
      title: meta.title,
      author: meta.author,
      format,
      file_path: filePath,
      file_size: stat.size,
      cover_path: coverPath,
    })

    return { success: true, bookId: book.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : '导入失败'
    if (message.includes('UNIQUE')) {
      return { success: false, error: '该书籍已在书库中' }
    }
    return { success: false, error: message }
  }
}

export async function importBooksFromPaths(
  filePaths: string[],
): Promise<{ imported: string[]; errors: { path: string; error: string }[] }> {
  const imported: string[] = []
  const errors: { path: string; error: string }[] = []

  for (const filePath of filePaths) {
    const result = await importBookFromPath(filePath)
    if (result.success && result.bookId) {
      imported.push(result.bookId)
    } else {
      errors.push({ path: filePath, error: result.error ?? '未知错误' })
    }
  }

  return { imported, errors }
}
