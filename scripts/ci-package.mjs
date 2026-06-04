/**
 * GitHub Actions 跨平台打包入口。
 * 环境变量：CI_PLATFORM=mac|win|linux，CI_ARCH=arm64|x64
 */
import { execSync } from 'node:child_process'

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

run(`pnpm exec electron-builder ${builderArgs}`)
