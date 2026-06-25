import assert from 'node:assert/strict';

const calls = [];

globalThis.screen = {
  availHeight: 900,
  availWidth: 1600,
};

globalThis.chrome = {
  runtime: {
    async openOptionsPage() {
      calls.push(['openOptionsPage']);
    },
    async reload() {
      calls.push(['runtime.reload']);
    },
    getURL(path) {
      return `chrome-extension://smartup/${path}`;
    },
  },
  tabs: {
    async create(details) {
      calls.push(['create', details]);
    },
    async reload(tabId, details) {
      calls.push(['reload', tabId, details]);
    },
    async remove(tabId) {
      calls.push(['remove', tabId]);
    },
    async sendMessage(tabId, message) {
      calls.push(['sendMessage', tabId, message]);
    },
    async update(tabId, details) {
      calls.push(['update', tabId, details]);
    },
    async query(details) {
      calls.push(['query', details]);
      if (typeof details?.index === 'number') {
        return [{ id: 17, url: 'https://tab.example/item', title: 'Indexed Tab', mutedInfo: { muted: false } }];
      }
      return [{ id: 7, mutedInfo: { muted: false }, url: 'https://example.com/path/section/page-009.html', title: 'Example Page' }];
    },
    async goBack(tabId) {
      calls.push(['goBack', tabId]);
    },
    async goForward(tabId) {
      calls.push(['goForward', tabId]);
    },
    async duplicate(tabId) {
      calls.push(['duplicate', tabId]);
      return { id: 8 };
    },
    async move(tabId, details) {
      calls.push(['move', tabId, details]);
    },
    async get(tabId) {
      calls.push(['get', tabId]);
      return { id: tabId, index: 2, pinned: false };
    },
    async toggleReaderMode(tabId) {
      calls.push(['toggleReaderMode', tabId]);
    },
  },
  downloads: {
    async download(details) {
      calls.push(['download', details]);
      return 1;
    },
    async showDefaultFolder() {
      calls.push(['showDefaultFolder']);
    },
  },
  bookmarks: {
    async search(query) {
      calls.push(['bookmarks.search', query]);
      return [];
    },
    async create(details) {
      calls.push(['bookmarks.create', details]);
      return { id: 'bk-1' };
    },
    async remove(id) {
      calls.push(['bookmarks.remove', id]);
    },
  },
  tts: {
    async speak(text, details) {
      calls.push(['tts.speak', text, details]);
    },
  },
  windows: {
    async create(details) {
      calls.push(['windows.create', details]);
      return { id: 21, tabs: [{ id: 31 }] };
    },
    async getCurrent() {
      calls.push(['windows.getCurrent']);
      return { id: 11, state: 'normal' };
    },
    async getAll(details) {
      calls.push(['windows.getAll', details]);
      return [
        { id: 11, tabs: [{ id: 7 }] },
        { id: 12, tabs: [{ id: 41 }, { id: 42 }] },
        { id: 13, tabs: [{ id: 51 }] },
      ];
    },
    async update(windowId, details) {
      calls.push(['windows.update', windowId, details]);
      return { id: windowId, state: details.state ?? 'normal' };
    },
    async remove(windowId) {
      calls.push(['windows.remove', windowId]);
    },
  },
  scripting: {
    async executeScript(details) {
      calls.push(['scripting.executeScript', details.target?.tabId ?? null, typeof details.func, details.args ?? null, details.files ?? null]);
    },
  },
  browserSettings: {
    openBookmarksInNewTabs: {
      async get() {
        calls.push(['browserSettings.openBookmarksInNewTabs.get']);
        return { value: false };
      },
      async set(details) {
        calls.push(['browserSettings.openBookmarksInNewTabs.set', details]);
      },
    },
    openSearchResultsInNewTabs: {
      async get() {
        calls.push(['browserSettings.openSearchResultsInNewTabs.get']);
        return { value: true };
      },
      async set(details) {
        calls.push(['browserSettings.openSearchResultsInNewTabs.set', details]);
      },
    },
  },
  pageCapture: {
    async saveAsMHTML(details) {
      calls.push(['saveAsMHTML', details]);
      return new Blob(['demo'], { type: 'message/rfc822' });
    },
  },
};

globalThis.fetch = async (url) => {
  calls.push(['fetch', url]);
  return {
    async blob() {
      return new Blob(['image-bytes'], { type: 'image/png' });
    },
  };
};

const { createActionState } = await import('../js/sw/action-state.js');

const actionState = createActionState({});
const launcherCalls = [];
const launchActionState = createActionState({}, {
  launcher: {
    async openApp(appName, context) {
      launcherCalls.push(['openApp', appName, context]);
    },
  },
});

assert.deepEqual(await actionState.runPopupAction({ name: 'optionspage' }, { senderTabId: 4 }), {
  handled: true,
  actionName: 'optionspage',
});
assert.deepEqual(await actionState.runAction({ name: 'reload' }, { senderTabId: 4 }), {
  handled: true,
  actionName: 'reload',
});
assert.deepEqual(await actionState.runAction({ name: 'stop' }, { senderTabId: 4 }), {
  handled: true,
  actionName: 'stop',
});
assert.deepEqual(await actionState.runAction({ name: 'switchtab', selects: [{ type: 'n_tab_lrhl', value: 's_right' }] }, { senderTabId: 4 }), {
  handled: true,
  actionName: 'switchtab',
});
assert.deepEqual(await actionState.runAction({ name: 'open', texts: [{ type: 'n_url', value: 'example.com' }], selects: [{ type: 'n_optype', value: 's_new' }], checks: [{ type: 'n_pin', value: false }] }, { senderTabId: 4 }), {
  handled: true,
  actionName: 'open',
});
assert.deepEqual(await actionState.runAction({ name: 'copytxt' }, { senderTabId: 4, message: { selEle: { txt: 'hello' } } }), {
  handled: true,
  actionName: 'copytxt',
});
assert.deepEqual(await actionState.runAction({ name: 'paste' }, { senderTabId: 4, message: { clipboardText: 'pasted text' } }), {
  handled: true,
  actionName: 'paste',
});
assert.deepEqual(await actionState.runAction({ name: 'reopen' }, { senderTabId: 4 }), {
  handled: true,
  actionName: 'reopen',
});
assert.deepEqual(await actionState.runAction({ name: 'duplicate' }, { senderTabId: 4 }), {
  handled: true,
  actionName: 'duplicate',
});
assert.deepEqual(await actionState.runAction({ name: 'pretab' }, { senderTabId: 4, previousTabId: 19 }), {
  handled: true,
  actionName: 'pretab',
});
assert.deepEqual(await actionState.runAction({ name: 'next', selects: [{ type: 'n_optype', value: 's_new' }], checks: [{ type: 'n_pin', value: false }] }, { senderTabId: 4, message: { url: 'https://next.example/page-2' } }), {
  handled: true,
  actionName: 'next',
});
assert.deepEqual(await actionState.runAction({ name: 'previous', selects: [{ type: 'n_optype', value: 's_back' }], checks: [{ type: 'n_pin', value: true }] }, { senderTabId: 4, message: { url: 'https://prev.example/page-1' } }), {
  handled: true,
  actionName: 'previous',
});
assert.deepEqual(await actionState.runAction({ name: 'back' }, { senderTabId: 4 }), {
  handled: true,
  actionName: 'back',
});
assert.deepEqual(await actionState.runAction({ name: 'forward' }, { senderTabId: 4 }), {
  handled: true,
  actionName: 'forward',
});
assert.deepEqual(await actionState.runAction({ name: 'pin', selects: [{ type: 'n_tab', value: 's_current' }] }, { senderTabId: 4 }), {
  handled: true,
  actionName: 'pin',
});
assert.deepEqual(await actionState.runAction({ name: 'move', selects: [{ type: 'n_position_lrhl', value: 's_left' }] }, { senderTabId: 4 }), {
  handled: true,
  actionName: 'move',
});
assert.deepEqual(await actionState.runAction({ name: 'detach' }, { senderTabId: 4 }), {
  handled: true,
  actionName: 'detach',
});
assert.deepEqual(await actionState.runAction({ name: 'newwin' }, { senderTabId: 4 }), {
  handled: true,
  actionName: 'newwin',
});
assert.deepEqual(await actionState.runAction({ name: 'upperlevel', selects: [{ type: 'n_optype', value: 's_new' }], checks: [{ type: 'n_pin', value: false }] }, { senderTabId: 4, message: { tabUrl: 'https://example.com/path/section/page-009.html' } }), {
  handled: true,
  actionName: 'upperlevel',
});
assert.deepEqual(await actionState.runAction({ name: 'increment', selects: [{ type: 'n_optype', value: 's_new' }], checks: [{ type: 'n_pin', value: false }] }, { senderTabId: 4, message: { tabUrl: 'https://example.com/path/section/page-009.html' } }), {
  handled: true,
  actionName: 'increment',
});
assert.deepEqual(await actionState.runAction({ name: 'decrement', selects: [{ type: 'n_optype', value: 's_new' }], checks: [{ type: 'n_pin', value: false }] }, { senderTabId: 4, message: { tabUrl: 'https://example.com/path/section/page-009.html' } }), {
  handled: true,
  actionName: 'decrement',
});
assert.deepEqual(await actionState.runAction({ name: 'reopenincognito', selects: [{ type: 'n_optype', value: 's_incog' }], checks: [{ type: 'n_reopenkeep', value: false }] }, { senderTabId: 4, message: { tabUrl: 'https://page.test/' } }), {
  handled: true,
  actionName: 'reopenincognito',
});
assert.deepEqual(await actionState.runAction({ name: 'closewin' }, { senderTabId: 4 }), {
  handled: true,
  actionName: 'closewin',
});
assert.deepEqual(await actionState.runAction({ name: 'max' }, { senderTabId: 4 }), {
  handled: true,
  actionName: 'max',
});
assert.deepEqual(await actionState.runAction({ name: 'min' }, { senderTabId: 4 }), {
  handled: true,
  actionName: 'min',
});
assert.deepEqual(await actionState.runAction({ name: 'full' }, { senderTabId: 4 }), {
  handled: true,
  actionName: 'full',
});
assert.deepEqual(await actionState.runAction({ name: 'mergewin', selects: [{ type: 'n_winstate', value: 's_maximized' }] }, { senderTabId: 4 }), {
  handled: true,
  actionName: 'mergewin',
});
assert.deepEqual(await actionState.runAction({ name: 'snap', selects: [{ type: 'n_snap', value: 's_right' }] }, { senderTabId: 4 }), {
  handled: true,
  actionName: 'snap',
});
assert.deepEqual(await actionState.runAction({ name: 'scroll', selects: [{ type: 'n_scroll', value: 's_up' }], checks: [{ type: 'n_effect', value: false }] }, { senderTabId: 4 }), {
  handled: true,
  actionName: 'scroll',
});
assert.deepEqual(await actionState.runAction({ name: 'zoom', selects: [{ type: 'n_zoom', value: 's_in' }] }, { senderTabId: 4 }), {
  handled: true,
  actionName: 'zoom',
});
assert.deepEqual(await actionState.runAction({ name: 'zoom_dep', selects: [{ type: 'n_zoom', value: 's_in' }] }, { senderTabId: 4 }), {
  handled: true,
  actionName: 'zoom_dep',
});
assert.deepEqual(await actionState.runAction({ name: 'txtsearch', selects: [{ type: 'n_txtengine', value: '0' }, { type: 'n_encoding', value: 's_uri' }, { type: 'n_optype', value: 's_new' }], checks: [{ type: 'n_pin', value: false }] }, { senderTabId: 4, message: { selEle: { txt: 'hello world' } }, config: { general: { engine: { txtengine: [{ content: 'https://search.test/?q=%s' }] } } } }), {
  handled: true,
  actionName: 'txtsearch',
});
assert.deepEqual(await actionState.runAction({ name: 'txtsearchclip', selects: [{ type: 'n_txtengine', value: '0' }, { type: 'n_encoding', value: 's_uric' }, { type: 'n_optype', value: 's_new' }], checks: [{ type: 'n_pin', value: false }] }, { senderTabId: 4, message: { clipboardText: 'hello world/clip' }, config: { general: { engine: { txtengine: [{ content: 'https://search.test/?q=%s' }] } } } }), {
  handled: true,
  actionName: 'txtsearchclip',
});
assert.deepEqual(await actionState.runAction({ name: 'openlnk', selects: [{ type: 'n_optype', value: 's_new' }], checks: [{ type: 'n_pin', value: false }] }, { senderTabId: 4, message: { selEle: { lnk: 'https://link.test/' } } }), {
  handled: true,
  actionName: 'openlnk',
});
assert.deepEqual(await actionState.runAction({ name: 'openimg', selects: [{ type: 'n_optype', value: 's_new' }], checks: [{ type: 'n_pin', value: false }] }, { senderTabId: 4, message: { selEle: { img: 'https://img.test/p.png' } } }), {
  handled: true,
  actionName: 'openimg',
});
assert.deepEqual(await actionState.runAction({ name: 'bookmarklnk' }, { senderTabId: 4, message: { selEle: { lnk: 'https://link.test/', str: 'Link Title' } } }), {
  handled: true,
  actionName: 'bookmarklnk',
});
assert.deepEqual(await actionState.runAction({ name: 'copylnkurl' }, { senderTabId: 4, message: { selEle: { lnk: 'https://link.test/' } } }), {
  handled: true,
  actionName: 'copylnkurl',
});
assert.deepEqual(await actionState.runAction({ name: 'copytabele', selects: [{ type: 'n_tab_single', value: 0 }, { type: 'n_copytabele_content', value: 's_tabele_aslnk' }] }, { senderTabId: 4 }), {
  handled: true,
  actionName: 'copytabele',
});
assert.deepEqual(await actionState.runAction({ name: 'copylnktxt' }, { senderTabId: 4, message: { selEle: { str: 'Link Title' } } }), {
  handled: true,
  actionName: 'copylnktxt',
});
assert.deepEqual(await actionState.runAction({ name: 'copylnkaslnk' }, { senderTabId: 4, message: { selEle: { lnk: 'https://link.test/', str: 'Link Title' } } }), {
  handled: true,
  actionName: 'copylnkaslnk',
});
assert.deepEqual(await actionState.runAction({ name: 'dllink', checks: [{ type: 'n_dialog', value: true }] }, { senderTabId: 4, message: { selEle: { lnk: 'https://link.test/file.zip' } } }), {
  handled: true,
  actionName: 'dllink',
});
assert.deepEqual(await actionState.runAction({ name: 'source', selects: [{ type: 'n_optype', value: 's_new' }], checks: [{ type: 'n_pin', value: false }] }, { senderTabId: 4, message: { tabUrl: 'https://page.test/' } }), {
  handled: true,
  actionName: 'source',
});
assert.deepEqual(await actionState.runAction({ name: 'openclip', selects: [{ type: 'n_optype', value: 's_new' }], checks: [{ type: 'n_pin', value: false }] }, { senderTabId: 4, message: { clipboardText: 'example.com' } }), {
  handled: true,
  actionName: 'openclip',
});
assert.deepEqual(await actionState.runAction({ name: 'print' }, { senderTabId: 4 }), {
  handled: true,
  actionName: 'print',
});
assert.deepEqual(await actionState.runAction({ name: 'mute' }, { senderTabId: 4 }), {
  handled: true,
  actionName: 'mute',
});
assert.deepEqual(await actionState.runAction({ name: 'saveimg', checks: [{ type: 'n_notif', value: true }] }, { senderTabId: 4, message: { selEle: { img: 'https://img.test/p.png' } } }), {
  handled: true,
  actionName: 'saveimg',
});
assert.deepEqual(await actionState.runAction({ name: 'saveimgas', checks: [{ type: 'n_notif', value: true }] }, { senderTabId: 4, message: { selEle: { img: 'https://img.test/p.png' } } }), {
  handled: true,
  actionName: 'saveimgas',
});
assert.deepEqual(await actionState.runAction({ name: 'copyimg' }, { senderTabId: 4, message: { selEle: { img: 'https://img.test/p.png' } } }), {
  handled: true,
  actionName: 'copyimg',
});
assert.deepEqual(await actionState.runAction({ name: 'copyimgurl' }, { senderTabId: 4, message: { selEle: { img: 'https://img.test/p.png' } } }), {
  handled: true,
  actionName: 'copyimgurl',
});
assert.deepEqual(await actionState.runAction({ name: 'imgsearch', selects: [{ type: 'n_imgengine', value: '0' }, { type: 'n_optype', value: 's_new' }], checks: [{ type: 'n_pin', value: false }] }, { senderTabId: 4, message: { selEle: { img: 'https://img.test/p.png' } }, config: { general: { engine: { imgengine: [{ content: 'https://lens.test/?url=%s' }] } } } }), {
  handled: true,
  actionName: 'imgsearch',
});
assert.deepEqual(await actionState.runAction({ name: 'crpages', selects: [{ type: 'n_crpages', value: 's_cr_ext' }, { type: 'n_optype', value: 's_new' }], checks: [{ type: 'n_pin', value: false }] }, { senderTabId: 4 }), {
  handled: true,
  actionName: 'crpages',
});
assert.deepEqual(await actionState.runAction({ name: 'bookmark', checks: [{ type: 'n_notif', value: true }, { type: 'n_closetab', value: false }] }, { senderTabId: 4, message: { tabUrl: 'https://page.test/', tabTitle: 'Page Title' } }), {
  handled: true,
  actionName: 'bookmark',
});
const originalCreateObjectURL = globalThis.URL.createObjectURL;
globalThis.URL.createObjectURL = undefined;
assert.deepEqual(await actionState.runAction({ name: 'capture' }, { senderTabId: 4 }), {
  handled: true,
  actionName: 'capture',
});
assert.deepEqual(await actionState.runAction({ name: 'savepage', checks: [{ type: 'n_closetab', value: false }] }, { senderTabId: 4, message: { tabTitle: 'Saved Page' } }), {
  handled: true,
  actionName: 'savepage',
});
globalThis.URL.createObjectURL = originalCreateObjectURL;
assert.deepEqual(await actionState.runAction({ name: 'dldir' }, { senderTabId: 4 }), {
  handled: true,
  actionName: 'dldir',
});
assert.deepEqual(await actionState.runAction({ name: 'mail', selects: [{ type: 'n_mail', value: 's_defaultmail' }], texts: [{ type: 'n_mail_prefix', value: 'Interesting Page: ' }, { type: 'n_mail_domain', value: 'example.com' }] }, { senderTabId: 4, message: { tabUrl: 'https://page.test/', tabTitle: 'Page Title' } }), {
  handled: true,
  actionName: 'mail',
});
assert.deepEqual(await actionState.runAction({ name: 'closeapps' }, { senderTabId: 4 }), {
  handled: true,
  actionName: 'closeapps',
});
assert.deepEqual(await actionState.runAction({ name: 'script', selects: [{ type: 'n_script', value: '1' }] }, { senderTabId: 4, config: { general: { script: { script: [{ content: "alert('first')" }, { content: "alert('second')" }] } } } }), {
  handled: true,
  actionName: 'script',
});
assert.deepEqual(await actionState.runAction({ name: 'reloadext' }, { senderTabId: 4 }), {
  handled: true,
  actionName: 'reloadext',
});
assert.deepEqual(await actionState.runAction({ name: 'set_bk' }, { senderTabId: 4 }), {
  handled: true,
  actionName: 'set_bk',
});
assert.deepEqual(await actionState.runAction({ name: 'set_search' }, { senderTabId: 4 }), {
  handled: true,
  actionName: 'set_search',
});
assert.deepEqual(await actionState.runAction({ name: 'readermode' }, { senderTabId: 4 }), {
  handled: true,
  actionName: 'readermode',
});
assert.deepEqual(await actionState.runAction({ name: 'restart' }, { senderTabId: 4 }), {
  handled: true,
  actionName: 'restart',
});
assert.deepEqual(await actionState.runAction({ name: 'exit' }, { senderTabId: 4 }), {
  handled: true,
  actionName: 'exit',
});
assert.deepEqual(await actionState.runAction({ name: 'tts', ranges: [{ type: 'n_rate', value: 1 }, { type: 'n_pitch', value: 1 }, { type: 'n_volume', value: 1 }] }, { senderTabId: 4, message: { selEle: { txt: 'speak me' } } }), {
  handled: true,
  actionName: 'tts',
});
assert.deepEqual(await launchActionState.runAction({ name: 'qr' }, { senderTabId: 4, message: { selEle: { txt: 'make qr' } } }), {
  handled: true,
  actionName: 'qr',
});
assert.deepEqual(await launchActionState.runAction({ name: 'speaker' }, { senderTabId: 4 }), {
  handled: true,
  actionName: 'speaker',
});
assert.deepEqual(await launchActionState.runAction({ name: 'magnet' }, { senderTabId: 4 }), {
  handled: true,
  actionName: 'magnet',
});
assert.deepEqual(await launchActionState.runAction({ name: 'appslist' }, { senderTabId: 4 }), {
  handled: true,
  actionName: 'appslist',
});
assert.deepEqual(await actionState.runAction({ name: 'extdisable' }, { senderTabId: 4 }), {
  handled: true,
  actionName: 'extdisable',
});
assert.deepEqual(await actionState.runAction({ name: 'unknown-action' }, { senderTabId: 4 }), {
  handled: false,
  actionName: 'unknown-action',
});

const comparableCalls = calls.filter((call) => {
  if (call[0] === 'create' && typeof call[1]?.url === 'string' && call[1].url.startsWith('blob:')) {
    return false;
  }
  if (call[0] === 'create' && typeof call[1]?.url === 'string' && call[1].url.startsWith('data:message/rfc822;base64,')) {
    return false;
  }
  if (call[0] === 'download' && typeof call[1]?.url === 'string' && call[1].url.startsWith('blob:')) {
    return false;
  }
  if (call[0] === 'download' && typeof call[1]?.url === 'string' && call[1].url.startsWith('data:message/rfc822;base64,')) {
    return false;
  }
  return true;
});

assert.deepEqual(comparableCalls, [
  ['openOptionsPage'],
  ['reload', 4, { bypassCache: false }],
  ['sendMessage', 4, { type: 'stop' }],
  ['sendMessage', 4, { type: 'switchtab', direction: 's_right' }],
  ['create', { url: 'http://example.com', active: true, pinned: false }],
  ['sendMessage', 4, { type: 'copytxt', value: 'hello' }],
  ['sendMessage', 4, { type: 'paste', value: 'pasted text' }],
  ['query', { active: true, currentWindow: true }],
  ['duplicate', 7],
  ['duplicate', 4],
  ['update', 19, { active: true }],
  ['create', { url: 'https://next.example/page-2', active: true, pinned: false }],
  ['create', { url: 'https://prev.example/page-1', active: false, pinned: true }],
  ['goBack', 4],
  ['goForward', 4],
  ['update', 4, { pinned: true }],
  ['move', 4, { index: 0 }],
  ['windows.create', { tabId: 4 }],
  ['windows.create', {}],
  ['create', { url: 'https://example.com/path/section', active: true, pinned: false }],
  ['create', { url: 'https://example.com/path/section/page-010.html', active: true, pinned: false }],
  ['create', { url: 'https://example.com/path/section/page-008.html', active: true, pinned: false }],
  ['windows.create', { url: 'https://page.test/', incognito: true, state: 'normal' }],
  ['remove', 4],
  ['windows.getCurrent'],
  ['windows.remove', 11],
  ['windows.getCurrent'],
  ['windows.update', 11, { state: 'maximized' }],
  ['windows.getCurrent'],
  ['windows.update', 11, { state: 'minimized' }],
  ['windows.getCurrent'],
  ['windows.update', 11, { state: 'fullscreen' }],
  ['windows.getCurrent'],
  ['windows.getAll', { populate: true, windowTypes: ['normal'] }],
  ['move', [41, 42, 51], { windowId: 11, index: -1 }],
  ['windows.update', 11, { state: 'maximized' }],
  ['windows.getCurrent'],
  ['windows.update', 11, { height: 900, width: 800, top: 0, left: 800 }],
  ['scripting.executeScript', 4, 'undefined', null, ['js/inject/scroll.js']],
  ['scripting.executeScript', 4, 'undefined', null, ['js/inject/zoom.js']],
  ['scripting.executeScript', 4, 'undefined', null, ['js/inject/zoom.js']],
  ['create', { url: 'https://search.test/?q=hello%20world', active: true, pinned: false }],
  ['create', { url: 'https://search.test/?q=hello%20world%2Fclip', active: true, pinned: false }],
  ['create', { url: 'https://link.test/', active: true, pinned: false }],
  ['create', { url: 'https://img.test/p.png', active: true, pinned: false }],
  ['bookmarks.search', { url: 'https://link.test/' }],
  ['bookmarks.create', { url: 'https://link.test/', title: 'Link Title' }],
  ['sendMessage', 4, { type: 'copylnkurl', value: 'https://link.test/' }],
  ['query', { index: 0, currentWindow: true }],
  ['sendMessage', 4, { type: 'copytabele', value: '<a href="https://tab.example/item">Indexed Tab</a>' }],
  ['sendMessage', 4, { type: 'copylnktxt', value: 'Link Title' }],
  ['sendMessage', 4, { type: 'copylnkaslnk', value: '<a href="https://link.test/">Link Title</a>' }],
  ['download', { url: 'https://link.test/file.zip', saveAs: true }],
  ['create', { url: 'view-source:https://page.test/', active: true, pinned: false }],
  ['create', { url: 'http://example.com', active: true, pinned: false }],
  ['sendMessage', 4, { type: 'print' }],
  ['query', { active: true, currentWindow: true }],
  ['update', 7, { muted: true }],
  ['download', { url: 'https://img.test/p.png', saveAs: false }],
  ['download', { url: 'https://img.test/p.png', saveAs: true }],
  ['fetch', 'https://img.test/p.png'],
  ['sendMessage', 4, { type: 'copyimg', value: 'data:image/png;base64,aW1hZ2UtYnl0ZXM=' }],
  ['sendMessage', 4, { type: 'copyimgurl', value: 'https://img.test/p.png' }],
  ['create', { url: 'https://lens.test/?url=https%3A%2F%2Fimg.test%2Fp.png', active: true, pinned: false }],
  ['create', { url: 'chrome://extensions', active: true, pinned: false }],
  ['bookmarks.search', { url: 'https://page.test/' }],
  ['bookmarks.create', { url: 'https://page.test/', title: 'Page Title' }],
  ['saveAsMHTML', { tabId: 4 }],
  ['saveAsMHTML', { tabId: 4 }],
  ['showDefaultFolder'],
  ['update', 4, { url: 'mailto:?subject=Interesting Page: Page Title&body=Page Title - https%3A%2F%2Fpage.test%2F        ' }],
  ['sendMessage', 4, { type: 'closeapps' }],
  ['scripting.executeScript', 4, 'function', ["alert('second')"], null],
  ['runtime.reload'],
  ['browserSettings.openBookmarksInNewTabs.get'],
  ['browserSettings.openBookmarksInNewTabs.set', { value: true }],
  ['browserSettings.openSearchResultsInNewTabs.get'],
  ['browserSettings.openSearchResultsInNewTabs.set', { value: false }],
  ['toggleReaderMode', 4],
  ['create', { url: 'chrome://restart/', active: false }],
  ['create', { url: 'chrome://quit/', active: false }],
  ['tts.speak', 'speak me', { rate: 1, pitch: 1, volume: 1 }],
  ['sendMessage', 4, { type: 'extdisable' }],
]);

assert.equal(calls.some((call) => call[0] === 'saveAsMHTML' && call[1]?.tabId === 4), true);
assert.equal(calls.some((call) => call[0] === 'create' && typeof call[1]?.url === 'string' && call[1].url.startsWith('data:message/rfc822;base64,')), true);
assert.equal(calls.some((call) => call[0] === 'download' && typeof call[1]?.url === 'string' && call[1].url.startsWith('data:message/rfc822;base64,') && call[1].filename === 'Saved Page.mhtml'), true);
assert.deepEqual(launcherCalls, [
  ['openApp', 'qr', { senderTabId: 4, message: { selEle: { txt: 'make qr' } } }],
  ['openApp', 'speaker', { senderTabId: 4, message: undefined }],
  ['openApp', 'magnet', { senderTabId: 4, message: undefined }],
  ['openApp', 'appslist', { senderTabId: 4, message: undefined }],
]);

console.log('action-state behavior verified');
