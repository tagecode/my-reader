# 摸鱼阅读器 — 已知问题（MVP v0.1.0）

最后更新：2026-06-06

## 打包与平台

| 问题 | 影响 | 说明 |
|------|------|------|
| Windows 安装包验证有限 | 低 | 已在 Windows x64 本机验证 `pnpm dist:win` 与 NSIS 安装；Release CI 产物建议再冒烟测试。 |
| Linux / macOS 安装包待 Release 实机确认 | 中 | CI 已配置多平台矩阵；首次公开发布后需从 GitHub Releases 下载验证。 |
| 安装包未代码签名 | 中 | macOS / Windows 首次打开可能有安全提示；见 `CHANGELOG.md` 与 Release 说明。 |
| 文件关联需安装后手动确认 | 低 | `electron-builder` 已声明 `.epub` / `.txt` / `.pdf`；系统是否设为默认打开方式取决于用户授权。 |
| `better-sqlite3` 原生模块 | 中 | 打包依赖 `npmRebuild`；若目标平台缺少编译工具链，需在 CI 使用对应 runner 预编译。 |

## 阅读体验

| 问题 | 影响 | 说明 |
|------|------|------|
| 超大 PDF 仍可能卡顿 | 中 | 已用 Worker + 按需渲染；极端页数/扫描件仍受机器性能限制。 |
| 部分 EPUB 复杂排版 | 低 | `foliate-js` 覆盖常见 EPUB；极少数固定版式或脚本书可能显示异常。 |
| MOBI / AZW3 等格式 | — | 不在 MVP 范围。 |

## 书库与数据

| 问题 | 影响 | 说明 |
|------|------|------|
| 书籍源文件仅存路径 | 低 | 移动/删除原文件会导致无法打开；移除书库记录不删除磁盘文件。 |
| PDF 封面生成耗时 | 低 | 首次进入书库会为缺封面 PDF 批量渲染第一页，大库可能短暂 loading。 |

## 图标

| 问题 | 影响 | 说明 |
|------|------|------|
| 品牌源图含下方文案 | — | 使用 `pnpm icons` 从 `build/icon-source.png` 自动检测图标区域裁剪；若布局变化可调整 `WHITE_ROW_RATIO` / `MIN_GAP_HEIGHT`。 |

## 后续计划（Phase 2 方向）

- 书库排序、最近阅读
- 书内搜索与全文索引
- 更多格式与 PDF 性能优化
- 代码签名（macOS 公证 / Windows Authenticode）
