import assert from 'node:assert/strict';

import { createActionState } from '../js/sw/action-state.js';
import { createDispatcher } from '../js/sw/dispatcher.js';

function createDispatcherWithServices(services) {
  return createDispatcher({
    storage: {},
    actionState: {},
    injection: {},
    nativeHelper: {},
    permissions: {},
    apps: {},
    ...services,
  });
}

async function testSendRightClickUsesActiveNativeHelper() {
  const calls = [];
  const dispatcher = createDispatcherWithServices({
    nativeHelper: {
      async sendRightClick(payload) {
        calls.push(['sendRightClick', payload]);
      },
    },
  });

  const message = { type: 'sendRightClick', sendValue: { click: { x: 1, y: 2, b: 2 }, timestamp: 123 } };
  const response = await dispatcher.handleMessage(message, {});

  assert.deepEqual(response, { ok: true, type: 'sendRightClick' });
  assert.deepEqual(calls, [['sendRightClick', message.sendValue]]);
}

async function testLegacyExposedAppsActionsAreNotUnsupported() {
  const calls = [];
  const exts = [{ id: 'self-ext' }, { id: 'ext-a' }, { id: 'ext-b' }];
  const dispatcher = createDispatcherWithServices({
    storage: {
      async getLocal() {
        return {
          config: {
            version: 46,
            apps: {
              extmgm: { always: ['ext-b'], n_uninstallconfirm: true },
              recentbk: { n_optype: 's_new', n_position: 's_default', n_pin: false },
              recentht: { n_optype: 's_back', n_position: 's_right', n_pin: true },
            },
          },
        };
      },
    },
    apps: {
      selfExtId: 'self-ext',
      tabs: {
        async open(url, options) {
          calls.push(['open', url, options]);
        },
        async close(tabId) {
          calls.push(['close', tabId]);
        },
        async switch(tabId) {
          calls.push(['switch', tabId]);
        },
        async savePdf(value) {
          calls.push(['savePdf', value]);
        },
      },
      sessions: {
        async restore(sessionId) {
          calls.push(['restore', sessionId]);
        },
      },
      management: {
        async getAll() {
          calls.push(['getAll']);
          return exts;
        },
        async setEnabled(extId, enabled) {
          calls.push(['setEnabled', extId, enabled]);
        },
        async uninstall(extId, options) {
          calls.push(['uninstall', extId, options]);
          return true;
        },
      },
      messaging: {
        async sendToTab(tabId, payload) {
          calls.push(['sendToTab', tabId, payload]);
        },
      },
      launcher: {
        async openApp(appName) {
          calls.push(['openApp', appName]);
        },
      },
      tts: {
        async speak(value) {
          calls.push(['speak', value]);
        },
        async pause() {
          calls.push(['pause']);
        },
        async resume() {
          calls.push(['resume']);
        },
        async stop() {
          calls.push(['stop']);
        },
      },
    },
  });

  const sender = { tab: { id: 9 } };

  assert.deepEqual(
    await dispatcher.handleMessage({ type: 'appsAction', app: 'tablist', action: 'tabClose', value: 14 }, sender),
    { ok: true, app: 'tablist', action: 'tabClose' },
  );
  assert.deepEqual(
    await dispatcher.handleMessage({ type: 'appsAction', app: 'tablist', action: 'tabSwitch', value: 15 }, sender),
    { ok: true, app: 'tablist', action: 'tabSwitch' },
  );
  assert.deepEqual(
    await dispatcher.handleMessage({ type: 'appsAction', app: 'appslist', action: 'openApp', value: 'rss' }, sender),
    { ok: true, app: 'appslist', action: 'openApp' },
  );
  assert.deepEqual(
    await dispatcher.handleMessage({ type: 'appsAction', app: 'recentbk', action: 'openItem', value: 'https://bk.test/' }, sender),
    { ok: true, app: 'recentbk', action: 'openItem' },
  );
  assert.deepEqual(
    await dispatcher.handleMessage({ type: 'appsAction', app: 'recentht', action: 'openItem', value: 'https://history.test/' }, sender),
    { ok: true, app: 'recentht', action: 'openItem' },
  );
  assert.deepEqual(
    await dispatcher.handleMessage({ type: 'appsAction', app: 'recentclosed', action: 'openItem', value: 'session-1' }, sender),
    { ok: true, app: 'recentclosed', action: 'openItem' },
  );
  assert.deepEqual(
    await dispatcher.handleMessage({ type: 'appsAction', app: 'savepdf', action: 'savePDF', value: { pageRanges: ['1-2'] } }, sender),
    { ok: true, app: 'savepdf', action: 'savePDF' },
  );
  assert.deepEqual(
    await dispatcher.handleMessage({ type: 'appsAction', app: 'speaker', action: 'speak', value: { type: 'play', txt: 'hello' } }, sender),
    { ok: true, app: 'speaker', action: 'speak' },
  );
  assert.deepEqual(
    await dispatcher.handleMessage({ type: 'appsAction', app: 'speaker', action: 'speak', value: { type: 'pause' } }, sender),
    { ok: true, app: 'speaker', action: 'speak' },
  );
  assert.deepEqual(
    await dispatcher.handleMessage({ type: 'appsAction', app: 'extmgm', action: 'getAllExt' }, sender),
    { ok: true, app: 'extmgm', action: 'getAllExt', exts },
  );
  assert.deepEqual(
    await dispatcher.handleMessage({ type: 'appsAction', app: 'extmgm', action: 'itemDisable', extId: 'ext-a' }, sender),
    { ok: true, app: 'extmgm', action: 'itemDisable' },
  );
  assert.deepEqual(
    await dispatcher.handleMessage({ type: 'appsAction', app: 'extmgm', action: 'itemEnable', extId: 'ext-a' }, sender),
    { ok: true, app: 'extmgm', action: 'itemEnable' },
  );
  assert.deepEqual(
    await dispatcher.handleMessage({ type: 'appsAction', app: 'extmgm', action: 'itemOpturl', url: 'chrome://extensions/?id=ext-a' }, sender),
    { ok: true, app: 'extmgm', action: 'itemOpturl' },
  );
  assert.deepEqual(
    await dispatcher.handleMessage({ type: 'appsAction', app: 'extmgm', action: 'itemUninstall', extId: 'ext-a', id: 'row-1' }, sender),
    { ok: true, app: 'extmgm', action: 'itemUninstall' },
  );
  assert.deepEqual(
    await dispatcher.handleMessage({ type: 'appsAction', app: 'extmgm', action: 'enableAll' }, sender),
    { ok: true, app: 'extmgm', action: 'enableAll' },
  );
  assert.deepEqual(
    await dispatcher.handleMessage({ type: 'appsAction', app: 'extmgm', action: 'disableAll' }, sender),
    { ok: true, app: 'extmgm', action: 'disableAll' },
  );

  assert.deepEqual(calls, [
    ['close', 14],
    ['switch', 15],
    ['openApp', 'rss'],
    ['open', 'https://bk.test/', { target: 's_new', position: 's_default', pin: false }],
    ['open', 'https://history.test/', { target: 's_back', position: 's_right', pin: true }],
    ['restore', 'session-1'],
    ['savePdf', { pageRanges: ['1-2'] }],
    ['speak', { type: 'play', txt: 'hello' }],
    ['pause'],
    ['getAll'],
    ['setEnabled', 'ext-a', false],
    ['setEnabled', 'ext-a', true],
    ['open', 'chrome://extensions/?id=ext-a', { target: 's_current', position: 's_default', pin: false }],
    ['uninstall', 'ext-a', { showConfirmDialog: true }],
    ['sendToTab', 9, { type: 'itemUninstall', id: 'row-1', extId: 'ext-a' }],
    ['getAll'],
    ['setEnabled', 'self-ext', true],
    ['setEnabled', 'ext-a', true],
    ['setEnabled', 'ext-b', true],
    ['getAll'],
    ['setEnabled', 'ext-a', false],
  ]);
}

async function testAppslistOpenAppUsesSenderTabLauncher() {
  const calls = [];
  const dispatcher = createDispatcherWithServices({
    apps: {
      launcher: {
        async openApp(appName, context) {
          calls.push(['openApp', appName, context]);
        },
      },
    },
  });

  const response = await dispatcher.handleMessage(
    { type: 'appsAction', app: 'appslist', action: 'openApp', value: 'rss' },
    { tab: { id: 33 } },
  );

  assert.deepEqual(response, { ok: true, app: 'appslist', action: 'openApp' });
  assert.deepEqual(calls, [['openApp', 'rss', { senderTabId: 33 }]]);
}

async function testVisibleAppNameConfiguredActionUsesLauncher() {
  const calls = [];
  const actionState = createActionState({}, {
    launcher: {
      async openApp(appName, context) {
        calls.push(['openApp', appName, context]);
      },
    },
  });
  const dispatcher = createDispatcherWithServices({
    actionState,
    storage: {
      async getLocal() {
        return {
          config: {
            mges: {
              actions: [{ direct: 'L', name: 'qr' }],
            },
          },
        };
      },
    },
  });

  const message = { type: 'action', drawType: ['mges', 'actions'], direct: 'L', selEle: { txt: 'visible action text' } };
  const response = await dispatcher.handleMessage(message, { tab: { id: 77 } });

  assert.deepEqual(response, { ok: true, actionName: 'qr' });
  assert.deepEqual(calls, [['openApp', 'qr', { senderTabId: 77, message }]]);
}

async function testPxmovieAndTbkjxWorkerBridgesDoNotReturnUnsupported() {
  const calls = [];
  const dispatcher = createDispatcherWithServices({
    apps: {
      messaging: {
        async sendToTab(tabId, payload) {
          calls.push(['sendToTab', tabId, payload]);
        },
      },
      contentFeeds: {
        async getPxmovieList() {
          calls.push(['getPxmovieList']);
          return [['A', 'B', 'C', 'https://movie.test/item']];
        },
        async getPxmovieData(url) {
          calls.push(['getPxmovieData', url]);
          return { name: 'Movie', info: [], dl: [], des: 'demo' };
        },
        async getTbkjxData(channel) {
          calls.push(['getTbkjxData', channel]);
          return { data: [['item', 'desc', 9.9, 'img', 5.1]] };
        },
      },
      launcher: {
        async openApp(appName, context) {
          calls.push(['openApp', appName, context]);
        },
      },
      tabs: {
        async open(url, options) {
          calls.push(['open', url, options]);
        },
      },
    },
    storage: {
      async getLocal() {
        return {
          config: {
            apps: {
              tbkjx: { n_optype: 's_new', n_position: 's_default', n_pin: false },
            },
          },
        };
      },
    },
  });

  const sender = { tab: { id: 51 } };

  assert.deepEqual(await dispatcher.handleMessage({ type: 'appsAction', app: 'pxmovie', action: 'getList' }, sender), { ok: true, app: 'pxmovie', action: 'getList' });
  assert.deepEqual(await dispatcher.handleMessage({ type: 'appsAction', app: 'pxmovie', action: 'getData', value: 'https://movie.test/item' }, sender), { ok: true, app: 'pxmovie', action: 'getData' });
  assert.deepEqual(await dispatcher.handleMessage({ type: 'appsAction', app: 'tbkjx', action: 'getData', value: 'jingxuan' }, sender), { ok: true, app: 'tbkjx', action: 'getData' });
  assert.deepEqual(await dispatcher.handleMessage({ type: 'appsAction', app: 'tbkjx', action: 'openApp', value: 'homepage' }, sender), { ok: true, app: 'tbkjx', action: 'openApp' });
  assert.deepEqual(await dispatcher.handleMessage({ type: 'appsAction', app: 'tbkjx', action: 'itemOpen', value: 'https://deal.test/item' }, sender), { ok: true, app: 'tbkjx', action: 'itemOpen' });

  assert.deepEqual(calls, [
    ['getPxmovieList'],
    ['sendToTab', 51, { type: 'list', value: [['A', 'B', 'C', 'https://movie.test/item']] }],
    ['getPxmovieData', 'https://movie.test/item'],
    ['sendToTab', 51, { type: 'data', value: { name: 'Movie', info: [], dl: [], des: 'demo' } }],
    ['getTbkjxData', 'jingxuan'],
    ['sendToTab', 51, { type: 'data', value: { data: [['item', 'desc', 9.9, 'img', 5.1]] } }],
    ['openApp', 'homepage', { senderTabId: 51 }],
    ['open', 'https://deal.test/item', { target: 's_new', position: 's_default', pin: false }],
  ]);
}

async function testJslistUserScriptExecutionUsesMv3Scripting() {
  const calls = [];
  const dispatcher = createDispatcherWithServices({
    storage: {
      async getLocal() {
        return {
          config: {
            general: {
              script: {
                script: [
                  { name: 'Script A', content: 'window.__smartupTest = 1;' },
                ],
              },
            },
            apps: {
              jslist: { n_closebox: true, n_jq: false, enabled: ['0'] },
            },
          },
        };
      },
    },
    apps: {
      jslist: {
        async runScript(tabId, scriptContent) {
          calls.push(['runScript', tabId, scriptContent]);
        },
      },
    },
  });

  const response = await dispatcher.handleMessage(
    { type: 'appsAction', app: 'jslist', action: 'jsRun', value: '0' },
    { tab: { id: 66 } },
  );

  assert.deepEqual(response, { ok: true, app: 'jslist', action: 'jsRun' });
  assert.deepEqual(calls, [['runScript', 66, 'window.__smartupTest = 1;']]);
}

await testSendRightClickUsesActiveNativeHelper();
await testLegacyExposedAppsActionsAreNotUnsupported();
await testAppslistOpenAppUsesSenderTabLauncher();
await testVisibleAppNameConfiguredActionUsesLauncher();
await testPxmovieAndTbkjxWorkerBridgesDoNotReturnUnsupported();
await testJslistUserScriptExecutionUsesMv3Scripting();

console.log('dispatcher legacy compatibility contract verified');
