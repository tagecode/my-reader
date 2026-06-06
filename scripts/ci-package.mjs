/**
 * GitHub Actions 跨平台打包入口。
 * 环境变量：CI_PLATFORM=mac|win|linux，CI_ARCH=arm64|x64
 */
import { execSync } from 'node:child_process'
import { setTimeout } from 'node:timers/promises'

const platform = process.env.CI_PLATFORM
const arch = process.env.CI_ARCH

if (!platform || !arch) {
  console.error('需要设置 CI_PLATFORM 与 CI_ARCH')
  process.exit(1)
}

/** @param {string} cmd */
function run(cmd) {
  console.log(`> ${cmd}`)
  execSync(cmd, { stdio: 'inherit', env: process.env })
}

/** @param {string} cmd @param {number} [maxAttempts] */
async function runWithRetry(cmd, maxAttempts = 3) {
  let lastError
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      run(cmd)
      return
    } catch (error) {
      lastError = error
      if (attempt < maxAttempts) {
        const waitSec = attempt * 5
        console.warn(
          `命令失败（第 ${attempt}/${maxAttempts} 次），${waitSec}s 后重试…`,
        )
        await setTimeout(waitSec * 1000)
      }
    }
  }
  throw lastError
}

run('pnpm icons')
run('pnpm build')

let builderArgs = ''
if (platform === 'mac') {
  builderArgs = `--mac --${arch}`
} else if (platform === 'win') {
  builderArgs = '--win --x64'
} else if (platform === 'linux') {
  builderArgs = `--linux --${arch}`
} else {
  console.error(`未知 CI_PLATFORM：${platform}`)
  process.exit(1)
}

// CI 由 softprops/action-gh-release 上传产物，禁止 electron-builder 隐式 publish
await runWithRetry(`pnpm exec electron-builder ${builderArgs} --publish never`)
