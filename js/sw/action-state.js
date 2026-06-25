export function createActionState(actionApi, services = {}) {
  const tabsApi = globalThis.chrome?.tabs;
  const runtimeApi = globalThis.chrome?.runtime;
  const ttsApi = globalThis.chrome?.tts;
  const windowsApi = globalThis.chrome?.windows;
  const bookmarksApi = globalThis.chrome?.bookmarks;
  const downloadsApi = globalThis.chrome?.downloads;
  const pageCaptureApi = globalThis.chrome?.pageCapture;
  const browserSettingsApi = globalThis.chrome?.browserSettings;
  const scriptingApi = globalThis.chrome?.scripting;
  const launcherApi = services.launcher;
  const injectedActionState = services.injectedActionState;
  const appLaunchActions = new Set([
    'rss',
    'tablist',
    'random',
    'extmgm',
    'recentbk',
    'recentht',
    'recentclosed',
    'synced',
    'base64',
    'qr',
    'numc',
    'speaker',
    'jslist',
    'savepdf',
    'convertcase',
    'autoreload',
    'homepage',
    'tbkjx',
    'appslist',
    'magnet',
  ]);
  let snapState = null;

  function getActionOption(action, collectionName, optionType) {
    const options = action?.[collectionName];
    if (!Array.isArray(options)) {
      return undefined;
    }
    return options.find((option) => option?.type === optionType)?.value;
  }

  function updateInjectedActionState(action) {
    if (action?.name === 'scroll' && injectedActionState?.scroll) {
      const scrollValue = getActionOption(action, 'selects', 'n_scroll');
      const effectValue = getActionOption(action, 'checks', 'n_effect');
      injectedActionState.scroll = {
        type: typeof scrollValue === 'string' && scrollValue.startsWith('s_') ? scrollValue.slice(2) : 'down',
        effect: effectValue === undefined ? true : Boolean(effectValue),
      };
    }
    if (action?.name === 'zoom' && injectedActionState?.zoom) {
      const zoomValue = getActionOption(action, 'selects', 'n_zoom');
      injectedActionState.zoom = {
        value: typeof zoomValue === 'string' && zoomValue ? zoomValue : 's_reset',
      };
    }
  }

  function normalizeUrl(url) {
    if (!url) {
      return '';
    }
    const validPrefixes = ['http://', 'https://', 'ftp://', 'chrome://', 'chrome-extension://', 'view-source:', 'about:', 'file:///'];
    return validPrefixes.some((prefix) => url.startsWith(prefix)) ? url : `http://${url}`;
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
    return `data:${blob.type || 'application/octet-stream'};base64,${btoa(binary)}`;
  }

  function getTextValue(action, optionType) {
    return getActionOption(action, 'texts', optionType);
  }

  function getEngineUrl(config, engineIndex) {
    return config?.general?.engine?.txtengine?.[engineIndex]?.content ?? null;
  }

  function getImageEngineUrl(config, engineIndex) {
    return config?.general?.engine?.imgengine?.[engineIndex]?.content ?? null;
  }

  function getTabUrl(context) {
    return context.message?.tabUrl ?? '';
  }

  function stripTrailingSlash(url) {
    return url.endsWith('/') ? url.slice(0, -1) : url;
  }

  function getUpperLevelUrl(url) {
    const normalized = stripTrailingSlash(url);
    const segments = normalized.split('/');
    if (segments.length > 3) {
      segments.length -= 1;
    }
    const nextUrl = segments.join('/');
    return nextUrl === normalized ? '' : nextUrl;
  }

  function replaceLastNumber(url, delta) {
    const segments = url.split('/');
    for (let index = segments.length - 1; index > 2; index -= 1) {
      const segment = segments[index];
      const match = segment.match(/(\d+)(?!.*\d)/);
      if (!match) {
        continue;
      }
      const value = match[1];
      const nextValue = String(Math.max(0, Number.parseInt(value, 10) + delta)).padStart(value.length, '0');
      segments[index] = segment.slice(0, match.index) + nextValue + segment.slice((match.index ?? 0) + value.length);
      const nextUrl = segments.join('/');
      return nextUrl === url ? '' : nextUrl;
    }
    return '';
  }

  async function queryActiveTab() {
    if (!tabsApi?.query) {
      return null;
    }
    const tabs = await tabsApi.query({ active: true, currentWindow: true });
    return tabs?.[0] ?? null;
  }

  async function getTargetTabId(context) {
    return context.senderTabId ?? (await queryActiveTab())?.id ?? null;
  }

  async function runAction(action, context = {}) {
    const actionName = action?.name ?? null;
    const tabId = await getTargetTabId(context);

    if (!actionName || actionName === 'none') {
      return { handled: false, actionName };
    }
    if (actionName === 'optionspage') {
      if (runtimeApi?.openOptionsPage) {
        await runtimeApi.openOptionsPage();
      } else if (tabsApi?.create) {
        const url = runtimeApi?.getURL ? runtimeApi.getURL('html/options.html') : 'html/options.html';
        await tabsApi.create({ url });
      }
      return { handled: true, actionName };
    }
    if (actionName === 'newtab' && tabsApi?.create) {
      await tabsApi.create({ active: context.mode !== 'back' });
      return { handled: true, actionName };
    }
    if (actionName === 'restart' && tabsApi?.create) {
      await tabsApi.create({ url: 'chrome://restart/', active: false });
      return { handled: true, actionName };
    }
    if (actionName === 'exit' && tabsApi?.create) {
      await tabsApi.create({ url: 'chrome://quit/', active: false });
      return { handled: true, actionName };
    }
    if (actionName === 'reloadext' && runtimeApi?.reload) {
      await runtimeApi.reload();
      return { handled: true, actionName };
    }
    if (appLaunchActions.has(actionName) && launcherApi?.openApp) {
      await launcherApi.openApp(actionName, { senderTabId: tabId, message: context.message });
      return { handled: true, actionName };
    }
    if (actionName === 'extdisable' && tabsApi?.sendMessage && tabId !== null) {
      await tabsApi.sendMessage(tabId, { type: 'extdisable' });
      return { handled: true, actionName };
    }
    if (actionName === 'reopen' && tabsApi?.query && tabsApi?.duplicate) {
      const activeTab = await queryActiveTab();
      if (activeTab?.id != null) {
        await tabsApi.duplicate(activeTab.id);
        return { handled: true, actionName };
      }
    }
    if (actionName === 'pretab' && tabsApi?.update) {
      const previousTabId = context.previousTabId ?? null;
      if (!Number.isInteger(previousTabId)) {
        return { handled: false, actionName };
      }
      await tabsApi.update(previousTabId, { active: true });
      return { handled: true, actionName };
    }
    if ((actionName === 'next' || actionName === 'previous') && tabsApi?.create) {
      const targetUrl = context.message?.url ?? '';
      if (!targetUrl) {
        return { handled: false, actionName };
      }
      await tabsApi.create({
        url: normalizeUrl(targetUrl),
        active: getActionOption(action, 'selects', 'n_optype') !== 's_back',
        pinned: Boolean(getActionOption(action, 'checks', 'n_pin')),
      });
      return { handled: true, actionName };
    }
    if (actionName === 'reopenincognito' && windowsApi?.create) {
      const tabUrl = getTabUrl(context);
      if (!tabUrl) {
        return { handled: false, actionName };
      }
      const reopenKeep = Boolean(getActionOption(action, 'checks', 'n_reopenkeep'));
      const state = getActionOption(action, 'selects', 'n_optype') === 's_incog' ? 'normal' : 'minimized';
      await windowsApi.create({ url: tabUrl, incognito: true, state });
      if (!reopenKeep && tabsApi?.remove && context.senderTabId != null) {
        await tabsApi.remove(context.senderTabId);
      }
      return { handled: true, actionName };
    }
    if (actionName === 'reload' && tabsApi?.reload && tabId !== null) {
      await tabsApi.reload(tabId, { bypassCache: false });
      return { handled: true, actionName };
    }
    if (actionName === 'close' && tabsApi?.remove && tabId !== null) {
      await tabsApi.remove(tabId);
      return { handled: true, actionName };
    }
    if (actionName === 'back' && tabId !== null) {
      if (tabsApi?.goBack) {
        await tabsApi.goBack(tabId);
      } else if (tabsApi?.sendMessage) {
        await tabsApi.sendMessage(tabId, { type: 'back' });
      } else {
        return { handled: false, actionName };
      }
      return { handled: true, actionName };
    }
    if (actionName === 'forward' && tabId !== null) {
      if (tabsApi?.goForward) {
        await tabsApi.goForward(tabId);
      } else if (tabsApi?.sendMessage) {
        await tabsApi.sendMessage(tabId, { type: 'forward' });
      } else {
        return { handled: false, actionName };
      }
      return { handled: true, actionName };
    }
    if (actionName === 'stop' && tabsApi?.sendMessage && tabId !== null) {
      await tabsApi.sendMessage(tabId, { type: 'stop' });
      return { handled: true, actionName };
    }
    if (actionName === 'switchtab' && tabsApi?.sendMessage && tabId !== null) {
      await tabsApi.sendMessage(tabId, {
        type: 'switchtab',
        direction: getActionOption(action, 'selects', 'n_tab_lrhl') ?? 's_right',
      });
      return { handled: true, actionName };
    }
    if (actionName === 'open' && tabsApi?.create) {
      await tabsApi.create({
        url: normalizeUrl(getActionOption(action, 'texts', 'n_url')),
        active: getActionOption(action, 'selects', 'n_optype') !== 's_back',
        pinned: Boolean(getActionOption(action, 'checks', 'n_pin')),
      });
      return { handled: true, actionName };
    }
    if (actionName === 'upperlevel' && tabsApi?.create) {
      const nextUrl = getUpperLevelUrl(getTabUrl(context));
      if (!nextUrl) {
        return { handled: false, actionName };
      }
      await tabsApi.create({
        url: nextUrl,
        active: getActionOption(action, 'selects', 'n_optype') !== 's_back',
        pinned: Boolean(getActionOption(action, 'checks', 'n_pin')),
      });
      return { handled: true, actionName };
    }
    if (actionName === 'increment' && tabsApi?.create) {
      const nextUrl = replaceLastNumber(getTabUrl(context), 1);
      if (!nextUrl) {
        return { handled: false, actionName };
      }
      await tabsApi.create({
        url: nextUrl,
        active: getActionOption(action, 'selects', 'n_optype') !== 's_back',
        pinned: Boolean(getActionOption(action, 'checks', 'n_pin')),
      });
      return { handled: true, actionName };
    }
    if (actionName === 'decrement' && tabsApi?.create) {
      const nextUrl = replaceLastNumber(getTabUrl(context), -1);
      if (!nextUrl) {
        return { handled: false, actionName };
      }
      await tabsApi.create({
        url: nextUrl,
        active: getActionOption(action, 'selects', 'n_optype') !== 's_back',
        pinned: Boolean(getActionOption(action, 'checks', 'n_pin')),
      });
      return { handled: true, actionName };
    }
    if (actionName === 'txtsearch' && tabsApi?.create) {
      const text = context.message?.selEle?.txt ?? '';
      const engineIndex = Number(getActionOption(action, 'selects', 'n_txtengine') ?? 0);
      const engineUrl = getEngineUrl(context.config, engineIndex);
      if (!text || !engineUrl) {
        return { handled: false, actionName };
      }
      const encoded = encodeURI(text);
      await tabsApi.create({
        url: engineUrl.replace(/%s/g, encoded),
        active: getActionOption(action, 'selects', 'n_optype') !== 's_back',
        pinned: Boolean(getActionOption(action, 'checks', 'n_pin')),
      });
      return { handled: true, actionName };
    }
    if (actionName === 'openlnk' && tabsApi?.create) {
      const linkUrl = context.message?.selEle?.lnk ?? context.message?.selEle?.objLnk?.href ?? '';
      if (!linkUrl) {
        return { handled: false, actionName };
      }
      await tabsApi.create({
        url: normalizeUrl(linkUrl),
        active: getActionOption(action, 'selects', 'n_optype') !== 's_back',
        pinned: Boolean(getActionOption(action, 'checks', 'n_pin')),
      });
      return { handled: true, actionName };
    }
    if (actionName === 'openimg' && tabsApi?.create) {
      const imageUrl = context.message?.selEle?.img ?? '';
      if (!imageUrl) {
        return { handled: false, actionName };
      }
      await tabsApi.create({
        url: normalizeUrl(imageUrl),
        active: getActionOption(action, 'selects', 'n_optype') !== 's_back',
        pinned: Boolean(getActionOption(action, 'checks', 'n_pin')),
      });
      return { handled: true, actionName };
    }
    if (actionName === 'bookmarklnk' && bookmarksApi?.search && bookmarksApi?.create) {
      const url = context.message?.selEle?.lnk ?? '';
      const title = context.message?.selEle?.str ?? '';
      if (!url) {
        return { handled: false, actionName };
      }
      const existing = await bookmarksApi.search({ url });
      if (existing?.length) {
        if (bookmarksApi.remove) {
          await bookmarksApi.remove(existing[0].id);
        }
      } else {
        await bookmarksApi.create({ url, title });
      }
      return { handled: true, actionName };
    }
    if (actionName === 'copylnkurl' && tabsApi?.sendMessage && tabId !== null) {
      const url = context.message?.selEle?.lnk ?? '';
      if (!url) {
        return { handled: false, actionName };
      }
      await tabsApi.sendMessage(tabId, { type: 'copylnkurl', value: url });
      return { handled: true, actionName };
    }
    if (actionName === 'copytabele' && tabsApi?.query && tabsApi?.sendMessage && tabId !== null) {
      const tabIndex = Number(getActionOption(action, 'selects', 'n_tab_single') ?? 0);
      const contentType = getActionOption(action, 'selects', 'n_copytabele_content') ?? 's_tabele_title';
      const sourceTab = (await tabsApi.query({ index: tabIndex, currentWindow: true }))?.[0] ?? null;
      if (!sourceTab) {
        return { handled: false, actionName };
      }
      let value = sourceTab.title ?? '';
      if (contentType === 's_tabele_url') {
        value = sourceTab.url ?? '';
      }
      if (contentType === 's_tabele_aslnk') {
        value = `<a href="${sourceTab.url ?? ''}">${sourceTab.title ?? ''}</a>`;
      }
      await tabsApi.sendMessage(tabId, { type: 'copytabele', value });
      return { handled: true, actionName };
    }
    if (actionName === 'source' && tabsApi?.create) {
      const tabUrl = context.message?.tabUrl ?? '';
      if (!tabUrl) {
        return { handled: false, actionName };
      }
      await tabsApi.create({
        url: `view-source:${tabUrl}`,
        active: getActionOption(action, 'selects', 'n_optype') !== 's_back',
        pinned: Boolean(getActionOption(action, 'checks', 'n_pin')),
      });
      return { handled: true, actionName };
    }
    if (actionName === 'openclip' && tabsApi?.create) {
      const clipboardText = context.message?.clipboardText ?? '';
      if (!clipboardText) {
        return { handled: false, actionName };
      }
      await tabsApi.create({
        url: normalizeUrl(clipboardText),
        active: getActionOption(action, 'selects', 'n_optype') !== 's_back',
        pinned: Boolean(getActionOption(action, 'checks', 'n_pin')),
      });
      return { handled: true, actionName };
    }
    if (actionName === 'print' && tabsApi?.sendMessage && tabId !== null) {
      await tabsApi.sendMessage(tabId, { type: 'print' });
      return { handled: true, actionName };
    }
    if (actionName === 'mute' && tabsApi?.query && tabsApi?.update) {
      const activeTab = await queryActiveTab();
      if (activeTab?.id != null) {
        await tabsApi.update(activeTab.id, { muted: !(activeTab.mutedInfo?.muted) });
        return { handled: true, actionName };
      }
    }
    if (actionName === 'saveimg' && downloadsApi?.download) {
      const imageUrl = context.message?.selEle?.img ?? '';
      if (!imageUrl) {
        return { handled: false, actionName };
      }
      await downloadsApi.download({ url: imageUrl, saveAs: false });
      return { handled: true, actionName };
    }
    if (actionName === 'saveimgas' && downloadsApi?.download) {
      const imageUrl = context.message?.selEle?.img ?? '';
      if (!imageUrl) {
        return { handled: false, actionName };
      }
      await downloadsApi.download({ url: imageUrl, saveAs: true });
      return { handled: true, actionName };
    }
    if (actionName === 'copyimg' && tabsApi?.sendMessage && tabId !== null) {
      const imageUrl = context.message?.selEle?.img ?? '';
      if (!imageUrl) {
        return { handled: false, actionName };
      }
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const dataUrl = await blobToDataUrl(blob);
      await tabsApi.sendMessage(tabId, { type: 'copyimg', value: dataUrl });
      return { handled: true, actionName };
    }
    if (actionName === 'imgsearch' && tabsApi?.create) {
      const imageUrl = context.message?.selEle?.img ?? '';
      const engineIndex = Number(getActionOption(action, 'selects', 'n_imgengine') ?? 0);
      const engineUrl = getImageEngineUrl(context.config, engineIndex);
      if (!imageUrl || !engineUrl) {
        return { handled: false, actionName };
      }
      const encoded = encodeURIComponent(imageUrl);
      await tabsApi.create({
        url: engineUrl.replace(/%s/g, encoded),
        active: getActionOption(action, 'selects', 'n_optype') !== 's_back',
        pinned: Boolean(getActionOption(action, 'checks', 'n_pin')),
      });
      return { handled: true, actionName };
    }
    if (actionName === 'crpages' && tabsApi?.create) {
      const pageType = getActionOption(action, 'selects', 'n_crpages');
      const pageMap = {
        s_cr_set: 'chrome://settings',
        s_cr_ext: 'chrome://extensions',
        s_cr_history: 'chrome://history',
        s_cr_app: 'chrome://apps',
        s_cr_bookmark: 'chrome://bookmarks',
        s_cr_dl: 'chrome://downloads',
        s_cr_flag: 'chrome://flags',
        s_cr_about: 'chrome://about',
      };
      const pageUrl = pageMap[pageType] ?? '';
      if (!pageUrl) {
        return { handled: false, actionName };
      }
      await tabsApi.create({
        url: pageUrl,
        active: getActionOption(action, 'selects', 'n_optype') !== 's_back',
        pinned: Boolean(getActionOption(action, 'checks', 'n_pin')),
      });
      return { handled: true, actionName };
    }
    if (actionName === 'bookmark' && bookmarksApi?.search && bookmarksApi?.create) {
      const tabUrl = context.message?.tabUrl ?? '';
      const tabTitle = context.message?.tabTitle ?? '';
      if (!tabUrl) {
        return { handled: false, actionName };
      }
      const existing = await bookmarksApi.search({ url: tabUrl });
      if (existing?.length) {
        if (bookmarksApi.remove) {
          await bookmarksApi.remove(existing[0].id);
        }
      } else {
        await bookmarksApi.create({ url: tabUrl, title: tabTitle });
      }
      return { handled: true, actionName };
    }
    if (actionName === 'capture' && pageCaptureApi?.saveAsMHTML && tabsApi?.create && tabId !== null) {
      const data = await pageCaptureApi.saveAsMHTML({ tabId });
      const dataUrl = await blobToDataUrl(data);
      await tabsApi.create({ url: dataUrl, active: true });
      return { handled: true, actionName };
    }
    if (actionName === 'savepage' && pageCaptureApi?.saveAsMHTML && downloadsApi?.download && tabId !== null) {
      const data = await pageCaptureApi.saveAsMHTML({ tabId });
      const dataUrl = await blobToDataUrl(data);
      await downloadsApi.download({
        url: dataUrl,
        filename: `${context.message?.tabTitle ?? 'page'}.mhtml`,
      });
      return { handled: true, actionName };
    }
    if (actionName === 'dldir' && downloadsApi?.showDefaultFolder) {
      await downloadsApi.showDefaultFolder();
      return { handled: true, actionName };
    }
    if (actionName === 'mail' && tabsApi?.update && tabId !== null) {
      const prefix = getTextValue(action, 'n_mail_prefix') ?? '';
      const title = context.message?.tabTitle ?? '';
      const tabUrl = context.message?.tabUrl ?? '';
      const subject = `${prefix}${title}`;
      const body = `${title} - ${encodeURIComponent(tabUrl)}        `;
      const mailType = getActionOption(action, 'selects', 'n_mail') ?? 's_defaultmail';
      if (mailType === 's_defaultmail') {
        await tabsApi.update(tabId, { url: `mailto:?subject=${subject}&body=${body}` });
      } else {
        const domain = getTextValue(action, 'n_mail_domain') ?? '';
        const gmailUrl = `https://mail.google.com${mailType === 's_gmailapps' ? `/a/${domain}` : ''}/mail/?view=cm&fs=1&tf=1&su=${subject}&body=${body}`;
        await tabsApi.create({ url: gmailUrl, active: true });
      }
      return { handled: true, actionName };
    }
    if (actionName === 'closeapps' && tabsApi?.sendMessage && tabId !== null) {
      await tabsApi.sendMessage(tabId, { type: 'closeapps' });
      return { handled: true, actionName };
    }
    if (actionName === 'script' && scriptingApi?.executeScript && tabId !== null) {
      const scriptIndex = Number(getActionOption(action, 'selects', 'n_script') ?? 0);
      const scriptContent = context.config?.general?.script?.script?.[scriptIndex]?.content ?? null;
      if (!scriptContent) {
        return { handled: false, actionName };
      }
      await scriptingApi.executeScript({
        target: { tabId, allFrames: false },
        func: (content) => {
          const script = document.createElement('script');
          script.textContent = content;
          (document.head || document.documentElement).append(script);
          script.remove();
        },
        args: [scriptContent],
      });
      return { handled: true, actionName };
    }
    if ((actionName === 'scroll' || actionName === 'zoom') && scriptingApi?.executeScript && tabId !== null) {
      updateInjectedActionState(action);
      await scriptingApi.executeScript({
        target: { tabId, allFrames: actionName === 'scroll' },
        files: [actionName === 'scroll' ? 'js/inject/scroll.js' : 'js/inject/zoom.js'],
      });
      return { handled: true, actionName };
    }
    if (actionName === 'zoom_dep' && scriptingApi?.executeScript && tabId !== null) {
      await scriptingApi.executeScript({
        target: { tabId, allFrames: false },
        files: ['js/inject/zoom.js'],
      });
      return { handled: true, actionName };
    }
    if (actionName === 'set_bk' && browserSettingsApi?.openBookmarksInNewTabs?.get && browserSettingsApi?.openBookmarksInNewTabs?.set) {
      const current = await browserSettingsApi.openBookmarksInNewTabs.get({});
      await browserSettingsApi.openBookmarksInNewTabs.set({ value: !current?.value });
      return { handled: true, actionName };
    }
    if (actionName === 'set_search' && browserSettingsApi?.openSearchResultsInNewTabs?.get && browserSettingsApi?.openSearchResultsInNewTabs?.set) {
      const current = await browserSettingsApi.openSearchResultsInNewTabs.get({});
      await browserSettingsApi.openSearchResultsInNewTabs.set({ value: !current?.value });
      return { handled: true, actionName };
    }
    if (actionName === 'readermode' && tabsApi?.toggleReaderMode && tabId !== null) {
      await tabsApi.toggleReaderMode(tabId);
      return { handled: true, actionName };
    }
    if (actionName === 'pin' && tabsApi?.update && tabId !== null) {
      await tabsApi.update(tabId, { pinned: true });
      return { handled: true, actionName };
    }
    if (actionName === 'move' && tabsApi?.move && tabId !== null) {
      const direction = getActionOption(action, 'selects', 'n_position_lrhl') ?? 's_left';
      await tabsApi.move(tabId, { index: direction === 's_left' ? 0 : -1 });
      return { handled: true, actionName };
    }
    if (actionName === 'detach' && windowsApi?.create && tabId !== null) {
      await windowsApi.create({ tabId });
      return { handled: true, actionName };
    }
    if (actionName === 'duplicate' && tabsApi?.duplicate && tabId !== null) {
      await tabsApi.duplicate(tabId);
      return { handled: true, actionName };
    }
    if (actionName === 'newwin' && windowsApi?.create) {
      await windowsApi.create({});
      return { handled: true, actionName };
    }
    if (actionName === 'closewin' && windowsApi?.getCurrent && windowsApi?.remove) {
      const currentWindow = await windowsApi.getCurrent();
      if (currentWindow?.id != null) {
        await windowsApi.remove(currentWindow.id);
        return { handled: true, actionName };
      }
    }
    if (actionName === 'max' && windowsApi?.getCurrent && windowsApi?.update) {
      const currentWindow = await windowsApi.getCurrent();
      if (currentWindow?.id != null) {
        await windowsApi.update(currentWindow.id, { state: 'maximized' });
        return { handled: true, actionName };
      }
    }
    if (actionName === 'min' && windowsApi?.getCurrent && windowsApi?.update) {
      const currentWindow = await windowsApi.getCurrent();
      if (currentWindow?.id != null) {
        await windowsApi.update(currentWindow.id, { state: 'minimized' });
        return { handled: true, actionName };
      }
    }
    if (actionName === 'full' && windowsApi?.getCurrent && windowsApi?.update) {
      const currentWindow = await windowsApi.getCurrent();
      if (currentWindow?.id != null) {
        await windowsApi.update(currentWindow.id, { state: 'fullscreen' });
        return { handled: true, actionName };
      }
    }
    if (actionName === 'mergewin' && windowsApi?.getCurrent && windowsApi?.getAll && tabsApi?.move) {
      const currentWindow = await windowsApi.getCurrent();
      if (currentWindow?.id == null) {
        return { handled: false, actionName };
      }
      const windows = await windowsApi.getAll({ populate: true, windowTypes: ['normal'] });
      const mergedWindows = [];
      const tabIds = [];
      for (const window of windows ?? []) {
        if (window?.id === currentWindow.id) {
          continue;
        }
        const windowTabIds = (window?.tabs ?? []).map((tab) => tab?.id).filter(Number.isInteger);
        if (windowTabIds.length) {
          mergedWindows.push(windowTabIds);
          tabIds.push(...windowTabIds);
        }
      }
      if (!tabIds.length) {
        return { handled: false, actionName };
      }
      await tabsApi.move(tabIds, { windowId: currentWindow.id, index: -1 });
      const winState = (getActionOption(action, 'selects', 'n_winstate') ?? 's_normal').replace(/^s_/, '');
      if (winState !== 'normal' && windowsApi?.update) {
        await windowsApi.update(currentWindow.id, { state: winState });
      }
      return { handled: true, actionName };
    }
    if (actionName === 'snap' && windowsApi?.getCurrent && windowsApi?.update) {
      const currentWindow = await windowsApi.getCurrent();
      if (currentWindow?.id == null) {
        return { handled: false, actionName };
      }
      if (snapState) {
        await windowsApi.update(currentWindow.id, snapState);
        snapState = null;
        return { handled: true, actionName };
      }
      const snapSide = getActionOption(action, 'selects', 'n_snap') ?? 's_left';
      const width = Math.trunc((globalThis.screen?.availWidth ?? currentWindow.width ?? 0) / 2);
      const height = globalThis.screen?.availHeight ?? currentWindow.height ?? 0;
      snapState = {
        height: currentWindow.height,
        width: currentWindow.width,
        left: currentWindow.left,
        top: currentWindow.top,
        state: currentWindow.state,
      };
      await windowsApi.update(currentWindow.id, {
        height,
        width,
        top: 0,
        left: snapSide === 's_left' ? 0 : width,
      });
      return { handled: true, actionName };
    }
    if (actionName === 'copytxt' && tabsApi?.sendMessage && tabId !== null) {
      await tabsApi.sendMessage(tabId, {
        type: 'copytxt',
        value: context.message?.selEle?.txt ?? '',
      });
      return { handled: true, actionName };
    }
    if (actionName === 'paste' && tabsApi?.sendMessage && tabId !== null) {
      const pasteValue = context.message?.clipboardText ?? '';
      if (!pasteValue) {
        return { handled: false, actionName };
      }
      await tabsApi.sendMessage(tabId, {
        type: 'paste',
        value: pasteValue,
      });
      return { handled: true, actionName };
    }
    if (actionName === 'txtsearchclip' && tabsApi?.create) {
      const text = context.message?.clipboardText ?? '';
      const engineIndex = Number(getActionOption(action, 'selects', 'n_txtengine') ?? 0);
      const engineUrl = getEngineUrl(context.config, engineIndex);
      if (!text || !engineUrl) {
        return { handled: false, actionName };
      }
      const encoded = encodeURIComponent(text);
      await tabsApi.create({
        url: engineUrl.replace(/%s/g, encoded),
        active: getActionOption(action, 'selects', 'n_optype') !== 's_back',
        pinned: Boolean(getActionOption(action, 'checks', 'n_pin')),
      });
      return { handled: true, actionName };
    }
    if (actionName === 'copylnktxt' && tabsApi?.sendMessage && tabId !== null) {
      const text = context.message?.selEle?.str ?? '';
      if (!text) {
        return { handled: false, actionName };
      }
      await tabsApi.sendMessage(tabId, { type: 'copylnktxt', value: text });
      return { handled: true, actionName };
    }
    if (actionName === 'copylnkaslnk' && tabsApi?.sendMessage && tabId !== null) {
      const linkUrl = context.message?.selEle?.lnk ?? '';
      const linkText = context.message?.selEle?.str ?? '';
      if (!linkUrl) {
        return { handled: false, actionName };
      }
      await tabsApi.sendMessage(tabId, {
        type: 'copylnkaslnk',
        value: `<a href="${linkUrl}">${linkText}</a>`,
      });
      return { handled: true, actionName };
    }
    if (actionName === 'dllink' && downloadsApi?.download) {
      const linkUrl = context.message?.selEle?.lnk ?? '';
      if (!linkUrl) {
        return { handled: false, actionName };
      }
      await downloadsApi.download({
        url: linkUrl,
        saveAs: Boolean(getActionOption(action, 'checks', 'n_dialog')),
      });
      return { handled: true, actionName };
    }
    if (actionName === 'copyimgurl' && tabsApi?.sendMessage && tabId !== null) {
      const imageUrl = context.message?.selEle?.img ?? '';
      if (!imageUrl) {
        return { handled: false, actionName };
      }
      await tabsApi.sendMessage(tabId, { type: 'copyimgurl', value: imageUrl });
      return { handled: true, actionName };
    }
    if (actionName === 'tts' && ttsApi?.speak) {
      await ttsApi.speak(context.message?.selEle?.txt ?? '', {
        rate: Number(getActionOption(action, 'ranges', 'n_rate') ?? 1),
        pitch: Number(getActionOption(action, 'ranges', 'n_pitch') ?? 1),
        volume: Number(getActionOption(action, 'ranges', 'n_volume') ?? 1),
      });
      return { handled: true, actionName };
    }

    return { handled: false, actionName };
  }

  return {
    async setDefaultTitle(title) {
      return actionApi.setTitle({ title });
    },
    async setPopup(popup) {
      return actionApi.setPopup({ popup });
    },
    async setTabIcon(tabId, path) {
      return actionApi.setIcon?.({ tabId, path });
    },
    async setTabTitle(tabId, title) {
      return actionApi.setTitle({ tabId, title });
    },
    async setBadgeText(tabId, text) {
      return actionApi.setBadgeText({ tabId, text });
    },
    runAction,
    async runPopupAction(action, context = {}) {
      return runAction(action, context);
    },
  };
}
