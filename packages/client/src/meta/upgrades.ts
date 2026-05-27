import type { UpgradeDef, UpgradeId } from './types';

export const UPGRADES: Record<UpgradeId, UpgradeDef> = {
  fireRate: {
    id: 'fireRate',
    name: 'FIRE RATE',
    description: '+1 SCORE PER KILL · COMPOUNDED PER TIER',
    maxLevel: 5,
    costs: [100, 200, 400, 800, 1600],
  },
  speed: {
    id: 'speed',
    name: 'THRUSTER TUNE',
    description: 'COSMETIC SPEED TRAIL · CREDITS PER STAGE',
    maxLevel: 5,
    costs: [120, 240, 480, 960, 1920],
  },
  lives: {
    id: 'lives',
    name: 'STARTING LIVES',
    description: 'BANK +1 LIFE BONUS AT RUN START',
    maxLevel: 3,
    costs: [300, 700, 1500],
  },
  bombCapacity: {
    id: 'bombCapacity',
    name: 'BOMB CAPACITY',
    description: 'CARRY +1 BOMB EXTRA ON PICKUPS',
    maxLevel: 3,
    costs: [250, 500, 1000],
  },
  powerUpDuration: {
    id: 'powerUpDuration',
    name: 'POWER-UP CAPACITORS',
    description: '+15% DURATION ON ALL POWER-UPS PER TIER',
    maxLevel: 5,
    costs: [150, 300, 600, 1200, 2400],
  },
  creditMul: {
    id: 'creditMul',
    name: 'BLACK-MARKET LICENCE',
    description: '+10% CREDITS EARNED PER RUN',
    maxLevel: 5,
    costs: [200, 400, 800, 1600, 3200],
  },
};

export const UPGRADE_ORDER: UpgradeId[] = [
  'fireRate',
  'speed',
  'lives',
  'bombCapacity',
  'powerUpDuration',
  'creditMul',
];

/** Returns cost to advance from current level (0..max-1) → next, or null at max. */
export function upgradeCost(id: UpgradeId, level: number): number | null {
  const def = UPGRADES[id];
  if (level >= def.maxLevel) return null;
  return def.costs[level] ?? null;
}
