import { useEffect, useState } from 'react';

interface Props {
  /** 0..1 boot progress for the bar fill. */
  progress: number;
  /** True once the engine + sprites are ready; triggers fade-out. */
  ready: boolean;
  /** True if the engine failed to load — shows error message instead of infinite wait. */
  error?: boolean;
  /** Called after the fade-out finishes so the parent can unmount us. */
  onDone: () => void;
}

/**
 * Pixel-perfect boot/loading screen rendered while the WASM engine
 * and procedural sprite sheets are still being prepared.
 *
 * Design rules to stay sharp:
 *   - All font sizes are integer px on a stepped scale (no fractional vmin).
 *   - No transforms that would force subpixel rasterisation on pixel text.
 *   - Press Start 2P with `font-smooth: none` everywhere.
 *   - The ship is an inline SVG with `shape-rendering="crispEdges"`.
 */
export function LoadingScreen({ progress, ready, error, onDone }: Props) {
  const [leaving, setLeaving] = useState(false);
  const [dots, setDots] = useState('');

  useEffect(() => {
    const id = window.setInterval(() => {
      setDots((d) => (d.length >= 3 ? '' : d + '.'));
    }, 280);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!ready) return;
    setLeaving(true);
    const id = window.setTimeout(onDone, 320);
    return () => window.clearTimeout(id);
  }, [ready, onDone]);

  const pct = Math.max(0, Math.min(1, progress));

  return (
    <div
      className={`loading ${leaving ? 'loading--leaving' : ''}`}
      role="status"
      aria-live="polite"
      aria-label={ready ? 'Ready' : `Loading ${Math.round(pct * 100)}%`}
    >
      <div className="loading__stack">
        <FighterShip />
        <h1 className="loading__logo">GALAGA</h1>
        <div className="loading__sub">ARCADE CLONE</div>
        <div className="loading__rule" aria-hidden="true" />
        <div className="loading__bar" aria-hidden="true">
          <div
            className="loading__bar__fill"
            style={{ width: `${Math.round(pct * 100)}%` }}
          />
        </div>
        <div className="loading__text">
          {error ? 'ERROR' : ready ? 'READY' : 'LOADING'}
          {!ready && !error && <span className="loading__text__dots">{dots}</span>}
        </div>
        <div className="loading__hint">
          {error ? 'FAILED TO LOAD ENGINE — TRY REFRESHING' : 'INSERT COIN TO PLAY'}
        </div>
      </div>
    </div>
  );
}

/**
 * 16x16 player fighter rendered as crisp SVG rectangles. Drawn 2x scale
 * via the SVG viewBox so it matches the in-game sprite at any DPR.
 */
function FighterShip() {
  // Single source of truth — same palette as render/sprites.ts player.
  const W = '#ffffff';
  const C = '#22d3ee';
  const B = '#1d4ed8';
  const Y = '#fbbf24';
  const R = '#ef4444';
  // Each entry: [x, y, color]
  // Designed to match a stylized Galaga fighter silhouette.
  const px: ReadonlyArray<readonly [number, number, string]> = [
    [7, 1, W], [8, 1, W],
    [7, 2, W], [8, 2, W],
    [7, 3, C], [8, 3, C],
    [6, 4, C], [7, 4, W], [8, 4, W], [9, 4, C],
    [6, 5, C], [7, 5, C], [8, 5, C], [9, 5, C],
    [5, 6, C], [6, 6, W], [7, 6, C], [8, 6, C], [9, 6, W], [10, 6, C],
    [4, 7, C], [5, 7, B], [6, 7, B], [7, 7, W], [8, 7, W], [9, 7, B], [10, 7, B], [11, 7, C],
    [3, 8, C], [4, 8, B], [5, 8, B], [6, 8, B], [7, 8, B], [8, 8, B], [9, 8, B], [10, 8, B], [11, 8, B], [12, 8, C],
    [2, 9, C], [3, 9, B], [4, 9, B], [5, 9, B], [11, 9, B], [12, 9, B], [13, 9, C],
    [2, 10, B], [3, 10, B], [13, 10, B], [14, 10, B],
    [6, 11, Y], [7, 11, Y], [8, 11, Y], [9, 11, Y],
    [6, 12, R], [7, 12, Y], [8, 12, Y], [9, 12, R],
    [7, 13, R], [8, 13, R],
  ];
  return (
    <svg
      className="loading__ship"
      viewBox="0 0 16 16"
      width={32}
      height={32}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <rect width="16" height="16" fill="transparent" />
      {px.map(([x, y, c], i) => (
        <rect key={i} x={x} y={y} width={1} height={1} fill={c} />
      ))}
    </svg>
  );
}
