import assert from 'node:assert/strict';

let messageListener;
const calls = [];
let lastHomepagePayload = null;

globalThis.chrome = {
  storage: {
    local: {
      get(_keys, callback) {
        const value = {
          config: {
            general: {
              fnswitch: { fnctm: true },
            },
            ctm: {
              actions: [
                { name: 'newtab' },
                { name: 'scroll', selects: [{ type: 'n_scroll', value: 's_up' }], checks: [{ type: 'n_effect', value: false }] },
                { name: 'zoom', selects: [{ type: 'n_zoom', value: 's_in' }] },
              ],
              settings: { homepage: true, opt: true, disable: true, fnswitch: true },
            },
          },
        };
        if (typeof callback === 'function') {
          callback(value);
          return;
        }
        return Promise.resolve(value);
      },
      set() { return Promise.resolve(); },
    },
  },
  action: {
    setTitle() { return Promise.resolve(); },
    setPopup() { return Promise.resolve(); },
    onClicked: { addListener() {} },
  },
  contextMenus: {
    removeAll() {
      calls.push(['removeAll']);
      return Promise.resolve();
    },
    create(details) {
      calls.push(['create', details]);
      return calls.length;
    },
    onClicked: {
      addListener(listener) {
        calls.push(['onClicked', typeof listener]);
        globalThis.__smartupContextMenuClick = listener;
      },
    },
  },
  scripting: {
    executeScript(details) {
      calls.push(['executeScript', details.target?.tabId ?? null, details.files ?? null, details.target?.allFrames ?? null]);
      return Promise.resolve();
    },
    insertCSS() { return Promise.resolve(); },
  },
  tabs: {
    create(details) {
      calls.push(['tabs.create', details]);
      return Promise.resolve(details);
    },
    reload(tabId, details) {
      calls.push(['tabs.reload', tabId, details]);
      return Promise.resolve();
    },
    sendMessage(tabId, payload) {
      calls.push(['tabs.sendMessage', tabId, payload]);
      if (payload?.type === 'data' && payload?.value?.ctm) {
        lastHomepagePayload = payload.value.ctm;
      }
      return Promise.resolve();
    },
  },
  permissions: { getAll() { return Promise.resolve({ permissions: [], origins: [] }); } },
  runtime: {
    getURL(path) { return `chrome-extension://id/${path}`; },
    openOptionsPage() {
      calls.push(['openOptionsPage']);
      return Promise.resolve();
    },
    connectNative() { return { postMessage() {}, disconnect() {}, onDisconnect: { addListener() {} } }; },
    onMessage: { addListener(listener) { messageListener = listener; } },
    onInstalled: { addListener() {} },
  },
  i18n: {
    getMessage(key) {
      return `i18n:${key}`;
    },
  },
  windows: { getAll() { return Promise.resolve([]); } },
  sessions: { restore() { return Promise.resolve(); } },
};

const { bootRuntime } = await import('../js/sw/runtime.js');

function sendRuntimeMessage(message, sender = { tab: { id: 55 } }) {
  return new Promise((resolve) => {
    messageListener(message, sender, resolve);
  });
}

bootRuntime();
await new Promise((resolve) => setTimeout(resolve, 0));

assert.equal(calls.some((call) => call[0] === 'removeAll'), true);
const createdMenus = calls.filter((call) => call[0] === 'create').map((call) => call[1]);
assert.equal(createdMenus.length >= 2, true);
assert.equal(calls.some((call) => call[0] === 'onClicked'), true);
assert.equal(createdMenus.some((details) => details.title === 'i18n:ctm_disable'), true, 'context menu must restore disable toggle item when enabled in config');
assert.equal(createdMenus.some((details) => details.title === 'i18n:ctm_opt'), true, 'context menu must restore options item when enabled in config');
assert.equal(createdMenus.some((details) => details.title === 'i18n:homepage_ctm'), true, 'context menu must restore homepage shortcut item when enabled in config');
assert.equal(createdMenus.some((details) => details.id === 'toggle:mges' && details.type === 'checkbox'), true, 'context menu must restore function-switch checkbox items');

await globalThis.__smartupContextMenuClick?.({ menuItemId: 0 }, { id: 55 });
await globalThis.__smartupContextMenuClick?.({ menuItemId: 1 }, { id: 55 });
await globalThis.__smartupContextMenuClick?.({ menuItemId: 2 }, { id: 55 });

const homepageMenu = createdMenus.find((details) => details.title === 'i18n:homepage_ctm');
const optionsMenu = createdMenus.find((details) => details.title === 'i18n:ctm_opt');
await globalThis.__smartupContextMenuClick?.({ menuItemId: homepageMenu?.id ?? homepageMenu }, { id: 55, title: 'Current Tab', url: 'https://page.test/' });
await globalThis.__smartupContextMenuClick?.({ menuItemId: optionsMenu?.id ?? optionsMenu }, { id: 55 });

assert.equal(calls.some((call) => call[0] === 'tabs.create'), true);
assert.equal(calls.some((call) => call[0] === 'executeScript' && call[1] === 55 && call[2]?.[0] === 'js/inject/scroll.js'), true);
assert.equal(calls.some((call) => call[0] === 'executeScript' && call[1] === 55 && call[2]?.[0] === 'js/inject/zoom.js'), true);
assert.equal(calls.some((call) => call[0] === 'openOptionsPage'), true, 'context menu options item must open the options page');
assert.equal(lastHomepagePayload?.title, 'Current Tab');
assert.equal(lastHomepagePayload?.url, 'https://page.test/');
assert.equal(lastHomepagePayload?.id, 55, 'homepage context-menu payload must preserve legacy tab identity fields');
assert.deepEqual(await sendRuntimeMessage({ type: 'scroll' }), { type: 'up', effect: false });
assert.deepEqual(await sendRuntimeMessage({ type: 'zoom' }), { value: 's_in' });

console.log('runtime context menu wiring verified');
