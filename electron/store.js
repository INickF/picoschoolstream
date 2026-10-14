// Persists the headset list and settings as JSON in the user data directory.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { app } = require('electron');

const VERSION = 1;

function filePath() {
  return path.join(app.getPath('userData'), 'headsets.json');
}

function makeHeadset(name, ip) {
  return {
    id: crypto.randomUUID(),
    name,
    ip,
    quality: 'standard',
    ratio: '16:9',
    muted: true,
    volume: 1,
  };
}

function defaults() {
  const headsets = [];
  const label = app.getLocale().toLowerCase().startsWith('ru') ? 'Шлем' : 'Headset';
  for (let i = 1; i <= 10; i++) {
    headsets.push(makeHeadset(`${label} ${String(i).padStart(2, '0')}`, `192.168.0.${100 + i}`));
  }
  return { version: VERSION, headsets, settings: {} };
}

function load() {
  try {
    const data = JSON.parse(fs.readFileSync(filePath(), 'utf8'));
    if (Array.isArray(data.headsets)) {
      return { version: VERSION, settings: {}, ...data };
    }
  } catch {
    // Missing or corrupt file: fall through to defaults.
  }
  const data = defaults();
  save(data);
  return data;
}

function save(data) {
  const file = filePath();
  const tmp = `${file}.tmp`;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, file);
}

module.exports = { load, save };
