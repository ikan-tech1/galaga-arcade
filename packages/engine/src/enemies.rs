//! Enemy entities — Zako (bee), Goei (butterfly), Boss Galaga, and the
//! captured-fighter ghost slot. Each enemy has a tiny state machine:
//!
//! `Entering` (flying along an entry spline into formation)
//!   → `InFormation` (idle bob in slot)
//!     → `Diving` (attack pattern path)
//!       → `Returning` back into formation
//!     → `BeamingDown` (boss capture mechanic)
//!     → `Dying` (explosion timer → reap)

#[allow(unused_imports)]
use crate::constants::*;
use crate::formation::{home_pos, EnemyKind};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum EnemyPhase {
    Entering,
    InFormation,
    Diving,
    BeamingDown,
    Returning,
    Dying,
}

#[derive(Clone, Debug)]
pub struct Enemy {
    pub kind: EnemyKind,
    pub slot: u8,
    pub home_x: i32,
    pub home_y: i32,
    pub x: i32,
    pub y: i32,
    pub vx: f32,
    pub vy: f32,
    pub angle_deg: f32, // facing
    pub phase: EnemyPhase,
    pub hp: u8,
    pub path_id: u8,        // entry or dive path id
    pub path_t: f32,        // 0..1 along path
    pub path_speed: f32,    // units per frame
    pub frame_started: u64,
    pub explode_frames_left: u32,
    /// For bosses: 0 = healthy, 1 = injured (one-hit). Captured ship tag uses
    /// `kind == CapturedFighter`.
    pub injured: bool,
    /// For bosses while capturing: holds the captured-fighter slot if any.
    pub captured_slot: Option<u8>,
    /// Boss tractor beam timer. >0 while beam is active.
    pub beam_frames: u32,
    /// Cached ROM-derived entry spline waypoints (pre-baked at spawn). The
    /// engine consumes these one at a time during the `Entering` phase.
    pub waypoints: [(i16, i16); 24],
    pub waypoint_count: u8,
    pub current_waypoint: u8,
    pub alive: bool,
    /// "Diving" subkind for scoring (single-boss vs boss+escort) — captured
    /// from formation state at the moment the dive launches; refreshed at the
    /// kill moment when the boss is destroyed.
    pub escort_count: u8,
    /// Slots of the wingmen escorting this boss on its current dive. Used at
    /// kill time to score the boss based on which escorts are still alive.
    pub escort_slots: [u8; 2],
    /// True while any captured-fighter is being dragged along by the boss
    /// during a dive (rescue opportunity is open).
    pub carrying_capture: bool,
}

impl Enemy {
    pub fn new_in_slot(kind: EnemyKind, slot: u8, frame: u64) -> Self {
        let (hx, hy) = home_pos(slot);
        Self {
            kind,
            slot,
            home_x: hx,
            home_y: hy,
            x: hx,
            y: hy,
            vx: 0.0,
            vy: 0.0,
            angle_deg: 180.0,
            phase: EnemyPhase::InFormation,
            hp: kind.hp(),
            path_id: 0,
            path_t: 0.0,
            path_speed: 0.0,
            frame_started: frame,
            explode_frames_left: 0,
            injured: false,
            captured_slot: None,
            beam_frames: 0,
            waypoints: [(0, 0); 24],
            waypoint_count: 0,
            current_waypoint: 0,
            alive: true,
            escort_count: 0,
            escort_slots: [u8::MAX; 2],
            carrying_capture: false,
        }
    }
}
