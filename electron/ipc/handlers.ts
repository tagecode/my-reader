import { BrowserWindow, dialog, ipcMain } from 'electron'
import fs from 'node:fs/promises'
import {
  getBookById,
  listBooks,
  listRecentBooks,
  removeBook,
  setBookFavorite,
  updateBookCoverPath,
} from '../db/books'
import {
  createBookmark,
  listBookmarks,
  removeBookmark,
} from '../db/bookmarks'
import { readCoverBase64, removeCover, saveCover } from '../services/covers'
import { getDbPath, initDatabase } from '../db/index'
import { getProgress, saveProgress, touchLastRead, clearRecentReading } from '../db/progress'
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

  ipcMain.handle('app:setWindowTitle', (_event, title: string) => {
    const win =
      BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
    if (win && typeof title === 'string' && title.length > 0) {
      win.setTitle(title)
    }
  })

  ipcMain.handle('books:list', (_event, query) => listBooks(query))

  ipcMain.handle('books:listRecent', (_event, limit?: number) =>
    listRecentBooks(typeof limit === 'number' ? limit : 8),
  )

  ipcMain.handle('books:get', (_event, id: string) => getBookById(id))

  ipcMain.handle('books:touchLastRead', (_event, id: string) => {
    touchLastRead(id)
    return true
  })

  ipcMain.handle('books:clearRecentReading', (_event, id: string) => {
    clearRecentReading(id)
    return true
  })

  ipcMain.handle('books:setFavorite', (_event, id: string, favorite: boolean) =>
    setBookFavorite(id, favorite),
  )

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
    const handle = await fs.open(filePath, 'r')
    try {
      const stat = await handle.stat()
      const size = Math.min(stat.size, 64 * 1024)
      const buf = Buffer.alloc(size)
      await handle.read(buf, 0, size, 0)
      return detectTxtEncoding(buf)
    } finally {
      await handle.close()
    }
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

  ipcMain.handle('bookmarks:list', (_event, bookId: string) =>
    listBookmarks(bookId),
  )

  ipcMain.handle(
    'bookmarks:create',
    (
      _event,
      bookId: string,
      label: string,
      position: Record<string, unknown>,
      progressPercent?: number,
    ) =>
      createBookmark({
        book_id: bookId,
        label,
        position,
        progress_percent: progressPercent,
      }),
  )

  ipcMain.handle('bookmarks:remove', (_event, id: string) => {
    removeBookmark(id)
    return true
  })
}
