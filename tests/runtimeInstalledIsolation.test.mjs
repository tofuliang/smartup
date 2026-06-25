import assert from 'node:assert/strict';

let installedListener;
let messageListener;
const calls = [];
const warnings = [];

const originalWarn = console.warn;
console.warn = (...args) => {
  warnings.push(args);
};

globalThis.chrome = {
  storage: {
    local: {
      get(keys, callback) {
        if (Array.isArray(keys) && keys.length === 1 && keys[0] === 'config') {
          const value = {
            config: {
              general: {
                fnswitch: { fnicon: true },
              },
              icon: {
                settings: { type: 'back', tip: true },
                actions: [{ name: 'reload' }],
              },
            },
          };
          if (typeof callback === 'function') {
            callback(value);
            return;
          }
          return Promise.resolve(value);
        }
        if (typeof callback === 'function') {
          callback({
            configSource: 'sync',
            config: {
              general: {
                fnswitch: { fnicon: true },
              },
              icon: {
                settings: { type: 'back', tip: true },
                actions: [{ name: 'reload' }],
              },
            },
          });
          return;
        }
        return Promise.resolve({
          configSource: 'sync',
          config: {
            general: {
              fnswitch: { fnicon: true },
            },
            icon: {
              settings: { type: 'back', tip: true },
              actions: [{ name: 'reload' }],
            },
          },
        });
      },
    },
    sync: {
      get(keys, callback) {
        const value = {
          general: {
            fnswitch: { fnicon: false },
          },
          icon: {
            settings: { type: 'back', tip: true },
            actions: [{ name: 'reload' }],
          },
        };
        if (typeof callback === 'function') {
          callback(value);
          return;
        }
        return Promise.resolve(value);
      },
    },
  },
  action: {
    setTitle(details) {
      calls.push(['setTitle', details]);
      return Promise.resolve();
    },
    setPopup(details) {
      calls.push(['setPopup', details]);
      return Promise.resolve();
    },
    onClicked: {
      addListener(listener) {
        calls.push(['actionClickListener', typeof listener]);
        globalThis.__smartupActionClickListener = listener;
      },
    },
  },
  __actionStateCalls: [],
  scripting: {
    executeScript(details) {
      calls.push(['executeScript', details.target.tabId, details.files]);
      if (details.target.tabId === 2) {
        return Promise.reject(new Error('tab 2 unavailable'));
      }
      return Promise.resolve();
    },
  },
  tabs: {
    reload(tabId, details) {
      calls.push(['tabs.reload', tabId, details]);
      return Promise.resolve();
    },
  },
  permissions: {
    request(details) {
      calls.push(['permissions.request', details]);
      return Promise.resolve(true);
    },
  },
  browserSettings: {
    contextMenuShowEvent: {
      set(details) {
        calls.push(['contextMenuShowEvent.set', details]);
        return Promise.resolve();
      },
    },
  },
  sessions: {
    async restore(sessionId) {
      calls.push(['sessions.restore', sessionId]);
      return { sessionId };
    },
  },
  runtime: {
    getURL(path) {
      return `chrome-extension://id/${path}`;
    },
    onMessageExternal: {
      addListener(listener) {
        calls.push(['externalMessageListener', typeof listener]);
        globalThis.__smartupExternalMessageListener = listener;
      },
    },
    onMessage: {
      addListener(listener) {
        messageListener = listener;
        calls.push(['messageListener', typeof listener]);
      },
    },
    onInstalled: {
      addListener(listener) {
        installedListener = listener;
      },
    },
  },
  windows: {
    async getAll(details) {
      calls.push(['getAll', details]);
      return [
        { tabs: [{ id: 1 }, { id: 2 }, { id: 3 }] },
      ];
    },
  },
};

const { bootRuntime } = await import('../js/sw/runtime.js');

bootRuntime();
await new Promise((resolve) => setTimeout(resolve, 0));

assert.equal(calls.some((call) => call[0] === 'setPopup' && call[1]?.popup === 'html/popup.html'), true, 'worker boot should prefer sync config when configSource=sync');
assert.equal(calls.some((call) => call[0] === 'externalMessageListener'), false, 'worker boot must not register the internal runtime handler on onMessageExternal');

let syncedResponse;
const listenerKeepsPortOpen = messageListener(
  { type: 'appsAction', app: 'synced', action: 'openItem', value: 'session-42' },
  { tab: { id: 9 } },
  (response) => {
    syncedResponse = response;
  },
);
assert.equal(listenerKeepsPortOpen, true);
await new Promise((resolve) => setTimeout(resolve, 0));

assert.deepEqual(syncedResponse, { ok: true, app: 'synced', action: 'openItem' });
assert.deepEqual(calls.filter((call) => call[0] === 'sessions.restore'), [['sessions.restore', 'session-42']]);

const actionClickCallCountBefore = calls.length;
await globalThis.__smartupActionClickListener?.({ id: 5 });
assert.equal(calls.slice(actionClickCallCountBefore).some((call) => call[0] === 'executeScript' && call[1] === 5), false, 'icon back mode should not only inject event.js');
assert.equal(calls.slice(actionClickCallCountBefore).some((call) => call[0] === 'tabs.reload' && call[1] === 5), true, 'icon back mode should execute configured action');

let errorResponse;
messageListener(
  { type: 'appsAction', app: 'appslist', action: 'openApp', value: 'rss' },
  {},
  (response) => {
    errorResponse = response;
  },
);
await new Promise((resolve) => setTimeout(resolve, 0));

assert.deepEqual(errorResponse, {
  ok: false,
  error: 'runtime-error',
  message: 'missing-target-tab',
});

await installedListener({ reason: 'install' });

console.warn = originalWarn;

assert.deepEqual(
  calls.filter((call) => call[0] === 'executeScript').map((call) => call[1]),
  [1, 2, 3],
  'onInstalled injection must keep processing tabs after one tab fails',
);
assert.equal(calls.some((call) => call[0] === 'contextMenuShowEvent.set' && call[1]?.value === 'mouseup'), true, 'worker install path must restore browserSettings contextMenuShowEvent mouseup behavior when API exists');
assert.equal(warnings.length, 1, 'onInstalled injection must report the failed tab once');
assert.equal(warnings[0][1], 2);

console.log('runtime installed isolation verified');
