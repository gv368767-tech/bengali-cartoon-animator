// Electron মূল প্রক্রিয়া — কোনো নেটওয়ার্ক অনুরোধ নেই; সব ফাইল স্থানীয়
const { app, BrowserWindow, ipcMain, dialog, session } = require("electron");
const fs = require("fs"), path = require("path");
app.whenReady().then(() => {
  session.defaultSession.webRequest.onBeforeRequest({ urls: ["http://*/*", "https://*/*", "ws://*/*", "wss://*/*"] }, (_d, cb) => cb({ cancel: true })); // ইন্টারনেট সম্পূর্ণ বন্ধ
  session.defaultSession.setPermissionRequestHandler((_w, _p, cb) => cb(false));
  const win = new BrowserWindow({ width: 1360, height: 860, title: "Bengali Cartoon Studio", webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, nodeIntegration: false, sandbox: true } });
  win.setMenuBarVisibility(false); win.loadFile(path.join(__dirname, "index.html"));
});
ipcMain.handle("save", async (_e, name, filters, data) => { const r = await dialog.showSaveDialog({ defaultPath: name, filters }); if (r.canceled || !r.filePath) return null; fs.writeFileSync(r.filePath, Buffer.from(data)); return r.filePath; });
ipcMain.handle("open", async (_e, filters) => { const r = await dialog.showOpenDialog({ filters, properties: ["openFile"] }); if (r.canceled || !r.filePaths[0]) return null; return fs.readFileSync(r.filePaths[0], "utf8"); });
app.on("window-all-closed", () => app.quit());
