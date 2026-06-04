import { createRequire } from 'node:module'
import path from 'node:path'

const require = createRequire(import.meta.url)

/** 测试时可经 MYREADER_TEST_DATA 覆盖，避免 headless smoke 启动 GUI。 */
export function getUserDataDir(): string {
  const override = process.env.MYREADER_TEST_DATA
  if (override) return override

  const { app } = require('electron') as typeof import('electron')
  return app.getPath('userData')
}

export function getCoversDir(): string {
  return path.join(getUserDataDir(), 'covers')
}

export function getDbPath(): string {
  return path.join(getUserDataDir(), 'my-reader.db')
}
