/**
 * Screen-shake + hit-stop coordinator. Maintained outside React's render loop
 * to avoid re-renders on every animation frame; consumers read its current
 * value via a ref. The cabinet element listens to a tiny mutation observer
 * (just sets a CSS variable) so the rest of the tree stays still.
 */

import { useCallback, useEffect, useRef } from 'react';

export interface FxState {
  /** Current shake offset (px). */
  shakeX: number;
  shakeY: number;
  /** Frames remaining of hit-stop (renders are paused while > 0). */
  hitStop: number;
}

export interface FxApi {
  /** Trigger a screen shake.  Power 0..1, frames = duration. */
  shake(power: number, frames: number): void;
  /** Trigger a hit-stop (in frames). */
  hitStop(frames: number): void;
  /** Get current state (mutates over time). */
  state: FxState;
  /** Globally enable/disable. */
  setEnabled(enabled: boolean): void;
  /** Tick the engine — call from raf loop. */
  tick(): void;
}

export function useFx(reducedMotion: boolean): FxApi {
  const stateRef = useRef<FxState>({ shakeX: 0, shakeY: 0, hitStop: 0 });
  const peakRef = useRef<{ power: number; frames: number; total: number }>({
    power: 0,
    frames: 0,
    total: 0,
  });
  const enabledRef = useRef(!reducedMotion);

  useEffect(() => {
    enabledRef.current = !reducedMotion;
  }, [reducedMotion]);

  const shake = useCallback((power: number, frames: number) => {
    if (!enabledRef.current) return;
    const peak = peakRef.current;
    // Only override if new shake is stronger or current has decayed significantly.
    const remaining = peak.frames;
    const currentStrength = (peak.power * remaining) / Math.max(1, peak.total);
    if (power >= currentStrength) {
      peak.power = power;
      peak.frames = frames;
      peak.total = frames;
    } else {
      peak.frames = Math.max(peak.frames, frames * 0.5);
    }
  }, []);

  const hitStop = useCallback((frames: number) => {
    if (!enabledRef.current) return;
    stateRef.current.hitStop = Math.max(stateRef.current.hitStop, frames);
  }, []);

  const setEnabled = useCallback((enabled: boolean) => {
    enabledRef.current = enabled;
    if (!enabled) {
      stateRef.current.shakeX = 0;
      stateRef.current.shakeY = 0;
      stateRef.current.hitStop = 0;
      peakRef.current = { power: 0, frames: 0, total: 0 };
    }
  }, []);

  const tick = useCallback(() => {
    const peak = peakRef.current;
    const s = stateRef.current;
    if (peak.frames > 0) {
      const t = peak.frames / Math.max(1, peak.total);
      const amp = peak.power * 6 * t * t;
      s.shakeX = (Math.random() * 2 - 1) * amp;
      s.shakeY = (Math.random() * 2 - 1) * amp;
      peak.frames -= 1;
      if (peak.frames <= 0) {
        s.shakeX = 0;
        s.shakeY = 0;
      }
    } else {
      s.shakeX = 0;
      s.shakeY = 0;
    }
    if (s.hitStop > 0) s.hitStop -= 1;
  }, []);

  return {
    shake,
    hitStop,
    setEnabled,
    state: stateRef.current,
    tick,
  };
}
