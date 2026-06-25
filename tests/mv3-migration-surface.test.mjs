import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { entrypointPaths } from './helpers/entrypoint-paths.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('active entrypoint source files are readable at their canonical paths', async () => {
  const activeSurfaceFiles = [
    entrypointPaths.event,
    entrypointPaths.options,
  ];

  for (const sourcePath of activeSurfaceFiles) {
    const source = await readFile(resolve(repoRoot, sourcePath), 'utf8');

    assert.equal(source.length > 0, true, `${sourcePath} should be readable`);
  }
});
