/**
 * 从 build/icon-source.png（完整品牌图：squircle 图标 + 下方文案）生成各平台图标。
 * 自动检测图标区域：去掉顶部留白，在图标与文字之间的白缝处裁切。
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

/** 行内白色像素占比超过此值视为「空白行」 */
const WHITE_ROW_RATIO = 0.92
/** 图标与文字之间白缝的最小高度（像素） */
const MIN_GAP_HEIGHT = 8
/** 文案起始行检测：中心区域深色笔画占比阈值 */
const TEXT_ROW_RATIO = 0.035
/** 裁切时在检测到文字之前额外上移的像素 */
const TEXT_BOTTOM_MARGIN = 20

function isWhite(r, g, b) {
  return r > 245 && g > 245 && b > 245
}

/** squircle 棕色底 */
function isSquircleBg(r, g, b) {
  return (
    r >= 120 &&
    r <= 200 &&
    g >= 100 &&
    g <= 170 &&
    b >= 90 &&
    b <= 150 &&
    Math.abs(r - g) < 40
  )
}

/** 下方「摸鱼阅读器」等深色字 */
function isDarkText(r, g, b) {
  return r < 95 && g < 80 && b < 70
}

/**
 * 分析源图，返回 squircle 图标的正方形裁剪框（不含下方文字与顶部留白）。
 */
async function detectIconBounds(sourcePath) {
  const { data, info } = await sharp(sourcePath)
    .raw()
    .ensureAlpha()
    .toBuffer({ resolveWithObject: true })

  const w = info.width
  const h = info.height

  let minX = w
  let minY = h
  let maxX = 0
  let maxY = 0

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      if (!isWhite(data[i], data[i + 1], data[i + 2])) {
        minX = Math.min(minX, x)
        maxX = Math.max(maxX, x)
        minY = Math.min(minY, y)
        maxY = Math.max(maxY, y)
      }
    }
  }

  const rowWhiteRatio = (y) => {
    let white = 0
    let n = 0
    for (let x = minX; x <= maxX; x += 2) {
      const i = (y * w + x) * 4
      n++
      if (isWhite(data[i], data[i + 1], data[i + 2])) white++
    }
    return white / n
  }

  const gapClusters = []
  let gapStart = -1
  for (let y = minY; y <= maxY; y++) {
    const isGapRow = rowWhiteRatio(y) >= WHITE_ROW_RATIO
    if (isGapRow && gapStart < 0) gapStart = y
    if (!isGapRow && gapStart >= 0) {
      gapClusters.push({ y0: gapStart, y1: y - 1, height: y - gapStart })
      gapStart = -1
    }
  }
  if (gapStart >= 0) {
    gapClusters.push({ y0: gapStart, y1: maxY, height: maxY - gapStart + 1 })
  }

  const iconTop = minY
  // 文案只在画面下缘，避免把书页/阴影当成文字
  const searchTextFrom = minY + Math.floor((maxY - minY) * 0.78)

  let textStartRow = maxY + 1
  for (let y = searchTextFrom; y <= maxY; y++) {
    let text = 0
    let n = 0
    for (let x = Math.floor(w * 0.22); x <= Math.floor(w * 0.78); x += 2) {
      const i = (y * w + x) * 4
      n++
      if (isDarkText(data[i], data[i + 1], data[i + 2])) text++
    }
    if (text / n >= TEXT_ROW_RATIO) {
      textStartRow = y
      break
    }
  }

  let squircleBottom = iconTop
  for (let y = iconTop; y <= maxY; y++) {
    let edgeBg = 0
    for (const x of [
      minX + 8,
      minX + Math.floor((maxX - minX) * 0.08),
      maxX - Math.floor((maxX - minX) * 0.08),
      maxX - 8,
    ]) {
      const i = (y * w + x) * 4
      if (isSquircleBg(data[i], data[i + 1], data[i + 2])) edgeBg++
    }
    if (edgeBg >= 2) squircleBottom = y
  }

  const lowerBandStart = minY + (maxY - minY) * 0.72
  const separatorGaps = gapClusters
    .filter((g) => g.height >= MIN_GAP_HEIGHT && g.y0 >= lowerBandStart)
    .sort((a, b) => a.y0 - b.y0)

  const candidates = [
    textStartRow <= maxY ? textStartRow - 1 - TEXT_BOTTOM_MARGIN : maxY,
    squircleBottom,
    separatorGaps.length > 0 ? separatorGaps[0].y0 - 1 : maxY,
  ]
  const iconBottom = Math.min(...candidates)

  const iconHeight = iconBottom - iconTop + 1
  const contentWidth = maxX - minX + 1
  const side = Math.min(iconHeight, contentWidth)

  const centerX = Math.floor((minX + maxX) / 2)
  const left = Math.max(0, Math.min(centerX - Math.floor(side / 2), w - side))
  const top = iconTop

  return {
    left,
    top,
    width: side,
    height: side,
    debug: {
      trim: { minX, minY, maxX, maxY },
      iconBottom,
      textStartRow: textStartRow <= maxY ? textStartRow : null,
      squircleBottom,
      separatorGap: separatorGaps[0] ?? null,
      side,
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
  if (bounds.debug.textStartRow != null) {
    console.log(`检测到文案起始行: y=${bounds.debug.textStartRow}`)
  }
  console.log(`squircle 底边: y=${bounds.debug.squircleBottom}`)
  if (bounds.debug.separatorGap) {
    console.log(
      `图标/文字分界白缝: y=${bounds.debug.separatorGap.y0}–${bounds.debug.separatorGap.y1}`,
    )
  }

  return sharp(SOURCE)
    .extract({
      left: bounds.left,
      top: bounds.top,
      width: bounds.width,
      height: bounds.height,
    })
    .resize(1024, 1024, { fit: 'fill' })
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
