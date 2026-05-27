export type Phase =
  | 'attract'
  | 'demo'
  | 'stage_intro'
  | 'playing'
  | 'player_dying'
  | 'stage_cleared'
  | 'challenge_result'
  | 'game_over'
  | 'hi_score_entry'
  | 'paused';

/**
 * Meta-layer app phase — wraps the engine phase. The engine still drives the
 * gameplay phase via `FrameState.phase`; this enum controls which top-level
 * screen the React shell shows.
 */
export type AppPhase =
  | 'mode_hub'
  | 'hangar'
  | 'mission_board'
  | 'mission_briefing'
  | 'mission_complete'
  | 'daily_calendar'
  | 'secrets'
  | 'playing'; // engine drives the inner state
