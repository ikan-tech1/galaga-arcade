import type { ShipId, ShipStats } from './types';

export const SHIPS: Record<ShipId, ShipStats> = {
  fighter: {
    id: 'fighter',
    name: 'FIGHTER',
    tagline: 'BALANCED · STOCK GALAGA HULL',
    speedMul: 1,
    fireRateMul: 1,
    livesMul: 1,
    hitboxTag: 'normal',
    dash: false,
    accent: '#22d3ee',
    secret: false,
  },
  interceptor: {
    id: 'interceptor',
    name: 'INTERCEPTOR',
    tagline: 'AGILE · THIN HITBOX · GLASS CANNON',
    speedMul: 1.25,
    fireRateMul: 1.15,
    livesMul: 1,
    hitboxTag: 'thin',
    dash: false,
    accent: '#fde047',
    secret: false,
  },
  heavy: {
    id: 'heavy',
    name: 'HEAVY',
    tagline: 'TANK · DOUBLE LIVES · SLUGGISH',
    speedMul: 0.78,
    fireRateMul: 0.85,
    livesMul: 2,
    hitboxTag: 'wide',
    dash: false,
    accent: '#ff3a3a',
    secret: false,
  },
  phantom: {
    id: 'phantom',
    name: 'PHANTOM',
    tagline: 'SHIFT · BRIEF INVULN DASH',
    speedMul: 1.1,
    fireRateMul: 1,
    livesMul: 1,
    hitboxTag: 'normal',
    dash: true,
    accent: '#a78bfa',
    secret: false,
  },
  rainbow: {
    id: 'rainbow',
    name: 'RAINBOW',
    tagline: '⚡  CHROMATIC · KONAMI REWARD',
    speedMul: 1.2,
    fireRateMul: 1.3,
    livesMul: 1,
    hitboxTag: 'thin',
    dash: true,
    accent: '#ff3aa6',
    secret: true,
  },
};

export const SHIP_ORDER: ShipId[] = [
  'fighter',
  'interceptor',
  'heavy',
  'phantom',
  'rainbow',
];

/** Returns the ship palette overlay applied on top of the existing player palette. */
export function shipPalette(id: ShipId): Record<string, string> {
  switch (id) {
    case 'interceptor':
      // Replace cyan hull → gold, keep blue underframe.
      return { C: '#fde047', B: '#a16207', Y: '#fffbeb' };
    case 'heavy':
      return { C: '#ff3a3a', B: '#7f1d1d', Y: '#fbbf24' };
    case 'phantom':
      return { C: '#a78bfa', B: '#4c1d95', Y: '#e9d5ff' };
    case 'rainbow':
      // Rainbow swap done per-frame in render code.
      return { C: '#ff3aa6', B: '#7c3aed', Y: '#fde047' };
    case 'fighter':
    default:
      return {};
  }
}
