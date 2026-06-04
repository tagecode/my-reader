const dataDir = process.env.MYREADER_TEST_DATA ?? process.cwd()

export const app = {
  getPath: () => dataDir,
  isPackaged: false,
}

export const protocol = {
  registerSchemesAsPrivileged: () => {},
  handle: () => {},
}

export class BrowserWindow {}
export const shell = { openExternal: () => {} }
export const ipcMain = { handle: () => {} }
export const dialog = {
  showOpenDialog: async () => ({ canceled: true, filePaths: [] }),
}
