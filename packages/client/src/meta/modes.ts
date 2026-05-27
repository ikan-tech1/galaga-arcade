import type { GameMode } from './types';

export interface ModeMeta {
  id: GameMode;
  name: string;
  tagline: string;
  /** HSL hue for neon accent. */
  hue: number;
  /** Brief description for the hub card. */
  description: string;
  /** Tier label. */
  tier: 'CORE' | 'EXPANDED' | 'EVENT' | 'CAMPAIGN' | 'INFINITY';
  /** Icon glyph rendered on the cabinet card. */
  glyph: string;
}

export const MODE_META: Record<GameMode, ModeMeta> = {
  classic: {
    id: 'classic',
    name: 'CLASSIC',
    tagline: '1981 ROM ACCURACY',
    hue: 188,
    description:
      'The original arcade Galaga. No power-ups, no overlays, just dive patterns + tractor beam.',
    tier: 'CORE',
    glyph: '◎',
  },
  arcadePlus: {
    id: 'arcadePlus',
    name: 'ARCADE+',
    tagline: 'EXTENDED PROTOCOL',
    hue: 330,
    description:
      'Classic + power-ups, ship variants, side quests and combo scoring. Credits drop here.',
    tier: 'EXPANDED',
    glyph: '✦',
  },
  daily: {
    id: 'daily',
    name: 'DAILY',
    tagline: 'SEEDED CHALLENGE',
    hue: 45,
    description:
      'Every UTC day a new seeded challenge with 1–3 modifiers. Streak resets if you skip a day.',
    tier: 'EVENT',
    glyph: '☉',
  },
  mission: {
    id: 'mission',
    name: 'MISSIONS',
    tagline: 'STRUCTURED CAMPAIGN',
    hue: 152,
    description:
      'Eleven missions with objectives + star ratings. Earn credits to upgrade your hangar.',
    tier: 'CAMPAIGN',
    glyph: '✪',
  },
  endless: {
    id: 'endless',
    name: 'ENDLESS',
    tagline: 'INFINITE ESCALATION',
    hue: 270,
    description:
      'No end. Stages escalate forever. Separate leaderboard from Classic.',
    tier: 'INFINITY',
    glyph: '∞',
  },
};

export const MODE_ORDER: GameMode[] = [
  'classic',
  'arcadePlus',
  'daily',
  'mission',
  'endless',
];

export function modeAllowsPowerUps(mode: GameMode): boolean {
  return mode !== 'classic';
}

export function modeAllowsShipVariants(mode: GameMode): boolean {
  return mode !== 'classic';
}

export function modeAllowsCredits(mode: GameMode): boolean {
  return mode !== 'classic';
}
