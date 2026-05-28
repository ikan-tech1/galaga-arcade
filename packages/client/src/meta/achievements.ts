/**
 * Achievement system — 25+ unlocks tracked from RunTracker + MetaProgression
 * snapshots. Each achievement has a small predicate that runs against the
 * current state; if true and not yet earned, the host fires a toast + bumps
 * the persistent set.
 *
 * Achievements are pure data. The host wires them into useAchievements which
 * persists earned ids + grants credits. They appear in the Hangar trophy
 * case + drive a few special unlocks (ship skins).
 */

import type { GameMode, MetaProgression, ShipSkinId } from './types';

export type AchievementCategory =
  | 'combat'
  | 'mastery'
  | 'modes'
  | 'meta'
  | 'secret';

export interface AchievementContext {
  meta: MetaProgression;
  /** Score on the current/just-finished run. */
  runScore: number;
  /** Final stage reached during the run. */
  runStage: number;
  /** Best combo on the run. */
  runBestCombo: number;
  /** Total kills on the run. */
  runKills: number;
  /** Boss kills on the run. */
  runBossKills: number;
  /** Power-ups picked up on the run. */
  runPowerUps: number;
  /** Whether the player completed the run without dying. */
  runNoDeath: boolean;
  /** Side quests cleared this run. */
  runSideQuests: number;
  /** Mode of the just-finished run. */
  runMode: GameMode;
  /** Total credits the run banked (post-multipliers). */
  runCredits: number;
  /** Total elite-boss kills (meta-layer overlay). */
  runEliteBossKills?: number;
  /** Number of hazards survived. */
  runHazardsSurvived?: number;
  /** Whether a flawless mission was accomplished. */
  runFlawlessMission?: boolean;
}

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  reward: number;
  glyph: string;
  /** Optional ship skin granted on unlock. */
  unlockSkin?: ShipSkinId;
  /** True if discovering should be hidden until earned. */
  hidden?: boolean;
  predicate: (ctx: AchievementContext) => boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // --- Combat -----------------------------------------------------------
  {
    id: 'first_blood',
    name: 'First Blood',
    description: 'Land your first kill.',
    category: 'combat',
    reward: 50,
    glyph: '✦',
    predicate: (c) => c.runKills >= 1,
  },
  {
    id: 'fly_swatter',
    name: 'Fly Swatter',
    description: 'Kill 100 enemies in one run.',
    category: 'combat',
    reward: 200,
    glyph: '⚔',
    predicate: (c) => c.runKills >= 100,
  },
  {
    id: 'exterminator',
    name: 'Exterminator',
    description: 'Kill 250 enemies in one run.',
    category: 'combat',
    reward: 400,
    glyph: '☠',
    unlockSkin: 'crimson',
    predicate: (c) => c.runKills >= 250,
  },
  {
    id: 'boss_buster',
    name: 'Boss Buster',
    description: 'Down 10 bosses in one run.',
    category: 'combat',
    reward: 300,
    glyph: '★',
    predicate: (c) => c.runBossKills >= 10,
  },
  {
    id: 'combo_5',
    name: 'On a Roll',
    description: 'Reach a 5-kill combo.',
    category: 'combat',
    reward: 100,
    glyph: '⌬',
    predicate: (c) => c.runBestCombo >= 5,
  },
  {
    id: 'combo_15',
    name: 'Untouchable',
    description: 'Reach a 15-kill combo.',
    category: 'combat',
    reward: 350,
    glyph: '✷',
    unlockSkin: 'azure',
    predicate: (c) => c.runBestCombo >= 15,
  },
  {
    id: 'combo_30',
    name: 'Perfect Storm',
    description: 'Reach a 30-kill combo.',
    category: 'combat',
    reward: 800,
    glyph: '⚡',
    unlockSkin: 'voidstorm',
    predicate: (c) => c.runBestCombo >= 30,
  },

  // --- Score / Mastery --------------------------------------------------
  {
    id: 'score_50k',
    name: 'Half Way There',
    description: 'Score 50,000 in one run.',
    category: 'mastery',
    reward: 150,
    glyph: '5⃣',
    predicate: (c) => c.runScore >= 50000,
  },
  {
    id: 'score_100k',
    name: 'Six Figures',
    description: 'Score 100,000 in one run.',
    category: 'mastery',
    reward: 400,
    glyph: '🅰',
    predicate: (c) => c.runScore >= 100000,
  },
  {
    id: 'score_300k',
    name: 'Galactic Ace',
    description: 'Score 300,000 in one run.',
    category: 'mastery',
    reward: 1200,
    glyph: '👑',
    unlockSkin: 'gold',
    predicate: (c) => c.runScore >= 300000,
  },
  {
    id: 'stage_10',
    name: 'Deep Dive',
    description: 'Reach stage 10.',
    category: 'mastery',
    reward: 300,
    glyph: '↓',
    predicate: (c) => c.runStage >= 10,
  },
  {
    id: 'stage_20',
    name: 'Outer Rim',
    description: 'Reach stage 20.',
    category: 'mastery',
    reward: 600,
    glyph: '⊝',
    predicate: (c) => c.runStage >= 20,
  },
  {
    id: 'stage_30',
    name: 'Beyond the Edge',
    description: 'Reach stage 30.',
    category: 'mastery',
    reward: 1000,
    glyph: '∞',
    unlockSkin: 'phaze',
    predicate: (c) => c.runStage >= 30,
  },

  // --- Modes ------------------------------------------------------------
  {
    id: 'arcade_clear',
    name: 'Arcade Apprentice',
    description: 'Complete a stage in Arcade+.',
    category: 'modes',
    reward: 100,
    glyph: '◇',
    predicate: (c) => c.runMode === 'arcadePlus' && c.runStage >= 2,
  },
  {
    id: 'mission_three_star',
    name: 'Top of Class',
    description: 'Earn 3 stars on any mission.',
    category: 'modes',
    reward: 400,
    glyph: '★★★',
    predicate: (c) => Object.values(c.meta.missionStars).some((s) => s === 3),
  },
  {
    id: 'mission_five_clear',
    name: 'Squad Leader',
    description: 'Complete 5 missions.',
    category: 'modes',
    reward: 500,
    glyph: '⛨',
    predicate: (c) => c.meta.completedMissions.length >= 5,
  },
  {
    id: 'all_missions',
    name: 'Galaga Legend',
    description: 'Complete all missions.',
    category: 'modes',
    reward: 2000,
    glyph: '⚜',
    unlockSkin: 'rainbow',
    predicate: (c) => c.meta.completedMissions.length >= 10,
  },
  {
    id: 'daily_streak_3',
    name: 'Triple Crown',
    description: 'Hit a 3-day daily streak.',
    category: 'modes',
    reward: 250,
    glyph: '☼',
    predicate: (c) => c.meta.daily.current >= 3,
  },
  {
    id: 'daily_streak_7',
    name: 'Weekly Pro',
    description: 'Hit a 7-day daily streak.',
    category: 'modes',
    reward: 700,
    glyph: '⚜',
    unlockSkin: 'solar',
    predicate: (c) => c.meta.daily.current >= 7,
  },
  {
    id: 'endless_50k',
    name: 'Endless Pioneer',
    description: 'Score 50,000 in Endless.',
    category: 'modes',
    reward: 200,
    glyph: '∮',
    predicate: (c) => c.runMode === 'endless' && c.runScore >= 50000,
  },
  {
    id: 'endless_150k',
    name: 'Endless Champion',
    description: 'Score 150,000 in Endless.',
    category: 'modes',
    reward: 600,
    glyph: '✺',
    unlockSkin: 'inferno',
    predicate: (c) => c.runMode === 'endless' && c.runScore >= 150000,
  },

  // --- Meta -------------------------------------------------------------
  {
    id: 'first_upgrade',
    name: 'Engineer',
    description: 'Buy your first upgrade.',
    category: 'meta',
    reward: 100,
    glyph: '⚙',
    predicate: (c) =>
      Object.values(c.meta.upgrades).some((lvl) => lvl > 0),
  },
  {
    id: 'maxed_upgrade',
    name: 'Pinnacle',
    description: 'Max out any upgrade.',
    category: 'meta',
    reward: 600,
    glyph: '⛏',
    predicate: (c) =>
      Object.values(c.meta.upgrades).some((lvl) => lvl >= 5),
  },
  {
    id: 'all_ships',
    name: 'Hangar Master',
    description: 'Unlock every ship.',
    category: 'meta',
    reward: 800,
    glyph: '☄',
    predicate: (c) => c.meta.unlockedShips.length >= 5,
  },
  {
    id: 'side_quest_5',
    name: 'Side Hustle',
    description: 'Complete 5 side quests.',
    category: 'meta',
    reward: 250,
    glyph: '◴',
    predicate: (c) => c.meta.sideQuestsCompleted >= 5,
  },
  {
    id: 'side_quest_25',
    name: 'Quest Devotee',
    description: 'Complete 25 side quests.',
    category: 'meta',
    reward: 750,
    glyph: '◈',
    unlockSkin: 'jade',
    predicate: (c) => c.meta.sideQuestsCompleted >= 25,
  },
  {
    id: 'flawless_mission',
    name: 'Flawless',
    description: 'Clear a mission without dying.',
    category: 'meta',
    reward: 500,
    glyph: '◊',
    predicate: (c) => c.runFlawlessMission === true,
  },

  // --- Secret -----------------------------------------------------------
  {
    id: 'secret_collector',
    name: 'Secret Collector',
    description: 'Discover 5 easter eggs.',
    category: 'secret',
    reward: 600,
    glyph: '?',
    hidden: true,
    predicate: (c) => c.meta.discovered.length >= 5,
  },
  {
    id: 'pacifist',
    name: 'Pacifist Run',
    description: 'Survive 60 seconds without firing — set the run with no-fire mod.',
    category: 'secret',
    reward: 400,
    glyph: '☮',
    hidden: true,
    predicate: (c) =>
      c.runMode === 'daily' && c.runStage >= 2 && c.runScore < 200,
  },
  {
    id: 'elite_hunter',
    name: 'Elite Hunter',
    description: 'Defeat an Elite Boss variant.',
    category: 'secret',
    reward: 750,
    glyph: '☢',
    hidden: true,
    predicate: (c) => (c.runEliteBossKills ?? 0) >= 1,
  },
  {
    id: 'storm_rider',
    name: 'Storm Rider',
    description: 'Survive a cosmic storm in Endless.',
    category: 'secret',
    reward: 350,
    glyph: '☷',
    hidden: true,
    predicate: (c) => (c.runHazardsSurvived ?? 0) >= 1,
  },
  {
    id: 'completionist',
    name: 'Completionist',
    description: 'Earn every other achievement first.',
    category: 'secret',
    reward: 3000,
    glyph: '★',
    hidden: true,
    unlockSkin: 'platinum',
    predicate: () => false, // host evaluates this specially.
  },
];

export const ACHIEVEMENT_BY_ID: Record<string, AchievementDef> =
  Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));

/** Find achievements that just became true given the new context. */
export function findNewlyEarned(
  earned: ReadonlySet<string>,
  ctx: AchievementContext,
): AchievementDef[] {
  const fresh: AchievementDef[] = [];
  for (const a of ACHIEVEMENTS) {
    if (earned.has(a.id)) continue;
    if (a.id === 'completionist') continue; // computed separately.
    try {
      if (a.predicate(ctx)) fresh.push(a);
    } catch {
      /* defensive */
    }
  }
  // Completionist — earned every other.
  if (!earned.has('completionist')) {
    const totalNonCompletion = ACHIEVEMENTS.length - 1;
    const have = ACHIEVEMENTS.filter(
      (a) => a.id !== 'completionist' && earned.has(a.id),
    ).length + fresh.length;
    if (have >= totalNonCompletion) {
      const def = ACHIEVEMENT_BY_ID.completionist;
      if (def) fresh.push(def);
    }
  }
  return fresh;
}
