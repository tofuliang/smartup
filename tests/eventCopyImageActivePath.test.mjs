import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

import { entrypointPaths } from './helpers/entrypoint-paths.mjs';

const eventScript = await readFile(new URL(`../${entrypointPaths.event}`, import.meta.url), 'utf8');

test('content event entrypoint remains readable and still exposes a runtime message bridge', () => {
  assert.equal(eventScript.length > 0, true, `${entrypointPaths.event} should be readable`);
  assert.match(
    eventScript,
    /chrome\.runtime\.onMessage\.addListener/,
    `${entrypointPaths.event} must still expose a runtime message bridge`,
  );
});
