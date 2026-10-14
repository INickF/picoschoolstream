import { useCallback, useEffect, useRef, useState } from 'react';

const SAVE_DELAY_MS = 300;

export function useHeadsets() {
  const [data, setData] = useState(null);
  const saveTimer = useRef(null);

  useEffect(() => {
    window.pico.loadStore().then(setData);
  }, []);

  const commit = useCallback((updater) => {
    setData((prev) => {
      const next = updater(prev);
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => window.pico.saveStore(next), SAVE_DELAY_MS);
      return next;
    });
  }, []);

  const add = useCallback(
    (name, ip) =>
      commit((d) => ({
        ...d,
        headsets: [
          ...d.headsets,
          { id: crypto.randomUUID(), name, ip, quality: 'standard', ratio: '16:9', muted: true, volume: 1 },
        ],
      })),
    [commit],
  );

  const update = useCallback(
    (id, patch) =>
      commit((d) => ({
        ...d,
        headsets: d.headsets.map((h) => (h.id === id ? { ...h, ...patch } : h)),
      })),
    [commit],
  );

  const remove = useCallback(
    (id) => commit((d) => ({ ...d, headsets: d.headsets.filter((h) => h.id !== id) })),
    [commit],
  );

  const updateSettings = useCallback(
    (patch) => commit((d) => ({ ...d, settings: { ...d.settings, ...patch } })),
    [commit],
  );

  return { headsets: data?.headsets ?? null, settings: data?.settings ?? {}, add, update, remove, updateSettings };
}
