# Changelog

本文件记录各版本的 notable 变更。版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [0.2.0] - 2026-06-07

Phase 2 功能与阅读体验增强。

### 新增

- **书签** — 阅读页添加书签，侧栏「目录 / 书签」Tab 管理，支持跳转与删除（EPUB / TXT / PDF）
- **书库增强** — 「最近阅读」区块；按格式、阅读状态筛选；多种排序（最近阅读、标题、导入时间等）
- **EPUB 目录** — 虚拟列表 + 搜索（大书目录更流畅）

### 改进

- **大文件 EPUB** — 导入 metadata 轻量解析（yauzl）；加载过程显示大文件 / 慢加载提示
- **PDF** — 协议层 Range 按需读取，避免整文件进内存
- **TXT** — 编码检测仅读取文件头 64KB，加快大文件打开
- **阅读页布局** — 目录 / 设置改为浮层，不再挤压正文区（修复 PDF 变形）
- **夜间模式** — EPUB 正文注入主题样式，修复深色背景下文字不可见；TXT 阅读区同步主题色

### 其他

- 应用图标资源更新
- 修复 ESLint 阻塞项（`useBookmarks`、`electron.d.ts` 类型导出）

### 已知限制

- 安装包仍未代码签名（macOS / Windows 首次运行可能有安全提示）
- 书籍源文件仅存本地路径；移动或删除原文件后将无法打开
- 超大 PDF 或复杂 EPUB 在低端设备上可能卡顿

[0.2.0]: https://github.com/tagecode/my-reader/releases/tag/v0.2.0

## [0.1.0] - 2026-06-06

首个 MVP 公开发布。

### 功能

- 纯本地桌面阅读器，支持导入与阅读 EPUB、TXT、PDF
- 书库管理：导入、搜索、封面展示；**横排（列表）/ 竖排（网格）** 两种布局，可在设置中切换，默认横排
- 书库封面支持点击阅读，悬停显示阅读提示
- 阅读进度自动保存与恢复
- 日间 / 夜间主题，字号与阅读宽度调节
- EPUB 目录跳转、PDF 页码跳转
- TXT 常见中文编码自动识别（UTF-8、GBK、Big5、GB18030 等）
- 界面国际化：简体中文、繁体中文、英文；默认跟随系统语言
- 隐藏系统菜单栏，界面更简洁（Windows / Linux 彻底隐藏菜单栏）

### 体验与界面

- 设置页内容区居中限宽，操作按钮不再铺满整行
- 窗口标题与页面 `lang` 随界面语言同步

### 开源与发布

- MIT 许可证，`README.md` / `README.en.md` 产品文档
- GitHub Actions：CI + 多平台 Release 流水线
- 安装包未代码签名（macOS / Windows 首次运行可能有安全提示）

### 平台

- macOS（Apple Silicon / Intel）、Windows x64、Linux x64 / arm64

### 安装说明

产物命名：`MyReader-v{version}-{os}-{arch}.{ext}`

| 平台 | 架构 | 格式 |
|------|------|------|
| macOS | arm64 / x64 | `.dmg`、`.zip` |
| Windows | x64 | `.exe`（NSIS 安装包） |
| Linux | x64 / arm64 | `.AppImage`、`.deb` |

### 已知限制

- **macOS 未签名**：当前 CI 构建未进行 Apple 代码签名与公证。首次打开时，系统可能提示「无法验证开发者」；请在「系统设置 → 隐私与安全性」中点击「仍要打开」，或右键应用选择「打开」。
- **Windows SmartScreen**：未购买代码签名证书时，安装程序可能显示未知发布者警告，属正常现象。
- 书籍源文件仅存本地路径；移动或删除原文件后将无法打开。
- 超大 PDF 或复杂 EPUB 在低端设备上可能卡顿。

[0.1.0]: https://github.com/tagecode/my-reader/releases/tag/v0.1.0
