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

自动化：`pnpm test:mvp`（2026-06-07，10 通过 / 5 部分 / 0 失败）。  
打包应用上请对「待打包验证」项逐项人工勾选：

| 编号 | 验收项 | 状态 | 备注 |
|------|--------|------|------|
| ACC-001 | 导入 EPUB、TXT、PDF | 自动化通过 | `test:mvp` |
| ACC-002 | 书库展示 | 自动化通过 | `test:mvp` |
| ACC-003 | 打开并阅读 | 待打包验证 | 渲染需安装包确认 |
| ACC-004 | 进度恢复 | 自动化通过 | `test:mvp` |
| ACC-005 | 日夜主题 | 待打包验证 | 设置持久化已通过；DOM 切换需确认 |
| ACC-006 | 字号与阅读宽度 | 待打包验证 | 设置键持久化已通过 |
| ACC-007 | EPUB 目录跳转 | 待打包验证 | 组件已实现 |
| ACC-008 | PDF 页码跳转 | 待打包验证 | 组件已实现 |
| ACC-009 | TXT 中文编码 | 自动化通过 | `test:mvp` |
| ACC-010 | 普通文件不卡死 | 自动化通过 | `test:mvp` |
| ACC-011 | 数据仅存本机 | 自动化通过 | `test:mvp` |
| ACC-012 | 界面语言：简中/繁中/英文；默认跟随系统；设置可切换；未支持系统语言时显示英文 | 自动化通过；UI 待打包验证 | 资源与持久化已通过 |

### v0.2.0 发布前额外检查（非 ACC 编号）

- [ ] 书签：添加、列表、删除、跳转（EPUB / TXT / PDF 各测一本）
- [ ] 书库：最近阅读、筛选、排序
- [ ] EPUB 大书（如 9MB+）：加载提示、目录搜索、翻页流畅
- [ ] 阅读页：打开目录/设置浮层时 PDF 不变形
- [ ] 夜间模式：EPUB / TXT 正文清晰可读
- [ ] 从 v0.1.0 升级：数据库 v3 迁移、旧进度与书签正常
- [ ] 打 tag `v0.2.0` 并确认 Release workflow 五平台构建成功

### v0.1.0 发布前额外检查（非 ACC 编号）

- [ ] 书库横排/竖排切换与设置页同步
- [ ] 书库封面悬停提示与点击阅读
- [ ] Windows NSIS 安装包安装与启动（本机 `dist:win` 已验证构建）
- [ ] 打 tag `v0.1.0` 并确认 Release workflow 五平台构建成功

### ACC-012 验证要点

- 首次安装、未手动设置时，界面语言与系统语言一致（简中/繁中/英文）。
- 系统语言为日语、法语等未支持语言时，界面显示英文。
- 设置 → 界面语言可切换：跟随系统、简体中文、繁体中文、英文；切换后立即生效。
- 重启应用后，语言选择与「跟随系统」设置仍保持。

详细已知问题：`docs/KNOWN-ISSUES.md`
