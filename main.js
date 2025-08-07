const { app, Tray, Menu } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const AutoLaunch = require("auto-launch");

const PORT = 28546;

let tray = null;
let serverProcess = null;
let isServerRunning = false;
let debugMode = false;

// Auto-launch configuration
// This will allow the application to start on system boot
const autoLauncher = new AutoLaunch({
    name: "AccentTrayServer",
});

// Check if the application is set to launch on startup
// and store the state in a variable
let isStartupEnabled = false;
autoLauncher.isEnabled().then((enabled) => (isStartupEnabled = enabled));

// Function to start the server
// This function will spawn a new Node.js process to run the server.js script
function startServer() {
    if (serverProcess) return;

    // Use the full path to the Node.js executable
    const nodePath = process.execPath;
    const scriptPath = path.join(__dirname, "server.js");

	// Spawn a new process to run the server script
    serverProcess = spawn(nodePath, [scriptPath], {
        detached: true,
        stdio: debugMode ? "inherit" : "ignore",
        windowsHide: true,
        shell: false // shell: false is recommended for security reasons
    });

    serverProcess.on('close', (code) => {
        console.log(`[Tray] Server process exited with code: ${code}`);
        serverProcess = null;
        isServerRunning = false;
        updateTrayMenu();
    });


    isServerRunning = true;
    updateTrayMenu();
    console.log("[Tray] Server is started.");
}

// Function to stop the server
// This function will kill the server process if it is running
function stopServer() {
    if (!serverProcess) return;

    try {
        // Use kill(); to kill the process
		// This will terminate the server process
        serverProcess.kill();
        serverProcess = null;
        isServerRunning = false;
        updateTrayMenu();
        console.log("[Tray] Server is stopped.");
    } catch (e) {
        console.error("[Tray] Error occurred while stopping the server:", e.message);
    }
}

// Function to toggle the auto-launch feature
function toggleStartup() {
    isStartupEnabled = !isStartupEnabled;
    if (isStartupEnabled) {
        autoLauncher.enable();
    } else {
        autoLauncher.disable();
    }
    updateTrayMenu();
}

function updateTrayMenu() {
    const menu = Menu.buildFromTemplate([
        {
            label: isServerRunning ? "🟥 Stop Server (not working)" : "🟩 Start Server (not working)",
            click: () => (isServerRunning ? stopServer() : startServer()),
        },
        {
            label: isStartupEnabled
                ? "🚫 Disable Start On Startup"
                : "✅ Enable Start On Startup",
            click: toggleStartup,
        },
        { type: "separator" },
        {
            label: "❌ Exit",
            click: () => {
                stopServer();
                app.quit();
            },
        },
    ]);
    tray.setContextMenu(menu);
}

// Function to set the Windows accent color
// This function will send a request to the server to set the accent color
const gotTheLock = app.requestSingleInstanceLock();

// If the application is already running, it will focus on the existing instance
// Otherwise, it will start the application and the server
if (!gotTheLock) {
    app.quit();
} else {
    app.on("second-instance", () => {
        console.log("Another instance of the application is being launched. Focusing on the existing instance.");
    });

    app.whenReady().then(() => {
        tray = new Tray(path.join(__dirname, "assets/icon.png"));
        tray.setToolTip("Spicetify Dynamic Windows Theme");
        updateTrayMenu();
        startServer();
    });
}