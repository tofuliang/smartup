// Migration classes:
// 1. Static file injection -> executeScript({ files })
// 2. Ordered dependency injection -> sequential executeScript({ files }) calls
// 3. Dynamic code-string injection -> redesign through function injection or message passing
export function createInjection(scriptingApi) {
  return {
    async injectFiles(tabId, files, allFrames = false) {
      return scriptingApi.executeScript({ target: { tabId, allFrames }, files });
    },
    async injectFunction(tabId, func, args = [], allFrames = false) {
      return scriptingApi.executeScript({ target: { tabId, allFrames }, func, args });
    },
    async executeScript(tabId, details = {}, allFrames = false) {
      return scriptingApi.executeScript({ ...details, target: { tabId, allFrames } });
    },
    async injectSequence(tabId, fileGroups, allFrames = false) {
      for (const files of fileGroups) {
        await scriptingApi.executeScript({ target: { tabId, allFrames }, files });
      }
    },
  };
}
