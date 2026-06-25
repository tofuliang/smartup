import assert from 'node:assert/strict';

let messageListener;
const calls = [];

globalThis.chrome = {
  storage: {
    local: {
      get(callback) {
        if (typeof callback === 'function') {
          callback({ config: { apps: { appslist: { n_closebox: true } } } });
          return;
        }
        return Promise.resolve({ config: { apps: { appslist: { n_closebox: true } } } });
      },
      set(value, callback) {
        calls.push(['storage.local.set', value]);
        if (typeof callback === 'function') callback();
        return Promise.resolve();
      },
    },
  },
  action: {
    setTitle() { return Promise.resolve(); },
    onClicked: { addListener() {} },
  },
  scripting: {
    executeScript(details) {
      calls.push(['executeScript', details.target.tabId, details.files, typeof details.func]);
      return Promise.resolve();
    },
    insertCSS(details) {
      calls.push(['insertCSS', details.target.tabId, details.files]);
      return Promise.resolve();
    },
  },
  tabs: {
    create(details) {
      calls.push(['tabs.create', details]);
      return Promise.resolve(details);
    },
    sendMessage(tabId, payload) {
      calls.push(['tabs.sendMessage', tabId, payload]);
      return Promise.resolve(payload);
    },
  },
  runtime: {
    id: 'ext-id',
    getURL(path) {
      return `chrome-extension://ext-id/${path}`;
    },
    connectNative() {
      return { postMessage() {}, disconnect() {}, onDisconnect: { addListener() {} } };
    },
    onMessage: {
      addListener(listener) {
        messageListener = listener;
      },
    },
    onInstalled: { addListener() {} },
  },
  permissions: {
    getAll() { return Promise.resolve({ permissions: [], origins: [] }); },
  },
  sessions: { restore() { return Promise.resolve(); } },
  windows: { getAll() { return Promise.resolve([]); } },
};

const { bootRuntime } = await import('../js/sw/runtime.js');

bootRuntime();

function ask(message, sender = { tab: { id: 91 }, url: 'https://page.test/' }) {
  return new Promise((resolve) => {
    messageListener(message, sender, resolve);
  });
}

for (const appName of ['rss', 'tablist', 'homepage', 'recentbk', 'recentht', 'recentclosed', 'synced', 'extmgm', 'speaker', 'jslist', 'autoreload', 'savepdf', 'tbkjx', 'appslist', 'random', 'base64', 'qr', 'numc', 'convertcase', 'magnet']) {
  calls.length = 0;
  const response = await ask({ type: 'appsAction', app: 'appslist', action: 'openApp', value: appName });

  assert.deepEqual(response, { ok: true, app: 'appslist', action: 'openApp' });
  assert.deepEqual(calls, [
    ['insertCSS', 91, ['css/apps_basic.css']],
    ['executeScript', 91, ['js/lib/apps_basic.js'], 'undefined'],
    ['insertCSS', 91, [`css/inject/${appName}.css`]],
    ['executeScript', 91, [`js/inject/${appName}.js`], 'undefined'],
  ]);
}

for (const appName of ['shorturl', 'notepad']) {
  calls.length = 0;
  const response = await ask({ type: 'appsAction', app: 'appslist', action: 'openApp', value: appName });

  assert.deepEqual(response, { ok: true, app: 'appslist', action: 'openApp' });
  assert.deepEqual(calls, [
    ['insertCSS', 91, ['css/apps_basic.css']],
    ['executeScript', 91, ['js/lib/apps_basic.js'], 'undefined'],
    ['insertCSS', 91, [`css/inject/${appName}.css`]],
    ['executeScript', 91, [`js/inject/${appName}.js`], 'undefined'],
  ]);
}

console.log('runtime app launch wiring verified');
