import { contextBridge, ipcRenderer, webUtils } from 'electron'

const api = {
  getPathForFile: (file: File) => webUtils.getPathForFile(file),
  getDataPath: () => ipcRenderer.invoke('app:getDataPath') as Promise<string>,
  setWindowTitle: (title: string) =>
    ipcRenderer.invoke('app:setWindowTitle', title),
  listBooks: (search?: string) =>
    ipcRenderer.invoke('books:list', search) as Promise<unknown[]>,
  getBook: (id: string) => ipcRenderer.invoke('books:get', id),
  removeBook: (id: string) => ipcRenderer.invoke('books:remove', id),
  importDialog: () => ipcRenderer.invoke('books:importDialog'),
  importPaths: (paths: string[]) =>
    ipcRenderer.invoke('books:importPaths', paths),
  readFileBase64: (filePath: string) =>
    ipcRenderer.invoke('books:readFile', filePath) as Promise<string>,
  readPdfBuffer: (filePath: string) =>
    ipcRenderer.invoke('pdf:readBuffer', filePath) as Promise<Uint8Array>,
  getProgress: (bookId: string) => ipcRenderer.invoke('progress:get', bookId),
  saveProgress: (
    bookId: string,
    position: Record<string, unknown>,
    progressPercent: number,
  ) => ipcRenderer.invoke('progress:save', bookId, position, progressPercent),
  getSettings: () => ipcRenderer.invoke('settings:getAll'),
  setSetting: (key: string, value: string) =>
    ipcRenderer.invoke('settings:set', key, value),
  resetSettings: () => ipcRenderer.invoke('settings:reset'),
  getCover: (bookId: string) =>
    ipcRenderer.invoke('books:getCover', bookId) as Promise<string | null>,
  saveCover: (bookId: string, data: Uint8Array) =>
    ipcRenderer.invoke('books:saveCover', bookId, data) as Promise<boolean>,
  toFileUrl: (filePath: string) =>
    ipcRenderer.invoke('books:toFileUrl', filePath) as Promise<string>,
  detectTxtEncoding: (filePath: string) =>
    ipcRenderer.invoke('txt:detectEncoding', filePath) as Promise<string>,
  getTxtInfo: (filePath: string) =>
    ipcRenderer.invoke('txt:getInfo', filePath) as Promise<{
      totalBytes: number
      chunkBytes: number
    }>,
  readTxtChunk: (
    filePath: string,
    encoding: string,
    byteOffset: number,
    maxBytes?: number,
  ) =>
    ipcRenderer.invoke(
      'txt:readChunk',
      filePath,
      encoding,
      byteOffset,
      maxBytes,
    ) as Promise<{
      text: string
      encoding: string
      byteOffset: number
      byteLength: number
      totalBytes: number
      hasMore: boolean
    }>,
  readTxt: (filePath: string, encoding: string) =>
    ipcRenderer.invoke('txt:read', filePath, encoding) as Promise<{
      text: string
      encoding: string
      truncated: boolean
    }>,
  onOpenFiles: (callback: (paths: string[]) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, paths: string[]) =>
      callback(paths)
    ipcRenderer.on('app:openFiles', listener)
    return () => {
      ipcRenderer.removeListener('app:openFiles', listener)
    }
  },
}

contextBridge.exposeInMainWorld('electronAPI', api)

export type ElectronAPI = typeof api
