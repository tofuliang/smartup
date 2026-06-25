#!/bin/sh

set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
REPO_ROOT="$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)"

OPTIONS_JS="$REPO_ROOT/js/pages/options.js"
SW_DISPATCHER="$REPO_ROOT/js/sw/dispatcher.js"
SW_ACTION_STATE="$REPO_ROOT/js/sw/action-state.js"

if grep -q 'chrome\.browserAction\.setPopup' "$OPTIONS_JS"; then
  echo "options initPop must not call chrome.browserAction.setPopup directly"
  exit 1
fi

grep -q "type: 'set_action_popup_mode'" "$OPTIONS_JS"
grep -q 'iconEnabled: Boolean(config.general.fnswitch.fnicon)' "$OPTIONS_JS"
grep -q "message.type === 'set_action_popup_mode'" "$SW_DISPATCHER"
grep -q "message.iconEnabled ? '' : 'html/popup.html'" "$SW_DISPATCHER"
grep -q 'services.actionState.setPopup(popup)' "$SW_DISPATCHER"
grep -q 'return actionApi.setPopup({ popup })' "$SW_ACTION_STATE"

echo "action-state popup mode routing contract verified"
