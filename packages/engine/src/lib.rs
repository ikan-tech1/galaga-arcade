//! Galaga ROM-accurate simulation core.
//!
//! Surfaces exposed to JavaScript:
//!
//! 1. **Stateful `Game`** — the full fixed-timestep state machine. The
//!    TypeScript renderer calls `Game::tick(inputs)` once per frame and
//!    receives a `FrameState` it can draw without owning any gameplay logic.
//! 2. **Stateless ROM helpers** — pure scoring / stage / RNG / collision
//!    utilities for tooling and golden-frame tests.
//!
//! Coordinates are integers in the arcade's native 224×288 viewport. The
//! origin is the top-left; +x right, +y down.

#![cfg_attr(not(test), allow(dead_code))]

use wasm_bindgen::prelude::*;

mod bullets;
mod collision;
mod enemies;
mod formation;
mod player;
mod rng;
mod scoring;
mod stages;
mod state;

/// Native arcade resolution + timing constants.
pub mod constants {
    pub const SCREEN_W: i32 = 224;
    pub const SCREEN_H: i32 = 288;
    /// Galaga PCB: 6.144 MHz / 384 / 264 ≈ 60.6061 Hz.
    pub const FRAME_HZ: f64 = 60.606_061;

    pub const PLAYER_W: i32 = 16;
    pub const PLAYER_H: i32 = 16;
    pub const PLAYER_Y: i32 = SCREEN_H - 36;
    pub const PLAYER_MAX_SPEED: i32 = 2;
    pub const FIRE_COOLDOWN_FRAMES: u32 = 9;
    pub const MAX_PLAYER_BULLETS: usize = 2;
    pub const MAX_PLAYER_BULLETS_DUAL: usize = 4;
    pub const DUAL_OFFSET: i32 = 16;

    pub const BULLET_W: i32 = 3;
    pub const BULLET_H: i32 = 8;
    pub const PLAYER_BULLET_SPEED: i32 = 6;
    pub const ENEMY_BULLET_SPEED: i32 = 3;

    pub const START_LIVES: u32 = 3;
    pub const DEATH_EXPLODE_FRAMES: u32 = 60;
    pub const ENEMY_EXPLODE_FRAMES: u32 = 24;
    pub const RESPAWN_INVULN_FRAMES: u32 = 90;

    pub const ENEMY_W: i32 = 16;
    pub const ENEMY_H: i32 = 16;

    pub const MAX_ENEMIES: usize = 40;
    pub const MAX_ENEMY_BULLETS: usize = 8;

    pub const FORMATION_TOP: i32 = 36;
    pub const FORMATION_LEFT: i32 = 24;
    pub const FORMATION_COL_W: i32 = 18;
    pub const FORMATION_ROW_H: i32 = 18;
    pub const FORMATION_ROWS: i32 = 5;
    pub const FORMATION_COLS: i32 = 8;
    pub const FORMATION_SWAY_AMP: i32 = 4;
    pub const FORMATION_SWAY_PERIOD: u64 = 240;

    pub const STAGE_INTRO_FRAMES: u32 = 110;
    pub const STAGE_CLEARED_PAUSE: u32 = 80;
    pub const GAME_OVER_FRAMES: u32 = 240;
    pub const TRACTOR_HOLD_FRAMES: u32 = 240;
    pub const TRACTOR_BEAM_FRAMES: u32 = 120;

    pub const EXTRA_FIGHTER_FIRST: u32 = 20_000;
    pub const EXTRA_FIGHTER_REPEAT: u32 = 70_000;
}

pub use state::{FrameState, Sprite, SpriteKind};

// -------------------------------------------------------------------
// 1. Stateful game wrapper.
// -------------------------------------------------------------------

/// Top-level WASM-exposed game wrapper. One per browser session.
#[wasm_bindgen]
pub struct Game {
    inner: state::World,
}

#[wasm_bindgen]
impl Game {
    /// Create and initialise a new game instance.
    #[wasm_bindgen(constructor)]
    pub fn new() -> Game {
        Game {
            inner: state::World::new(),
        }
    }

    /// Reset to a fresh attract-mode state.
    pub fn reset(&mut self) {
        self.inner = state::World::new();
    }

    /// Begin a new game (transitions out of attract).
    pub fn start_game(&mut self) {
        self.inner.start_game();
    }

    /// Return to attract mode (e.g. after game over).
    pub fn return_to_attract(&mut self) {
        self.inner.return_to_attract();
    }

    /// Submit hi-score entry initials (3 chars).
    pub fn submit_hiscore(&mut self, initials: &str) {
        self.inner.submit_hiscore(initials);
    }

    /// Manually trigger a stage skip (for debugging only).
    pub fn debug_skip_stage(&mut self) {
        self.inner.debug_skip_stage();
    }

    /// Advance one fixed-timestep frame.
    pub fn tick(&mut self, inputs: u32) -> JsValue {
        let frame = self.inner.tick(Inputs::from_bits(inputs));
        serde_wasm_bindgen::to_value(&frame).unwrap_or(JsValue::NULL)
    }

    #[wasm_bindgen(getter)]
    pub fn frame_hz(&self) -> f64 {
        constants::FRAME_HZ
    }

    #[wasm_bindgen(getter)]
    pub fn screen_w(&self) -> i32 {
        constants::SCREEN_W
    }

    #[wasm_bindgen(getter)]
    pub fn screen_h(&self) -> i32 {
        constants::SCREEN_H
    }
}

/// Module init hook.
#[wasm_bindgen(start)]
pub fn _wasm_start() {}

#[wasm_bindgen]
pub fn init() {}

#[wasm_bindgen]
pub fn engine_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// Packed input bitfield. Mirrors `client/src/game/input.ts`.
#[derive(Default, Clone, Copy, Debug)]
pub struct Inputs {
    pub left: bool,
    pub right: bool,
    pub fire: bool,
    pub start: bool,
    pub coin: bool,
    pub up: bool,
    pub down: bool,
    pub pause: bool,
}

impl Inputs {
    pub const LEFT:  u32 = 1 << 0;
    pub const RIGHT: u32 = 1 << 1;
    pub const FIRE:  u32 = 1 << 2;
    pub const START: u32 = 1 << 3;
    pub const COIN:  u32 = 1 << 4;
    pub const UP:    u32 = 1 << 5;
    pub const DOWN:  u32 = 1 << 6;
    pub const PAUSE: u32 = 1 << 7;

    pub fn from_bits(bits: u32) -> Self {
        Self {
            left:  bits & Self::LEFT  != 0,
            right: bits & Self::RIGHT != 0,
            fire:  bits & Self::FIRE  != 0,
            start: bits & Self::START != 0,
            coin:  bits & Self::COIN  != 0,
            up:    bits & Self::UP    != 0,
            down:  bits & Self::DOWN  != 0,
            pause: bits & Self::PAUSE != 0,
        }
    }
}

// -------------------------------------------------------------------
// 2. Stateless ROM-helper exports.
// -------------------------------------------------------------------

#[wasm_bindgen]
pub fn score_for(enemy: u8, diving: bool) -> u32 {
    scoring::score_for(enemy, diving)
}

#[wasm_bindgen]
pub fn challenge_wave_bonus(wave: u8) -> u32 {
    scoring::challenge_wave_bonus(wave)
}

#[wasm_bindgen]
pub fn perfect_bonus() -> u32 {
    10_000
}

#[wasm_bindgen]
pub fn is_challenge_stage(stage: u32) -> bool {
    stages::is_challenge(stage)
}

#[wasm_bindgen]
pub fn challenge_pattern(stage: u32) -> u8 {
    stages::challenge_pattern(stage)
}

#[wasm_bindgen]
pub fn attack_pattern_for(stage: u32, slot: u8) -> u8 {
    stages::attack_pattern_for(stage, slot)
}

#[wasm_bindgen]
pub fn difficulty_rank(stage: u32) -> u8 {
    stages::difficulty_rank(stage)
}

#[wasm_bindgen]
pub fn aabb_overlap(
    ax: i32, ay: i32, aw: i32, ah: i32,
    bx: i32, by: i32, bw: i32, bh: i32,
) -> bool {
    collision::aabb(ax, ay, aw, ah, bx, by, bw, bh)
}

#[wasm_bindgen]
pub fn extra_fighter_thresholds_default() -> Vec<u32> {
    vec![20_000, 90_000, 160_000, 230_000, 300_000]
}

/// Deterministic per-stage RNG, exposed for tooling / golden tests.
#[wasm_bindgen]
pub struct GalagaRng {
    inner: rng::XorShift32,
}

#[wasm_bindgen]
impl GalagaRng {
    #[wasm_bindgen(constructor)]
    pub fn new(seed: u32) -> Self {
        Self {
            inner: rng::XorShift32::new(seed.max(1)),
        }
    }

    pub fn next_u32(&mut self) -> u32 {
        self.inner.next()
    }

    pub fn range(&mut self, range: u32) -> u32 {
        if range == 0 { 0 } else { self.inner.next() % range }
    }

    pub fn unit(&mut self) -> f32 {
        (self.inner.next() & 0x00FF_FFFF) as f32 / 16_777_216.0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn challenge_stages_match_rom_pattern() {
        assert!(is_challenge_stage(3));
        assert!(is_challenge_stage(7));
        assert!(is_challenge_stage(11));
        assert!(!is_challenge_stage(1));
        assert!(!is_challenge_stage(4));
        assert!(!is_challenge_stage(2));
    }

    #[test]
    fn scoring_table_matches_rom() {
        assert_eq!(score_for(0, false), 50);
        assert_eq!(score_for(0, true), 100);
        assert_eq!(score_for(1, false), 80);
        assert_eq!(score_for(1, true), 160);
        assert_eq!(score_for(2, false), 150);
        assert_eq!(score_for(2, true), 400);
    }

    #[test]
    fn challenge_bonus_progression() {
        assert_eq!(challenge_wave_bonus(0), 1_000);
        assert_eq!(challenge_wave_bonus(1), 1_500);
        assert_eq!(challenge_wave_bonus(2), 2_000);
        assert_eq!(challenge_wave_bonus(3), 2_500);
        assert_eq!(challenge_wave_bonus(4), 3_000);
        assert_eq!(perfect_bonus(), 10_000);
    }

    #[test]
    fn aabb_basic() {
        assert!(aabb_overlap(0, 0, 10, 10, 5, 5, 10, 10));
        assert!(!aabb_overlap(0, 0, 10, 10, 11, 0, 10, 10));
        assert!(!aabb_overlap(0, 0, 10, 10, 0, 11, 10, 10));
        assert!(aabb_overlap(0, 0, 10, 10, 9, 9, 1, 1));
    }

    #[test]
    fn world_starts_in_attract() {
        let w = state::World::new();
        assert_eq!(w.phase_id(), 0); // Attract
    }

    #[test]
    fn start_game_advances_to_intro() {
        let mut w = state::World::new();
        w.start_game();
        assert_eq!(w.phase_id(), 1); // StageIntro
    }

    #[test]
    fn set_bonus_values_match_rom() {
        assert_eq!(scoring::set_bonus(scoring::SCORPION), 1_000);
        assert_eq!(scoring::set_bonus(scoring::SPY), 2_000);
        assert_eq!(scoring::set_bonus(scoring::FLAG), 3_000);
    }

    #[test]
    fn captured_fighter_scoring() {
        // Captured fighter in formation = 500, diving = 1000.
        assert_eq!(score_for(scoring::CAPTURED_FIGHTER, false), 500);
        assert_eq!(score_for(scoring::CAPTURED_FIGHTER, true), 1_000);
    }

    #[test]
    fn boss_escort_progression() {
        assert_eq!(scoring::boss_escort_score(0), 400);
        assert_eq!(scoring::boss_escort_score(1), 800);
        assert_eq!(scoring::boss_escort_score(2), 1_600);
        assert_eq!(scoring::boss_escort_score(5), 1_600);
    }

    #[test]
    fn rng_is_deterministic_per_seed() {
        let mut a = GalagaRng::new(42);
        let mut b = GalagaRng::new(42);
        for _ in 0..256 {
            assert_eq!(a.next_u32(), b.next_u32());
        }
    }

    #[test]
    fn extra_fighter_thresholds_match_default_rom() {
        let t = extra_fighter_thresholds_default();
        assert_eq!(t, vec![20_000, 90_000, 160_000, 230_000, 300_000]);
    }

    #[test]
    fn stages_wrap_after_255() {
        // Difficulty plateaus at 21 once stage > 22.
        assert_eq!(difficulty_rank(22), 21);
        assert_eq!(difficulty_rank(50), 21);
        assert_eq!(difficulty_rank(255), 21);
    }
}
