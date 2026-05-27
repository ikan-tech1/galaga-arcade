import { POWER_UPS } from '../meta/powerups';
import type { ActivePowerUp } from '../meta/types';

interface Props {
  active: ActivePowerUp[];
  bombs: number;
  combo: number;
  scoreMul: number;
}

export function PowerUpHUD({ active, bombs, combo, scoreMul }: Props) {
  return (
    <div className="pu-hud" aria-label="active power-ups">
      <div className="pu-hud__slots">
        {active.length === 0 && (
          <span className="pu-hud__placeholder">— NO ACTIVE POWER-UPS —</span>
        )}
        {active.map((a) => {
          const def = POWER_UPS[a.id];
          const total = def?.durationFrames || 60;
          const pct = Math.max(0, Math.min(100, (a.framesLeft / total) * 100));
          return (
            <div
              key={a.id}
              className="pu-hud__chip"
              style={{ ['--col' as any]: def?.color ?? '#22d3ee' }}
              title={`${def?.name}: ${(a.framesLeft / 60).toFixed(1)}s`}
            >
              <span className="pu-hud__glyph">{def?.glyph}</span>
              <span className="pu-hud__bar">
                <span className="pu-hud__bar-fill" style={{ width: `${pct}%` }} />
              </span>
            </div>
          );
        })}
      </div>
      <div className="pu-hud__right">
        {bombs > 0 && (
          <span className="pu-hud__bombs" title={`${bombs} bombs`}>
            💥 {bombs}
          </span>
        )}
        {combo > 1 && (
          <span
            className={`pu-hud__combo${combo >= 10 ? ' pu-hud__combo--hot' : ''}`}
            title={`Combo ×${combo}`}
          >
            ×{combo}
          </span>
        )}
        {scoreMul > 1.0 && (
          <span className="pu-hud__mul">{scoreMul.toFixed(1)}× SCORE</span>
        )}
      </div>
    </div>
  );
}
