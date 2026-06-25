#!/bin/sh

set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
REPO_ROOT="$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)"
SCRIPT="$REPO_ROOT/installRightClickHelper.sh"

grep -q 'smartUp\.app' "$SCRIPT"
grep -q 'target/release/smartup-right-click-helper' "$SCRIPT"
grep -q 'https://github.com/tofuliang/smartup/releases/latest/download' "$SCRIPT"
grep -Fq 'archive_url="$RELEASE_BASE_URL/$asset_name"' "$SCRIPT"
grep -q 'smartup-darwin-arm64.zip' "$SCRIPT"
grep -q 'smartup-darwin-amd64.zip' "$SCRIPT"
grep -q 'smartup-linux-amd64.zip' "$SCRIPT"
grep -q 'cargo build --release' "$SCRIPT"
grep -q 'unzip -Z1' "$SCRIPT"
grep -q 'validate_release_archive_contents' "$SCRIPT"
grep -q 'staged_destination' "$SCRIPT"
grep -Fq "ESCAPED_HOST_PATH=\$(printf '%s' \"\$HOST_PATH\" | sed" "$SCRIPT"
grep -Fq "\$SED \"s/HOST_PATH/\$ESCAPED_HOST_PATH/\"" "$SCRIPT"

if grep -q 'rm -rf "$destination"' "$SCRIPT" && ! grep -q 'cp -R "$staged_destination/." "$destination"' "$SCRIPT"; then
  echo 'installer still deletes destination before validating archive contents'
  exit 1
fi

if grep -Eq 'smartUpRightClickHelper\.app|dist/darwin_(arm64|amd64)/smartUpRightClickHelper\.app' "$SCRIPT"; then
  echo "legacy macOS app bundle path still present"
  exit 1
fi

if grep -q 'rightClickHelper/linux_amd64' "$SCRIPT"; then
  echo "legacy linux amd64 helper path still present"
  exit 1
fi

if grep -q 'rightClickHelper/linux_arm64' "$SCRIPT"; then
  echo "legacy linux helper paths still present"
  exit 1
fi

grep -q 'Microsoft Edge' "$SCRIPT"
grep -q 'allowed_origins' "$SCRIPT"
grep -q 'bgjfekefhjemchdeigphccilhncnjldn' "$SCRIPT"
grep -q 'elponhbfjjjihgeijofonnflefhcbckp' "$SCRIPT"

echo "installRightClickHelper.sh path contract verified"
echo "installRightClickHelper.sh browser-id contract verified"
