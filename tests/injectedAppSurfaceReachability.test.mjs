import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const shorturlScript = await readFile(new URL('../js/inject/shorturl.js', import.meta.url), 'utf8');
const notepadScript = await readFile(new URL('../js/inject/notepad.js', import.meta.url), 'utf8');

test('shorturl appInfo restores legacy option surface', () => {
  const shorturlOptionsBlock = shorturlScript.match(/options:\s*\[(.*?)\]/s)?.[1] ?? '';

  assert.match(shorturlOptionsBlock, /label:"n_qr"/);
  assert.match(shorturlOptionsBlock, /label:"n_suyourls"/);
  assert.match(shorturlOptionsBlock, /label:"n_yourls"/);
  assert.match(shorturlOptionsBlock, /label:"n_sign"/);
});

test('notepad appInfo restores reachable lock menu surface', () => {
  const notepadMenuBlock = notepadScript.match(/menu:\s*\[(.*?)\]/s)?.[1] ?? '';

  assert.match(notepadMenuBlock, /className:"menu_item su_notepad_menulock"/);
  assert.match(notepadMenuBlock, /action:"notepad-lock"/);
});

test('notepad showLock still creates lock enable and disable actions', () => {
  const showLockBlock = notepadScript.match(/showLock:function\(e\)\{([\s\S]*?)\n\t\}/)?.[1] ?? '';

  assert.match(showLockBlock, /notepad-lockenable/);
  assert.match(showLockBlock, /notepad-lockdisable/);
});
