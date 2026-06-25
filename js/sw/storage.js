function callStorageArea(area, method, value) {
  return new Promise((resolve, reject) => {
    try {
      const result = value === undefined ? area[method](resolve) : area[method](value, resolve);
      if (result && typeof result.then === 'function') {
        result.then(resolve, reject);
      }
    } catch (error) {
      reject(error);
    }
  });
}

export function createStorage(storageApi) {
  const hasSync = Boolean(storageApi.sync);

  return {
    hasSync,
    async getLocal(keys = null) {
      return callStorageArea(storageApi.local, 'get', keys);
    },
    async setLocal(value) {
      return callStorageArea(storageApi.local, 'set', value);
    },
    async getSync(keys = null) {
      return storageApi.sync ? callStorageArea(storageApi.sync, 'get', keys) : {};
    },
    async setSync(value) {
      return storageApi.sync ? callStorageArea(storageApi.sync, 'set', value) : undefined;
    },
    async saveConfig(config) {
      const useSync = Boolean(config?.general?.sync?.autosync && hasSync);
      if (useSync) {
        await callStorageArea(storageApi.sync, 'set', config);
        await callStorageArea(storageApi.local, 'set', {
          config,
          configSource: 'sync',
        });
        return { area: 'sync' };
      }

      const items = await callStorageArea(storageApi.local, 'get', null);
      await callStorageArea(storageApi.local, 'set', {
        ...items,
        config,
        configSource: 'local',
        localConfig: items?.localConfig,
      });
      return { area: 'local' };
    },
  };
}
