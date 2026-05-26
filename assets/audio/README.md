# Audio

All audio is **synthesised at runtime** via the Web Audio API — no sample
files are bundled. The synth recipes live in
[`packages/client/src/game/audio.ts`](../../packages/client/src/game/audio.ts).

The Rust engine emits `AudioEvent[]` per frame; the TS layer dispatches each
event to the appropriate recipe.

| Event                | Recipe                                                  |
|----------------------|---------------------------------------------------------|
| `fire`               | Square + saw sweep, 1200 → 280 Hz, 40 ms                |
| `explosion_small`    | Band-passed noise + square sub                          |
| `explosion_player`   | Wider band-pass noise + long saw decay                  |
| `capture`            | Ascending sine arpeggio + noise wash                    |
| `tractor`            | Detuned triangle drone steps                            |
| `dive`               | Triangle sweep down                                     |
| `boss_dive`          | Saw + square sweep                                      |
| `stage_cleared`      | C-E-G-C arpeggio                                        |
| `wave_bonus`         | G-B-D-F arpeggio (triangle)                             |
| `perfect_fanfare`    | 6-note ascending C / E / G / C / E / C fanfare          |
| `extra_life`         | E-G-B-D arpeggio                                        |
| `game_start`         | A-C-E-G stinger                                         |
| `challenge_start`    | C-E-G ascending fanfare                                 |

Stage music and attract melody are simple looping square-wave sequences
defined in the same module.
