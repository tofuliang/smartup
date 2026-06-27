![https://img.shields.io/github/issues/zimocode/smartup](https://user-images.githubusercontent.com/29518677/113705830-7c8fc580-9710-11eb-9b75-f2eddd761590.png)

# smartUp Gestures 

![GitHub release (latest by date)](https://img.shields.io/github/v/release/zimocode/smartup?logo=github&logoColor=white)
![GitHub Repo stars](https://img.shields.io/github/stars/zimocode/smartup?logo=github&logoColor=white)
![GitHub forks](https://img.shields.io/github/forks/zimocode/smartup?logo=github&logoColor=white)
![GitHub issues](https://img.shields.io/github/issues-raw/zimocode/smartup?logo=github&logoColor=white)
![GitHub](https://img.shields.io/github/license/zimocode/smartup?logo=github&logoColor=white)

|  Browser  | Rating  | Users |
|  ----  | ----  | ---- |
| Chrome | ![Chrome Web Store](https://img.shields.io/chrome-web-store/rating/bgjfekefhjemchdeigphccilhncnjldn?logo=google%20chrome&logoColor=white) | ![Chrome Web Store](https://img.shields.io/chrome-web-store/users/bgjfekefhjemchdeigphccilhncnjldn?logo=google%20chrome&logoColor=white) | 
| Firefox | ![Mozilla Add-on](https://img.shields.io/amo/rating/smartup?logo=firefox&logoColor=white) | ![Mozilla Add-on](https://img.shields.io/amo/users/smartup?logo=firefox&logoColor=white) | 

Visit on [Chrome Web Store](https://chrome.google.com/webstore/detail/bgjfekefhjemchdeigphccilhncnjldn) / [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/smartup/) / [Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/smartup%E6%89%8B%E5%8A%BF/elponhbfjjjihgeijofonnflefhcbckp)

A customizable web browser mouse gestures extension with a variety of actions. Features include: mouse gestures, simple drag, super drag, rocker gestures, wheel gestures,Popup Actions, Icon Actions, Context Menu actions, Touch Gestures, Double Click Action and Keyboard Shortcut Actions.

[English](README.md) ·[简体中文](README-zh_CN.md)

## Leatest release

![GitHub release (latest by date)](https://img.shields.io/github/v/release/zimocode/smartup?logo=github&logoColor=white)

## Install

### Install by online

smartUP Gestures has ben uploaded to these browser's extension store, you'll install it quickly.

|  Browser  | URL  |
|  ----  | ----  |
| Chrome | [https://chrome.google.com/webstore/detail/bgjfekefhjemchdeigphccilhncnjldn](https://chrome.google.com/webstore/detail/bgjfekefhjemchdeigphccilhncnjldn) |
| Edge | [https://microsoftedge.microsoft.com/addons/detail/elponhbfjjjihgeijofonnflefhcbckp](https://microsoftedge.microsoft.com/addons/detail/elponhbfjjjihgeijofonnflefhcbckp) |
| Firefox | [https://addons.mozilla.org/firefox/addon/smartup/](https://addons.mozilla.org/firefox/addon/smartup/) |

### Build right click helper
```shell
# Build the Rust helper binary
(cd rightClickHelper && cargo build --release)

# Build the macOS arm64 app bundle for local development (ad-hoc signing)
(cd rightClickHelper && ./build-darwin-arm64-app.sh --dev)

# Build the macOS arm64 app bundle with an explicit signing identity
# (cd rightClickHelper && ./build-darwin-arm64-app.sh --sign "Developer ID Application: Your Name (TEAMID)")

# Linux runtime requires X11 + xdotool
```

### Build extension artifacts with GitHub Actions

The repository now includes a manual GitHub Actions workflow at `.github/workflows/build-extension.yml`.

It builds and commits these files back into `dist/`:

- `dist/smartup.zip`
- `dist/smartup.crx`
- `dist/update.xml`

Before running it, configure the repository secret:

- `CRX_PRIVATE_KEY` — PEM private key used to pack the extension into a stable `.crx`

The workflow is triggered manually through **Actions → Build extension → Run workflow**.

`update.xml` follows the Chrome self-hosted update format and points to:

- `https://raw.githubusercontent.com/tofuliang/smartup/master/dist/smartup.crx`
- `https://raw.githubusercontent.com/tofuliang/smartup/master/dist/update.xml`

### Debug native helper

The Rust native helper supports runtime debug logging via the `SMARTUP_HELPER_DEBUG` environment variable.

On macOS, the simplest way is to export the variable first, then launch the browser from the same terminal:

```shell
export SMARTUP_HELPER_DEBUG=1
/Applications/Brave\ Browser.app/Contents/MacOS/Brave\ Browser
```

If you want to keep the native helper debug logs in a file:

```shell
export SMARTUP_HELPER_DEBUG=1
/Applications/Brave\ Browser.app/Contents/MacOS/Brave\ Browser 2>>/tmp/smartup-rightclickhelper.log
```

Then inspect the log with:

```shell
tail -f /tmp/smartup-rightclickhelper.log
```

Useful debug lines include:

- `startup version:` — the host actually launched
- `received request ... payload=...` — the browser sent a native message
- `macos accessibility granted=true|false` — Accessibility permission state
- `macos right_click ... double_click=true|false` — whether the helper interpreted the click as single or double
- `result=ok|error` — whether the OS backend accepted the action

## License

[![License](https://img.shields.io/github/license/zimocode/smartup?logo=github&logoColor=white)](LICENSE)
