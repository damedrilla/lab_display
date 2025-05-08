import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { exec } from 'child_process'

// Custom APIs for renderer
const api = {}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
    contextBridge.exposeInMainWorld('childProcess', {
      exec: (path) => exec(path),
    });

    // Expose ipcRenderer to the renderer process
    contextBridge.exposeInMainWorld('ipcRenderer', {
      send: (channel, ...args) => ipcRenderer.send(channel, ...args),
      on: (channel, listener) => ipcRenderer.on(channel, listener),
      once: (channel, listener) => ipcRenderer.once(channel, listener),
      removeListener: (channel, listener) => ipcRenderer.removeListener(channel, listener),
    });
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
}