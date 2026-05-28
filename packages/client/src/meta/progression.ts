import type {
  EasterEggId,
  GameMode,
  LeaderboardEntry,
  MetaProgression,
  ShipId,
  ShipSkinId,
  UpgradeId,
} from './types';

const STORAGE_KEY = 'galaga.meta.v3';
const LEGACY_KEY = 'galaga.meta.v2';

const EMPTY_MODE_RECORD = { bestScore: 0, bestStage: 0, runs: 0, lastPlayed: 0 };

const EMPTY_LEADERBOARDS: Record<GameMode, LeaderboardEntry[]> = {
  classic: [],
  arcadePlus: [],
  daily: [],
  mission: [],
  endless: [],
};

const EMPTY_MODE_RECORDS: Record<GameMode, typeof EMPTY_MODE_RECORD> = {
  classic: { ...EMPTY_MODE_RECORD },
  arcadePlus: { ...EMPTY_MODE_RECORD },
  daily: { ...EMPTY_MODE_RECORD },
  mission: { ...EMPTY_MODE_RECORD },
  endless: { ...EMPTY_MODE_RECORD },
};

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
  achievements: [],
  selectedSkin: 'default',
  unlockedSkins: ['default'],
  leaderboards: JSON.parse(JSON.stringify(EMPTY_LEADERBOARDS)),
  modeRecords: JSON.parse(JSON.stringify(EMPTY_MODE_RECORDS)),
  lifetimeKills: 0,
  eliteBossKills: 0,
  hazardsSurvived: 0,
  hapticsEnabled: true,
  screenShakeEnabled: true,
  trainingHints: false,
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
  const skinList = dedupeSkins([
    ...base.unlockedSkins,
    ...((partial.unlockedSkins ?? []) as ShipSkinId[]),
  ]);
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
    achievements: Array.from(new Set(partial.achievements ?? [])),
    selectedSkin: partial.selectedSkin ?? base.selectedSkin,
    unlockedSkins: skinList.length > 0 ? skinList : ['default'],
    leaderboards: {
      ...base.leaderboards,
      ...(partial.leaderboards ?? {}),
    },
    modeRecords: {
      ...base.modeRecords,
      ...(partial.modeRecords ?? {}),
    },
    lifetimeKills: partial.lifetimeKills ?? 0,
    eliteBossKills: partial.eliteBossKills ?? 0,
    hazardsSurvived: partial.hazardsSurvived ?? 0,
    hapticsEnabled: partial.hapticsEnabled ?? true,
    screenShakeEnabled: partial.screenShakeEnabled ?? true,
    trainingHints: partial.trainingHints ?? false,
  };
}

function dedupeEggs(list: EasterEggId[]): EasterEggId[] {
  return Array.from(new Set(list));
}

function dedupeShips(list: ShipId[]): ShipId[] {
  return Array.from(new Set(list));
}

function dedupeSkins(list: ShipSkinId[]): ShipSkinId[] {
  return Array.from(new Set(list));
}

export function loadMeta(): MetaProgression {
  if (typeof localStorage === 'undefined') return cloneDefault();
  // Try v3 first, then migrate from v2 if present.
  const v3 = localStorage.getItem(STORAGE_KEY);
  if (v3) return safeParse(v3);
  const legacy = localStorage.getItem(LEGACY_KEY);
  if (legacy) {
    try {
      const parsed = JSON.parse(legacy) as Partial<MetaProgression>;
      const merged = mergeWithDefaults(parsed);
      // Persist migrated state under v3.
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      } catch {
        /* ignore quota */
      }
      return merged;
    } catch {
      /* fall through */
    }
  }
  return cloneDefault();
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

export function unlockAchievement(
  meta: MetaProgression,
  id: string,
  reward: number,
  skin?: ShipSkinId,
): MetaProgression {
  if (meta.achievements.includes(id)) return meta;
  const next: MetaProgression = {
    ...meta,
    achievements: [...meta.achievements, id],
    unlockedSkins: skin && !meta.unlockedSkins.includes(skin)
      ? dedupeSkins([...meta.unlockedSkins, skin])
      : meta.unlockedSkins,
  };
  return awardCredits(next, reward);
}

export function selectSkin(
  meta: MetaProgression,
  skin: ShipSkinId,
): MetaProgression {
  if (!meta.unlockedSkins.includes(skin)) return meta;
  return { ...meta, selectedSkin: skin };
}

export function addLeaderboardEntry(
  meta: MetaProgression,
  mode: GameMode,
  entry: LeaderboardEntry,
): MetaProgression {
  if (entry.score <= 0) return meta;
  const list = (meta.leaderboards?.[mode] ?? []).slice();
  list.push(entry);
  list.sort((a, b) => b.score - a.score);
  const top = list.slice(0, 10);
  return {
    ...meta,
    leaderboards: { ...meta.leaderboards, [mode]: top },
  };
}

export function bumpModeRecord(
  meta: MetaProgression,
  mode: GameMode,
  score: number,
  stage: number,
): MetaProgression {
  const prev = meta.modeRecords?.[mode] ?? { ...EMPTY_MODE_RECORD };
  const next = {
    bestScore: Math.max(prev.bestScore, score),
    bestStage: Math.max(prev.bestStage, stage),
    runs: prev.runs + 1,
    lastPlayed: Date.now(),
  };
  return {
    ...meta,
    modeRecords: { ...meta.modeRecords, [mode]: next },
  };
}

export function addLifetimeKills(
  meta: MetaProgression,
  kills: number,
): MetaProgression {
  if (kills <= 0) return meta;
  return { ...meta, lifetimeKills: meta.lifetimeKills + kills };
}

export function addEliteKills(
  meta: MetaProgression,
  kills: number,
): MetaProgression {
  if (kills <= 0) return meta;
  return { ...meta, eliteBossKills: meta.eliteBossKills + kills };
}

export function addHazardsSurvived(
  meta: MetaProgression,
  count: number,
): MetaProgression {
  if (count <= 0) return meta;
  return { ...meta, hazardsSurvived: meta.hazardsSurvived + count };
}

export function setSetting<K extends keyof MetaProgression>(
  meta: MetaProgression,
  key: K,
  value: MetaProgression[K],
): MetaProgression {
  return { ...meta, [key]: value };
}
