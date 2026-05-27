import { useCallback, useEffect, useState } from 'react';
import type { HiScoreEntry } from '@galaga/shared';

const KEY = 'galaga.hiscores.v1';
const DEFAULT_LIST: HiScoreEntry[] = [
  { initials: 'NMC', score: 200000, stage: 12, date: 0 },
  { initials: 'EGO', score: 150000, stage: 10, date: 0 },
  { initials: 'BNK', score: 100000, stage: 8, date: 0 },
  { initials: 'ATR', score: 70000,  stage: 6, date: 0 },
  { initials: 'CRT', score: 50000,  stage: 5, date: 0 },
  { initials: 'GLG', score: 35000,  stage: 4, date: 0 },
  { initials: 'PIX', score: 25000,  stage: 3, date: 0 },
  { initials: 'WAV', score: 18000,  stage: 3, date: 0 },
  { initials: 'YUM', score: 12000,  stage: 2, date: 0 },
  { initials: 'ZAK', score: 7000,   stage: 1, date: 0 },
];

function load(): HiScoreEntry[] {
  if (typeof localStorage === 'undefined') return DEFAULT_LIST;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_LIST;
    const parsed: HiScoreEntry[] = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_LIST;
    return parsed.slice(0, 10);
  } catch {
    return DEFAULT_LIST;
  }
}

export function useHiScores() {
  const [list, setList] = useState<HiScoreEntry[]>(() => load());

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(list));
    } catch {
      /* ignore */
    }
  }, [list]);

  const add = useCallback((entry: HiScoreEntry) => {
    setList((prev) => [...prev, entry].sort((a, b) => b.score - a.score).slice(0, 10));
  }, []);

  const reset = useCallback(() => setList(DEFAULT_LIST), []);

  /** Score required to qualify for the top-10. Pushed into the engine so its
   *  Phase::GameOver gate matches the React shell's persisted leaderboard. */
  const qualifyingThreshold =
    list.length < 10 ? 0 : Math.min(...list.map((e) => e.score));

  /** Top score (used as the engine's HUD HIGH SCORE). */
  const topScore = list.reduce((m, e) => Math.max(m, e.score), 0);

  /** True iff `score` would land in the top-10. */
  const qualifies = useCallback(
    (score: number) =>
      score > 0 && (list.length < 10 || score > qualifyingThreshold),
    [list, qualifyingThreshold],
  );

  return { list, add, reset, qualifyingThreshold, topScore, qualifies };
}
