/**
 * Procedural sprite generator. Each sprite is a 16x16 grid of color codes.
 * Codes: '.' = transparent, others = palette indices.
 *
 * All sprites are recreated original work — they capture the silhouette and
 * colour palette of the arcade enemies without using any Namco-owned pixel
 * data.
 */

export interface PaletteMap {
  [code: string]: string; // hex color
}

const ALPHA = '.';

export interface SpriteFrame {
  w: number;
  h: number;
  rows: string[];
  palette: PaletteMap;
}

// Default arcade-leaning palette
const PAL_PLAYER: PaletteMap = {
  W: '#ffffff',
  C: '#22d3ee',
  B: '#1d4ed8',
  Y: '#fbbf24',
  R: '#ef4444',
};
const PAL_ZAKO: PaletteMap = {
  // Zako (bee): blue body, white wings
  W: '#ffffff',
  C: '#22d3ee',
  B: '#1d4ed8',
  R: '#ff3a3a',
  Y: '#fde047',
};
const PAL_GOEI: PaletteMap = {
  // Goei (butterfly): pink + blue
  W: '#ffffff',
  M: '#ff3aa6',
  P: '#a21caf',
  B: '#1d4ed8',
  C: '#22d3ee',
  Y: '#fde047',
};
const PAL_BOSS: PaletteMap = {
  // Boss Galaga: green + cyan eye
  G: '#10b981',
  D: '#065f46',
  C: '#22d3ee',
  Y: '#fde047',
  W: '#ffffff',
};
const PAL_BOSS_INJURED: PaletteMap = {
  // Boss after one hit — turns blue/purple
  G: '#a78bfa',
  D: '#4c1d95',
  C: '#22d3ee',
  Y: '#fde047',
  W: '#ffffff',
};
const PAL_FRUIT: PaletteMap = {
  R: '#ef4444',
  G: '#22c55e',
  Y: '#fde047',
  W: '#ffffff',
};
const PAL_BEAM: PaletteMap = {
  C: 'rgba(34, 211, 238, 0.55)',
  W: 'rgba(255, 255, 255, 0.85)',
  G: 'rgba(110, 231, 183, 0.45)',
};
const PAL_EXPLOSION: PaletteMap = {
  Y: '#fde047',
  O: '#fb923c',
  R: '#ef4444',
  W: '#ffffff',
};

// 16x16 sprite ASCII templates
// player ship (idle)
const PLAYER_ROWS = [
  '................',
  '................',
  '.......WW.......',
  '.......WW.......',
  '......WCCW......',
  '......WCCW......',
  '......WCCW......',
  '.....WCYYCW.....',
  '.....WCYYCW.....',
  '....WCBWWBCW....',
  '...WCBBYYBBCW...',
  '..WBBBYYYYBBBW..',
  '..WBB.YYYY.BBW..',
  '..WW...YY...WW..',
  '...........R....',
  '................',
];

// player thruster flicker (alt frame)
const PLAYER_THRUST_ROWS = [
  '................',
  '................',
  '.......WW.......',
  '.......WW.......',
  '......WCCW......',
  '......WCCW......',
  '......WCCW......',
  '.....WCYYCW.....',
  '.....WCYYCW.....',
  '....WCBWWBCW....',
  '...WCBBYYBBCW...',
  '..WBBBYYYYBBBW..',
  '..WBB.YYYY.BBW..',
  '..WW...YY...WW..',
  '....R..YY..R....',
  '....R...R..R....',
];

// Zako (bee) — wings open
const ZAKO_OPEN = [
  '................',
  '................',
  '..W..........W..',
  '..WW........WW..',
  '...WC......CW...',
  '....WCC..CCW....',
  '.....BCWWCB.....',
  '....BBCBBCBB....',
  '....BCCWWCCB....',
  '....BCYWWYCB....',
  '....BCYYYYCB....',
  '....BCYWWYCB....',
  '....BCCWWCCB....',
  '.....BCWWCB.....',
  '......BWWB......',
  '................',
];
const ZAKO_CLOSED = [
  '................',
  '................',
  '................',
  '....W......W....',
  '....WC....CW....',
  '....WCC..CCW....',
  '.....BCWWCB.....',
  '....BBCBBCBB....',
  '....BCCWWCCB....',
  '....BCYWWYCB....',
  '....BCYYYYCB....',
  '....BCYWWYCB....',
  '....BCCWWCCB....',
  '.....BCWWCB.....',
  '......BWWB......',
  '................',
];

// Goei (butterfly) — wings open / closed
const GOEI_OPEN = [
  '................',
  '..M............M',
  '..MM..........MM',
  '..MPM........MPM',
  '..MPPM......MPPM',
  '..MPCPM....MPCPM',
  '..MPCCPMMPMPCCPM',
  '...MMPYBYPMMM...',
  '....MMPBBYPMM...',
  '......MPYBPM....',
  '......MPYBPM....',
  '.......MMMMM....',
  '......MMM..MM...',
  '.....MM......MM.',
  '....MM........MM',
  '...M............',
];
const GOEI_CLOSED = [
  '................',
  '................',
  '......M..M......',
  '.....MM..MM.....',
  '....MPM..MPM....',
  '....MPPMMPPM....',
  '....MPCBBCPM....',
  '.....MMYBMM.....',
  '....MMPBBPMM....',
  '...MMPYBBYPMM...',
  '..MMMPYBBYPMMM..',
  '..MMM.YBBY.MMM..',
  '..MM..YBBY..MM..',
  '..M...MMMM...M..',
  '......M..M......',
  '................',
];

// Boss Galaga — wings open / closed (green form)
const BOSS_OPEN = [
  '................',
  '..G............G',
  '..GG..........GG',
  '..GDG........GDG',
  '..GDDG......GDDG',
  '..GDCDG....GDCDG',
  '..GDDDDG..GDDDDG',
  '...GGGDDGGDDGGG.',
  '....GGCDDDDCGG..',
  '.....GCWYYWCG...',
  '.....GDYYYYDG...',
  '.....GDDYYDDG...',
  '.....GGDDDDGG...',
  '......GG..GG....',
  '......G....G....',
  '................',
];
const BOSS_CLOSED = [
  '................',
  '................',
  '.....GG..GG.....',
  '....GDDGGDDG....',
  '....GDCGGCDG....',
  '....GDDDDDDG....',
  '....GDDDDDDG....',
  '....GGDDDDGG....',
  '....GGCDDCGG....',
  '....GCWYYWCG....',
  '....GDYYYYDG....',
  '....GDDYYDDG....',
  '....GGDDDDGG....',
  '.....GG..GG.....',
  '......G..G......',
  '................',
];

// Captured fighter (red player)
const CAPTURED_ROWS = [
  '................',
  '................',
  '.......WW.......',
  '.......WW.......',
  '......WRRW......',
  '......WRRW......',
  '......WRRW......',
  '.....WRYYRW.....',
  '.....WRYYRW.....',
  '....WRBWWBRW....',
  '...WRBBYYBBRW...',
  '..WRRRYYYYRRRW..',
  '..WRR.YYYY.RRW..',
  '..WW...YY...WW..',
  '................',
  '................',
];

// Tractor beam (16x32 cone) — we'll generate as gradient at draw time
// Bonus: scorpion / spy / flag at 16x16
const SCORPION_ROWS = [
  '................',
  '...G.........G..',
  '..G.G..GGG..G.G.',
  '...G..G...G..G..',
  '......G.Y.G.....',
  '.....G..Y..G....',
  '....G..GYG..G...',
  '....G.GGYGG.G...',
  '....GGGGYGGGG...',
  '....GGGGYGGGG...',
  '....G.GGGGG.G...',
  '....G..GGG..G...',
  '....G..GGG..G...',
  '....G..G.G..G...',
  '....G..G.G..G...',
  '......GG.GG.....',
];
const SPY_ROWS = [
  '................',
  '................',
  '......WWW.......',
  '.....WWWWW......',
  '....WWWRRWW.....',
  '....WWRRRRWW....',
  '...WWRRWWRRWW...',
  '...WWRWGGWRWW...',
  '...WWRRWWRRWW...',
  '....WWRRRRWW....',
  '....WWWYYWWW....',
  '.....WWYYWW.....',
  '......YYYY......',
  '......Y..Y......',
  '......Y..Y......',
  '................',
];
const FLAG_ROWS = [
  '................',
  '....RRRRR.......',
  '....R   R.......',
  '....R YY R......',
  '....R YY R......',
  '....R    R......',
  '....RRRRR.......',
  '....W...........',
  '....W...........',
  '....W...........',
  '....W...........',
  '....W...........',
  '....W...........',
  '....W...........',
  '....W...........',
  '...WWWW.........',
];

// Bullets
const PLAYER_BULLET = [
  '...',
  '.W.',
  '.W.',
  '.W.',
  '.W.',
];
const ENEMY_BULLET = [
  '..R..',
  '.RRR.',
  'RRWRR',
  '.RRR.',
  '..R..',
];

// 4-frame explosion at 16x16
function explosionFrame(stage: number): string[] {
  const rows: string[] = [];
  const cx = 7.5, cy = 7.5;
  const radius = 2 + stage * 1.8;
  const ringInner = Math.max(0, radius - 1.6);
  const ringOuter = radius + 0.6;
  for (let y = 0; y < 16; y++) {
    let row = '';
    for (let x = 0; x < 16; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d > ringOuter) row += '.';
      else if (d > ringInner) {
        row += stage < 2 ? 'Y' : stage < 3 ? 'O' : 'R';
      } else if (d > ringInner - 1.5) {
        row += stage < 2 ? 'W' : 'Y';
      } else {
        row += stage < 1 ? 'W' : '.';
      }
    }
    rows.push(row);
  }
  return rows;
}

// Stars (1x1, generated at runtime in starfield.ts)

const NUMBERS_3X5: Record<string, string[]> = {
  '0': ['111', '101', '101', '101', '111'],
  '1': ['010', '110', '010', '010', '111'],
  '2': ['111', '001', '111', '100', '111'],
  '3': ['111', '001', '011', '001', '111'],
  '4': ['101', '101', '111', '001', '001'],
  '5': ['111', '100', '111', '001', '111'],
  '6': ['111', '100', '111', '101', '111'],
  '7': ['111', '001', '010', '010', '010'],
  '8': ['111', '101', '111', '101', '111'],
  '9': ['111', '101', '111', '001', '111'],
  ' ': ['000', '000', '000', '000', '000'],
};

function makeFrame(rows: string[], palette: PaletteMap): SpriteFrame {
  return { w: rows[0].length, h: rows.length, rows, palette };
}

export const SPRITES = {
  player: makeFrame(PLAYER_ROWS, PAL_PLAYER),
  playerThrust: makeFrame(PLAYER_THRUST_ROWS, PAL_PLAYER),
  captured: makeFrame(CAPTURED_ROWS, { ...PAL_PLAYER, R: '#ff3a3a' }),
  zakoOpen: makeFrame(ZAKO_OPEN, PAL_ZAKO),
  zakoClosed: makeFrame(ZAKO_CLOSED, PAL_ZAKO),
  goeiOpen: makeFrame(GOEI_OPEN, PAL_GOEI),
  goeiClosed: makeFrame(GOEI_CLOSED, PAL_GOEI),
  bossOpen: makeFrame(BOSS_OPEN, PAL_BOSS),
  bossClosed: makeFrame(BOSS_CLOSED, PAL_BOSS),
  bossOpenInjured: makeFrame(BOSS_OPEN, PAL_BOSS_INJURED),
  bossClosedInjured: makeFrame(BOSS_CLOSED, PAL_BOSS_INJURED),
  scorpion: makeFrame(SCORPION_ROWS, PAL_FRUIT),
  spy: makeFrame(SPY_ROWS, PAL_FRUIT),
  flag: makeFrame(FLAG_ROWS, PAL_FRUIT),
  playerBullet: makeFrame(PLAYER_BULLET, { W: '#ffffff' }),
  enemyBullet: makeFrame(ENEMY_BULLET, { R: '#ff3a3a', W: '#ffffff' }),
  explosion0: makeFrame(explosionFrame(0), PAL_EXPLOSION),
  explosion1: makeFrame(explosionFrame(1), PAL_EXPLOSION),
  explosion2: makeFrame(explosionFrame(2), PAL_EXPLOSION),
  explosion3: makeFrame(explosionFrame(3), PAL_EXPLOSION),
} as const;

export type SpriteName = keyof typeof SPRITES;

/**
 * Bake a sprite into an OffscreenCanvas (or HTMLCanvasElement). Each pixel
 * is one device pixel so the renderer can do its own integer scaling.
 */
export function bakeSprite(frame: SpriteFrame, scale = 1): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = frame.w * scale;
  canvas.height = frame.h * scale;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return canvas;
  ctx.imageSmoothingEnabled = false;
  for (let y = 0; y < frame.h; y++) {
    const row = frame.rows[y];
    for (let x = 0; x < frame.w; x++) {
      const code = row[x];
      if (code === ALPHA || code === ' ') continue;
      const color = frame.palette[code];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }
  return canvas;
}

/** Bake all sprites (eager; cheap for ~20 frames of 16x16). */
export function bakeAllSprites(): Record<SpriteName, HTMLCanvasElement> {
  const out: Partial<Record<SpriteName, HTMLCanvasElement>> = {};
  for (const name of Object.keys(SPRITES) as SpriteName[]) {
    out[name] = bakeSprite(SPRITES[name]);
  }
  return out as Record<SpriteName, HTMLCanvasElement>;
}

/** Draw a small score/digit string using the 3x5 number font. */
export function drawDigits(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  scale = 1,
) {
  ctx.fillStyle = color;
  let cx = x;
  for (const ch of text.toUpperCase()) {
    const glyph = NUMBERS_3X5[ch];
    if (!glyph) {
      cx += 4 * scale;
      continue;
    }
    for (let gy = 0; gy < 5; gy++) {
      const row = glyph[gy];
      for (let gx = 0; gx < 3; gx++) {
        if (row[gx] === '1') {
          ctx.fillRect(cx + gx * scale, y + gy * scale, scale, scale);
        }
      }
    }
    cx += 4 * scale;
  }
}
