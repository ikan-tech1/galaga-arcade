import { useEffect, useRef, useState } from 'react';
import { FRAME_DT_MS, type Settings } from '@galaga/shared';
import { loadGame } from './wasmLoader';
import { createInputDevices, INPUT_FIRE, INPUT_START } from './input';
import {
  emitAudioEvents,
  setVolumes,
  startAttractMusic,
  startStageMusic,
  stopAttractMusic,
  stopStageMusic,
  unlockAudio,
} from './audio';
import type { FrameState } from '../state/frame';
import type { HiScoreEntry } from '@galaga/shared';

interface UseGameLoopArgs {
  settings: { settings: Settings };
  hiscores: { list: HiScoreEntry[] };
}

export interface GameApi {
  startGame(): void;
  submitHiScore(initials: string): void;
  reset(): void;
}

export function useGameLoop({ settings, hiscores }: UseGameLoopArgs) {
  const [frame, setFrame] = useState<FrameState | null>(null);
  const apiRef = useRef<GameApi>({
    startGame: () => undefined,
    submitHiScore: () => undefined,
    reset: () => undefined,
  });

  useEffect(() => {
    let cancelled = false;
    let gameInstance: any = null;
    let rafId = 0;
    let lastTime = performance.now();
    let acc = 0;
    let lastPhase = '';

    const input = createInputDevices();
    const unbind = input.bind(window);

    const tickEngine = (inputs: number): FrameState => {
      const raw = gameInstance.tick(inputs);
      return raw as FrameState;
    };

    const onUserAction = () => {
      unlockAudio();
    };
    window.addEventListener('keydown', onUserAction, { once: false });
    window.addEventListener('pointerdown', onUserAction, { once: false });

    (async () => {
      const GameCtor = await loadGame();
      if (cancelled) return;
      gameInstance = new GameCtor();
      apiRef.current = {
        startGame: () => {
          unlockAudio();
          gameInstance?.start_game();
        },
        submitHiScore: (initials: string) => {
          gameInstance?.submit_hiscore(initials);
        },
        reset: () => {
          gameInstance?.reset();
        },
      };

      const loop = () => {
        if (cancelled) return;
        const now = performance.now();
        const elapsed = Math.min(now - lastTime, 100);
        lastTime = now;
        acc += elapsed;
        let frameOut: FrameState | null = null;
        // Run at most a few catch-up ticks per RAF to avoid spirals of death.
        let steps = 0;
        while (acc >= FRAME_DT_MS && steps < 4) {
          acc -= FRAME_DT_MS;
          steps += 1;
          const bits = input.read();
          frameOut = tickEngine(bits);
        }
        if (frameOut) {
          // Phase transitions: start/stop music.
          if (frameOut.phase !== lastPhase) {
            if (frameOut.phase === 'attract') {
              stopStageMusic();
              startAttractMusic();
            } else if (frameOut.phase === 'stage_intro' || frameOut.phase === 'playing') {
              stopAttractMusic();
              if (lastPhase !== 'playing' && lastPhase !== 'stage_intro') {
                startStageMusic();
              }
            } else if (frameOut.phase === 'game_over' || frameOut.phase === 'hi_score_entry') {
              stopStageMusic();
            }
            lastPhase = frameOut.phase;
          }
          emitAudioEvents(frameOut.audio_events);
          setFrame(frameOut);
        }
        rafId = requestAnimationFrame(loop);
      };

      lastTime = performance.now();
      // Initial state.
      const first = tickEngine(0);
      setFrame(first);
      startAttractMusic();
      lastPhase = first.phase;
      rafId = requestAnimationFrame(loop);
    })().catch((err) => {
      console.error('Failed to init engine', err);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      unbind();
      window.removeEventListener('keydown', onUserAction);
      window.removeEventListener('pointerdown', onUserAction);
      stopStageMusic();
      stopAttractMusic();
      gameInstance?.free?.();
    };
    // We intentionally exclude `hiscores` since it's only read for context.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setVolumes(settings.settings.sfx, settings.settings.music);
  }, [settings.settings.sfx, settings.settings.music]);

  // Listen for start/fire as a global gate to start playing (more obvious than
  // requiring Enter-only).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (frame?.phase === 'attract' && (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyZ')) {
        apiRef.current.startGame();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [frame?.phase]);

  // Suppress unused warning
  void hiscores;
  void INPUT_FIRE;
  void INPUT_START;

  return { frame, api: apiRef.current };
}
