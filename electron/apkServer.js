// Serves APK files to the headsets' agents, which download them themselves (POST /api/install {url}).
//
// Every link is made for one headset and one download:
// - the server listens only on this PC's address in that headset's subnet, not on every network (VPN, other Wi-Fi).
//   With anyNetwork (setting "Allow headsets on other networks") a headset outside those subnets gets the address
//   the OS routes to it instead, e.g. through a router or VPN;
// - only the headset the link was made for may use it, everyone else gets 404;
// - the link works once and expires LINK_TTL_MS after it was made.
// The server for an address closes once it has no live links and no download running.
// It listens on the fixed APK_PORT, so a firewall rule can open just that port: Windows Firewall asks once,
// on Linux allow it yourself (e.g. `sudo ufw allow 3351/tcp`). If the port is taken, a random one is used.

const crypto = require('crypto');
const dgram = require('dgram');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { localSubnets } = require('./scanner');

// The agent starts the download right after the install request, so a short window is enough.
const LINK_TTL_MS = 2 * 60 * 1000;

// Next to the agent (3350) and the cast server (3342).
const APK_PORT = 3351;

const servers = new Map(); // host address -> { server, port, links: Map(token -> link), active }

function listen(server, port, host) {
  return new Promise((resolve, reject) => {
    const onError = (err) => {
      server.off('listening', onListening);
      reject(err);
    };
    const onListening = () => {
      server.off('error', onError);
      resolve();
    };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(port, host);
  });
}

function closeIfIdle(host) {
  const entry = servers.get(host);
  if (!entry) return;
  const now = Date.now();
  for (const [token, link] of entry.links) if (link.expiresAt <= now) entry.links.delete(token);
  if (entry.links.size === 0 && entry.active === 0) {
    servers.delete(host);
    entry.server.close();
  }
}

function handle(host, req, res) {
  const entry = servers.get(host);
  const token = (req.url || '').split('/')[1] || '';
  const link = entry?.links.get(token);
  const from = (req.socket.remoteAddress || '').replace(/^::ffff:/, '');
  // Same answer for every refusal, so a stranger can't tell a real token from a wrong one.
  if (req.method !== 'GET' || !link || link.expiresAt <= Date.now() || from !== link.headsetIp) {
    res.writeHead(404, { Connection: 'close' }).end();
    return;
  }
  entry.links.delete(token); // single use: gone as soon as its download starts

  entry.active++;
  const done = () => {
    entry.active--;
    closeIfIdle(host);
  };
  res.once('close', done);
  fs.stat(link.file, (err, st) => {
    if (err) {
      res.writeHead(404, { Connection: 'close' }).end();
      return;
    }
    res.writeHead(200, {
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Length': st.size,
      Connection: 'close',
    });
    fs.createReadStream(link.file).on('error', () => res.destroy()).pipe(res);
  });
}

async function serverFor(host) {
  const existing = servers.get(host);
  if (existing) return existing;
  const server = http.createServer((req, res) => handle(host, req, res));
  try {
    await listen(server, APK_PORT, host);
  } catch (err) {
    if (err.code !== 'EADDRINUSE') throw err;
    await listen(server, 0, host);
  }
  const entry = { server, port: server.address().port, links: new Map(), active: 0 };
  servers.set(host, entry);
  return entry;
}

/** This PC's address on the headset's /24, or null if they share no subnet. */
function addressFor(headsetIp) {
  const prefix = headsetIp.split('.').slice(0, 3).join('.');
  const subnet = localSubnets().find((s) => s.prefix === prefix);
  return subnet ? [...subnet.own][0] : null;
}

/** The local address the OS would use to reach ip (a UDP "connect" sends nothing), or null. */
function routedAddressFor(ip) {
  return new Promise((resolve) => {
    const socket = dgram.createSocket('udp4');
    const done = (address) => {
      socket.close();
      resolve(address);
    };
    socket.on('error', () => done(null));
    socket.connect(9, ip, () => done(socket.address().address));
  });
}

/**
 * A one-time URL from which only the headset at headsetIp can download filePath, valid for LINK_TTL_MS;
 * null when this PC has no address in the headset's subnet (and anyNetwork is off, or it has no route).
 */
async function urlFor(filePath, headsetIp, { anyNetwork = false } = {}) {
  const host = addressFor(headsetIp) ?? (anyNetwork ? await routedAddressFor(headsetIp) : null);
  if (!host) return null;
  const entry = await serverFor(host);
  const abs = path.resolve(filePath);
  const token = crypto.randomBytes(16).toString('hex');
  entry.links.set(token, { file: abs, headsetIp, expiresAt: Date.now() + LINK_TTL_MS });
  // Close the server again if this link is never used.
  setTimeout(() => closeIfIdle(host), LINK_TTL_MS + 1000).unref();
  return `http://${host}:${entry.port}/${token}/${encodeURIComponent(path.basename(abs))}`;
}

module.exports = { urlFor, LINK_TTL_MS };
