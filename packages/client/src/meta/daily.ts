import type { DailyChallenge, DailyModifier, DailyModifierDef, DailyStreak } from './types';

export const DAILY_MODIFIERS: Record<DailyModifier, DailyModifierDef> = {
  noFire30s: {
    id: 'noFire30s',
    name: 'NO FIRE 30s',
    description: 'No shooting for the first 30 seconds — dodge everything.',
    rewardMul: 1.5,
  },
  doubleSpeedDives: {
    id: 'doubleSpeedDives',
    name: 'DOUBLE SPEED DIVES',
    description: 'Dive patterns play back at +90% speed.',
    rewardMul: 1.4,
  },
  bossRush: {
    id: 'bossRush',
    name: 'BOSS RUSH',
    description: 'Only Boss Galagas spawn in formation.',
    rewardMul: 1.7,
  },
  tinyShip: {
    id: 'tinyShip',
    name: 'TINY SHIP',
    description: 'Player ship renders 25% smaller. Cosmetic, but unnerving.',
    rewardMul: 1.2,
  },
  invertedControls: {
    id: 'invertedControls',
    name: 'MIRROR DRIVE',
    description: 'Left and right are swapped.',
    rewardMul: 1.6,
  },
  oneShotOneKill: {
    id: 'oneShotOneKill',
    name: 'ONE-SHOT ONE-KILL',
    description: '+500% score multiplier, but no second chances.',
    rewardMul: 2.2,
  },
  mirroredScreen: {
    id: 'mirroredScreen',
    name: 'MIRRORED SCREEN',
    description: 'Display flipped horizontally — re-learn the dive patterns.',
    rewardMul: 1.4,
  },
  maxPowerUps: {
    id: 'maxPowerUps',
    name: 'POWER OVERLOAD',
    description: 'Power-ups drop on nearly every kill.',
    rewardMul: 0.9,
  },
};

const MOD_ORDER: DailyModifier[] = [
  'noFire30s',
  'doubleSpeedDives',
  'bossRush',
  'tinyShip',
  'invertedControls',
  'oneShotOneKill',
  'mirroredScreen',
  'maxPowerUps',
];

const TITLES = [
  'NEBULA RUN',
  'ASTEROID ALLEY',
  'EVENT HORIZON',
  'GALAXY EDGE',
  'METEOR STORM',
  'IRON RAIN',
  'STAR HUNT',
  'BLACK COMET',
  'PLASMA DRIFT',
  'COSMIC VEIL',
  'ARID NEBULA',
  'PHOTON LANE',
  'WORMHOLE GATE',
  'DARK SECTOR',
  'AURORA BORE',
];

export function utcDateKey(d = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(
    d.getUTCDate(),
  ).padStart(2, '0')}`;
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function dailyFor(date = new Date()): DailyChallenge {
  const key = utcDateKey(date);
  const seed = hashSeed(key);
  // Pick 1-3 modifiers deterministically.
  const count = (seed % 3) + 1;
  const used = new Set<DailyModifier>();
  let s = seed;
  while (used.size < count) {
    s = (s * 1103515245 + 12345) >>> 0;
    used.add(MOD_ORDER[s % MOD_ORDER.length]);
  }
  const modifiers = MOD_ORDER.filter((m) => used.has(m));
  const startStage = 1 + ((seed >>> 5) % 4);
  const title = TITLES[seed % TITLES.length];
  return { date: key, seed, modifiers, startStage, title };
}

export function dailyRewardMultiplier(challenge: DailyChallenge): number {
  return challenge.modifiers.reduce((m, id) => m * DAILY_MODIFIERS[id].rewardMul, 1);
}

export function streakAfterCompletion(
  prev: DailyStreak,
  todayKey: string,
): DailyStreak {
  if (prev.lastCompletedDate === todayKey) return prev;
  // Compare consecutive days.
  let nextCurrent = 1;
  if (prev.lastCompletedDate) {
    const last = new Date(prev.lastCompletedDate + 'T00:00:00Z').getTime();
    const today = new Date(todayKey + 'T00:00:00Z').getTime();
    const diff = (today - last) / (24 * 60 * 60 * 1000);
    if (Math.round(diff) === 1) nextCurrent = prev.current + 1;
  }
  const completed = [...new Set([...prev.completedDates, todayKey])].sort();
  return {
    current: nextCurrent,
    best: Math.max(prev.best, nextCurrent),
    lastCompletedDate: todayKey,
    completedDates: completed,
  };
}

/** Build a 35-cell calendar grid (5 weeks) ending on today (Sunday-start). */
export function calendarGrid(today = new Date()): { date: Date; key: string }[] {
  const ref = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );
  const startOffset = ref.getUTCDay(); // 0 = Sun
  const start = new Date(ref);
  start.setUTCDate(ref.getUTCDate() - startOffset - 28); // 4 weeks back from this week's Sunday
  const out: { date: Date; key: string }[] = [];
  for (let i = 0; i < 35; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    out.push({ date: d, key: utcDateKey(d) });
  }
  return out;
}
