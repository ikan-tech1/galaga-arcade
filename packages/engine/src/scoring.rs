//! ROM-accurate scoring tables.
//!
//! Source: MAME `galaga.cpp` and the original disassembly. Scores are
//! identical to the arcade ROM.

pub const ZAKO: u8 = 0;
pub const GOEI: u8 = 1;
pub const BOSS: u8 = 2;
pub const BOSS_WINGMAN: u8 = 3;
pub const SCORPION: u8 = 4;
pub const SPY: u8 = 5;
pub const FLAG: u8 = 6;
pub const CAPTURED_FIGHTER: u8 = 7;

pub fn score_for(enemy: u8, diving: bool) -> u32 {
    match (enemy, diving) {
        (0, false) => 50,    // Zako formation
        (0, true) => 100,    // Zako diving
        (1, false) => 80,    // Goei formation
        (1, true) => 160,    // Goei diving
        (2, false) => 150,   // Boss formation
        (2, true) => 400,    // Boss diving solo
        (3, false) => 800,   // Boss with one wingman
        (3, true) => 1600,   // Boss with two wingmen
        (4, _) => 160,       // Scorpion
        (5, _) => 160,       // Bosconian spy
        (6, _) => 160,       // Galaxian flag
        (7, false) => 500,   // Captured fighter in formation
        (7, true) => 1000,   // Captured fighter while flying
        _ => 0,
    }
}

pub fn set_bonus(item: u8) -> u32 {
    match item {
        4 => 1_000,
        5 => 2_000,
        6 => 3_000,
        _ => 0,
    }
}

pub fn challenge_wave_bonus(wave: u8) -> u32 {
    match wave {
        0 => 1_000,
        1 => 1_500,
        2 => 2_000,
        3 => 2_500,
        4 => 3_000,
        _ => 3_000,
    }
}

/// Score boss + 1 wingman = 800, boss + 2 wingmen = 1600.
pub fn boss_escort_score(escort_count: u8) -> u32 {
    match escort_count {
        0 => 400,
        1 => 800,
        _ => 1600,
    }
}
