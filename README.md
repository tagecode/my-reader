# 摸鱼阅读器（My Reader）

[简体中文](README.md) | **[English](README.en.md)**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.1.0-green.svg)](CHANGELOG.md)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey.svg)](#支持平台)

一款跨平台、**纯本地优先**的桌面电子书阅读器。支持 EPUB、TXT、PDF，书库与阅读进度全部保存在本机，无需账号、无需联网。

[功能特性](#功能特性) · [下载安装](#下载安装) · [快速上手](#快速上手) · [开发指南](#开发指南) · [文档](#文档) · [参与贡献](#参与贡献)

---

## 功能特性

- **多格式阅读** — EPUB（目录跳转）、PDF（页码跳转）、TXT（分块加载）
- **本地书库** — 导入、搜索、封面展示；横排（列表）/ 竖排（网格）两种布局，**设置中可切换，默认横排**
- **阅读进度** — 自动保存，关闭应用后再次打开可恢复
- **阅读设置** — 日间/夜间主题、字号、阅读宽度、字体选择
- **中文编码** — TXT 自动识别 UTF-8、GBK、Big5、GB18030 等常见编码
- **界面国际化** — 简体中文 / 繁体中文 / English，默认跟随系统语言
- **隐私优先** — 不采集用户数据，不上传书籍内容

## 支持格式

| 格式 | 阅读 | 目录/跳转 | 备注 |
|------|------|-----------|------|
| EPUB | ✅ | 目录跳转 | 基于 [foliate-js](https://github.com/johnfactotum/foliate-js) |
| PDF | ✅ | 页码跳转 | 基于 [PDF.js](https://mozilla.github.io/pdf.js/)，Worker 按需渲染 |
| TXT | ✅ | — | 大文件分块读取，常见中文编码自动检测 |
| MOBI / AZW3 | — | — | 不在当前版本范围 |

## 支持平台

| 平台 | 架构 | 安装包格式 |
|------|------|------------|
| macOS | arm64（Apple Silicon）、x64（Intel） | `.dmg`、`.zip` |
| Windows | x64 | `.exe`（NSIS 安装程序） |
| Linux | x64、arm64 | `.AppImage`、`.deb` |

## 下载安装

前往 [GitHub Releases](https://github.com/tagecode/my-reader/releases) 下载对应平台的安装包。

产物命名规则：`MyReader-v{version}-{os}-{arch}.{ext}`

### macOS

1. 下载 `.dmg` 或 `.zip`
2. 将「摸鱼阅读器」拖入「应用程序」文件夹
3. 首次打开若提示「无法验证开发者」，请前往 **系统设置 → 隐私与安全性** 点击「仍要打开」，或右键应用选择「打开」

> 当前版本未进行 Apple 代码签名与公证，属正常现象。详见 [CHANGELOG](CHANGELOG.md)。

### Windows

1. 下载 `.exe` 安装程序
2. 按向导完成安装（支持创建桌面与开始菜单快捷方式）
3. 若 SmartScreen 提示「未知发布者」，点击「更多信息」→「仍要运行」

### Linux

- **AppImage**：`chmod +x MyReader-*.AppImage && ./MyReader-*.AppImage`
- **deb**：`sudo dpkg -i MyReader-*.deb`

## 快速上手

1. **导入书籍** — 在书库页点击「导入」，或直接拖拽 `.epub` / `.txt` / `.pdf` 文件到窗口
2. **开始阅读** — 在书库中点击书籍封面或「阅读」按钮
3. **调整设置** — 阅读页工具栏可切换主题、字号、宽度；「设置」页可配置语言与默认阅读偏好
4. **恢复进度** — 再次打开同一本书时自动跳转到上次阅读位置

### 数据存储位置

书籍元数据、阅读进度与用户设置保存在本机 SQLite 数据库中（通过 Electron `userData` 目录）。书库记录的是**源文件路径**，不会复制书籍内容；移动或删除原文件后将无法打开。

## 开发指南

### 环境要求

- [Node.js](https://nodejs.org/) 22+
- [pnpm](https://pnpm.io/) 10.11.0（见 `packageManager` 字段）
- 各平台原生编译工具链（`better-sqlite3` 需要）：
  - **macOS**：Xcode Command Line Tools
  - **Windows**：Visual Studio Build Tools
  - **Linux**：`build-essential`、`python3`、`libsqlite3-dev`

### 克隆与安装

```bash
git clone https://github.com/tagecode/my-reader.git
cd my-reader
pnpm install
```

### 常用命令

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 启动开发模式（Vite HMR + Electron） |
| `pnpm build` | 构建前端与主进程 |
| `pnpm typecheck` | TypeScript 类型检查 |
| `pnpm lint` | ESLint 检查 |
| `pnpm test:mvp` | MVP 验收自动化测试（主进程 / DB / 编码 / i18n） |
| `pnpm pack:dir` | 本地打包（不生成安装程序，输出到 `release/`） |
| `pnpm dist` | 完整打包（当前平台安装包） |
| `pnpm dist:mac` | 仅 macOS |
| `pnpm dist:win` | 仅 Windows |
| `pnpm dist:linux` | 仅 Linux |
| `pnpm icons` | 从 `build/icon-source.png` 重新生成各平台图标 |

### 项目结构

```
my-reader/
├── electron/           # Electron 主进程（IPC、数据库、文件导入）
├── src/
│   ├── pages/          # 书库、阅读、设置页面
│   ├── components/     # UI 组件（reader / library / layout）
│   ├── lib/i18n/       # 国际化资源与语言切换
│   └── stores/         # Zustand 状态管理
├── scripts/            # 构建、测试、图标生成脚本
├── build/              # 应用图标资源
├── docs/               # 产品与技术文档
└── .github/workflows/  # CI 与 Release 流水线
```

### 技术栈

| 层级 | 技术 |
|------|------|
| 桌面壳 | Electron 41 |
| 前端 | React 19、TypeScript、Vite 8、Tailwind CSS 4 |
| 状态 | Zustand |
| 本地存储 | better-sqlite3 |
| EPUB 渲染 | foliate-js |
| PDF 渲染 | pdfjs-dist（Web Worker） |
| 国际化 | i18next、react-i18next |
| 打包 | electron-builder |

### 发布流程

1. 更新 `package.json` 中的 `version`
2. 在 `CHANGELOG.md` 中记录变更
3. 创建与版本号一致的 git tag 并推送：

```bash
git tag v0.1.0
git push origin v0.1.0
```

推送 `v*` tag 后将触发 [Release workflow](.github/workflows/release.yml)，自动在 macOS / Windows / Linux 上构建并发布到 GitHub Releases。

## 测试

```bash
pnpm test:mvp
```

自动化测试覆盖书籍导入、书库读写、进度持久化、TXT 编码检测、国际化配置与 Electron 安全设置等。部分验收项（主题切换 DOM 效果、阅读页渲染等）需在打包后的应用上人工确认，清单见 [docs/SPRINT-8.md](docs/SPRINT-8.md)。

## 文档

| 文档 | 说明 |
|------|------|
| [CHANGELOG.md](CHANGELOG.md) | 版本变更记录 |
| [docs/PRD.md](docs/PRD.md) | 产品需求文档 |
| [docs/MVP.md](docs/MVP.md) | MVP 范围与 Sprint 规划 |
| [docs/KNOWN-ISSUES.md](docs/KNOWN-ISSUES.md) | 已知问题与限制 |
| [docs/SPRINT-8.md](docs/SPRINT-8.md) | 发布前验收清单 |

## 已知限制

- 安装包**未进行代码签名**（macOS / Windows 首次运行可能有安全提示）
- 书库仅存文件路径，不复制书籍内容
- 超大 PDF 或复杂 EPUB 在低端设备上可能卡顿
- MOBI、AZW3 等格式暂不支持

完整列表见 [docs/KNOWN-ISSUES.md](docs/KNOWN-ISSUES.md)。

## 参与贡献

欢迎提交 Issue 与 Pull Request。

1. Fork 本仓库
2. 创建功能分支：`git checkout -b feature/your-feature`
3. 提交变更并确保 `pnpm typecheck`、`pnpm lint`、`pnpm test:mvp` 通过
4. 发起 Pull Request

报告 Bug 请使用 [GitHub Issues](https://github.com/tagecode/my-reader/issues)，尽量附上系统版本、复现步骤与相关日志。

## 许可证

本项目基于 [MIT License](LICENSE) 开源。

---

<p align="center">
  <sub>摸鱼阅读器 · 纯本地，安心读</sub>
</p>
