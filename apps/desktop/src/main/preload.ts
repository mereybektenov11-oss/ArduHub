import { contextBridge, ipcRenderer } from "electron";

// The only bridge between the page and the main process. Keep it narrow:
// no generic ipc access is exposed to the renderer.
contextBridge.exposeInMainWorld("arduhub", {
  store: {
    get: (key: string) => ipcRenderer.invoke("store:get", key),
    set: (key: string, value: string) =>
      ipcRenderer.invoke("store:set", key, value),
    remove: (key: string) => ipcRenderer.invoke("store:remove", key),
    persistent: () => ipcRenderer.invoke("store:persistent"),
  },
  openExternal: (url: string) => ipcRenderer.invoke("external:open", url),
  version: () => ipcRenderer.invoke("app:version"),
});
