# Sprint 8：打包、安全与验收

## 图标资源

源图：`build/icon-source.png`（完整品牌图，含下方「摸鱼阅读器」文案）

生成命令：

```bash
pnpm icons
```

输出：

| 路径 | 用途 |
|------|------|
| `build/icon.png` | Electron 主图标（1024×1024） |
| `build/icon.icns` | macOS（开发机生成） |
| `build/icon.ico` | Windows 安装包 / 任务栏 |
| `build/icons/*.png` | Linux AppImage |
| `public/favicon*.png` / `favicon.ico` | 开发窗口 / 内嵌页 |

更换图标：替换 `build/icon-source.png` 后重新执行 `pnpm icons`。

## 打包命令

```bash
pnpm run pack:dir  # 当前平台，未压缩目录（快速验证；勿用 `pnpm pack`，那是 npm 发包命令）
pnpm run dist      # 当前平台安装包
pnpm dist:mac      # macOS dmg + zip
pnpm dist:win      # Windows NSIS
pnpm dist:linux    # Linux AppImage
```

产物目录：`release/`

## 安全配置（已核对）

- 渲染进程：`contextIsolation: true`，`nodeIntegration: false`，`sandbox: true`
- 仅通过 `preload` + `contextBridge` 暴露 `electronAPI`
- 本地文件：`myreader://` 协议 + 主进程 IPC 读文件
- IPC 白名单见 `electron/ipc/handlers.ts`（书籍、进度、设置、TXT/PDF 读取）

## MVP 验收清单（§6）

在打包应用上逐项勾选：

| 编号 | 验收项 | 状态 |
|------|--------|------|
| ACC-001 | 导入 EPUB、TXT、PDF | 待验证 |
| ACC-002 | 书库展示 | 待验证 |
| ACC-003 | 打开并阅读 | 待验证 |
| ACC-004 | 进度恢复 | 待验证 |
| ACC-005 | 日夜主题 | 待验证 |
| ACC-006 | 字号与阅读宽度 | 待验证 |
| ACC-007 | EPUB 目录跳转 | 待验证 |
| ACC-008 | PDF 页码跳转 | 待验证 |
| ACC-009 | TXT 中文编码 | 待验证 |
| ACC-010 | 普通文件不卡死 | 待验证 |
| ACC-011 | 数据仅存本机 | 待验证 |
| ACC-012 | 界面语言：简中/繁中/英文；默认跟随系统；设置可切换；未支持系统语言时显示英文 | 待验证 |

### ACC-012 验证要点

- 首次安装、未手动设置时，界面语言与系统语言一致（简中/繁中/英文）。
- 系统语言为日语、法语等未支持语言时，界面显示英文。
- 设置 → 界面语言可切换：跟随系统、简体中文、繁体中文、英文；切换后立即生效。
- 重启应用后，语言选择与「跟随系统」设置仍保持。

详细已知问题：`docs/KNOWN-ISSUES.md`
