import assert from 'node:assert/strict';

let updatedListener;
const calls = [];

globalThis.chrome = {
  storage: {
    local: {
      get() {
        return Promise.resolve({ config: { general: { fnswitch: { fnicon: false } } } });
      },
    },
  },
  action: {
    setTitle(details) {
      calls.push(['setTitle', details]);
      return Promise.resolve();
    },
    setPopup() { return Promise.resolve(); },
    setIcon(details) {
      calls.push(['setIcon', details]);
      return Promise.resolve();
    },
    onClicked: { addListener() {} },
  },
  scripting: {
    executeScript() { return Promise.resolve(); },
  },
  tabs: {
    sendMessage(tabId, payload) {
      calls.push(['sendMessage', tabId, payload]);
      return Promise.resolve(undefined);
    },
    onUpdated: {
      addListener(listener) {
        updatedListener = listener;
      },
    },
  },
  permissions: {},
  sessions: { restore() { return Promise.resolve(); } },
  windows: { getAll() { return Promise.resolve([]); } },
  runtime: {
    onMessage: { addListener() {} },
    onInstalled: { addListener() {} },
  },
  i18n: {
    getMessage(key) {
      return key === 'icon_tip' ? 'smartUp warning' : key;
    },
  },
};

const { bootRuntime } = await import('../js/sw/runtime.js');

bootRuntime();

assert.equal(typeof updatedListener, 'function', 'runtime should register tabs.onUpdated listener for warning checks');

await updatedListener(12, { status: 'complete' }, { id: 12 });
await new Promise((resolve) => setTimeout(resolve, 0));

assert.deepEqual(calls[0], ['sendMessage', 12, { type: 'status' }]);
assert.deepEqual(calls[1], ['setIcon', { tabId: 12, path: '../image/icon_warning.png' }]);
assert.deepEqual(calls[2], ['setTitle', { tabId: 12, title: 'smartUp warning' }]);

console.log('runtime tab updated warning verified');
