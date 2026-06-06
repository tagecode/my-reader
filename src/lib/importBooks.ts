import { generatePdfCoversForBooks } from '@/lib/generatePdfCovers'
import i18n from '@/lib/i18n'
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

  const details = errors.map((e) =>
    i18n.t('import.fileError', {
      name: basename(e.path),
      error: e.error,
    }),
  )

  if (imported.length > 0 && errors.length === 0) {
    return {
      variant: 'success',
      message: i18n.t('import.success', { count: imported.length }),
      details: [],
    }
  }

  if (imported.length > 0 && errors.length > 0) {
    return {
      variant: 'warning',
      title: i18n.t('import.partialTitle', {
        imported: imported.length,
        failed: errors.length,
      }),
      message: i18n.t('import.partialMessage'),
      details,
    }
  }

  return {
    variant: 'error',
    title: i18n.t('import.failedTitle'),
    message:
      errors.length === 1
        ? errors[0].error
        : i18n.t('import.allFailed', { count: errors.length }),
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
    return {
      imported: [],
      errors: paths.map((p) => ({
        path: p,
        error: i18n.t('errors.appNotReady'),
      })),
    }
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
