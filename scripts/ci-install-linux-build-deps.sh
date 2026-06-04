#!/usr/bin/env bash
set -euo pipefail

# better-sqlite3 / electron-builder（AppImage）在 Linux CI 上的构建依赖
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
  xz-utils
