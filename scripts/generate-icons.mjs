/**
 * 从 build/icon-source.png（透明底品牌图：squircle 图标 + 下方文案）生成各平台图标。
 * 自动裁剪 squircle 区域，去掉下方「摸鱼阅读器 / My Reader」文案。
 */
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import toIco from 'to-ico'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const BUILD = path.join(ROOT, 'build')
const PUBLIC = path.join(ROOT, 'public')

const SOURCE = path.join(BUILD, 'icon-source.png')
const MASTER = path.join(BUILD, 'icon.png')
const ICON_1024 = path.join(BUILD, 'icon-1024.png')
const ICON_ICO = path.join(BUILD, 'icon.ico')
const ICON_ICNS = path.join(BUILD, 'icon.icns')
const ICONSET = path.join(BUILD, 'icon.iconset')
const LINUX_ICONS = path.join(BUILD, 'icons')

const LINUX_SIZES = [16, 32, 48, 64, 128, 256, 512]
const FAVICON_SIZES = [16, 32, 180, 192, 512]
const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256]
const MASTER_SIZE = 1024

/** 行内前景像素占比阈值：低于此视为空白行 */
const EMPTY_ROW_RATIO = 0.03
/** 图标与文案之间的最小空白行数 */
const MIN_GAP_ROWS = 8
/** 文案行判定：整行前景占比下限 */
const TEXT_ROW_RATIO = 0.3
/** 文案行判定：中心区域前景占比上限（区别于图标主体满幅填充） */
const TEXT_CENTER_MAX = 0.75

/** 透明或浅灰底 */
function isBackground(r, g, b, a) {
  if (a < 16) return true
  return r > 228 && g > 228 && b > 228 && Math.abs(r - g) < 12 && Math.abs(g - b) < 12
}

function rowFgRatio(data, w, y, x0, x1) {
  let fg = 0
  let n = 0
  for (let x = x0; x <= x1; x += 2) {
    const i = (y * w + x) * 4
    n++
    if (!isBackground(data[i], data[i + 1], data[i + 2], data[i + 3])) fg++
  }
  return fg / n
}

/**
 * 在图标与下方文案之间找空白间隙；若无明显间隙则回退到文案行检测。
 */
function findIconScanEnd(data, w, contentTop, contentBottom, bandX0, bandX1) {
  const searchFrom = contentTop + Math.floor((contentBottom - contentTop) * 0.45)
  let gapStart = -1
  let gapLen = 0
  let bestGapStart = -1
  let bestGapLen = 0

  for (let y = searchFrom; y <= contentBottom; y++) {
    const fg = rowFgRatio(data, w, y, bandX0, bandX1)
    if (fg < EMPTY_ROW_RATIO) {
      if (gapStart < 0) gapStart = y
      gapLen = y - gapStart + 1
    } else {
      if (gapLen > bestGapLen) {
        bestGapStart = gapStart
        bestGapLen = gapLen
      }
      gapStart = -1
      gapLen = 0
    }
  }
  if (gapLen > bestGapLen) {
    bestGapStart = gapStart
    bestGapLen = gapLen
  }

  if (bestGapLen >= MIN_GAP_ROWS) {
    return bestGapStart - 1
  }

  const centerX0 = Math.floor(w * 0.32)
  const centerX1 = Math.floor(w * 0.68)
  const textSearchFrom = contentTop + Math.floor((contentBottom - contentTop) * 0.58)
  for (let y = textSearchFrom; y <= contentBottom; y++) {
    const band = rowFgRatio(data, w, y, bandX0, bandX1)
    const center = rowFgRatio(data, w, y, centerX0, centerX1)
    if (band >= TEXT_ROW_RATIO && center <= TEXT_CENTER_MAX) {
      return y - 1
    }
  }

  return contentBottom
}

/**
 * 分析源图，返回 squircle 图标的正方形裁剪框（不含下方文字）。
 */
async function detectIconBounds(sourcePath) {
  const { data, info } = await sharp(sourcePath)
    .raw()
    .ensureAlpha()
    .toBuffer({ resolveWithObject: true })

  const w = info.width
  const h = info.height
  const bandX0 = Math.floor(w * 0.12)
  const bandX1 = Math.floor(w * 0.88)

  let contentTop = 0
  let contentBottom = h - 1
  for (let y = 0; y < h; y++) {
    if (rowFgRatio(data, w, y, bandX0, bandX1) > EMPTY_ROW_RATIO) {
      contentTop = y
      break
    }
  }
  for (let y = h - 1; y >= 0; y--) {
    if (rowFgRatio(data, w, y, bandX0, bandX1) > EMPTY_ROW_RATIO) {
      contentBottom = y
      break
    }
  }

  const iconScanEnd = findIconScanEnd(data, w, contentTop, contentBottom, bandX0, bandX1)
  const textStartRow = iconScanEnd + 1

  let tightLeft = w
  let tightRight = 0
  let tightTop = h
  let tightBottom = 0
  for (let y = contentTop; y <= iconScanEnd; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const a = data[i + 3]
      if (isBackground(r, g, b, a)) continue
      tightLeft = Math.min(tightLeft, x)
      tightRight = Math.max(tightRight, x)
      tightTop = Math.min(tightTop, y)
      tightBottom = Math.max(tightBottom, y)
    }
  }

  if (tightLeft > tightRight) {
    tightLeft = bandX0
    tightRight = bandX1
    tightTop = contentTop
    tightBottom = iconScanEnd
  }

  const frameWidth = tightRight - tightLeft + 1
  const frameHeight = tightBottom - tightTop + 1
  const side = Math.min(w, h, Math.max(frameWidth, frameHeight))
  const centerX = (tightLeft + tightRight) / 2
  const centerY = (tightTop + tightBottom) / 2
  const left = Math.max(0, Math.min(Math.round(centerX - side / 2), w - side))
  const top = Math.max(0, Math.min(Math.round(centerY - side / 2), h - side))

  return {
    left,
    top,
    width: side,
    height: side,
    debug: {
      contentTop,
      contentBottom,
      iconScanEnd,
      tightTop,
      tightBottom,
      tightLeft,
      tightRight,
      textStartRow: textStartRow <= contentBottom ? textStartRow : null,
      side,
      marginTop: tightTop - top,
      marginBottom: top + side - 1 - tightBottom,
      marginLeft: tightLeft - left,
      marginRight: left + side - 1 - tightRight,
    },
  }
}

async function ensureSource() {
  if (!fs.existsSync(SOURCE)) {
    if (!fs.existsSync(MASTER)) {
      throw new Error(
        '缺少 build/icon-source.png：请将品牌图放到该路径，或保留 build/icon.png 后重试。',
      )
    }
    fs.copyFileSync(MASTER, SOURCE)
    console.log('已备份 build/icon.png → build/icon-source.png')
  }
}

async function extractAppIcon() {
  const bounds = await detectIconBounds(SOURCE)
  console.log(
    `裁剪区域: left=${bounds.left} top=${bounds.top} ${bounds.width}×${bounds.height}`,
  )
  console.log(`图标范围: top=${bounds.debug.tightTop} bottom=${bounds.debug.iconScanEnd}`)
  if (bounds.debug.textStartRow != null) {
    console.log(`检测到文案起始行: y=${bounds.debug.textStartRow}`)
  }
  console.log(
    `边距: 上 ${bounds.debug.marginTop}px / 下 ${bounds.debug.marginBottom}px / 左 ${bounds.debug.marginLeft}px / 右 ${bounds.debug.marginRight}px`,
  )

  return sharp(SOURCE)
    .extract({
      left: bounds.left,
      top: bounds.top,
      width: bounds.width,
      height: bounds.height,
    })
    .resize(MASTER_SIZE, MASTER_SIZE, { fit: 'fill' })
    .ensureAlpha()
    .png()
    .toBuffer()
}

async function writePng(buffer, outPath, size) {
  await fs.promises.mkdir(path.dirname(outPath), { recursive: true })
  await sharp(buffer).resize(size, size).png().toFile(outPath)
}

async function writeLinuxIcons(buffer) {
  await fs.promises.rm(LINUX_ICONS, { recursive: true, force: true })
  await fs.promises.mkdir(LINUX_ICONS, { recursive: true })
  for (const size of LINUX_SIZES) {
    await writePng(buffer, path.join(LINUX_ICONS, `${size}x${size}.png`), size)
  }
}

async function writeFavicons(buffer) {
  for (const size of FAVICON_SIZES) {
    const name =
      size === 180
        ? 'apple-touch-icon.png'
        : size === 192
          ? 'android-chrome-192x192.png'
          : size === 512
            ? 'android-chrome-512x512.png'
            : `favicon-${size}x${size}.png`
    await writePng(buffer, path.join(PUBLIC, name), size)
  }
  const icoBuffers = await Promise.all(
    ICO_SIZES.map((size) => sharp(buffer).resize(size, size).png().toBuffer()),
  )
  await fs.promises.writeFile(path.join(PUBLIC, 'favicon.ico'), await toIco(icoBuffers))
  await fs.promises.writeFile(ICON_ICO, await toIco(icoBuffers))
}

function writeIcnsMac(bufferPath) {
  if (process.platform !== 'darwin') {
    console.log('跳过 icon.icns（非 macOS，打包时 electron-builder 会从 icon.png 生成）')
    return
  }
  fs.rmSync(ICONSET, { recursive: true, force: true })
  fs.mkdirSync(ICONSET, { recursive: true })

  const entries = [
    ['icon_16x16.png', 16],
    ['icon_16x16@2x.png', 32],
    ['icon_32x32.png', 32],
    ['icon_32x32@2x.png', 64],
    ['icon_128x128.png', 128],
    ['icon_128x128@2x.png', 256],
    ['icon_256x256.png', 256],
    ['icon_256x256@2x.png', 512],
    ['icon_512x512.png', 512],
    ['icon_512x512@2x.png', 1024],
  ]

  for (const [name, size] of entries) {
    const out = path.join(ICONSET, name)
    execSync(`sips -z ${size} ${size} "${bufferPath}" --out "${out}"`, {
      stdio: 'pipe',
    })
  }

  execSync(`iconutil -c icns "${ICONSET}" -o "${ICON_ICNS}"`, { stdio: 'pipe' })
  fs.rmSync(ICONSET, { recursive: true, force: true })
  console.log('已生成 build/icon.icns')
}

async function main() {
  await ensureSource()
  const masterBuffer = await extractAppIcon()

  await fs.promises.writeFile(ICON_1024, masterBuffer)
  await fs.promises.writeFile(MASTER, masterBuffer)

  await writeLinuxIcons(masterBuffer)
  await writeFavicons(masterBuffer)
  writeIcnsMac(ICON_1024)

  console.log('图标生成完成：')
  console.log('  build/icon.png (1024, 应用主图标)')
  console.log('  build/icon.ico')
  if (fs.existsSync(ICON_ICNS)) console.log('  build/icon.icns')
  console.log(`  build/icons/{${LINUX_SIZES.join(',')}}x*.png`)
  console.log('  public/favicon-*.png, favicon.ico, apple-touch-icon.png')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
