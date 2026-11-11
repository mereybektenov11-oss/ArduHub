import {
  app,
  BrowserWindow,
  ipcMain,
  protocol,
  safeStorage,
  session,
  shell,
} from "electron";
import { join } from "node:path";
import { APP_ORIGIN, serveApp } from "./appProtocol";
import { isAllowedExternal } from "./external";
import { createSecureStore } from "./secureStore";

const devServer = process.env.ARDUHUB_DEV_SERVER_URL;
const rendererRoot = join(__dirname, "..", "renderer");

// Tests and parallel runs may point the app at a separate profile folder.
if (process.env.ARDUHUB_USER_DATA)
  app.setPath("userData", process.env.ARDUHUB_USER_DATA);

protocol.registerSchemesAsPrivileged([
  {
    scheme: "app",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: false,
    },
  },
]);

let store: ReturnType<typeof createSecureStore>;
const appUrl = devServer ?? `${APP_ORIGIN}/`;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    backgroundColor: "#0B1020",
    title: "ArduHub",
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, "preload.js"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      spellcheck: false,
    },
  });
  win.once("ready-to-show", () => win.show());
  // The renderer never opens windows or leaves the app page.
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  win.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(appUrl)) event.preventDefault();
  });
  void win.loadURL(appUrl);
}

app.whenReady().then(() => {
  protocol.handle("app", (request) => serveApp(rendererRoot, request));
  store = createSecureStore(join(app.getPath("userData"), "session.json"), {
    available: () => safeStorage.isAsyncEncryptionAvailable(),
    encrypt: (plain) => safeStorage.encryptStringAsync(plain),
    decrypt: async (data) =>
      (await safeStorage.decryptStringAsync(data)).result,
  });
  session.defaultSession.setPermissionRequestHandler((_wc, _perm, done) =>
    done(false),
  );
  // The YouTube embed refuses players without an http(s) referrer, and the
  // app page lives on app://. Present the site as the referrer, only for
  // YouTube requests.
  session.defaultSession.webRequest.onBeforeSendHeaders(
    {
      urls: ["https://www.youtube-nocookie.com/*", "https://www.youtube.com/*"],
    },
    (details, done) => {
      done({
        requestHeaders: {
          ...details.requestHeaders,
          Referer: "https://arduhub.vercel.app/",
        },
      });
    },
  );

  ipcMain.handle("store:get", (_e, key) => store.get(key));
  ipcMain.handle("store:set", (_e, key, value) => store.set(key, value));
  ipcMain.handle("store:remove", (_e, key) => store.remove(key));
  ipcMain.handle("store:persistent", () => store.isPersistent());
  ipcMain.handle("app:version", () => app.getVersion());
  ipcMain.handle("external:open", async (_e, url) => {
    if (!isAllowedExternal(url)) return false;
    await shell.openExternal(url);
    return true;
  });

  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
