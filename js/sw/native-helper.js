export function createNativeHelper(runtimeApi) {
  let port = null;

  function connect() {
    if (!port) {
      port = runtimeApi.connectNative('com.smartup.rightclickhelper');
      if (port?.onDisconnect?.addListener) {
        port.onDisconnect.addListener(() => {
          port = null;
        });
      }
    }
    return port;
  }

  return {
    connect,
    async sendRightClick(payload) {
      connect()?.postMessage?.(payload);
      return true;
    },
    disconnect() {
      if (port) port.disconnect();
      port = null;
    },
  };
}
