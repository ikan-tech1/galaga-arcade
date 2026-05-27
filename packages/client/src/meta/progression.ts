import type {
  EasterEggId,
  MetaProgression,
  ShipId,
  UpgradeId,
} from './types';

const STORAGE_KEY = 'galaga.meta.v2';

export const DEFAULT_META: MetaProgression = {
  credits: 250,
  lifetimeCredits: 0,
  selectedShip: 'fighter',
  upgrades: {
    fireRate: 0,
    speed: 0,
    lives: 0,
    bombCapacity: 0,
    powerUpDuration: 0,
    creditMul: 0,
  },
  discovered: [],
  unlockedShips: ['fighter', 'interceptor', 'heavy', 'phantom'],
  completedMissions: [],
  missionStars: {},
  endlessBest: 0,
  daily: {
    current: 0,
    best: 0,
    lastCompletedDate: null,
    completedDates: [],
  },
  sideQuestsCompleted: 0,
};

function safeParse(raw: string | null): MetaProgression {
  if (!raw) return cloneDefault();
  try {
    const parsed = JSON.parse(raw) as Partial<MetaProgression>;
    return mergeWithDefaults(parsed);
  } catch {
    return cloneDefault();
  }
}

function cloneDefault(): MetaProgression {
  return JSON.parse(JSON.stringify(DEFAULT_META)) as MetaProgression;
}

function mergeWithDefaults(partial: Partial<MetaProgression>): MetaProgression {
  const base = cloneDefault();
  return {
    ...base,
    ...partial,
    upgrades: { ...base.upgrades, ...(partial.upgrades ?? {}) },
    discovered: dedupeEggs([...(partial.discovered ?? [])]),
    unlockedShips: dedupeShips([
      ...base.unlockedShips,
      ...(partial.unlockedShips ?? []),
    ]),
    completedMissions: Array.from(
      new Set([...(partial.completedMissions ?? [])]),
    ),
    missionStars: { ...base.missionStars, ...(partial.missionStars ?? {}) },
    daily: {
      ...base.daily,
      ...(partial.daily ?? {}),
      completedDates: Array.from(
        new Set([
          ...base.daily.completedDates,
          ...((partial.daily?.completedDates ?? []) as string[]),
        ]),
      ),
    },
  };
}

function dedupeEggs(list: EasterEggId[]): EasterEggId[] {
  return Array.from(new Set(list));
}

function dedupeShips(list: ShipId[]): ShipId[] {
  return Array.from(new Set(list));
}

export function loadMeta(): MetaProgression {
  if (typeof localStorage === 'undefined') return cloneDefault();
  return safeParse(localStorage.getItem(STORAGE_KEY));
}

export function saveMeta(meta: MetaProgression): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(meta));
  } catch {
    /* quota full or disabled — ignore */
  }
}

export function awardCredits(meta: MetaProgression, amount: number): MetaProgression {
  const mult = 1 + 0.1 * meta.upgrades.creditMul;
  const granted = Math.round(amount * mult);
  return {
    ...meta,
    credits: meta.credits + granted,
    lifetimeCredits: meta.lifetimeCredits + granted,
  };
}

export function spendCredits(
  meta: MetaProgression,
  amount: number,
): MetaProgression | null {
  if (meta.credits < amount) return null;
  return { ...meta, credits: meta.credits - amount };
}

export function bumpUpgrade(
  meta: MetaProgression,
  id: UpgradeId,
  maxLevel: number,
): MetaProgression {
  const next = Math.min(maxLevel, (meta.upgrades[id] ?? 0) + 1);
  return { ...meta, upgrades: { ...meta.upgrades, [id]: next } };
}

export function selectShip(meta: MetaProgression, ship: ShipId): MetaProgression {
  if (!meta.unlockedShips.includes(ship)) return meta;
  return { ...meta, selectedShip: ship };
}

export function unlockShip(meta: MetaProgression, ship: ShipId): MetaProgression {
  if (meta.unlockedShips.includes(ship)) return meta;
  return {
    ...meta,
    unlockedShips: dedupeShips([...meta.unlockedShips, ship]),
  };
}

export function discoverEgg(meta: MetaProgression, id: EasterEggId): MetaProgression {
  if (meta.discovered.includes(id)) return meta;
  return {
    ...meta,
    discovered: [...meta.discovered, id],
  };
}

export function recordMissionResult(
  meta: MetaProgression,
  missionId: string,
  stars: 0 | 1 | 2 | 3,
  rewardCredits: number,
): MetaProgression {
  const prevStars = (meta.missionStars[missionId] ?? 0) as 0 | 1 | 2 | 3;
  const newStars = Math.max(prevStars, stars) as 0 | 1 | 2 | 3;
  const completed = meta.completedMissions.includes(missionId)
    ? meta.completedMissions
    : [...meta.completedMissions, missionId];
  return awardCredits(
    {
      ...meta,
      completedMissions: completed,
      missionStars: { ...meta.missionStars, [missionId]: newStars },
    },
    rewardCredits,
  );
}

export function updateEndlessBest(
  meta: MetaProgression,
  score: number,
): MetaProgression {
  if (score <= meta.endlessBest) return meta;
  return { ...meta, endlessBest: score };
}

export function bumpSideQuest(meta: MetaProgression): MetaProgression {
  return { ...meta, sideQuestsCompleted: meta.sideQuestsCompleted + 1 };
}
