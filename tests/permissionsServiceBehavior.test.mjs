import assert from 'node:assert/strict';

import { createPermissions } from '../js/sw/permissions.js';

const calls = [];
const local = {};

globalThis.chrome = {
  tabs: {
    async create(details) {
      calls.push(['tabs.create', details]);
    },
  },
};

const storage = {
  async setLocal(value) {
    calls.push(['setLocal', value]);
    Object.assign(local, value);
  },
  async getLocal(keys) {
    calls.push(['getLocal', keys]);
    return Object.fromEntries(keys.map((key) => [key, local[key]]));
  },
};

const runtime = {
  getURL(path) {
    return `chrome-extension://id/${path}`;
  },
};

const permissions = createPermissions({}, runtime, storage);

await permissions.setPendingPermission({
  permissions: ['bookmarks'],
  origins: ['https://example.com/*'],
  message: 'Need bookmarks',
  intent: { source: 'options' },
});

const restored = createPermissions({}, runtime, storage);

assert.deepEqual(await restored.getPendingPermission(), {
  pers: ['bookmarks'],
  orgs: ['https://example.com/*'],
  msg: 'Need bookmarks',
  intent: { source: 'options' },
});

await restored.openPermissionPage('html/getpermissions.html');
await restored.resumeIntent({ source: 'options', action: 'permission-granted' });
await restored.clearPendingPermission();

assert.equal(local.pendingPermission, null);
assert.deepEqual(calls.at(-3), ['tabs.create', { url: 'chrome-extension://id/html/getpermissions.html' }]);
assert.deepEqual(calls.at(-2), ['tabs.create', { url: 'chrome-extension://id/html/options.html' }]);

console.log('permissions service behavior verified');
