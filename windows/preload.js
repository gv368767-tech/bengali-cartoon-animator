const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("native", { save: (n, f, d) => ipcRenderer.invoke("save", n, f, d), open: (f) => ipcRenderer.invoke("open", f) });
