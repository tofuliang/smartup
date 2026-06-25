import assert from 'node:assert/strict';

import { createDispatcher } from '../js/sw/dispatcher.js';

function createDispatcherWithInjection(injection) {
  return createDispatcher({
    actionState: {},
    injection,
    permissions: {},
  });
}

async function testInjectFilesUsesSenderTabWhenTargetMissing() {
  const calls = [];
  const dispatcher = createDispatcherWithInjection({
    async injectFiles(tabId, files, allFrames) {
      calls.push(['injectFiles', tabId, files, allFrames]);
    },
  });

  const response = await dispatcher.handleMessage(
    { type: 'inject_files', files: ['js/lib/apps_basic.js'], allFrames: true },
    { tab: { id: 42 } },
  );

  assert.deepEqual(response, { ok: true });
  assert.deepEqual(calls, [['injectFiles', 42, ['js/lib/apps_basic.js'], true]]);
}

async function testInjectSequenceUsesSenderTabWhenTargetMissing() {
  const calls = [];
  const dispatcher = createDispatcherWithInjection({
    async injectSequence(tabId, fileGroups, allFrames) {
      calls.push(['injectSequence', tabId, fileGroups, allFrames]);
    },
  });

  const response = await dispatcher.handleMessage(
    { type: 'inject_sequence', fileGroups: [['js/lib/purify.js'], ['js/lib/qrcode.js']], allFrames: false },
    { tab: { id: 84 } },
  );

  assert.deepEqual(response, { ok: true });
  assert.deepEqual(calls, [['injectSequence', 84, [['js/lib/purify.js'], ['js/lib/qrcode.js']], false]]);
}

async function testInjectFilesRejectsMissingTargetTab() {
  const calls = [];
  const dispatcher = createDispatcherWithInjection({
    async injectFiles(tabId, files, allFrames) {
      calls.push(['injectFiles', tabId, files, allFrames]);
    },
  });

  const response = await dispatcher.handleMessage(
    { type: 'inject_files', files: ['js/inject/zoom.js'] },
    {},
  );

  assert.deepEqual(response, { ok: false, error: 'missing-target-tab', type: 'inject_files' });
  assert.deepEqual(calls, []);
}

async function testInjectFilesRejectsMissingFiles() {
  const calls = [];
  const dispatcher = createDispatcherWithInjection({
    async injectFiles(tabId, files, allFrames) {
      calls.push(['injectFiles', tabId, files, allFrames]);
    },
  });

  const response = await dispatcher.handleMessage(
    { type: 'inject_files', targetTabId: 7 },
    {},
  );

  assert.deepEqual(response, { ok: false, error: 'missing-files', type: 'inject_files' });
  assert.deepEqual(calls, []);
}

async function testInjectSequenceRejectsMissingFileGroups() {
  const calls = [];
  const dispatcher = createDispatcherWithInjection({
    async injectSequence(tabId, fileGroups, allFrames) {
      calls.push(['injectSequence', tabId, fileGroups, allFrames]);
    },
  });

  const response = await dispatcher.handleMessage(
    { type: 'inject_sequence', targetTabId: 7, fileGroups: [] },
    {},
  );

  assert.deepEqual(response, { ok: false, error: 'missing-file-groups', type: 'inject_sequence' });
  assert.deepEqual(calls, []);
}

async function testInjectFilesRejectsExternalSenders() {
  const calls = [];
  const dispatcher = createDispatcherWithInjection({
    async injectFiles(tabId, files, allFrames) {
      calls.push(['injectFiles', tabId, files, allFrames]);
    },
  });

  const response = await dispatcher.handleMessage(
    { type: 'inject_files', files: ['js/inject/zoom.js'] },
    { id: 'external-ext', tab: { id: 42 } },
  );

  assert.deepEqual(response, { ok: false, error: 'forbidden-external-message', type: 'inject_files' });
  assert.deepEqual(calls, []);
}

async function testInjectSequenceRejectsExternalSenders() {
  const calls = [];
  const dispatcher = createDispatcherWithInjection({
    async injectSequence(tabId, fileGroups, allFrames) {
      calls.push(['injectSequence', tabId, fileGroups, allFrames]);
    },
  });

  const response = await dispatcher.handleMessage(
    { type: 'inject_sequence', fileGroups: [['js/lib/purify.js']] },
    { id: 'external-ext', tab: { id: 84 } },
  );

  assert.deepEqual(response, { ok: false, error: 'forbidden-external-message', type: 'inject_sequence' });
  assert.deepEqual(calls, []);
}

await testInjectFilesUsesSenderTabWhenTargetMissing();
await testInjectSequenceUsesSenderTabWhenTargetMissing();
await testInjectFilesRejectsMissingTargetTab();
await testInjectFilesRejectsMissingFiles();
await testInjectSequenceRejectsMissingFileGroups();
await testInjectFilesRejectsExternalSenders();
await testInjectSequenceRejectsExternalSenders();

console.log('dispatcher injection message contract verified');
