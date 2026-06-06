import { app, BrowserWindow, Menu, shell } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { closeDatabase } from './db/index'
import { registerIpcHandlers } from './ipc/handlers'
import {
  registerLocalFileProtocol,
  setupLocalFileProtocol,
} from './protocol'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged
  ? process.env.DIST
  : path.join(process.env.DIST, '../public')

let mainWindow: BrowserWindow | null = null
const pendingOpenFiles: string[] = []

registerLocalFileProtocol()

function resolveWindowIcon(): string | undefined {
  const candidates = [
    path.join(__dirname, '../build/icon.png'),
    path.join(__dirname, '../build/icon.icns'),
    path.join(__dirname, '../build/icon.ico'),
  ]
  return candidates.find((p) => fs.existsSync(p))
}

function createWindow(): void {
  const iconPath = resolveWindowIcon()
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: '摸鱼阅读器',
    autoHideMenuBar: true,
    ...(iconPath ? { icon: iconPath } : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  // Win/Linux：彻底隐藏窗口内菜单栏（Alt 也不会弹出）
  mainWindow.setMenu(null)
  if (process.platform !== 'darwin') {
    mainWindow.setMenuBarVisibility(false)
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(process.env.DIST!, 'index.html'))
  }
}

function sendOpenFiles(paths: string[]) {
  if (!mainWindow) return
  mainWindow.webContents.send('app:openFiles', paths)
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', (_event, argv) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
    const paths = argv.filter((a) => /\.(epub|txt|pdf)$/i.test(a))
    if (paths.length > 0) sendOpenFiles(paths)
  })

  app.whenReady().then(() => {
    // macOS 保留系统菜单栏区域但清空应用菜单；Win/Linux 移除菜单栏
    Menu.setApplicationMenu(null)

    setupLocalFileProtocol()
    registerIpcHandlers()
    createWindow()

    if (pendingOpenFiles.length > 0) {
      sendOpenFiles([...pendingOpenFiles])
      pendingOpenFiles.length = 0
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
      }
    })
  })
}

app.on('open-file', (event, filePath) => {
  event.preventDefault()
  if (mainWindow?.webContents.isLoading()) {
    pendingOpenFiles.push(filePath)
  } else {
    sendOpenFiles([filePath])
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  closeDatabase()
})

if (process.platform === 'win32' || process.platform === 'linux') {
  const fileArg = process.argv.find((a) => /\.(epub|txt|pdf)$/i.test(a))
  if (fileArg) pendingOpenFiles.push(fileArg)
}
