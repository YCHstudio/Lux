const http = require("http");
const url = require("url");
const { exec } = require("child_process");

const PORT = 28546;

function convertHexToAccentRegistryData(hex) {
	if (hex.startsWith("#")) hex = hex.slice(1);

	if (hex.length !== 6) {
		throw new Error("Invalid color code. Please enter in #RRGGBB format.");
	}

	const red = hex.slice(0, 2);
	const green = hex.slice(2, 4);
	const blue = hex.slice(4, 6);
	const alpha = "00";

	/* Turning HEX to Windows Accent Color format
	Windows Task Bar Color format is RRGGBBAA (AA should be 00 for no transparency (not just for transparency it also brokes the color etc.its complicated)) */
	const taskbarFormat = `${red}${green}${blue}${alpha}`.toUpperCase();
	const windowsFormat = `${alpha}${blue}${green}${red}`.toUpperCase();
	const dwordValue = parseInt(windowsFormat, 16);

	const palette = Array(8).fill(taskbarFormat).join("");

	return {
		dwordValue,
		palette,
		raw: {
			red: parseInt(red, 16),
			green: parseInt(green, 16),
			blue: parseInt(blue, 16),
		},
	};
}

// This function sets the Windows accent color using the registry
// It takes a hex color code and a callback function
function setWindowsAccentColor(hexColor, callback) {
	let result;

	try {
		result = convertHexToAccentRegistryData(hexColor);
	} catch (e) {
		callback(e);
		return;
	}

	const commands = [
		`reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize" /v "ColorPrevalence" /t REG_DWORD /d 1 /f`,
		`reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize" /v "AccentColor" /t REG_DWORD /d ${result.dwordValue} /f`,
		`reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize" /v "SpecialColor" /t REG_DWORD /d ${result.dwordValue} /f`,

		`reg add "HKCU\\Control Panel\\Colors" /v "Hilight" /d "${result.raw.red} ${result.raw.green} ${result.raw.blue}" /f`,
		`reg add "HKCU\\Control Panel\\Colors" /v "HotTrackingColor" /d "${result.raw.red} ${result.raw.green} ${result.raw.blue}" /f`,
		`reg add "HKCU\\Control Panel\\Colors" /v "AccentColor" /d "${result.raw.red} ${result.raw.green} ${result.raw.blue}" /f`,

		`reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Accent" /v "AccentPalette" /t REG_BINARY /d ${result.palette} /f`,
		`reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Accent" /v "AccentColor" /t REG_DWORD /d ${result.dwordValue} /f`,
		`reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Accent" /v "AccentColorMenu" /t REG_DWORD /d ${result.dwordValue} /f`,
		`reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Accent" /v "StartColorMenu" /t REG_DWORD /d ${result.dwordValue} /f`,

		`RUNDLL32.EXE user32.dll,UpdatePerUserSystemParameters ,1 ,True`,
	];
	const commandString = commands.join(" & ");

	exec(commandString, (error, stdout, stderr) => {
		if (error) {
			console.error(`[SERVER] ERROR: ${error.message}`);
			callback(error);
			return;
		}
		if (stderr) {
			console.warn(`[SERVER] WARNING: ${stderr}`);
		}
		if (stdout) {
			console.log(`[SERVER] SUCCESS: ${stdout}`);
		}
		callback(null);
	});
}

// HTTP server to handle requests
const server = http.createServer((req, res) => {
	console.log(`[SERVER] Coming request: ${req.method} ${req.url}`);

	res.setHeader("Access-Control-Allow-Origin", "*");
	res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

	if (req.method === "OPTIONS") {
		res.writeHead(204);
		res.end();
		return;
	}

	const parsedUrl = url.parse(req.url, true);

	if (parsedUrl.pathname === "/setcolor" && parsedUrl.query.hex) {
		const color = parsedUrl.query.hex;

		setWindowsAccentColor(color, (error) => {
			if (error) {
				res.writeHead(500, { "Content-Type": "text/plain" });
				res.end("There was an error when applying the colors.\n");
			} else {
				res.writeHead(200, { "Content-Type": "text/plain" });
				res.end("Color successfully applied.\n");
			}
		});
	} else {
		res.writeHead(404, { "Content-Type": "text/plain" });
		res.end("Invalid request. Example: /setcolor?hex=#RRGGBB\n");
	}
});

server.listen(PORT, "127.0.0.1", () => {
	console.log("--- Windows Accent Color Server ---");
	console.log(`Listening on: http://127.0.0.1:${PORT}`);
	console.log("------------------------------------");
});
