import type { PowerUpDef, PowerUpId } from './types';

export const POWER_UPS: Record<PowerUpId, PowerUpDef> = {
  rapidFire: {
    id: 'rapidFire',
    name: 'RAPID FIRE',
    description: 'CADENCE BOOST · +35% SCORE',
    glyph: 'R',
    color: '#fde047',
    durationFrames: 60 * 12,
    scoreMul: 1.35,
    creditPerKill: 1,
  },
  spreadShot: {
    id: 'spreadShot',
    name: 'SPREAD SHOT',
    description: 'TRIPLE PATTERN · +50% SCORE',
    glyph: 'S',
    color: '#22d3ee',
    durationFrames: 60 * 10,
    scoreMul: 1.5,
    creditPerKill: 1,
  },
  laserBeam: {
    id: 'laserBeam',
    name: 'LASER BEAM',
    description: 'CONTINUOUS BEAM · +100% SCORE',
    glyph: 'L',
    color: '#ff3aa6',
    durationFrames: 60 * 7,
    scoreMul: 2.0,
    creditPerKill: 2,
  },
  shield: {
    id: 'shield',
    name: 'SHIELD',
    description: 'ABSORB · +25% SCORE',
    glyph: 'D',
    color: '#6ee7b7',
    durationFrames: 60 * 18,
    scoreMul: 1.25,
    creditPerKill: 0,
  },
  bomb: {
    id: 'bomb',
    name: 'BOMB',
    description: 'SCREEN CLEAR · INSTANT',
    glyph: 'B',
    color: '#fb923c',
    durationFrames: 0,
    scoreMul: 1.0,
    creditPerKill: 0,
  },
  magnet: {
    id: 'magnet',
    name: 'MAGNET',
    description: 'AUTO-COLLECT PICKUPS',
    glyph: 'M',
    color: '#a78bfa',
    durationFrames: 60 * 20,
    scoreMul: 1.0,
    creditPerKill: 0,
  },
};

export const POWER_UP_ORDER: PowerUpId[] = [
  'rapidFire',
  'spreadShot',
  'laserBeam',
  'shield',
  'bomb',
  'magnet',
];

/** Deterministic-ish power-up pick from a kill count + RNG seed. */
export function pickPowerUpForKill(killOrdinal: number, seed: number): PowerUpId | null {
  // Roughly 1 in 7 kills drops a power-up (modified by upgrades / Arcade+ generosity).
  const mix = (killOrdinal * 2654435761) ^ (seed | 0);
  const r = (mix >>> 0) % 1000;
  if (r >= 160) return null; // 16% drop rate
  // Distribution: rapid 35%, spread 22%, shield 14%, magnet 11%, laser 10%, bomb 8%
  const pool = r % 100;
  if (pool < 35) return 'rapidFire';
  if (pool < 57) return 'spreadShot';
  if (pool < 71) return 'shield';
  if (pool < 82) return 'magnet';
  if (pool < 92) return 'laserBeam';
  return 'bomb';
}
