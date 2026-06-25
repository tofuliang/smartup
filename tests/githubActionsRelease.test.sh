#!/bin/sh

set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
REPO_ROOT="$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)"
WORKFLOW="$REPO_ROOT/.github/workflows/release-right-click-helper.yml"

[ -f "$WORKFLOW" ]
grep -q 'refs/tags/v' "$WORKFLOW"
grep -q 'workflow_dispatch:' "$WORKFLOW"
grep -q 'smartup-darwin-arm64.zip' "$WORKFLOW"
grep -q 'smartup-darwin-amd64.zip' "$WORKFLOW"
grep -q 'smartup-linux-amd64.zip' "$WORKFLOW"
grep -q 'macos-15-arm64' "$WORKFLOW"
grep -q 'macos-15-intel' "$WORKFLOW"
grep -q 'ubuntu-latest' "$WORKFLOW"
grep -q 'softprops/action-gh-release' "$WORKFLOW"

echo "GitHub Actions release workflow contract verified"
