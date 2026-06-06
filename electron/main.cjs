// Electron main process — wraps the web game as a desktop app (the bridge to a
// Steam build). Loads index.html directly; everything is local (Three.js is
// vendored in /vendor), so it runs fully offline.

const { app, BrowserWindow } = require("electron");
const path = require("path");

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: "#0b0f14",
    title: "Mutation Lab",
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true },
  });
  win.removeMenu();
  win.loadFile(path.join(__dirname, "..", "index.html"));
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
