import assert from 'node:assert/strict';

import { createDispatcher } from '../js/sw/dispatcher.js';

function createDispatcherWithServices(services) {
  return createDispatcher({
    storage: {},
    actionState: {},
    injection: {},
    permissions: {},
    apps: {},
    ...services,
  });
}

function createEmptyStorage(calls = []) {
  return {
    async getLocal(keys) {
      calls.push(['getLocal', keys]);
      return {};
    },
    async getSync(keys) {
      calls.push(['getSync', keys]);
      return {};
    },
    async saveConfig(config) {
      calls.push(['saveConfig', config.version]);
      return { area: 'local' };
    },
  };
}

async function testDefaultConfigIsSafeForActiveOptionAndEventPaths() {
  const dispatcher = createDispatcherWithServices({
    storage: createEmptyStorage(),
  });

  const response = await dispatcher.handleMessage({ type: 'evt_getconf' }, {});
  const config = response.config;

  assert.equal(config.version, 46);
  assert.deepEqual(Object.keys(config.general.fnswitch).sort(), [
    'fnctm',
    'fndca',
    'fndrg',
    'fnicon',
    'fnksa',
    'fnmges',
    'fnpop',
    'fnrges',
    'fnsdrg',
    'fntouch',
    'fnwges',
  ].sort());
  assert.equal(config.general.settings.timeout_nomenu, true);
  assert.equal(config.general.settings.esc, true);
  assert.equal(config.general.linux.cancelmenu, true);
  assert.equal(config.general.exclusion.exclusiontype, 'black');
  assert.equal(config.general.engine.txtengine[0].name, 'Google');
  assert.equal(config.general.script.script[0].name, 'Test Script');
  assert.equal(config.mges.settings.model, 2);
  assert.equal(config.mges.ui.line.enable, true);
  assert.equal(config.drg.settings.clickcancel, false);
  assert.equal(config.sdrg.settings.drgurl, true);
  assert.equal(config.dca.settings.confirm, true);
  assert.equal(config.ksa.settings.timeout, 1000);
  for (const appName of ['appslist', 'autoreload', 'homepage', 'next', 'notepad', 'rss', 'shorturl', 'jslist', 'tablist', 'recentbk', 'recentht', 'recentclosed', 'synced', 'savepdf', 'tbkjx', 'speaker', 'extmgm']) {
    assert.equal(Object.hasOwn(config.apps, appName), true, `${appName} default app config must exist`);
  }
}

async function testInjectedAppConfigMessagesKeepLegacyReadableShape() {
  const storedConfig = {
    version: 46,
    general: { sync: { autosync: false } },
    apps: {
      appslist: { n_closebox: true },
      homepage: { curListId: 'home-default' },
      next: { keywds: [{ key: 'g', url: 'https://example.test/?q=%s' }] },
    },
  };
  const calls = [];
  const dispatcher = createDispatcherWithServices({
    storage: {
      async getLocal(keys) {
        calls.push(['getLocal', keys]);
        return { config: storedConfig };
      },
      async saveConfig(config) {
        calls.push(['saveConfig', config.apps.homepage.curListId]);
        return { area: 'local' };
      },
    },
  });

  assert.equal((await dispatcher.handleMessage({ type: 'getappconf', apptype: 'next' }, {})).keywds[0].key, 'g');
  assert.deepEqual(await dispatcher.handleMessage({ type: 'apps_getvalue', apptype: 'homepage' }, {}), {
    ok: true,
    apptype: 'homepage',
    type: 'homepage',
    config: { curListId: 'home-default' },
    value: { curListId: 'home-default' },
  });
  assert.deepEqual(
    await dispatcher.handleMessage({ type: 'apps_saveconf', apptype: 'homepage', config: { curListId: 'home-2' } }, {}),
    { ok: true, area: 'local', apptype: 'homepage', type: 'homepage', value: 'homepage' },
  );
  assert.deepEqual(calls, [
    ['getLocal', ['config']],
    ['saveConfig', 'home-2'],
  ]);
}

async function testAppslistAndJslistKeepLegacyReadableValues() {
  const storedConfig = {
    version: 46,
    general: { script: { script: [{ name: 'Script A', content: 'alert(1)' }] } },
    apps: {
      appslist: { enabled: ['rss', 'jslist'] },
      jslist: { enabled: ['0'] },
    },
  };
  const dispatcher = createDispatcherWithServices({
    storage: {
      async getLocal() {
        return { config: storedConfig };
      },
    },
  });

  const appslistValue = await dispatcher.handleMessage({ type: 'apps_getvalue', apptype: 'appslist' }, {});
  assert.deepEqual(appslistValue.config, { enabled: ['rss', 'jslist'] });
  assert.equal(Array.isArray(appslistValue.value.apps), true);
  assert.equal(appslistValue.value.apps.includes('jslist'), true);

  const jslistValue = await dispatcher.handleMessage({ type: 'apps_getvalue', apptype: 'jslist' }, {});
  assert.deepEqual(jslistValue.config, { enabled: ['0'] });
  assert.deepEqual(jslistValue.value.js, [{ name: 'Script A', content: 'alert(1)' }]);
}

async function testReachableAppsActionsDoNotReturnUnsupported() {
  const calls = [];
  const dispatcher = createDispatcherWithServices({
    storage: {
      async getLocal() {
        return {
          config: {
            version: 46,
            general: { sync: { autosync: false } },
            apps: {
              autoreload: { n_interval: 30 },
              homepage: { curListId: 'list-1' },
              notepad: {},
              rss: { n_optype: 's_new', n_position: 's_default', n_pin: false },
              shorturl: {},
            },
          },
        };
      },
      async saveConfig(config) {
        calls.push(['saveConfig', config.apps.homepage.curListId]);
        return { area: 'local' };
      },
    },
    apps: {
      tabs: {
        async open(url) { calls.push(['open', url]); },
      },
      messaging: {
        async sendToTab(tabId, payload) { calls.push(['sendToTab', tabId, payload.type]); },
      },
      autoreload: {
        async reload(tabId, value) { calls.push(['autoreload', tabId, value.type]); },
      },
      notepad: {
        async get() { calls.push(['notepadGet']); return { item: [] }; },
        async set(value) { calls.push(['notepadSet', value.data.id]); },
      },
      shorturl: {
        async getURL(value) { calls.push(['shorturl', value.key]); return { url: 'https://short.test/a' }; },
      },
      rss: {
        async getMessage(url) { calls.push(['rssGet', url]); return { title: 'Feed', items: [] }; },
      },
      homepage: {
        async getImageURL() { calls.push(['homepageImage']); return 'https://img.test/bg.jpg'; },
      },
    },
  });

  const sender = { tab: { id: 7 } };

  for (const message of [
    { type: 'appsAction', app: 'autoreload', action: 'getConf' },
    { type: 'appsAction', app: 'autoreload', action: 'reload', value: { type: 'start', interval: 30, iconCountdown: false, bypassCache: false } },
    { type: 'appsAction', app: 'homepage', action: 'getImageURL' },
    { type: 'appsAction', app: 'homepage', action: 'setListId', value: 'list-2' },
    { type: 'appsAction', app: 'homepage', action: 'openItem', value: 'https://example.test/' },
    { type: 'appsAction', app: 'notepad', action: 'get', value: { method: 'get' } },
    { type: 'appsAction', app: 'notepad', action: 'set', value: { method: 'put', data: { id: 0, last: 0, item: [] } } },
    { type: 'appsAction', app: 'rss', action: 'getMessage', value: 'https://example.test/rss.xml' },
    { type: 'appsAction', app: 'rss', action: 'openItem', value: 'https://example.test/post' },
    { type: 'appsAction', app: 'shorturl', action: 'getURL', value: { key: 'abc' } },
  ]) {
    const response = await dispatcher.handleMessage(message, sender);
    assert.notEqual(response.error, 'unsupported-app-action', `${message.app}/${message.action} must be supported`);
    assert.equal(response.ok, true, `${message.app}/${message.action} must succeed`);
  }

  assert.deepEqual(calls, [
    ['autoreload', 7, 'start'],
    ['homepageImage'],
    ['sendToTab', 7, 'imageURL'],
    ['saveConfig', 'list-2'],
    ['open', 'https://example.test/'],
    ['notepadGet'],
    ['sendToTab', 7, 'appsListener_get'],
    ['notepadSet', 0],
    ['rssGet', 'https://example.test/rss.xml'],
    ['sendToTab', 7, 'rssData'],
    ['open', 'https://example.test/post'],
    ['shorturl', 'abc'],
    ['sendToTab', 7, 'url'],
  ]);
}

await testDefaultConfigIsSafeForActiveOptionAndEventPaths();
await testInjectedAppConfigMessagesKeepLegacyReadableShape();
await testAppslistAndJslistKeepLegacyReadableValues();
await testReachableAppsActionsDoNotReturnUnsupported();

console.log('review #7 regression contract verified');
