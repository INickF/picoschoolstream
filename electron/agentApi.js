// HTTP client for PicoSchoolAgent (D:\PicoSchoolAgent), the control app installed on each headset (port 3350).
// Every response is `{ ok, ... }`; on failure `{ ok: false, error }`, plus `offline: true` when unreachable.

const PORT = 3350;
const TIMEOUT_MS = 2500;

async function call(ip, endpoint, body, timeoutMs = TIMEOUT_MS) {
  const url = `http://${ip}:${PORT}/api/${endpoint}`;
  try {
    const res = await fetch(url, {
      method: body === undefined ? 'GET' : 'POST',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const json = await res.json().catch(() => ({ ok: false, error: 'bad_response' }));
    return json;
  } catch (err) {
    return { ok: false, offline: true, error: err.name === 'TimeoutError' ? 'timeout' : 'unreachable' };
  }
}

module.exports = {
  status: (ip, timeoutMs) => call(ip, 'status', undefined, timeoutMs),
  apps: (ip) => call(ip, 'apps', undefined, 5000),
  // Switching apps closes the running one first, which takes a few seconds on the headset.
  launch: (ip, pkg) => call(ip, 'launch', { package: pkg, closePrevious: true }, 10000),
  // pkg null closes the foreground app; all closes every app.
  close: (ip, pkg, all) => call(ip, 'close', all ? { all: true } : pkg ? { package: pkg } : {}),
  // Both start a job on the headset and return at once; progress comes in status.job.
  install: (ip, url) => call(ip, 'install', { url }),
  uninstall: (ip, pkg) => call(ip, 'uninstall', { package: pkg }),
};
