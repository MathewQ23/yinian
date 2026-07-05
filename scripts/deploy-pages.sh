#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

npm run build
touch dist/.nojekyll

TMP_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

cp -a dist/. "$TMP_DIR/"

REMOTE_URL="$(git remote get-url origin)"
cd "$TMP_DIR"

git init -b gh-pages
git config user.name "${GIT_AUTHOR_NAME:-mathew}"
git config user.email "${GIT_AUTHOR_EMAIL:-861054376@qq.com}"
git add .
git commit -m "deploy: publish GitHub Pages build"
git remote add origin "$REMOTE_URL"
git push -u origin gh-pages --force
