#!/bin/sh

set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
REPO_ROOT="$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)"

OPTIONS_HTML="$REPO_ROOT/html/options.html"
POPUP_HTML="$REPO_ROOT/html/popup.html"
OPTIONS_JS="$REPO_ROOT/js/pages/options.js"
EN_LOCALE="$REPO_ROOT/_locales/en/messages.json"

reject_pattern() {
  pattern="$1"
  file="$2"
  if grep -q "$pattern" "$file"; then
    echo "unexpected pattern '$pattern' in $file"
    exit 1
  fi
}

reject_pattern 'id="menu_donate"' "$OPTIONS_HTML"
reject_pattern 'id="donate_box"' "$OPTIONS_HTML"
reject_pattern 'id="about_main"' "$OPTIONS_HTML"
reject_pattern 'data-i18n="about"' "$OPTIONS_HTML"
reject_pattern 'data-confobj="about|donatedev"' "$OPTIONS_HTML"
reject_pattern 'data-i18n="moreext"' "$OPTIONS_HTML"
reject_pattern 'data-i18n="translate"' "$OPTIONS_HTML"
reject_pattern 'data-i18n="thanks"' "$OPTIONS_HTML"
reject_pattern 'data-i18n="changelog"' "$OPTIONS_HTML"
reject_pattern 'data-menu="about"' "$POPUP_HTML"
reject_pattern 'change-background' "$OPTIONS_HTML"
reject_pattern 'donateBox' "$OPTIONS_JS"
reject_pattern 'showabout' "$OPTIONS_JS"
reject_pattern 'donateData' "$OPTIONS_JS"
reject_pattern 'abmain_' "$OPTIONS_JS"
reject_pattern 'initLog' "$OPTIONS_JS"
reject_pattern '"con_background"' "$EN_LOCALE"
reject_pattern '"donatedev"' "$EN_LOCALE"
reject_pattern '"con_ad"' "$EN_LOCALE"
reject_pattern '"des_ad"' "$EN_LOCALE"
reject_pattern '"des_adlist0"' "$EN_LOCALE"
reject_pattern '"des_adlist1"' "$EN_LOCALE"

echo "non-core UI cleanup contract verified"
