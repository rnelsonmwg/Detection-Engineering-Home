/*
 * ALL SEEING EYE — Electron preload
 * Exposes a minimal, safe surface to the renderer.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ase', {
  // Available as window.ase.saveFile(filename, content) — returns {ok, path}
  saveFile: (filename, content) => ipcRenderer.invoke('ase:saveFile', { filename, content }),
  // Platform detection helper
  platform: process.platform,
  isDesktop: true,
});
