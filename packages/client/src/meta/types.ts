/**
 * Shared meta-layer types: modes, ships, power-ups, missions, upgrades,
 * daily challenges, easter eggs, persistent progression.
 *
 * The WASM engine knows nothing about any of this — it's an overlay that
 * sits between the React UI and the engine's `tick()`. Classic mode is a
 * pure passthrough; the other modes layer score multipliers, pickups,
 * objective tracking and modifiers on top.
 */

export type GameMode =
  | 'classic'
  | 'arcadePlus'
  | 'daily'
  | 'mission'
  | 'endless';

export const GAME_MODES: GameMode[] = [
  'classic',
  'arcadePlus',
  'daily',
  'mission',
  'endless',
];

export type ShipId = 'fighter' | 'interceptor' | 'heavy' | 'phantom' | 'rainbow';

export interface ShipStats {
  id: ShipId;
  name: string;
  tagline: string;
  /** Movement speed multiplier applied client-side as a hint (cosmetic — engine still drives). */
  speedMul: number;
  /** Fire-rate multiplier shown in HUD / hangar — bonus credits per kill in active runs. */
  fireRateMul: number;
  /** Display HP — multiplier on starting lives (Heavy = 2x). */
  livesMul: number;
  /** Hitbox tag for narrative — Interceptor "thinner", visual only. */
  hitboxTag: 'normal' | 'thin' | 'wide';
  /** Whether the ship has the "phantom dash" capability (secret/cosmetic burst). */
  dash: boolean;
  /** Primary palette accent. */
  accent: string;
  /** Secret? if true only unlocks through easter egg discovery. */
  secret: boolean;
}

export type PowerUpId =
  | 'rapidFire'
  | 'spreadShot'
  | 'laserBeam'
  | 'shield'
  | 'bomb'
  | 'magnet';

export interface PowerUpDef {
  id: PowerUpId;
  name: string;
  /** One-line description shown in HUD / hangar tooltip. */
  description: string;
  /** Glyph rendered on the HUD chip + pickup sprite. */
  glyph: string;
  /** HUD accent colour. */
  color: string;
  /** Duration in frames (60 fps). 0 = instant effect (e.g. bomb). */
  durationFrames: number;
  /** Base score multiplier while active. 1.0 = no bonus. */
  scoreMul: number;
  /** Per-shot credit bonus while active (only counts during real play). */
  creditPerKill: number;
}

export interface PowerUpDrop {
  id: PowerUpId;
  /** Native arcade x/y (224x288). */
  x: number;
  y: number;
  /** Vertical drift speed in px/frame. */
  vy: number;
  /** Lifetime frames remaining. */
  ttl: number;
  /** Whether the magnet effect is pulling toward player. */
  attracted: boolean;
}

export type ActivePowerUp = {
  id: PowerUpId;
  framesLeft: number;
};

export interface MissionObjective {
  id: string;
  /** Human readable objective shown in briefing + tracker. */
  text: string;
  /** Target count for progress. */
  target: number;
}

export type MissionEventKind =
  | 'enemy_kill'
  | 'boss_kill'
  | 'diving_kill'
  | 'powerup_pickup'
  | 'stage_clear'
  | 'challenge_perfect'
  | 'no_death'
  | 'reach_stage'
  | 'score_gate'
  | 'survive_frames';

export interface MissionEvent {
  kind: MissionEventKind;
  /** Optional payload (score for score_gate, stage number for reach_stage). */
  value?: number;
}

export interface MissionDef {
  id: string;
  name: string;
  /** Short narrative hook. */
  brief: string;
  /** Star-rating tiers — at least one objective must be satisfied for a star. */
  objectives: MissionObjective[];
  /** Suggested ship — optional. */
  recommendedShip?: ShipId;
  /** Stage range to play through. */
  stageRange: { start: number; end: number };
  /** Reward in credits for completion. */
  rewardCredits: number;
  /** Locked-by-default? unlocked by completing previous mission. */
  requires?: string;
}

export interface MissionRunState {
  missionId: string;
  /** Per-objective progress counters keyed by objective id. */
  progress: Record<string, number>;
  /** Stages cleared so far during this run. */
  stagesCleared: number;
  /** Final star count once complete. */
  stars: 0 | 1 | 2 | 3;
  /** Whether the player has died at all in this run. */
  diedOnce: boolean;
}

export interface DailyChallenge {
  /** ISO date string (UTC). */
  date: string;
  /** Deterministic seed derived from `date`. */
  seed: number;
  /** Active modifiers (1–3). */
  modifiers: DailyModifier[];
  /** Suggested starting stage. */
  startStage: number;
  /** Cosmetic title for the day. */
  title: string;
}

export type DailyModifier =
  | 'noFire30s'
  | 'doubleSpeedDives'
  | 'bossRush'
  | 'tinyShip'
  | 'invertedControls'
  | 'oneShotOneKill'
  | 'mirroredScreen'
  | 'maxPowerUps';

export interface DailyModifierDef {
  id: DailyModifier;
  name: string;
  description: string;
  /** Reward credit multiplier. */
  rewardMul: number;
}

export interface DailyStreak {
  /** Days currently in a row. */
  current: number;
  /** All-time best. */
  best: number;
  /** ISO date of the most recent completion. */
  lastCompletedDate: string | null;
  /** Set of ISO date strings that have been completed. */
  completedDates: string[];
}

export type UpgradeId =
  | 'fireRate'
  | 'speed'
  | 'lives'
  | 'bombCapacity'
  | 'powerUpDuration'
  | 'creditMul';

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  description: string;
  maxLevel: number;
  /** Credit cost per level — costs[level] is what you pay to go to level+1. */
  costs: number[];
}

export type EasterEggId =
  | 'konami'
  | 'click7'
  | 'score7777'
  | 'rescuePerfect'
  | 'namcoFormation'
  | 'secretShipUnlock'
  | 'rainbowMode'
  | 'retroDebug';

export interface EasterEggDef {
  id: EasterEggId;
  name: string;
  /** Vague hint shown on the secrets screen. */
  hint: string;
  /** Reward in credits. */
  reward: number;
}

export interface MetaProgression {
  /** Total credits banked. */
  credits: number;
  /** Total lifetime credits earned (not spent). */
  lifetimeCredits: number;
  /** Selected ship for next Arcade+/Mission run. */
  selectedShip: ShipId;
  /** Upgrade levels, defaulting to 0. */
  upgrades: Record<UpgradeId, number>;
  /** Easter eggs discovered. */
  discovered: EasterEggId[];
  /** Ships unlocked through easter eggs (Fighter is always unlocked). */
  unlockedShips: ShipId[];
  /** Missions completed by id. */
  completedMissions: string[];
  /** Stars earned per mission. */
  missionStars: Record<string, 0 | 1 | 2 | 3>;
  /** Endless mode personal best score. */
  endlessBest: number;
  /** Daily streak. */
  daily: DailyStreak;
  /** Side quests completed inside Arcade+ runs (lifetime). */
  sideQuestsCompleted: number;
}

export interface RunContext {
  mode: GameMode;
  ship: ShipId;
  missionId?: string;
  daily?: DailyChallenge;
  /** Whether the rainbow easter egg modifier is enabled. */
  rainbow?: boolean;
}

export interface SideQuestDef {
  id: string;
  /** Short objective shown as a toast. */
  text: string;
  target: number;
  event: MissionEventKind;
  reward: number;
}

export interface ToastMessage {
  id: string;
  kind: 'powerup' | 'sidequest' | 'mission' | 'unlock' | 'streak' | 'info';
  title: string;
  detail?: string;
  /** Frames remaining in the on-screen lifetime. */
  ttl: number;
}
