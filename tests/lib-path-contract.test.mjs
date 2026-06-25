import assert from 'node:assert/strict';
import { constants } from 'node:fs';
import { access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

async function isReadable(path) {
  try {
    await access(resolve(repoRoot, path), constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

test('legacy standalone libraries live under js/lib', async () => {
  const legacyLibraries = ['gbk.js', 'md5.js'];

  for (const fileName of legacyLibraries) {
    assert.equal(await isReadable(`js/lib/${fileName}`), true, `js/lib/${fileName} should exist`);
    assert.equal(await isReadable(`js/${fileName}`), false, `js/${fileName} should not remain at js root`);
  }
});
