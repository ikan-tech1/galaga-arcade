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
  hiscores: {
    list: HiScoreEntry[];
    qualifyingThreshold: number;
    topScore: number;
  };
  caps?: { lowEnd: boolean; reducedMotion: boolean };
}

export interface GameApi {
  startGame(): void;
  submitHiScore(initials: string): void;
  reset(): void;
}

export function useGameLoop({ settings, hiscores, caps }: UseGameLoopArgs) {
  const [frame, setFrame] = useState<FrameState | null>(null);
  const [ready, setReady] = useState(false);
  const apiRef = useRef<GameApi>({
    startGame: () => undefined,
    submitHiScore: () => undefined,
    reset: () => undefined,
  });
  const gameInstanceRef = useRef<any>(null);
  // Stable ref for the latest hi-score snapshot — keeps the engine in sync
  // without retriggering the heavy WASM init effect.
  const hiscoresRef = useRef(hiscores);
  hiscoresRef.current = hiscores;

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
      gameInstanceRef.current = gameInstance;
      // Mirror the persisted top-10 leaderboard into the engine so the
      // HUD HIGH SCORE matches localStorage and the GameOver phase only
      // advances to the entry screen for genuinely qualifying scores.
      try {
        gameInstance?.set_hi_score?.(hiscoresRef.current.topScore);
        gameInstance?.set_hi_score_threshold?.(
          hiscoresRef.current.qualifyingThreshold,
        );
      } catch {
        /* engine pre-update may not yet expose these */
      }
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
      setReady(true);
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

  // Re-push hi-score gate whenever the persisted leaderboard changes.
  useEffect(() => {
    const g = gameInstanceRef.current;
    if (!g) return;
    try {
      g.set_hi_score?.(hiscores.topScore);
      g.set_hi_score_threshold?.(hiscores.qualifyingThreshold);
    } catch {
      /* engine pre-update or wasm not ready */
    }
  }, [hiscores.qualifyingThreshold, hiscores.topScore]);

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
  void caps;
  void INPUT_FIRE;
  void INPUT_START;

  return { frame, ready, api: apiRef.current };
}
