import { useEffect, useRef, useState } from 'react';
import { MODE_META, MODE_ORDER } from '../meta/modes';
import type { GameMode } from '../meta/types';
import type { MetaProgression } from '../meta/types';
import { dailyFor } from '../meta/daily';

interface Props {
  meta: MetaProgression;
  onSelect: (mode: GameMode) => void;
  onOpenHangar: () => void;
  onOpenSettings: () => void;
  onOpenSecrets: () => void;
  onLogoTap: () => void;
}

export function ModeHub({
  meta,
  onSelect,
  onOpenHangar,
  onOpenSettings,
  onOpenSecrets,
  onLogoTap,
}: Props) {
  const [hover, setHover] = useState<GameMode>('classic');
  const starsBgRef = useRef<HTMLCanvasElement | null>(null);

  // Animated starfield specifically for the hub backdrop.
  useEffect(() => {
    const canvas = starsBgRef.current;
    if (!canvas) return;
    canvas.width = 224;
    canvas.height = 288;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const stars = Array.from({ length: 80 }, () => ({
      x: Math.random() * 224,
      y: Math.random() * 288,
      z: 0.4 + Math.random() * 1.6,
      r: 0.6 + Math.random() * 1.4,
    }));
    let raf = 0;
    let phase = 0;
    const draw = () => {
      ctx.fillStyle = 'rgba(7, 0, 15, 0.45)';
      ctx.fillRect(0, 0, 224, 288);
      for (const s of stars) {
        s.y += s.z * 0.5;
        if (s.y > 288) {
          s.y = -2;
          s.x = Math.random() * 224;
        }
        const flicker = 0.55 + 0.45 * Math.sin(phase * 0.03 + s.x * 0.13);
        ctx.fillStyle =
          s.z > 1.2
            ? `rgba(255, 255, 255, ${flicker})`
            : s.z > 0.8
            ? `rgba(170, 200, 255, ${flicker * 0.85})`
            : `rgba(120, 80, 200, ${flicker * 0.5})`;
        ctx.fillRect(Math.round(s.x), Math.round(s.y), s.r, s.r);
      }
      phase++;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  const dailyTitle = dailyFor().title;
  const dailyKey = dailyFor().date;
  const dailyDone = meta.daily.lastCompletedDate === dailyKey;
  const lockedEndless = false;

  return (
    <div className="overlay overlay--interactive hub">
      <canvas ref={starsBgRef} className="hub__stars" />
      <div className="hub__grid">
        <header className="hub__header">
          <h1 className="hub__logo" onClick={onLogoTap}>
            GALAGA
            <span className="hub__logo-sub">ARCADE · MK II</span>
          </h1>
          <div className="hub__credits">
            <span className="hub__credits-label">CR</span>
            <span className="hub__credits-value">{meta.credits.toLocaleString()}</span>
          </div>
        </header>

        <div className="hub__cards">
          {MODE_ORDER.map((id) => {
            const m = MODE_META[id];
            const isDaily = id === 'daily';
            const isMission = id === 'mission';
            const isEndless = id === 'endless';
            const subline = isDaily
              ? dailyDone
                ? `${dailyTitle} · DONE TODAY · STREAK ${meta.daily.current}`
                : `${dailyTitle} · STREAK ${meta.daily.current}`
              : isMission
              ? `${meta.completedMissions.length}/11 CLEARED`
              : isEndless
              ? meta.endlessBest > 0
                ? `BEST ${meta.endlessBest.toLocaleString()}`
                : 'NO RECORD YET'
              : m.tier;
            return (
              <button
                key={id}
                className={`hub__card${hover === id ? ' hub__card--hover' : ''}`}
                style={{ ['--hue' as any]: m.hue }}
                onMouseEnter={() => setHover(id)}
                onFocus={() => setHover(id)}
                onClick={() => onSelect(id)}
                disabled={isEndless && lockedEndless}
                aria-label={`Play ${m.name} mode`}
              >
                <div className="hub__card-glyph" aria-hidden="true">{m.glyph}</div>
                <div className="hub__card-body">
                  <div className="hub__card-tier">{m.tier}</div>
                  <div className="hub__card-name">{m.name}</div>
                  <div className="hub__card-tag">{m.tagline}</div>
                  <div className="hub__card-sub">{subline}</div>
                </div>
                {id === 'arcadePlus' && (
                  <div className="hub__card-badge">NEW</div>
                )}
                {isDaily && dailyDone && (
                  <div className="hub__card-badge hub__card-badge--green">✓ DONE</div>
                )}
              </button>
            );
          })}
        </div>

        <div className="hub__desc">{MODE_META[hover].description}</div>

        <footer className="hub__footer">
          <button className="hub__chip" onClick={onOpenHangar}>
            HANGAR
          </button>
          <button className="hub__chip" onClick={onOpenSecrets}>
            SECRETS · {meta.discovered.length}/8
          </button>
          <button className="hub__chip hub__chip--mag" onClick={onOpenSettings}>
            SETTINGS
          </button>
        </footer>
      </div>
    </div>
  );
}
