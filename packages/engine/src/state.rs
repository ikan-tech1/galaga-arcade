//! World state aggregation + per-frame `tick` orchestration.
//!
//! Implements the full Galaga state machine:
//!
//!   Attract → StageIntro → Playing → StageCleared → StageIntro …
//!   Playing → PlayerDying → Playing (or GameOver)
//!   GameOver → HiScoreEntry → Attract
//!
//! Plus challenge stages, captured-fighter / dual-ship mechanic, and bonus
//! item drops.

use serde::Serialize;

use crate::bullets::{Bullet, BulletKind};
use crate::collision::aabb;
use crate::constants::*;
use crate::enemies::{Enemy, EnemyPhase};
use crate::formation::{enemy_kind_for_slot, formation_sway, home_pos, EnemyKind, SLOT_COUNT};
use crate::player::{Player, PlayerState};
use crate::rng::XorShift32;
use crate::scoring::{boss_escort_score, challenge_wave_bonus, score_for};
use crate::stages::{
    attack_pattern_for, dive_period_frames, dive_shot_chance_256, is_challenge,
    max_concurrent_dives,
};
use crate::stages::bonus_triggers::bonus_drop_for_kill;
use crate::stages::entry_paths::{bake_entry_waypoints, ENTRY_WAYPOINTS};
use crate::stages::dive_paths::{
    dive_path, dive_heading, sample_dive, BEAM_Y_TRIGGER,
};
use crate::demo_track;
use crate::Inputs;

// =====================================================================
//  Public frame state — pure data sent to the renderer.
// =====================================================================

#[derive(Serialize, Clone, Copy, Debug, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum SpriteKind {
    Player,
    PlayerDual,
    PlayerCaptured,
    PlayerBullet,
    EnemyBullet,
    EnemyZako,
    EnemyGoei,
    EnemyBoss,
    EnemyBossInjured,
    EnemyCaptured,
    TractorBeam,
    Explosion,
    ScorePop,
    BonusScorpion,
    BonusSpy,
    BonusFlag,
}

#[derive(Serialize, Clone, Debug)]
pub struct Sprite {
    pub kind: SpriteKind,
    pub x: i32,
    pub y: i32,
    pub w: i32,
    pub h: i32,
    pub frame: u8,
    pub angle_deg: f32,
    pub visible: bool,
    /// Optional score pop value (only used when kind == ScorePop).
    pub score: u32,
}

#[derive(Serialize, Clone, Copy, Debug, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum Phase {
    Attract,
    StageIntro,
    Playing,
    PlayerDying,
    StageCleared,
    ChallengeResult,
    GameOver,
    HiScoreEntry,
    Paused,
}

#[derive(Serialize, Clone, Debug)]
pub struct AudioEvent {
    pub kind: String, // e.g. "fire", "explosion_small", "tractor", "capture", "rescue"
    pub x: i32,
    pub y: i32,
}

#[derive(Serialize, Clone, Debug)]
pub struct ParticleEvent {
    pub kind: String, // "explosion", "rescue", "bonus", "fanfare"
    pub x: i32,
    pub y: i32,
    pub count: u32,
    pub palette: u8, // index into client-side palette table
}

#[derive(Serialize, Clone, Debug)]
pub struct FrameState {
    pub frame: u64,
    pub score: u32,
    pub hi_score: u32,
    pub lives: u32,
    pub stage: u32,
    pub phase: Phase,
    pub sprites: Vec<Sprite>,
    pub player_dead: bool,
    pub player_dual: bool,
    pub player_captured: bool,
    pub sim_time_s: f64,
    pub audio_events: Vec<AudioEvent>,
    pub particle_events: Vec<ParticleEvent>,
    pub stage_banner_frames: u32,
    pub challenge: bool,
    pub challenge_hits: u32,
    pub challenge_total: u32,
    pub challenge_complete: bool,
    pub challenge_perfect: bool,
    pub challenge_bonus: u32,
    pub last_score_pop: Option<ScorePop>,
    pub tractor_active: bool,
}

#[derive(Serialize, Clone, Copy, Debug)]
pub struct ScorePop {
    pub x: i32,
    pub y: i32,
    pub value: u32,
    pub frame: u64,
}

// =====================================================================
//  Internal helpers.
// =====================================================================

#[derive(Debug, Clone)]
pub struct ExplosionSprite {
    pub x: i32,
    pub y: i32,
    pub frames_left: u32,
    pub total_frames: u32,
    pub big: bool, // bigger sprite for boss/player deaths
}

#[derive(Debug, Clone)]
pub struct BonusItem {
    pub kind: u8, // 4=scorpion, 5=spy, 6=flag
    pub x: i32,
    pub y: i32,
    pub vy: f32,
    pub frames_left: u32,
    pub alive: bool,
}

#[derive(Debug, Clone)]
pub struct ScorePopActive {
    pub x: i32,
    pub y: i32,
    pub value: u32,
    pub frames_left: u32,
}

// =====================================================================
//  World.
// =====================================================================

pub struct World {
    pub frame: u64,
    pub score: u32,
    pub hi_score: u32,
    pub stage: u32,
    pub phase: Phase,
    pub phase_frames: u32,
    pub player: Player,
    pub player_bullets: Vec<Bullet>,
    pub enemy_bullets: Vec<Bullet>,
    pub enemies: Vec<Enemy>,
    pub explosions: Vec<ExplosionSprite>,
    pub bonus_items: Vec<BonusItem>,
    pub score_pops: Vec<ScorePopActive>,
    pub last_fire_inputs: bool,
    pub last_start_inputs: bool,
    pub last_pause_inputs: bool,
    pub rng: XorShift32,
    pub dive_cooldown: u32,
    pub audio_events: Vec<AudioEvent>,
    pub particle_events: Vec<ParticleEvent>,
    pub challenge_hits: u32,
    pub challenge_total: u32,
    pub challenge_spawn_cursor: u32,
    pub bonus_threshold_index: u32,
    pub extra_thresholds: Vec<u32>,
    pub hi_score_initials: [char; 3],
    pub hi_score_cursor: u8,
    pub pending_score_for_entry: u32,
    pub pending_score_pop: Option<ScorePop>,
    pub captured_active: bool,
    pub captured_slot: Option<u8>,
    pub tractor_active: bool,
    /// Number of formation enemies killed on the current stage. Drives the
    /// ROM bonus-drop trigger table (`bonus_drop_for_kill`).
    pub formation_kill_ordinal: u32,
    /// Embedded attract-mode demo input track. The ROM ships a recorded
    /// keystroke timeline; we step through it at frame cadence so the demo
    /// looks like a deterministic playthrough rather than RNG drift.
    pub demo_input_cursor: u32,
    /// Score required to qualify for the hi-score table. The TS shell pushes
    /// the 10th-place score from the persisted top-10 here so the engine's
    /// `tick_game_over` logic accepts exactly the same scores the React app
    /// will accept — replacing the legacy `score > hi_score / 4` heuristic.
    pub hi_score_threshold: u32,
}

impl World {
    pub fn new() -> Self {
        let hi = load_hi_score();
        let mut w = Self {
            frame: 0,
            score: 0,
            hi_score: hi,
            stage: 1,
            phase: Phase::Attract,
            phase_frames: 0,
            player: Player::new(),
            player_bullets: Vec::with_capacity(MAX_PLAYER_BULLETS_DUAL),
            enemy_bullets: Vec::with_capacity(MAX_ENEMY_BULLETS),
            enemies: Vec::with_capacity(MAX_ENEMIES),
            explosions: Vec::new(),
            bonus_items: Vec::new(),
            score_pops: Vec::new(),
            last_fire_inputs: false,
            last_start_inputs: false,
            last_pause_inputs: false,
            rng: XorShift32::new(0xCAFEBABE),
            dive_cooldown: 180,
            audio_events: Vec::new(),
            particle_events: Vec::new(),
            challenge_hits: 0,
            challenge_total: 40,
            challenge_spawn_cursor: 0,
            bonus_threshold_index: 0,
            extra_thresholds: vec![20_000, 90_000, 160_000, 230_000, 300_000],
            hi_score_initials: ['A', 'A', 'A'],
            hi_score_cursor: 0,
            pending_score_for_entry: 0,
            pending_score_pop: None,
            captured_active: false,
            captured_slot: None,
            tractor_active: false,
            formation_kill_ordinal: 0,
            demo_input_cursor: 0,
            hi_score_threshold: 7_000,
        };
        // Populate attract-mode formation so the demo screen has enemies.
        w.spawn_formation_for_stage(1);
        w
    }

    pub fn phase_id(&self) -> u8 {
        match self.phase {
            Phase::Attract => 0,
            Phase::StageIntro => 1,
            Phase::Playing => 2,
            Phase::PlayerDying => 3,
            Phase::StageCleared => 4,
            Phase::ChallengeResult => 5,
            Phase::GameOver => 6,
            Phase::HiScoreEntry => 7,
            Phase::Paused => 8,
        }
    }

    pub fn start_game(&mut self) {
        self.score = 0;
        self.stage = 1;
        self.bonus_threshold_index = 0;
        self.player = Player::new();
        self.player_bullets.clear();
        self.enemy_bullets.clear();
        self.explosions.clear();
        self.bonus_items.clear();
        self.score_pops.clear();
        self.captured_active = false;
        self.captured_slot = None;
        self.tractor_active = false;
        self.enter_phase(Phase::StageIntro);
        self.spawn_formation_for_stage(self.stage);
        self.push_audio("game_start", SCREEN_W / 2, SCREEN_H / 2);
    }

    pub fn return_to_attract(&mut self) {
        self.phase = Phase::Attract;
        self.phase_frames = 0;
        self.stage = 1;
        self.score = 0;
        self.spawn_formation_for_stage(1);
    }

    pub fn submit_hiscore(&mut self, initials: &str) {
        let mut chars = ['A'; 3];
        for (i, c) in initials.chars().take(3).enumerate() {
            chars[i] = c.to_ascii_uppercase();
        }
        save_hi_score(self.hi_score.max(self.pending_score_for_entry));
        self.pending_score_for_entry = 0;
        self.return_to_attract();
    }

    pub fn debug_skip_stage(&mut self) {
        self.kill_all_enemies();
    }

    pub fn tick(&mut self, mut inputs: Inputs) -> FrameState {
        self.frame = self.frame.wrapping_add(1);
        self.phase_frames = self.phase_frames.saturating_add(1);
        self.audio_events.clear();
        self.particle_events.clear();
        self.tractor_active = false;
        self.pending_score_pop = None;

        // Pause toggle on edge (only valid while playing).
        let pause_pressed = inputs.pause && !self.last_pause_inputs;
        self.last_pause_inputs = inputs.pause;
        if pause_pressed {
            if matches!(self.phase, Phase::Playing) {
                self.enter_phase(Phase::Paused);
            } else if matches!(self.phase, Phase::Paused) {
                self.enter_phase(Phase::Playing);
            }
        }

        match self.phase {
            Phase::Attract => self.tick_attract(inputs),
            Phase::StageIntro => self.tick_stage_intro(inputs),
            Phase::Playing => self.tick_playing(inputs),
            Phase::PlayerDying => self.tick_player_dying(inputs),
            Phase::StageCleared => self.tick_stage_cleared(inputs),
            Phase::ChallengeResult => self.tick_challenge_result(inputs),
            Phase::GameOver => self.tick_game_over(inputs),
            Phase::HiScoreEntry => self.tick_hi_score_entry(inputs),
            Phase::Paused => { /* no-op */ }
        }

        self.last_fire_inputs = inputs.fire;
        self.last_start_inputs = inputs.start;
        let _ = &mut inputs;
        self.build_frame_state()
    }

    // ----------------------------------------------------------------
    //  Phase helpers
    // ----------------------------------------------------------------

    fn enter_phase(&mut self, phase: Phase) {
        self.phase = phase;
        self.phase_frames = 0;
    }

    fn tick_attract(&mut self, inputs: Inputs) {
        let start_edge = inputs.start && !self.last_start_inputs;

        // Demo behaviour: replay the embedded ROM-style attract input
        // recording. The arcade ROM ships a stored keystroke timeline that
        // walks the demo through one full stage with predictable hits and
        // dodges; we step through the same kind of timeline at frame
        // cadence so the demo feels deterministic instead of RNG-driven.
        let demo_inputs = demo_track::input_at(self.demo_input_cursor);
        self.demo_input_cursor = self.demo_input_cursor.wrapping_add(1);
        self.player.tick(demo_inputs, self.frame);
        self.player_fire(demo_inputs);
        self.advance_bullets();
        self.tick_enemies();
        // Light scripted dive launches so the formation actually attacks.
        if !is_challenge(self.stage) {
            self.tick_dive_launches();
        }
        self.run_collisions(true);
        self.tick_explosions();
        self.tick_bonus_items();
        self.tick_score_pops();
        self.last_fire_inputs = demo_inputs.fire;

        if start_edge {
            self.start_game();
        }
        // Auto-cycle stage roughly every 16s of demo so attract has variety
        // and respawn the formation cleanly between cycles.
        if self.phase_frames > 960 {
            self.stage = (self.stage % 6) + 1;
            self.spawn_formation_for_stage(self.stage);
            self.player.respawn();
            self.demo_input_cursor = 0;
            self.phase_frames = 0;
        }
    }

    fn tick_stage_intro(&mut self, _inputs: Inputs) {
        // Hold ~110 frames for the banner, then begin playing.
        self.tick_enemies();
        self.tick_explosions();
        if self.phase_frames >= STAGE_INTRO_FRAMES {
            self.enter_phase(Phase::Playing);
            if is_challenge(self.stage) {
                self.push_audio("challenge_start", SCREEN_W / 2, SCREEN_H / 2);
            }
        }
    }

    fn tick_playing(&mut self, inputs: Inputs) {
        self.player.tick(inputs, self.frame);
        self.player_fire(inputs);
        self.advance_bullets();
        self.tick_enemies();
        if is_challenge(self.stage) {
            self.tick_challenge_spawns();
        } else {
            self.tick_dive_launches();
        }
        self.run_collisions(false);
        self.tick_explosions();
        self.tick_bonus_items();
        self.tick_score_pops();
        self.check_stage_clear();
        self.check_player_death();
    }

    fn tick_player_dying(&mut self, _inputs: Inputs) {
        self.advance_bullets();
        self.tick_enemies();
        self.tick_explosions();
        self.tick_bonus_items();
        self.tick_score_pops();
        // Wait for explode anim to finish before either respawning or game over.
        if self.player.is_done_dying() {
            if self.player.lives == 0 {
                self.enter_phase(Phase::GameOver);
                return;
            }
            self.player.respawn();
            // If captured ship is still in formation, release it (lost).
            self.captured_active = false;
            self.captured_slot = None;
            self.enter_phase(Phase::Playing);
        }
    }

    fn tick_stage_cleared(&mut self, _inputs: Inputs) {
        self.advance_bullets();
        self.tick_explosions();
        self.tick_bonus_items();
        self.tick_score_pops();
        if self.phase_frames >= STAGE_CLEARED_PAUSE {
            // Advance to next stage.
            self.stage = self.stage.wrapping_add(1).max(1);
            if self.stage == 0 || self.stage > 255 {
                self.stage = 1; // wrap as ROM does
            }
            self.spawn_formation_for_stage(self.stage);
            self.enter_phase(Phase::StageIntro);
        }
    }

    fn tick_challenge_result(&mut self, _inputs: Inputs) {
        self.tick_score_pops();
        if self.phase_frames >= 220 {
            self.stage = self.stage.wrapping_add(1).max(1);
            if self.stage == 0 || self.stage > 255 {
                self.stage = 1;
            }
            self.spawn_formation_for_stage(self.stage);
            self.enter_phase(Phase::StageIntro);
        }
    }

    fn tick_game_over(&mut self, _inputs: Inputs) {
        self.tick_explosions();
        if self.phase_frames >= GAME_OVER_FRAMES {
            // Score qualifies for hi-score entry iff it would land in the
            // top-10. The TS shell mirrors `localStorage` 10th place into
            // `hi_score_threshold`; the engine accepts any score strictly
            // greater than that threshold (or any non-zero score when the
            // table is empty / threshold is 0).
            let qualifies = self.score > 0
                && (self.hi_score_threshold == 0 || self.score > self.hi_score_threshold);
            if qualifies {
                self.pending_score_for_entry = self.score;
                self.hi_score = self.hi_score.max(self.score);
                self.hi_score_cursor = 0;
                self.hi_score_initials = ['A', 'A', 'A'];
                self.enter_phase(Phase::HiScoreEntry);
            } else {
                self.return_to_attract();
            }
        }
    }

    fn tick_hi_score_entry(&mut self, inputs: Inputs) {
        // Client owns the typing UI; engine just waits for `submit_hiscore`.
        let start_edge = inputs.start && !self.last_start_inputs;
        if start_edge {
            self.submit_hiscore("AAA");
        }
        // Auto return after 30s.
        if self.phase_frames > 60 * 30 {
            self.submit_hiscore("AAA");
        }
    }

    // ----------------------------------------------------------------
    //  Spawning & formation
    // ----------------------------------------------------------------

    fn spawn_formation_for_stage(&mut self, stage: u32) {
        self.enemies.clear();
        self.enemy_bullets.clear();
        self.dive_cooldown = dive_period_frames(stage) + 60;
        self.captured_active = false;
        self.captured_slot = None;
        // ROM bonus-drop trigger table is keyed off the per-stage formation
        // kill ordinal, so reset it whenever a new stage begins.
        self.formation_kill_ordinal = 0;
        if is_challenge(stage) {
            self.challenge_hits = 0;
            self.challenge_total = 40;
            self.challenge_spawn_cursor = 0;
            return;
        }
        // Normal stage: spawn 40 enemies, all start as `Entering` along
        // staggered entry splines so the formation flies in.
        for slot in 0..SLOT_COUNT as u8 {
            let kind = enemy_kind_for_slot(slot);
            let mut e = Enemy::new_in_slot(kind, slot, self.frame);
            self.bake_entry_path(&mut e, slot);
            e.phase = EnemyPhase::Entering;
            e.x = e.waypoints[0].0 as i32;
            e.y = e.waypoints[0].1 as i32;
            e.path_t = 0.0;
            e.path_speed = 0.04 + 0.005 * ((slot % 4) as f32);
            self.enemies.push(e);
        }
    }

    fn bake_entry_path(&mut self, e: &mut Enemy, slot: u8) {
        // ROM-derived entry choreography. Every slot is assigned one of four
        // canonical entry groups (`SLOT_GROUP[slot]`); we bake the absolute
        // waypoint list for that group fused onto the formation home, with a
        // small per-slot phase offset so adjacent slots don't fly identical
        // lines on top of each other.
        let (hx, hy) = home_pos(slot);
        let baked = bake_entry_waypoints(slot, hx, hy);
        e.waypoint_count = ENTRY_WAYPOINTS as u8;
        for i in 0..ENTRY_WAYPOINTS {
            e.waypoints[i] = baked[i];
        }
        // Pad any remainder so the renderer never reads stale values.
        for i in ENTRY_WAYPOINTS..e.waypoints.len() {
            e.waypoints[i] = baked[ENTRY_WAYPOINTS - 1];
        }
    }

    // ----------------------------------------------------------------
    //  Player firing
    // ----------------------------------------------------------------

    fn player_fire(&mut self, inputs: Inputs) {
        if !matches!(self.player.state, PlayerState::Alive) {
            return;
        }
        let pressed_now = inputs.fire && !self.last_fire_inputs;
        let off_cooldown = match self.player.last_fire_frame {
            None => true,
            Some(prev) => self.frame.saturating_sub(prev) >= FIRE_COOLDOWN_FRAMES as u64,
        };
        let max_b = if self.player.dual {
            MAX_PLAYER_BULLETS_DUAL
        } else {
            MAX_PLAYER_BULLETS
        };
        if pressed_now && off_cooldown && self.player_bullets.len() + 2 <= max_b + 1 {
            let cx = self.player.x + PLAYER_W / 2 - BULLET_W / 2;
            let cy = self.player.y - BULLET_H;
            if self.player_bullets.len() < max_b {
                self.player_bullets.push(Bullet {
                    x: cx,
                    y: cy,
                    kind: BulletKind::Player,
                    alive: true,
                    vx: 0.0,
                });
            }
            if self.player.dual && self.player_bullets.len() < max_b {
                self.player_bullets.push(Bullet {
                    x: cx + DUAL_OFFSET,
                    y: cy,
                    kind: BulletKind::Player,
                    alive: true,
                    vx: 0.0,
                });
            }
            self.player.last_fire_frame = Some(self.frame);
            self.push_audio("fire", cx, cy);
        }
    }

    fn advance_bullets(&mut self) {
        for b in self.player_bullets.iter_mut() {
            b.y -= PLAYER_BULLET_SPEED;
            if b.y + BULLET_H < 0 {
                b.alive = false;
            }
        }
        for b in self.enemy_bullets.iter_mut() {
            b.y += ENEMY_BULLET_SPEED;
            b.x += b.vx_int();
            if b.y > SCREEN_H || b.x < -8 || b.x > SCREEN_W + 8 {
                b.alive = false;
            }
        }
        self.player_bullets.retain(|b| b.alive);
        self.enemy_bullets.retain(|b| b.alive);
    }

    // ----------------------------------------------------------------
    //  Enemy ticking — entries, formation bob, dives, tractor beam.
    // ----------------------------------------------------------------

    fn tick_enemies(&mut self) {
        let sway = formation_sway(self.frame);
        // Snapshot small data we need to mutate self.enemies safely.
        let player_x = self.player.x;
        let player_y = self.player.y;
        let stage = self.stage;
        let mut spawn_bullets: Vec<(i32, i32, f32)> = Vec::new();
        for e in self.enemies.iter_mut() {
            match e.phase {
                EnemyPhase::Entering => {
                    e.path_t += e.path_speed;
                    if e.path_t >= 1.0 {
                        e.x = e.home_x;
                        e.y = e.home_y;
                        e.phase = EnemyPhase::InFormation;
                    } else {
                        let idx_f = e.path_t * (e.waypoint_count as f32 - 1.0);
                        let idx = idx_f as usize;
                        let next = (idx + 1).min(e.waypoint_count as usize - 1);
                        let frac = idx_f - idx as f32;
                        let (x0, y0) = e.waypoints[idx];
                        let (x1, y1) = e.waypoints[next];
                        e.x = (x0 as f32 + (x1 as f32 - x0 as f32) * frac) as i32;
                        e.y = (y0 as f32 + (y1 as f32 - y0 as f32) * frac) as i32;
                        let dx = x1 as f32 - x0 as f32;
                        let dy = y1 as f32 - y0 as f32;
                        e.angle_deg = dy.atan2(dx).to_degrees() + 90.0;
                    }
                }
                EnemyPhase::InFormation => {
                    e.x = e.home_x + sway;
                    e.y = e.home_y;
                    e.angle_deg = 180.0;
                }
                EnemyPhase::Diving => {
                    // Tick along procedural dive path; specifics live in
                    // `tick_dive_one`.
                    World::tick_dive_one(e, player_x, player_y);
                    if !is_challenge(stage)
                        && e.y > 0
                        && e.y < SCREEN_H - 24
                        && (self.frame as u32 % 7) == 0
                    {
                        let chance = dive_shot_chance_256(stage);
                        if (self.rng.next() & 0xFF) < chance {
                            spawn_bullets.push((
                                e.x + ENEMY_W / 2,
                                e.y + ENEMY_H,
                                aim_vx(e.x, e.y, player_x, player_y),
                            ));
                        }
                    }
                    if e.y > SCREEN_H + 16 {
                        // Re-enter from top.
                        e.y = -ENEMY_H;
                        e.x = e.home_x;
                        e.path_t = 0.0;
                        e.phase = EnemyPhase::Returning;
                    }
                }
                EnemyPhase::BeamingDown => {
                    e.beam_frames = e.beam_frames.saturating_sub(1);
                    if e.beam_frames == 0 {
                        // Return to formation
                        e.phase = EnemyPhase::Returning;
                        e.path_t = 0.0;
                    }
                }
                EnemyPhase::Returning => {
                    let dx = (e.home_x - e.x) as f32;
                    let dy = (e.home_y - e.y) as f32;
                    let d = (dx * dx + dy * dy).sqrt().max(0.01);
                    let speed = 2.4;
                    e.x = (e.x as f32 + dx / d * speed) as i32;
                    e.y = (e.y as f32 + dy / d * speed) as i32;
                    if d < 4.0 {
                        e.x = e.home_x;
                        e.y = e.home_y;
                        e.phase = EnemyPhase::InFormation;
                    }
                    e.angle_deg = dy.atan2(dx).to_degrees() + 90.0;
                }
                EnemyPhase::Dying => {
                    if e.explode_frames_left > 0 {
                        e.explode_frames_left -= 1;
                    } else {
                        e.alive = false;
                    }
                }
            }
        }
        // Push deferred bullets.
        for (bx, by, vx) in spawn_bullets {
            if self.enemy_bullets.len() < MAX_ENEMY_BULLETS {
                self.enemy_bullets.push(Bullet {
                    x: bx - BULLET_W / 2,
                    y: by,
                    kind: BulletKind::Enemy,
                    alive: true,
                    vx,
                });
            }
        }
        // Reap dead enemies
        self.enemies.retain(|e| e.alive);
        // Update tractor active flag for the renderer.
        self.tractor_active = self
            .enemies
            .iter()
            .any(|e| e.phase == EnemyPhase::BeamingDown);
    }

    fn tick_dive_one(e: &mut Enemy, player_x: i32, player_y: i32) {
        // ROM-transcribed dive scripts. Each `path_id` indexes into the
        // 16-entry `DIVE_PATTERNS` master table; sample the relative-to-home
        // offset at the current `path_t` and fuse it onto `home_x/home_y`.
        let path = dive_path(e.path_id);
        e.path_t += e.path_speed.max(0.008);
        let t = e.path_t.min(0.9999);
        let (mut dx_rel, dy_rel) = sample_dive(path, t);
        // Pattern 11 (Diagonal Dive) is stored as left-biased; flip sign at
        // runtime when the player is to the right of `home_x` so the dive
        // tracks toward the actual player.
        if e.path_id == 11 {
            if player_x > e.home_x {
                dx_rel = -dx_rel;
            }
        }
        // Patterns 6/7 (wingman escort) bias horizontally toward the player
        // while still following the ROM curve — ROM does this via segment
        // adjustments; we emulate with a bounded lerp.
        let bias = if matches!(e.path_id, 6 | 7) {
            let bx = ((player_x - e.home_x) as f32 * 0.45 * t).clamp(-48.0, 48.0);
            bx as i32
        } else {
            0
        };
        e.x = e.home_x + dx_rel + bias;
        e.y = e.home_y + dy_rel;
        e.angle_deg = dive_heading(path, t);
        // Boss capture trigger — when the boss reaches `BEAM_Y_TRIGGER`
        // measured relative to its home the ROM hands off to the tractor
        // beam state. The check uses `dy_rel` (path-relative) so the trigger
        // position matches the original sweep, regardless of formation row.
        if matches!(e.path_id, 4 | 5)
            && e.kind == EnemyKind::Boss
            && !e.injured
            && e.beam_frames == 0
            && dy_rel >= BEAM_Y_TRIGGER
            && e.y >= player_y - 110
        {
            e.phase = EnemyPhase::BeamingDown;
            e.beam_frames = TRACTOR_BEAM_FRAMES;
            // Lift slightly above the player so the cone is visible.
            e.y = (player_y - 80).max(40);
        }
    }

    fn tick_dive_launches(&mut self) {
        if self.dive_cooldown > 0 {
            self.dive_cooldown -= 1;
            return;
        }
        // Count active divers
        let active = self
            .enemies
            .iter()
            .filter(|e| matches!(e.phase, EnemyPhase::Diving | EnemyPhase::BeamingDown))
            .count() as u32;
        if active >= max_concurrent_dives(self.stage) {
            self.dive_cooldown = 30;
            return;
        }
        // Find an in-formation enemy to dive (captured fighter never dives alone).
        let candidates: Vec<usize> = self
            .enemies
            .iter()
            .enumerate()
            .filter(|(_, e)| {
                e.phase == EnemyPhase::InFormation && e.kind != EnemyKind::CapturedFighter
            })
            .map(|(i, _)| i)
            .collect();
        if candidates.is_empty() {
            self.dive_cooldown = 60;
            return;
        }
        let pick = candidates[(self.rng.next() as usize) % candidates.len()];
        let stage = self.stage;
        let slot = self.enemies[pick].slot;
        let pattern = attack_pattern_for(stage, slot);
        self.enemies[pick].phase = EnemyPhase::Diving;
        self.enemies[pick].path_t = 0.0;
        self.enemies[pick].path_id = pattern;
        self.enemies[pick].path_speed = 0.012 + 0.0005 * (stages_difficulty(stage) as f32);
        let pos = (self.enemies[pick].x, self.enemies[pick].y);
        // Boss diving: bring wingmen, and bring the captured fighter along
        // if one is docked in formation (enabling the rescue).
        if self.enemies[pick].kind == EnemyKind::Boss {
            let boss_slot = slot;
            let boss_home_y = self.enemies[pick].home_y;
            let boss_path_speed = self.enemies[pick].path_speed;
            let wingmen: Vec<usize> = self
                .enemies
                .iter()
                .enumerate()
                .filter(|(_, e)| {
                    e.phase == EnemyPhase::InFormation
                        && e.kind == EnemyKind::Goei
                        && (e.home_y - boss_home_y).abs() < 36
                        && (e.slot as i32 - boss_slot as i32).abs() <= 2
                })
                .map(|(i, _)| i)
                .take(2)
                .collect();
            let mut escort_slots = [u8::MAX; 2];
            for (i, &idx) in wingmen.iter().enumerate() {
                escort_slots[i] = self.enemies[idx].slot;
            }
            self.enemies[pick].escort_count = wingmen.len() as u8;
            self.enemies[pick].escort_slots = escort_slots;
            for (i, idx) in wingmen.into_iter().enumerate() {
                self.enemies[idx].phase = EnemyPhase::Diving;
                self.enemies[idx].path_t = 0.0;
                self.enemies[idx].path_id = if i == 0 { 6 } else { 7 };
                self.enemies[idx].path_speed = boss_path_speed;
            }
            // If a captured fighter is in this boss's escort slot range,
            // drag it along — this is the rescue opportunity.
            self.enemies[pick].carrying_capture = false;
            if self.captured_active {
                let cap_idx = self.enemies.iter().enumerate().find_map(|(i, e)| {
                    if e.kind == EnemyKind::CapturedFighter
                        && e.phase == EnemyPhase::InFormation
                    {
                        Some(i)
                    } else {
                        None
                    }
                });
                if let Some(cap) = cap_idx {
                    // 65% chance to bring captured fighter with the boss.
                    if (self.rng.next() & 0xFF) < 170 {
                        self.enemies[cap].phase = EnemyPhase::Diving;
                        self.enemies[cap].path_t = 0.0;
                        self.enemies[cap].path_id = 6;
                        self.enemies[cap].path_speed = boss_path_speed;
                        // Tag boss as carrying captured fighter (used by rescue).
                        self.enemies[pick].captured_slot =
                            Some(self.enemies[cap].slot);
                        self.enemies[pick].carrying_capture = true;
                    }
                }
            }
            self.push_audio("boss_dive", pos.0, pos.1);
        } else {
            self.push_audio("dive", pos.0, pos.1);
        }
        self.dive_cooldown = dive_period_frames(stage);
    }

    fn tick_challenge_spawns(&mut self) {
        // Challenge: spawn 5 waves of 8 enemies, each following the same
        // spline; perfect = all 40 hit. Enemies never shoot during challenge.
        if self.enemies.iter().any(|e| matches!(e.phase, EnemyPhase::Diving | EnemyPhase::Entering)) {
            return;
        }
        if self.challenge_spawn_cursor >= self.challenge_total {
            // All waves done — show result.
            if self.phase_frames > 40 {
                let perfect = self.challenge_hits == self.challenge_total;
                let bonus = if perfect {
                    10_000
                } else {
                    // Accumulated wave bonuses based on hits.
                    let waves_cleared = (self.challenge_hits / 8) as u8;
                    let mut b = 0;
                    for w in 0..waves_cleared {
                        b += challenge_wave_bonus(w);
                    }
                    b
                };
                self.add_score(bonus);
                self.push_audio(
                    if perfect { "perfect_fanfare" } else { "wave_bonus" },
                    SCREEN_W / 2,
                    SCREEN_H / 2,
                );
                self.push_particle("fanfare", SCREEN_W / 2, SCREEN_H / 2, 80, 2);
                self.enter_phase(Phase::ChallengeResult);
            }
            return;
        }
        let wave = self.challenge_spawn_cursor / 8;
        let in_wave = self.challenge_spawn_cursor % 8;
        // Choose enemy kind for this wave's pattern
        let pattern = (wave % 8) as u8;
        let kind = match wave {
            0 | 4 => EnemyKind::Zako,
            1 | 5 => EnemyKind::Goei,
            2 | 6 => EnemyKind::Boss,
            _ => if in_wave < 4 { EnemyKind::Zako } else { EnemyKind::Goei },
        };
        let slot = (wave * 8 + in_wave) as u8;
        let mut e = Enemy::new_in_slot(kind, slot.min(39), self.frame);
        // Use a fake home along the top so dive path renders properly,
        // and use BeamingDown→Returning→Diving variant by stuffing into Diving.
        e.home_x = FORMATION_LEFT + (in_wave as i32 * FORMATION_COL_W);
        e.home_y = 40 + (wave as i32 * 4);
        e.x = if (in_wave & 1) == 0 { -16 } else { SCREEN_W + 16 };
        e.y = 60;
        e.phase = EnemyPhase::Diving;
        e.path_id = pattern;
        e.path_t = 0.0;
        e.path_speed = 0.012;
        e.hp = 1;
        self.enemies.push(e);
        self.challenge_spawn_cursor += 1;
    }

    // ----------------------------------------------------------------
    //  Collisions
    // ----------------------------------------------------------------

    fn run_collisions(&mut self, attract: bool) {
        // Player bullets vs enemies. We collect the bullet-hit candidates as
        // (bullet_index, enemy_index) pairs first, then resolve scoring with
        // a borrow-friendly second pass so we can read sibling state (alive
        // wingmen, etc.) at the moment of the kill.
        struct Hit {
            x: i32,
            y: i32,
            value: u32,
            carried_capture: bool,
            killed_kind: EnemyKind,
            killed_was_formation: bool,
        }
        let mut hit_candidates: Vec<(usize, usize)> = Vec::new();
        for (b_i, b) in self.player_bullets.iter().enumerate() {
            if !b.alive {
                continue;
            }
            for (idx, e) in self.enemies.iter().enumerate() {
                if e.phase == EnemyPhase::Dying || !e.alive {
                    continue;
                }
                if aabb(b.x, b.y, BULLET_W, BULLET_H, e.x, e.y, ENEMY_W, ENEMY_H) {
                    hit_candidates.push((b_i, idx));
                    break;
                }
            }
        }
        let mut hits: Vec<Hit> = Vec::new();
        // Mark bullets dead and resolve enemy state.
        for (b_i, idx) in hit_candidates {
            // Bullet might already have been consumed by an earlier hit in
            // the same frame; skip if so.
            if !self.player_bullets[b_i].alive {
                continue;
            }
            self.player_bullets[b_i].alive = false;
            // Read side info *before* mutating the enemy.
            let kind = self.enemies[idx].kind;
            let injured_before = self.enemies[idx].injured;
            let diving = matches!(
                self.enemies[idx].phase,
                EnemyPhase::Diving | EnemyPhase::BeamingDown
            );
            let was_formation = self.enemies[idx].phase == EnemyPhase::InFormation;
            if kind == EnemyKind::Boss && !injured_before {
                // First boss hit just injures (palette swap).
                self.enemies[idx].injured = true;
                let x = self.enemies[idx].x;
                let y = self.enemies[idx].y;
                hits.push(Hit {
                    x,
                    y,
                    value: 0,
                    carried_capture: false,
                    killed_kind: kind,
                    killed_was_formation: false,
                });
                continue;
            }
            // Compute boss + escort score from *currently alive* wingmen
            // (not the dive-start escort_count). This matches the ROM rule
            // where a boss whose wingmen die en route scores 400, with one
            // wingman 800, with both 1600.
            let value = if kind == EnemyKind::Boss && diving {
                let escort_slots = self.enemies[idx].escort_slots;
                let alive = escort_slots
                    .iter()
                    .filter(|&&s| {
                        s != u8::MAX
                            && self.enemies.iter().any(|e2| {
                                e2.slot == s
                                    && e2.kind == EnemyKind::Goei
                                    && e2.alive
                                    && e2.phase != EnemyPhase::Dying
                            })
                    })
                    .count() as u8;
                boss_escort_score(alive)
            } else {
                score_for(kind.id(), diving)
            };
            let carried_capture =
                kind == EnemyKind::Boss && self.enemies[idx].carrying_capture;
            let x = self.enemies[idx].x;
            let y = self.enemies[idx].y;
            self.enemies[idx].alive = false;
            self.enemies[idx].phase = EnemyPhase::Dying;
            self.enemies[idx].explode_frames_left = ENEMY_EXPLODE_FRAMES;
            hits.push(Hit {
                x,
                y,
                value,
                carried_capture,
                killed_kind: kind,
                killed_was_formation: was_formation,
            });
        }
        self.player_bullets.retain(|b| b.alive);
        for h in hits {
            if h.value > 0 {
                self.add_score(h.value);
                self.push_score_pop(h.x, h.y, h.value);
                if is_challenge(self.stage) {
                    self.challenge_hits += 1;
                }
            }
            // Boss that was carrying captured fighter on its dive → rescue!
            if h.carried_capture {
                self.try_rescue_captured();
            }
            // Bonus item drop: ROM-style ordinal trigger. Every kill that
            // started in formation increments the ordinal counter; the
            // bonus_drop_for_kill table tells us which ordinals (per stage)
            // drop scorpion / spy / flag.
            if !is_challenge(self.stage) && h.value > 0 && h.killed_was_formation {
                self.formation_kill_ordinal =
                    self.formation_kill_ordinal.saturating_add(1);
                if let Some(kind) =
                    bonus_drop_for_kill(self.stage, self.formation_kill_ordinal)
                {
                    self.spawn_bonus_item(h.x, h.y, kind);
                }
            }
            // Captured-fighter drops never spawn bonus items either.
            let _ = h.killed_kind;
            self.explosions.push(ExplosionSprite {
                x: h.x,
                y: h.y,
                frames_left: ENEMY_EXPLODE_FRAMES,
                total_frames: ENEMY_EXPLODE_FRAMES,
                big: false,
            });
            self.push_audio("explosion_small", h.x, h.y);
            self.push_particle("explosion", h.x + 8, h.y + 8, 14, 1);
        }
        if attract {
            return;
        }
        // Enemy bullets / bodies vs player.
        if matches!(self.player.state, PlayerState::Alive)
            && !self.player.is_invulnerable()
        {
            let mut hit = false;
            let px = self.player.x;
            let py = self.player.y;
            let pw = if self.player.dual { PLAYER_W * 2 + 4 } else { PLAYER_W };
            for b in self.enemy_bullets.iter_mut() {
                if !b.alive {
                    continue;
                }
                if aabb(b.x, b.y, BULLET_W, BULLET_H, px, py, pw, PLAYER_H) {
                    b.alive = false;
                    hit = true;
                    break;
                }
            }
            if !hit {
                for e in self.enemies.iter() {
                    if !e.alive || e.phase == EnemyPhase::Dying {
                        continue;
                    }
                    if matches!(e.phase, EnemyPhase::Diving | EnemyPhase::BeamingDown)
                        && aabb(e.x, e.y, ENEMY_W, ENEMY_H, px, py, pw, PLAYER_H)
                    {
                        hit = true;
                        break;
                    }
                }
            }
            // Capture: any boss in BeamingDown touching the player captures the ship.
            let mut capture_idx: Option<usize> = None;
            for (i, e) in self.enemies.iter().enumerate() {
                if e.phase == EnemyPhase::BeamingDown
                    && e.kind == EnemyKind::Boss
                    && aabb(
                        e.x - 8,
                        e.y + 12,
                        ENEMY_W + 16,
                        80,
                        px,
                        py,
                        pw,
                        PLAYER_H,
                    )
                {
                    capture_idx = Some(i);
                    break;
                }
            }
            if let Some(i) = capture_idx {
                // Capture mechanic: take player away, put captured ship in slot.
                self.do_capture(i);
                return;
            }
            if hit {
                self.kill_player();
            }
        }
        self.enemy_bullets.retain(|b| b.alive);
        // Reap dead enemies.
        self.enemies
            .retain(|e| !matches!(e.phase, EnemyPhase::Dying) || e.explode_frames_left > 0);
        // If the captured fighter was destroyed (player shot it), clear flag.
        if self.captured_active
            && !self
                .enemies
                .iter()
                .any(|e| e.kind == EnemyKind::CapturedFighter && e.alive)
        {
            self.captured_active = false;
            self.captured_slot = None;
        }
    }

    fn do_capture(&mut self, boss_idx: usize) {
        // Add a captured-fighter enemy into the boss's slot in formation.
        let captured_slot = self.enemies[boss_idx].slot;
        // Mark boss as returning (he carries the ship up).
        self.enemies[boss_idx].phase = EnemyPhase::Returning;
        self.enemies[boss_idx].path_t = 0.0;
        // Spawn captured fighter that rides up with the boss (will dock after boss returns).
        let mut cap = Enemy::new_in_slot(EnemyKind::CapturedFighter, captured_slot, self.frame);
        let bx = self.enemies[boss_idx].x;
        let by = self.enemies[boss_idx].y;
        cap.x = bx;
        cap.y = by + 24;
        cap.home_x = self.enemies[boss_idx].home_x;
        cap.home_y = self.enemies[boss_idx].home_y;
        cap.phase = EnemyPhase::Returning;
        cap.hp = 1;
        cap.path_t = 0.0;
        self.enemies.push(cap);
        self.captured_active = true;
        self.captured_slot = Some(captured_slot);
        self.push_audio("capture", self.player.x, self.player.y);
        self.push_particle("capture", self.player.x + 8, self.player.y + 8, 30, 3);
        // Player dies (loses a life).
        self.kill_player();
    }

    fn kill_player(&mut self) {
        let px = self.player.x;
        let py = self.player.y;
        self.player.kill();
        self.explosions.push(ExplosionSprite {
            x: px,
            y: py,
            frames_left: DEATH_EXPLODE_FRAMES,
            total_frames: DEATH_EXPLODE_FRAMES,
            big: true,
        });
        self.push_audio("explosion_player", px, py);
        self.push_particle("explosion", px + 8, py + 8, 40, 4);
        self.player.dual = false; // lose dual on death
    }

    fn check_player_death(&mut self) {
        if matches!(self.player.state, PlayerState::Dying { .. }) {
            self.enter_phase(Phase::PlayerDying);
        }
    }

    fn check_stage_clear(&mut self) {
        // Stage cleared when no enemies remain in the formation (or challenge complete)
        let any_active = self
            .enemies
            .iter()
            .any(|e| matches!(e.phase, EnemyPhase::Entering | EnemyPhase::InFormation | EnemyPhase::Diving | EnemyPhase::BeamingDown | EnemyPhase::Returning));
        // For challenge stage, completion is handled in tick_challenge_spawns.
        if is_challenge(self.stage) {
            return;
        }
        if !any_active && !self.enemies.iter().any(|e| matches!(e.phase, EnemyPhase::Dying)) {
            self.push_audio("stage_cleared", SCREEN_W / 2, SCREEN_H / 2);
            self.enter_phase(Phase::StageCleared);
        }
    }

    fn tick_explosions(&mut self) {
        for ex in self.explosions.iter_mut() {
            if ex.frames_left > 0 {
                ex.frames_left -= 1;
            }
        }
        self.explosions.retain(|e| e.frames_left > 0);
    }

    fn tick_bonus_items(&mut self) {
        let player_alive = matches!(self.player.state, PlayerState::Alive);
        let px = self.player.x;
        let py = self.player.y;
        let pw = if self.player.dual {
            PLAYER_W * 2 + 4
        } else {
            PLAYER_W
        };
        let mut collected: Vec<(u8, i32, i32)> = Vec::new();
        for b in self.bonus_items.iter_mut() {
            b.y = (b.y as f32 + b.vy) as i32;
            if b.frames_left > 0 {
                b.frames_left -= 1;
            }
            if b.y > SCREEN_H || b.frames_left == 0 {
                b.alive = false;
                continue;
            }
            if player_alive
                && aabb(b.x, b.y, ENEMY_W, ENEMY_H, px, py, pw, PLAYER_H)
            {
                b.alive = false;
                collected.push((b.kind, b.x, b.y));
            }
        }
        self.bonus_items.retain(|b| b.alive);
        for (kind, x, y) in collected {
            let val = crate::scoring::set_bonus(kind);
            self.add_score(val);
            self.push_score_pop(x, y, val);
            self.push_audio("extra_life", x, y); // fanfare-ish ping
            self.push_particle("bonus", x + 8, y + 8, 18, 2);
        }
    }

    /// Deterministically spawn a ROM-typed bonus item at the given position.
    /// The kind is supplied by `bonus_drop_for_kill` from the per-stage table,
    /// not by RNG-weighted chance.
    fn spawn_bonus_item(&mut self, x: i32, y: i32, kind: u8) {
        self.bonus_items.push(BonusItem {
            kind,
            x,
            y,
            vy: 0.65,
            frames_left: 360,
            alive: true,
        });
    }

    fn try_rescue_captured(&mut self) {
        if !self.captured_active {
            return;
        }
        // Find captured fighter that's still alive (in formation or diving).
        let cap_idx = self.enemies.iter().enumerate().find_map(|(i, e)| {
            if e.kind == EnemyKind::CapturedFighter && e.alive {
                Some(i)
            } else {
                None
            }
        });
        if let Some(idx) = cap_idx {
            let rx = self.enemies[idx].x;
            let ry = self.enemies[idx].y;
            // Remove the captured fighter from formation; award rescue.
            self.enemies[idx].alive = false;
            self.enemies[idx].phase = EnemyPhase::Dying;
            self.enemies[idx].explode_frames_left = 1; // quietly reap
            self.captured_active = false;
            self.captured_slot = None;
            self.player.dual = true;
            self.add_score(1000);
            self.push_score_pop(rx, ry, 1000);
            self.push_audio("perfect_fanfare", rx, ry);
            self.push_particle("rescue", rx + 8, ry + 8, 40, 3);
        }
    }

    fn tick_score_pops(&mut self) {
        for s in self.score_pops.iter_mut() {
            if s.frames_left > 0 {
                s.frames_left -= 1;
            }
        }
        self.score_pops.retain(|s| s.frames_left > 0);
    }

    fn kill_all_enemies(&mut self) {
        for e in self.enemies.iter_mut() {
            e.alive = false;
            e.phase = EnemyPhase::Dying;
            e.explode_frames_left = 6;
        }
    }

    // ----------------------------------------------------------------
    //  Score & lives
    // ----------------------------------------------------------------

    fn add_score(&mut self, val: u32) {
        let before = self.score;
        self.score = self.score.saturating_add(val);
        if self.score > self.hi_score {
            self.hi_score = self.score;
        }
        // Extra life threshold check.
        for &t in self.extra_thresholds.clone().iter() {
            if before < t && self.score >= t {
                self.player.lives = self.player.lives.saturating_add(1).min(8);
                self.push_audio("extra_life", SCREEN_W / 2, 8);
            }
        }
    }

    fn push_score_pop(&mut self, x: i32, y: i32, value: u32) {
        if value == 0 {
            return;
        }
        self.score_pops.push(ScorePopActive {
            x,
            y: y - 4,
            value,
            frames_left: 40,
        });
        self.pending_score_pop = Some(ScorePop {
            x,
            y,
            value,
            frame: self.frame,
        });
    }

    fn push_audio(&mut self, kind: &str, x: i32, y: i32) {
        self.audio_events.push(AudioEvent {
            kind: kind.to_string(),
            x,
            y,
        });
    }

    fn push_particle(&mut self, kind: &str, x: i32, y: i32, count: u32, palette: u8) {
        self.particle_events.push(ParticleEvent {
            kind: kind.to_string(),
            x,
            y,
            count,
            palette,
        });
    }

    // ----------------------------------------------------------------
    //  Frame state assembly
    // ----------------------------------------------------------------

    fn build_frame_state(&self) -> FrameState {
        let mut sprites: Vec<Sprite> = Vec::with_capacity(
            1 + self.player_bullets.len()
                + self.enemy_bullets.len()
                + self.enemies.len()
                + self.explosions.len()
                + self.bonus_items.len()
                + self.score_pops.len(),
        );

        // Player
        let p_visible = match self.player.state {
            PlayerState::Alive => {
                if self.player.is_invulnerable() {
                    (self.frame / 4) % 2 == 0
                } else {
                    true
                }
            }
            PlayerState::Dying { .. } => false,
            _ => false,
        };
        sprites.push(Sprite {
            kind: if self.player.dual { SpriteKind::PlayerDual } else { SpriteKind::Player },
            x: self.player.x,
            y: self.player.y,
            w: if self.player.dual { PLAYER_W * 2 + 4 } else { PLAYER_W },
            h: PLAYER_H,
            frame: ((self.frame / 4) % 2) as u8,
            angle_deg: 0.0,
            visible: p_visible,
            score: 0,
        });

        for b in &self.player_bullets {
            sprites.push(Sprite {
                kind: SpriteKind::PlayerBullet,
                x: b.x,
                y: b.y,
                w: BULLET_W,
                h: BULLET_H,
                frame: 0,
                angle_deg: 0.0,
                visible: true,
                score: 0,
            });
        }
        for b in &self.enemy_bullets {
            sprites.push(Sprite {
                kind: SpriteKind::EnemyBullet,
                x: b.x,
                y: b.y,
                w: BULLET_W,
                h: BULLET_H,
                frame: 0,
                angle_deg: 0.0,
                visible: true,
                score: 0,
            });
        }
        for e in &self.enemies {
            let kind = match e.kind {
                EnemyKind::Zako => SpriteKind::EnemyZako,
                EnemyKind::Goei => SpriteKind::EnemyGoei,
                EnemyKind::Boss => {
                    if e.injured {
                        SpriteKind::EnemyBossInjured
                    } else {
                        SpriteKind::EnemyBoss
                    }
                }
                EnemyKind::CapturedFighter => SpriteKind::EnemyCaptured,
            };
            // Draw a tractor beam underneath the boss while BeamingDown.
            if e.phase == EnemyPhase::BeamingDown {
                sprites.push(Sprite {
                    kind: SpriteKind::TractorBeam,
                    x: e.x - 8,
                    y: e.y + 12,
                    w: ENEMY_W + 16,
                    h: 90,
                    frame: ((self.frame / 4) % 4) as u8,
                    angle_deg: 0.0,
                    visible: true,
                    score: 0,
                });
            }
            sprites.push(Sprite {
                kind,
                x: e.x,
                y: e.y,
                w: ENEMY_W,
                h: ENEMY_H,
                frame: ((self.frame / 16) % 2) as u8,
                angle_deg: e.angle_deg,
                visible: !matches!(e.phase, EnemyPhase::Dying),
                score: 0,
            });
        }
        for ex in &self.explosions {
            let elapsed = ex.total_frames - ex.frames_left;
            let frame_idx =
                ((elapsed * 4) / ex.total_frames.max(1)).min(3) as u8;
            sprites.push(Sprite {
                kind: SpriteKind::Explosion,
                x: ex.x,
                y: ex.y,
                w: if ex.big { ENEMY_W * 2 } else { ENEMY_W },
                h: if ex.big { ENEMY_H * 2 } else { ENEMY_H },
                frame: frame_idx,
                angle_deg: 0.0,
                visible: true,
                score: 0,
            });
        }
        for b in &self.bonus_items {
            let k = match b.kind {
                4 => SpriteKind::BonusScorpion,
                5 => SpriteKind::BonusSpy,
                _ => SpriteKind::BonusFlag,
            };
            sprites.push(Sprite {
                kind: k,
                x: b.x,
                y: b.y,
                w: ENEMY_W,
                h: ENEMY_H,
                frame: 0,
                angle_deg: 0.0,
                visible: true,
                score: 0,
            });
        }
        for s in &self.score_pops {
            sprites.push(Sprite {
                kind: SpriteKind::ScorePop,
                x: s.x,
                y: s.y - (40 - s.frames_left as i32) / 2,
                w: 30,
                h: 8,
                frame: 0,
                angle_deg: 0.0,
                visible: true,
                score: s.value,
            });
        }

        FrameState {
            frame: self.frame,
            score: self.score,
            hi_score: self.hi_score.max(self.score),
            lives: self.player.lives,
            stage: self.stage,
            phase: self.phase,
            sprites,
            player_dead: !matches!(self.player.state, PlayerState::Alive),
            player_dual: self.player.dual,
            player_captured: self.captured_active,
            sim_time_s: (self.frame as f64) / FRAME_HZ,
            audio_events: self.audio_events.clone(),
            particle_events: self.particle_events.clone(),
            stage_banner_frames: if matches!(self.phase, Phase::StageIntro) {
                STAGE_INTRO_FRAMES.saturating_sub(self.phase_frames)
            } else {
                0
            },
            challenge: is_challenge(self.stage),
            challenge_hits: self.challenge_hits,
            challenge_total: self.challenge_total,
            challenge_complete: matches!(self.phase, Phase::ChallengeResult),
            challenge_perfect: matches!(self.phase, Phase::ChallengeResult)
                && self.challenge_hits == self.challenge_total,
            challenge_bonus: if matches!(self.phase, Phase::ChallengeResult) {
                if self.challenge_hits == self.challenge_total {
                    10_000
                } else {
                    let waves_cleared = (self.challenge_hits / 8) as u8;
                    let mut b = 0;
                    for w in 0..waves_cleared {
                        b += challenge_wave_bonus(w);
                    }
                    b
                }
            } else {
                0
            },
            last_score_pop: self.pending_score_pop,
            tractor_active: self.tractor_active,
        }
    }
}

fn aim_vx(ex: i32, ey: i32, px: i32, py: i32) -> f32 {
    let dx = (px - ex) as f32;
    let dy = (py - ey).max(1) as f32;
    let v = (dx / dy) * (ENEMY_BULLET_SPEED as f32);
    v.clamp(-3.0, 3.0)
}

fn stages_difficulty(stage: u32) -> u32 {
    crate::stages::difficulty_rank(stage) as u32
}

// --------------------------------------------------------------------
//  Hi-score persistence stubs. The actual storage lives in the browser
//  (`localStorage`), but the engine keeps an in-memory value for tests.
// --------------------------------------------------------------------
fn load_hi_score() -> u32 {
    20_000
}

fn save_hi_score(_score: u32) {
    // TS layer mirrors `FrameState.hi_score` into `localStorage`.
}
