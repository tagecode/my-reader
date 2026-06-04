/**
 * 启动 Electron（RUN_AS_NODE 模式）运行 MVP smoke，以匹配 better-sqlite3 的 Electron ABI。
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import electronPath from 'electron'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const runner = path.join(__dirname, 'test-mvp-runner.mts')

const nodeOptions = [
  process.env.NODE_OPTIONS,
  '--import ./scripts/mvp-ts-hook.mjs',
  '--experimental-strip-types',
]
  .filter(Boolean)
  .join(' ')

const result = spawnSync(electronPath, [runner], {
  cwd: projectRoot,
  stdio: 'inherit',
  env: {
    ...process.env,
    ELECTRON_RUN_AS_NODE: '1',
    NODE_OPTIONS: nodeOptions,
  },
})

process.exit(result.status === null ? 1 : result.status)
