# PicoSchoolStream — Multi-headset PICO 4 cast viewer (Electron + React)

## Context
Teachers need to watch live casts from many PICO 4 headsets at once on one PC. Today each headset's cast is viewed separately in a browser at `http://<ip>:3342/cast`. We'll build a desktop app (existing Electron 33 + React 19 + Vite 6 scaffold in `D:\PicoSchoolStream`) that shows all headsets in a grid of live thumbnails, lets the user manage the headset list (persisted), and replicates the web client's features (quality, ratio, audio).

## Protocol (reverse-engineered from `192.168.0.108.har` + web bundle `index.a014310c.js`)
Base: `http://<ip>:3342`. All API calls are `POST`, `Content-Type: application/json`, body = client-info object:
`{userAgent, browser, browserVersion, osName, osVersion, deviceName, platform:"pc", clientHeight, clientWidth, isOnLine:true, language}` (+ extra fields below).
Response: `{code, message, data?:{app_id, device_name, sn}}`.

| Endpoint | When | Notes |
|---|---|---|
| `/api/cast_status` | probe + every 3s while playing | extra `timeInterval` = last RTT ms. Codes: `0 SUCCESS`, `1 CONTINUE`, `-1 INTERACTIVE`, `-2 ALREADY_CONNECT` ("somebody playing"), `-3 ERROR`. Returns `device_name`, `sn`. |
| `/api/cast_initiative` | start cast (after status is 0/1/-1) | `deviceName` = headset name from status. Codes: `0 SUCCESS`, `1 ERROR`, `-2 DEVICE_BUSY`. |
| `GET /test.flv` | right after initiative success | Live HTTP-FLV stream (`ACAO: *`). |
| `/api/cast_succeeded` | on first video PLAY | |
| `/api/cast_failed` | on stream ENDED | then re-check status |
| `/api/cast_termination` | user stops cast | |
| `/api/cast_track` | analytics only | **skip** |

Web client logic to mirror:
- While playing, poll status every 3s; if code is not `CONTINUE(1)` / `ALREADY_CONNECT(-2)` → destroy player, stream ended.
- On player ERROR/RETRY → poll status immediately.
- **Quality** is client-side only: buffer `preloadTime` — Standard (FAST) = **0.2s**, Smooth = **0.5s** (desktop values). Latency chase: if `bufferedEnd - currentTime > preloadTime` → `playbackRate = 1.1`, else `1`.
- **Ratio** 16:9 / 1:1 is a container aspect change (`object-fit: cover`), client-side only.
- **Audio**: mute/unmute (+ we add volume slider).
- POST responses lack CORS headers → **API calls go through Electron main process** (Node `fetch`). The FLV stream is CORS-open → renderer fetches it directly.

## Architecture

### Main process (`electron/`)
- `electron/main.js` — extend existing: dark `backgroundColor:#0e0f11`, hidden menu bar, min size 960×600; register IPC; on `before-quit` call `cast_termination` for every active headset (with ~1s cap) before exiting. Fullscreen toggle IPC (`win.setFullScreen`).
- `electron/picoApi.js` (new) — `post(ip, endpoint, extra)` using Node `fetch` + `AbortSignal.timeout(2500)`, sends the client-info body above (static UA string "PicoSchoolStream", platform `pc`). Returns `{ok, code, data, message}` or `{ok:false, offline:true}` on network error/timeout.
- `electron/store.js` (new) — JSON file at `app.getPath('userData')/headsets.json`, atomic write (tmp + rename). On first run seeds 10 headsets `192.168.0.101`…`192.168.0.110`, names `Headset 01`…`Headset 10`. Shape:
  ```json
  { "version":1,
    "headsets":[{ "id":"uuid","name":"Headset 01","ip":"192.168.0.101",
                  "quality":"standard","ratio":"16:9","muted":true,"volume":1 }],
    "settings":{ "gridMinWidth":320 } }
  ```
- `electron/preload.js` — replace with `contextBridge.exposeInMainWorld('pico', { loadStore, saveStore, status(ip,timeInterval), initiative(ip,deviceName), succeeded(ip,dn), failed(ip,dn), termination(ip,dn), setActive(ips), toggleFullscreen() })`.

### Renderer (`src/`)
- Dependency: **`mpegts.js`** (maintained flv.js successor) for HTTP-FLV over MSE. Config: `{type:'flv', isLive:true, url}`, `{enableWorker:true, enableStashBuffer:false, liveBufferLatencyChasing:true, liveBufferLatencyMaxLatency: preload+0.4, liveBufferLatencyMinRemain: preload}` plus the 1.1× playbackRate trick on `timeupdate`.
- `src/stream/CastSession.js` (new, plain JS class, one per headset, lives outside React) — state machine:
  `idle → probing → starting → playing → (ended | busy | offline | error) → idle`.
  - `start()`: status → if 0/1/-1 → initiative(deviceName) → if 0 → create mpegts player on its own `<video>` → on `playing` call succeeded, start 3s status poll. If status/initiative returns `-2` → state `busy` ("Another viewer is casting").
  - `stop()`: termination → destroy player → idle.
  - `setQuality()` updates preload live (no reconnect), `setMuted/setVolume`.
  - Optional auto-retry: on `offline`/`ended` while user still wants it enabled, retry every 5s (stops on disable).
  - Emits state changes to React via a tiny subscribe API.
- `src/stream/sessionManager.js` — `Map<id, CastSession>`; `enableAll()`, `disableAll()`; tells main the active IP list for quit cleanup.
- `src/hooks/useHeadsets.js` — loads/saves store via `window.pico`, add/rename/edit-IP/delete/update-settings, debounced save.
- `src/hooks/useCastSession.js` — subscribe a component to a session's state.

### UI components (minimal, dark)
- `src/App.jsx` — replace demo. Top bar + grid + focused overlay + dialogs.
- `src/components/TopBar.jsx` — app title, counters (`3 live / 10`), buttons: **+ Add headset**, **Enable all**, **Disable all**.
- `src/components/HeadsetGrid.jsx` — CSS grid `repeat(auto-fill, minmax(320px, 1fr))`, gap 12px.
- `src/components/HeadsetTile.jsx` — 16:9 (or 1:1) card; footer: status dot, name, IP; `⋮` button. When disabled/idle: dark placeholder + centered **Enable** (▶) button. When live: video, small hover overlay with mute toggle and **Disable** (■). Busy/offline/error: message + Retry. Click on live video → focus view.
- `src/components/KebabMenu.jsx` — popover: **Rename**, **Change IP**, **Delete** (delete asks inline confirm; stops session first).
- `src/components/FocusView.jsx` — **reuses the same session/video element** (the tile's container gets a `.focused` class → `position:fixed; inset:0` over the app) so no reconnect is needed. Controls bar (auto-hide after 3s like the web): ← Back (Esc), name, Quality (Standard / Smooth), Ratio (16:9 / 1:1), mute + volume slider, Fullscreen (F11 → `toggleFullscreen`), Stop.
- `src/components/HeadsetDialog.jsx` — shared modal for Add / Rename / Change IP; IPv4 validation, duplicate-IP check.
- `src/index.css` — rewrite: tokens `--bg:#0e0f11 --panel:#16181c --line:#24272d --text:#e6e8eb --muted:#8a9099 --accent:#4f8cff --live:#3ccf7a --warn:#e5a23c --err:#e5534b`; system font stack, 8px radius, no shadows, subtle hover.

Defaults: thumbnails start **muted** (10 audio streams at once is noise); per-headset quality/ratio/mute persisted. Enabled state is **not** auto-restored on launch (streams start only on user action) — easy to flip later.

### Misc
- `index.html` — CSP meta: `default-src 'self'; connect-src 'self' http: ws:; media-src 'self' blob:; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; worker-src 'self' blob:`.
- `package.json` — add `mpegts.js`; build `files` already covers `dist` + `electron`.
- `README.md` — usage notes + protocol summary.

## Risks / open points
- **One viewer per headset**: status returns `-2 "somebody playing"` while any client casts. If a browser tab or a crashed app session still holds the headset, our app shows *Busy*. Mitigation: termination on quit; "Force restart" item in tile menu that calls termination then start (to be verified on hardware).
- `INTERACTIVE (-1)` may require confirmation inside the headset — show "Accept on headset" hint while waiting.
- 10 simultaneous H.264 MSE decodes: should be fine with hardware decoding; if CPU is high, consider pausing off-screen tiles.

## Implementation order
1. `npm i mpegts.js`; main: `picoApi.js`, `store.js`, IPC, preload.
2. `CastSession` + manager; verify one headset streams end-to-end.
3. Grid, tiles, kebab menu, dialogs, persistence.
4. Focus view + controls (quality/ratio/audio/fullscreen).
5. Enable/Disable all, quit cleanup, styling polish, README.

## Verification
- `npm run dev` → app opens with 10 tiles (101–110); restart → list (incl. renames/deletes/added IPs) persists (`%APPDATA%/picoschoolstream/headsets.json`).
- Put on headset 192.168.0.108, start casting in headset → click **Enable** on its tile → live video within ~2s; DevTools Network shows `cast_status`, `cast_initiative`, `test.flv`, `cast_succeeded`, then `cast_status` every 3s (proxied via main → check main-process logs).
- Click tile → fills window without reconnect; Quality toggle changes latency without new `test.flv` request; ratio toggles 16:9/1:1; mute/volume work; Esc returns.
- **Disable** → `cast_termination` sent, headset stops casting. **Enable all / Disable all** act on all tiles; offline IPs show *Offline* quickly (2.5s timeout) without blocking others.
- Close app while streams live → headsets receive termination; reopen and enable → not *Busy*.
- `npm run dist` builds the NSIS installer and the packaged app streams the same way.
