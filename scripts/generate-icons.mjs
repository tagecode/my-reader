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

/** 文案区起始判定：行内图标像素占比阈值 */
const TEXT_ROW_RATIO = 0.35
/** 文案行内插画（白/红）占比上限，用于与 squircle 底边区分 */
const TEXT_ILLUSTRATION_MAX = 0.03
/** squircle 行判定阈值 */
const SQUIRCLE_ROW_RATIO = 0.06
/** 插画行判定阈值（白色波浪、红色书签等） */
const ILLUSTRATION_ROW_RATIO = 0.015
/** 正方形裁切留白（相对 squircle 边长） */
const CROP_PADDING_X_RATIO = 0.04
const CROP_PADDING_TOP_RATIO = 0.04
const CROP_PADDING_BOTTOM_RATIO = 0.05

/** 透明或浅灰底 */
function isBackground(r, g, b, a) {
  if (a < 16) return true
  return r > 228 && g > 228 && b > 228 && Math.abs(r - g) < 12 && Math.abs(g - b) < 12
}

/** 深灰 squircle 底色 */
function isSquircleBg(r, g, b) {
  return (
    r >= 45 &&
    r <= 95 &&
    g >= 45 &&
    g <= 95 &&
    b >= 45 &&
    b <= 95 &&
    Math.abs(r - g) < 15 &&
    Math.abs(g - b) < 15
  )
}

/** 图标内白色插画或红色点缀 */
function isIllustration(r, g, b) {
  if (r > 248 && g > 248 && b > 248) return true
  return r > 160 && g < 130 && b < 130
}

function rowBgRatio(data, w, y, x0, x1) {
  let bg = 0
  let n = 0
  for (let x = x0; x <= x1; x += 2) {
    const i = (y * w + x) * 4
    n++
    if (isBackground(data[i], data[i + 1], data[i + 2], data[i + 3])) bg++
  }
  return bg / n
}

function rowSquircleRatio(data, w, y, x0, x1) {
  let sq = 0
  let n = 0
  for (let x = x0; x <= x1; x += 2) {
    const i = (y * w + x) * 4
    n++
    if (isSquircleBg(data[i], data[i + 1], data[i + 2])) sq++
  }
  return sq / n
}

function rowIllustrationRatio(data, w, y, x0, x1) {
  let ill = 0
  let n = 0
  for (let x = x0; x <= x1; x += 2) {
    const i = (y * w + x) * 4
    n++
    if (isIllustration(data[i], data[i + 1], data[i + 2])) ill++
  }
  return ill / n
}

function isTextRow(data, w, y, x0, x1, contentTop, contentBottom) {
  if (y < contentTop + (contentBottom - contentTop) * 0.62) return false
  const icon = rowIconRatio(data, w, y, x0, x1)
  const ill = rowIllustrationRatio(data, w, y, x0, x1)
  return icon >= TEXT_ROW_RATIO && ill <= TEXT_ILLUSTRATION_MAX
}

function rowIconRatio(data, w, y, x0, x1) {
  let icon = 0
  let n = 0
  for (let x = x0; x <= x1; x += 2) {
    const i = (y * w + x) * 4
    n++
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const a = data[i + 3]
    if (isBackground(r, g, b, a)) continue
    if (isSquircleBg(r, g, b) || isIllustration(r, g, b)) icon++
  }
  return icon / n
}

function rowHasIconContent(data, w, y, x0, x1) {
  let sq = 0
  let ill = 0
  let n = 0
  for (let x = x0; x <= x1; x += 2) {
    const i = (y * w + x) * 4
    n++
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    if (isSquircleBg(r, g, b)) sq++
    if (isIllustration(r, g, b)) ill++
  }
  return sq / n >= SQUIRCLE_ROW_RATIO || ill / n >= ILLUSTRATION_ROW_RATIO
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
    if (rowBgRatio(data, w, y, bandX0, bandX1) < 0.95) {
      contentTop = y
      break
    }
  }
  for (let y = h - 1; y >= 0; y--) {
    if (rowBgRatio(data, w, y, bandX0, bandX1) < 0.95) {
      contentBottom = y
      break
    }
  }

  // 先在 squircle 主体区域估算水平范围
  let iconMinX = w
  let iconMaxX = 0
  const squircleScanLimit = contentTop + Math.floor((contentBottom - contentTop) * 0.62)
  for (let y = contentTop; y <= squircleScanLimit; y++) {
    if (rowSquircleRatio(data, w, y, bandX0, bandX1) < 0.15) continue
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      if (isSquircleBg(data[i], data[i + 1], data[i + 2])) {
        iconMinX = Math.min(iconMinX, x)
        iconMaxX = Math.max(iconMaxX, x)
      }
    }
  }

  if (iconMinX >= iconMaxX) {
    for (let y = contentTop; y <= contentBottom; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4
        if (isSquircleBg(data[i], data[i + 1], data[i + 2])) {
          iconMinX = Math.min(iconMinX, x)
          iconMaxX = Math.max(iconMaxX, x)
        }
      }
    }
  }

  const textSearchFrom = contentTop + Math.floor((contentBottom - contentTop) * 0.55)
  let textStartRow = h
  for (let y = textSearchFrom; y <= contentBottom; y++) {
    if (isTextRow(data, w, y, iconMinX, iconMaxX, contentTop, contentBottom)) {
      textStartRow = y
      break
    }
  }

  let iconTop = h
  let iconBottom = contentTop
  const iconScanLimit = textStartRow < h ? textStartRow - 1 : contentBottom
  for (let y = contentTop; y <= iconScanLimit; y++) {
    if (!rowHasIconContent(data, w, y, iconMinX, iconMaxX)) continue
    iconTop = Math.min(iconTop, y)
    iconBottom = Math.max(iconBottom, y)
  }

  if (iconTop >= h) {
    iconTop = contentTop
    iconBottom = contentBottom
  }

  // squircle 外框（深灰圆角方块），用于计算与边缘的距离
  let frameTop = h
  let frameBottom = 0
  let frameLeft = w
  let frameRight = 0
  for (let y = iconTop; y <= iconBottom; y++) {
    for (let x = iconMinX; x <= iconMaxX; x++) {
      const i = (y * w + x) * 4
      if (!isSquircleBg(data[i], data[i + 1], data[i + 2])) continue
      frameTop = Math.min(frameTop, y)
      frameBottom = Math.max(frameBottom, y)
      frameLeft = Math.min(frameLeft, x)
      frameRight = Math.max(frameRight, x)
    }
  }

  if (frameTop >= h) {
    frameTop = iconTop
    frameBottom = iconBottom
    frameLeft = iconMinX
    frameRight = iconMaxX
  }

  const frameWidth = frameRight - frameLeft + 1
  const frameHeight = frameBottom - frameTop + 1
  const frameBase = Math.max(frameWidth, frameHeight)
  const padX = Math.round(frameBase * CROP_PADDING_X_RATIO)
  const padTop = Math.round(frameBase * CROP_PADDING_TOP_RATIO)
  const padBottom = Math.round(frameBase * CROP_PADDING_BOTTOM_RATIO)
  const side = Math.min(
    w,
    h,
    Math.max(frameWidth + padX * 2, frameHeight + padTop + padBottom),
  )

  const centerX = Math.floor((frameLeft + frameRight) / 2)
  const left = Math.max(0, Math.min(centerX - Math.floor(side / 2), w - side))
  const top = Math.max(0, Math.min(frameTop - padTop, h - side))

  return {
    left,
    top,
    width: side,
    height: side,
    debug: {
      contentTop,
      contentBottom,
      iconTop,
      iconBottom,
      frameTop,
      frameBottom,
      frameLeft,
      frameRight,
      iconMinX,
      iconMaxX,
      textStartRow: textStartRow < h ? textStartRow : null,
      side,
      padTop,
      padBottom,
      padX,
      marginTop: frameTop - top,
      marginBottom: top + side - 1 - frameBottom,
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
  console.log(`图标范围: top=${bounds.debug.iconTop} bottom=${bounds.debug.iconBottom}`)
  if (bounds.debug.textStartRow != null) {
    console.log(`检测到文案起始行: y=${bounds.debug.textStartRow}`)
  }
  console.log(
    `边距: 上 ${bounds.debug.marginTop}px / 下 ${bounds.debug.marginBottom}px（目标留白 top=${bounds.debug.padTop} bottom=${bounds.debug.padBottom}）`,
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
