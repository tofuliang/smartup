#!/bin/sh

set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
REPO_ROOT="$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)"
PAGE="$REPO_ROOT/html/getpermissions.html"
JS="$REPO_ROOT/js/pages/getpermissons.js"
SW_PERMISSIONS="$REPO_ROOT/js/sw/permissions.js"
SW_DISPATCHER="$REPO_ROOT/js/sw/dispatcher.js"

grep -q 'getper_title' "$PAGE"
grep -q 'value="Get Permissions"' "$PAGE"
grep -q '../js/pages/getpermissons.js' "$PAGE"
grep -q 'chrome.permissions.request' "$JS"
grep -q 'per_getconf' "$JS"
grep -q 'per_clear' "$JS"
grep -q 'origins' "$JS"
grep -q 'pendingPermission' "$SW_PERMISSIONS"
grep -q 'setPendingPermission' "$SW_PERMISSIONS"
grep -q 'getPendingPermission' "$SW_PERMISSIONS"
grep -q 'clearPendingPermission' "$SW_PERMISSIONS"
grep -q 'per_getconf' "$SW_DISPATCHER"
grep -q 'per_resume' "$SW_DISPATCHER"
grep -q 'per_clear' "$SW_DISPATCHER"
grep -q 'opt_getpers' "$SW_DISPATCHER"
grep -q 'message.value?.thepers' "$SW_DISPATCHER"
grep -q 'message.value?.theorgs' "$SW_DISPATCHER"
grep -q 'message.value?.intent' "$SW_DISPATCHER"
grep -q 'return { ok: true }' "$SW_DISPATCHER"
grep -q 'browserSettings' "$REPO_ROOT/manifest.json"

echo "permissions page contract verified"
