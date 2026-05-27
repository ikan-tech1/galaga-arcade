import { useEffect, useState } from 'react';

export interface DeviceCapabilities {
  /** Primary input is touch (no precise hover device). */
  touch: boolean;
  /** Viewport is narrow enough to be treated as a phone. */
  narrow: boolean;
  /** Heuristic: device is likely low-end (limited cores, reduced motion, or slow network). */
  lowEnd: boolean;
  /** User explicitly prefers reduced motion. */
  reducedMotion: boolean;
}

function detect(): DeviceCapabilities {
  if (typeof window === 'undefined') {
    return { touch: false, narrow: false, lowEnd: false, reducedMotion: false };
  }
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const noHover = window.matchMedia('(hover: none)').matches;
  const touchPoints = (navigator.maxTouchPoints ?? 0) > 0 || 'ontouchstart' in window;
  const narrow = window.matchMedia('(max-width: 600px)').matches;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cores = navigator.hardwareConcurrency ?? 8;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  const saveData = conn?.saveData === true;
  const slowNet = conn?.effectiveType === '2g' || conn?.effectiveType === 'slow-2g';
  const lowEnd = cores <= 4 || memory <= 2 || saveData || slowNet || reducedMotion;
  return {
    touch: (coarse && noHover) || touchPoints,
    narrow,
    lowEnd,
    reducedMotion,
  };
}

export function useDeviceCapabilities(): DeviceCapabilities {
  const [caps, setCaps] = useState<DeviceCapabilities>(() => detect());

  useEffect(() => {
    const update = () => setCaps(detect());
    const mqs = [
      window.matchMedia('(pointer: coarse)'),
      window.matchMedia('(hover: none)'),
      window.matchMedia('(max-width: 600px)'),
      window.matchMedia('(prefers-reduced-motion: reduce)'),
    ];
    for (const mq of mqs) mq.addEventListener?.('change', update);
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      for (const mq of mqs) mq.removeEventListener?.('change', update);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return caps;
}
