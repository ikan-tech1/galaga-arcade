//! 40-slot formation grid + idle bob animation.
//!
//! Slot indices 0..40:
//!   row 0 (bosses):       4 slots, columns 2..6
//!   rows 1-2 (goei):      8 slots each, columns 0..8
//!   rows 3-4 (zako):     10 slots each, columns -1..9 (zako packs tighter)
//!
//! In practice we just use 8 columns × 5 rows and let layout decide which
//! slots are bosses/goei/zako via `enemy_kind_for_slot`.

use crate::constants::*;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum EnemyKind {
    Zako,
    Goei,
    Boss,
    CapturedFighter,
}

impl EnemyKind {
    pub fn id(self) -> u8 {
        match self {
            EnemyKind::Zako => 0,
            EnemyKind::Goei => 1,
            EnemyKind::Boss => 2,
            EnemyKind::CapturedFighter => 7,
        }
    }

    pub fn hp(self) -> u8 {
        match self {
            EnemyKind::Boss => 2,
            _ => 1,
        }
    }
}

/// Map a 0..40 slot id to (row, col) and an enemy kind.
pub fn slot_layout(slot: u8) -> (i32, i32) {
    let s = slot as i32;
    let row = s / FORMATION_COLS;
    let col = s % FORMATION_COLS;
    (row, col)
}

pub fn enemy_kind_for_slot(slot: u8) -> EnemyKind {
    let (row, col) = slot_layout(slot);
    match row {
        0 => {
            if (2..6).contains(&col) {
                EnemyKind::Boss
            } else {
                EnemyKind::Goei
            }
        }
        1 | 2 => EnemyKind::Goei,
        _ => EnemyKind::Zako,
    }
}

/// Home position (top-left of the 16x16 sprite) for a slot before sway.
pub fn home_pos(slot: u8) -> (i32, i32) {
    let (row, col) = slot_layout(slot);
    let x = FORMATION_LEFT + col * FORMATION_COL_W - ENEMY_W / 2;
    let y = FORMATION_TOP + row * FORMATION_ROW_H;
    (x, y)
}

/// Horizontal sway offset shared by the whole formation. Bounded to
/// FORMATION_SWAY_AMP pixels on either side.
pub fn formation_sway(frame: u64) -> i32 {
    let t = (frame % FORMATION_SWAY_PERIOD) as f64 / FORMATION_SWAY_PERIOD as f64;
    let theta = t * std::f64::consts::TAU;
    (theta.sin() * FORMATION_SWAY_AMP as f64) as i32
}

/// Slot count = 40.
pub const SLOT_COUNT: usize = (FORMATION_ROWS * FORMATION_COLS) as usize;
