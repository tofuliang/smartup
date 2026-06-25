import assert from 'node:assert/strict';

let messageListener;
let alarmListener;
const calls = [];

const localStore = {
  config: {
    apps: {
      autoreload: { n_interval: 10 },
      notepad: { n_notepad_last: true },
    },
  },
  localConfig: {},
};

globalThis.fetch = async (url) => ({
  async json() {
    calls.push(['fetch.json', url]);
    return { ok: true };
  },
  async text() {
    calls.push(['fetch.text', url]);
    return '<rss><channel><title>Feed</title></channel></rss>';
  },
  async blob() {
    return new Blob(['x'], { type: 'image/png' });
  },
});

globalThis.chrome = {
  storage: {
    local: {
      get(keys, callback) {
        const resolveValue = Array.isArray(keys)
          ? Object.fromEntries(keys.map((key) => [key, localStore[key]]))
          : { ...localStore };
        if (typeof callback === 'function') {
          callback(resolveValue);
          return;
        }
        return Promise.resolve(resolveValue);
      },
      set(value, callback) {
        calls.push(['storage.local.set', value]);
        Object.assign(localStore, value);
        if (typeof callback === 'function') callback();
        return Promise.resolve();
      },
    },
  },
  action: {
    setTitle() { return Promise.resolve(); },
    setPopup() { return Promise.resolve(); },
    setBadgeText(details) {
      calls.push(['setBadgeText', details]);
      return Promise.resolve();
    },
    onClicked: { addListener() {} },
  },
  alarms: {
    create(name, info) {
      calls.push(['alarms.create', name, info]);
    },
    clear(name) {
      calls.push(['alarms.clear', name]);
      return Promise.resolve(true);
    },
    onAlarm: {
      addListener(listener) {
        alarmListener = listener;
      },
    },
  },
  scripting: {
    executeScript() { return Promise.resolve(); },
    insertCSS() { return Promise.resolve(); },
  },
  tabs: {
    sendMessage(tabId, payload) {
      calls.push(['tabs.sendMessage', tabId, payload]);
      return Promise.resolve(payload);
    },
    reload(tabId, details) {
      calls.push(['tabs.reload', tabId, details]);
      return Promise.resolve();
    },
    create(details) {
      calls.push(['tabs.create', details]);
      return Promise.resolve(details);
    },
  },
  runtime: {
    id: 'ext-id',
    getURL(path) { return `chrome-extension://ext-id/${path}`; },
    connectNative() { return { postMessage() {}, disconnect() {}, onDisconnect: { addListener() {} } }; },
    onMessage: {
      addListener(listener) {
        messageListener = listener;
      },
    },
    onInstalled: { addListener() {} },
  },
  permissions: { getAll() { return Promise.resolve({ permissions: [], origins: [] }); } },
  sessions: { restore() { return Promise.resolve(); } },
  windows: { getAll() { return Promise.resolve([]); } },
};

const { bootRuntime } = await import('../js/sw/runtime.js');

bootRuntime();
await new Promise((resolve) => setTimeout(resolve, 0));

function ask(message, sender = { tab: { id: 44 }, url: 'https://page.test/' }) {
  return new Promise((resolve) => {
    messageListener(message, sender, resolve);
  });
}

const startResponse = await ask({ type: 'appsAction', app: 'autoreload', action: 'reload', value: { type: 'start', interval: 10, iconCountdown: true, bypassCache: false } });
assert.deepEqual(startResponse, { ok: true, app: 'autoreload', action: 'reload' });
assert.equal(calls.some((call) => call[0] === 'alarms.create'), true);

await alarmListener?.({ name: 'autoreload:44' });
assert.equal(calls.some((call) => call[0] === 'tabs.reload' && call[1] === 44), true);

const notepadGet = await ask({ type: 'appsAction', app: 'notepad', action: 'get', value: { method: 'get' } });
assert.deepEqual(notepadGet, { ok: true, app: 'notepad', action: 'get' });

const savedData = { method: 'put', data: { id: 0, last: 0, item: [{ title: 'T', content: 'C' }] } };
const notepadSet = await ask({ type: 'appsAction', app: 'notepad', action: 'set', value: savedData });
assert.deepEqual(notepadSet, { ok: true, app: 'notepad', action: 'set' });

const notepadGetAgain = await ask({ type: 'appsAction', app: 'notepad', action: 'get', value: { method: 'get' } });
assert.deepEqual(notepadGetAgain, { ok: true, app: 'notepad', action: 'get' });
assert.equal(calls.filter((call) => call[0] === 'tabs.sendMessage' && call[2]?.type === 'appsListener_get').length >= 2, true);
assert.deepEqual(localStore.localConfig.notepad, savedData.data);

console.log('runtime autoreload and notepad behavior verified');
