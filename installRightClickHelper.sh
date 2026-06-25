#!/bin/sh
# Copyright 2013 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

set -e

HOST_BIN=""
HOST_APP_SOURCE=""
HOST_APP_TARGET=""
APP_INSTALL_DIR=""
HOST_PATH=""
MANIFEST_DIRS=""
PREBUILT_ASSET=""
PREBUILT_DEST=""
PREBUILT_EXPECTED=""
RELEASE_BASE_URL="https://github.com/tofuliang/smartup/releases/latest/download"

browser_app_exists() {
  app_name="$1"
  if [ -d "/Applications/$app_name" ] || [ -d "$HOME/Applications/$app_name" ]; then
    return 0
  fi
  return 1
}

browser_command_exists() {
  command_name="$1"
  command -v "$command_name" >/dev/null 2>&1
}

append_manifest_dir() {
  if [ -z "$MANIFEST_DIRS" ]; then
    MANIFEST_DIRS="$1"
  else
    MANIFEST_DIRS="$MANIFEST_DIRS
$1"
  fi
}

ensure_manifest_dirs() {
  printf '%s\n' "$MANIFEST_DIRS" | while IFS= read -r manifest_dir; do
    [ -n "$manifest_dir" ] && mkdir -p "$manifest_dir"
  done
}

install_manifest_to_dirs() {
  manifest_path="$1"
  printf '%s\n' "$MANIFEST_DIRS" | while IFS= read -r manifest_dir; do
    if [ -n "$manifest_dir" ]; then
      cp "$manifest_path" "$manifest_dir/$HOST_NAME.json"
      chmod o+r "$manifest_dir/$HOST_NAME.json"
    fi
  done
}

download_release_asset() {
  asset_name="$1"
  destination="$2"
  expected_path="$3"
  archive_url="$RELEASE_BASE_URL/$asset_name"
  temp_dir="$(mktemp -d)"
  archive_path="$temp_dir/$asset_name"
  staged_destination="$temp_dir/extracted"
  expected_relative_path=${expected_path#"$destination"/}

  cleanup() {
    rm -rf "$temp_dir"
  }

  if command -v curl >/dev/null 2>&1; then
    if ! curl -fL "$archive_url" -o "$archive_path"; then
      cleanup
      return 1
    fi
  elif command -v wget >/dev/null 2>&1; then
    if ! wget -O "$archive_path" "$archive_url"; then
      cleanup
      return 1
    fi
  else
    echo "Neither curl nor wget is available to download prebuilt helper assets."
    cleanup
    return 1
  fi

  if ! command -v unzip >/dev/null 2>&1; then
    echo "unzip is required to extract prebuilt helper assets."
    cleanup
    return 1
  fi

  validate_release_archive_contents() {
    archive_name="$1"
    zip_path="$2"
    entries="$(unzip -Z1 "$zip_path")"

    if [ -z "$entries" ]; then
      return 1
    fi

    printf '%s\n' "$entries" | while IFS= read -r entry; do
      [ -z "$entry" ] && continue
      case "$entry" in
        /*|../*|*/../*|*'/../'*)
          return 1
          ;;
      esac

      case "$archive_name" in
        smartup-darwin-arm64.zip|smartup-darwin-amd64.zip)
          case "$entry" in
            smartUp.app|smartUp.app/*) ;;
            *) return 1 ;;
          esac
          ;;
        smartup-linux-amd64.zip)
          case "$entry" in
            smartup-right-click-helper) ;;
            *) return 1 ;;
          esac
          ;;
        *)
          return 1
          ;;
      esac
    done
  }

  if ! validate_release_archive_contents "$asset_name" "$archive_path"; then
    echo "Downloaded prebuilt helper asset has unexpected contents."
    cleanup
    return 1
  fi

  mkdir -p "$staged_destination"
  if ! unzip -q "$archive_path" -d "$staged_destination"; then
    cleanup
    return 1
  fi

  if [ ! -e "$staged_destination/$expected_relative_path" ]; then
    cleanup
    return 1
  fi

  rm -rf "$destination"
  mkdir -p "$destination"
  cp -R "$staged_destination/." "$destination"

  cleanup
  return 0
}

print_manual_build_instructions() {
  echo "Failed to download a prebuilt right click helper for this platform."
  echo "Please build it manually:"
  echo "  cd \"$DIR/rightClickHelper\" && cargo build --release"
  if [ "$(uname -s)" = "Darwin" ]; then
    echo "For macOS app bundles, also run:"
    echo "  cd \"$DIR/rightClickHelper\" && ./build-darwin-arm64-app.sh --dev"
  fi
}

DIR="$( cd "$( dirname "$0" )" && pwd )"
if [ "$(uname -s)" = "Darwin" ]; then
  SED="/usr/bin/sed -i ''"
  if [ "$(/usr/bin/uname -m)" = "arm64" ]; then
    HOST_APP_SOURCE="$DIR/rightClickHelper/dist/darwin_arm64/smartUp.app"
    PREBUILT_ASSET="smartup-darwin-arm64.zip"
    PREBUILT_DEST="$DIR/rightClickHelper/dist/darwin_arm64"
    PREBUILT_EXPECTED="$HOST_APP_SOURCE"
  else
    HOST_APP_SOURCE="$DIR/rightClickHelper/dist/darwin_amd64/smartUp.app"
    PREBUILT_ASSET="smartup-darwin-amd64.zip"
    PREBUILT_DEST="$DIR/rightClickHelper/dist/darwin_amd64"
    PREBUILT_EXPECTED="$HOST_APP_SOURCE"
  fi
  if [ "$(whoami)" = "root" ]; then
    APP_INSTALL_DIR="/Applications"
    TARGET_DIR="/Library/Google/Chrome/NativeMessagingHosts"
    browser_app_exists "Google Chrome.app" && append_manifest_dir "$TARGET_DIR"
    browser_app_exists "Microsoft Edge.app" && append_manifest_dir "/Library/Microsoft/Edge/NativeMessagingHosts"
    browser_app_exists "Brave Browser.app" && append_manifest_dir "/Library/Application Support/BraveSoftware/Brave-Browser/NativeMessagingHosts"
    browser_app_exists "Chromium.app" && append_manifest_dir "/Library/Chromium/NativeMessagingHosts"
  else
    APP_INSTALL_DIR="$HOME/Applications"
    TARGET_DIR="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
    browser_app_exists "Google Chrome.app" && append_manifest_dir "$TARGET_DIR"
    browser_app_exists "Microsoft Edge.app" && append_manifest_dir "$HOME/Library/Application Support/Microsoft Edge/NativeMessagingHosts"
    browser_app_exists "Brave Browser.app" && append_manifest_dir "$HOME/Library/Application Support/BraveSoftware/Brave-Browser/NativeMessagingHosts"
    browser_app_exists "Chromium.app" && append_manifest_dir "$HOME/Library/Application Support/Chromium/NativeMessagingHosts"
  fi
else
  SED="/usr/bin/sed -i"
  HOST_BIN="$DIR/rightClickHelper/target/release/smartup-right-click-helper"
  if [ "$(/usr/bin/uname -m)" = "x86_64" ]; then
    PREBUILT_ASSET="smartup-linux-amd64.zip"
    PREBUILT_DEST="$DIR/rightClickHelper/target/release"
    PREBUILT_EXPECTED="$HOST_BIN"
  fi
  if [ "$(whoami)" = "root" ]; then
    TARGET_DIR="/etc/opt/chrome/native-messaging-hosts"
    browser_command_exists google-chrome && append_manifest_dir "$TARGET_DIR"
    browser_command_exists microsoft-edge && append_manifest_dir "/etc/opt/edge/native-messaging-hosts"
    browser_command_exists chromium && append_manifest_dir "/etc/chromium/native-messaging-hosts"
    browser_command_exists brave-browser && append_manifest_dir "/etc/opt/brave.com/brave/native-messaging-hosts"
  else
    TARGET_DIR="$HOME/.config/google-chrome/NativeMessagingHosts"
    browser_command_exists google-chrome && append_manifest_dir "$TARGET_DIR"
    browser_command_exists microsoft-edge && append_manifest_dir "$HOME/.config/microsoft-edge/NativeMessagingHosts"
    browser_command_exists chromium && append_manifest_dir "$HOME/.config/chromium/NativeMessagingHosts"
    browser_command_exists brave-browser && append_manifest_dir "$HOME/.config/BraveSoftware/Brave-Browser/NativeMessagingHosts"
  fi
fi

if [ -n "$PREBUILT_ASSET" ] && [ ! -e "$PREBUILT_EXPECTED" ]; then
  if download_release_asset "$PREBUILT_ASSET" "$PREBUILT_DEST" "$PREBUILT_EXPECTED"; then
    echo "Downloaded prebuilt helper asset $PREBUILT_ASSET."
  else
    print_manual_build_instructions
    exit 1
  fi
elif [ "$(uname -s)" != "Darwin" ] && [ ! -f "$HOST_BIN" ]; then
  print_manual_build_instructions
  exit 1
fi

HOST_NAME=com.smartup.rightclickhelper

# Create directory to store native messaging host.
if [ -n "$APP_INSTALL_DIR" ]; then
  mkdir -p "$APP_INSTALL_DIR"
fi
ensure_manifest_dirs

if [ -z "$MANIFEST_DIRS" ]; then
  echo "No supported browser installation found for Chrome, Edge, Brave, or Chromium."
  exit 1
fi

if [ -n "$HOST_APP_SOURCE" ] && [ -d "$HOST_APP_SOURCE" ]; then
  HOST_APP_TARGET="$APP_INSTALL_DIR/smartUp.app"
  HOST_PATH="$HOST_APP_TARGET/Contents/MacOS/smartUpRightClickHelper"
elif [ -f "$HOST_BIN" ]; then
  HOST_PATH="$TARGET_DIR/smartUpRightClickHelper"
else
  echo "No app bundle found for $HOST_APP_SOURCE and no binary found for $HOST_BIN, please build it yourself."
  exit 1
fi

# create native messaging host manifest.
cat << EOF > "/tmp/$HOST_NAME.json"
{
  "name": "com.smartup.rightclickhelper",
  "description": "Right Click Helper for SmartUp on Google Chrome and Microsoft Edge",
  "path": "HOST_PATH",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://okhdcmknlkpjecjobpijmniikbieejln/",
    "chrome-extension://bgjfekefhjemchdeigphccilhncnjldn/",
    "chrome-extension://elponhbfjjjihgeijofonnflefhcbckp/",
    "chrome-extension://jbfidehpoofganklkddfkcjeeaabimmb/",
    "chrome-extension://hmnleooedcglhpgnfbnigbemebbmmocp/"
  ]
}
EOF

# Update host path in the manifest.
ESCAPED_HOST_PATH=$(printf '%s' "$HOST_PATH" | sed 's/[\\&]/\\&/g; s/\//\\\//g')

$SED "s/HOST_PATH/$ESCAPED_HOST_PATH/" "/tmp/$HOST_NAME.json"
install_manifest_to_dirs "/tmp/$HOST_NAME.json"
rm -f "/tmp/$HOST_NAME.json"

if [ -n "$HOST_APP_SOURCE" ] && [ -d "$HOST_APP_SOURCE" ]; then
  rm -rf "$HOST_APP_TARGET"
  cp -R "$HOST_APP_SOURCE" "$HOST_APP_TARGET"
  if [ ! -x "$HOST_PATH" ]; then
    echo "Installed app is missing executable at $HOST_PATH"
    exit 1
  fi
  chmod +x "$HOST_PATH"
  echo "Native messaging host $HOST_NAME app has been installed to $HOST_APP_TARGET."
elif [ -f "$HOST_BIN" ]; then
  cp "$HOST_BIN" "$HOST_PATH"
  chmod +x "$HOST_PATH"
  echo "Native messaging host $HOST_NAME has been installed to $HOST_PATH."
fi
