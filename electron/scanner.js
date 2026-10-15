// Finds PICO headsets on the local network: every /24 subnet of this PC's IPv4 interfaces is probed for
// the control agent (port 3350) and the PICO cast server (port 3342). HTTP probes instead of ping, because
// Windows and the headsets often drop ICMP.

const os = require('os');
const agent = require('./agentApi');
const pico = require('./picoApi');

// Generous: a sleeping headset's Wi-Fi power saving can delay its first reply by over a second.
const PROBE_TIMEOUT_MS = 2500;
const CONCURRENCY = 128;

/** Local subnets as their first three octets, e.g. ['192.168.0'], with this PC's own addresses. */
function localSubnets() {
  const subnets = new Map();
  for (const addrs of Object.values(os.networkInterfaces())) {
    for (const a of addrs ?? []) {
      if (a.family !== 'IPv4' || a.internal || a.address.startsWith('169.254.')) continue;
      const prefix = a.address.split('.').slice(0, 3).join('.');
      if (!subnets.has(prefix)) subnets.set(prefix, new Set());
      subnets.get(prefix).add(a.address);
    }
  }
  return [...subnets].map(([prefix, own]) => ({ prefix, own }));
}

async function probe(ip) {
  const [a, c] = await Promise.all([
    agent.status(ip, PROBE_TIMEOUT_MS),
    pico.probe(ip, PROBE_TIMEOUT_MS),
  ]);
  // The PICO cast server always answers with a numeric code; anything else on 3342 is not a headset.
  const cast = c.ok && typeof c.code === 'number';
  if (!a.ok && !cast) return null;
  return {
    ip,
    agent: a.ok,
    cast,
    model: a.ok ? a.model : '',
    deviceName: (c.ok && c.data?.device_name) || (a.ok ? a.name : ''),
  };
}

/** Scans all local subnets; onProgress({ done, total, found }) is called as results come in. */
async function scan(onProgress) {
  const subnets = localSubnets();
  const queue = [];
  for (const { prefix, own } of subnets) {
    for (let i = 1; i <= 254; i++) {
      const ip = `${prefix}.${i}`;
      if (!own.has(ip)) queue.push(ip);
    }
  }

  const found = [];
  let done = 0;
  let next = 0;
  const worker = async () => {
    while (next < queue.length) {
      const ip = queue[next++];
      const hit = await probe(ip);
      done++;
      if (hit) found.push(hit);
      if (hit || done % 16 === 0 || done === queue.length) onProgress({ done, total: queue.length, found: [...found] });
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker));

  const byIp = (a, b) => a.ip.split('.').map(Number).reduce((d, n, i) => d || n - b.ip.split('.').map(Number)[i], 0);
  return { subnets: subnets.map((s) => `${s.prefix}.0/24`), found: found.sort(byIp) };
}

module.exports = { scan };
