#!/bin/sh

set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
REPO_ROOT="$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)"
MANIFEST="$REPO_ROOT/manifest.json"

python3 - <<'PY' "$MANIFEST"
import json, sys
path = sys.argv[1]
with open(path, 'r', encoding='utf-8') as f:
    data = json.load(f)

assert data["manifest_version"] == 3, "manifest_version must be 3"
assert "background" in data and "service_worker" in data["background"], "background.service_worker missing"
assert "browser_action" not in data, "browser_action must be removed"
assert "action" in data, "action missing"
assert "host_permissions" in data, "host_permissions missing"
assert isinstance(data.get("web_accessible_resources"), list), "web_accessible_resources missing"
assert data.get("permissions") is not None, "permissions missing"
assert "background" not in data.get("optional_permissions", []), "legacy background optional permission still present"
assert "alarms" in data.get("permissions", []), "alarms permission missing for MV3 autoreload runtime"
print("manifest MV3 contract verified")
PY
