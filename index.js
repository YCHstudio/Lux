// nw-main.js
// NW.js main script: system tray, server control, debug toggle, auto-launch

// Import required modules for path handling, file system, child processes, and auto-launch functionality
const path = require("path");
const fs = require("fs");
const { fork } = require("child_process");
const AutoLaunch = require("auto-launch");

// Access the NW.js global object
const nw = globalThis.nw;
// Define the port number for the server
const PORT = 28546;
// Define the application name for auto-launch
const APP_NAME = "AccentTrayServer-NW";

// Declare variables for tray icon, server process, debug mode, and startup status
let tray = null;
let serverProcess = null;
let debugMode = true;
let isStartupEnabled = false;

// Configure auto-launch for the application
const autoLauncher = new AutoLaunch({ name: APP_NAME });
// Check if auto-launch is enabled and update the flag accordingly
autoLauncher.isEnabled().then(enabled => { isStartupEnabled = enabled; }).catch(() => {});

// Utility function for logging messages with timestamps
function log(message) {
  const ts = new Date().toISOString();
  const line = `${ts} ${message}\n`;
  if (debugMode) {
    console.log(line.trim());
    try {
      // Append log messages to debug.log in the current working directory
      fs.appendFileSync(path.join(process.cwd(), "debug.log"), line);
    } catch (e) {
      console.error("Unable to write debug.log:", e.message);
    }
  }
}

// Start the server as a child process
function startServer() {
  if (serverProcess) {
    log("Server already running.");
    return;
  }
  // Path to the server script
  const scriptPath = path.join(process.cwd(), "server.js");

  // Fork the server process, optionally silencing output if debugMode is enabled
  serverProcess = fork(scriptPath, [], {
    silent: !!debugMode,
    windowsHide: true
  });

  // Listen for messages from the server process and log them
  serverProcess.on("message", msg => log(`[SERVER MSG] ${JSON.stringify(msg)}`));
  // Handle server process exit event
  serverProcess.on("exit", (code, signal) => {
    log(`[Tray] Server exited with code ${code} signal ${signal}`);
    serverProcess = null;
    updateTrayMenu();
  });
  // Handle server process errors
  serverProcess.on("error", err => {
    log("[Tray] Server error: " + err.message);
    serverProcess = null;
    updateTrayMenu();
  });

  log("[Tray] Server started.");
  updateTrayMenu();
}

// Stop the running server process
function stopServer() {
  if (!serverProcess) {
    log("Server not running.");
    return;
  }
  try {
    // Attempt to kill the server process
    serverProcess.kill();
  } catch (e) {
    log("Error killing server: " + e.message);
  } finally {
    serverProcess = null;
    log("[Tray] Server stopped.");
    updateTrayMenu();
  }
}

// Toggle debug mode on or off, restart the server, and update the tray menu
function toggleDebug() {
  debugMode = !debugMode;
  log(`[Tray] Debug toggled: ${debugMode}`);
  stopServer();
  setTimeout(startServer, 200);
  updateTrayMenu();
}

// Toggle whether the app starts on system startup
function toggleStartup() {
  isStartupEnabled = !isStartupEnabled;
  if (isStartupEnabled) {
    autoLauncher.enable().catch(e => log("AutoLauncher enable error: " + e.message));
  } else {
    autoLauncher.disable().catch(e => log("AutoLauncher disable error: " + e.message));
  }
  updateTrayMenu();
}

// Build and update the system tray menu based on current state
function updateTrayMenu() {
  // Define menu items for debug toggle, startup toggle, server control, and exit
  const menuItems = [
    {
      label: debugMode ? "Disable Debug" : "Enable Debug",
      click: () => toggleDebug()
    },
    {
      label: isStartupEnabled ? "Disable Start On Startup" : "Enable Start On Startup",
      click: () => toggleStartup()
    },
    { type: "separator" },
    {
      label: serverProcess ? "Stop Server" : "Start Server",
      click: () => (serverProcess ? stopServer() : startServer())
    },
    { type: "separator" },
    {
      label: "Exit",
      click: () => {
        stopServer();
        nw.App.quit();
      }
    }
  ];

  // Create a new NW.js menu and add the defined items
  const menubar = new nw.Menu();
  menuItems.forEach(it => {
    if (it.type === "separator") {
      menubar.append(new nw.MenuItem({ type: "separator" }));
    } else {
      menubar.append(new nw.MenuItem({ label: it.label, click: it.click }));
    }
  });

  // Choose the tray icon based on whether the server is running
  const iconPath = path.join(process.cwd(), "assets", serverProcess ? "icon.png" : "icon-black.png");

  // Create the tray icon if it doesn't exist, otherwise update its icon and menu
  if (!tray) {
    tray = new nw.Tray({ title: "SpicetifyTheme", icon: iconPath });
  }
  tray.icon = iconPath;
  tray.menu = menubar;
}

// App entry point: log startup, initialize tray menu, and start the server
log("[Tray] App starting.");
updateTrayMenu();
startServer();
