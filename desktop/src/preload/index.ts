import { contextBridge } from 'electron'

// Expose typed API to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
})
