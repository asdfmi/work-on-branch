import { app, BrowserWindow } from "electron";
import * as path from "path";
import { registerFsHandlers } from "./ipc/fs.js";
import { registerDocxHandlers } from "./ipc/docx.js";

registerFsHandlers();
registerDocxHandlers();

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1920,
    height: 1080,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  win.loadFile(path.join(__dirname, "renderer", "index.html"));
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  app.quit();
});
