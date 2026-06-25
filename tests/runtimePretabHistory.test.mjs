import assert from 'node:assert/strict';

let messageListener;
let activatedListener;

const calls = [];

globalThis.chrome = {
  storage: {
    local: {
      get() {
        return Promise.resolve({
          config: {
            mges: { actions: [{ direct: 'L', name: 'pretab' }] },
            icon: { settings: { type: 'back' }, actions: [] },
          },
        });
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
  tabs: {
    update(tabId, details) {
      calls.push(['tabs.update', tabId, details]);
      return Promise.resolve();
    },
    onActivated: {
      addListener(listener) {
        activatedListener = listener;
      },
    },
  },
  permissions: {},
  sessions: { restore() { return Promise.resolve(); } },
  windows: { getAll() { return Promise.resolve([]); } },
  runtime: {
    onMessage: {
      addListener(listener) {
        messageListener = listener;
      },
    },
    onInstalled: { addListener() {} },
  },
};

const { bootRuntime } = await import('../js/sw/runtime.js');

bootRuntime();

assert.equal(typeof activatedListener, 'function', 'runtime should register tabs.onActivated listener for pretab history');

await activatedListener({ tabId: 11 });
await activatedListener({ tabId: 19 });

let response;
messageListener(
  { type: 'action', direct: 'L', drawType: ['mges', 'actions'] },
  { tab: { id: 19 } },
  (value) => {
    response = value;
  },
);
await new Promise((resolve) => setTimeout(resolve, 0));

assert.deepEqual(response, { ok: true, actionName: 'pretab' });
assert.deepEqual(calls, [['tabs.update', 11, { active: true }]]);

console.log('runtime pretab history verified');
