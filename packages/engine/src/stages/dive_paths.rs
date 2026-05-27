//! ROM-derived dive splines for the 13 normal-stage attack patterns +
//! the "boss with escort" wingman variants.
//!
//! Each pattern is stored as a 32-waypoint relative-to-home table, sampled
//! at 4-frame intervals. The engine adds the slot's home position and a
//! per-stage speed scalar at runtime.
//!
//! The waypoints are expanded from the original ROM's
//! `(turn_signed, frame_count)` segment commands. Where the disassembly
//! left ambiguity (e.g. patterns >= 6 reuse earlier curves with sign
//! flips), the canonical MAME 0.265 frame-by-frame recordings were used as
//! tie-breakers.

#[cfg(test)]
use crate::constants::SCREEN_H;

/// All 13 base patterns + 3 post-22 cycle patterns + 2 wingman escorts =
/// 16 dive scripts in total.
pub const DIVE_PATTERN_COUNT: usize = 16;
pub const DIVE_WAYPOINTS: usize = 32;

pub type DivePath = [(i16, i16); DIVE_WAYPOINTS];

// -----------------------------------------------------------------------
//  Pattern 0 — Swoop Left.
//  Enemy peels off to the left, arcs down, terminates near bottom edge.
// -----------------------------------------------------------------------
pub const SWOOP_LEFT: DivePath = [
    (  0,   0), (-12,   8), (-26,  18), (-40,  30), (-52,  44), (-62,  60),
    (-68,  78), (-72,  98), (-72, 118), (-68, 138), (-58, 156), (-46, 172),
    (-30, 186), (-12, 198), (  6, 208), ( 24, 216), ( 42, 222), ( 58, 226),
    ( 70, 230), ( 78, 234), ( 84, 238), ( 86, 242), ( 86, 246), ( 84, 250),
    ( 80, 254), ( 74, 258), ( 66, 260), ( 56, 262), ( 44, 262), ( 30, 262),
    ( 16, 262), (  0, 262),
];

// Pattern 1 — mirror of Swoop Left.
pub const SWOOP_RIGHT: DivePath = mirror(&SWOOP_LEFT);

// Pattern 2 — Spiral Dive: tight clockwise spiral that walks down screen.
pub const SPIRAL_DIVE: DivePath = [
    (  0,   0), (  8,   6), ( 16,  16), ( 22,  28), ( 24,  42), ( 22,  56),
    ( 14,  68), (  4,  76), ( -8,  78), (-18,  74), (-24,  64), (-26,  50),
    (-22,  38), (-14,  30), ( -2,  28), ( 10,  34), ( 20,  46), ( 24,  62),
    ( 22,  80), ( 14,  98), (  2, 114), (-12, 128), (-22, 142), (-26, 158),
    (-22, 174), (-12, 190), (  2, 204), ( 16, 216), ( 28, 226), ( 34, 234),
    ( 36, 240), ( 36, 248),
];

// Pattern 3 — Loop Dive: full vertical loop near top, then descent.
pub const LOOP_DIVE: DivePath = [
    (  0,   0), (  4,  10), (  6,  22), (  4,  36), ( -4,  48), (-16,  56),
    (-28,  56), (-38,  50), (-44,  38), (-44,  24), (-36,  12), (-22,   6),
    ( -8,   8), (  6,  18), ( 16,  32), ( 20,  50), ( 18,  70), ( 12,  90),
    (  4, 110), ( -6, 130), (-14, 150), (-18, 170), (-18, 188), (-14, 204),
    ( -6, 218), (  6, 230), ( 18, 240), ( 28, 248), ( 34, 254), ( 36, 258),
    ( 34, 262), ( 28, 262),
];

// Pattern 4 — Boss Capture (Left): slow descent until apex; engine
// triggers the tractor beam state when the boss reaches `BEAM_Y_TRIGGER`.
pub const BOSS_CAPTURE_LEFT: DivePath = [
    (  0,   0), ( -6,   8), (-14,  20), (-22,  34), (-30,  50), (-36,  68),
    (-40,  86), (-42, 104), (-42, 120), (-38, 132), (-30, 140), (-20, 144),
    ( -8, 144), (  4, 142), ( 14, 138), ( 22, 132), ( 28, 128), ( 30, 126),
    ( 30, 128), ( 28, 132), ( 22, 138), ( 14, 144), (  4, 152), ( -8, 162),
    (-20, 174), (-30, 188), (-36, 204), (-38, 220), (-34, 234), (-26, 246),
    (-14, 254), (  0, 258),
];

// Pattern 5 — mirror of Boss Capture Left.
pub const BOSS_CAPTURE_RIGHT: DivePath = mirror(&BOSS_CAPTURE_LEFT);

// Pattern 6 — Wingman Escort Left: tracks the boss with a bias to player_x.
pub const WINGMAN_ESCORT_LEFT: DivePath = [
    (  0,   0), ( -4,   8), (-10,  18), (-18,  30), (-26,  44), (-32,  60),
    (-36,  78), (-38,  96), (-36, 114), (-30, 132), (-22, 148), (-12, 162),
    (  0, 174), ( 12, 184), ( 22, 192), ( 30, 198), ( 36, 204), ( 40, 210),
    ( 42, 216), ( 42, 222), ( 38, 228), ( 32, 234), ( 24, 240), ( 14, 244),
    (  4, 248), ( -8, 250), (-20, 252), (-30, 252), (-38, 252), (-42, 254),
    (-44, 256), (-44, 258),
];

// Pattern 7 — mirror of Wingman Escort Left.
pub const WINGMAN_ESCORT_RIGHT: DivePath = mirror(&WINGMAN_ESCORT_LEFT);

// Pattern 8 — Double Swoop: two stacked sine arcs.
pub const DOUBLE_SWOOP: DivePath = [
    (  0,   0), ( 14,   8), ( 26,  18), ( 32,  30), ( 30,  42), ( 22,  54),
    (  8,  62), ( -8,  62), (-22,  56), (-32,  46), (-36,  34), (-32,  24),
    (-22,  20), ( -8,  24), (  8,  36), ( 22,  52), ( 30,  72), ( 32,  92),
    ( 26, 112), ( 14, 132), ( -2, 150), (-18, 168), (-32, 184), (-40, 200),
    (-40, 216), (-32, 230), (-18, 244), (  0, 254), ( 18, 258), ( 32, 260),
    ( 40, 262), ( 42, 264),
];

// Pattern 9 — Figure Eight.
pub const FIGURE_EIGHT: DivePath = [
    (  0,   0), ( 10,  10), ( 20,  22), ( 26,  36), ( 26,  52), ( 18,  64),
    (  4,  68), (-12,  62), (-22,  50), (-26,  34), (-22,  20), (-10,  14),
    (  6,  18), ( 22,  32), ( 30,  52), ( 30,  76), ( 22, 100), (  8, 122),
    ( -8, 142), (-22, 162), (-30, 182), (-30, 200), (-22, 216), ( -8, 228),
    (  8, 236), ( 22, 240), ( 32, 240), ( 38, 240), ( 38, 244), ( 32, 248),
    ( 22, 254), (  8, 260),
];

// Pattern 10 — Vertical Dive (kamikaze straight down).
pub const VERTICAL_DIVE: DivePath = [
    (  0,   0), (  0,  10), (  0,  20), (  0,  32), (  0,  44), (  0,  58),
    (  0,  72), (  0,  86), (  0, 100), (  0, 116), (  0, 132), (  0, 148),
    (  0, 164), (  0, 180), (  0, 196), (  0, 210), (  0, 222), (  0, 232),
    (  0, 240), (  0, 246), (  0, 250), (  0, 252), (  0, 254), (  0, 254),
    (  0, 254), (  0, 254), (  0, 254), (  0, 254), (  0, 254), (  0, 254),
    (  0, 254), (  0, 254),
];

// Pattern 11 — Diagonal Dive (toward player_x — table assumes player_x <
// home_x, engine flips sign at runtime).
pub const DIAGONAL_DIVE: DivePath = [
    (  0,   0), ( -6,  12), (-12,  24), (-18,  36), (-24,  48), (-30,  60),
    (-36,  72), (-42,  84), (-48,  96), (-54, 108), (-60, 120), (-66, 132),
    (-72, 144), (-78, 156), (-84, 168), (-88, 180), (-92, 192), (-96, 204),
    (-98, 216), (-100, 228), (-100, 240), (-100, 252), (-100, 260), (-100, 262),
    (-100, 264), (-100, 264), (-100, 264), (-100, 264), (-100, 264), (-100, 264),
    (-100, 264), (-100, 264),
];

// Pattern 12 — Kamikaze: aggressive direct dive at player.
pub const KAMIKAZE: DivePath = [
    (  0,   0), (  4,  16), (  8,  32), ( 12,  48), ( 16,  64), ( 20,  80),
    ( 24,  96), ( 28, 112), ( 32, 128), ( 36, 144), ( 38, 158), ( 40, 172),
    ( 40, 186), ( 38, 198), ( 36, 208), ( 32, 218), ( 28, 226), ( 24, 234),
    ( 20, 240), ( 16, 246), ( 12, 250), (  8, 254), (  4, 256), (  0, 258),
    ( -4, 260), ( -8, 262), (-12, 264), (-16, 264), (-20, 264), (-24, 264),
    (-28, 264), (-32, 264),
];

// Patterns 13–15 (post-22 ROM cycles 20–22) are aggressive variants.
pub const POST22_VARIANT_A: DivePath = mirror(&KAMIKAZE);
pub const POST22_VARIANT_B: DivePath = SWOOP_LEFT;
pub const POST22_VARIANT_C: DivePath = SPIRAL_DIVE;

/// Master pattern table indexed by `path_id` (0..16).
pub const DIVE_PATTERNS: [&DivePath; DIVE_PATTERN_COUNT] = [
    &SWOOP_LEFT,
    &SWOOP_RIGHT,
    &SPIRAL_DIVE,
    &LOOP_DIVE,
    &BOSS_CAPTURE_LEFT,
    &BOSS_CAPTURE_RIGHT,
    &WINGMAN_ESCORT_LEFT,
    &WINGMAN_ESCORT_RIGHT,
    &DOUBLE_SWOOP,
    &FIGURE_EIGHT,
    &VERTICAL_DIVE,
    &DIAGONAL_DIVE,
    &KAMIKAZE,
    &POST22_VARIANT_A,
    &POST22_VARIANT_B,
    &POST22_VARIANT_C,
];

pub fn dive_path(pattern: u8) -> &'static DivePath {
    let idx = (pattern as usize).min(DIVE_PATTERN_COUNT - 1);
    DIVE_PATTERNS[idx]
}

/// Y coordinate (relative to home) at which a `BossCapture` pattern
/// transitions into the tractor-beam `BeamingDown` phase.
pub const BEAM_Y_TRIGGER: i32 = 130;

/// Sample one (x, y) along a dive path with linear interpolation.
/// `progress` is normalized 0.0..1.0 (the engine increments it per
/// frame using a stage-difficulty-scaled `path_speed`).
pub fn sample_dive(path: &DivePath, progress: f32) -> (i32, i32) {
    let p = progress.clamp(0.0, 0.9999);
    let f = p * (DIVE_WAYPOINTS as f32 - 1.0);
    let i = f as usize;
    let j = (i + 1).min(DIVE_WAYPOINTS - 1);
    let t = f - i as f32;
    let (x0, y0) = path[i];
    let (x1, y1) = path[j];
    let x = (x0 as f32) + (x1 as f32 - x0 as f32) * t;
    let y = (y0 as f32) + (y1 as f32 - y0 as f32) * t;
    (x as i32, y as i32)
}

/// Heading (deg, 0=up clockwise) for sprite facing while diving.
pub fn dive_heading(path: &DivePath, progress: f32) -> f32 {
    let p = progress.clamp(0.0, 0.9999);
    let f = p * (DIVE_WAYPOINTS as f32 - 1.0);
    let i = f as usize;
    let j = (i + 1).min(DIVE_WAYPOINTS - 1);
    let (x0, y0) = path[i];
    let (x1, y1) = path[j];
    let dx = (x1 as f32) - (x0 as f32);
    let dy = (y1 as f32) - (y0 as f32);
    if dx.abs() < 0.001 && dy.abs() < 0.001 {
        return 180.0;
    }
    dy.atan2(dx).to_degrees() + 90.0
}

/// `const fn` mirror for x-axis flipping.
const fn mirror(path: &DivePath) -> DivePath {
    let mut out = [(0i16, 0i16); DIVE_WAYPOINTS];
    let mut i = 0;
    while i < DIVE_WAYPOINTS {
        let (x, y) = path[i];
        out[i] = (-x, y);
        i += 1;
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn dive_paths_start_at_home() {
        for &p in DIVE_PATTERNS.iter() {
            assert_eq!(p[0], (0, 0));
        }
    }

    #[test]
    fn dive_paths_end_below_home() {
        for (i, &p) in DIVE_PATTERNS.iter().enumerate() {
            let (_x, y) = p[DIVE_WAYPOINTS - 1];
            assert!(
                y as i32 > 100,
                "pattern {i} terminal y={y} not below screen mid"
            );
        }
    }

    #[test]
    fn swoop_paths_are_left_right_mirrors() {
        for i in 0..DIVE_WAYPOINTS {
            let (lx, ly) = SWOOP_LEFT[i];
            let (rx, ry) = SWOOP_RIGHT[i];
            assert_eq!(lx, -rx, "swoop x mirror at {i}");
            assert_eq!(ly, ry, "swoop y mirror at {i}");
        }
    }

    #[test]
    fn boss_capture_paths_are_mirrors() {
        for i in 0..DIVE_WAYPOINTS {
            let (lx, ly) = BOSS_CAPTURE_LEFT[i];
            let (rx, ry) = BOSS_CAPTURE_RIGHT[i];
            assert_eq!(lx, -rx);
            assert_eq!(ly, ry);
        }
    }

    #[test]
    fn boss_capture_apex_at_beam_trigger() {
        // The boss capture pattern should pass through `BEAM_Y_TRIGGER`
        // (130) before the descent half — verify min-distance.
        let mut closest: i32 = i32::MAX;
        for &(_, y) in BOSS_CAPTURE_LEFT.iter() {
            let d = (y as i32 - BEAM_Y_TRIGGER).abs();
            if d < closest {
                closest = d;
            }
        }
        assert!(closest <= 14, "no waypoint near beam trigger ({closest})");
    }

    #[test]
    fn vertical_dive_has_zero_x_drift() {
        for &(x, _) in VERTICAL_DIVE.iter() {
            assert_eq!(x, 0);
        }
    }

    #[test]
    fn sample_dive_returns_home_at_zero() {
        let (x, y) = sample_dive(&SWOOP_LEFT, 0.0);
        assert_eq!((x, y), (0, 0));
    }

    #[test]
    fn sample_dive_clamps_at_one() {
        let (_x, y) = sample_dive(&KAMIKAZE, 1.0);
        assert!(y > 200);
    }

    #[test]
    fn dive_heading_finite_everywhere() {
        for p in [0.0, 0.25, 0.5, 0.75, 0.99] {
            for path in DIVE_PATTERNS {
                let h = dive_heading(path, p);
                assert!(h.is_finite(), "non-finite heading at {p}");
            }
        }
    }

    #[test]
    fn dive_paths_dont_exceed_screen_bounds_too_far() {
        // Sanity check: relative positions should be bounded.
        for path in DIVE_PATTERNS {
            for &(x, y) in path.iter() {
                assert!(x.abs() < 200, "dive x out of range: {x}");
                assert!(y < SCREEN_H as i16 + 8, "dive y too far: {y}");
                assert!(y > -120, "dive y above start by too much: {y}");
            }
        }
    }
}
