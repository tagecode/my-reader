/**
 * 校验 git tag（v1.2.3）与 package.json version 一致。
 */
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
const ref = process.env.GITHUB_REF ?? ''

const match = /^refs\/tags\/v(.+)$/.exec(ref)
if (!match) {
  console.error(`无法从 GITHUB_REF 解析 tag：${ref || '(empty)'}`)
  process.exit(1)
}

const tagVersion = match[1]
if (pkg.version !== tagVersion) {
  console.error(
    `版本不一致：tag v${tagVersion}，package.json 为 ${pkg.version}`,
  )
  process.exit(1)
}

console.log(`版本校验通过：v${tagVersion}`)
