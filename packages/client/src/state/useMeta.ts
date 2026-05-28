import { useCallback, useEffect, useState } from 'react';
import {
  addEliteKills,
  addHazardsSurvived,
  addLeaderboardEntry,
  addLifetimeKills,
  awardCredits,
  bumpModeRecord,
  bumpSideQuest,
  bumpUpgrade,
  discoverEgg,
  loadMeta,
  recordMissionResult,
  saveMeta,
  selectShip,
  selectSkin,
  setSetting,
  spendCredits,
  unlockAchievement,
  unlockShip,
  updateEndlessBest,
} from '../meta/progression';
import type {
  EasterEggId,
  GameMode,
  LeaderboardEntry,
  MetaProgression,
  ShipId,
  ShipSkinId,
  UpgradeDef,
  UpgradeId,
} from '../meta/types';
import { UPGRADES, upgradeCost } from '../meta/upgrades';
import { ACHIEVEMENT_BY_ID } from '../meta/achievements';

export function useMeta() {
  const [meta, setMeta] = useState<MetaProgression>(() => loadMeta());

  useEffect(() => {
    saveMeta(meta);
  }, [meta]);

  const grantCredits = useCallback(
    (amount: number) => setMeta((m) => awardCredits(m, amount)),
    [],
  );

  const tryPurchaseUpgrade = useCallback((id: UpgradeId): boolean => {
    let ok = false;
    setMeta((prev) => {
      const def: UpgradeDef = UPGRADES[id];
      const level = prev.upgrades[id] ?? 0;
      const cost = upgradeCost(id, level);
      if (cost == null) return prev;
      const afterSpend = spendCredits(prev, cost);
      if (!afterSpend) return prev;
      ok = true;
      return bumpUpgrade(afterSpend, id, def.maxLevel);
    });
    return ok;
  }, []);

  const pickShip = useCallback(
    (ship: ShipId) => setMeta((m) => selectShip(m, ship)),
    [],
  );

  const pickSkin = useCallback(
    (skin: ShipSkinId) => setMeta((m) => selectSkin(m, skin)),
    [],
  );

  const unlock = useCallback(
    (ship: ShipId) => setMeta((m) => unlockShip(m, ship)),
    [],
  );

  const markEggDiscovered = useCallback(
    (id: EasterEggId, reward: number) =>
      setMeta((m) => awardCredits(discoverEgg(m, id), reward)),
    [],
  );

  const finishMission = useCallback(
    (
      missionId: string,
      stars: 0 | 1 | 2 | 3,
      reward: number,
    ) => setMeta((m) => recordMissionResult(m, missionId, stars, reward)),
    [],
  );

  const updateEndless = useCallback(
    (score: number) => setMeta((m) => updateEndlessBest(m, score)),
    [],
  );

  const recordSideQuest = useCallback(
    () => setMeta((m) => bumpSideQuest(m)),
    [],
  );

  const recordDailyComplete = useCallback(
    (date: string) =>
      setMeta((prev) => {
        if (prev.daily.lastCompletedDate === date) return prev;
        const wasYesterday =
          prev.daily.lastCompletedDate &&
          Math.round(
            (new Date(date + 'T00:00:00Z').getTime() -
              new Date(prev.daily.lastCompletedDate + 'T00:00:00Z').getTime()) /
              (24 * 60 * 60 * 1000),
          ) === 1;
        const current = wasYesterday ? prev.daily.current + 1 : 1;
        const best = Math.max(prev.daily.best, current);
        return {
          ...prev,
          daily: {
            current,
            best,
            lastCompletedDate: date,
            completedDates: Array.from(
              new Set([...prev.daily.completedDates, date]),
            ),
          },
        };
      }),
    [],
  );

  const earnAchievement = useCallback((id: string): boolean => {
    let earned = false;
    setMeta((prev) => {
      if (prev.achievements.includes(id)) return prev;
      const def = ACHIEVEMENT_BY_ID[id];
      if (!def) return prev;
      earned = true;
      return unlockAchievement(prev, id, def.reward, def.unlockSkin);
    });
    return earned;
  }, []);

  const recordRunResult = useCallback(
    (mode: GameMode, score: number, stage: number) =>
      setMeta((m) => bumpModeRecord(m, mode, score, stage)),
    [],
  );

  const submitLeaderboard = useCallback(
    (mode: GameMode, entry: LeaderboardEntry) =>
      setMeta((m) => addLeaderboardEntry(m, mode, entry)),
    [],
  );

  const incLifetimeKills = useCallback(
    (n: number) => setMeta((m) => addLifetimeKills(m, n)),
    [],
  );

  const incEliteKills = useCallback(
    (n: number) => setMeta((m) => addEliteKills(m, n)),
    [],
  );

  const incHazardsSurvived = useCallback(
    (n: number) => setMeta((m) => addHazardsSurvived(m, n)),
    [],
  );

  const updateSetting = useCallback(
    <K extends keyof MetaProgression>(key: K, value: MetaProgression[K]) =>
      setMeta((m) => setSetting(m, key, value)),
    [],
  );

  const reset = useCallback(() => {
    setMeta(loadMeta());
  }, []);

  return {
    meta,
    grantCredits,
    tryPurchaseUpgrade,
    pickShip,
    pickSkin,
    unlock,
    markEggDiscovered,
    finishMission,
    updateEndless,
    recordSideQuest,
    recordDailyComplete,
    earnAchievement,
    recordRunResult,
    submitLeaderboard,
    incLifetimeKills,
    incEliteKills,
    incHazardsSurvived,
    updateSetting,
    reset,
  };
}

export type UseMeta = ReturnType<typeof useMeta>;
