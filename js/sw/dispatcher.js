export function createDispatcher(services) {
  let installReason = '';
  let lastConfig = null;
  const injectedActionState = services.injectedActionState ?? {
    scroll: { type: 'down', effect: true },
    zoom: { value: 's_reset' },
  };

function createDefaultConfig() {
    const lineUi = { enable: true, color: '#3369E8', width: 3, opacity: 90 };
    const directUi = { enable: false, color: '#8e9bd5', width: 32, opacity: 80, style: 'center' };
    const tipUi = { enable: true, color: '#ffffff', bgcolor: '#5677fc', width: 18, opacity: 80, style: 'follow', withdir: false };
    const noteUi = { enable: true, color: '#f75620', opacity: 90, width: 12, style: 'hover' };
    const allActionUi = { enable: false, color: '#ffffff', bgcolor: '#576f71', width: 24, opacity: 70, style: 'ui_bottom' };
    const gestureUi = { line: lineUi, direct: directUi, tip: tipUi, note: noteUi, allaction: allActionUi };
    const dragSettings = {
      holdkey: 'ctrl',
      holdimgkey: 'alt',
      drgbox: false,
      drgtobox: true,
      drgurl: true,
      drgimg: true,
      txt: true,
      lnk: true,
      img: true,
      draggable: true,
    };
    return {
      version: 46,
      plus: {},
      apps: {
        appslist: { n_closebox: true },
        autoreload: {},
        extmgm: { always: [], n_uninstallconfirm: true, n_enableallconfirm: true, n_disableallconfirm: true },
        homepage: {},
        jslist: { n_closebox: true, n_jq: false },
        next: { keywds: [] },
        notepad: {},
        recentbk: { n_optype: 's_new', n_position: 's_default', n_pin: true, n_num: 10, n_closebox: true },
        recentclosed: { n_num: 10, n_closebox: true },
        recentht: { n_optype: 's_new', n_position: 's_default', n_pin: true, n_num: 10, n_closebox: true },
        rss: { n_optype: 's_new', n_position: 's_default', n_pin: false },
        shorturl: {},
        speaker: { n_rate: 1, n_pitch: 1, n_volume: 1, n_gender: 's_female', n_voicename: 'native' },
        savepdf: {},
        synced: { n_closebox: true },
        tablist: { n_closebox: true },
        tbkjx: { n_num: 50, n_optype: 's_new', n_position: 's_default', n_pin: false },
      },
      general: {
        settings: {
          timeout: true,
          timeoutvalue: 2000,
          timeout_nomenu: true,
          minlength: 10,
          autosave: true,
          icon: true,
          theme: 'colorful',
          notif: false,
          appnotif: false,
          esc: true,
        },
        fnswitch: {
          fnmges: true,
          fnsdrg: true,
          fndrg: false,
          fnrges: false,
          fnwges: false,
          fnpop: false,
          fnicon: false,
          fnctm: false,
          fndca: false,
          fntouch: false,
          fnksa: false,
        },
        engine: {
          txtengine: [
            { name: 'Google', content: 'https://www.google.com/search?q=%s' },
            { name: 'Bing', content: 'https://www.bing.com/search?q=%s' },
          ],
          imgengine: [
            { name: 'Google Images', content: 'https://lens.google.com/uploadbyurl?url=%s' },
            { name: 'Bing Images', content: 'https://www.bing.com/images/search?q=imgurl:%s' },
          ],
        },
        script: {
          script: [
            { name: 'Test Script', content: "alert('test script 1.')" },
            { name: 'Test Script2', content: "alert('test script 2.')" },
          ],
        },
        linux: {
          cancelmenu: true,
        },
        sync: {
          autosync: true,
        },
        exclusion: {
          exclusion: false,
          exclusiontype: 'black',
          black: ['*.test.com/*'],
          white: ['*.example.com/*'],
        },
      },
      mges: {
        settings: { model: 2, holdkey: 'none', txttourl: true, lnktoimg: false },
        ui: gestureUi,
        actions: [
          { direct: 'L', name: 'back' },
          { direct: 'R', name: 'forward' },
          { direct: 'U', name: 'scroll', selects: [{ type: 'n_scroll', value: 's_up' }], checks: [{ type: 'n_effect', value: true }] },
          { direct: 'D', name: 'scroll', selects: [{ type: 'n_scroll', value: 's_down' }], checks: [{ type: 'n_effect', value: true }] },
          { direct: 'DL', name: 'newtab' },
          { direct: 'DR', name: 'close' },
        ],
      },
      sdrg: {
        settings: dragSettings,
        tsdrg: [{ direct: 'L', name: 'txtsearch' }, { direct: 'U', name: 'none' }, { direct: 'R', name: 'txtsearch' }, { direct: 'D', name: 'copytxt' }],
        lsdrg: [{ direct: 'L', name: 'openlnk' }, { direct: 'R', name: 'openlnk' }],
        isdrg: [{ direct: 'L', name: 'openimg' }, { direct: 'R', name: 'openimg' }],
      },
      drg: {
        settings: { ...dragSettings, clickcancel: false, drgcursor: false },
        ui: gestureUi,
        tdrg: [{ direct: 'L', name: 'txtsearch' }, { direct: 'R', name: 'txtsearch' }],
        ldrg: [{ direct: 'L', name: 'openlnk' }, { direct: 'R', name: 'openlnk' }],
        idrg: [{ direct: 'L', name: 'openimg' }, { direct: 'R', name: 'openimg' }],
      },
      rges: {
        actions: [{ name: 'close' }, { name: 'newtab' }],
      },
      wges: {
        settings: [{ name: 'none' }, { name: 'none' }, { name: 'switchtab' }, { name: 'switchtab' }],
        actions: [{ name: 'back' }, { name: 'forward' }, { name: 'close' }, { name: 'newtab' }],
      },
      pop: {
        settings: { type: 'front', last: false },
        actions: [{ name: 'reload' }, { name: 'newtab' }],
      },
      icon: {
        settings: { type: 'back', tip: true },
        actions: [{ name: 'newtab' }],
      },
      ctm: {
        settings: { disable: true, opt: true, fnswitch: false, homepage: true },
        actions: [{ name: 'newtab' }],
      },
      touch: {
        settings: { txttourl: true, lnktoimg: false },
        ui: gestureUi,
        actions: [{ direct: 'DL', name: 'newtab' }, { direct: 'DR', name: 'close' }],
      },
      dca: {
        settings: { box: false, confirm: true, selnothing: false },
        actions: [{ name: 'newtab' }],
      },
      ksa: {
        settings: { timeout: 1000 },
        actions: [{ name: 'newtab', codes: [78, 69, 87], ctrl: false, alt: false, shift: false }],
      },
    };
  }

  async function getStoredConfig() {
    const localItems = await services.storage.getLocal(['config']);
    const localSource = localItems?.configSource ?? null;
    if (localSource === 'sync' && services.storage.getSync) {
      const syncItems = await services.storage.getSync(null);
      if (syncItems?.general) {
        lastConfig = syncItems;
        return syncItems;
      }
    }
    if (localItems?.config) {
      lastConfig = localItems.config;
      return localItems.config;
    }
    const legacyLocalItems = await services.storage.getLocal(null);
    if (legacyLocalItems?.general || legacyLocalItems?.version || legacyLocalItems?.mges) {
      const { localConfig, ...legacyConfig } = legacyLocalItems;
      lastConfig = legacyConfig;
      if (services.storage.saveConfig) {
        await services.storage.saveConfig(legacyConfig);
      }
      return legacyConfig;
    }
    const syncItems = services.storage.getSync ? await services.storage.getSync(null) : {};
    if (syncItems?.general) {
      lastConfig = syncItems;
      return syncItems;
    }
    lastConfig = createDefaultConfig();
    if (services.storage.saveConfig) {
      await services.storage.saveConfig(lastConfig);
    }
    return lastConfig;
  }

  async function getLegacyConfigResponse(type) {
    const config = await getStoredConfig();
    const defaultConf = createDefaultConfig();
    return {
      type,
      defaultConf,
      config,
      devMode: false,
      os: '',
      donateData: null,
      reason: installReason,
    };
  }

  function findDirectedAction(actions, direct) {
    if (!Array.isArray(actions)) {
      return null;
    }
    return actions.find((action) => action?.direct === direct) ?? null;
  }

  function getWheelActionIndex(sendValue = {}) {
    if (sendValue.buttons === 1) {
      return sendValue.wheelDelta < 0 ? 0 : 1;
    }
    if (sendValue.buttons === 2) {
      return sendValue.wheelDelta < 0 ? 2 : 3;
    }
    return null;
  }

  function getActionForMessage(config, message) {
    if (message.type === 'action_rges') {
      const index = message.sendValue?.buttons === 1 ? 0 : 1;
      return config?.rges?.actions?.[index] ?? null;
    }
    if (message.type === 'action_wges') {
      const index = getWheelActionIndex(message.sendValue);
      return index === null ? null : config?.wges?.actions?.[index] ?? null;
    }
    if (message.type === 'action_dca') {
      return config?.dca?.actions?.[0] ?? null;
    }
    if (message.type === 'action_ksa') {
      return config?.ksa?.actions?.[message.id] ?? null;
    }
    if (message.type === 'action_np') {
      return message.npok ? { name: message.name ?? 'next', url: message.url ?? null } : null;
    }
    if (message.type === 'action') {
      const section = message.drawType?.[0] ?? 'mges';
      const listName = message.drawType?.[1] ?? 'actions';
      return findDirectedAction(config?.[section]?.[listName], message.direct);
    }
    return null;
  }

  function getActionLabel(action) {
    if (!action) {
      return null;
    }
    if (action?.mydes?.type && action?.mydes?.value) {
      return action.mydes.value;
    }
    return chrome.i18n?.getMessage?.(action?.name ?? '') || action?.name || null;
  }

  function getGestureHintResponse(config, message) {
    const section = message.drawType?.[0] ?? null;
    const listName = message.drawType?.[1] ?? null;
    const direct = message.direct ?? '';
    const action = getActionForMessage(config, { ...message, type: 'action' });

    const response = {
      type: 'tip',
      tip: getActionLabel(action),
      note: action?.note ?? null,
      allaction: null,
    };

    const candidateActions = config?.[section]?.[listName];
    const allActionEnabled = Boolean(config?.[section]?.ui?.allaction?.enable);
    if (!allActionEnabled || !Array.isArray(candidateActions) || !direct) {
      return response;
    }

    const matchingActions = [];
    for (const candidate of candidateActions) {
      const candidateDirect = candidate?.direct;
      if (typeof candidateDirect !== 'string') {
        continue;
      }
      if (candidateDirect.startsWith(direct) && candidateDirect.length > direct.length) {
        matchingActions.push({
          direct: candidateDirect,
          tip: getActionLabel(candidate),
        });
      }
    }

    response.allaction = matchingActions.length > 0 ? matchingActions : null;
    return response;
  }

  function getActionOption(action, collectionName, optionType) {
    const options = action?.[collectionName];
    if (!Array.isArray(options)) {
      return undefined;
    }
    return options.find((option) => option?.type === optionType)?.value;
  }

  function updateInjectedActionState(action) {
    if (action?.name === 'scroll') {
      const scrollValue = getActionOption(action, 'selects', 'n_scroll');
      const effectValue = getActionOption(action, 'checks', 'n_effect');
      injectedActionState.scroll = {
        type: typeof scrollValue === 'string' && scrollValue.startsWith('s_') ? scrollValue.slice(2) : 'down',
        effect: effectValue === undefined ? true : Boolean(effectValue),
      };
    }
    if (action?.name === 'zoom') {
      const zoomValue = getActionOption(action, 'selects', 'n_zoom');
      injectedActionState.zoom = {
        value: typeof zoomValue === 'string' && zoomValue ? zoomValue : 's_reset',
      };
    }
  }

  function getSenderTabId(sender) {
    return sender?.tab?.id ?? null;
  }

  function requireAppApi(api, app, action, name) {
    if (!api) {
      return { ok: false, error: `missing-${name}-api`, app, action };
    }
    return null;
  }

  async function openAppUrl(url, app, action) {
    const openApi = services.apps?.tabs?.open;
    const missingApi = requireAppApi(openApi, app, action, 'tabs-open');
    if (missingApi) {
      return missingApi;
    }
    if (!url) {
      return { ok: false, error: 'missing-url', app, action };
    }
    const config = lastConfig ?? await getStoredConfig();
    const appConfig = config?.apps?.[app] ?? {};
    await openApi(url, {
      target: appConfig.n_optype ?? 's_current',
      position: appConfig.n_position ?? 's_default',
      pin: Boolean(appConfig.n_pin),
    });
    return { ok: true, app, action };
  }

  async function handleJslistRun(message, sender, app, action) {
    const senderTabId = getSenderTabId(sender);
    if (!Number.isInteger(senderTabId)) {
      return { ok: false, error: 'missing-target-tab', app, action };
    }
    const config = lastConfig ?? await getStoredConfig();
    const scriptIndex = Number.parseInt(message.value, 10);
    const scriptContent = Number.isInteger(scriptIndex)
      ? config?.general?.script?.script?.[scriptIndex]?.content
      : null;
    if (!scriptContent) {
      return { ok: false, error: 'missing-script', app, action, value: message.value };
    }
    const runScriptApi = services.apps?.jslist?.runScript;
    const missingApi = requireAppApi(runScriptApi, app, action, 'jslist-run-script');
    if (missingApi) {
      return missingApi;
    }
    await runScriptApi(senderTabId, scriptContent);
    return { ok: true, app, action };
  }

  async function handleLegacySpeakerAction(message, app, action) {
    const command = message.value?.type ?? 'play';
    if (command === 'pause') {
      const pauseApi = services.apps?.tts?.pause;
      const missingApi = requireAppApi(pauseApi, app, action, 'tts-pause');
      if (missingApi) {
        return missingApi;
      }
      await pauseApi();
      return { ok: true, app, action };
    }
    if (command === 'resume') {
      const resumeApi = services.apps?.tts?.resume;
      const missingApi = requireAppApi(resumeApi, app, action, 'tts-resume');
      if (missingApi) {
        return missingApi;
      }
      await resumeApi();
      return { ok: true, app, action };
    }
    if (command === 'stop') {
      const stopApi = services.apps?.tts?.stop;
      const missingApi = requireAppApi(stopApi, app, action, 'tts-stop');
      if (missingApi) {
        return missingApi;
      }
      await stopApi();
      return { ok: true, app, action };
    }
    const speakApi = services.apps?.tts?.speak;
    const missingApi = requireAppApi(speakApi, app, action, 'tts-speak');
    if (missingApi) {
      return missingApi;
    }
    await speakApi(message.value ?? {});
    return { ok: true, app, action };
  }

  async function forwardPayloadToSender(sender, payload, app, action) {
    const sent = await sendAppMessageToTab(sender, payload, app, action);
    return sent.ok ? { ok: true, app, action } : sent;
  }

  async function handleExtManagementAction(message, sender, app, action) {
    const managementApi = services.apps?.management;
    if (!managementApi) {
      return { ok: false, error: 'missing-management-api', app, action };
    }

    if (action === 'getAllExt') {
      const exts = await managementApi.getAll();
      return { ok: true, app, action, exts };
    }
    if (action === 'itemDisable') {
      await managementApi.setEnabled(message.extId, false);
      return { ok: true, app, action };
    }
    if (action === 'itemEnable') {
      await managementApi.setEnabled(message.extId, true);
      return { ok: true, app, action };
    }
    if (action === 'itemOpturl') {
      return openAppUrl(message.url, app, action);
    }
    if (action === 'itemUninstall') {
      const config = lastConfig ?? await getStoredConfig();
      await managementApi.uninstall(message.extId, {
        showConfirmDialog: Boolean(config?.apps?.extmgm?.n_uninstallconfirm),
      });
      const sent = await sendAppMessageToTab(sender, { type: 'itemUninstall', id: message.id, extId: message.extId }, app, action);
      return sent.ok ? { ok: true, app, action } : sent;
    }
    if (action === 'enableAll' || action === 'disableAll') {
      const exts = await managementApi.getAll();
      const selfExtId = services.apps?.selfExtId ?? null;
      const config = lastConfig ?? await getStoredConfig();
      const always = config?.apps?.extmgm?.always ?? [];
      for (const ext of exts) {
        if (action === 'disableAll' && (ext?.id === selfExtId || always.includes(ext?.id))) {
          continue;
        }
        await managementApi.setEnabled(ext.id, action === 'enableAll');
      }
      return { ok: true, app, action };
    }

    return { ok: false, error: 'unsupported-app-action', app, action };
  }

  async function sendAppMessageToTab(sender, payload, app, action) {
    const senderTabId = getSenderTabId(sender);
    if (!Number.isInteger(senderTabId)) {
      return { ok: false, error: 'missing-target-tab', app, action };
    }
    const sendToTab = services.apps?.messaging?.sendToTab;
    const missingApi = requireAppApi(sendToTab, app, action, 'tab-message');
    if (missingApi) {
      return missingApi;
    }
    await sendToTab(senderTabId, payload);
    return { ok: true, app, action };
  }

  async function runConfiguredAction(message, sender) {
    const config = lastConfig ?? await getStoredConfig();
    const action = getActionForMessage(config, message);
    if (!action) {
      return { ok: false, error: 'missing-action', type: message.type };
    }
    updateInjectedActionState(action);

    const senderTabId = sender?.tab?.id ?? null;
    if (action.name === 'scroll' || action.name === 'zoom') {
      if (!Number.isInteger(senderTabId)) {
        return { ok: false, error: 'missing-target-tab', actionName: action.name };
      }
      const file = action.name === 'scroll' ? 'js/inject/scroll.js' : 'js/inject/zoom.js';
      await services.injection.injectFiles(senderTabId, [file], action.name === 'scroll');
      return { ok: true, actionName: action.name };
    }

    const result = await services.actionState.runAction(action, {
      message,
      senderTabId,
      previousTabId: sender?.previousTabId ?? null,
      config,
    });
    if (!result?.handled) {
      return { ok: false, error: 'unhandled-action', actionName: result?.actionName ?? action.name ?? null };
    }
    return { ok: true, actionName: result.actionName ?? action.name ?? null };
  }

  async function handleAppsActionMessage(message, sender) {
    const app = message.app ?? null;
    const action = message.action ?? null;
    if (app === 'tablist') {
      if (action === 'tabClose') {
        const closeApi = services.apps?.tabs?.close;
        const missingApi = requireAppApi(closeApi, app, action, 'tabs-close');
        if (missingApi) {
          return missingApi;
        }
        await closeApi(message.value);
        return { ok: true, app, action };
      }
      if (action === 'tabSwitch') {
        const switchApi = services.apps?.tabs?.switch;
        const missingApi = requireAppApi(switchApi, app, action, 'tabs-switch');
        if (missingApi) {
          return missingApi;
        }
        await switchApi(message.value);
        return { ok: true, app, action };
      }
    }
    if (app === 'appslist' && action === 'openApp') {
      const openAppApi = services.apps?.launcher?.openApp;
      const missingApi = requireAppApi(openAppApi, app, action, 'app-launcher');
      if (missingApi) {
        return missingApi;
      }
      await openAppApi(message.value, { senderTabId: getSenderTabId(sender) });
      return { ok: true, app, action };
    }
    if (app === 'pxmovie') {
      if (action === 'getList') {
        const getListApi = services.apps?.contentFeeds?.getPxmovieList;
        const missingApi = requireAppApi(getListApi, app, action, 'pxmovie-list');
        if (missingApi) {
          return missingApi;
        }
        const value = await getListApi();
        return forwardPayloadToSender(sender, { type: 'list', value }, app, action);
      }
      if (action === 'getData') {
        const getDataApi = services.apps?.contentFeeds?.getPxmovieData;
        const missingApi = requireAppApi(getDataApi, app, action, 'pxmovie-data');
        if (missingApi) {
          return missingApi;
        }
        const value = await getDataApi(message.value);
        return forwardPayloadToSender(sender, { type: 'data', value }, app, action);
      }
    }
    if (app === 'jslist' && action === 'jsRun') {
      return handleJslistRun(message, sender, app, action);
    }
    if ((app === 'recentbk' || app === 'recentht') && action === 'openItem') {
      return openAppUrl(message.value, app, action);
    }
    if (app === 'recentclosed' && action === 'openItem') {
      if (!services.apps?.sessions?.restore) {
        return { ok: false, error: 'missing-sessions-api', app, action };
      }
      await services.apps.sessions.restore(message.value);
      return { ok: true, app, action };
    }
    if (app === 'synced' && action === 'openItem') {
      if (!message.value) {
        return { ok: false, error: 'missing-session-id', app, action };
      }
      if (!services.apps?.sessions?.restore) {
        return { ok: false, error: 'missing-sessions-api', app, action };
      }
      await services.apps.sessions.restore(message.value);
      return { ok: true, app, action };
    }
    if (app === 'autoreload') {
      const config = lastConfig ?? await getStoredConfig();
      if (action === 'getConf') {
        return { ok: true, app, action, config: config?.apps?.autoreload ?? {}, value: services.apps?.autoreload?.state ?? {}, tabId: getSenderTabId(sender) };
      }
      if (action === 'reload') {
        const senderTabId = getSenderTabId(sender);
        if (!Number.isInteger(senderTabId)) {
          return { ok: false, error: 'missing-target-tab', app, action };
        }
        const reloadApi = services.apps?.autoreload?.reload;
        const missingApi = requireAppApi(reloadApi, app, action, 'autoreload');
        if (missingApi) {
          return missingApi;
        }
        await reloadApi(senderTabId, message.value ?? {});
        return { ok: true, app, action };
      }
    }
    if (app === 'homepage') {
      if (action === 'getImageURL') {
        const imageApi = services.apps?.homepage?.getImageURL;
        const missingApi = requireAppApi(imageApi, app, action, 'homepage-image');
        if (missingApi) {
          return missingApi;
        }
        const value = await imageApi();
        const sent = await sendAppMessageToTab(sender, { type: 'imageURL', value }, app, action);
        return sent.ok ? { ok: true, app, action } : sent;
      }
      if (action === 'setListId') {
        const config = lastConfig ?? await getStoredConfig();
        config.apps = config.apps ?? {};
        config.apps.homepage = { ...(config.apps.homepage ?? {}), curListId: message.value };
        const saveResult = await saveConfig(config);
        return saveResult.ok ? { ok: true, app, action, area: saveResult.area } : saveResult;
      }
      if (action === 'openItem') {
        return openAppUrl(message.value, app, action);
      }
    }
    if (app === 'notepad') {
      if (action === 'get') {
        const getApi = services.apps?.notepad?.get;
        const missingApi = requireAppApi(getApi, app, action, 'notepad-get');
        if (missingApi) {
          return missingApi;
        }
        const value = await getApi(message.value);
        const sent = await sendAppMessageToTab(sender, { type: 'appsListener_get', value }, app, action);
        return sent.ok ? { ok: true, app, action } : sent;
      }
      if (action === 'set') {
        const setApi = services.apps?.notepad?.set;
        const missingApi = requireAppApi(setApi, app, action, 'notepad-set');
        if (missingApi) {
          return missingApi;
        }
        await setApi(message.value ?? {});
        return { ok: true, app, action };
      }
    }
    if (app === 'rss') {
      if (action === 'getMessage') {
        const getMessageApi = services.apps?.rss?.getMessage;
        const missingApi = requireAppApi(getMessageApi, app, action, 'rss-get-message');
        if (missingApi) {
          return missingApi;
        }
        const value = await getMessageApi(message.value);
        const sent = await sendAppMessageToTab(sender, { type: 'rssData', value, feedURL: message.value }, app, action);
        return sent.ok ? { ok: true, app, action } : sent;
      }
      if (action === 'openItem') {
        return openAppUrl(message.value, app, action);
      }
    }
    if (app === 'shorturl' && action === 'getURL') {
      const getUrlApi = services.apps?.shorturl?.getURL;
      const missingApi = requireAppApi(getUrlApi, app, action, 'shorturl');
      if (missingApi) {
        return missingApi;
      }
      const result = await getUrlApi(message.value ?? {}, sender);
      const payload = result?.error
        ? { type: 'err', app, value: result.error }
        : { type: 'url', app, value: result?.url ?? result };
      const sent = await sendAppMessageToTab(sender, payload, app, action);
      return sent.ok ? { ok: true, app, action } : sent;
    }
    if (app === 'speaker' && action === 'speak') {
      return handleLegacySpeakerAction(message, app, action);
    }
    if (app === 'savepdf' && action === 'savePDF') {
      const savePdfApi = services.apps?.tabs?.savePdf;
      const missingApi = requireAppApi(savePdfApi, app, action, 'tabs-save-pdf');
      if (missingApi) {
        return missingApi;
      }
      await savePdfApi(message.value ?? {});
      return { ok: true, app, action };
    }
    if (app === 'tbkjx') {
      if (action === 'getData') {
        const getDataApi = services.apps?.contentFeeds?.getTbkjxData;
        const missingApi = requireAppApi(getDataApi, app, action, 'tbkjx-data');
        if (missingApi) {
          return missingApi;
        }
        const value = await getDataApi(message.value);
        return forwardPayloadToSender(sender, { type: 'data', value }, app, action);
      }
      if (action === 'openApp') {
        const openAppApi = services.apps?.launcher?.openApp;
        const missingApi = requireAppApi(openAppApi, app, action, 'app-launcher');
        if (missingApi) {
          return missingApi;
        }
        await openAppApi(message.value, { senderTabId: getSenderTabId(sender) });
        return { ok: true, app, action };
      }
      if (action === 'itemOpen') {
        return openAppUrl(message.value, app, action);
      }
    }
    if (app === 'extmgm') {
      return handleExtManagementAction(message, sender, app, action);
    }
    return { ok: false, error: 'unsupported-app-action', app, action };
  }

  function validateTargetTab(message, sender) {
    if (sender?.id && sender.id !== services.apps?.selfExtId) {
      return { ok: false, error: 'forbidden-external-message', type: message.type };
    }
    const targetTabId = message.targetTabId ?? sender?.tab?.id;
    if (!Number.isInteger(targetTabId)) {
      return { ok: false, error: 'missing-target-tab', type: message.type };
    }
    return { ok: true, targetTabId };
  }

  function hasNonEmptyStringArray(value) {
    return Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === 'string' && item.length > 0);
  }

  function hasValidFileGroups(value) {
    return Array.isArray(value) && value.length > 0 && value.every(hasNonEmptyStringArray);
  }

  function isCriticalUnsupportedMessage(type) {
    return type.startsWith('action_') || type.endsWith('_getconf');
  }

  async function saveConfig(config) {
    if (!config) {
      return { ok: false, error: 'missing-config' };
    }
    try {
      const result = await services.storage.saveConfig(config);
      lastConfig = config;
      return { ok: true, area: result?.area ?? null };
    } catch (error) {
      return { ok: false, error: 'save-failed', message: error?.message ?? String(error) };
    }
  }

  async function handleActionPop(message, sender) {
    const config = lastConfig ?? await getStoredConfig();
    const index = Number.isInteger(message.index) ? message.index : 0;
    const popupConfig = config?.pop;
    const action = popupConfig?.actions?.[index];
    if (!action) {
      return { ok: false, error: 'missing-popup-action', index };
    }

    const result = await services.actionState.runPopupAction(action, {
      mode: popupConfig?.settings?.type ?? 'back',
      senderTabId: sender?.tab?.id ?? null,
    });

    if (!result?.handled) {
      return { ok: false, error: 'unhandled-popup-action', actionName: result?.actionName ?? action.name ?? null };
    }

    let area = null;
    if (index !== 0 && popupConfig?.settings?.last) {
      popupConfig.actions[index] = popupConfig.actions[0];
      popupConfig.actions[0] = action;
      const saveResult = await saveConfig(config);
      if (!saveResult.ok) {
        return saveResult;
      }
      area = saveResult.area;
    }

    return { ok: true, actionName: result?.actionName ?? action.name ?? null, area };
  }

  async function handleAppConfigMessage(message) {
    const appType = message.apptype;
    if (!appType) {
      return { ok: false, error: 'missing-apptype' };
    }

    const config = lastConfig ?? await getStoredConfig();
    config.apps = config.apps ?? {};

    if (message.type === 'apps_saveconf') {
      if (!message.config) {
        return { ok: false, error: 'missing-app-config', apptype: appType };
      }
      config.apps[appType] = message.config;
      const saveResult = await saveConfig(config);
      if (!saveResult.ok) {
        return saveResult;
      }
      return { ok: true, area: saveResult.area, apptype: appType, type: appType, value: appType };
    }

    const appConfig = config.apps[appType] ?? {};
    if (message.type === 'apps_getvalue') {
      if (appType === 'appslist') {
        const defaultApps = ['rss', 'tablist', 'random', 'extmgm', 'recentbk', 'recentht', 'recentclosed', 'synced', 'base64', 'qr', 'numc', 'speaker', 'jslist', 'convertcase', 'autoreload', 'homepage', 'magnet'];
        if (config?.apps?.savepdf !== undefined) {
          defaultApps.push('savepdf');
        }
        if (config?.apps?.tbkjx !== undefined) {
          defaultApps.push('tbkjx');
        }
        return { ok: true, apptype: appType, type: appType, config: appConfig, value: { apps: defaultApps } };
      }
      if (appType === 'jslist') {
        return {
          ok: true,
          apptype: appType,
          type: appType,
          config: appConfig,
          value: { js: config?.general?.script?.script ?? [] },
        };
      }
    }
    if (message.type === 'getappconf') {
      return { ok: true, apptype: appType, config: appConfig, ...appConfig };
    }
    const appValueSource = services.apps?.values?.[appType];
    const appValue = typeof appValueSource === 'function'
      ? await appValueSource({ appType, config, appConfig })
      : (appValueSource ?? appConfig);
    return { ok: true, apptype: appType, type: appType, config: appConfig, value: appValue };
  }

  return {
    async handleInstalled(details) {
      installReason = details?.reason ?? '';
      await services.actionState.setDefaultTitle('smartUp');
      return { ok: true, reason: installReason };
    },
    async handleActionClick(tab) {
      const config = lastConfig ?? await getStoredConfig();
      const iconConfig = config?.icon ?? {};
      const iconMode = iconConfig?.settings?.type ?? 'back';
      const action = iconConfig?.actions?.[0] ?? null;
      if (iconMode === 'back' && action) {
        const result = await services.actionState.runAction(action, {
          senderTabId: tab?.id ?? null,
          mode: 'back',
          message: { type: 'action_icon' },
        });
        if (result?.handled) {
          return { ok: true, tabId: tab?.id ?? null, actionName: result.actionName ?? action.name ?? null };
        }
      }
      if (tab?.id) {
	        await services.injection.injectFiles(tab.id, ['js/content/event.js'], true);
      }
      return { ok: true, tabId: tab?.id ?? null };
    },
    async handleMessage(message, sender) {
      if (!message?.type) {
        return { ok: false, error: 'missing-type' };
      }
      if (message.type === 'opt_getpers') {
        await services.permissions.setPendingPermission({
          permissions: message.value?.thepers ?? null,
          origins: message.value?.theorgs ?? null,
          message: message.value?.msg ?? '',
          intent: message.value?.intent ?? null,
        });
        await services.permissions.openPermissionPage('html/getpermissions.html');
        return { ok: true };
      }
      if (message.type === 'per_getconf') {
        const pendingPermission = await services.permissions.getPendingPermission();
        return {
          pers: pendingPermission?.pers ?? null,
          orgs: pendingPermission?.orgs ?? null,
          msg: pendingPermission?.msg ?? '',
          intent: pendingPermission?.intent ?? null,
        };
      }
      if (message.type === 'per_clear') {
        await services.permissions.clearPendingPermission();
        return { ok: true };
      }
      if (message.type === 'getpers') {
        const currentPermissions = services.permissions.getAll
          ? await services.permissions.getAll()
          : { permissions: [], origins: [] };
        return {
          ok: true,
          permissions: currentPermissions?.permissions ?? [],
          origins: currentPermissions?.origins ?? [],
        };
      }
      if (message.type === 'per_resume') {
        const pendingPermission = await services.permissions.getPendingPermission();
        await services.permissions.clearPendingPermission();
        const intent = pendingPermission?.intent ?? message.resumeIntent ?? null;
        const resumeResult = intent && services.permissions.resumeIntent
          ? await services.permissions.resumeIntent(intent)
          : { resumed: false, error: 'unsupported-resume-intent' };
        if (!resumeResult.resumed) {
          return { ok: false, error: resumeResult.error ?? 'unsupported-resume-intent', intent };
        }
        return { ok: true, resumed: true, action: resumeResult.action ?? null, intent };
      }
      if (message.type === 'opt_getconf' || message.type === 'pop_getconf' || message.type === 'evt_getconf') {
        return getLegacyConfigResponse(message.type);
      }
      if (message.type === 'saveConf') {
        return saveConfig(message.value);
      }
      if (message.type === 'action_pop') {
        return handleActionPop(message, sender);
      }
      if (message.type === 'set_action_popup_mode') {
        const popup = message.iconEnabled ? '' : 'html/popup.html';
        await services.actionState.setPopup(popup);
        return { ok: true, popup };
      }
      if (message.type === 'getappconf' || message.type === 'apps_getvalue' || message.type === 'apps_saveconf') {
        return handleAppConfigMessage(message);
      }
      if (message.type === 'appsAction') {
        return handleAppsActionMessage(message, sender);
      }
      if (message.type === 'sendRightClick') {
        const sendRightClickApi = services.nativeHelper?.sendRightClick;
        if (!sendRightClickApi) {
          return { ok: false, error: 'missing-native-helper', type: message.type };
        }
        await sendRightClickApi(message.sendValue ?? null);
        return { ok: true, type: message.type };
      }
      if (message.type === 'scroll') {
        return injectedActionState.scroll;
      }
      if (message.type === 'zoom') {
        return injectedActionState.zoom;
      }
      if (message.type === 'gettip') {
        const config = lastConfig ?? await getStoredConfig();
        return getGestureHintResponse(config, message);
      }
      if (['action_rges', 'action_wges', 'action_dca', 'action_ksa', 'action_np', 'action'].includes(message.type)) {
        return runConfiguredAction(message, sender);
      }
      if (message.type === 'storage_get_local') {
        const value = await services.storage.getLocal(message.keys ?? null);
        return { ok: true, value };
      }
      if (message.type === 'storage_get_sync') {
        const value = await services.storage.getSync(message.keys ?? null);
        return { ok: true, value };
      }
      if (message.type === 'inject_files') {
        const target = validateTargetTab(message, sender);
        if (!target.ok) {
          return target;
        }
        if (!hasNonEmptyStringArray(message.files)) {
          return { ok: false, error: 'missing-files', type: message.type };
        }
        const targetTabId = target.targetTabId;
        await services.injection.injectFiles(targetTabId, message.files, Boolean(message.allFrames));
        return { ok: true };
      }
      if (message.type === 'inject_sequence') {
        const target = validateTargetTab(message, sender);
        if (!target.ok) {
          return target;
        }
        if (!hasValidFileGroups(message.fileGroups)) {
          return { ok: false, error: 'missing-file-groups', type: message.type };
        }
        const targetTabId = target.targetTabId;
        await services.injection.injectSequence(targetTabId, message.fileGroups, Boolean(message.allFrames));
        return { ok: true };
      }
      if (isCriticalUnsupportedMessage(message.type)) {
        return { ok: false, error: 'unsupported-message', type: message.type };
      }
      return { ok: false, error: 'unsupported-message', type: message.type };
    },
  };
}
