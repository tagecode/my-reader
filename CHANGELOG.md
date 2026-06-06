# Changelog

本文件记录各版本的 notable 变更。版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [0.1.0] - 2026-06-06

首个 MVP 公开发布。

### 功能

- 纯本地桌面阅读器，支持导入与阅读 EPUB、TXT、PDF
- 书库管理、阅读进度自动保存与恢复
- 日间 / 夜间主题，字号与阅读宽度调节
- EPUB 目录跳转、PDF 页码跳转
- TXT 常见中文编码自动识别（UTF-8、GBK、Big5、GB18030 等）
- 界面国际化：简体中文、繁体中文、英文；默认跟随系统语言

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
