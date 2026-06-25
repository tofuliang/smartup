import assert from 'node:assert/strict';

import { createDispatcher } from '../js/sw/dispatcher.js';

function createDispatcherWithStorage(storage) {
  return createDispatcher({
    storage,
    actionState: {},
    injection: {},
    nativeHelper: {},
    permissions: {},
  });
}

function createDispatcherWithServices(services) {
  return createDispatcher({
    storage: {},
    actionState: {},
    injection: {},
    nativeHelper: {},
    permissions: {},
    ...services,
  });
}

async function testStorageGetLocalMessageUsesStorageService() {
  const calls = [];
  const dispatcher = createDispatcherWithStorage({
    async getLocal(keys) {
      calls.push(['getLocal', keys]);
      return { config: { enabled: true } };
    },
  });

  const response = await dispatcher.handleMessage({ type: 'storage_get_local', keys: ['config'] }, {});

  assert.deepEqual(response, { ok: true, value: { config: { enabled: true } } });
  assert.deepEqual(calls, [['getLocal', ['config']]]);
}

async function testStorageGetSyncMessageUsesStorageService() {
  const calls = [];
  const dispatcher = createDispatcherWithStorage({
    async getSync(keys) {
      calls.push(['getSync', keys]);
      return { synced: 'yes' };
    },
  });

  const response = await dispatcher.handleMessage({ type: 'storage_get_sync', keys: 'synced' }, {});

  assert.deepEqual(response, { ok: true, value: { synced: 'yes' } });
  assert.deepEqual(calls, [['getSync', 'synced']]);
}

async function testOptionsConfigMessageReturnsLegacyConfigContract() {
  const calls = [];
  const storedConfig = { version: 46, general: { fnswitch: { fnpop: true } } };
  const dispatcher = createDispatcherWithStorage({
    async getLocal(keys) {
      calls.push(['getLocal', keys]);
      return { config: storedConfig };
    },
  });

  const response = await dispatcher.handleMessage({ type: 'opt_getconf' }, {});

  assert.equal(response.type, 'opt_getconf');
  assert.equal(response.config, storedConfig);
  assert.notEqual(response.defaultConf, storedConfig);
  assert.equal(response.defaultConf.version, 46);
  assert.equal(response.defaultConf.general.fnswitch.fnpop, false);
  assert.equal(response.devMode, false);
  assert.equal(response.os, '');
  assert.deepEqual(calls, [['getLocal', ['config']]]);
}

async function testPopupConfigMessageReturnsLegacyConfigContract() {
  const storedConfig = { version: 46, pop: { actions: [{ name: 'newtab' }] } };
  const dispatcher = createDispatcherWithStorage({
    async getLocal(keys) {
      assert.deepEqual(keys, ['config']);
      return { config: storedConfig };
    },
  });

  const response = await dispatcher.handleMessage({ type: 'pop_getconf' }, {});

  assert.equal(response.type, 'pop_getconf');
  assert.equal(response.config, storedConfig);
  assert.notEqual(response.defaultConf, storedConfig);
}

async function testEventConfigMessageReturnsLegacyConfigContract() {
  const storedConfig = { version: 46, mges: { actions: [{ direct: 'R', name: 'reload' }] } };
  const dispatcher = createDispatcherWithStorage({
    async getLocal(keys) {
      assert.deepEqual(keys, ['config']);
      return { config: storedConfig };
    },
  });

  const response = await dispatcher.handleMessage({ type: 'evt_getconf' }, {});

  assert.equal(response.type, 'evt_getconf');
  assert.equal(response.config, storedConfig);
  assert.notEqual(response.defaultConf, storedConfig);
}

async function testLegacyRootLevelLocalConfigIsMigratedBeforeDefaults() {
  const legacyConfig = { version: 40, general: { fnswitch: { fnpop: true } }, mges: { actions: [] } };
  const calls = [];
  const dispatcher = createDispatcherWithStorage({
    async getLocal(keys) {
      calls.push(['getLocal', keys]);
      if (Array.isArray(keys)) {
        return {};
      }
      return { ...legacyConfig, localConfig: { apps: { rss: { feedtitle: [] } } } };
    },
    async saveConfig(config) {
      calls.push(['saveConfig', config.version]);
      return { area: 'local' };
    },
    async getSync(keys) {
      calls.push(['getSync', keys]);
      return {};
    },
  });

  const response = await dispatcher.handleMessage({ type: 'opt_getconf' }, {});

  assert.equal(response.config.version, 40);
  assert.equal(response.config.general.fnswitch.fnpop, true);
  assert.deepEqual(calls, [
    ['getLocal', ['config']],
    ['getLocal', null],
    ['saveConfig', 40],
  ]);
}

async function testSaveConfStoresSyncConfigWhenAutosyncEnabled() {
  const calls = [];
  const savedConfig = { version: 47, general: { sync: { autosync: true } } };
  const dispatcher = createDispatcherWithServices({
    storage: {
      hasSync: true,
      async saveConfig(config) {
        calls.push(['saveConfig', config]);
        return { area: 'sync' };
      },
    },
  });

  const response = await dispatcher.handleMessage({ type: 'saveConf', value: savedConfig }, {});

  assert.deepEqual(response, { ok: true, area: 'sync' });
  assert.deepEqual(calls, [['saveConfig', savedConfig]]);
}

async function testColdStartPrefersSyncConfigWhenAutosyncEnabled() {
  const calls = [];
  const localConfig = { version: 46, general: { sync: { autosync: false } }, marker: 'local-old' };
  const syncConfig = { version: 47, general: { sync: { autosync: true } }, marker: 'sync-new' };
  const dispatcher = createDispatcherWithStorage({
    async getLocal(keys) {
      calls.push(['getLocal', keys]);
      if (Array.isArray(keys)) {
        return { config: localConfig, configSource: 'sync' };
      }
      return { config: localConfig, configSource: 'sync' };
    },
    async getSync(keys) {
      calls.push(['getSync', keys]);
      return syncConfig;
    },
  });

  const response = await dispatcher.handleMessage({ type: 'opt_getconf' }, {});

  assert.equal(response.config.marker, 'sync-new');
  assert.deepEqual(calls, [
    ['getLocal', ['config']],
    ['getSync', null],
  ]);
}

async function testSaveConfRejectsMissingConfigInsteadOfFalseSuccess() {
  const dispatcher = createDispatcherWithServices({
    storage: {
      async saveConfig() {
        throw new Error('must not be called');
      },
    },
  });

  const response = await dispatcher.handleMessage({ type: 'saveConf' }, {});

  assert.deepEqual(response, { ok: false, error: 'missing-config' });
}

async function testActionPopRunsConfiguredPopupActionAndPersistsLastSelection() {
  const calls = [];
  const firstAction = { name: 'none' };
  const selectedAction = { name: 'optionspage' };
  const storedConfig = {
    version: 46,
    general: { sync: { autosync: false } },
    pop: {
      settings: { type: 'back', last: true },
      actions: [firstAction, selectedAction],
    },
  };
  const dispatcher = createDispatcherWithServices({
    storage: {
      async getLocal(keys) {
        calls.push(['getLocal', keys]);
        return { config: storedConfig };
      },
      async saveConfig(config) {
        calls.push(['saveConfig', config.pop.actions.map((action) => action.name)]);
        return { area: 'local' };
      },
    },
    actionState: {
      async runPopupAction(action, context) {
        calls.push(['runPopupAction', action.name, context.mode, context.senderTabId]);
        return { handled: true, actionName: action.name };
      },
    },
  });

  const response = await dispatcher.handleMessage({ type: 'action_pop', index: 1 }, { tab: { id: 7 } });

  assert.deepEqual(response, { ok: true, actionName: 'optionspage', area: 'local' });
  assert.deepEqual(calls, [
    ['getLocal', ['config']],
    ['runPopupAction', 'optionspage', 'back', 7],
    ['saveConfig', ['optionspage', 'none']],
  ]);
}

async function testActionPopReportsUnhandledPopupActionInsteadOfFalseSuccess() {
  const dispatcher = createDispatcherWithServices({
    storage: {
      async getLocal() {
        return { config: { pop: { settings: { type: 'back' }, actions: [{ name: 'unknown-popup-action' }] } } };
      },
    },
    actionState: {
      async runPopupAction(action) {
        return { handled: false, actionName: action.name };
      },
    },
  });

  const response = await dispatcher.handleMessage({ type: 'action_pop', index: 0 }, { tab: { id: 7 } });

  assert.deepEqual(response, { ok: false, error: 'unhandled-popup-action', actionName: 'unknown-popup-action' });
}

async function testMajorActionMessagesRunConfiguredActions() {
  const calls = [];
  const storedConfig = {
    mges: { actions: [{ direct: 'R', name: 'reload' }] },
    rges: { actions: [{ name: 'close' }, { name: 'newtab' }] },
    wges: { actions: [{ name: 'back' }, { name: 'forward' }, { name: 'optionspage' }, { name: 'reload' }] },
    dca: { actions: [{ name: 'optionspage' }] },
    ksa: { actions: [{ name: 'newtab' }] },
  };
  const dispatcher = createDispatcherWithServices({
    storage: {
      async getLocal() {
        return { config: storedConfig };
      },
    },
    actionState: {
      async runAction(action, context) {
        calls.push([action.name, context.message.type, context.senderTabId, context.message.url ?? null]);
        return { handled: true, actionName: action.name };
      },
    },
  });

  assert.deepEqual(await dispatcher.handleMessage({ type: 'action_rges', sendValue: { buttons: 2 } }, { tab: { id: 11 } }), { ok: true, actionName: 'newtab' });
  assert.deepEqual(await dispatcher.handleMessage({ type: 'action_wges', sendValue: { buttons: 1, wheelDelta: -120 } }, { tab: { id: 11 } }), { ok: true, actionName: 'back' });
  assert.deepEqual(await dispatcher.handleMessage({ type: 'action_dca' }, { tab: { id: 11 } }), { ok: true, actionName: 'optionspage' });
  assert.deepEqual(await dispatcher.handleMessage({ type: 'action_ksa', id: 0 }, { tab: { id: 11 } }), { ok: true, actionName: 'newtab' });
  assert.deepEqual(await dispatcher.handleMessage({ type: 'action_np', npok: true, url: 'https://next.example/page-2' }, { tab: { id: 11 } }), { ok: true, actionName: 'next' });
  assert.deepEqual(await dispatcher.handleMessage({ type: 'action', direct: 'R', drawType: ['mges', 'actions'] }, { tab: { id: 11 } }), { ok: true, actionName: 'reload' });

  assert.deepEqual(calls, [
    ['newtab', 'action_rges', 11, null],
    ['back', 'action_wges', 11, null],
    ['optionspage', 'action_dca', 11, null],
    ['newtab', 'action_ksa', 11, null],
    ['next', 'action_np', 11, 'https://next.example/page-2'],
    ['reload', 'action', 11, null],
  ]);
}

async function testConfiguredTxtsearchPassesConfigIntoActionState() {
  const calls = [];
  const storedConfig = {
    general: {
      engine: {
        txtengine: [{ content: 'https://search.test/?q=%s' }],
      },
    },
    mges: {
      actions: [{ direct: 'R', name: 'txtsearch', selects: [{ type: 'n_txtengine', value: '0' }] }],
    },
  };
  const dispatcher = createDispatcherWithServices({
    storage: {
      async getLocal() {
        return { config: storedConfig };
      },
    },
    actionState: {
      async runAction(action, context) {
        calls.push([action.name, context.message.type, context.senderTabId, context.config?.general?.engine?.txtengine?.[0]?.content]);
        return { handled: true, actionName: action.name };
      },
    },
  });

  const response = await dispatcher.handleMessage(
    { type: 'action', direct: 'R', drawType: ['mges', 'actions'], selEle: { txt: 'hello' } },
    { tab: { id: 12 } },
  );

  assert.deepEqual(response, { ok: true, actionName: 'txtsearch' });
  assert.deepEqual(calls, [
    ['txtsearch', 'action', 12, 'https://search.test/?q=%s'],
  ]);
}

async function testPermissionResumePreservesSerializableIntentUntilGrant() {
  let pendingPermission = null;
  const calls = [];
  const dispatcher = createDispatcherWithServices({
    permissions: {
      async setPendingPermission(permission) {
        pendingPermission = {
          pers: permission.permissions,
          orgs: permission.origins,
          msg: permission.message,
          intent: permission.intent,
        };
        calls.push(['setPendingPermission', pendingPermission]);
      },
      async getPendingPermission() {
        calls.push(['getPendingPermission']);
        return pendingPermission;
      },
      async clearPendingPermission() {
        calls.push(['clearPendingPermission']);
        pendingPermission = null;
      },
      async openPermissionPage(path) {
        calls.push(['openPermissionPage', path]);
      },
      async resumeIntent(intent) {
        calls.push(['resumeIntent', intent]);
        return { resumed: true, action: 'open-options' };
      },
    },
  });

  await dispatcher.handleMessage({
    type: 'opt_getpers',
    value: {
      thepers: ['browserSettings'],
      theorgs: null,
      intent: { source: 'options', action: 'permission-granted' },
      msg: 'Needs browser settings',
    },
  }, {});

  const permissionPageConfig = await dispatcher.handleMessage({ type: 'per_getconf' }, {});
  const resume = await dispatcher.handleMessage({ type: 'per_resume', resumeIntent: permissionPageConfig.intent }, {});

  assert.deepEqual(permissionPageConfig, {
    pers: ['browserSettings'],
    orgs: null,
    msg: 'Needs browser settings',
    intent: { source: 'options', action: 'permission-granted' },
  });
  assert.deepEqual(resume, {
    ok: true,
    resumed: true,
    action: 'open-options',
    intent: { source: 'options', action: 'permission-granted' },
  });
  assert.equal(pendingPermission, null);
  assert.deepEqual(calls.map((call) => call[0]), [
    'setPendingPermission',
    'openPermissionPage',
    'getPendingPermission',
    'getPendingPermission',
    'clearPendingPermission',
    'resumeIntent',
  ]);
  assert.equal(calls[1][1], 'html/getpermissions.html');
}

async function testPermissionResumeUsesSerializedIntentFromPermissionPage() {
  const calls = [];
  const dispatcher = createDispatcherWithServices({
    permissions: {
      async getPendingPermission() {
        return null;
      },
      async clearPendingPermission() {},
      async resumeIntent(intent) {
        calls.push(['resumeIntent', intent]);
        return { resumed: true, action: 'open-options' };
      },
    },
  });

  const resume = await dispatcher.handleMessage({
    type: 'per_resume',
    resumeIntent: { source: 'options', action: 'permission-granted' },
  }, {});

  assert.deepEqual(resume, {
    ok: true,
    resumed: true,
    action: 'open-options',
    intent: { source: 'options', action: 'permission-granted' },
  });
  assert.deepEqual(calls, [['resumeIntent', { source: 'options', action: 'permission-granted' }]]);
}

async function testPermissionResumeReportsUnsupportedIntentHonestly() {
  const dispatcher = createDispatcherWithServices({
    permissions: {
      async getPendingPermission() {
        return null;
      },
      async clearPendingPermission() {},
    },
  });

  const resume = await dispatcher.handleMessage({
    type: 'per_resume',
    resumeIntent: { source: 'legacy', action: 'unknown' },
  }, {});

  assert.deepEqual(resume, {
    ok: false,
    error: 'unsupported-resume-intent',
    intent: { source: 'legacy', action: 'unknown' },
  });
}

async function testInjectedScrollAndZoomMessagesReturnWorkerState() {
  const calls = [];
  const storedConfig = {
    general: {
      settings: {
        boxzoom: true,
      },
    },
    mges: {
      actions: [
        {
          direct: 'Z',
          name: 'zoom',
          selects: [{ type: 'n_zoom', value: 's_in' }],
        },
      ],
    },
    wges: {
      actions: [
        {
          name: 'scroll',
          selects: [{ type: 'n_scroll', value: 's_up' }],
          checks: [{ type: 'n_effect', value: false }],
        },
      ],
    },
  };
  const dispatcher = createDispatcherWithServices({
    storage: {
      async getLocal() {
        return { config: storedConfig };
      },
    },
    actionState: {
      async runAction() {
        calls.push(['runAction']);
        return { handled: false, actionName: 'unexpected' };
      },
    },
    injection: {
      async injectFiles(tabId, files, allFrames) {
        calls.push(['injectFiles', tabId, files, allFrames]);
      },
    },
  });

  assert.deepEqual(
    await dispatcher.handleMessage({ type: 'action_wges', sendValue: { buttons: 1, wheelDelta: -120 } }, { tab: { id: 22 } }),
    { ok: true, actionName: 'scroll' },
  );
  assert.deepEqual(await dispatcher.handleMessage({ type: 'scroll' }, { tab: { id: 22 } }), { type: 'up', effect: false });

  assert.deepEqual(
    await dispatcher.handleMessage({ type: 'action', direct: 'Z', drawType: ['mges', 'actions'] }, { tab: { id: 22 } }),
    { ok: true, actionName: 'zoom' },
  );
  assert.deepEqual(await dispatcher.handleMessage({ type: 'zoom' }, { tab: { id: 22 } }), { value: 's_in' });
  assert.deepEqual(calls, [
    ['injectFiles', 22, ['js/inject/scroll.js'], true],
    ['injectFiles', 22, ['js/inject/zoom.js'], false],
  ]);
}

async function testGettipRestoresGestureHintSemantics() {
  const storedConfig = {
    mges: {
      ui: {
        allaction: { enable: true },
      },
      actions: [
        {
          direct: 'R',
          name: 'reload',
          note: { type: 'text', value: 'Reload current page' },
        },
        {
          direct: 'RU',
          name: 'newtab',
        },
        {
          direct: 'RD',
          name: 'close',
          mydes: { type: 'text', value: 'Close tab now' },
        },
      ],
    },
  };

  const dispatcher = createDispatcherWithServices({
    storage: {
      async getLocal() {
        return { config: storedConfig };
      },
    },
  });

  const previousChrome = globalThis.chrome;
  globalThis.chrome = {
    ...previousChrome,
    i18n: {
      getMessage(key) {
        return {
          reload: '重新加载',
          newtab: '新建标签页',
        }[key] ?? key;
      },
    },
  };

  try {
    const response = await dispatcher.handleMessage(
      { type: 'gettip', direct: 'R', drawType: ['mges', 'actions'] },
      { tab: { id: 23 } },
    );

    assert.deepEqual(response, {
      type: 'tip',
      tip: '重新加载',
      note: { type: 'text', value: 'Reload current page' },
      allaction: [
        { direct: 'RU', tip: '新建标签页' },
        { direct: 'RD', tip: 'Close tab now' },
      ],
    });
  } finally {
    globalThis.chrome = previousChrome;
  }
}

async function testLegacyGetpersMessageRefreshesPermissionState() {
  const calls = [];
  const dispatcher = createDispatcherWithServices({
    permissions: {
      async getAll() {
        calls.push(['getAll']);
        return { permissions: ['tabs'], origins: ['https://example.com/*'] };
      },
    },
  });

  const response = await dispatcher.handleMessage({ type: 'getpers' }, {});

  assert.deepEqual(response, {
    ok: true,
    permissions: ['tabs'],
    origins: ['https://example.com/*'],
  });
  assert.deepEqual(calls, [['getAll']]);
}

async function testSyncedAppsActionRestoresSessionThroughWorker() {
  const calls = [];
  const dispatcher = createDispatcherWithServices({
    apps: {
      sessions: {
        async restore(sessionId) {
          calls.push(['restore', sessionId]);
          return { restored: true, sessionId };
        },
      },
    },
  });

  const response = await dispatcher.handleMessage(
    { type: 'appsAction', app: 'synced', action: 'openItem', value: 'session-7' },
    { tab: { id: 22 } },
  );

  assert.deepEqual(response, { ok: true, app: 'synced', action: 'openItem' });
  assert.deepEqual(calls, [['restore', 'session-7']]);
}

async function testUnknownAppsActionDoesNotSilentlySucceed() {
  const dispatcher = createDispatcherWithServices({});

  const response = await dispatcher.handleMessage({ type: 'appsAction', app: 'extmgm' }, { tab: { id: 22 } });

  assert.equal(response.ok, false);
  assert.equal(response.app, 'extmgm');
  assert.equal(response.action, null);
}

async function testUnknownCriticalActionDoesNotSilentlySucceed() {
  const dispatcher = createDispatcherWithStorage({
    async getLocal() {
      return { config: {} };
    },
  });

  const response = await dispatcher.handleMessage({ type: 'action_wges' }, {});

  assert.deepEqual(response, { ok: false, error: 'missing-action', type: 'action_wges' });
}

await testStorageGetLocalMessageUsesStorageService();
await testStorageGetSyncMessageUsesStorageService();
await testOptionsConfigMessageReturnsLegacyConfigContract();
await testPopupConfigMessageReturnsLegacyConfigContract();
await testEventConfigMessageReturnsLegacyConfigContract();
await testLegacyRootLevelLocalConfigIsMigratedBeforeDefaults();
await testSaveConfStoresSyncConfigWhenAutosyncEnabled();
await testColdStartPrefersSyncConfigWhenAutosyncEnabled();
await testSaveConfRejectsMissingConfigInsteadOfFalseSuccess();
await testActionPopRunsConfiguredPopupActionAndPersistsLastSelection();
await testActionPopReportsUnhandledPopupActionInsteadOfFalseSuccess();
await testMajorActionMessagesRunConfiguredActions();
await testConfiguredTxtsearchPassesConfigIntoActionState();
await testPermissionResumePreservesSerializableIntentUntilGrant();
await testPermissionResumeUsesSerializedIntentFromPermissionPage();
await testPermissionResumeReportsUnsupportedIntentHonestly();
await testInjectedScrollAndZoomMessagesReturnWorkerState();
await testGettipRestoresGestureHintSemantics();
await testLegacyGetpersMessageRefreshesPermissionState();
await testSyncedAppsActionRestoresSessionThroughWorker();
await testUnknownCriticalActionDoesNotSilentlySucceed();
await testUnknownAppsActionDoesNotSilentlySucceed();

console.log('dispatcher storage message contract verified');
