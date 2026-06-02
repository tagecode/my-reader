import path from 'node:path'
import type { BookFormat } from '../../db/books'
import { extractEpubMetadata } from './epub'

export interface BookMetadata {
  title: string
  author: string | null
  coverBuffer: Buffer | null
  coverExt: string
}

export async function extractMetadata(
  filePath: string,
  format: BookFormat,
): Promise<BookMetadata> {
  const fallbackTitle = path.basename(filePath, path.extname(filePath))

  if (format === 'epub') {
    const epub = await extractEpubMetadata(filePath)
    return {
      title: epub.title,
      author: epub.author,
      coverBuffer: epub.coverBuffer,
      coverExt: epub.coverExt,
    }
  }

  return {
    title: fallbackTitle,
    author: null,
    coverBuffer: null,
    coverExt: 'jpg',
  }
}
