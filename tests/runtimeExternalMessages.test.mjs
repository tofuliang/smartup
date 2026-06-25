import assert from 'node:assert/strict';

let messageListener;
let externalMessageListener;

globalThis.chrome = {
  storage: {
    local: {
      get() {
        return Promise.resolve({ config: { general: { fnswitch: { fnicon: false } } } });
      },
    },
  },
  action: {
    setTitle() { return Promise.resolve(); },
    setPopup() { return Promise.resolve(); },
    onClicked: { addListener() {} },
  },
  scripting: {
    executeScript() { return Promise.resolve(); },
  },
  tabs: {},
  permissions: {},
  sessions: { restore() { return Promise.resolve(); } },
  windows: { getAll() { return Promise.resolve([]); } },
  runtime: {
    onMessage: {
      addListener(listener) {
        messageListener = listener;
      },
    },
    onMessageExternal: {
      addListener(listener) {
        externalMessageListener = listener;
      },
    },
    onInstalled: { addListener() {} },
  },
};

const { bootRuntime } = await import('../js/sw/runtime.js');

bootRuntime();

assert.equal(typeof messageListener, 'function', 'runtime should register internal onMessage listener');
assert.equal(typeof externalMessageListener, 'function', 'runtime should register external onMessageExternal listener');

let externalResponse;
const keepsPortOpen = externalMessageListener(
  { type: 'evt_getconf' },
  { id: 'external-sender' },
  (response) => {
    externalResponse = response;
  },
);

assert.equal(keepsPortOpen, true, 'external listener should keep sendResponse alive for async dispatcher flow');
await new Promise((resolve) => setTimeout(resolve, 0));

assert.equal(externalResponse?.type, 'evt_getconf');
assert.ok(externalResponse?.config, 'external listener should route through legacy config response path');

console.log('runtime external messages verified');
