# PicoSchoolStream

Desktop viewer for live casts from many PICO 4 headsets at once (Electron + React + Vite).

## Setup
1. Install Node.js LTS (https://nodejs.org)
2. `npm install`

## Scripts
- `npm run dev`  – Vite dev server + Electron window with hot reload
- `npm run build` – build the React app into `dist/`
- `npm start`    – run Electron against the built `dist/`
- `npm run dist` – package an installer with electron-builder

> If Electron starts as plain Node (`ipcMain` is undefined), the `ELECTRON_RUN_AS_NODE`
> environment variable is set in your shell — unset it before running.

## Usage
- On first launch 10 headsets are added: `192.168.0.101` … `192.168.0.110`.
- **Enable** on a tile starts its stream; **Enable all / Disable all** in the top bar.
- `⋮` on a tile: Rename, Change IP, Force restart (drops another viewer), Delete.
- Click a live tile to open it in the whole window: Quality (Standard / Smooth), Ratio (16:9 / 1:1),
  mute + volume, fullscreen (F11). `Esc` goes back, `M` toggles mute.
- Top bar: language (EN / RU, defaults to the Windows language) and tile size (small / medium / large).
- The headset list and per-headset settings are saved to `%APPDATA%/picoschoolstream/headsets.json`.
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
