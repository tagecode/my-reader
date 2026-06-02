/**
 * 跨平台 PDF 中文字体：内置 Noto 简体 + 各系统 local 回退。
 * pdf.js 用 local(字体名) 查找；发票 PDF 常引用 Windows 字体名，需预先注册别名。
 */
import notoSansScUrl from '@fontsource/noto-sans-sc/files/noto-sans-sc-chinese-simplified-400-normal.woff2?url'
import notoSerifScUrl from '@fontsource/noto-serif-sc/files/noto-serif-sc-chinese-simplified-400-normal.woff2?url'

const registered = new Set<string>()
let ensurePromise: Promise<void> | null = null

function buildFontSrc(localNames: string[], bundledUrl: string): string {
  const locals = [...new Set(localNames)].map((n) => `local("${n}")`).join(', ')
  return `${locals}, url("${bundledUrl}")`
}

/** 宋体 / 楷体 / 仿宋 / 隶书等衬线类 */
const SERIF_SRC = buildFontSrc(
  [
    'SimSun',
    'SimSun Regular',
    'NSimSun',
    'STSong',
    'STSong-Light',
    'STSongStd-Light',
    'Songti SC',
    'STSongti-SC-Regular',
    'STSongti-SC-Light',
    'FangSong',
    'SimFang',
    'SimFang Regular',
    'STFangsong',
    'KaiTi',
    'KaiTi-GB2312',
    'SimKai',
    'SimKai Regular',
    'Kaiti SC',
    'STKaiti',
    'SimLi',
    'Baoli SC',
    'Libian SC',
  ],
  notoSerifScUrl,
)

/** 黑体等非衬线类 */
const SANS_SRC = buildFontSrc(
  [
    'SimHei',
    'SimHei Regular',
    'Heiti SC',
    'STHeiti',
    'Microsoft YaHei',
    'PingFang SC',
    'Noto Sans SC',
  ],
  notoSansScUrl,
)

const SERIF_ALIASES = [
  'SimSun',
  'SimSun Regular',
  'NSimSun',
  'STSong-Light',
  'STSongStd-Light',
  'FangSong',
  'SimFang',
  'SimFang Regular',
  'KaiTi',
  'KaiTi-GB2312',
  'SimKai',
  'SimKai Regular',
  'SimLi',
] as const

const SANS_ALIASES = ['SimHei', 'SimHei Regular'] as const

async function registerAlias(family: string, src: string): Promise<void> {
  if (registered.has(family)) return
  try {
    const face = new FontFace(family, src)
    await face.load()
    document.fonts.add(face)
    registered.add(family)
  } catch {
    // 单个别名失败不影响其余字体
  }
}

async function registerAll(): Promise<void> {
  const tasks: Promise<void>[] = []
  for (const family of SERIF_ALIASES) {
    tasks.push(registerAlias(family, SERIF_SRC))
  }
  for (const family of SANS_ALIASES) {
    tasks.push(registerAlias(family, SANS_SRC))
  }
  await Promise.all(tasks)
}

/** 打开 PDF 前调用，保证 SimSun / KaiTi 等名称可解析 */
export function ensurePdfjsChineseFonts(): Promise<void> {
  if (!ensurePromise) {
    ensurePromise = registerAll()
  }
  return ensurePromise
}
