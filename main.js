const { app, BrowserWindow, Menu, dialog } = require("electron");
const fs = require("fs");
const path = require("path");
const i18n = require("./i18n");
const { author } = require("./package.json");

let win;

let currentFilePath = null;

function createWindow() {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: __dirname + "/preload.js",
    },
  });

  win.loadFile("index.html");
  updateTitle();
  createMenu();
}

function updateTitle() {
  if (!win) return;

  const fileName = currentFilePath
    ? path.basename(currentFilePath)
    : "Untitled";

  win.setTitle(`${fileName} - ${app.name}`);
}

function showAboutDialog() {
  const message = `${app.name} ${app.getVersion()}`;
  const detailTemplate = i18n.t("menu.app.aboutMessage");
  const detail = detailTemplate.replace("{creator}", author);

  if (!win) return;

  dialog.showMessageBox(win, {
    type: "info",
    title: i18n.t("menu.app.about"),
    message,
    detail,
  });
}

function switchLanguage(language) {
  if (i18n.setLanguage(language)) {
    createMenu();

    if (win) {
      win.webContents.send("language-changed", language);
    }
  }
}

function getActiveWindow() {
  return BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
}

function createMenu() {
  const template = [
    {
      label: app.name,
      submenu: [
        {
          label: i18n.t("menu.app.about"),
          click: showAboutDialog,
        },
        { type: "separator" },
        {
          label: i18n.t("menu.language.label"),
          submenu: [
            {
              label: i18n.t("menu.language.english"),
              type: "radio",
              checked: i18n.getLanguage() === "en",
              click: () => switchLanguage("en"),
            },
            {
              label: i18n.t("menu.language.catalan"),
              type: "radio",
              checked: i18n.getLanguage() === "ca",
              click: () => switchLanguage("ca"),
            },
          ],
        },
        { type: "separator" },
        { label: i18n.t("menu.app.quit"), role: "quit" },
      ],
    },
    {
      label: i18n.t("menu.file.label"),
      submenu: [
        {
          label: i18n.t("menu.file.open"),
          accelerator: "CmdOrCtrl+O",
          click: async () => {
            try {
              const currentWindow = getActiveWindow();
              if (!currentWindow) return;

              const { canceled, filePaths } = await dialog.showOpenDialog(
                currentWindow,
                {
                  title: i18n.t("dialogs.open.title"),
                  properties: ["openFile"],
                  filters: [
                    {
                      name: i18n.t("dialogs.open.markdownFiles"),
                      extensions: ["md"],
                    },
                    {
                      name: i18n.t("dialogs.open.textFiles"),
                      extensions: ["txt"],
                    },
                  ],
                },
              );

              if (!canceled && filePaths.length > 0) {
                const filePath = filePaths[0];
                const content = fs.readFileSync(filePaths[0], "utf-8");

                currentFilePath = filePath;
                updateTitle();

                currentWindow.webContents.send("file-opened", content);
              }
            } catch (err) {
              console.error("Open error:", err);
            }
          },
        },
        {
          label: i18n.t("menu.file.save"),
          accelerator: "CmdOrCtrl+S",
          click: async () => {
            try {
              const currentWindow = getActiveWindow();
              if (!currentWindow) return;

              const content = await currentWindow.webContents.executeJavaScript(
                "window.getEditorContent()",
              );

              if (!currentFilePath) {
                return saveAs(currentWindow, content);
              }

              fs.writeFileSync(currentFilePath, content);
            } catch (err) {
              console.error("Save error:", err);
            }
          },
        },
        {
          label: i18n.t("menu.file.saveAs"),
          accelerator: "CmdOrCtrl+Shift+S",
          click: async () => {
            try {
              const currentWindow = getActiveWindow();
              if (!currentWindow) return;

              const content = await currentWindow.webContents.executeJavaScript(
                "window.getEditorContent()",
              );

              await saveAs(currentWindow, content);
            } catch (err) {
              console.error("Save As error:", err);
            }
          },
        },
      ],
    },
    {
      label: i18n.t("menu.edit.label"),
      submenu: [
        { label: i18n.t("menu.edit.undo"), role: "undo" },
        { label: i18n.t("menu.edit.redo"), role: "redo" },
        { type: "separator" },
        { label: i18n.t("menu.edit.selectAll"), role: "selectAll" },
        { label: i18n.t("menu.edit.cut"), role: "cut" },
        { label: i18n.t("menu.edit.copy"), role: "copy" },
        { label: i18n.t("menu.edit.paste"), role: "paste" },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

async function saveAs(window, content) {
  const { canceled, filePath } = await dialog.showSaveDialog(window, {
    title: i18n.t("dialogs.save.title"),
    filters: [
      { name: i18n.t("dialogs.save.markdownFiles"), extensions: ["md"] },
      { name: i18n.t("dialogs.save.textFiles"), extensions: ["txt"] },
    ],
    defaultExtension: "md",
  });

  if (!canceled && filePath) {
    fs.writeFileSync(filePath, content);
    currentFilePath = filePath; // 👈 update tracking
    updateTitle();
  }
}

app.whenReady().then(createWindow);
