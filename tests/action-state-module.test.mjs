import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createActionState } from '../js/sw/action-state.js';

function createRecordingActionApi() {
  const calls = [];
  return {
    calls,
    async setTitle(details) {
      calls.push(['setTitle', details]);
    },
    async setIcon(details) {
      calls.push(['setIcon', details]);
    },
    async setPopup(details) {
      calls.push(['setPopup', details]);
    },
    async setBadgeText(details) {
      calls.push(['setBadgeText', details]);
    },
  };
}

test('action state routes popup, title, and badge updates through the action API', async () => {
  const actionApi = createRecordingActionApi();
  const actionState = createActionState(actionApi);

  await actionState.setDefaultTitle('smartUp');
  await actionState.setPopup('html/popup.html');
  await actionState.setTabIcon(12, '../image/icon_warning.png');
  await actionState.setTabTitle(12, 'warning');
  await actionState.setBadgeText(12, '5');

  assert.deepEqual(actionApi.calls, [
    ['setTitle', { title: 'smartUp' }],
    ['setPopup', { popup: 'html/popup.html' }],
    ['setIcon', { tabId: 12, path: '../image/icon_warning.png' }],
    ['setTitle', { tabId: 12, title: 'warning' }],
    ['setBadgeText', { tabId: 12, text: '5' }],
  ]);
});
