import type { EasterEggDef, EasterEggId } from './types';

export const EASTER_EGGS: Record<EasterEggId, EasterEggDef> = {
  konami: {
    id: 'konami',
    name: 'KONAMI',
    hint: '⬆⬆⬇⬇⬅➡⬅➡ B A — try the classic on the title screen.',
    reward: 500,
  },
  click7: {
    id: 'click7',
    name: 'SEVEN TAPS',
    hint: 'Tap the logo until something gives. Lucky number under 10.',
    reward: 250,
  },
  score7777: {
    id: 'score7777',
    name: 'LUCKY 7s',
    hint: 'Hit a very specific four-digit milestone exactly.',
    reward: 250,
  },
  rescuePerfect: {
    id: 'rescuePerfect',
    name: 'PERFECT PILOT',
    hint: 'Combine the two rarest plays on one run.',
    reward: 1000,
  },
  namcoFormation: {
    id: 'namcoFormation',
    name: 'HIDDEN FORMATION',
    hint: 'A famous five-letter formation lurks at a very high stage.',
    reward: 1500,
  },
  secretShipUnlock: {
    id: 'secretShipUnlock',
    name: 'SECRET HULL',
    hint: 'A ship hides beyond the rainbow.',
    reward: 1000,
  },
  rainbowMode: {
    id: 'rainbowMode',
    name: 'CHROMATIC RUN',
    hint: 'Run in colour — Konami unlocks chromatic mode.',
    reward: 500,
  },
  retroDebug: {
    id: 'retroDebug',
    name: 'DEBUG GHOST',
    hint: 'Seven taps reveal the developer overlay.',
    reward: 200,
  },
  pause30: {
    id: 'pause30',
    name: 'PATIENCE',
    hint: 'Hold the pause for an unusually long time.',
    reward: 150,
  },
  doubleTapLogo: {
    id: 'doubleTapLogo',
    name: 'DOUBLE TAP',
    hint: 'Tap the logo twice in quick succession.',
    reward: 100,
  },
  noFireStage1: {
    id: 'noFireStage1',
    name: 'PACIFIST',
    hint: 'Clear the first stage without firing a single shot.',
    reward: 300,
  },
  thirteenStage: {
    id: 'thirteenStage',
    name: 'UNLUCKY',
    hint: 'Something happens on stage thirteen.',
    reward: 130,
  },
  devChord: {
    id: 'devChord',
    name: 'DEV CHORD',
    hint: 'A secret key combination whispered by the developer.',
    reward: 500,
  },
};

export const EGG_ORDER: EasterEggId[] = [
  'konami',
  'click7',
  'score7777',
  'rescuePerfect',
  'namcoFormation',
  'secretShipUnlock',
  'rainbowMode',
  'retroDebug',
  'pause30',
  'doubleTapLogo',
  'noFireStage1',
  'thirteenStage',
  'devChord',
];

// Konami sequence by KeyboardEvent.code.
export const KONAMI_SEQUENCE = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'KeyB',
  'KeyA',
];
