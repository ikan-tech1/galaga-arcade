/**
 * Tiny haptics wrapper around `navigator.vibrate`. Respects reduced motion,
 * the user's per-meta `hapticsEnabled` flag, and feature-detects browsers
 * that do not implement vibrate (desktop, iOS Safari).
 */

import { useCallback, useEffect, useRef } from 'react';

export type HapticPattern = 'tap' | 'hit' | 'death' | 'pickup' | 'fanfare';

export interface HapticsApi {
  buzz(pattern: HapticPattern): void;
  setEnabled(on: boolean): void;
}

const PATTERNS: Record<HapticPattern, number | number[]> = {
  tap: 8,
  hit: 18,
  pickup: [10, 12, 14],
  death: [40, 30, 80],
  fanfare: [20, 30, 20, 30, 60],
};

export function useHaptics(enabled: boolean, reducedMotion: boolean): HapticsApi {
  const enabledRef = useRef(enabled && !reducedMotion);

  useEffect(() => {
    enabledRef.current = enabled && !reducedMotion;
  }, [enabled, reducedMotion]);

  const buzz = useCallback((pattern: HapticPattern) => {
    if (!enabledRef.current) return;
    if (typeof navigator === 'undefined' || !navigator.vibrate) return;
    const p = PATTERNS[pattern];
    try {
      navigator.vibrate(p);
    } catch {
      /* ignore */
    }
  }, []);

  const setEnabled = useCallback(
    (on: boolean) => {
      enabledRef.current = on && !reducedMotion;
    },
    [reducedMotion],
  );

  return { buzz, setEnabled };
}
