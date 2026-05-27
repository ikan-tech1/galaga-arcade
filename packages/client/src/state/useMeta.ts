import { useCallback, useEffect, useState } from 'react';
import {
  awardCredits,
  bumpSideQuest,
  bumpUpgrade,
  discoverEgg,
  loadMeta,
  recordMissionResult,
  saveMeta,
  selectShip,
  spendCredits,
  unlockShip,
  updateEndlessBest,
} from '../meta/progression';
import type {
  EasterEggId,
  MetaProgression,
  ShipId,
  UpgradeDef,
  UpgradeId,
} from '../meta/types';
import { UPGRADES, upgradeCost } from '../meta/upgrades';

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

  const reset = useCallback(() => {
    setMeta(loadMeta());
  }, []);

  return {
    meta,
    grantCredits,
    tryPurchaseUpgrade,
    pickShip,
    unlock,
    markEggDiscovered,
    finishMission,
    updateEndless,
    recordSideQuest,
    recordDailyComplete,
    reset,
  };
}

export type UseMeta = ReturnType<typeof useMeta>;
