import { renderPdfCoverJpeg } from '@/lib/pdfCover'
import type { Book } from '@/types/electron'

/** 为无封面的 PDF 生成第一页缩略图并写入书库 */
export async function generatePdfCoversForBooks(
  bookIds: string[],
): Promise<number> {
  const api = window.electronAPI
  if (!api?.saveCover) return 0

  let saved = 0
  for (const id of bookIds) {
    const book = (await api.getBook(id)) as Book | null
    if (!book || book.format !== 'pdf' || book.cover_path) continue

    try {
      const fileUrl = await api.toFileUrl(book.file_path)
      if (!fileUrl) continue
      const jpeg = await renderPdfCoverJpeg({ kind: 'url', url: fileUrl })
      if (!jpeg?.length) continue
      const ok = await api.saveCover(id, jpeg)
      if (ok) saved += 1
    } catch (err) {
      console.warn(`PDF 封面生成失败: ${book.title}`, err)
    }
  }
  return saved
}

/** 书库中所有缺封面的 PDF */
export async function generateMissingPdfCovers(): Promise<number> {
  const api = window.electronAPI
  if (!api) return 0
  const books = (await api.listBooks()) as Book[]
  const ids = books
    .filter((b) => b.format === 'pdf' && !b.cover_path)
    .map((b) => b.id)
  return generatePdfCoversForBooks(ids)
}
