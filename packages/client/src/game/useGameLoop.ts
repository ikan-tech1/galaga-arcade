import { useEffect, useMemo, useRef, useState } from 'react';
import { FRAME_DT_MS, type Settings } from '@galaga/shared';
import { loadGame } from './wasmLoader';
import { createInputDevices, INPUT_FIRE, INPUT_LEFT, INPUT_RIGHT, INPUT_START } from './input';
import {
  emitAudioEvents,
  playMetaCue,
  setVolumes,
  startAttractMusic,
  startStageMusic,
  stopAttractMusic,
  stopStageMusic,
  unlockAudio,
} from './audio';
import type { FrameState } from '../state/frame';
import type { HiScoreEntry } from '@galaga/shared';
import type { RunContext, ShipId } from '../meta/types';
import {
  newRunTracker,
  tickRunTracker,
  type RunTrackerState,
} from '../meta/runTracker';
import { dailyFor } from '../meta/daily';

interface UseGameLoopArgs {
  settings: { settings: Settings };
  hiscores: {
    list: HiScoreEntry[];
    qualifyingThreshold: number;
    topScore: number;
  };
  caps?: { lowEnd: boolean; reducedMotion: boolean };
  runContext: RunContext | null;
}

export interface GameApi {
  startGame(): void;
  submitHiScore(initials: string): void;
  reset(): void;
  setRunContext(ctx: RunContext | null): void;
}

export interface MetaSnapshot {
  active: RunTrackerState['active'];
  drops: RunTrackerState['drops'];
  bombs: number;
  combo: number;
  bestCombo: number;
  scoreMul: number;
  bonusScore: number;
  credits: number;
  toasts: RunTrackerState['toasts'];
  mission: RunTrackerState['mission'];
  sideQuests: RunTrackerState['sideQuests'];
  perfectChallenges: number;
  rescues: number;
  diedOnce: boolean;
  highestStage: number;
  kills: number;
  bossKills: number;
  divingKills: number;
  powerUpsCollected: number;
  bombFlash: number;
  ship: ShipId;
}

const EMPTY_SNAPSHOT: MetaSnapshot = {
  active: [],
  drops: [],
  bombs: 0,
  combo: 0,
  bestCombo: 0,
  scoreMul: 1,
  bonusScore: 0,
  credits: 0,
  toasts: [],
  mission: undefined,
  sideQuests: [],
  perfectChallenges: 0,
  rescues: 0,
  diedOnce: false,
  highestStage: 1,
  kills: 0,
  bossKills: 0,
  divingKills: 0,
  powerUpsCollected: 0,
  bombFlash: 0,
  ship: 'fighter',
};

export function useGameLoop({
  settings,
  hiscores,
  caps,
  runContext,
}: UseGameLoopArgs) {
  const [frame, setFrame] = useState<FrameState | null>(null);
  const [meta, setMeta] = useState<MetaSnapshot>(EMPTY_SNAPSHOT);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const apiRef = useRef<GameApi>({
    startGame: () => undefined,
    submitHiScore: () => undefined,
    reset: () => undefined,
    setRunContext: () => undefined,
  });
  const gameInstanceRef = useRef<any>(null);
  const trackerRef = useRef<RunTrackerState | null>(null);
  const runContextRef = useRef<RunContext | null>(runContext);
  runContextRef.current = runContext;

  const hiscoresRef = useRef(hiscores);
  hiscoresRef.current = hiscores;

  // Memo of modifiers for stable input filtering.
  const modSet = useMemo(() => {
    const out = new Set<string>();
    const d = runContext?.daily;
    if (d) for (const m of d.modifiers) out.add(m);
    return out;
  }, [runContext]);

  useEffect(() => {
    let cancelled = false;
    let gameInstance: any = null;
    let rafId = 0;
    let lastTime = performance.now();
    let acc = 0;
    let lastPhase = '';
    let bombFlash = 0;
    let suppressFireFrames = 0;
    if (modSet.has('noFire30s')) suppressFireFrames = 60 * 30;
    const speedMul = modSet.has('doubleSpeedDives') ? 1.9 : 1.0;
    const oneShot = modSet.has('oneShotOneKill');

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
          // (Re-)initialise tracker for the active run context.
          const ctx = runContextRef.current ?? {
            mode: 'classic',
            ship: 'fighter',
          };
          trackerRef.current = newRunTracker(ctx);
          bombFlash = 0;
          if (modSet.has('noFire30s')) suppressFireFrames = 60 * 30;
          gameInstance?.start_game();
        },
        submitHiScore: (initials: string) => {
          gameInstance?.submit_hiscore(initials);
        },
        reset: () => {
          gameInstance?.reset();
          trackerRef.current = null;
        },
        setRunContext: (ctx) => {
          runContextRef.current = ctx;
        },
      };

      const loop = () => {
        if (cancelled) return;
        const now = performance.now();
        const elapsed = Math.min(now - lastTime, 100);
        lastTime = now;
        acc += elapsed * speedMul;
        let frameOut: FrameState | null = null;
        let steps = 0;
        while (acc >= FRAME_DT_MS && steps < 4) {
          acc -= FRAME_DT_MS;
          steps += 1;
          let bits = input.read();
          if (suppressFireFrames > 0) {
            bits &= ~INPUT_FIRE;
            suppressFireFrames -= 1;
          }
          if (modSet.has('invertedControls')) {
            const left = !!(bits & INPUT_LEFT);
            const right = !!(bits & INPUT_RIGHT);
            bits &= ~(INPUT_LEFT | INPUT_RIGHT);
            if (left) bits |= INPUT_RIGHT;
            if (right) bits |= INPUT_LEFT;
          }
          frameOut = tickEngine(bits);
        }
        if (frameOut) {
          if (frameOut.phase !== lastPhase) {
            if (frameOut.phase === 'attract') {
              stopStageMusic();
              startAttractMusic();
            } else if (frameOut.phase === 'stage_intro' || frameOut.phase === 'playing') {
              stopAttractMusic();
              if (lastPhase !== 'playing' && lastPhase !== 'stage_intro') {
                startStageMusic(runContextRef.current?.mode);
              }
            } else if (frameOut.phase === 'game_over' || frameOut.phase === 'hi_score_entry') {
              stopStageMusic();
            }
            lastPhase = frameOut.phase;
          }
          emitAudioEvents(frameOut.audio_events);

          // Tick the meta tracker.
          const tracker = trackerRef.current;
          if (tracker) {
            const res = tickRunTracker(tracker, frameOut);
            for (const cue of tracker.audio) playMetaCue(cue);
            if (res.shouldBombScreen) {
              gameInstance?.debug_skip_stage?.();
              bombFlash = 1;
              playMetaCue('bomb_clear_big');
            }
            if (oneShot && frameOut.score > tracker.lastEngineScore - 1) {
              // bonus on top of existing engine score for the oneShot modifier.
              tracker.bonusScore += (frameOut.score - tracker.lastEngineScore) * 5;
            }
            // Decay bomb flash.
            if (bombFlash > 0) bombFlash = Math.max(0, bombFlash - 0.06);
            setMeta({
              active: tracker.active.slice(),
              drops: tracker.drops.slice(),
              bombs: tracker.bombsBanked,
              combo: tracker.combo,
              bestCombo: tracker.bestCombo,
              scoreMul: tracker.scoreMul,
              bonusScore: tracker.bonusScore,
              credits: tracker.credits,
              toasts: tracker.toasts.slice(),
              mission: tracker.mission
                ? { ...tracker.mission, progress: { ...tracker.mission.progress } }
                : undefined,
              sideQuests: tracker.sideQuests.map((q) => ({ ...q })),
              perfectChallenges: tracker.perfectChallenges,
              rescues: tracker.rescues,
              diedOnce: tracker.diedOnce,
              highestStage: tracker.highestStage,
              kills: tracker.kills,
              bossKills: tracker.bossKills,
              divingKills: tracker.divingKills,
              powerUpsCollected: tracker.powerUpsCollected,
              bombFlash,
              ship: tracker.ctx.ship,
            });
          } else if (meta !== EMPTY_SNAPSHOT) {
            setMeta(EMPTY_SNAPSHOT);
          }
          setFrame(frameOut);
        }
        rafId = requestAnimationFrame(loop);
      };

      lastTime = performance.now();
      const first = tickEngine(0);
      setFrame(first);
      setReady(true);
      startAttractMusic();
      lastPhase = first.phase;
      rafId = requestAnimationFrame(loop);
    })().catch((err) => {
      console.error('Failed to init engine', err);
      setLoadError(true);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modSet]);

  useEffect(() => {
    setVolumes(settings.settings.sfx, settings.settings.music);
  }, [settings.settings.sfx, settings.settings.music]);

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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (frame?.phase === 'attract' && (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyZ')) {
        // Only auto-start from attract when no mode-hub is open; handled by App.
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [frame?.phase]);

  void hiscores;
  void caps;
  void INPUT_FIRE;
  void INPUT_START;
  void dailyFor; // keep import warmed

  return { frame, meta, ready, loadError, api: apiRef.current };
}
