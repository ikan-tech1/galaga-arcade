//! Embedded attract-mode demo input track.
//!
//! The original Galaga arcade ROM ships an attract demo as a stored timeline
//! of joystick / fire keystrokes. The CPU replays the timeline at the engine
//! frame cadence so the demo screen always plays out the same way.
//!
//! We replicate the same idea with a compact run-length-encoded event list:
//! `(frame_offset, left, right, fire)`. The cursor walks the events and the
//! current frame's `Inputs` are the most recent event whose `frame_offset` is
//! `<= cursor`. The track loops at `LOOP_FRAMES`.

use crate::Inputs;

/// One demo event. Held until the next event takes effect.
#[derive(Clone, Copy, Debug)]
struct Event {
    at: u32,
    left: bool,
    right: bool,
    fire: bool,
}

const fn ev(at: u32, left: bool, right: bool, fire: bool) -> Event {
    Event {
        at,
        left,
        right,
        fire,
    }
}

/// Embedded demo timeline. Roughly 16 seconds @ 60.606 Hz; loops thereafter.
///
/// Sequence: glide right → spray fire → drift left → centre and repeat.
/// Crafted by hand to look like an arcade attract recording — no RNG, fully
/// deterministic so the test suite can replay it byte-for-byte.
const TRACK: &[Event] = &[
    ev(0, false, false, false),
    ev(18, false, true, false),
    ev(34, false, true, true),
    ev(46, false, false, true),
    ev(60, true, false, true),
    ev(82, true, false, false),
    ev(110, false, false, true),
    ev(140, false, true, true),
    ev(178, false, false, false),
    ev(200, true, false, true),
    ev(232, true, false, false),
    ev(260, false, false, true),
    ev(284, false, true, true),
    ev(316, false, true, false),
    ev(348, false, false, true),
    ev(380, true, false, true),
    ev(412, true, false, false),
    ev(440, false, false, true),
    ev(472, false, true, true),
    ev(508, false, false, false),
    ev(536, true, false, true),
    ev(572, true, false, false),
    ev(604, false, false, true),
    ev(640, false, true, true),
    ev(680, false, false, true),
    ev(720, true, false, false),
    ev(760, false, false, true),
    ev(800, false, true, true),
    ev(840, false, false, false),
    ev(880, true, false, true),
    ev(920, true, false, false),
    ev(960, false, false, false),
];

const LOOP_FRAMES: u32 = 980;

/// Inputs at a given attract-mode frame cursor. Loops at `LOOP_FRAMES` so the
/// demo replays cleanly without ever stalling.
pub fn input_at(cursor: u32) -> Inputs {
    let f = cursor % LOOP_FRAMES;
    // Find the most recent event whose `at <= f` — TRACK is sorted by `at`.
    let mut chosen = TRACK[0];
    for e in TRACK {
        if e.at <= f {
            chosen = *e;
        } else {
            break;
        }
    }
    Inputs {
        left: chosen.left,
        right: chosen.right,
        fire: chosen.fire,
        start: false,
        coin: false,
        up: false,
        down: false,
        pause: false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn track_starts_neutral() {
        let i = input_at(0);
        assert!(!i.left && !i.right && !i.fire);
    }

    #[test]
    fn track_holds_event_until_next() {
        // At frame 30 we should have right=true, fire=false (event @ 18).
        let i = input_at(30);
        assert!(i.right);
        assert!(!i.fire);
    }

    #[test]
    fn track_loops_back_to_start() {
        let a = input_at(0);
        let b = input_at(LOOP_FRAMES);
        assert_eq!(a.left, b.left);
        assert_eq!(a.right, b.right);
        assert_eq!(a.fire, b.fire);
    }

    #[test]
    fn fire_pulses_appear() {
        let mut any_fire = false;
        for f in 0..LOOP_FRAMES {
            if input_at(f).fire {
                any_fire = true;
                break;
            }
        }
        assert!(any_fire, "demo track never fires");
    }

    #[test]
    fn track_is_sorted() {
        for w in TRACK.windows(2) {
            assert!(w[0].at < w[1].at, "track not sorted at {}", w[0].at);
        }
    }
}
