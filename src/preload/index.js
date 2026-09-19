import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  readDir: (path) => ipcRenderer.invoke('read-dir', path)
})
