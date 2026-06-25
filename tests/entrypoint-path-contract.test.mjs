import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { entrypointPaths } from './helpers/entrypoint-paths.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('entrypoint path contract exposes current canonical entrypoint layout', () => {
  assert.deepEqual(entrypointPaths, {
    event: 'js/content/event.js',
    options: 'js/pages/options.js',
    popup: 'js/pages/popup.js',
    getpermissons: 'js/pages/getpermissons.js',
  });
});

test('popup current source path points to the migrated pages entry', async () => {
  const source = await readFile(resolve(repoRoot, entrypointPaths.popup), 'utf8');

  assert.equal(source.length > 0, true, `${entrypointPaths.popup} should be readable`);
});

test('permissions current source path points to the migrated pages entry', async () => {
  const source = await readFile(resolve(repoRoot, entrypointPaths.getpermissons), 'utf8');

  assert.equal(source.length > 0, true, `${entrypointPaths.getpermissons} should be readable`);
});

test('options current source path points to the migrated pages entry', async () => {
  const source = await readFile(resolve(repoRoot, entrypointPaths.options), 'utf8');

  assert.equal(source.length > 0, true, `${entrypointPaths.options} should be readable`);
});

test('options html loads the migrated pages entry script', async () => {
  const html = await readFile(resolve(repoRoot, 'html/options.html'), 'utf8');

  assert.match(html, /<script src="\.\.\/js\/pages\/options\.js"><\/script>/);
  assert.doesNotMatch(html, /<script src="\.\.\/js\/options\.js"><\/script>/);
});
