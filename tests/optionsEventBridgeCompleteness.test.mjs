import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('options event bridge keeps the core gesture methods used by runtime handlers', async () => {
  const source = await readFile(resolve(repoRoot, 'js/content/event.js'), 'utf8');

  for (const requiredSnippet of [
    'lineDrawReady:function',
    'lineDraw:function',
    'stopMges:function',
    'sendDir:function',
    'exclusionMatch:',
    'chrome.runtime.sendMessage(extID,{type:"evt_getconf"}',
    'chrome.runtime.sendMessage(extID,{type:dirType,direct:dir,drawType:sue.drawType,selEle:sue.selEle}',
  ]) {
    assert.equal(
      source.includes(requiredSnippet),
      true,
      `js/content/event.js must preserve gesture bridge snippet: ${requiredSnippet}`,
    );
  }
});
