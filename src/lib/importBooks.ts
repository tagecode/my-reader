import { generatePdfCoversForBooks } from '@/lib/generatePdfCovers'
import type { ImportBooksResult } from '@/types/electron'
import type { StatusVariant } from '@/components/ui/status-message'

export function formatImportFeedback(result: ImportBooksResult): {
  variant: StatusVariant
  title?: string
  message: string
  details: string[]
} | null {
  const { imported, errors } = result
  if (imported.length === 0 && errors.length === 0) return null

  const details = errors.map(
    (e) => `${basename(e.path)}：${e.error}`,
  )

  if (imported.length > 0 && errors.length === 0) {
    return {
      variant: 'success',
      message: `成功导入 ${imported.length} 本书`,
      details: [],
    }
  }

  if (imported.length > 0 && errors.length > 0) {
    return {
      variant: 'warning',
      title: `已导入 ${imported.length} 本，${errors.length} 个失败`,
      message: '部分文件未能加入书库，请查看下方详情。',
      details,
    }
  }

  return {
    variant: 'error',
    title: '导入失败',
    message:
      errors.length === 1
        ? errors[0].error
        : `${errors.length} 个文件均未能导入`,
    details: errors.length > 1 ? details : [],
  }
}

function basename(filePath: string): string {
  const parts = filePath.replace(/\\/g, '/').split('/')
  return parts[parts.length - 1] || filePath
}

/** 导入文件并为首屏无封面的 PDF 生成缩略图 */
export async function importBookPaths(
  paths: string[],
): Promise<ImportBooksResult> {
  if (!window.electronAPI) {
    return { imported: [], errors: paths.map((p) => ({ path: p, error: '应用未就绪' })) }
  }

  const result = (await window.electronAPI.importPaths(
    paths,
  )) as ImportBooksResult

  if (result.imported.length > 0) {
    await generatePdfCoversForBooks(result.imported)
  }

  return result
}

export async function importFromDialog(): Promise<ImportBooksResult | null> {
  if (!window.electronAPI) return null
  const result = (await window.electronAPI.importDialog()) as ImportBooksResult
  if (result.imported.length > 0) {
    await generatePdfCoversForBooks(result.imported)
  }
  return result
}
