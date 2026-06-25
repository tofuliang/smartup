import assert from 'node:assert/strict';

let messageListener;
const calls = [];

globalThis.fetch = async (url) => ({
  async json() {
    calls.push(['fetch.json', url]);
    if (String(url).includes('config.json')) {
      return { version: 1 };
    }
    if (String(url).includes('tbkjx.json')) {
      return [['item', 'desc', 9.9, 'img', 5.1]];
    }
    return { ok: true };
  },
  async text() {
    calls.push(['fetch.text', url]);
    if (String(url).includes('bing.com/HPImageArchive.aspx')) {
      return '<images><image><url>/img.jpg</url><copyright>copy</copyright><copyrightlink>https://bing.test/</copyrightlink></image></images>';
    }
    if (String(url).includes('poxiao.com/') && !String(url).includes('/movie-detail')) {
      return '<html><body><div class="container"><div class="content"><ul><li><span>A</span><span>B</span><a href="/movie-detail">Movie Name</a></li></ul></div></div></body></html>';
    }
    if (String(url).includes('/movie-detail')) {
      return '<html><body><div class="container"><div id="film"><h1>Movie Name</h1></div><table class="detail_intro"><tbody><tr><td>Year</td><td>2024</td></tr></tbody></table><div id="ziy"><div class="resourcesmain"><tbody><tr><td>Download</td><td><input value="copy: magnet:?xt=urn:btih:123" /></td></tr><tr></tr></tbody></div></div><div class="filmcontents"><p></p><p>Description</p></div></div></body></html>';
    }
    return '<rss><channel><title>Feed</title><image><link>https://feed.test/</link><url>https://feed.test/logo.png</url></image><item><title>Hello</title><link>https://feed.test/post</link></item></channel></rss>';
  },
  async blob() {
    calls.push(['fetch.blob', url]);
    return new Blob(['demo'], { type: 'image/png' });
  },
});

delete globalThis.DOMParser;
delete globalThis.FileReader;
delete globalThis.localStorage;

globalThis.chrome = {
  storage: {
    local: {
      get(keys, callback) {
        if (typeof callback === 'function') {
          callback({});
          return;
        }
        return Promise.resolve({});
      },
      set(value, callback) {
        calls.push(['storage.local.set', value]);
        if (typeof callback === 'function') callback();
        return Promise.resolve();
      },
    },
  },
  action: {
    setTitle() { return Promise.resolve(); },
    onClicked: { addListener() {} },
  },
  scripting: {
    executeScript() { return Promise.resolve(); },
  },
  tabs: {
    create(details) {
      calls.push(['tabs.create', details]);
      return Promise.resolve(details);
    },
    sendMessage(tabId, payload) {
      calls.push(['tabs.sendMessage', tabId, payload]);
      return Promise.resolve(payload);
    },
    saveAsPDF(value) {
      calls.push(['tabs.saveAsPDF', value]);
      return Promise.resolve();
    },
  },
  topSites: {
    get(callback) {
      calls.push(['topSites.get']);
      callback([{ title: 'Top', url: 'https://top.test/' }]);
    },
  },
  tts: {
    speak() { return Promise.resolve(); },
    pause() { return Promise.resolve(); },
    resume() { return Promise.resolve(); },
    stop() { return Promise.resolve(); },
  },
  runtime: {
    id: 'ext-id',
    getURL(path) {
      return `chrome-extension://ext-id/${path}`;
    },
    connectNative() {
      return { postMessage() {}, disconnect() {}, onDisconnect: { addListener() {} } };
    },
    onMessage: {
      addListener(listener) {
        messageListener = listener;
      },
    },
    onInstalled: { addListener() {} },
  },
  permissions: {
    getAll() {
      return Promise.resolve({ permissions: ['tabs'], origins: ['https://example.com/*'] });
    },
  },
  sessions: {
    restore() { return Promise.resolve(); },
  },
  windows: {
    getAll() { return Promise.resolve([]); },
  },
};

const { bootRuntime } = await import('../js/sw/runtime.js');

bootRuntime();

function ask(message, sender = { tab: { id: 88 }, url: 'https://page.test/' }) {
  return new Promise((resolve) => {
    messageListener(message, sender, resolve);
  });
}

const homepageValue = await ask({ type: 'apps_getvalue', apptype: 'homepage' });
assert.deepEqual(homepageValue, {
  ok: true,
  apptype: 'homepage',
  type: 'homepage',
  config: {},
  value: {
    sites: [{ title: 'Top', url: 'https://top.test/' }],
    listId: null,
    ctm: false,
  },
});

const homepageImage = await ask({ type: 'appsAction', app: 'homepage', action: 'getImageURL' });
assert.deepEqual(homepageImage, { ok: true, app: 'homepage', action: 'getImageURL' });

const rssGet = await ask({ type: 'appsAction', app: 'rss', action: 'getMessage', value: 'https://feed.test/rss.xml' });
assert.deepEqual(rssGet, { ok: true, app: 'rss', action: 'getMessage' });

const shortUrl = await ask({ type: 'appsAction', app: 'shorturl', action: 'getURL', value: { key: 'demo' } });
assert.deepEqual(shortUrl, { ok: true, app: 'shorturl', action: 'getURL' });
assert.equal(calls.some((call) => call[0] === 'fetch.json' && String(call[1]).includes(encodeURIComponent('https://page.test/'))), true);

const autoReload = await ask({ type: 'appsAction', app: 'autoreload', action: 'reload', value: { type: 'start', interval: 10, iconCountdown: true, bypassCache: false } });
assert.deepEqual(autoReload, { ok: true, app: 'autoreload', action: 'reload' });

const notepadGet = await ask({ type: 'appsAction', app: 'notepad', action: 'get', value: { method: 'get' } });
assert.deepEqual(notepadGet, { ok: true, app: 'notepad', action: 'get' });

const tbkjxData = await ask({ type: 'appsAction', app: 'tbkjx', action: 'getData', value: 'jingxuan' });
assert.deepEqual(tbkjxData, { ok: true, app: 'tbkjx', action: 'getData' });

const pxmovieList = await ask({ type: 'appsAction', app: 'pxmovie', action: 'getList' });
assert.deepEqual(pxmovieList, { ok: true, app: 'pxmovie', action: 'getList' });

const pxmovieData = await ask({ type: 'appsAction', app: 'pxmovie', action: 'getData', value: 'https://www.poxiao.com/movie-detail' });
assert.deepEqual(pxmovieData, { ok: true, app: 'pxmovie', action: 'getData' });

assert.equal(calls.some((call) => call[0] === 'topSites.get'), true);
assert.equal(calls.some((call) => call[0] === 'tabs.sendMessage' && call[2]?.type === 'imageURL'), true);
assert.equal(calls.some((call) => call[0] === 'tabs.sendMessage' && call[2]?.type === 'rssData'), true);
assert.equal(calls.some((call) => call[0] === 'tabs.sendMessage' && call[2]?.type === 'url'), true);
assert.equal(calls.some((call) => call[0] === 'tabs.sendMessage' && call[2]?.type === 'appsListener_get'), true);
assert.equal(calls.some((call) => call[0] === 'tabs.sendMessage' && call[2]?.type === 'data'), true);
assert.equal(calls.some((call) => call[0] === 'tabs.sendMessage' && call[2]?.type === 'list'), true);

console.log('runtime app services wiring verified');
