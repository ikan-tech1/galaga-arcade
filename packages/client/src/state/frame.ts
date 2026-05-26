import type { Phase } from './phase';

export type SpriteKind =
  | 'player'
  | 'player_dual'
  | 'player_captured'
  | 'player_bullet'
  | 'enemy_bullet'
  | 'enemy_zako'
  | 'enemy_goei'
  | 'enemy_boss'
  | 'enemy_boss_injured'
  | 'enemy_captured'
  | 'tractor_beam'
  | 'explosion'
  | 'score_pop'
  | 'bonus_scorpion'
  | 'bonus_spy'
  | 'bonus_flag';

export interface Sprite {
  kind: SpriteKind;
  x: number;
  y: number;
  w: number;
  h: number;
  frame: number;
  angle_deg: number;
  visible: boolean;
  score: number;
}

export interface AudioEvent {
  kind: string;
  x: number;
  y: number;
}

export interface ParticleEvent {
  kind: string;
  x: number;
  y: number;
  count: number;
  palette: number;
}

export interface ScorePop {
  x: number;
  y: number;
  value: number;
  frame: number;
}

export interface FrameState {
  frame: number;
  score: number;
  hi_score: number;
  lives: number;
  stage: number;
  phase: Phase;
  sprites: Sprite[];
  player_dead: boolean;
  player_dual: boolean;
  player_captured: boolean;
  sim_time_s: number;
  audio_events: AudioEvent[];
  particle_events: ParticleEvent[];
  stage_banner_frames: number;
  challenge: boolean;
  challenge_hits: number;
  challenge_total: number;
  challenge_complete: boolean;
  challenge_perfect: boolean;
  challenge_bonus: number;
  last_score_pop: ScorePop | null;
  tractor_active: boolean;
}
