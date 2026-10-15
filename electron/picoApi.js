// HTTP client for the PICO cast server running on each headset (port 3342).
// Runs in the main process because the headset's API responses carry no CORS headers.

const PORT = 3342;
const TIMEOUT_MS = 2500;

const clientInfo = {
  userAgent: 'picoschoolstream/0.1 (windows nt 10.0; win64; x64) electron',
  browser: 'Chrome',
  browserVersion: process.versions.chrome,
  osName: 'windows',
  osVersion: '10',
  deviceName: '',
  platform: 'pc',
  clientHeight: 1080,
  clientWidth: 1920,
  isOnLine: true,
  language: 'en-US',
};

async function post(ip, endpoint, extra = {}, timeoutMs = TIMEOUT_MS) {
  const url = `http://${ip}:${PORT}/api/${endpoint}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/plain, */*',
        Origin: `http://${ip}:${PORT}`,
        Referer: `http://${ip}:${PORT}/cast`,
      },
      body: JSON.stringify({ ...clientInfo, ...extra }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const json = await res.json().catch(() => ({}));
    return { ok: true, code: json.code, message: json.message, data: json.data };
  } catch (err) {
    return { ok: false, offline: true, message: err.name === 'TimeoutError' ? 'timeout' : err.message };
  }
}

module.exports = {
  status: (ip, timeInterval) =>
    post(ip, 'cast_status', timeInterval === undefined ? {} : { timeInterval }),
  // Short-timeout status call used by the LAN scan to recognise a headset.
  probe: (ip, timeoutMs) => post(ip, 'cast_status', {}, timeoutMs),
  initiative: (ip, deviceName) => post(ip, 'cast_initiative', { deviceName }),
  succeeded: (ip, deviceName) => post(ip, 'cast_succeeded', { deviceName }),
  failed: (ip, deviceName) => post(ip, 'cast_failed', { deviceName }),
  termination: (ip, deviceName, timeoutMs) =>
    post(ip, 'cast_termination', { deviceName }, timeoutMs),
};
