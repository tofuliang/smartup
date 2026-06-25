import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

import { entrypointPaths } from './helpers/entrypoint-paths.mjs';

const eventScript = await readFile(new URL(`../${entrypointPaths.event}`, import.meta.url), 'utf8');
const dispatcher = await readFile(new URL('../js/sw/dispatcher.js', import.meta.url), 'utf8');
const permissionsPageScript = await readFile(new URL('../js/pages/getpermissons.js', import.meta.url), 'utf8');
const shorturlAppScript = await readFile(new URL('../js/inject/shorturl.js', import.meta.url), 'utf8');
const notepadAppScript = await readFile(new URL('../js/inject/notepad.js', import.meta.url), 'utf8');

test('future content event entrypoint keeps runtime message bridge contract', () => {
  assert.match(
    eventScript,
    /chrome\.runtime\.onMessage\.addListener/,
    `${entrypointPaths.event} must keep a runtime onMessage bridge`,
  );
});

test('dispatcher restores gettip contract for gesture UI hints', () => {
  assert.match(
    dispatcher,
    /message\.type === 'gettip'|message\.type=="gettip"/,
    'dispatcher must restore gettip contract for gesture UI hints',
  );
});

test('content event entrypoint requests gettip when any gesture feedback UI is enabled', () => {
  assert.match(
    eventScript,
    /ui\.tip\.enable\s*\|\|[\s\S]*ui\.note\.enable[\s\S]*ui\.allaction\.enable|ui\.allaction\.enable[\s\S]*ui\.tip\.enable/,
    `${entrypointPaths.event} must request gettip when tip, note, or allaction feedback is enabled`,
  );
});

test('permissions page resumes granted permission intent before clearing pending state', () => {
  assert.match(
    permissionsPageScript,
    /type:"per_resume"|type:\s*"per_resume"/,
    'permission page must resume the serialized permission intent after grant',
  );
});

test('shorturl app restores legacy YOURls configuration fields', () => {
  assert.match(shorturlAppScript, /n_suyourls/, 'shorturl app must restore the n_suyourls option');
  assert.match(shorturlAppScript, /n_yourls/, 'shorturl app must restore the n_yourls option');
  assert.match(shorturlAppScript, /n_sign/, 'shorturl app must restore the n_sign option');
});

test('notepad app restores a reachable lock menu entry', () => {
  assert.match(
    notepadAppScript,
    /su_notepad_menulock|action:"notepad-lock"/,
    'notepad app must restore a reachable lock entry instead of leaving it commented out',
  );
});
