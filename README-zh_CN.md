![https://img.shields.io/github/issues/zimocode/smartup](https://user-images.githubusercontent.com/29518677/113705830-7c8fc580-9710-11eb-9b75-f2eddd761590.png)

# smartUp手势 

一个更好的手势类扩展。功能包括：鼠标手势，简易拖曳，超级拖曳，摇杆手势和滚轮手势。

[![](https://img.shields.io/github/issues/zimocode/smartup)](https://github.com/zimocode/smartup/issues)
[![](https://img.shields.io/github/forks/zimocode/smartup)](https://github.com/zimocdoe/smartup/members)
[![](https://img.shields.io/github/stars/zimocode/smartup)](https://github.com/zimocode/smartup/stargazers)
[![](https://img.shields.io/github/license/zimocode/smartup)](LICENSE)

[English](README.md) ·[简体中文](README-zh_CN.md)

## 安装右键助手
当前右键助手已经切换为 Rust 实现。
先在`rightClickHelper`目录中构建，再执行仓库根目录的安装脚本。

构建命令如下：

```shell
# 通用 Rust helper 二进制
(cd rightClickHelper && cargo build --release)

# macOS arm64 app bundle（本机开发，使用 ad-hoc 签名）
(cd rightClickHelper && ./build-darwin-arm64-app.sh --dev)

# 如果你有开发者证书，可显式传入签名身份
# (cd rightClickHelper && ./build-darwin-arm64-app.sh --sign "Developer ID Application: Your Name (TEAMID)")

# 安装到 ~/Applications 并写入 Native Messaging manifest
./installRightClickHelper.sh
```

说明：`build-darwin-arm64-app.sh` 现在必须显式选择 `--dev` 或 `--sign`，默认无参数会直接报错。

Linux 运行时要求：

- 运行在 **X11** 会话下
- 系统中已安装 `xdotool`

Rust helper 启动后若标准输出出现类似下列内容，说明 Native Messaging host 已正常启动：

```shell
{"version":"0.9.0"}
```

### 调试 Rust 右键助手

Rust 版 native helper 支持通过环境变量 `SMARTUP_HELPER_DEBUG` 打开运行时调试日志。

在 macOS 上，最直接的方式就是先 `export` 环境变量，再从同一个终端里启动浏览器：

```shell
export SMARTUP_HELPER_DEBUG=1
/Applications/Brave\ Browser.app/Contents/MacOS/Brave\ Browser
```

如果想把 native helper 的调试日志落到文件：

```shell
export SMARTUP_HELPER_DEBUG=1
/Applications/Brave\ Browser.app/Contents/MacOS/Brave\ Browser 2>>/tmp/smartup-rightclickhelper.log
```

然后用下面的命令持续看日志：

```shell
tail -f /tmp/smartup-rightclickhelper.log
```

最值得关注的日志字段有：

- `startup version:`：说明 native host 真的启动了
- `received request ... payload=...`：说明浏览器真的发来了 native message
- `macos accessibility granted=true|false`：辅助功能授权状态
- `macos right_click ... double_click=true|false`：helper 是否把当前点击理解成单击还是双击
- `result=ok|error`：底层平台调用是否成功

### macOS第一次点击右键时，会有授权弹窗提示

![授权弹窗提示](rightClickHelper/permission1.jpg)

### 按图授权后，重启浏览器即可。

![按图授权](rightClickHelper/permission2.jpg)

## 通过 GitHub Actions 构建扩展产物

仓库现在包含一个手动触发的 workflow：`.github/workflows/build-extension.yml`。

它会自动构建并提交这些文件到 `dist/`：

- `dist/smartup.zip`
- `dist/smartup.crx`
- `dist/update.xml`

运行前需要先在仓库 Secrets 中配置：

- `CRX_PRIVATE_KEY`：用于生成稳定 `.crx` 的 PEM 私钥

触发方式：进入 **GitHub Actions → Build extension → Run workflow**。

`update.xml` 使用 Chrome 自托管更新格式，当前指向：

- `https://raw.githubusercontent.com/tofuliang/smartup/master/dist/smartup.crx`
- `https://raw.githubusercontent.com/tofuliang/smartup/master/dist/update.xml`
