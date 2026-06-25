import assert from 'node:assert/strict';

import { createStorage } from '../js/sw/storage.js';

async function testPromisifiesCallbackStorageAreas() {
  const calls = [];
  const storage = createStorage({
    local: {
      get(keys, callback) {
        calls.push(['local.get', keys]);
        callback({ autosave: true });
      },
      set(value, callback) {
        calls.push(['local.set', value]);
        callback();
      },
      clear(callback) {
        calls.push(['local.clear']);
        callback();
      },
    },
    sync: {
      get(keys, callback) {
        calls.push(['sync.get', keys]);
        callback({ synced: 'yes' });
      },
      set(value, callback) {
        calls.push(['sync.set', value]);
        callback();
      },
      clear(callback) {
        calls.push(['sync.clear']);
        callback();
      },
    },
  });

  assert.deepEqual(await storage.getLocal(['autosave']), { autosave: true });
  assert.equal(await storage.setLocal({ autosave: false }), undefined);
  assert.deepEqual(await storage.getSync('synced'), { synced: 'yes' });
  assert.deepEqual(calls, [
    ['local.get', ['autosave']],
    ['local.set', { autosave: false }],
    ['sync.get', 'synced'],
  ]);
}

async function testMissingSyncStorageFallsBackToEmptyObject() {
  const calls = [];
  const storage = createStorage({
    local: {
      get(keys, callback) {
        calls.push(['local.get', keys]);
        callback({});
      },
      set(value, callback) {
        calls.push(['local.set', value]);
        callback();
      },
      clear(callback) {
        calls.push(['local.clear']);
        callback();
      },
    },
  });

  assert.deepEqual(await storage.getSync(['missing']), {});
  assert.deepEqual(calls, []);
}

async function testSaveConfigWritesSyncWhenAutosyncEnabled() {
  const calls = [];
  const config = { version: 46, general: { sync: { autosync: true } } };
  const storage = createStorage({
    local: {
      get(keys, callback) {
        calls.push(['local.get', keys]);
        callback({});
      },
      set(value, callback) {
        calls.push(['local.set', value]);
        callback();
      },
      clear(callback) {
        calls.push(['local.clear']);
        callback();
      },
    },
    sync: {
      get(keys, callback) {
        calls.push(['sync.get', keys]);
        callback({});
      },
      set(value, callback) {
        calls.push(['sync.set', value]);
        callback();
      },
      clear(callback) {
        calls.push(['sync.clear']);
        callback();
      },
    },
  });

  assert.deepEqual(await storage.saveConfig(config), { area: 'sync' });
  assert.deepEqual(calls, [
    ['sync.set', config],
    ['local.set', { config, configSource: 'sync' }],
  ]);
}

async function testSaveConfigWritesLocalAndKeepsLocalConfigWhenAutosyncDisabled() {
  const calls = [];
  const config = { version: 46, general: { sync: { autosync: false } } };
  const storage = createStorage({
    local: {
      get(keys, callback) {
        calls.push(['local.get', keys]);
        callback({ localConfig: { menuPin: true } });
      },
      set(value, callback) {
        calls.push(['local.set', value]);
        callback();
      },
      clear(callback) {
        calls.push(['local.clear']);
        callback();
      },
    },
  });

  assert.deepEqual(await storage.saveConfig(config), { area: 'local' });
  assert.deepEqual(calls, [
    ['local.get', null],
    ['local.set', { config, configSource: 'local', localConfig: { menuPin: true } }],
  ]);
}

async function testSaveConfigKeepsUnrelatedLocalKeysWhenAutosyncDisabled() {
  const calls = [];
  const config = { version: 46, general: { sync: { autosync: false } } };
  const storage = createStorage({
    local: {
      get(keys, callback) {
        calls.push(['local.get', keys]);
        callback({ localConfig: { menuPin: true }, pendingPermission: { pers: ['tabs'] }, workerCache: { foo: 'bar' } });
      },
      set(value, callback) {
        calls.push(['local.set', value]);
        callback();
      },
      clear(callback) {
        calls.push(['local.clear']);
        callback();
      },
    },
  });

  assert.deepEqual(await storage.saveConfig(config), { area: 'local' });
  assert.deepEqual(calls, [
    ['local.get', null],
    ['local.set', {
      config,
      configSource: 'local',
      localConfig: { menuPin: true },
      pendingPermission: { pers: ['tabs'] },
      workerCache: { foo: 'bar' },
    }],
  ]);
}

await testPromisifiesCallbackStorageAreas();
await testMissingSyncStorageFallsBackToEmptyObject();
await testSaveConfigWritesSyncWhenAutosyncEnabled();
await testSaveConfigWritesLocalAndKeepsLocalConfigWhenAutosyncDisabled();
await testSaveConfigKeepsUnrelatedLocalKeysWhenAutosyncDisabled();

console.log('storage adapter contract verified');
