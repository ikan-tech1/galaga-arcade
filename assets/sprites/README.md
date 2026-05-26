# Sprites

All sprites are recreated original work, embedded as ASCII templates in
[`packages/client/src/render/sprites.ts`](../../packages/client/src/render/sprites.ts).
They are baked into off-screen canvases at runtime and reused across the
rendering pipeline.

| Sprite              | Size  | Notes                                        |
|---------------------|-------|----------------------------------------------|
| `player`            | 16×16 | Cyan/blue arcade ship, idle frame            |
| `playerThrust`      | 16×16 | Thrust flicker alt frame                     |
| `captured`          | 16×16 | Red palette variant of the player ship       |
| `zakoOpen/Closed`   | 16×16 | Bee enemy, two-frame wing flap               |
| `goeiOpen/Closed`   | 16×16 | Butterfly enemy                              |
| `bossOpen/Closed`   | 16×16 | Boss Galaga, green palette                   |
| `bossOpenInjured`   | 16×16 | Boss after one hit, purple palette           |
| `scorpion/spy/flag` | 16×16 | Bonus items                                  |
| `playerBullet`      | 3×5   | White streak                                 |
| `enemyBullet`       | 5×5   | Red orb with white core                      |
| `explosion0..3`     | 16×16 | 4-frame procedural explosion atlas           |

The tractor beam and starfield are drawn procedurally per frame; see
[`GameCanvas.tsx`](../../packages/client/src/game/GameCanvas.tsx) and
[`starfield.ts`](../../packages/client/src/render/starfield.ts).
