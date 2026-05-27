/**
 * Power-up drop renderer + shield / weapon FX. Drawn into the main game
 * canvas on top of the engine-rendered sprites.
 */

import { POWER_UPS } from '../meta/powerups';
import type { ActivePowerUp, PowerUpDrop } from '../meta/types';

export function drawPowerUpDrops(
  ctx: CanvasRenderingContext2D,
  drops: PowerUpDrop[],
  frame: number,
) {
  for (const d of drops) {
    const def = POWER_UPS[d.id];
    if (!def) continue;
    const pulse = 0.5 + 0.5 * Math.sin((frame + d.x) * 0.18);
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.shadowColor = def.color;
    ctx.shadowBlur = 8;
    // Diamond hull
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(7, 0);
    ctx.lineTo(0, 8);
    ctx.lineTo(-7, 0);
    ctx.closePath();
    ctx.globalAlpha = 0.85 + 0.15 * pulse;
    ctx.fill();
    ctx.globalAlpha = 1;
    // Glyph (single char, white)
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#000';
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(def.glyph, 0, 0);
    // Outline
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(7, 0);
    ctx.lineTo(0, 8);
    ctx.lineTo(-7, 0);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

export function drawShieldRing(
  ctx: CanvasRenderingContext2D,
  active: ActivePowerUp[],
  playerX: number,
  playerY: number,
  frame: number,
) {
  const hasShield = active.some((a) => a.id === 'shield');
  if (hasShield) {
    const r = 14 + 2 * Math.sin(frame * 0.18);
    ctx.save();
    ctx.translate(playerX + 8, playerY + 8);
    ctx.shadowColor = '#6ee7b7';
    ctx.shadowBlur = 10;
    ctx.strokeStyle = `rgba(110, 231, 183, ${0.7 + 0.3 * Math.sin(frame * 0.25)})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.arc(0, 0, r - 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  const laser = active.find((a) => a.id === 'laserBeam');
  if (laser) {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 58, 166, 0.45)';
    ctx.shadowColor = '#ff3aa6';
    ctx.shadowBlur = 12;
    ctx.fillRect(playerX + 6, 0, 4, playerY);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillRect(playerX + 7, 0, 2, playerY);
    ctx.restore();
  }
  const spread = active.find((a) => a.id === 'spreadShot');
  if (spread) {
    ctx.save();
    ctx.fillStyle = 'rgba(34, 211, 238, 0.85)';
    ctx.shadowColor = '#22d3ee';
    ctx.shadowBlur = 6;
    const off = (frame * 4) % 24;
    for (let i = -1; i <= 1; i++) {
      const x = playerX + 8 + i * 5;
      ctx.fillRect(x, playerY - 16 - off, 1.5, 4);
    }
    ctx.restore();
  }
  const rapid = active.find((a) => a.id === 'rapidFire');
  if (rapid) {
    ctx.save();
    ctx.fillStyle = 'rgba(253, 224, 71, 0.85)';
    ctx.shadowColor = '#fde047';
    ctx.shadowBlur = 6;
    const off = (frame * 6) % 20;
    ctx.fillRect(playerX + 8, playerY - 12 - off, 1.5, 6);
    ctx.fillRect(playerX + 8, playerY - 4 - off, 1.5, 6);
    ctx.restore();
  }
  const magnet = active.find((a) => a.id === 'magnet');
  if (magnet) {
    ctx.save();
    ctx.strokeStyle = `rgba(167, 139, 250, ${0.55 + 0.4 * Math.sin(frame * 0.2)})`;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(playerX + 8, playerY + 8, 38 + 4 * Math.sin(frame * 0.13), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

/** Big white flash for screen-clear bomb. */
export function drawBombFlash(
  ctx: CanvasRenderingContext2D,
  intensity: number, // 0..1
  w: number,
  h: number,
) {
  if (intensity <= 0) return;
  ctx.save();
  ctx.fillStyle = `rgba(255, 255, 255, ${0.7 * intensity})`;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}
