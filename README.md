# PicoSchoolStream

Desktop viewer for live casts from many PICO 4 headsets at once (Electron + React + Vite).

Author: INickF

## Scripts
- `npm run dev`  – Vite dev server + Electron window with hot reload
- `npm run build` – build the React app into `dist/`
- `npm start`    – run Electron against the built `dist/`
- `npm run dist` – build and package the app for the current OS into `release/`

Build each OS's package on that OS: electron-builder can't reliably package Linux from Windows or the other way
round. Don't copy `node_modules` between machines either, the Electron binary in it is per-OS; run `npm install` on each.

## Windows (10 / 11)

### Requirements
- Node.js 20 LTS or newer: installer from https://nodejs.org, or `winget install OpenJS.NodeJS.LTS`
- Git (optional, to clone): `winget install Git.Git`

### Launch
```powershell
git clone <repo-url> PicoSchoolStream
cd PicoSchoolStream
npm install
npm run dev                      # development window with hot reload
# or run the built app without packaging:
npm run build; npm start
```

### Build an installer
```powershell
npm run dist
```
Gives `release\PicoSchoolStream Setup <version>.exe` (NSIS installer) and the unpacked app in `release\win-unpacked\`.
The installer isn't code-signed, so SmartScreen warns on first run: **More info → Run anyway**.

### Firewall
On the first APK install Windows Firewall asks to allow PicoSchoolStream: allow it on **private** networks.
If you dismissed it, allow TCP port 3351 (run as administrator):
```powershell
New-NetFirewallRule -DisplayName "PicoSchoolStream APK" -Direction Inbound -Protocol TCP -LocalPort 3351 -Profile Private -Action Allow
```

## Linux (Ubuntu / Debian / Mint, Fedora, Arch)

### Requirements
Node.js 20+ and git. Distro repos often ship an old Node, so [nvm](https://github.com/nvm-sh/nvm) is the simplest way:
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
# open a new terminal, then:
nvm install --lts
```
Libraries Electron needs (usually already there on a desktop install):

| Distro | Command |
| --- | --- |
| Ubuntu / Debian / Mint | `sudo apt install git libnss3 libgtk-3-0 libxss1 libasound2 libgbm1` (Ubuntu 24.04+: `libasound2t64`) |
| Fedora | `sudo dnf install git nss gtk3 libXScrnSaver alsa-lib mesa-libgbm rpm-build` |
| Arch / Manjaro | `sudo pacman -S git nss gtk3 libxss alsa-lib mesa` |

### Launch
```bash
git clone <repo-url> PicoSchoolStream
cd PicoSchoolStream
npm install
npm run dev                      # development window with hot reload
# or run the built app without packaging:
npm run build && npm start
```
If the window doesn't open with a `chrome-sandbox` error, run once:
`sudo chown root node_modules/electron/dist/chrome-sandbox && sudo chmod 4755 node_modules/electron/dist/chrome-sandbox`.

### Build packages
```bash
npm run dist                     # AppImage + .deb (the targets in package.json)
npx electron-builder --linux rpm # Fedora / openSUSE package, after npm run build
```
Output in `release/`:
- **AppImage**, works on any distro: `chmod +x release/PicoSchoolStream-*.AppImage && ./release/PicoSchoolStream-*.AppImage`
  (needs FUSE 2: `sudo apt install libfuse2` / `libfuse2t64` on Ubuntu 24.04+; `sudo dnf install fuse-libs` on Fedora)
- **.deb** (Ubuntu / Debian / Mint): `sudo apt install ./release/picoschoolstream_*_amd64.deb`
- **.rpm** (Fedora): `sudo dnf install ./release/picoschoolstream-*.x86_64.rpm`

The `.deb` / `.rpm` add PicoSchoolStream to the app menu.

### Firewall
Linux doesn't ask, so open TCP port 3351 yourself, otherwise headsets can't download APKs:
```bash
sudo ufw allow 3351/tcp                                                     # Ubuntu / Mint (ufw)
sudo firewall-cmd --permanent --add-port=3351/tcp && sudo firewall-cmd --reload  # Fedora (firewalld)
```

### Video glitches
If streams flicker or stay black with some GPU drivers, start with `--disable-gpu`
(e.g. `./PicoSchoolStream-*.AppImage --disable-gpu`) to check whether GPU acceleration is the cause.

## Troubleshooting
> If Electron starts as plain Node (`ipcMain` is undefined), the `ELECTRON_RUN_AS_NODE`
> environment variable is set in your shell — unset it before running
> (`Remove-Item Env:ELECTRON_RUN_AS_NODE` in PowerShell, `unset ELECTRON_RUN_AS_NODE` in bash).

## Usage
- On first launch 10 headsets are added: `192.168.0.101` … `192.168.0.110`.
- **Enable** on a tile starts its stream; **Enable all / Disable all** in the top bar.
- `⋮` on a tile: Rename, Change IP, Force restart (drops another viewer), Delete.
- Click a live tile to open it in the whole window: Quality (Standard / Smooth), Ratio (16:9 / 1:1),
  mute + volume, fullscreen (F11). `Esc` goes back, `M` toggles mute.
- Top bar: language (EN / RU, defaults to the Windows language) and tile size (small / medium / large).
- The headset list and per-headset settings are saved to `%APPDATA%/picoschoolstream/headsets.json`
  (`~/.config/picoschoolstream/headsets.json` on Linux).
- The headset's browser casting must be active (the same state in which `http://<ip>:3342/cast`
  works in a normal browser). Each headset accepts one
  viewer at a time; if a browser tab is already watching it, the tile shows *Busy*.

## Finding headsets
**Find headsets** in the top bar (also on the empty screen) scans every local /24 subnet of this PC
(`electron/scanner.js`, about 10 s). An address counts as a headset if it answers on the agent port 3350
or PICO's cast server on 3342; HTTP probes are used instead of ping because Windows and the headsets often drop ICMP.
New headsets are preselected, already added ones are marked, and selected ones are added as *Headset NN*.
A VPN that routes the local subnet through its tunnel hides the headsets from the scan.

## App control (PicoSchoolAgent)
Launching and closing apps needs the agent from `D:\PicoSchoolAgent` installed on each headset (see its README).
- Each tile shows the headset's battery and current app (or *No agent*).
- `⋮` on a tile: **Apps…** (pick an app to launch on that headset) and **Close current app**.
- Top bar **Apps**: launch an app on every headset whose agent is online, or **Close running apps** on all of them.
- Agents are polled every 4 s on `http://<ip>:3350` through the main process (`electron/agentApi.js`).

### Installing and deleting apps
- **Apps → Install APK…** picks an `.apk` on this PC and installs it on that headset, or on every headset with an online agent
  when opened from the top bar. A newer version of an installed app is installed as an update.
- The trash button on an app row deletes that app (press it twice: the second press confirms). From the top bar it deletes
  the app from every headset that has it. System apps and the agent itself can't be deleted.
- Progress (download %, installing, done or the error) shows in the dialog and on each tile. Agents with a running job are
  polled every second.
- The headsets download the file from this PC (`electron/apkServer.js`). Each headset gets its own download link, which:
  - is served only on this PC's address in the headsets' network (not on a VPN or other networks), on port 3351 (a random one if 3351 is taken).
    For headsets outside this PC's networks (behind a router, over a VPN), tick **Allow installing on headsets on other
    networks** in the Apps dialog: such a headset then gets the PC address the OS routes to it;
  - works only for that headset's IP address, only once, and only for 2 minutes;
  - serves only the file you picked, nothing else on the PC.

  The server closes as soon as its links are used or expired. **Windows Firewall asks once to allow PicoSchoolStream**;
  allow it on private networks only, otherwise installs fail with "the headset could not download the file".
  On Linux nothing asks: open TCP 3351 yourself (see [Firewall](#firewall-1)).
- No one has to wear the headset: the agent presses Install / OK in Android's prompt itself (agent 1.5+, see its README).
  If that ever fails, the tile shows *Confirm on the headset* and the prompt waits for the wearer.
- Single APK files only; games that need a separate OBB data file aren't supported yet.

## Protocol (PICO cast server, `http://<ip>:3342`)
| Request | Purpose |
|---|---|
| `POST /api/cast_status` | Probe / keep-alive every 3s. `0` free, `1` continue, `-1` interactive, `-2` someone is viewing, `-3` error |
| `POST /api/cast_initiative` | Start a cast session (`deviceName` from status) |
| `GET /test.flv` | Live HTTP-FLV stream (played with mpegts.js) |
| `POST /api/cast_succeeded` / `cast_failed` | Report first frame / stream end |
| `POST /api/cast_termination` | Stop the session (also sent for all live headsets on app exit) |

Quality and ratio are client-side only: quality sets the live buffer target (Standard 0.2s, Smooth 0.5s).
API calls go through the Electron main process (`electron/picoApi.js`) because the headset sends no CORS
headers for them.
