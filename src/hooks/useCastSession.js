import { useSyncExternalStore } from 'react';

const idle = { status: 'idle', message: '', deviceName: '', sn: '', wanted: false };
const noop = () => () => {};

export function useCastSession(session) {
  return useSyncExternalStore(
    session ? session.subscribe : noop,
    session ? session.getSnapshot : () => idle,
  );
}
