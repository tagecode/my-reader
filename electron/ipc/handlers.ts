import { dialog, ipcMain } from 'electron'
import fs from 'node:fs/promises'
import {
  getBookById,
  listBooks,
  removeBook,
  updateBookCoverPath,
} from '../db/books'
import { readCoverBase64, removeCover, saveCover } from '../services/covers'
import { getDbPath, initDatabase } from '../db/index'
import { getProgress, saveProgress } from '../db/progress'
import {
  getAllSettings,
  resetSettings,
  setSetting,
} from '../db/settings'
import { importBooksFromPaths } from '../services/import'
import {
  detectTxtEncoding,
  getTxtFileInfo,
  readTxtChunk,
  readTxtFile,
} from '../services/txt'
import { toMyReaderUrl } from '../protocol'

const SUPPORTED_FILTERS = [
  { name: '电子书', extensions: ['epub', 'txt', 'pdf'] },
]

export function registerIpcHandlers(): void {
  initDatabase()

  ipcMain.handle('app:getDataPath', () => getDbPath())

  ipcMain.handle('books:list', (_event, search?: string) => listBooks(search))

  ipcMain.handle('books:get', (_event, id: string) => getBookById(id))

  ipcMain.handle('books:remove', async (_event, id: string) => {
    const book = getBookById(id)
    if (book?.cover_path) {
      await removeCover(book.cover_path)
    }
    removeBook(id)
    return true
  })

  ipcMain.handle('books:getCover', async (_event, id: string) => {
    const book = getBookById(id)
    return readCoverBase64(book?.cover_path ?? null)
  })

  ipcMain.handle(
    'books:saveCover',
    async (_event, id: string, data: Uint8Array) => {
      const book = getBookById(id)
      if (!book) return false
      if (book.cover_path) {
        await removeCover(book.cover_path)
      }
      const coverPath = await saveCover(id, Buffer.from(data), 'jpg')
      updateBookCoverPath(id, coverPath)
      return true
    },
  )

  ipcMain.handle('books:importDialog', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: SUPPORTED_FILTERS,
    })
    if (result.canceled || result.filePaths.length === 0) {
      return { imported: [], errors: [] }
    }
    return importBooksFromPaths(result.filePaths)
  })

  ipcMain.handle('books:importPaths', (_event, paths: string[]) =>
    importBooksFromPaths(paths),
  )

  ipcMain.handle('books:readFile', async (_event, filePath: string) => {
    const buffer = await fs.readFile(filePath)
    return buffer.toString('base64')
  })

  /** PDF 完整读入内存，避免自定义协议流式加载导致空白页 */
  ipcMain.handle('pdf:readBuffer', async (_event, filePath: string) => {
    const buffer = await fs.readFile(filePath)
    return Uint8Array.from(buffer)
  })

  ipcMain.handle('books:toFileUrl', (_event, filePath: string) =>
    toMyReaderUrl(filePath),
  )

  ipcMain.handle('txt:detectEncoding', async (_event, filePath: string) => {
    const buf = await fs.readFile(filePath)
    return detectTxtEncoding(buf)
  })

  ipcMain.handle('txt:getInfo', (_event, filePath: string) =>
    getTxtFileInfo(filePath),
  )

  ipcMain.handle(
    'txt:readChunk',
    (
      _event,
      filePath: string,
      encoding: string,
      byteOffset: number,
      maxBytes?: number,
    ) => readTxtChunk(filePath, encoding, byteOffset, maxBytes),
  )

  ipcMain.handle(
    'txt:read',
    async (_event, filePath: string, encoding: string) =>
      readTxtFile(filePath, encoding),
  )

  ipcMain.handle(
    'progress:get',
    (_event, bookId: string) => getProgress(bookId),
  )

  ipcMain.handle(
    'progress:save',
    (
      _event,
      bookId: string,
      position: Record<string, unknown>,
      progressPercent: number,
    ) => saveProgress(bookId, position, progressPercent),
  )

  ipcMain.handle('settings:getAll', () => getAllSettings())

  ipcMain.handle('settings:set', (_event, key: string, value: string) => {
    setSetting(key, value)
    return getAllSettings()
  })

  ipcMain.handle('settings:reset', () => resetSettings())
}
