import { SCREEN_W, SCREEN_H } from '@galaga/shared';

/**
 * ROM-faithful single-layer scrolling starfield, plus optional modern
 * multi-depth parallax overlay.
 *
 * The arcade ROM uses a hardware-driven random star pattern that scrolls at
 * a fixed rate. We approximate it with three layered point clouds running
 * at different speeds; the renderer can disable the parallax layer for
 * "purist" mode (toggle in settings).
 */

interface Star {
  x: number;
  y: number;
  speed: number;
  color: string;
  size: number;
  twinkle: number;
  twinkleRate: number;
}

export class Starfield {
  private rom: Star[] = []; // ROM-style single layer
  private nearStars: Star[] = [];
  private farStars: Star[] = [];

  constructor(seed = 1) {
    let s = seed;
    const rand = () => {
      s ^= s << 13;
      s ^= s >>> 17;
      s ^= s << 5;
      return ((s >>> 0) & 0x00ffffff) / 0x01000000;
    };
    const palette = ['#ffffff', '#22d3ee', '#fde047', '#ff3aa6', '#a78bfa', '#6ee7b7'];
    // ROM layer: ~64 stars
    for (let i = 0; i < 64; i++) {
      this.rom.push({
        x: rand() * SCREEN_W,
        y: rand() * SCREEN_H,
        speed: 0.25 + rand() * 0.25,
        color: palette[(rand() * palette.length) | 0],
        size: 1,
        twinkle: rand(),
        twinkleRate: 0.005 + rand() * 0.01,
      });
    }
    // Mid (parallax)
    for (let i = 0; i < 36; i++) {
      this.nearStars.push({
        x: rand() * SCREEN_W,
        y: rand() * SCREEN_H,
        speed: 0.55 + rand() * 0.3,
        color: '#ffffff',
        size: 1,
        twinkle: rand(),
        twinkleRate: 0.004 + rand() * 0.008,
      });
    }
    // Far layer
    for (let i = 0; i < 96; i++) {
      this.farStars.push({
        x: rand() * SCREEN_W,
        y: rand() * SCREEN_H,
        speed: 0.08 + rand() * 0.12,
        color: '#7c87ad',
        size: 1,
        twinkle: rand(),
        twinkleRate: 0.002 + rand() * 0.005,
      });
    }
  }

  step(speedMul = 1) {
    const advance = (arr: Star[]) => {
      for (const s of arr) {
        s.y += s.speed * speedMul;
        if (s.y > SCREEN_H) {
          s.y = -1;
          s.x = Math.random() * SCREEN_W;
        }
        s.twinkle += s.twinkleRate;
      }
    };
    advance(this.rom);
    advance(this.nearStars);
    advance(this.farStars);
  }

  draw(
    ctx: CanvasRenderingContext2D,
    opts: { parallax: boolean } = { parallax: true },
  ) {
    const drawLayer = (arr: Star[], dimMul = 1) => {
      for (const s of arr) {
        const t = (Math.sin(s.twinkle * Math.PI * 2) + 1) * 0.5;
        const a = (0.4 + 0.6 * t) * dimMul;
        ctx.globalAlpha = a;
        ctx.fillStyle = s.color;
        ctx.fillRect(s.x | 0, s.y | 0, s.size, s.size);
      }
      ctx.globalAlpha = 1;
    };
    if (opts.parallax) drawLayer(this.farStars, 0.6);
    drawLayer(this.rom);
    if (opts.parallax) drawLayer(this.nearStars, 1);
  }
}
