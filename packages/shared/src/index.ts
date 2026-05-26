/**
 * Shared types and constants for the Galaga clone.
 * Mirrors what the Rust/WASM engine exports plus client-only UI types.
 */

export const SCREEN_W = 224;
export const SCREEN_H = 288;
export const FPS = 60.606061;
export const FRAME_DT_MS = 1000 / FPS;

// Enemy type ids — match Rust scoring::* constants.
export const ENEMY_ZAKO = 0;
export const ENEMY_GOEI = 1;
export const ENEMY_BOSS = 2;
export const ENEMY_BOSS_WINGMAN = 3;
export const ENEMY_SCORPION = 4;
export const ENEMY_SPY = 5;
export const ENEMY_FLAG = 6;
export const ENEMY_CAPTURED = 7;

export type EnemyKind =
  | typeof ENEMY_ZAKO
  | typeof ENEMY_GOEI
  | typeof ENEMY_BOSS
  | typeof ENEMY_BOSS_WINGMAN
  | typeof ENEMY_SCORPION
  | typeof ENEMY_SPY
  | typeof ENEMY_FLAG
  | typeof ENEMY_CAPTURED;

export interface HiScoreEntry {
  initials: string;
  score: number;
  stage: number;
  date: number;
}

export interface Settings {
  crt: boolean;
  scanlines: boolean;
  bloom: boolean;
  starfield: boolean;
  parallax: boolean;
  sfx: number; // 0..1
  music: number; // 0..1
  difficulty: 'easy' | 'normal' | 'hard' | 'rank-d';
  bonusFighter: 'low' | 'mid' | 'high' | 'none';
  freePlay: boolean;
  controls: 'kbd' | 'gamepad' | 'auto';
}

export const DEFAULT_SETTINGS: Settings = {
  crt: true,
  scanlines: true,
  bloom: true,
  starfield: true,
  parallax: true,
  sfx: 0.7,
  music: 0.55,
  difficulty: 'normal',
  bonusFighter: 'mid',
  freePlay: true,
  controls: 'auto',
};

export type Screen =
  | 'attract'
  | 'demo'
  | 'play'
  | 'gameover'
  | 'hiscore'
  | 'settings'
  | 'paused';

export interface InputState {
  left: boolean;
  right: boolean;
  fire: boolean;
  start: boolean;
  pause: boolean;
}

export const ZERO_INPUT: InputState = {
  left: false,
  right: false,
  fire: false,
  start: false,
  pause: false,
};
