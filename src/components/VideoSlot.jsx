import { useLayoutEffect, useRef } from 'react';

// Hosts a session's long-lived <video> element. Moving it between slots keeps the stream alive.
export default function VideoSlot({ session, ratio }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const el = ref.current;
    const video = session?.video;
    if (!el || !video) return;
    el.appendChild(video);
    if (video.paused && session.player) video.play().catch(() => {});
    return () => {
      if (video.parentNode === el) el.removeChild(video);
    };
  }, [session]);

  return <div ref={ref} className={`video-slot ${ratio === '1:1' ? 'square' : 'wide'}`} />;
}
