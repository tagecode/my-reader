# 应用图标资源

| 文件 | 说明 |
|------|------|
| `icon-source.png` | 品牌源图（图标 + 下方文案），请勿删除 |
| `icon.png` | 1024×1024 应用主图标（由脚本裁剪生成） |
| `icon.icns` | macOS（在 macOS 上执行 `pnpm icons` 生成） |
| `icon.ico` | Windows |
| `icons/` | Linux 多尺寸 PNG |

重新生成：`pnpm icons`。脚本会自动检测顶部留白，并在图标与下方文字之间的白缝处裁切；若源图布局变化，可调整 `scripts/generate-icons.mjs` 中的 `WHITE_ROW_RATIO` / `MIN_GAP_HEIGHT`。
