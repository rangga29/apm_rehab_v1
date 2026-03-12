import { app, ipcMain, BrowserWindow, screen } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
process.env.DIST = path.join(__dirname$1, "../dist");
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, "../public");
let win = null;
const PRINTER_CONFIG = {
  receipt: {
    name: process.env.RECEIPT_PRINTER || "Thermal Printer",
    width: 58,
    // 58mm thermal paper
    silent: true
  },
  sticker: {
    name: process.env.STICKER_PRINTER || "Label Printer",
    width: 50,
    // 50mm label
    silent: true
  }
};
function createWindow() {
  console.log("Creating window...");
  console.log("DIST:", process.env.DIST);
  console.log("VITE_PUBLIC:", process.env.VITE_PUBLIC);
  console.log("__dirname:", __dirname$1);
  console.log("isPackaged:", app.isPackaged);
  win = new BrowserWindow({
    width: 1920,
    height: 1080,
    frame: false,
    // Remove window frame for kiosk mode
    fullscreen: true,
    // Start in fullscreen
    kiosk: true,
    // Enable kiosk mode
    webPreferences: {
      preload: path.join(__dirname$1, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      // Enable camera access
      enableRemoteModule: false
    }
  });
  console.log("Window created successfully");
  console.log("Window bounds:", win.getBounds());
  win.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    console.log("Permission request:", permission);
    if (permission === "media" || permission === "video" || permission === "audio") {
      callback(true);
      console.log("✅ Permission granted:", permission);
    } else {
      callback(false);
      console.log("❌ Permission denied:", permission);
    }
  });
  win.webContents.session.setDevicePermissionHandler((details) => {
    console.log("Device permission request:", details);
    if (details.deviceType === "camera" || details.deviceType === "audio") {
      return true;
    }
    return false;
  });
  win.webContents.on("did-finish-load", () => {
    console.log("Page finished loading");
    win?.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  win.webContents.on("did-fail-load", (event, errorCode, errorDescription, validatedURL) => {
    console.error("Page load failed:", errorCode, errorDescription, validatedURL);
  });
  win.webContents.on("did-finish-load", () => {
    if (!process.env.VITE_DEV_SERVER_URL) {
      win.webContents.openDevTools();
    }
  });
  if (process.env.VITE_DEV_SERVER_URL) {
    console.log("Loading dev server:", process.env.VITE_DEV_SERVER_URL);
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    const indexPath = path.join(process.env.DIST, "index.html");
    console.log("Loading production build:", indexPath);
    win.loadFile(indexPath).then(() => {
      console.log("Production build loaded successfully");
    }).catch((err) => {
      console.error("Failed to load production build:", err);
    });
  }
}
ipcMain.handle("get-printers", async () => {
  const printers = win.webContents.getPrinters();
  return printers.map((p) => ({
    name: p.name,
    displayName: p.displayName,
    isDefault: p.isDefault,
    options: p.options
  }));
});
ipcMain.handle("print-receipt", async (event, content) => {
  try {
    const options = {
      silent: true,
      printBackground: true,
      deviceName: PRINTER_CONFIG.receipt.name,
      pageSize: { width: 58 * 1e3, height: content.length * 50 }
      // Approximate height
    };
    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });
    const receiptHTML = generateReceiptHTML(content);
    await printWindow.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(receiptHTML));
    return new Promise((resolve, reject) => {
      printWindow.webContents.on("did-finish-load", () => {
        printWindow.webContents.print(options, (success) => {
          printWindow.close();
          if (success) {
            resolve({ success: true });
          } else {
            reject(new Error("Print failed"));
          }
        });
      });
    });
  } catch (error) {
    console.error("Print receipt error:", error);
    throw error;
  }
});
ipcMain.handle("print-sticker", async (event, content) => {
  try {
    const options = {
      silent: true,
      printBackground: true,
      deviceName: PRINTER_CONFIG.sticker.name,
      pageSize: { width: 50 * 1e3, height: 30 * 1e3 }
      // 50mm x 30mm label
    };
    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });
    const stickerHTML = generateStickerHTML(content);
    await printWindow.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(stickerHTML));
    return new Promise((resolve, reject) => {
      printWindow.webContents.on("did-finish-load", () => {
        printWindow.webContents.print(options, (success) => {
          printWindow.close();
          if (success) {
            resolve({ success: true });
          } else {
            reject(new Error("Print failed"));
          }
        });
      });
    });
  } catch (error) {
    console.error("Print sticker error:", error);
    throw error;
  }
});
ipcMain.handle("request-camera-access", async () => {
  return true;
});
ipcMain.handle("save-videos-config", async (event, videos) => {
  const fs = await import("fs");
  const path2 = await import("path");
  try {
    let videosJsonPath;
    if (app.isPackaged) {
      videosJsonPath = path2.join(process.resourcesPath, "app", "dist", "ads", "videos.json");
    } else {
      videosJsonPath = path2.join(__dirname$1, "../public/ads/videos.json");
    }
    const config = { videos };
    fs.writeFileSync(videosJsonPath, JSON.stringify(config, null, 2), "utf8");
    console.log("✅ Saved videos config:", videosJsonPath);
    console.log("📹 Videos:", videos);
    return { success: true, path: videosJsonPath };
  } catch (error) {
    console.error("Error saving videos config:", error);
    return { success: false, error: error.message };
  }
});
ipcMain.handle("get-videos-config", async () => {
  const fs = await import("fs");
  const path2 = await import("path");
  try {
    let videosJsonPath;
    if (app.isPackaged) {
      videosJsonPath = path2.join(process.resourcesPath, "app", "dist", "ads", "videos.json");
    } else {
      videosJsonPath = path2.join(__dirname$1, "../public/ads/videos.json");
    }
    const data = fs.readFileSync(videosJsonPath, "utf8");
    const config = JSON.parse(data);
    return { success: true, videos: config.videos || [] };
  } catch (error) {
    console.error("Error loading videos config:", error);
    return { success: false, videos: [] };
  }
});
ipcMain.handle("get-displays", async () => {
  try {
    const displays = screen.getAllDisplays();
    console.log("🖥️ Found displays:", displays.length);
    return displays.map((display, index) => ({
      id: index,
      name: display.label || `Monitor ${index + 1}`,
      isPrimary: display === screen.getPrimaryDisplay(),
      bounds: display.bounds,
      workArea: display.workArea,
      size: {
        width: display.bounds.width,
        height: display.bounds.height
      },
      position: {
        x: display.bounds.x,
        y: display.bounds.y
      }
    }));
  } catch (error) {
    console.error("Error getting displays:", error);
    return [];
  }
});
ipcMain.handle("move-to-display", async (event, displayId) => {
  try {
    const displays = screen.getAllDisplays();
    if (displayId < 0 || displayId >= displays.length) {
      return { success: false, error: "Invalid display ID" };
    }
    const targetDisplay = displays[displayId];
    const windowBounds = win.getBounds();
    const centerX = targetDisplay.bounds.x + targetDisplay.bounds.width / 2 - windowBounds.width / 2;
    const centerY = targetDisplay.bounds.y + targetDisplay.bounds.height / 2 - windowBounds.height / 2;
    win.setPosition(Math.floor(centerX), Math.floor(centerY));
    win.setFullScreen(true);
    console.log(`✅ Moved window to display ${displayId}: ${targetDisplay.label || "Monitor " + (displayId + 1)}`);
    return { success: true, display: displayId };
  } catch (error) {
    console.error("Error moving window:", error);
    return { success: false, error: error.message };
  }
});
ipcMain.handle("get-current-display", async () => {
  try {
    const currentDisplay = screen.getDisplayNearestPoint(win.getBounds());
    const allDisplays = screen.getAllDisplays();
    const currentIndex = allDisplays.findIndex((d) => d.id === currentDisplay.id);
    return {
      success: true,
      display: {
        id: currentIndex >= 0 ? currentIndex : 0,
        name: currentDisplay.label || `Monitor ${currentIndex + 1}`,
        isPrimary: currentDisplay === screen.getPrimaryDisplay(),
        bounds: currentDisplay.bounds,
        size: {
          width: currentDisplay.bounds.width,
          height: currentDisplay.bounds.height
        }
      }
    };
  } catch (error) {
    console.error("Error getting current display:", error);
    return { success: false, error: error.message };
  }
});
function generateReceiptHTML(data) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Courier New', monospace;
          font-size: 12px;
          width: 58mm;
          padding: 5mm;
        }
        .header {
          text-align: center;
          border-bottom: 1px dashed #000;
          padding-bottom: 5px;
          margin-bottom: 10px;
        }
        .header h1 {
          font-size: 16px;
          margin-bottom: 5px;
        }
        .content {
          margin: 10px 0;
        }
        .row {
          display: flex;
          justify-content: space-between;
          margin: 5px 0;
        }
        .label {
          font-weight: bold;
        }
        .registration-code {
          text-align: center;
          font-size: 18px;
          font-weight: bold;
          border: 2px solid #000;
          padding: 10px;
          margin: 15px 0;
        }
        .footer {
          text-align: center;
          border-top: 1px dashed #000;
          padding-top: 5px;
          margin-top: 15px;
          font-size: 10px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>APM REHAB</h1>
        <p>Proof of Registration</p>
      </div>

      <div class="content">
        <div class="row">
          <span class="label">Date:</span>
          <span>${data.date}</span>
        </div>
        <div class="row">
          <span class="label">Time:</span>
          <span>${data.time}</span>
        </div>
        <div class="row">
          <span class="label">Patient:</span>
          <span>${data.patientName}</span>
        </div>
        <div class="row">
          <span class="label">Appt Code:</span>
          <span>${data.appointmentCode}</span>
        </div>
        <div class="row">
          <span class="label">Department:</span>
          <span>${data.department}</span>
        </div>
      </div>

      <div class="registration-code">
        ${data.registrationCode}
      </div>

      <div class="footer">
        <p>Please keep this receipt</p>
        <p>as proof of registration</p>
      </div>
    </body>
    </html>
  `;
}
function generateStickerHTML(data) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: Arial, sans-serif;
          width: 50mm;
          height: 30mm;
          padding: 3mm;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
        }
        .sticker-header {
          font-size: 8px;
          font-weight: bold;
          margin-bottom: 2mm;
        }
        .patient-name {
          font-size: 12px;
          font-weight: bold;
          margin-bottom: 2mm;
        }
        .reg-code {
          font-size: 14px;
          font-weight: bold;
          border: 2px solid #000;
          padding: 2mm;
          margin: 2mm 0;
        }
        .sticker-footer {
          font-size: 7px;
          margin-top: 2mm;
        }
      </style>
    </head>
    <body>
      <div class="sticker-header">APM REHAB</div>
      <div class="patient-name">${data.patientName}</div>
      <div class="reg-code">${data.registrationCode}</div>
      <div class="sticker-footer">${data.date} - ${data.department}</div>
    </body>
    </html>
  `;
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
ipcMain.on("window-minimize", () => {
  if (win) {
    win.minimize();
  }
});
ipcMain.on("window-maximize", () => {
  if (win) {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  }
});
ipcMain.on("window-close", () => {
  if (win) {
    win.close();
  }
});
app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
