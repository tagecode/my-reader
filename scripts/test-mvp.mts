/**
 * MVP smoke tests — maps to docs/MVP.md §6 (ACC-001 … ACC-011).
 *
 * Headless: main-process import / DB / progress / settings / TXT encoding / i18n / security.
 * UI-only items (rendering, TOC click, theme DOM) are verified via static source checks.
 *
 * Usage: pnpm test:mvp
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { performance } from 'node:perf_hooks'
import { fileURLToPath } from 'node:url'
import iconv from 'iconv-lite'
import JSZip from 'jszip'

import { initDatabase, closeDatabase, getDbPath, getDatabase } from '../electron/db/index.ts'
import { listBooks, listRecentBooks, getBookById, detectFormat } from '../electron/db/books.ts'
import { getProgress, saveProgress } from '../electron/db/progress.ts'
import {
  getAllSettings,
  setSetting,
  DEFAULT_SETTINGS,
} from '../electron/db/settings.ts'
import { importBooksFromPaths } from '../electron/services/import.ts'
import { detectTxtEncoding, getTxtFileInfo, readTxtChunk, readTxtFile } from '../electron/services/txt.ts'
import { extractMetadata } from '../electron/services/metadata/index.ts'
import Database from 'better-sqlite3'

function toMyReaderUrl(filePath: string): string {
  return `myreader://open?path=${encodeURIComponent(filePath)}`
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

type Status = 'pass' | 'fail' | 'partial'

interface CaseResult {
  id: string
  title: string
  status: Status
  detail: string
}

const results: CaseResult[] = []

function pass(id: string, title: string, detail: string) {
  results.push({ id, title, status: 'pass', detail })
}

function fail(id: string, title: string, detail: string) {
  results.push({ id, title, status: 'fail', detail })
}

function partial(id: string, title: string, detail: string) {
  results.push({ id, title, status: 'partial', detail })
}

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message)
}

async function writeFixtures(dir: string): Promise<{
  epub: string
  txt: string
  txtGbk: string
  txtBig5: string
  pdf: string
}> {
  await fs.mkdir(dir, { recursive: true })

  const txt = path.join(dir, 'sample.txt')
  await fs.writeFile(txt, '摸鱼阅读器 UTF-8 测试\n第一章\n', 'utf8')

  const txtGbk = path.join(dir, 'sample-gbk.txt')
  await fs.writeFile(txtGbk, iconv.encode('中文 GBK 编码测试内容', 'gbk'))

  const txtBig5 = path.join(dir, 'sample-big5.txt')
  await fs.writeFile(txtBig5, iconv.encode('繁體中文 Big5 編碼測試', 'big5'))

  const pdf = path.join(dir, 'sample.pdf')
  const pdfBody = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] >> endobj
xref
0 4
0000000000 65535 f 
0000000009 00000 n 
0000000052 00000 n 
0000000101 00000 n 
trailer << /Size 4 /Root 1 0 R >>
startxref
178
%%EOF`
  await fs.writeFile(pdf, pdfBody, 'utf8')

  const epub = path.join(dir, 'sample.epub')
  const zip = new JSZip()
  zip.file('mimetype', 'application/epub+zip')
  zip.file(
    'META-INF/container.xml',
    `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`,
  )
  zip.file(
    'OEBPS/content.opf',
    `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Smoke Test EPUB</dc:title>
    <dc:creator>My Reader QA</dc:creator>
  </metadata>
  <manifest>
    <item id="ch1" href="chapter.xhtml" media-type="application/xhtml+xml"/>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
  </manifest>
  <spine toc="ncx">
    <itemref idref="ch1"/>
  </spine>
</package>`,
  )
  zip.file(
    'OEBPS/chapter.xhtml',
    `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Ch1</title></head>
<body><p>EPUB smoke test content.</p></body></html>`,
  )
  zip.file(
    'OEBPS/toc.ncx',
    `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <navMap>
    <navPoint id="np1">
      <navLabel><text>Chapter 1</text></navLabel>
      <content src="chapter.xhtml"/>
    </navPoint>
  </navMap>
</ncx>`,
  )
  const epubBuf = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  })
  await fs.writeFile(epub, epubBuf)

  return { epub, txt, txtGbk, txtBig5, pdf }
}

async function readSource(relativePath: string): Promise<string> {
  return fs.readFile(path.join(ROOT, relativePath), 'utf8')
}

async function testAcc001Import(
  fixtures: Awaited<ReturnType<typeof writeFixtures>>,
): Promise<string[]> {
  const { imported, errors } = await importBooksFromPaths([
    fixtures.epub,
    fixtures.txt,
    fixtures.pdf,
  ])
  assert(errors.length === 0, `导入失败: ${JSON.stringify(errors)}`)
  assert(imported.length === 3, `期望导入 3 本，实际 ${imported.length}`)
  return imported
}

async function testAcc002Library(bookIds: string[]) {
  const books = listBooks()
  assert(books.length >= 3, `书库至少 3 本，实际 ${books.length}`)
  for (const id of bookIds) {
    assert(books.some((b) => b.id === id), `书库缺少 ${id}`)
    const book = getBookById(id)
    assert(book, `getBookById(${id}) 为空`)
    assert(['epub', 'txt', 'pdf'].includes(book.format), `未知格式 ${book.format}`)
  }
}

async function testAcc003Read(fixtures: Awaited<ReturnType<typeof writeFixtures>>) {
  const epubMeta = await extractMetadata(fixtures.epub, 'epub')
  assert(epubMeta.title === 'Smoke Test EPUB', `EPUB 标题异常: ${epubMeta.title}`)

  const epubUrl = toMyReaderUrl(fixtures.epub)
  assert(epubUrl.startsWith('myreader://'), `协议 URL 异常: ${epubUrl}`)

  const pdfBuf = await fs.readFile(fixtures.pdf)
  assert(pdfBuf.length > 100, 'PDF 文件过小')

  const txt = await readTxtFile(fixtures.txt, 'UTF-8')
  assert(txt.text.includes('UTF-8'), 'TXT 内容解码失败')
}

async function testAcc004Progress(bookIds: string[]) {
  const bookId = bookIds[0]
  saveProgress(bookId, { cfi: 'test-cfi', page: 2 }, 42.5)
  closeDatabase()

  initDatabase()
  const restored = getProgress(bookId)
  assert(restored, '进度未恢复')
  assert(restored.progress_percent === 42.5, `进度百分比 ${restored.progress_percent}`)
  const pos = JSON.parse(restored.position) as { cfi?: string }
  assert(pos.cfi === 'test-cfi', `位置 JSON 异常: ${restored.position}`)
}

async function testAcc005Theme() {
  assert(DEFAULT_SETTINGS.theme === 'light', '默认主题应为 light')
  setSetting('theme', 'dark')
  const all = getAllSettings()
  assert(all.theme === 'dark', `主题未保存: ${all.theme}`)
  setSetting('theme', 'light')
  assert(getAllSettings().theme === 'light', '切回 light 失败')

  const settingsSrc = await readSource('src/pages/SettingsPage.tsx')
  assert(settingsSrc.includes('ThemeSettings'), '设置页缺少主题控件')
  assert(settingsSrc.includes('applyTheme'), '设置页缺少 applyTheme')
}

async function testAcc006ReadingLayout() {
  assert(DEFAULT_SETTINGS.fontSize === '18', '默认字号异常')
  assert(DEFAULT_SETTINGS.readingWidth === '720', '默认阅读宽度异常')
  assert(DEFAULT_SETTINGS.libraryView === 'list', '默认书库排列应为 list')
  setSetting('fontSize', '20')
  setSetting('readingWidth', '800')
  setSetting('libraryView', 'grid')
  const all = getAllSettings()
  assert(all.fontSize === '20' && all.readingWidth === '800', '阅读布局设置未持久化')
  assert(all.libraryView === 'grid', '书库排列未持久化')
  setSetting('libraryView', 'list')

  const settingsPage = await readSource('src/pages/SettingsPage.tsx')
  assert(settingsPage.includes('LibraryViewSettings'), '设置页缺少书库排列控件')
}

async function testAcc007EpubToc() {
  const epubSrc = await readSource('src/components/reader/EpubReader.tsx')
  assert(epubSrc.includes('TocTree'), 'EpubReader 缺少目录树')
  assert(epubSrc.includes('goToHref'), 'EpubReader 缺少目录跳转')
  assert(epubSrc.includes('view.book?.toc'), 'EpubReader 未读取 foliate toc')
}

async function testAcc008PdfPages(fixtures: Awaited<ReturnType<typeof writeFixtures>>) {
  const pdfSrc = await readSource('src/components/reader/PdfReader.tsx')
  assert(pdfSrc.includes('jumpToPage'), 'PdfReader 缺少页码跳转')
  assert(pdfSrc.includes('numPages'), 'PdfReader 缺少总页数')

  const buf = await fs.readFile(fixtures.pdf)
  assert(buf.toString('utf8').startsWith('%PDF'), 'PDF 魔数校验失败')
}

async function testAcc009TxtEncoding(
  fixtures: Awaited<ReturnType<typeof writeFixtures>>,
) {
  const explicitCases: { file: string; encoding: string; needle: string }[] = [
    { file: fixtures.txt, encoding: 'UTF-8', needle: 'UTF-8' },
    { file: fixtures.txtGbk, encoding: 'GBK', needle: 'GBK' },
    { file: fixtures.txtBig5, encoding: 'Big5', needle: '繁體' },
  ]

  for (const c of explicitCases) {
    const { text } = await readTxtFile(c.file, c.encoding)
    assert(text.length > 0, `${c.encoding} 解码为空`)
    assert(text.includes(c.needle), `${c.encoding} 内容不匹配`)
    assert(!text.includes('\uFFFD'), `${c.encoding} 出现替换字符`)
  }

  const utf8Raw = await fs.readFile(fixtures.txt)
  assert(detectTxtEncoding(utf8Raw) === 'UTF-8', 'UTF-8 自动检测失败')

  const gb18030Path = path.join(path.dirname(fixtures.txtGbk), 'sample-gb18030.txt')
  await fs.writeFile(gb18030Path, iconv.encode('GB18030 扩展汉字测试', 'gb18030'))
  const { text: gbText } = await readTxtFile(gb18030Path, 'GB18030')
  assert(gbText.includes('GB18030'), 'GB18030 解码失败')
}

async function testAcc010Performance(fixtures: Awaited<ReturnType<typeof writeFixtures>>) {
  const line = '性能测试行。\n'
  const lineBytes = Buffer.byteLength(line, 'utf8')
  const targetSize = 2 * 1024 * 1024 + lineBytes
  const bigPath = path.join(path.dirname(fixtures.txt), 'perf-2mb.txt')
  await fs.writeFile(bigPath, line.repeat(Math.ceil(targetSize / lineBytes)), 'utf8')

  const info = await getTxtFileInfo(bigPath)
  assert(info.totalBytes > info.chunkBytes, '应用 2MB 大文件 fixture')

  const t0 = performance.now()
  let offset = 0
  let chunks = 0
  let chars = 0
  while (offset < info.totalBytes) {
    const chunk = await readTxtChunk(bigPath, 'UTF-8', offset, info.chunkBytes)
    assert(chunk.text.length > 0, '分块内容为空')
    chars += chunk.text.length
    offset += chunk.byteLength
    chunks++
    if (!chunk.hasMore) break
  }
  const elapsed = performance.now() - t0

  assert(chunks >= 2, `大文件应分 ${chunks} 块读取`)
  assert(chars > 0, '分块解码字符数为 0')
  assert(elapsed < 5000, `2MB 分块读取过慢: ${elapsed.toFixed(0)}ms`)

  const full = await readTxtFile(fixtures.txt, 'UTF-8')
  assert(!full.truncated, '小文件不应标记为截断')
}

async function testAcc011LocalOnly(tmpData: string) {
  const dbPath = getDbPath()
  assert(dbPath.startsWith(tmpData), `数据库不在测试 userData: ${dbPath}`)
  assert(!dbPath.includes('http'), '数据库路径异常')

  const handlers = await readSource('electron/ipc/handlers.ts')
  assert(!/fetch\s*\(\s*['"`]https?:/.test(handlers), 'IPC handlers 含远程 fetch')
  assert(handlers.includes('importBooksFromPaths'), '缺少本地导入 IPC')

  const preload = await readSource('electron/preload.ts')
  assert(preload.includes('contextBridge.exposeInMainWorld'), 'preload 未暴露受限 API')
}

async function testSecurityStatic() {
  const main = await readSource('electron/main.ts')
  assert(/contextIsolation:\s*true/.test(main), 'main: contextIsolation 未启用')
  assert(/nodeIntegration:\s*false/.test(main), 'main: nodeIntegration 未禁用')
  assert(/sandbox:\s*true/.test(main), 'main: sandbox 未启用')
}

async function testAcc012I18n() {
  assert(DEFAULT_SETTINGS.locale === 'system', '默认 locale 应为 system')

  setSetting('locale', 'zh-TW')
  assert(getAllSettings().locale === 'zh-TW', 'locale zh-TW 未持久化')
  setSetting('locale', 'en')
  assert(getAllSettings().locale === 'en', 'locale en 未持久化')
  setSetting('locale', 'system')
  assert(getAllSettings().locale === 'system', 'locale system 未持久化')

  const {
    resolveAppLocale,
    resolveLanguageTag,
    resolveSystemLocaleFromTags,
  } = await import('../src/lib/i18n/locale.ts')

  assert(resolveLanguageTag('zh-CN') === 'zh-CN', 'zh-CN 映射失败')
  assert(resolveLanguageTag('zh-Hans') === 'zh-CN', 'zh-Hans 应映射简体')
  assert(resolveLanguageTag('zh-TW') === 'zh-TW', 'zh-TW 映射失败')
  assert(resolveLanguageTag('zh-HK') === 'zh-TW', 'zh-HK 应映射繁体')
  assert(resolveLanguageTag('en-US') === 'en', 'en-US 应映射英文')
  assert(resolveLanguageTag('ja-JP') === null, '日语不应直接映射')

  assert(
    resolveSystemLocaleFromTags(['ja-JP', 'fr-FR']) === 'en',
    '未支持系统语言应回退英文',
  )
  assert(
    resolveSystemLocaleFromTags(['zh-TW', 'en-US']) === 'zh-TW',
    '繁体系统语言应优先',
  )
  assert(resolveAppLocale('zh-CN') === 'zh-CN', '手动简体偏好')
  assert(resolveAppLocale('zh-TW') === 'zh-TW', '手动繁体偏好')
  assert(resolveAppLocale('en') === 'en', '手动英文偏好')

  const settingsSrc = await readSource('electron/db/settings.ts')
  assert(settingsSrc.includes("locale: 'system'"), 'DEFAULT_SETTINGS 缺少 locale')

  const i18nIndex = await readSource('src/lib/i18n/index.ts')
  assert(i18nIndex.includes("'zh-CN'"), 'i18n 缺少 zh-CN 资源')
  assert(i18nIndex.includes("'zh-TW'"), 'i18n 缺少 zh-TW 资源')
  assert(i18nIndex.includes('en:'), 'i18n 缺少 en 资源')

  const settingsPage = await readSource('src/pages/SettingsPage.tsx')
  assert(settingsPage.includes('LanguageSettings'), '设置页缺少语言设置')
  assert(settingsPage.includes('changeAppLocale'), '设置页缺少 changeAppLocale')
}

async function testFormatDetection() {
  assert(detectFormat('/a/book.epub') === 'epub', 'epub 格式识别失败')
  assert(detectFormat('/a/book.TXT') === 'txt', 'txt 格式识别失败')
  assert(detectFormat('/a/book.pdf') === 'pdf', 'pdf 格式识别失败')
  assert(detectFormat('/a/book.doc') === null, '应拒绝不支持格式')
}

async function testDbV1Migration(tmpData: string) {
  closeDatabase()
  const v1Dir = path.join(tmpData, 'v1-sim')
  await fs.mkdir(v1Dir, { recursive: true })
  const dbPath = path.join(v1Dir, 'my-reader.db')

  const legacy = new Database(dbPath)
  legacy.exec(`CREATE TABLE schema_version (version INTEGER PRIMARY KEY NOT NULL)`)
  legacy.prepare('INSERT INTO schema_version (version) VALUES (1)').run()
  legacy.exec(`
    CREATE TABLE books (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      author TEXT,
      format TEXT NOT NULL CHECK (format IN ('epub', 'txt', 'pdf')),
      file_path TEXT NOT NULL UNIQUE,
      file_size INTEGER NOT NULL DEFAULT 0,
      cover_path TEXT,
      imported_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`)
  legacy.exec(`
    CREATE TABLE reading_progress (
      book_id TEXT PRIMARY KEY NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      position TEXT NOT NULL DEFAULT '{}',
      progress_percent REAL NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    )`)
  legacy.exec(`
    CREATE TABLE settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )`)
  legacy.close()

  const previous = process.env.MYREADER_TEST_DATA
  process.env.MYREADER_TEST_DATA = v1Dir
  initDatabase()

  const progressCols = getDatabase()
    .prepare('PRAGMA table_info(reading_progress)')
    .all() as { name: string }[]
  assert(
    progressCols.some((col) => col.name === 'last_read_at'),
    'v1 升级后缺少 last_read_at',
  )

  const bookCols = getDatabase()
    .prepare('PRAGMA table_info(books)')
    .all() as { name: string }[]
  assert(
    bookCols.some((col) => col.name === 'is_favorite'),
    'v1 升级后缺少 is_favorite',
  )

  listBooks({ sort: 'recentRead' })
  assert(listRecentBooks(4).length === 0, '空库 recent 应为 0')

  closeDatabase()
  process.env.MYREADER_TEST_DATA = previous
  initDatabase()
}

export async function runMvpSmokeTests(tmpData: string): Promise<void> {
  process.env.MYREADER_TEST_DATA = tmpData

  console.log('MVP Smoke Test')
  console.log(`临时数据目录: ${tmpData}\n`)

  try {
    initDatabase()
    const fixtures = await writeFixtures(path.join(tmpData, 'fixtures'))

    try {
      const bookIds = await testAcc001Import(fixtures)
      pass('ACC-001', '导入 EPUB、TXT、PDF', `成功导入 ${bookIds.length} 本`)

      await testAcc002Library(bookIds)
      pass('ACC-002', '书库展示', `listBooks 返回 ${listBooks().length} 本`)

      await testAcc003Read(fixtures)
      partial(
        'ACC-003',
        '打开并阅读',
        '主进程可读 EPUB 元数据 / TXT / PDF；渲染需打包后人工确认',
      )

      await testAcc004Progress(bookIds)
      pass('ACC-004', '阅读进度恢复', '关闭并重开 DB 后进度一致')

      await testAcc005Theme()
      partial('ACC-005', '日夜主题', '设置持久化 + 设置页源码已实现；DOM 切换需人工确认')

      await testAcc006ReadingLayout()
      partial('ACC-006', '字号与阅读宽度', '设置键持久化正常；阅读页样式需人工确认')

      await testAcc007EpubToc()
      partial('ACC-007', 'EPUB 目录跳转', 'EpubReader TocTree + goToHref 已实现；点击跳转需人工确认')

      await testAcc008PdfPages(fixtures)
      partial('ACC-008', 'PDF 页码跳转', 'PdfReader jumpToPage 已实现；渲染跳转需人工确认')

      await testAcc009TxtEncoding(fixtures)
      pass('ACC-009', 'TXT 中文编码', 'UTF-8 / GBK / Big5 / GB18030 解码通过')

      await testAcc010Performance(fixtures)
      pass('ACC-010', '普通文件不卡死', '2MB TXT 分块读取 < 5s')

      await testAcc011LocalOnly(tmpData)
      pass('ACC-011', '数据仅存本机', `DB: ${getDbPath()}`)

      await testAcc012I18n()
      pass(
        'ACC-012',
        '界面国际化',
        'locale 持久化 + 简中/繁中/英文资源 + 系统语言映射',
      )

      await testSecurityStatic()
      pass('SEC', '渲染进程安全配置', 'contextIsolation + sandbox + 无 nodeIntegration')

      await testFormatDetection()
      pass('FMT', '格式识别', 'epub/txt/pdf 扩展名白名单')

      await testDbV1Migration(tmpData)
      pass('DB-002', 'v1 数据库升级', 'last_read_at / is_favorite 迁移与 recentRead 查询')
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      fail('RUN', '未捕获断言', message)
      console.error('\n断言失败:', message)
    }
  } finally {
    closeDatabase()
    try {
      await fs.rm(tmpData, { recursive: true, force: true })
    } catch {
      // ignore cleanup errors on Windows file locks
    }
  }

  printReport()
  const failed = results.filter((r) => r.status === 'fail').length
  if (failed > 0) {
    throw new Error(`${failed} smoke test(s) failed`)
  }
}

function printReport() {
  const icon = (s: Status) => (s === 'pass' ? '✓' : s === 'fail' ? '✗' : '~')
  console.log('\n--- 报告 ---')
  for (const r of results) {
    console.log(`${icon(r.status)} ${r.id} ${r.title}`)
    console.log(`    ${r.detail}`)
  }
  const passN = results.filter((r) => r.status === 'pass').length
  const partialN = results.filter((r) => r.status === 'partial').length
  const failN = results.filter((r) => r.status === 'fail').length
  console.log(`\n合计: ${passN} 通过, ${partialN} 部分(需人工), ${failN} 失败`)
  if (partialN > 0) {
    console.log('部分项请在打包应用上按 docs/SPRINT-8.md 清单人工勾选。')
  }
}
