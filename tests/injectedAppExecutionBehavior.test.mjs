import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { test } from 'node:test';

const shorturlScript = await readFile(new URL('../js/inject/shorturl.js', import.meta.url), 'utf8');
const notepadScript = await readFile(new URL('../js/inject/notepad.js', import.meta.url), 'utf8');

function createElement(tagName) {
  return {
    tagName,
    children: [],
    dataset: {},
    style: { cssText: '' },
    classList: {
      contains() { return false; },
      add() {},
      remove() {},
    },
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    remove() {},
    focus() {},
    select() {},
    addEventListener() {},
    querySelector() { return createElement('div'); },
    querySelectorAll() { return []; },
  };
}

function createSueHarness() {
  const captured = { appInfo: null, shownPanel: null };
  const appRoot = createElement('div');
  const head = createElement('div');
  const main = createElement('div');
  head.style = { cssText: '' };
  main.style = { cssText: '' };
  appRoot.querySelector = () => ({
    appendChild() {},
    style: { cssText: '' },
    querySelector(selector) {
      if (selector === '.su_head') return head;
      if (selector === '.su_main') return main;
      return createElement('div');
    },
    querySelectorAll() { return []; },
  });
  const sue = {
    apps: {
      init() {},
      initPos() {},
      initBox(appInfo) {
        captured.appInfo = appInfo;
        return appRoot;
      },
      domCreate(tag, attrs, _inner, _css, data, text) {
        const node = createElement(tag);
        node.attrs = attrs;
        node.data = data;
        node.text = text ?? '';
        node.dataset = {};
        if (data?.setName && data?.setValue) {
          data.setName.forEach((name, index) => {
            node.dataset[name] = data.setValue[index];
          });
        }
        return node;
      },
      i18n(key) { return key; },
      getAPPboxEle() {
        return {
          querySelector(selector) {
            if (selector === '.su_notepad_lock') {
              return createElement('div');
            }
            return createElement('div');
          },
        };
      },
      showPanel(node) {
        captured.shownPanel = node;
      },
      notification() {},
      fixURL(value) { return value; },
    },
  };
  return { sue, captured, appRoot };
}

function createRuntimeStub() {
  return {
    calls: [],
    sendMessage(_message, callback) {
      this.calls.push(_message);
      callback?.({ config: {}, value: {}, app: 'stub', type: 'stub' });
    },
    onMessage: {
      addListener() {},
    },
  };
}

test('executing shorturl inject script captures restored option surface through initBox', () => {
  const { sue, captured } = createSueHarness();
  const chrome = { runtime: createRuntimeStub() };
  const context = vm.createContext({ sue, chrome, window: { location: { href: 'https://page.test/' } }, QRCode: function QRCode() {}, console });

  vm.runInContext(shorturlScript, context, { filename: 'shorturl.js' });

  assert.ok(captured.appInfo, 'shorturl initUI should pass appInfo into initBox');
  const optionNames = Array.from(captured.appInfo.options, (option) => option.name);
  assert.equal(JSON.stringify(optionNames), JSON.stringify(['n_qr', 'n_suyourls', 'n_yourls', 'n_sign']));
});

test('executing notepad inject script captures restored lock menu surface through initBox', () => {
  const { sue, captured } = createSueHarness();
  const chrome = { runtime: createRuntimeStub() };
  const context = vm.createContext({ sue, chrome, window: {}, console });

  vm.runInContext(notepadScript, context, { filename: 'notepad.js' });

  assert.ok(captured.appInfo, 'notepad initUI should pass appInfo into initBox');
  const lockMenu = captured.appInfo.menu.find((item) => item.action === 'notepad-lock');
  assert.ok(lockMenu, 'notepad lock menu entry should be reachable in appInfo');
});

test('notepad showLock builds enable and disable action controls when executed', () => {
  const { sue, captured } = createSueHarness();
  const lockContainer = createElement('div');
  const chrome = { runtime: createRuntimeStub() };
  sue.apps.getAPPboxEle = () => ({
    querySelector(selector) {
      if (selector === '.su_notepad_lock') {
        return lockContainer;
      }
      return createElement('div');
    },
  });
  const context = vm.createContext({ sue, chrome, window: {}, console, Date });

  vm.runInContext(notepadScript, context, { filename: 'notepad.js' });
  context.sue.apps.notepad.showLock({ target: createElement('button') });

  const actionValues = [];
  const visit = (node) => {
    if (!node) return;
    const actionValue = node?.data?.setValue?.[0] ?? node?.dataset?.action ?? null;
    if (actionValue) actionValues.push(actionValue);
    for (const child of node.children ?? []) {
      visit(child);
    }
  };
  visit(lockContainer);
  assert.ok(actionValues.includes('notepad-lockenable'));
  assert.ok(actionValues.includes('notepad-lockdisable'));
  assert.ok(captured.shownPanel, 'showLock should open the lock panel');
});

test('shorturl click interaction dispatches getURL through runtime message', () => {
  const { sue } = createSueHarness();
  const runtime = createRuntimeStub();
  const chrome = { runtime };
  const buttonRoot = createElement('div');
  buttonRoot.querySelector = (selector) => {
    if (selector === '.su_shorturl_info') {
      return { innerText: '' };
    }
    if (selector === '.su_shorturl_textkey') {
      return { value: 'demo-key' };
    }
    return createElement('div');
  };
  sue.apps.getAPPboxEle = () => buttonRoot;
  const context = vm.createContext({ sue, chrome, window: { location: { href: 'https://page.test/' } }, QRCode: function QRCode() {}, console });

  vm.runInContext(shorturlScript, context, { filename: 'shorturl.js' });
  context.sue.apps.shorturl.handleEvent({
    type: 'click',
    target: {
      classList: { contains: (name) => name === 'su_shorturl_btn' },
    },
  });

  const actionMessage = runtime.calls.find((message) => message?.app === 'shorturl' && message?.action === 'getURL');
  assert.ok(actionMessage, 'shorturl click should dispatch appsAction/getURL');
  assert.equal(actionMessage.value.key, 'demo-key');
});

test('notepad click interaction routes lock action into showLock', () => {
  const { sue } = createSueHarness();
  const runtime = createRuntimeStub();
  const chrome = { runtime };
  const context = vm.createContext({ sue, chrome, window: {}, console, Date });

  vm.runInContext(notepadScript, context, { filename: 'notepad.js' });
  let called = false;
  context.sue.apps.notepad.showLock = () => {
    called = true;
  };
  context.sue.apps.notepad.handleEvent({
    type: 'click',
    target: {
      classList: { contains: () => false },
      dataset: { action: 'notepad-lock' },
    },
  });

  assert.equal(called, true, 'notepad lock menu click should route into showLock');
});

test('notepad lock enable and disable actions are recognized by click handler', () => {
  const { sue } = createSueHarness();
  const runtime = createRuntimeStub();
  const chrome = { runtime };
  const context = vm.createContext({ sue, chrome, window: {}, console, Date });

  vm.runInContext(notepadScript, context, { filename: 'notepad.js' });

  assert.doesNotThrow(() => {
    context.sue.apps.notepad.handleEvent({
      type: 'click',
      target: {
        classList: { contains: () => false },
        dataset: { action: 'notepad-lockenable' },
      },
    });
    context.sue.apps.notepad.handleEvent({
      type: 'click',
      target: {
        classList: { contains: () => false },
        dataset: { action: 'notepad-lockdisable' },
      },
    });
  });
});
