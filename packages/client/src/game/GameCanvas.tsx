import { useEffect, useRef } from 'react';
import { SCREEN_W, SCREEN_H, type Settings } from '@galaga/shared';
import { bakeAllSprites, drawDigits, type SpriteName } from '../render/sprites';
import { Starfield } from '../render/starfield';
import { Particles } from '../render/particles';
import type { FrameState, Sprite } from '../state/frame';
import type { ActivePowerUp, PowerUpDrop, ShipId } from '../meta/types';
import { drawBombFlash, drawPowerUpDrops, drawShieldRing } from '../render/powerUpOverlay';
import { drawRainbowPlayer, shipPlayerSprite } from '../render/shipSprites';

interface GameCanvasProps {
  frame: FrameState | null;
  settings: Settings;
  attract: boolean;
  quality?: 'high' | 'medium' | 'low';
  ship?: ShipId;
  drops?: PowerUpDrop[];
  active?: ActivePowerUp[];
  bombFlash?: number;
  /** Apply daily 'mirroredScreen' modifier — horizontal flip. */
  mirrored?: boolean;
  /** Apply daily 'tinyShip' cosmetic shrink to the player. */
  tinyShip?: boolean;
}

function spriteName(kind: Sprite['kind'], frameIdx: number): SpriteName | null {
  switch (kind) {
    case 'player': return frameIdx === 1 ? 'playerThrust' : 'player';
    case 'player_dual': return frameIdx === 1 ? 'playerThrust' : 'player';
    case 'player_bullet': return 'playerBullet';
    case 'enemy_bullet': return 'enemyBullet';
    case 'enemy_zako': return frameIdx === 1 ? 'zakoClosed' : 'zakoOpen';
    case 'enemy_goei': return frameIdx === 1 ? 'goeiClosed' : 'goeiOpen';
    case 'enemy_boss': return frameIdx === 1 ? 'bossClosed' : 'bossOpen';
    case 'enemy_boss_injured': return frameIdx === 1 ? 'bossClosedInjured' : 'bossOpenInjured';
    case 'enemy_captured': return 'captured';
    case 'bonus_scorpion': return 'scorpion';
    case 'bonus_spy': return 'spy';
    case 'bonus_flag': return 'flag';
    case 'explosion':
      return (
        ['explosion0', 'explosion1', 'explosion2', 'explosion3'][Math.min(3, Math.max(0, frameIdx))] as SpriteName
      );
    case 'player_captured': return 'captured';
    default: return null;
  }
}

export function GameCanvas({
  frame,
  settings,
  attract,
  quality = 'high',
  ship = 'fighter',
  drops = [],
  active = [],
  bombFlash = 0,
  mirrored = false,
  tinyShip = false,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starfieldRef = useRef<Starfield | null>(null);
  const particlesRef = useRef<Particles | null>(null);
  const sheetsRef = useRef<Record<SpriteName, HTMLCanvasElement> | null>(null);
  const lastFrameRef = useRef<number>(-1);

  useEffect(() => {
    sheetsRef.current = bakeAllSprites();
    starfieldRef.current = new Starfield(13371337);
    particlesRef.current = new Particles();
    particlesRef.current.setQuality(quality);
  }, []);

  useEffect(() => {
    particlesRef.current?.setQuality(quality);
  }, [quality]);

  useEffect(() => {
    if (!frame || !canvasRef.current) return;
    const canvas = canvasRef.current;
    if (canvas.width !== SCREEN_W || canvas.height !== SCREEN_H) {
      canvas.width = SCREEN_W;
      canvas.height = SCREEN_H;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    const sheets = sheetsRef.current!;
    const stars = starfieldRef.current!;
    const particles = particlesRef.current!;

    // Step starfield & particles
    if (settings.starfield) {
      stars.step(attract ? 0.6 : 1);
    }
    if (lastFrameRef.current !== frame.frame) {
      for (const pe of frame.particle_events) {
        const palette = pickPalette(pe.palette);
        particles.burst(pe.x, pe.y, pe.count, palette, pe.kind === 'fanfare' ? 2.4 : 1.6);
      }
      lastFrameRef.current = frame.frame;
    }
    particles.step();

    // Clear
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

    // Mirror (daily modifier).
    if (mirrored) {
      ctx.save();
      ctx.translate(SCREEN_W, 0);
      ctx.scale(-1, 1);
    }

    // Starfield
    if (settings.starfield) {
      stars.draw(ctx, { parallax: settings.parallax });
    }

    // Sprites — drawn back-to-front.
    for (const s of frame.sprites) {
      if (!s.visible) continue;
      if (s.kind === 'player' || s.kind === 'player_dual') {
        drawPlayerShip(ctx, s, ship, tinyShip);
        continue;
      }
      drawSprite(ctx, sheets, s);
    }

    // Player FX layer (shields, beams).
    const player = frame.sprites[0];
    if (player) {
      drawShieldRing(ctx, active, player.x, player.y, frame.frame);
    }

    // Power-up drops on top of sprites.
    if (drops.length > 0) drawPowerUpDrops(ctx, drops, frame.frame);

    // Particles overlay
    particles.draw(ctx);

    if (mirrored) ctx.restore();

    // Bomb flash.
    if (bombFlash > 0) drawBombFlash(ctx, bombFlash, SCREEN_W, SCREEN_H);

    // Score popups (small numeric text drawn over)
    for (const s of frame.sprites) {
      if (s.kind === 'score_pop' && s.visible) {
        drawDigits(ctx, String(s.score), s.x - 6, s.y - 6, '#fde047', 1);
      }
    }
  }, [frame, settings.starfield, settings.parallax, attract, ship, drops, active, bombFlash, mirrored, tinyShip]);

  return <canvas ref={canvasRef} className="game-canvas" width={SCREEN_W} height={SCREEN_H} />;
}

function drawPlayerShip(
  ctx: CanvasRenderingContext2D,
  s: Sprite,
  ship: ShipId,
  tiny: boolean,
) {
  const frameKind = s.frame === 1 ? 'thrust' : 'idle';
  const sprite = shipPlayerSprite(ship, frameKind);
  const size = tiny ? 12 : 16;
  const off = (16 - size) / 2;
  if (s.kind === 'player_dual') {
    if (ship === 'rainbow') {
      drawRainbowPlayer(ctx, sprite, s.x + off, s.y + off, s.frame * 13);
      drawRainbowPlayer(ctx, sprite, s.x + 20 + off, s.y + off, s.frame * 13 + 11);
    } else {
      ctx.drawImage(sprite, 0, 0, sprite.width, sprite.height, s.x + off, s.y + off, size, size);
      ctx.drawImage(sprite, 0, 0, sprite.width, sprite.height, s.x + 20 + off, s.y + off, size, size);
    }
    return;
  }
  if (ship === 'rainbow') {
    drawRainbowPlayer(ctx, sprite, s.x + off, s.y + off, s.frame * 13);
  } else {
    ctx.drawImage(sprite, 0, 0, sprite.width, sprite.height, s.x + off, s.y + off, size, size);
  }
}

function drawSprite(
  ctx: CanvasRenderingContext2D,
  sheets: Record<SpriteName, HTMLCanvasElement>,
  s: Sprite,
) {
  if (s.kind === 'tractor_beam') {
    drawTractorBeam(ctx, s);
    return;
  }
  if (s.kind === 'score_pop') return; // drawn separately above.
  const name = spriteName(s.kind, s.frame);
  if (!name) return;
  const sheet = sheets[name];
  if (!sheet) return;
  ctx.drawImage(sheet, 0, 0, sheet.width, sheet.height, s.x, s.y, s.w, s.h);
}

function drawTractorBeam(ctx: CanvasRenderingContext2D, s: Sprite) {
  const { x, y, w, h, frame } = s;
  ctx.save();
  const grad = ctx.createLinearGradient(x + w / 2, y, x + w / 2, y + h);
  const alpha = 0.45 + 0.2 * Math.sin(frame * 0.7);
  grad.addColorStop(0, `rgba(34, 211, 238, ${alpha * 0.9})`);
  grad.addColorStop(0.5, `rgba(110, 231, 183, ${alpha * 0.55})`);
  grad.addColorStop(1, `rgba(255, 58, 166, ${alpha * 0.3})`);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(x + w / 2 - 4, y);
  ctx.lineTo(x + w / 2 + 4, y);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.fill();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i++) {
    const yy = y + ((frame * 4 + i * 18) % h);
    ctx.fillStyle = `rgba(255, 255, 255, ${0.18 - i * 0.02})`;
    const widthAt = ((yy - y) / h) * w;
    ctx.fillRect(x + (w - widthAt) / 2, yy, widthAt, 1);
  }
  ctx.restore();
}

function pickPalette(idx: number): string[] {
  switch (idx) {
    case 0: return ['#ffffff', '#fde047', '#22d3ee'];
    case 1: return ['#ffd166', '#ff3a3a', '#fde047', '#ffffff'];
    case 2: return ['#22d3ee', '#a78bfa', '#ff3aa6', '#fde047'];
    case 3: return ['#ff3aa6', '#a78bfa', '#ffffff'];
    case 4: return ['#ff3a3a', '#fde047', '#ffffff'];
    default: return ['#ffffff'];
  }
}
