#!/usr/bin/env bash
set -euo pipefail

# better-sqlite3 / electron-builder（AppImage / deb）在 Linux CI 上的构建依赖
sudo apt-get update
sudo apt-get install -y \
  build-essential \
  python3 \
  libsqlite3-dev \
  libfuse2 \
  fuse \
  fakeroot \
  rpm \
  icnsutils \
  graphicsmagick \
  xz-utils \
  ruby-full \
  ruby-dev

# deb 打包优先使用系统 fpm，避免 CI 下载 electron-builder-binaries 时网络失败
sudo gem install fpm --no-document
if [ -n "${GITHUB_PATH:-}" ]; then
  echo "$(ruby -e 'print Gem.user_dir')/bin" >> "$GITHUB_PATH"
fi
