import { cpSync, existsSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const pdfjsRoot = path.dirname(require.resolve('pdfjs-dist/package.json'))
const outRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'pdfjs')

const ASSETS = ['cmaps', 'standard_fonts', 'wasm']

for (const dir of ASSETS) {
  const src = path.join(pdfjsRoot, dir)
  const dest = path.join(outRoot, dir)
  if (!existsSync(src)) {
    console.warn(`[copy-pdfjs-assets] skip missing: ${src}`)
    continue
  }
  mkdirSync(path.dirname(dest), { recursive: true })
  cpSync(src, dest, { recursive: true, force: true })
  console.log(`[copy-pdfjs-assets] ${dir} -> public/pdfjs/${dir}`)
}
