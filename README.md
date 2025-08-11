
# Lux

This Program gets color data using modified "dynamic-theme" file then changes Windows' theme color by changing Regedit value.

### DISCLAIMER : This program -as explained above- works by editing Regedit values. Use with discretion only. 

## Features

- Changing color by music's album cover.
- Setting to toggle start on startup.
- Visible UI using system tray.
- Can hold app logs.
- Color changing animation. (to be honest it's default from Windows)
- Around 100mb of ram usage.

## Requirements

- 'default-dynamic.js' file. Obtained via either: building or through Powershell.

### Through Powershell

To obtain via Powershell, you should start Powershell with USER PRIVILEGES. This is important.

```
Invoke-WebRequest -UseBasicParsing "https://raw.githubusercontent.com/JulienMaille/spicetify-dynamic-theme/master/install.ps1" | Invoke-Expression
```
### Building

For building the file yourself, visit https://github.com/JulienMaille/spicetify-dynamic-theme

## Installation (.exe Preferred)

- Install the setup program from releases and follow the instructions.

- Replace the "default-dynamic.js" from releases or add the following commands to the original file:

Press ```CTRL + F``` and search for ```function updateColors(textColHex) ```

And paste the following command before that function.

```js
function sendColorToWindows(hex) {
	const cleanHex = hex.replace("#", "");
	fetch(`http://127.0.0.1:28546/setcolor?hex=${cleanHex}`).catch(() => {});
}

```
After this proccess add the following line to the end of the this function ```function updateColors(textColHex) ```:

```js
sendColorToWindows(textColHex);
```

e.g:

```js
function updateColors(textColHex) {
	//rest of the function...
	sendColorToWindows(textColHex);
}
```

Now you're ready to use it. Start the program and use it. Enjoy :)
    
## Installation (via Building the program)

- Install the source code from releases or directly from the main page.

- At the folder run the CMD and type:

```shell
npm install
```

- Install the [NW.js](https://nwjs.io/downloads/) files from the original site and paste all of the NW.js files in to the project folder.

- I customized the nw.exe using [Resource Hacker](https://www.angusj.com/resourcehacker/) you can use that program too.

- If you are planning to use this program locally you can use it as is. However if you're planning to package and redistribute, personally I've used the [Inno Setup](https://jrsoftware.org/isdl.php) but you can use programs like [Enigma Virtual Box](https://www.enigmaprotector.com/en/aboutvb.html)

- Now you have build the program from source code. Enjoy:)

## FAQ

#### Is it going to steal my data - Why is it connecting to a server?

Yep it's 100% safe. This program creates a localhost server which is a local server only running in your PC, which means I don't have access to it. You can copy and paste the code to AI and ask if this program is safe.

#### Is it going to destroy my PC?

Normally no. However this program plays with regedit values so I can't say it's 100% safe BUT in normal conditions I assume you will be fine. 


## License

[Custom APACHE 2.0](https://github.com/YCHstudio/Spicetify-Dynamic-Windows-Theme/blob/main/LICENSE)


## Authors

- [@YCHvideo](https://github.com/YCHstudio)
- [@weroxima](https://github.com/weroxima)
- [JulienMaille](https://github.com/JulienMaille) for the 'default-dynamic.js' and the installation guide for it.

