#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/ArcoMenubarTasks.app"
BIN="$ROOT/.build/release/ArcoMenubarTasks"

cd "$ROOT"
swift build -c release

rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS"
cp "$ROOT/Info.plist" "$APP/Contents/Info.plist"
cp "$BIN" "$APP/Contents/MacOS/ArcoMenubarTasks"
chmod +x "$APP/Contents/MacOS/ArcoMenubarTasks"

echo "Built $APP"
