import { createActionState } from './action-state.js';
import { createDispatcher } from './dispatcher.js';
import { createInjection } from './injection.js';
import { createNativeHelper } from './native-helper.js';
import { createPermissions } from './permissions.js';
import { createStorage } from './storage.js';

export function bootRuntime() {
  const storage = createStorage(chrome.storage);
  const injection = createInjection(chrome.scripting, chrome.tabs);
  const nativeHelper = createNativeHelper(chrome.runtime);
  const permissions = createPermissions(chrome.permissions, chrome.runtime, storage);
  let lastActivatedTabId = null;
  let currentActivatedTabId = null;
  const injectedActionState = {
    scroll: { type: 'down', effect: true },
    zoom: { value: 's_reset' },
  };

  const appLaunchMap = {
    rss: {
      baseCss: ['css/apps_basic.css'],
      baseJs: ['js/lib/apps_basic.js'],
      appCss: ['css/inject/rss.css'],
      appJs: ['js/inject/rss.js'],
    },
    tablist: {
      baseCss: ['css/apps_basic.css'],
      baseJs: ['js/lib/apps_basic.js'],
      appCss: ['css/inject/tablist.css'],
      appJs: ['js/inject/tablist.js'],
    },
    homepage: {
      baseCss: ['css/apps_basic.css'],
      baseJs: ['js/lib/apps_basic.js'],
      appCss: ['css/inject/homepage.css'],
      appJs: ['js/inject/homepage.js'],
    },
    recentbk: {
      baseCss: ['css/apps_basic.css'],
      baseJs: ['js/lib/apps_basic.js'],
      appCss: ['css/inject/recentbk.css'],
      appJs: ['js/inject/recentbk.js'],
    },
    recentht: {
      baseCss: ['css/apps_basic.css'],
      baseJs: ['js/lib/apps_basic.js'],
      appCss: ['css/inject/recentht.css'],
      appJs: ['js/inject/recentht.js'],
    },
    recentclosed: {
      baseCss: ['css/apps_basic.css'],
      baseJs: ['js/lib/apps_basic.js'],
      appCss: ['css/inject/recentclosed.css'],
      appJs: ['js/inject/recentclosed.js'],
    },
    synced: {
      baseCss: ['css/apps_basic.css'],
      baseJs: ['js/lib/apps_basic.js'],
      appCss: ['css/inject/synced.css'],
      appJs: ['js/inject/synced.js'],
    },
    extmgm: {
      baseCss: ['css/apps_basic.css'],
      baseJs: ['js/lib/apps_basic.js'],
      appCss: ['css/inject/extmgm.css'],
      appJs: ['js/inject/extmgm.js'],
    },
    speaker: {
      baseCss: ['css/apps_basic.css'],
      baseJs: ['js/lib/apps_basic.js'],
      appCss: ['css/inject/speaker.css'],
      appJs: ['js/inject/speaker.js'],
    },
    jslist: {
      baseCss: ['css/apps_basic.css'],
      baseJs: ['js/lib/apps_basic.js'],
      appCss: ['css/inject/jslist.css'],
      appJs: ['js/inject/jslist.js'],
    },
    autoreload: {
      baseCss: ['css/apps_basic.css'],
      baseJs: ['js/lib/apps_basic.js'],
      appCss: ['css/inject/autoreload.css'],
      appJs: ['js/inject/autoreload.js'],
    },
    savepdf: {
      baseCss: ['css/apps_basic.css'],
      baseJs: ['js/lib/apps_basic.js'],
      appCss: ['css/inject/savepdf.css'],
      appJs: ['js/inject/savepdf.js'],
    },
    tbkjx: {
      baseCss: ['css/apps_basic.css'],
      baseJs: ['js/lib/apps_basic.js'],
      appCss: ['css/inject/tbkjx.css'],
      appJs: ['js/inject/tbkjx.js'],
    },
    appslist: {
      baseCss: ['css/apps_basic.css'],
      baseJs: ['js/lib/apps_basic.js'],
      appCss: ['css/inject/appslist.css'],
      appJs: ['js/inject/appslist.js'],
    },
    shorturl: {
      baseCss: ['css/apps_basic.css'],
      baseJs: ['js/lib/apps_basic.js'],
      appCss: ['css/inject/shorturl.css'],
      appJs: ['js/inject/shorturl.js'],
    },
    notepad: {
      baseCss: ['css/apps_basic.css'],
      baseJs: ['js/lib/apps_basic.js'],
      appCss: ['css/inject/notepad.css'],
      appJs: ['js/inject/notepad.js'],
    },
    random: {
      baseCss: ['css/apps_basic.css'],
      baseJs: ['js/lib/apps_basic.js'],
      appCss: ['css/inject/random.css'],
      appJs: ['js/inject/random.js'],
    },
    base64: {
      baseCss: ['css/apps_basic.css'],
      baseJs: ['js/lib/apps_basic.js'],
      appCss: ['css/inject/base64.css'],
      appJs: ['js/inject/base64.js'],
    },
    qr: {
      baseCss: ['css/apps_basic.css'],
      baseJs: ['js/lib/apps_basic.js'],
      appCss: ['css/inject/qr.css'],
      appJs: ['js/inject/qr.js'],
    },
    numc: {
      baseCss: ['css/apps_basic.css'],
      baseJs: ['js/lib/apps_basic.js'],
      appCss: ['css/inject/numc.css'],
      appJs: ['js/inject/numc.js'],
    },
    convertcase: {
      baseCss: ['css/apps_basic.css'],
      baseJs: ['js/lib/apps_basic.js'],
      appCss: ['css/inject/convertcase.css'],
      appJs: ['js/inject/convertcase.js'],
    },
    magnet: {
      baseCss: ['css/apps_basic.css'],
      baseJs: ['js/lib/apps_basic.js'],
      appCss: ['css/inject/magnet.css'],
      appJs: ['js/inject/magnet.js'],
    },
  };
  const appLauncher = {
    async openApp(appName, context = {}) {
      if (!Number.isInteger(context.senderTabId)) {
        throw new Error('missing-target-tab');
      }
      const appSpec = appLaunchMap[appName];
      if (!appSpec) {
        return chrome.tabs.sendMessage(context.senderTabId, { type: 'openApp', appName });
      }
      if (chrome.scripting?.insertCSS) {
        await chrome.scripting.insertCSS({
          target: { tabId: context.senderTabId, allFrames: false },
          files: appSpec.baseCss,
        });
      }
      await injection.injectFiles(context.senderTabId, appSpec.baseJs, false);
      if (chrome.scripting?.insertCSS) {
        await chrome.scripting.insertCSS({
          target: { tabId: context.senderTabId, allFrames: false },
          files: appSpec.appCss,
        });
      }
      await injection.injectFiles(context.senderTabId, appSpec.appJs, false);
      return true;
    },
  };
  const actionState = createActionState(chrome.action, { launcher: appLauncher, injectedActionState });

  async function getLocalConfig() {
    const localItems = await storage.getLocal(['config', 'configSource']);
    const localSource = localItems?.configSource ?? null;
    if (localSource === 'sync' && storage.getSync) {
      const syncItems = await storage.getSync(null);
      if (syncItems?.general) {
        return syncItems;
      }
    }
    return localItems?.config ?? null;
  }

  async function syncActionPopupMode() {
    const config = await getLocalConfig();
    const iconEnabled = Boolean(config?.general?.fnswitch?.fnicon);
    if (actionState?.setPopup) {
      await actionState.setPopup(iconEnabled ? '' : 'html/popup.html');
    }
  }

  async function syncContextMenus() {
    if (!chrome.contextMenus?.removeAll || !chrome.contextMenus?.create) {
      return;
    }
    const config = await getLocalConfig();
    if (!config?.general?.fnswitch?.fnctm) {
      await chrome.contextMenus.removeAll();
      return;
    }
    await chrome.contextMenus.removeAll();
    const actions = config?.ctm?.actions ?? [];
    const ctmSettings = config?.ctm?.settings ?? {};
    const createdMenuIds = {
      actions: new Map(),
      toggles: new Map(),
      homepage: null,
      disable: null,
      options: null,
    };

    const getActionLabel = (action) => action?.mydes?.type && action?.mydes?.value
      ? action.mydes.value
      : chrome.i18n?.getMessage?.(action?.name ?? '') || action?.name || '';

    const functionSwitchItems = [
      'mges',
      'sdrg',
      'drg',
      'rges',
      'wges',
      'pop',
      'icon',
      'ctm',
    ];

    for (let index = 0; index < actions.length; index += 1) {
      const menuId = String(index);
      createdMenuIds.actions.set(menuId, index);
      chrome.contextMenus.create({
        id: menuId,
        contexts: ['all'],
        title: getActionLabel(actions[index]),
      });
    }

    if (ctmSettings.fnswitch) {
      chrome.contextMenus.create({ contexts: ['all'], type: 'separator' });
      for (const itemName of functionSwitchItems) {
        const menuId = `toggle:${itemName}`;
        createdMenuIds.toggles.set(menuId, `fn${itemName}`);
        chrome.contextMenus.create({
          id: menuId,
          contexts: ['all'],
          title: chrome.i18n?.getMessage?.(itemName) || itemName,
          type: 'checkbox',
          checked: Boolean(config?.general?.fnswitch?.[`fn${itemName}`]),
          enabled: itemName !== 'ctm',
        });
      }
    }

    if (ctmSettings.homepage) {
      chrome.contextMenus.create({ contexts: ['all'], type: 'separator' });
      createdMenuIds.homepage = 'ctm:homepage';
      chrome.contextMenus.create({
        id: createdMenuIds.homepage,
        contexts: ['all'],
        title: chrome.i18n?.getMessage?.('homepage_ctm') || 'homepage_ctm',
      });
    }

    if (ctmSettings.disable || ctmSettings.opt) {
      chrome.contextMenus.create({ contexts: ['all'], type: 'separator' });
    }

    if (ctmSettings.disable) {
      createdMenuIds.disable = 'ctm:disable';
      chrome.contextMenus.create({
        id: createdMenuIds.disable,
        contexts: ['all'],
        title: chrome.i18n?.getMessage?.('ctm_disable') || 'ctm_disable',
        type: 'checkbox',
      });
    }

    if (ctmSettings.opt) {
      createdMenuIds.options = 'ctm:options';
      chrome.contextMenus.create({
        id: createdMenuIds.options,
        contexts: ['all'],
        title: chrome.i18n?.getMessage?.('ctm_opt') || 'ctm_opt',
      });
    }

    chrome.contextMenus.onClicked?.addListener?.(async (info, tab) => {
      const menuItemId = String(info.menuItemId);
      if (createdMenuIds.actions.has(menuItemId)) {
        const actionIndex = createdMenuIds.actions.get(menuItemId);
        const action = actions[actionIndex] ?? null;
        if (!action) {
          return;
        }
        await actionState.runAction(action, {
          senderTabId: tab?.id ?? null,
          message: {
            type: 'action_ctm',
            selEle: {
              lnk: info.linkUrl ?? '',
              txt: info.selectionText ?? '',
              img: info.srcUrl ?? '',
              str: '',
            },
          },
          config,
          mode: 'back',
        });
        return;
      }

      if (createdMenuIds.toggles.has(menuItemId)) {
        const flagName = createdMenuIds.toggles.get(menuItemId);
        const nextConfig = structuredClone(config);
        nextConfig.general.fnswitch[flagName] = Boolean(info.checked);
        if (flagName === 'fndrg' && info.checked) {
          nextConfig.general.fnswitch.fnsdrg = false;
        }
        if (flagName === 'fnsdrg' && info.checked) {
          nextConfig.general.fnswitch.fndrg = false;
        }
        if (flagName === 'fnpop' && info.checked) {
          nextConfig.general.fnswitch.fnicon = false;
        }
        if (flagName === 'fnicon' && info.checked) {
          nextConfig.general.fnswitch.fnpop = false;
        }
        await storage.saveConfig(nextConfig);
        return;
      }

      if (menuItemId === createdMenuIds.options) {
        await actionState.runAction({ name: 'optionspage' }, { senderTabId: tab?.id ?? null, config });
        return;
      }

      if (menuItemId === createdMenuIds.homepage) {
        const localState = await getLocalState();
        const homepageValue = await getHomepageValue();
        const payload = {
          type: 'data',
          value: {
            ...homepageValue,
            listId: localState.homepageListId ?? null,
            ctm: tab ? {
              id: tab.id ?? null,
              title: tab.title ?? '',
              url: tab.url ?? '',
            } : false,
          },
        };
        await chrome.tabs?.sendMessage?.(tab?.id ?? null, payload).catch(() => null);
      }
    });
  }

  async function syncMouseupContextMenuBehavior() {
    if (!chrome.browserSettings?.contextMenuShowEvent?.set) {
      if (navigator.userAgent.match(/firefox/i)) {
        const localState = await getLocalState();
        if (!localState.flag_mouseup) {
          await chrome.permissions?.request?.({ permissions: ['browserSettings'] }).catch(() => false);
          localState.flag_mouseup = 'true';
          await setLocalState(localState);
        }
      }
      return;
    }
    await chrome.browserSettings.contextMenuShowEvent.set({ value: 'mouseup' });
    const config = await getLocalConfig();
    if (!config?.general?.linux) {
      return;
    }
    if (config.general.linux.cancelmenu === false) {
      return;
    }
    const nextConfig = structuredClone(config);
    nextConfig.general.linux.cancelmenu = false;
    await storage.saveConfig(nextConfig);
  }

  function getTextBetween(source, startTag, endTag) {
    const startIndex = source.indexOf(startTag);
    if (startIndex === -1) {
      return '';
    }
    const contentStart = startIndex + startTag.length;
    const endIndex = source.indexOf(endTag, contentStart);
    if (endIndex === -1) {
      return '';
    }
    return source.slice(contentStart, endIndex);
  }

  function extractTagValue(source, tagName) {
    return getTextBetween(source, `<${tagName}>`, `</${tagName}>`);
  }

  async function getLocalState() {
    const localItems = await storage.getLocal(null);
    return localItems?.localConfig ?? {};
  }

  async function setLocalState(localConfig) {
    await storage.setLocal({ localConfig });
  }

  async function blobToDataUrl(blob) {
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    const chunkSize = 0x8000;
    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
      const chunk = bytes.subarray(offset, offset + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    const base64 = btoa(binary);
    return `data:${blob.type || 'application/octet-stream'};base64,${base64}`;
  }

  async function getHomepageValue() {
    return new Promise((resolve) => {
      if (!chrome.topSites?.get) {
        resolve({ sites: [], listId: null, ctm: false });
        return;
      }
      chrome.topSites.get(async (sites) => {
        const localState = await getLocalState();
        const listId = localState.homepageListId ?? null;
        resolve({
          sites: sites ?? [],
          listId,
          ctm: false,
        });
      });
    });
  }

  async function getRssValue() {
    const localState = await getLocalState();
    return localState?.apps?.rss ?? {};
  }

  async function getShorturlValue() {
    return {};
  }

  async function getAutoreloadValue() {
    const localState = await getLocalState();
    return localState.autoreload ?? {};
  }

  async function getNotepadValue() {
    return {};
  }

  async function getContentFeedTbkjx(channel) {
    const configUrl = `https://quan.zimoapps.com/push/config.json?${Date.now()}`;
    const configData = await fetch(configUrl).then((response) => response.json());
    const version = configData?.version ?? Date.now();
    const localState = await getLocalState();
    localState.tbkjx_dataversion = String(version);
    await setLocalState(localState);
    const dataUrl = `https://quan.zimoapps.com/push/tbkjx.json?${version}`;
    const data = await fetch(dataUrl).then((response) => response.json());
    return { data, channel };
  }

  function extractAllMatches(source, regex) {
    const results = [];
    for (const match of source.matchAll(regex)) {
      results.push(match.slice(1));
    }
    return results;
  }

  async function getPxmovieList() {
    const htmlText = await fetch('https://www.poxiao.com/').then((response) => response.text());
    const data = [];
    for (const [col1, col2, href, title] of extractAllMatches(htmlText, /<li><span>(.*?)<\/span><span>(.*?)<\/span><a href="(.*?)">(.*?)<\/a><\/li>/g)) {
      data.push([col1, col2, title, `https://www.poxiao.com${href}`]);
    }
    return data;
  }

  async function getPxmovieData(url) {
    const htmlText = await fetch(url).then((response) => response.text());
    const data = {
      info: [],
      dl: [],
      des: '',
      name: '',
    };
    data.info = extractAllMatches(htmlText, /<tr><td>(.*?)<\/td><td>(.*?)<\/td><\/tr>/g);
    data.dl = extractAllMatches(htmlText, /<tr><td>(.*?)<\/td><td><input value="(.*?)" \/><\/td><\/tr>/g)
      .map(([label, value]) => [label, value.replace(/^copy:\s*/, '')]);
    data.des = extractAllMatches(htmlText, /<div class="filmcontents"><p>.*?<\/p><p>(.*?)<\/p><\/div>/g)[0]?.[0] ?? '';
    data.name = extractAllMatches(htmlText, /<div id="film"><h1>(.*?)<\/h1><\/div>/g)[0]?.[0] ?? '';
    return data;
  }

  async function getRssMessage(feedUrl) {
    const xmlText = await fetch(feedUrl).then((response) => response.text());
    const items = [];
    for (const match of xmlText.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
      const itemXml = match[1];
      items.push({
        title: extractTagValue(itemXml, 'title'),
        link: extractTagValue(itemXml, 'link'),
      });
    }
    return {
      title: extractTagValue(xmlText, 'title') || 'noname',
      link: getTextBetween(xmlText, '<image><link>', '</link>') || '',
      img: getTextBetween(xmlText, '<image><url>', '</url>') || chrome.runtime.getURL('image/rss.svg'),
      items,
    };
  }

  async function getHomepageImageURL() {
    const xmlText = await fetch('https://bing.com/HPImageArchive.aspx?idx=0&n=1').then((response) => response.text());
    const imageURL = `https://www.bing.com${extractTagValue(xmlText, 'url') || ''}`;
    const copyrightString = extractTagValue(xmlText, 'copyright');
    const copyrightURL = extractTagValue(xmlText, 'copyrightlink');
    try {
      const imageBlob = await fetch(imageURL).then((response) => response.blob());
      const base64 = await blobToDataUrl(imageBlob);
      const localState = await getLocalState();
      localState.homepageURL = imageURL;
      await setLocalState(localState);
      return { id: 0, imageURL: base64, copyrightString, copyrightURL };
    } catch {
      return { id: 0, imageURL, copyrightString, copyrightURL };
    }
  }

  async function getShortUrl(value, sender) {
    const config = await getLocalConfig();
    const shorturlConfig = config?.apps?.shorturl ?? {};
    const baseUrl = shorturlConfig.n_suyourls
      ? 'https://url.zimoapps.com/yourls-api.php'
      : `${shorturlConfig.n_yourls}/yourls-api.php`;
    const signature = shorturlConfig.n_suyourls ? 'ab279117c0' : shorturlConfig.n_sign;
    const requestUrl = `${baseUrl}?action=shorturl&format=json&keyword=${value?.key ?? ''}&url=${encodeURIComponent(sender?.url ?? '')}&signature=${signature}`;
    return fetch(requestUrl, { method: 'POST' }).then((response) => response.json());
  }

  async function getNotepadData() {
    const localState = await getLocalState();
    return localState.notepad ?? { id: 0, last: 0, item: [] };
  }

  async function setNotepadData(value) {
    const localState = await getLocalState();
    localState.notepad = value?.data ?? value ?? { id: 0, last: 0, item: [] };
    await setLocalState(localState);
    return localState.notepad;
  }

  async function getAutoreloadStateMap() {
    const localState = await getLocalState();
    return localState.autoreload ?? {};
  }

  async function setAutoreloadStateMap(stateMap) {
    const localState = await getLocalState();
    localState.autoreload = stateMap;
    await setLocalState(localState);
  }

  const autoreloadState = {};

  const dispatcher = createDispatcher({
    storage,
    actionState,
    injection,
    nativeHelper,
    permissions,
    injectedActionState,
    apps: {
      sessions: chrome.sessions,
      tabs: {
        async open(url, options = {}) {
          return chrome.tabs.create({
            url,
            active: options.target !== 's_back',
            pinned: Boolean(options.pin),
          });
        },
        async close(tabId) {
          return chrome.tabs.remove(Number(tabId));
        },
        async switch(tabId) {
          return chrome.tabs.update(Number(tabId), { active: true });
        },
        async savePdf(value) {
          return chrome.tabs.saveAsPDF(value);
        },
      },
      management: chrome.management
        ? {
            async getAll() {
              return chrome.management.getAll();
            },
            async setEnabled(extId, enabled) {
              return chrome.management.setEnabled(extId, enabled);
            },
            async uninstall(extId, options) {
              return chrome.management.uninstall(extId, options);
            },
          }
        : undefined,
      messaging: {
        async sendToTab(tabId, payload) {
          return chrome.tabs.sendMessage(tabId, payload);
        },
      },
      values: {
        async homepage() {
          return getHomepageValue();
        },
        async rss() {
          return getRssValue();
        },
        async shorturl() {
          return getShorturlValue();
        },
        async autoreload() {
          return getAutoreloadValue();
        },
        async notepad() {
          return getNotepadValue();
        },
      },
      launcher: appLauncher,
      tts: chrome.tts
        ? {
            async speak(value) {
              if (value?.type === 'play' && value?.txt) {
                return chrome.tts.speak(value.txt);
              }
              if (value?.type === 'pause') {
                return chrome.tts.pause();
              }
              if (value?.type === 'resume') {
                return chrome.tts.resume();
              }
              if (value?.type === 'stop') {
                return chrome.tts.stop();
              }
              return undefined;
            },
            async pause() {
              return chrome.tts.pause();
            },
            async resume() {
              return chrome.tts.resume();
            },
            async stop() {
              return chrome.tts.stop();
            },
          }
        : undefined,
      homepage: {
        async getImageURL() {
          return getHomepageImageURL();
        },
      },
      rss: {
        async getMessage(feedUrl) {
          return getRssMessage(feedUrl);
        },
      },
      shorturl: {
        async getURL(value, sender) {
          return getShortUrl(value, sender);
        },
      },
      autoreload: {
        state: autoreloadState,
        async reload(tabId, value) {
          const alarmName = `autoreload:${tabId}`;
          if (value?.type === 'stop') {
            delete autoreloadState[tabId];
            const persistedState = await getAutoreloadStateMap();
            delete persistedState[tabId];
            await setAutoreloadStateMap(persistedState);
            if (chrome.alarms?.clear) {
              await chrome.alarms.clear(alarmName);
            }
            return {};
          }
          autoreloadState[tabId] = {
            timeRemain: value?.interval ?? 0,
            iconCountdown: Boolean(value?.iconCountdown),
            bypassCache: Boolean(value?.bypassCache),
            type: value?.type ?? 'start',
          };
          const persistedState = await getAutoreloadStateMap();
          persistedState[tabId] = autoreloadState[tabId];
          await setAutoreloadStateMap(persistedState);
          if (chrome.alarms?.create) {
            chrome.alarms.create(alarmName, {
              periodInMinutes: Math.max((value?.interval ?? 1) / 60, 0.001),
            });
          }
          if (chrome.action?.setBadgeText) {
            await chrome.action.setBadgeText({ tabId, text: String(value?.interval ?? 0) });
          }
          return autoreloadState[tabId];
        },
      },
      notepad: {
        async get() {
          return getNotepadData();
        },
        async set(value) {
          return setNotepadData(value);
        },
      },
      jslist: {
        async runScript(tabId, scriptContent) {
          return injection.executeScript(tabId, {
            func: (content) => {
              const script = document.createElement('script');
              script.textContent = content;
              (document.head || document.documentElement).append(script);
              script.remove();
            },
            args: [scriptContent],
          }, false);
        },
      },
      contentFeeds: {
        async getPxmovieList() {
          return getPxmovieList();
        },
        async getPxmovieData(url) {
          return getPxmovieData(url);
        },
        async getTbkjxData(channel) {
          return getContentFeedTbkjx(channel);
        },
      },
      selfExtId: chrome.runtime?.id,
    },
  });

  function handleRuntimeMessage(message, sender, sendResponse) {
    const enrichedSender = {
      ...sender,
      previousTabId: sender?.tab?.id === currentActivatedTabId ? lastActivatedTabId : null,
    };
    dispatcher.handleMessage(message, enrichedSender)
      .then(sendResponse)
      .catch((error) => sendResponse({
        ok: false,
        error: 'runtime-error',
        message: error?.message ?? String(error),
      }));
    return true;
  }

  async function checkContentScriptHealth(tabId) {
    if (tabId == null || !chrome.tabs?.sendMessage) {
      return;
    }
    const response = await chrome.tabs.sendMessage(tabId, { type: 'status' }).catch(() => null);
    if (response) {
      return;
    }
    await actionState.setTabIcon?.(tabId, '../image/icon_warning.png');
    await actionState.setTabTitle?.(tabId, chrome.i18n?.getMessage?.('icon_tip') || 'icon_tip');
  }

  function attachCopyImagePortCompatibility() {
    chrome.runtime.onConnect?.addListener?.((port) => {
      if (port?.name !== 'fn_copyimg') {
        return;
      }
      port.onMessage.addListener(async (message) => {
        const imageUrl = message?.url ?? message?.value ?? null;
        if (!imageUrl) {
          port.postMessage({ ok: false, error: 'missing-image-url' });
          return;
        }
        try {
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          const dataUrl = await blobToDataUrl(blob);
          port.postMessage(dataUrl);
        } catch (error) {
          port.postMessage({
            ok: false,
            error: 'copyimg-fetch-failed',
            message: error?.message ?? String(error),
          });
        }
      });
    });
  }

  chrome.runtime.onMessage.addListener(handleRuntimeMessage);

  syncActionPopupMode().catch(() => {});
  syncContextMenus().catch(() => {});
  syncMouseupContextMenuBehavior().catch(() => {});
  attachCopyImagePortCompatibility();

  chrome.tabs?.onUpdated?.addListener?.((tabId, changeInfo) => {
    if (changeInfo?.status !== 'complete') {
      return;
    }
    checkContentScriptHealth(tabId).catch(() => {});
  });

  chrome.tabs?.onActivated?.addListener?.(({ tabId }) => {
    if (!Number.isInteger(tabId)) {
      return;
    }
    if (currentActivatedTabId !== tabId) {
      lastActivatedTabId = currentActivatedTabId;
      currentActivatedTabId = tabId;
    }
  });

  chrome.runtime.onInstalled.addListener(async (details) => {
    await dispatcher.handleInstalled(details);
    const windows = await chrome.windows.getAll({ populate: true });
    for (const win of windows) {
      for (const tab of win.tabs || []) {
        if (tab?.id) {
          try {
	          await injection.injectFiles(tab.id, ['js/content/event.js'], true);
          } catch (error) {
            console.warn('smartUp onInstalled injection failed', tab.id, error);
          }
        }
      }
    }
  });

  chrome.alarms?.onAlarm?.addListener?.(async (alarm) => {
    if (!alarm?.name?.startsWith('autoreload:')) {
      return;
    }
    const tabId = Number(alarm.name.split(':')[1]);
    const persistedState = await getAutoreloadStateMap();
    const state = persistedState[tabId];
    if (!state) {
      return;
    }
    await chrome.tabs.reload(tabId, { bypassCache: Boolean(state.bypassCache) });
    if (chrome.action?.setBadgeText) {
      await chrome.action.setBadgeText({ tabId, text: String(state.timeRemain ?? 0) });
    }
  });

  chrome.contextMenus?.onClicked?.addListener?.(async (info, tab) => {
    const config = await getLocalConfig();
    const action = config?.ctm?.actions?.[Number(info.menuItemId)] ?? null;
    if (!action) {
      return;
    }
    await actionState.runAction(action, {
      senderTabId: tab?.id ?? null,
      previousTabId: lastActivatedTabId,
      mode: 'back',
      message: { type: 'contextmenu' },
      config,
    });
  });

  chrome.action.onClicked.addListener((tab) => dispatcher.handleActionClick(tab));
}
