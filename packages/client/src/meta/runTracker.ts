/**
 * Run tracker — the bridge between the WASM engine's frame events and the
 * meta layer (modes, missions, side quests, daily challenges, easter eggs).
 *
 * The tracker observes successive FrameState snapshots and emits meta-level
 * events: kill, boss-kill, diving-kill, stage-clear, perfect-challenge,
 * score-gate, survival, deaths, and so on. Pure state machine — no React.
 */

import type { FrameState } from '../state/frame';
import type {
  MissionRunState,
  ActivePowerUp,
  PowerUpDrop,
  PowerUpId,
  ShipId,
  SideQuestDef,
  ToastMessage,
  RunContext,
  EasterEggId,
} from './types';
import { POWER_UPS, pickPowerUpForKill } from './powerups';
import { SIDE_QUESTS, pickSideQuests } from './sideQuests';
import { SHIPS } from './ships';

export interface RunTrackerState {
  ctx: RunContext;
  kills: number;
  bossKills: number;
  divingKills: number;
  rescues: number;
  stagesCleared: number;
  powerUpsCollected: number;
  perfectChallenges: number;
  bombsBanked: number;
  highestStage: number;
  /** Running combo — bumps on each kill, decays after a window without kills. */
  combo: number;
  comboTimer: number;
  bestCombo: number;
  /** Score awarded by meta layer on top of engine score (counted toward credits, not engine HUD). */
  bonusScore: number;
  /** Score multiplier currently applied (clamps to a sensible range). */
  scoreMul: number;
  /** Frames since last death — used for "no death" side quest. */
  framesSinceDeath: number;
  /** Has the player died at all in this run? */
  diedOnce: boolean;
  /** Active power-ups (with frames remaining). */
  active: ActivePowerUp[];
  /** Power-up pickup drops floating on screen. */
  drops: PowerUpDrop[];
  /** Side quests assigned to this run. */
  sideQuests: SideQuestProgress[];
  /** Toast messages to render in the HUD. */
  toasts: ToastMessage[];
  /** For mission mode: per-objective progress. */
  mission?: MissionRunState;
  /** Sequence of audio cues this layer wants to play this frame. */
  audio: string[];
  /** Tick counter (frames). */
  frame: number;
  /** Total credits banked from this run so far. */
  credits: number;
  /** Last engine frame we sampled — to detect frame boundary changes. */
  lastEngineFrame: number;
  /** Last engine stage observed. */
  lastEngineStage: number;
  /** Last engine score sampled — for delta-based events. */
  lastEngineScore: number;
  /** Last engine lives observed. */
  lastEngineLives: number;
  /** Tracked challenge state to detect transitions. */
  lastChallengeComplete: boolean;
  /** Whether to allow the bomb-pickup to schedule a screen clear. */
  pendingBombClear: number;
  /** Easter egg signals raised this tick (consumed by host). */
  raisedEggs: EasterEggId[];
  /** Hidden 7777 score lock — once granted, do not regrant. */
  score7777Awarded: boolean;
  /** Whether the namco formation easter egg has been raised this run. */
  namcoAwarded: boolean;
  /** Cumulative frames the player has survived (for survive_frames side quest). */
  survivalFrames: number;
}

export interface SideQuestProgress {
  def: SideQuestDef;
  progress: number;
  done: boolean;
  toasted: boolean;
}

export function newRunTracker(ctx: RunContext): RunTrackerState {
  const sideQuests =
    ctx.mode === 'arcadePlus'
      ? pickSideQuests(Date.now() & 0x7fffffff, 3).map((def) => ({
          def,
          progress: 0,
          done: false,
          toasted: false,
        }))
      : [];

  return {
    ctx,
    kills: 0,
    bossKills: 0,
    divingKills: 0,
    rescues: 0,
    stagesCleared: 0,
    powerUpsCollected: 0,
    perfectChallenges: 0,
    bombsBanked: 0,
    highestStage: 1,
    combo: 0,
    comboTimer: 0,
    bestCombo: 0,
    bonusScore: 0,
    scoreMul: 1.0,
    framesSinceDeath: 0,
    diedOnce: false,
    active: [],
    drops: [],
    sideQuests,
    toasts: [],
    mission:
      ctx.mode === 'mission' && ctx.missionId
        ? {
            missionId: ctx.missionId,
            progress: {},
            stagesCleared: 0,
            stars: 0,
            diedOnce: false,
          }
        : undefined,
    audio: [],
    frame: 0,
    credits: 0,
    lastEngineFrame: -1,
    lastEngineStage: -1,
    lastEngineScore: 0,
    lastEngineLives: 0,
    lastChallengeComplete: false,
    pendingBombClear: 0,
    raisedEggs: [],
    score7777Awarded: false,
    namcoAwarded: false,
    survivalFrames: 0,
  };
}

interface TickResult {
  /** True if the meta layer wants to call `debug_skip_stage()` to bomb the screen. */
  shouldBombScreen: boolean;
  /** Easter egg ids newly raised this frame. */
  newEggs: EasterEggId[];
}

const COMBO_DECAY_FRAMES = 90;
const MAGNET_RANGE_PX = 80;

export function tickRunTracker(
  s: RunTrackerState,
  frame: FrameState,
): TickResult {
  s.frame++;
  s.audio.length = 0;
  s.raisedEggs.length = 0;
  const result: TickResult = { shouldBombScreen: false, newEggs: [] };

  if (s.lastEngineFrame === -1) {
    s.lastEngineStage = frame.stage;
    s.lastEngineScore = frame.score;
    s.lastEngineLives = frame.lives;
  }
  s.lastEngineFrame = frame.frame;

  // Phase-driven events.
  if (frame.phase === 'playing' || frame.phase === 'player_dying') {
    s.survivalFrames++;
    s.framesSinceDeath++;
  }

  // Stage clear detection.
  if (frame.stage > s.lastEngineStage) {
    s.stagesCleared++;
    s.highestStage = Math.max(s.highestStage, frame.stage);
    onSideQuestEvent(s, 'stage_clear', 1);
    if (s.mission) {
      bumpObjective(s.mission, 'clear_stages', 1);
      s.mission.stagesCleared++;
      bumpObjective(s.mission, 'reach_stage', frame.stage);
    }
    s.lastEngineStage = frame.stage;

    // Namco formation easter egg — stage 88.
    if (frame.stage === 88 && !s.namcoAwarded) {
      s.namcoAwarded = true;
      s.raisedEggs.push('namcoFormation');
      result.newEggs.push('namcoFormation');
    }
  }

  // Death detection — lives went down.
  if (frame.lives < s.lastEngineLives) {
    s.diedOnce = true;
    s.framesSinceDeath = 0;
    if (s.mission) s.mission.diedOnce = true;
    // Reset combo.
    s.combo = 0;
    s.comboTimer = 0;
  }
  s.lastEngineLives = frame.lives;

  // Score delta → kill counting.
  const dScore = Math.max(0, frame.score - s.lastEngineScore);
  if (dScore > 0) {
    // Heuristic — small dscore=zako, larger=goei, big=boss, very big=set bonus.
    const inferredKills =
      dScore >= 800 ? 1 : dScore >= 150 ? 1 : dScore >= 50 ? 1 : 0;
    const inferredBoss = dScore >= 800 && dScore < 1100;
    const inferredDiving = dScore === 100 || dScore === 160 || dScore === 400 || dScore === 1000 || dScore === 1600;
    if (inferredKills > 0) {
      s.kills += inferredKills;
      if (inferredBoss) s.bossKills += 1;
      if (inferredDiving) s.divingKills += 1;
      bumpCombo(s);
      onSideQuestEvent(s, 'enemy_kill', inferredKills);
      if (inferredBoss) onSideQuestEvent(s, 'boss_kill', 1);
      if (inferredDiving) onSideQuestEvent(s, 'diving_kill', 1);
      if (s.mission) {
        bumpObjective(s.mission, 'kill_count', inferredKills);
        if (inferredBoss) bumpObjective(s.mission, 'boss_kills', 1);
        if (inferredDiving) bumpObjective(s.mission, 'diving_kills', 1);
      }

      // Power-up drop?
      if (s.ctx.mode !== 'classic') {
        const dropRate = s.ctx.mode === 'mission' || s.ctx.mode === 'arcadePlus' ? 1 : 1;
        const dropChance = s.ctx.daily?.modifiers.includes('maxPowerUps') ? 4 : 1;
        const id = pickPowerUpForKill(
          s.kills * dropChance * dropRate,
          frame.frame & 0xffff,
        );
        if (id) {
          spawnPowerUpDrop(s, id, framePlayerX(frame), framePlayerY(frame) - 24);
        }
      }
    }
    // Rescue detection (1000 = rescue score pop in engine).
    if (dScore === 1000) {
      s.rescues += 1;
      if (s.mission) bumpObjective(s.mission, 'rescue', 1);
    }
  }
  s.lastEngineScore = frame.score;

  // Score gate: 7777 easter egg.
  if (!s.score7777Awarded && frame.score >= 7777 && frame.score - dScore < 7777) {
    s.score7777Awarded = true;
    s.raisedEggs.push('score7777');
    result.newEggs.push('score7777');
  }
  // Score gate side quest.
  if (frame.score >= 15000) onSideQuestEvent(s, 'score_gate', frame.score);
  if (s.mission) bumpObjective(s.mission, 'score', frame.score);

  // Challenge perfect detection.
  if (
    frame.challenge_complete &&
    frame.challenge_perfect &&
    !s.lastChallengeComplete
  ) {
    s.perfectChallenges += 1;
    onSideQuestEvent(s, 'challenge_perfect', 1);
    if (s.mission) bumpObjective(s.mission, 'perfect_challenge', 1);
    // Combined rescue + perfect = rescuePerfect easter egg.
    if (s.rescues > 0) {
      s.raisedEggs.push('rescuePerfect');
      result.newEggs.push('rescuePerfect');
    }
  }
  s.lastChallengeComplete = frame.challenge_complete;

  // Power-up drift + collection.
  if (s.drops.length > 0) {
    const px = framePlayerX(frame);
    const py = framePlayerY(frame);
    const magnetActive = s.active.some((a) => a.id === 'magnet');
    for (const d of s.drops) {
      // Magnet attracts pickups within range.
      if (magnetActive || d.attracted) {
        const dx = px - d.x;
        const dy = py - d.y;
        const dist = Math.hypot(dx, dy);
        if (magnetActive || dist < MAGNET_RANGE_PX) {
          d.attracted = true;
          const speed = magnetActive ? 3.2 : 2;
          if (dist > 0) {
            d.x += (dx / dist) * speed;
            d.y += (dy / dist) * speed;
          }
        }
      } else {
        d.y += d.vy;
      }
      d.ttl -= 1;
      // Collision with player (16x16).
      if (Math.abs(d.x - px) < 14 && Math.abs(d.y - py) < 14) {
        collectPowerUp(s, d.id);
        d.ttl = 0;
      }
    }
    s.drops = s.drops.filter((d) => d.ttl > 0 && d.y < 320);
  }

  // Tick active power-ups.
  let scoreMul = 1;
  if (s.active.length > 0) {
    for (const a of s.active) a.framesLeft -= 1;
    s.active = s.active.filter((a) => a.framesLeft > 0);
    for (const a of s.active) {
      const def = POWER_UPS[a.id];
      if (def) scoreMul = Math.max(scoreMul, def.scoreMul);
    }
  }
  s.scoreMul = scoreMul;

  // Combo decay.
  if (s.comboTimer > 0) {
    s.comboTimer -= 1;
    if (s.comboTimer === 0) {
      s.combo = 0;
    }
  }

  // Survival side quest tick.
  if (frame.phase === 'playing') {
    onSideQuestEvent(s, 'survive_frames', s.survivalFrames);
    if (s.mission) bumpObjective(s.mission, 'survive_frames', s.survivalFrames);
  }

  // Toast lifetime decay.
  if (s.toasts.length > 0) {
    s.toasts = s.toasts
      .map((t) => ({ ...t, ttl: t.ttl - 1 }))
      .filter((t) => t.ttl > 0);
  }

  // Bomb pickup → request screen clear next frame.
  if (s.pendingBombClear > 0) {
    s.pendingBombClear -= 1;
    if (s.pendingBombClear === 0) {
      result.shouldBombScreen = true;
    }
  }

  return result;
}

function spawnPowerUpDrop(
  s: RunTrackerState,
  id: PowerUpId,
  x: number,
  y: number,
) {
  // Cap concurrent drops to avoid clutter.
  if (s.drops.length > 6) return;
  s.drops.push({ id, x, y, vy: 0.6, ttl: 420, attracted: false });
}

function collectPowerUp(s: RunTrackerState, id: PowerUpId) {
  const def = POWER_UPS[id];
  if (!def) return;
  s.powerUpsCollected += 1;
  s.audio.push('powerup_pickup');
  pushToast(s, {
    id: `pu-${id}-${s.frame}`,
    kind: 'powerup',
    title: `${def.glyph}  ${def.name}`,
    detail: def.description,
    ttl: 110,
  });

  if (id === 'bomb') {
    s.bombsBanked++;
    s.pendingBombClear = 12;
    s.audio.push('bomb_clear');
  } else {
    // Stack or refresh duration.
    const dur = Math.round(def.durationFrames * (1 + 0.15 * upgradeLevel(s, 'powerUpDuration')));
    const existing = s.active.find((a) => a.id === id);
    if (existing) existing.framesLeft = Math.max(existing.framesLeft, dur);
    else s.active.push({ id, framesLeft: dur });
  }
  onSideQuestEvent(s, 'powerup_pickup', 1);
  if (s.mission) bumpObjective(s.mission, 'powerup_count', 1);
}

function bumpCombo(s: RunTrackerState) {
  s.combo += 1;
  s.bestCombo = Math.max(s.bestCombo, s.combo);
  s.comboTimer = COMBO_DECAY_FRAMES;
  // Credits earned per combo tier.
  const ship = SHIPS[s.ctx.ship];
  const tierBonus = Math.floor(s.combo / 5);
  const earned = 1 + tierBonus + upgradeLevel(s, 'fireRate');
  s.credits += Math.round(earned * (ship?.fireRateMul ?? 1));
  // Award power-up bonus score that's flagged separately.
  s.bonusScore += Math.round(20 * (s.scoreMul - 1));
}

function pushToast(s: RunTrackerState, t: ToastMessage) {
  s.toasts.push(t);
}

function bumpObjective(m: MissionRunState, id: string, amount: number) {
  const prev = m.progress[id] ?? 0;
  // For "reach_stage" / "score" / "survive_frames" we store the max value.
  if (id === 'reach_stage' || id === 'score' || id === 'survive_frames') {
    m.progress[id] = Math.max(prev, amount);
  } else {
    m.progress[id] = prev + amount;
  }
}

function onSideQuestEvent(
  s: RunTrackerState,
  event: string,
  value: number,
) {
  if (s.sideQuests.length === 0) return;
  for (const q of s.sideQuests) {
    if (q.def.event !== event || q.done) continue;
    if (event === 'score_gate' || event === 'survive_frames') {
      q.progress = Math.max(q.progress, value);
    } else {
      q.progress += value;
    }
    if (!q.toasted && q.progress > 0) {
      q.toasted = true;
      pushToast(s, {
        id: `sq-${q.def.id}-${s.frame}`,
        kind: 'sidequest',
        title: 'SIDE QUEST',
        detail: q.def.text,
        ttl: 140,
      });
    }
    if (q.progress >= q.def.target) {
      q.done = true;
      s.credits += q.def.reward;
      s.audio.push('sidequest_done');
      pushToast(s, {
        id: `sq-done-${q.def.id}-${s.frame}`,
        kind: 'sidequest',
        title: 'SIDE QUEST CLEAR',
        detail: `${q.def.text} · +${q.def.reward} CR`,
        ttl: 160,
      });
    }
  }
}

function upgradeLevel(s: RunTrackerState, _id: string): number {
  // Tracker doesn't own progression upgrades — caller patches them in.
  // Default 0 if not present.
  void _id;
  return 0;
}

function framePlayerX(frame: FrameState): number {
  // Player sprite is first in the engine's frame state.
  return frame.sprites[0]?.x ?? 104;
}

function framePlayerY(frame: FrameState): number {
  return frame.sprites[0]?.y ?? 252;
}

/** Compute mission stars from the current tracker state. */
export function computeStars(
  m: MissionRunState,
  objectives: Array<{ id: string; target: number }>,
): 0 | 1 | 2 | 3 {
  let stars = 0;
  for (const o of objectives) {
    const got = m.progress[o.id] ?? 0;
    if (got >= o.target) stars++;
  }
  // No-death star can be implicit if id includes 'no_death'.
  if (m.diedOnce) {
    // strip any 'no_death' achievements that snuck in.
    const ndObj = objectives.find((o) => o.id === 'no_death');
    if (ndObj && (m.progress['no_death'] ?? 0) >= ndObj.target && m.diedOnce) {
      stars = Math.max(0, stars - 1);
    }
  } else {
    // Award a no-death star if the objective exists.
    const ndObj = objectives.find((o) => o.id === 'no_death');
    if (ndObj && stars < 3) {
      // Already counted via m.progress.no_death? Only credit once.
      const already = (m.progress['no_death'] ?? 0) >= 1;
      if (!already) {
        m.progress['no_death'] = 1;
        stars++;
      }
    }
  }
  return Math.min(3, Math.max(0, stars)) as 0 | 1 | 2 | 3;
}

export const _SIDE_QUEST_REF = SIDE_QUESTS; // keep import warmed for tree-shake-safety
