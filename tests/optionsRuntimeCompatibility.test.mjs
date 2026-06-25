import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('options page uses runtime.getURL for extension asset urls in MV3', async () => {
  const source = await readFile(resolve(repoRoot, 'js/pages/options.js'), 'utf8');

  const runtimeDirectPngMatches = source.match(/chrome\.runtime\.getURL\("image\/direct\.png"\)/g) || [];

  assert.equal(
    source.includes('chrome.extension.getURL'),
    false,
    'options page must not depend on chrome.extension.getURL in MV3 runtime paths',
  );
  assert.equal(
    runtimeDirectPngMatches.length,
    2,
    'options page should resolve both direct.png asset usages through chrome.runtime.getURL("image/direct.png")',
  );
});
