# My Reader (摸鱼阅读器)

**English** | [简体中文](README.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.1.0-green.svg)](CHANGELOG.md)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey.svg)](#supported-platforms)

A cross-platform, **local-first** desktop e-book reader. Supports EPUB, TXT, and PDF. Your library and reading progress stay on your machine — no account, no cloud sync required.

[Features](#features) · [Download](#download--install) · [Quick Start](#quick-start) · [Development](#development) · [Docs](#documentation) · [Contributing](#contributing)

---

## Features

- **Multi-format reading** — EPUB (table of contents), PDF (page jump), TXT (chunked loading)
- **Local library** — Import, search, cover thumbnails; **list (horizontal) or grid (vertical) layout**, configurable in Settings (list is default)
- **Reading progress** — Auto-saved; resume where you left off after reopening the app
- **Reader settings** — Day/night theme, font size, reading width, font family
- **Chinese text encodings** — Auto-detect UTF-8, GBK, Big5, GB18030, and other common encodings for TXT
- **Internationalization** — Simplified Chinese, Traditional Chinese, English; follows system language by default
- **Privacy-first** — No user tracking, no book content uploaded

## Supported Formats

| Format | Read | Navigation | Notes |
|--------|------|------------|-------|
| EPUB | ✅ | TOC jump | Powered by [foliate-js](https://github.com/johnfactotum/foliate-js) |
| PDF | ✅ | Page jump | Powered by [PDF.js](https://mozilla.github.io/pdf.js/), on-demand rendering via Web Worker |
| TXT | ✅ | — | Chunked reading for large files; common Chinese encodings auto-detected |
| MOBI / AZW3 | — | — | Not supported in the current release |

## Supported Platforms

| Platform | Architecture | Package format |
|----------|--------------|----------------|
| macOS | arm64 (Apple Silicon), x64 (Intel) | `.dmg`, `.zip` |
| Windows | x64 | `.exe` (NSIS installer) |
| Linux | x64, arm64 | `.AppImage`, `.deb` |

## Download & Install

Get the latest build from [GitHub Releases](https://github.com/tagecode/my-reader/releases).

Artifact naming: `MyReader-v{version}-{os}-{arch}.{ext}`

### macOS

1. Download the `.dmg` or `.zip`
2. Drag **My Reader** into your Applications folder
3. If macOS warns that the developer cannot be verified, go to **System Settings → Privacy & Security** and click **Open Anyway**, or right-click the app and choose **Open**

> Current builds are not Apple code-signed or notarized. See [CHANGELOG](CHANGELOG.md) for details.

### Windows

1. Download the `.exe` installer
2. Follow the setup wizard (desktop and Start Menu shortcuts are created by default)
3. If SmartScreen shows an "Unknown publisher" warning, click **More info** → **Run anyway**

### Linux

- **AppImage**: `chmod +x MyReader-*.AppImage && ./MyReader-*.AppImage`
- **deb**: `sudo dpkg -i MyReader-*.deb`

## Quick Start

1. **Import books** — Click **Import** on the library page, or drag `.epub` / `.txt` / `.pdf` files into the window
2. **Start reading** — Click a book cover or the **Read** button in the library
3. **Adjust settings** — Use the reader toolbar for theme, font size, and width; open **Settings** for language and default reading preferences
4. **Resume progress** — Reopening a book jumps back to your last reading position automatically

### Where data is stored

Book metadata, reading progress, and user settings are stored in a local SQLite database (under Electron's `userData` directory). The library stores **file paths only** — book content is not copied. Moving or deleting the original file will break the link.

## Development

### Requirements

- [Node.js](https://nodejs.org/) 22+
- [pnpm](https://pnpm.io/) 10.11.0 (see the `packageManager` field)
- Native build toolchain for `better-sqlite3`:
  - **macOS**: Xcode Command Line Tools
  - **Windows**: Visual Studio Build Tools
  - **Linux**: `build-essential`, `python3`, `libsqlite3-dev`

### Clone & install

```bash
git clone https://github.com/tagecode/my-reader.git
cd my-reader
pnpm install
```

### Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev mode (Vite HMR + Electron) |
| `pnpm build` | Build renderer and main process |
| `pnpm typecheck` | TypeScript type check |
| `pnpm lint` | ESLint |
| `pnpm test:mvp` | MVP acceptance tests (main process / DB / encoding / i18n) |
| `pnpm pack:dir` | Local pack without installer (output in `release/`) |
| `pnpm dist` | Full package for the current platform |
| `pnpm dist:mac` | macOS only |
| `pnpm dist:win` | Windows only |
| `pnpm dist:linux` | Linux only |
| `pnpm icons` | Regenerate platform icons from `build/icon-source.png` |

### Project layout

```
my-reader/
├── electron/           # Electron main process (IPC, database, import)
├── src/
│   ├── pages/          # Library, reader, settings pages
│   ├── components/     # UI (reader / library / layout)
│   ├── lib/i18n/       # i18n resources and locale switching
│   └── stores/         # Zustand state
├── scripts/            # Build, test, icon generation
├── build/              # App icon assets
├── docs/               # Product and technical docs (mostly Chinese)
└── .github/workflows/  # CI and release pipelines
```

### Tech stack

| Layer | Technology |
|-------|------------|
| Desktop shell | Electron 41 |
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS 4 |
| State | Zustand |
| Local storage | better-sqlite3 |
| EPUB rendering | foliate-js |
| PDF rendering | pdfjs-dist (Web Worker) |
| i18n | i18next, react-i18next |
| Packaging | electron-builder |

### Releasing

1. Bump `version` in `package.json`
2. Record changes in `CHANGELOG.md`
3. Create and push a matching git tag:

```bash
git tag v0.1.0
git push origin v0.1.0
```

Pushing a `v*` tag triggers the [Release workflow](.github/workflows/release.yml), which builds for macOS, Windows, and Linux and publishes to GitHub Releases.

## Testing

```bash
pnpm test:mvp
```

Automated tests cover book import, library CRUD, progress persistence, TXT encoding detection, i18n configuration, and Electron security settings. Some acceptance items (theme DOM behavior, reader rendering, etc.) require manual verification on a packaged build — see [docs/SPRINT-8.md](docs/SPRINT-8.md).

## Documentation

| Document | Description |
|----------|-------------|
| [CHANGELOG.md](CHANGELOG.md) | Release notes |
| [docs/PRD.md](docs/PRD.md) | Product requirements (Chinese) |
| [docs/MVP.md](docs/MVP.md) | MVP scope and sprint plan (Chinese) |
| [docs/KNOWN-ISSUES.md](docs/KNOWN-ISSUES.md) | Known issues and limitations (Chinese) |
| [docs/SPRINT-8.md](docs/SPRINT-8.md) | Pre-release acceptance checklist (Chinese) |

## Known limitations

- Installers are **not code-signed** (macOS / Windows may show security prompts on first launch)
- The library stores file paths only; book files are not copied
- Very large PDFs or complex EPUBs may lag on low-end hardware
- MOBI, AZW3, and similar formats are not supported yet

See [docs/KNOWN-ISSUES.md](docs/KNOWN-ISSUES.md) for the full list.

## Contributing

Issues and pull requests are welcome.

1. Fork this repository
2. Create a branch: `git checkout -b feature/your-feature`
3. Make your changes and ensure `pnpm typecheck`, `pnpm lint`, and `pnpm test:mvp` pass
4. Open a pull request

For bugs, use [GitHub Issues](https://github.com/tagecode/my-reader/issues) and include OS version, steps to reproduce, and relevant logs when possible.

## License

This project is licensed under the [MIT License](LICENSE).

---

<p align="center">
  <sub>My Reader · Local-first, read with peace of mind</sub>
</p>
