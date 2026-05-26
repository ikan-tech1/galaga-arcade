/** Modern additive particle system layered on top of the arcade sprites. */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // frames left
  maxLife: number;
  color: string;
  size: number;
}

export class Particles {
  private pool: Particle[] = [];

  burst(x: number, y: number, count: number, palette: string[], spread = 1.5) {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.7;
      const speed = (Math.random() * 1.5 + 0.6) * spread;
      this.pool.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 18 + (Math.random() * 12) | 0,
        maxLife: 30,
        color: palette[(Math.random() * palette.length) | 0],
        size: 1 + ((Math.random() * 2) | 0),
      });
    }
  }

  step() {
    for (let i = this.pool.length - 1; i >= 0; i--) {
      const p = this.pool[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.94;
      p.vy = p.vy * 0.94 + 0.03;
      p.life -= 1;
      if (p.life <= 0) this.pool.splice(i, 1);
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.pool) {
      const a = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x | 0, p.y | 0, p.size, p.size);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  clear() {
    this.pool.length = 0;
  }
}
