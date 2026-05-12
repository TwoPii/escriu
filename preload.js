const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  onFileOpened: (callback) => {
    ipcRenderer.on("file-opened", (event, content) => {
      callback(content);
    });
  },
  onLanguageChanged: (callback) => {
    ipcRenderer.on("language-changed", (event, language) => {
      callback(language);
    });
  },
});
