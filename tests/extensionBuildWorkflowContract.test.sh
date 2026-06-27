#!/bin/sh

set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
REPO_ROOT="$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)"
WORKFLOW="$REPO_ROOT/.github/workflows/build-extension.yml"
MANIFEST="$REPO_ROOT/manifest.json"
UPDATE_XML="$REPO_ROOT/dist/update.xml"

[ -f "$WORKFLOW" ]
[ -f "$MANIFEST" ]
[ -f "$UPDATE_XML" ]

grep -q 'workflow_dispatch:' "$WORKFLOW"
grep -q 'CRX_PRIVATE_KEY' "$WORKFLOW"
grep -q 'npm install crx3' "$WORKFLOW"
grep -q 'npx crx3' "$WORKFLOW"
grep -q 'dist/smartup.crx' "$WORKFLOW"
grep -q 'dist/update.xml' "$WORKFLOW"
grep -q 'git commit' "$WORKFLOW"

if grep -q -- '--pack-extension' "$WORKFLOW"; then
  echo 'workflow must use the crx3 npm package instead of browser --pack-extension'
  exit 1
fi

grep -Eq 'mkdir -p "?\$DIST"?' "$WORKFLOW"
grep -Eq 'cp manifest\.json "?\$DIST/manifest\.json"?' "$WORKFLOW"
grep -Eq 'cp -r html "?\$DIST/html"?' "$WORKFLOW"
grep -Eq 'cp -r js "?\$DIST/js"?' "$WORKFLOW"
grep -Eq 'cp -r css "?\$DIST/css"?' "$WORKFLOW"
grep -Eq 'cp -r _locales "?\$DIST/_locales"?' "$WORKFLOW"
grep -Eq 'cp -r image "?\$DIST/image"?' "$WORKFLOW"
grep -Eq 'cp icon\.png "?\$DIST/icon\.png"?' "$WORKFLOW"

grep -q 'update_url' "$MANIFEST"
grep -q 'dist/update.xml' "$MANIFEST"

grep -q '<gupdate xmlns="http://www.google.com/update2/response" protocol="2.0">' "$UPDATE_XML"
grep -q '<app appid="' "$UPDATE_XML"
grep -q 'codebase="https://raw.githubusercontent.com/tofuliang/smartup/master/dist/smartup.crx"' "$UPDATE_XML"
grep -q 'version="' "$UPDATE_XML"

echo "extension build workflow contract verified"
