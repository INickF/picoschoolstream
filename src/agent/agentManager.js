// Polls the control agent on every headset and runs app launch / close commands.
// State per headset id: undefined (not polled yet), { online: false }, or { online: true, ...agent status }.

import { useSyncExternalStore } from 'react';

const POLL_MS = 4000;
const REFRESH_AFTER_ACTION_MS = [1500, 4500];

let headsets = [];
let states = {};
const inFlight = new Set();
const listeners = new Set();
let timer = null;

function notify() {
  listeners.forEach((fn) => fn());
}

function setState(id, next) {
  // Skip identical polls so tiles do not re-render every few seconds.
  if (JSON.stringify(states[id]) === JSON.stringify(next)) return;
  states = { ...states, [id]: next };
  notify();
}

async function poll(h) {
  if (inFlight.has(h.id)) return;
  inFlight.add(h.id);
  try {
    const res = await window.pico.agentStatus(h.ip);
    if (!headsets.some((x) => x.id === h.id && x.ip === h.ip)) return;
    if (res.ok) {
      const { ok, ...status } = res;
      setState(h.id, { online: true, ...status });
    } else {
      setState(h.id, { online: false });
    }
  } finally {
    inFlight.delete(h.id);
  }
}

function pollAll() {
  headsets.forEach(poll);
}

function refreshSoon(list) {
  REFRESH_AFTER_ACTION_MS.forEach((ms) => setTimeout(() => list.forEach(poll), ms));
}

export function syncAgents(list) {
  const knownIp = new Map(headsets.map((h) => [h.id, h.ip]));
  headsets = list;
  // Keep state only for headsets whose IP is unchanged; new or re-addressed ones are polled right away.
  const kept = {};
  for (const h of list) if (knownIp.get(h.id) === h.ip && states[h.id]) kept[h.id] = states[h.id];
  if (Object.keys(kept).length !== Object.keys(states).length) {
    states = kept;
    notify();
  }
  list.filter((h) => knownIp.get(h.id) !== h.ip).forEach(poll);
  if (!timer) timer = setInterval(pollAll, POLL_MS);
}

function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useAgents() {
  return useSyncExternalStore(subscribe, () => states);
}

export function useAgent(id) {
  return useSyncExternalStore(subscribe, () => states[id]);
}

/** Apps installed on the given headsets, merged by package: [{ package, label, system, count }]. */
export async function loadApps(list) {
  const results = await Promise.all(list.map((h) => window.pico.agentApps(h.ip)));
  const merged = new Map();
  for (const res of results) {
    if (!res.ok) continue;
    for (const app of res.apps) {
      const prev = merged.get(app.package);
      merged.set(app.package, { ...app, count: (prev?.count ?? 0) + 1 });
    }
  }
  return [...merged.values()].sort(
    (a, b) => Number(a.system) - Number(b.system) || a.label.localeCompare(b.label),
  );
}

// Each action resolves to [{ headset, res }] so callers can report per-headset failures.
async function runOn(list, fn) {
  const out = await Promise.all(list.map(async (h) => ({ headset: h, res: await fn(h) })));
  refreshSoon(list);
  return out;
}

export const launchApp = (list, pkg) => runOn(list, (h) => window.pico.agentLaunch(h.ip, pkg));
export const closeApp = (list, pkg = null) => runOn(list, (h) => window.pico.agentClose(h.ip, pkg, false));
export const closeAllApps = (list) => runOn(list, (h) => window.pico.agentClose(h.ip, null, true));
