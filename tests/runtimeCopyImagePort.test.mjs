import assert from 'node:assert/strict';

let connectListener;
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
    onMessage: { addListener() {} },
    onInstalled: { addListener() {} },
    onConnect: {
      addListener(listener) {
        connectListener = listener;
      },
    },
  },
};

globalThis.fetch = async (url) => {
  calls.push(['fetch', url]);
  return {
    async blob() {
      return new Blob(['image-bytes'], { type: 'image/png' });
    },
  };
};

globalThis.URL = {};

const { bootRuntime } = await import('../js/sw/runtime.js');

bootRuntime();

assert.equal(typeof connectListener, 'function', 'runtime should register onConnect listener for fn_copyimg compatibility');

let portMessageHandler;
const postedMessages = [];
connectListener({
  name: 'fn_copyimg',
  postMessage(value) {
    postedMessages.push(value);
  },
  onMessage: {
    addListener(listener) {
      portMessageHandler = listener;
    },
  },
});

assert.equal(typeof portMessageHandler, 'function', 'fn_copyimg port should attach an onMessage handler');

await portMessageHandler({ type: 'fn_copyimg', url: 'https://img.test/p.png' });

assert.deepEqual(calls, [
  ['fetch', 'https://img.test/p.png'],
]);
assert.deepEqual(postedMessages, ['data:image/png;base64,aW1hZ2UtYnl0ZXM=']);

console.log('runtime copy image port verified');
