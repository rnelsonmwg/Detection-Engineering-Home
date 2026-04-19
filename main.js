/*
 * ALL SEEING EYE — Electron main process
 * Wraps the single-file web app as a desktop application.
 * The web/ folder and this wrapper share one source of truth.
 */

const { app, BrowserWindow, Menu, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 980,
    minHeight: 600,
    backgroundColor: '#0a0c0a',
    title: 'All Seeing Eye',
    autoHideMenuBar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // Allow the renderer to call external APIs (LLM providers, r.jina.ai).
      // Without this, CORS on anthropic/openai/gemini would block browser fetches.
      // Electron desktop context makes this safe — it's the user's own desktop,
      // not an arbitrary web origin.
      webSecurity: true,
    },
  });

  // Load the exact same single-file HTML app
  mainWindow.loadFile(path.join(__dirname, '..', 'web', 'index.html'));

  // Open external links in the user's default browser, not in-window
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Basic menu
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Threat',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow.webContents.executeJavaScript(
            "document.getElementById('btn-new-hunt').click()"
          ),
        },
        {
          label: 'Export Current Package as JSON...',
          accelerator: 'CmdOrCtrl+Shift+E',
          click: async () => {
            const pkg = await mainWindow.webContents.executeJavaScript(
              'JSON.stringify(state.currentPackage || null)'
            );
            if (!pkg || pkg === 'null') {
              dialog.showMessageBox(mainWindow, {
                type: 'info',
                message: 'No package to export. Forge one first.',
              });
              return;
            }
            const r = await dialog.showSaveDialog(mainWindow, {
              defaultPath: 'threat-package.json',
              filters: [{ name: 'JSON', extensions: ['json'] }],
            });
            if (!r.canceled && r.filePath) {
              fs.writeFileSync(r.filePath, pkg);
            }
          },
        },
        { type: 'separator' },
        { role: process.platform === 'darwin' ? 'close' : 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About All Seeing Eye',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'All Seeing Eye',
              message: 'All Seeing Eye — Threat Detection Forge',
              detail:
                'v1.0 prototype\n\n' +
                'Generates Splunk SPL detection & hunt packages from natural-language ' +
                'threat descriptions. AI-agnostic — works offline, or with Claude / ChatGPT / ' +
                'Gemini / Ollama / any OpenAI-compatible endpoint.\n\n' +
                'All data stays on this machine unless you target an external LLM.',
            });
          },
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Optional IPC: expose a secure "save file" to the renderer if we want
// native save dialogs instead of browser downloads in the desktop build.
ipcMain.handle('ase:saveFile', async (_evt, { filename, content }) => {
  const r = await dialog.showSaveDialog(mainWindow, { defaultPath: filename });
  if (r.canceled || !r.filePath) return { ok: false };
  fs.writeFileSync(r.filePath, content);
  return { ok: true, path: r.filePath };
});
