import type { SideQuestDef } from './types';

/**
 * Side quests are surprise objectives that pop up during Arcade+ runs.
 * Each run picks ~3 of these at random; players see a toast when they
 * unlock and another when they complete (with credit reward).
 */
export const SIDE_QUESTS: SideQuestDef[] = [
  {
    id: 'destroy_5_divers',
    text: 'DESTROY 5 DIVING BOSSES',
    target: 5,
    event: 'diving_kill',
    reward: 80,
  },
  {
    id: 'collect_3_powerups',
    text: 'COLLECT 3 POWER-UPS',
    target: 3,
    event: 'powerup_pickup',
    reward: 60,
  },
  {
    id: 'clear_2_stages',
    text: 'CLEAR 2 STAGES',
    target: 2,
    event: 'stage_clear',
    reward: 50,
  },
  {
    id: 'score_15k',
    text: 'SCORE 15,000',
    target: 15000,
    event: 'score_gate',
    reward: 70,
  },
  {
    id: 'kill_30_zako',
    text: 'TAKE OUT 30 ENEMIES',
    target: 30,
    event: 'enemy_kill',
    reward: 40,
  },
  {
    id: 'rescue_perfect',
    text: 'PERFECT CHALLENGE STAGE',
    target: 1,
    event: 'challenge_perfect',
    reward: 200,
  },
  {
    id: 'no_death_60s',
    text: 'NO DEATH FOR 60 SECONDS',
    target: 60 * 60,
    event: 'survive_frames',
    reward: 90,
  },
  {
    id: 'kill_8_bosses',
    text: 'TAKE OUT 8 BOSSES',
    target: 8,
    event: 'boss_kill',
    reward: 120,
  },
];

/** Deterministic pick of `count` side quests for a given seed. */
export function pickSideQuests(seed: number, count = 3): SideQuestDef[] {
  const order = SIDE_QUESTS.slice();
  let s = seed >>> 0;
  // Fisher–Yates with seeded LCG.
  for (let i = order.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0;
    const j = s % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order.slice(0, Math.min(count, order.length));
}
