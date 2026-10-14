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
