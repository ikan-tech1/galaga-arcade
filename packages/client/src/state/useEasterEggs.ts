import { useCallback, useEffect, useRef, useState } from 'react';
import { EASTER_EGGS, KONAMI_SEQUENCE } from '../meta/easterEggs';
import type { EasterEggId } from '../meta/types';
import { playMetaCue } from '../game/audio';

interface Options {
  isDiscovered: (id: EasterEggId) => boolean;
  onDiscover: (id: EasterEggId, reward: number) => void;
}

export function useEasterEggs({ isDiscovered, onDiscover }: Options) {
  const [rainbow, setRainbow] = useState(false);
  const [debugOverlay, setDebugOverlay] = useState(false);
  const seqRef = useRef<string[]>([]);
  const clickCountRef = useRef(0);
  const clickResetRef = useRef<number | null>(null);

  const trigger = useCallback(
    (id: EasterEggId) => {
      if (isDiscovered(id)) return;
      const def = EASTER_EGGS[id];
      playMetaCue('easter_egg');
      onDiscover(id, def?.reward ?? 100);
    },
    [isDiscovered, onDiscover],
  );

  // Konami listener.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      seqRef.current = [...seqRef.current, e.code].slice(-KONAMI_SEQUENCE.length);
      if (
        seqRef.current.length === KONAMI_SEQUENCE.length &&
        seqRef.current.every((k, i) => k === KONAMI_SEQUENCE[i])
      ) {
        trigger('konami');
        trigger('rainbowMode');
        setRainbow(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [trigger]);

  // Logo-tap counter.
  const onLogoTap = useCallback(() => {
    clickCountRef.current += 1;
    if (clickResetRef.current) window.clearTimeout(clickResetRef.current);
    clickResetRef.current = window.setTimeout(() => {
      clickCountRef.current = 0;
    }, 1500);
    if (clickCountRef.current === 7) {
      trigger('click7');
      trigger('retroDebug');
      setDebugOverlay(true);
      clickCountRef.current = 0;
    }
  }, [trigger]);

  const handleRunSignals = useCallback(
    (ids: EasterEggId[]) => {
      if (ids.length === 0) return;
      for (const id of ids) trigger(id);
    },
    [trigger],
  );

  return {
    rainbow,
    debugOverlay,
    setDebugOverlay,
    setRainbow,
    onLogoTap,
    handleRunSignals,
  };
}
