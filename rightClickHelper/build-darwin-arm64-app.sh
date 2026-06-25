#!/bin/sh

set -eu

DIR="$(CDPATH= cd -- "$(dirname "$0")" && pwd)"
APP_NAME="smartUp.app"
EXECUTABLE_NAME="smartUpRightClickHelper"
APP_ICON_NAME="AppIcon"
ARCH="${SMARTUP_HELPER_ARCH:-arm64}"
RUST_TARGET="${SMARTUP_HELPER_RUST_TARGET:-aarch64-apple-darwin}"
DIST_DIR="$DIR/dist/darwin_$ARCH"
APP_DIR="$DIST_DIR/$APP_NAME"
SIGN_IDENTITY=""
RUST_MANIFEST="$DIR/Cargo.toml"
RUST_BINARY="$DIR/target/$RUST_TARGET/release/smartup-right-click-helper"
SOURCE_ICON="$DIR/../icon.png"
ICONSET_DIR="$DIST_DIR/${APP_ICON_NAME}.iconset"
APP_ICON="$APP_DIR/Contents/Resources/${APP_ICON_NAME}.icns"
APP_VERSION="$(sed -n 's/^version = "\(.*\)"/\1/p' "$RUST_MANIFEST" | head -n 1)"

usage() {
  printf 'Usage:\n' >&2
  printf '  %s --dev\n' "$0" >&2
  printf '  %s --sign "Developer ID Application: Name (TEAMID)"\n' "$0" >&2
}

if [ "$#" -eq 0 ]; then
  usage
  printf 'Missing signing mode. Use --dev for ad-hoc development builds or --sign for a certificate identity.\n' >&2
  exit 1
fi

case "$1" in
  --dev)
    SIGN_IDENTITY="-"
    printf 'Building development app with ad-hoc signing.\n' >&2
    ;;
  --sign)
    if [ "$#" -lt 2 ] || [ -z "$2" ]; then
      usage
      printf 'Missing certificate identity after --sign.\n' >&2
      exit 1
    fi
    SIGN_IDENTITY="$2"
    printf 'Building signed app with identity: %s\n' "$SIGN_IDENTITY" >&2
    ;;
  *)
    usage
    printf 'Unknown option: %s\n' "$1" >&2
    exit 1
    ;;
esac

if ! command -v cargo >/dev/null 2>&1; then
  printf 'cargo is required to build the Rust right click helper.\n' >&2
  exit 1
fi

rm -rf "$APP_DIR"
rm -rf "$ICONSET_DIR"
mkdir -p "$APP_DIR/Contents/MacOS" "$APP_DIR/Contents/Resources"

cp "$DIR/app/Info.plist" "$APP_DIR/Contents/Info.plist"
/usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString $APP_VERSION" "$APP_DIR/Contents/Info.plist"
/usr/libexec/PlistBuddy -c "Set :CFBundleVersion $APP_VERSION" "$APP_DIR/Contents/Info.plist"

if [ ! -f "$SOURCE_ICON" ]; then
  printf 'source icon not found at %s\n' "$SOURCE_ICON" >&2
  exit 1
fi

mkdir -p "$ICONSET_DIR"
sips -z 16 16 "$SOURCE_ICON" --out "$ICONSET_DIR/icon_16x16.png" >/dev/null
sips -z 32 32 "$SOURCE_ICON" --out "$ICONSET_DIR/icon_16x16@2x.png" >/dev/null
sips -z 32 32 "$SOURCE_ICON" --out "$ICONSET_DIR/icon_32x32.png" >/dev/null
sips -z 64 64 "$SOURCE_ICON" --out "$ICONSET_DIR/icon_32x32@2x.png" >/dev/null
sips -z 128 128 "$SOURCE_ICON" --out "$ICONSET_DIR/icon_128x128.png" >/dev/null
sips -z 256 256 "$SOURCE_ICON" --out "$ICONSET_DIR/icon_128x128@2x.png" >/dev/null
cp "$ICONSET_DIR/icon_128x128@2x.png" "$ICONSET_DIR/icon_256x256.png"
cp "$ICONSET_DIR/icon_128x128@2x.png" "$ICONSET_DIR/icon_256x256@2x.png"
cp "$ICONSET_DIR/icon_128x128@2x.png" "$ICONSET_DIR/icon_512x512.png"
cp "$ICONSET_DIR/icon_128x128@2x.png" "$ICONSET_DIR/icon_512x512@2x.png"
iconutil -c icns "$ICONSET_DIR" -o "$APP_ICON"

cargo build --manifest-path "$RUST_MANIFEST" --release --target "$RUST_TARGET"
cp "$RUST_BINARY" "$APP_DIR/Contents/MacOS/$EXECUTABLE_NAME"

chmod +x "$APP_DIR/Contents/MacOS/$EXECUTABLE_NAME"

codesign --force --sign "$SIGN_IDENTITY" "$APP_DIR"
codesign --verify --deep --strict "$APP_DIR"

rm -rf "$ICONSET_DIR"

printf 'Built %s\n' "$APP_DIR"
