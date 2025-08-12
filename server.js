// server.js
// Simple HTTP server that accepts /setcolor?hex=#RRGGBB requests
// and applies Windows accent color via registry modifications.
// Uses direct `reg add` commands (no winreg) and calls UpdatePerUserSystemParameters.

const http = require("http");
const url = require("url");
const { exec } = require("child_process");

const PORT = 28546;

/**
 * Convert hex like "#RRGGBB" to pieces used for registry values.
 * Returns:
 *  - dwordValue: 32-bit integer for many AccentColor entries
 *  - palette: hex string for AccentPalette (REG_BINARY format, concatenated)
 *  - raw: {red, green, blue}
 */
function convertHexToAccentRegistryData(hex) {
  if (!hex) throw new Error("No hex provided");
  if (hex.startsWith("#")) hex = hex.slice(1);
  if (hex.length !== 6) throw new Error("Invalid color format. Use #RRGGBB");

  const r = hex.slice(0,2);
  const g = hex.slice(2,4);
  const b = hex.slice(4,6);
  const a = "00";

  // taskbar / palette format: RRGGBBAA repeated
  const taskbarFormat = `${r}${g}${b}${a}`.toUpperCase();
  // many registry DWORD fields expect AABBGGRR format (we used this pattern before)
  const windowsFormat = `${a}${b}${g}${r}`.toUpperCase();
  const dwordValue = parseInt(windowsFormat, 16);
  const palette = Array(8).fill(taskbarFormat).join("");

  return {
    dwordValue,
    palette,
    raw: {
      red: parseInt(r, 16),
      green: parseInt(g, 16),
      blue: parseInt(b, 16)
    }
  };
}

/**
 * Apply a set of registry writes to change Windows accent color.
 * No explorer.exe restart is performed — UpdatePerUserSystemParameters should apply changes.
 */
function setWindowsAccentColor(hexColor, callback) {
  let data;
  try {
    data = convertHexToAccentRegistryData(hexColor);
  } catch (err) {
    return callback(err);
  }

  // We include multiple keys that different Windows builds may use.
  // Keep commands minimal but comprehensive.
  const commands = [
    // Ensure Windows uses accent color for title bars / UI
    `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize" /v "ColorPrevalence" /t REG_DWORD /d 1 /f`,

    // Primary accent color (DWORD, many UIs use this)
    `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize" /v "AccentColor" /t REG_DWORD /d ${data.dwordValue} /f`,

    // Older/alternate keys in Explorer / Accent subkey
    `reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Accent" /v "AccentPalette" /t REG_BINARY /d ${data.palette} /f`,
    `reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Accent" /v "AccentColor" /t REG_DWORD /d ${data.dwordValue} /f`,
    `reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Accent" /v "AccentColorMenu" /t REG_DWORD /d ${data.dwordValue} /f`,
    `reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Accent" /v "StartColorMenu" /t REG_DWORD /d ${data.dwordValue} /f`,

    // DWM colorization (window frames, some builds)
    `reg add "HKCU\\Software\\Microsoft\\Windows\\DWM" /v "ColorizationColor" /t REG_DWORD /d ${data.dwordValue} /f`,

    // Control Panel colors used by some UI elements
    `reg add "HKCU\\Control Panel\\Colors" /v "Hilight" /d "${data.raw.red} ${data.raw.green} ${data.raw.blue}" /f`,
    `reg add "HKCU\\Control Panel\\Colors" /v "HotTrackingColor" /d "${data.raw.red} ${data.raw.green} ${data.raw.blue}" /f`,
    `reg add "HKCU\\Control Panel\\Colors" /v "AccentColor" /d "${data.raw.red} ${data.raw.green} ${data.raw.blue}" /f`,

    // Force window parameters update for current user (no process kill)
    `RUNDLL32.EXE user32.dll,UpdatePerUserSystemParameters ,1 ,True`
  ];

  const fullCmd = commands.join(" & ");

  exec(fullCmd, { windowsHide: true }, (error, stdout, stderr) => {
    if (error) {
      console.error("[SERVER] reg error:", error.message || error);
      return callback(error);
    }
    // Some stderr output is benign; we don't treat it as fatal
    if (stderr && stderr.trim()) console.warn("[SERVER] reg stderr:", stderr.trim());
    if (stdout && stdout.trim()) console.log("[SERVER] reg stdout:", stdout.trim());

    // Notify parent (if running under fork) that color applied
    if (process.send) {
      try {
        process.send({ type: "colorApplied", hex: hexColor.replace(/^#/, "") });
      } catch (e) {
        // ignore send errors
      }
    }

    return callback(null);
  });
}

// HTTP server
const server = http.createServer((req, res) => {
  // Simple logging to console (NW.js parent captures child logs if debug)
  console.log(`[SERVER] ${req.method} ${req.url}`);

  const parsed = url.parse(req.url, true);

  if (parsed.pathname === "/setcolor" && parsed.query && parsed.query.hex) {
    const hex = parsed.query.hex;
    setWindowsAccentColor(hex, (err) => {
      if (err) {
        res.writeHead(500, { "Content-Type": "text/plain" });
        return res.end("Error applying color\n");
      } else {
        res.writeHead(200, { "Content-Type": "text/plain" });
        return res.end("Color applied\n");
      }
    });
  } else {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Invalid endpoint. Use /setcolor?hex=#RRGGBB\n");
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Spicetify server listening on http://127.0.0.1:${PORT}`);
});
