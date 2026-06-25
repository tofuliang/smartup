const PENDING_PERMISSION_KEY = 'pendingPermission';

export function createPermissions(permissionsApi, runtimeApi, storageApi) {
  let pendingPermission = null;

  function copyPermission(permission) {
    if (!permission) {
      return null;
    }
    return {
      pers: permission.pers || permission.permissions || null,
      orgs: permission.orgs || permission.origins || null,
      msg: permission.msg || permission.message || '',
      intent: permission.intent || null,
    };
  }

  return {
    async getAll() {
      if (permissionsApi?.getAll) {
        return permissionsApi.getAll();
      }
      return { permissions: [], origins: [] };
    },
    async contains(request) {
      return permissionsApi.contains(request);
    },
    async request(request) {
      return permissionsApi.request(request);
    },
    async remove(request) {
      return permissionsApi.remove(request);
    },
    async setPendingPermission(permission) {
      pendingPermission = copyPermission(permission);
      if (storageApi?.setLocal) {
        await storageApi.setLocal({ [PENDING_PERMISSION_KEY]: pendingPermission });
      }
      return pendingPermission;
    },
    async getPendingPermission() {
      if (!pendingPermission && storageApi?.getLocal) {
        const items = await storageApi.getLocal([PENDING_PERMISSION_KEY]);
        pendingPermission = copyPermission(items?.[PENDING_PERMISSION_KEY]);
      }
      return copyPermission(pendingPermission);
    },
    async clearPendingPermission() {
      pendingPermission = null;
      if (storageApi?.setLocal) {
        await storageApi.setLocal({ [PENDING_PERMISSION_KEY]: null });
      }
      return true;
    },
    async openPermissionPage(path = 'html/getpermissions.html') {
      const url = runtimeApi?.getURL ? runtimeApi.getURL(path) : path;
      if (runtimeApi?.openOptionsPage && path === 'html/options.html') {
        return runtimeApi.openOptionsPage();
      }
      if (globalThis.chrome?.tabs?.create) {
        return globalThis.chrome.tabs.create({ url });
      }
      return null;
    },
    async resumeIntent(intent) {
      if (intent?.source === 'options' && intent?.action === 'permission-granted') {
        await this.openPermissionPage('html/options.html');
        return { resumed: true, action: 'open-options' };
      }
      return { resumed: false, error: 'unsupported-resume-intent' };
    },
  };
}
