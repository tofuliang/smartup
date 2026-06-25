import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { createDispatcher } from '../js/sw/dispatcher.js';

function createDispatcherWithServices(services) {
  return createDispatcher({
    storage: {},
    actionState: {},
    injection: {},
    permissions: {},
    ...services,
  });
}

async function testEmptyStorageInitializesDefaultConfig() {
  const calls = [];
  const dispatcher = createDispatcherWithServices({
    storage: {
      hasSync: true,
      async getLocal(keys) {
        calls.push(['getLocal', keys]);
        return {};
      },
      async getSync(keys) {
        calls.push(['getSync', keys]);
        return {};
      },
      async saveConfig(config) {
        calls.push(['saveConfig', config.version, config.general?.fnswitch?.fnmges]);
        return { area: 'local' };
      },
    },
  });

  const response = await dispatcher.handleMessage({ type: 'opt_getconf' }, {});

  assert.equal(response.type, 'opt_getconf');
  assert.equal(response.config.version, 46);
  assert.notEqual(response.defaultConf, response.config);
  assert.equal(response.defaultConf.version, 46);
  assert.equal(response.config.general.fnswitch.fnmges, true);
  assert.deepEqual(calls, [
    ['getLocal', ['config']],
    ['getLocal', null],
    ['getSync', null],
    ['saveConfig', 46, true],
  ]);
}

async function testDefaultReachableActionsAreHandled() {
  const calls = [];
  const dispatcher = createDispatcherWithServices({
    storage: {
      async getLocal() {
        return {};
      },
      async getSync() {
        return {};
      },
      async saveConfig(config) {
        calls.push(['saveConfig', config.version]);
        return { area: 'local' };
      },
    },
    actionState: {
      async runAction(action, context) {
        calls.push(['runAction', action.name, context.message.type, context.message.direct ?? null]);
        return { handled: true, actionName: action.name };
      },
      async runPopupAction(action, context) {
        calls.push(['runPopupAction', action.name, context.mode]);
        return { handled: true, actionName: action.name };
      },
    },
  });

  assert.deepEqual(await dispatcher.handleMessage({ type: 'action', direct: 'L', drawType: ['mges', 'actions'] }, { tab: { id: 3 } }), { ok: true, actionName: 'back' });
  assert.deepEqual(await dispatcher.handleMessage({ type: 'action', direct: 'R', drawType: ['mges', 'actions'] }, { tab: { id: 3 } }), { ok: true, actionName: 'forward' });
  assert.deepEqual(await dispatcher.handleMessage({ type: 'action', direct: 'DL', drawType: ['mges', 'actions'] }, { tab: { id: 3 } }), { ok: true, actionName: 'newtab' });
  assert.deepEqual(await dispatcher.handleMessage({ type: 'action', direct: 'DR', drawType: ['mges', 'actions'] }, { tab: { id: 3 } }), { ok: true, actionName: 'close' });
  assert.deepEqual(await dispatcher.handleMessage({ type: 'action_pop', index: 0 }, { tab: { id: 3 } }), { ok: true, actionName: 'reload', area: null });
  assert.deepEqual(await dispatcher.handleMessage({ type: 'action_dca' }, { tab: { id: 3 } }), { ok: true, actionName: 'newtab' });
  assert.deepEqual(await dispatcher.handleMessage({ type: 'action_ksa', id: 0 }, { tab: { id: 3 } }), { ok: true, actionName: 'newtab' });
}

async function testInjectedAppConfigMessagesReturnMinimalSupportedContracts() {
  const storedConfig = {
    apps: {
      appslist: { n_closebox: true },
      next: { n_npkey_n: true },
    },
  };
  const saved = [];
  const dispatcher = createDispatcherWithServices({
    storage: {
      async getLocal() {
        return { config: storedConfig };
      },
      async saveConfig(config) {
        saved.push(config.apps.appslist.n_closebox);
        return { area: 'local' };
      },
    },
  });

  assert.deepEqual(await dispatcher.handleMessage({ type: 'apps_getvalue', apptype: 'appslist' }, {}), {
    ok: true,
    apptype: 'appslist',
    type: 'appslist',
    config: { n_closebox: true },
    value: {
      apps: ['rss', 'tablist', 'random', 'extmgm', 'recentbk', 'recentht', 'recentclosed', 'synced', 'base64', 'qr', 'numc', 'speaker', 'jslist', 'convertcase', 'autoreload', 'homepage', 'magnet'],
    },
  });
  assert.deepEqual(await dispatcher.handleMessage({ type: 'getappconf', apptype: 'next' }, {}), {
    ok: true,
    apptype: 'next',
    config: { n_npkey_n: true },
    n_npkey_n: true,
  });
  assert.deepEqual(await dispatcher.handleMessage({ type: 'apps_saveconf', apptype: 'appslist', config: { n_closebox: false } }, {}), {
    ok: true,
    area: 'local',
    apptype: 'appslist',
    type: 'appslist',
    value: 'appslist',
  });
  assert.deepEqual(saved, [false]);
}

async function testRemovedAboutLocaleKeysAreCleanedFromReviewedLocales() {
  const removedKeys = ['menu_about', 'about', 'donatedev', 'ext_allver', 'moreext', 'des_moreextlist', 'translate', 'thanks', 'changelog'];
  for (const locale of ['it', 'ru', 'zh_TW', 'pt_BR']) {
    const localeText = (await readFile(new URL(`../_locales/${locale}/messages.json`, import.meta.url), 'utf8')).replace(/^\uFEFF/, '');
    const messages = JSON.parse(localeText);
    for (const key of removedKeys) {
      assert.equal(Object.hasOwn(messages, key), false, `${locale} must not keep removed ${key}`);
    }
  }
}

await testEmptyStorageInitializesDefaultConfig();
await testDefaultReachableActionsAreHandled();
await testInjectedAppConfigMessagesReturnMinimalSupportedContracts();
await testRemovedAboutLocaleKeysAreCleanedFromReviewedLocales();

console.log('review #5 regression contract verified');
