import { useState } from 'react';
import { SHIPS, SHIP_ORDER } from '../meta/ships';
import { UPGRADES, UPGRADE_ORDER, upgradeCost } from '../meta/upgrades';
import type { MetaProgression, ShipId, UpgradeId } from '../meta/types';

interface Props {
  meta: MetaProgression;
  onPickShip: (ship: ShipId) => void;
  onPurchase: (id: UpgradeId) => void;
  onClose: () => void;
}

export function HangarScreen({ meta, onPickShip, onPurchase, onClose }: Props) {
  const [previewShip, setPreviewShip] = useState<ShipId>(meta.selectedShip);
  const stats = SHIPS[previewShip];
  return (
    <div className="overlay overlay--interactive hangar">
      <header className="hangar__header">
        <h2 className="hangar__title">HANGAR</h2>
        <div className="hangar__credits">
          <span>CR</span>
          <strong>{meta.credits.toLocaleString()}</strong>
        </div>
      </header>

      <section className="hangar__ships">
        <div className="hangar__sub">SHIP BAY</div>
        <div className="hangar__ship-row">
          {SHIP_ORDER.map((id) => {
            const s = SHIPS[id];
            const unlocked = meta.unlockedShips.includes(id);
            const selected = meta.selectedShip === id;
            return (
              <button
                key={id}
                className={`hangar__ship${selected ? ' hangar__ship--selected' : ''}${
                  unlocked ? '' : ' hangar__ship--locked'
                }`}
                style={{ ['--accent' as any]: s.accent }}
                onMouseEnter={() => setPreviewShip(id)}
                onFocus={() => setPreviewShip(id)}
                onClick={() => unlocked && onPickShip(id)}
                disabled={!unlocked}
              >
                <ShipBadge ship={id} />
                <div className="hangar__ship-name">{s.name}</div>
                {!unlocked && <div className="hangar__ship-lock">LOCKED</div>}
                {selected && <div className="hangar__ship-active">ACTIVE</div>}
              </button>
            );
          })}
        </div>
        <div className="hangar__preview">
          <ShipBadge ship={previewShip} large />
          <div>
            <div className="hangar__preview-name" style={{ color: stats.accent }}>
              {stats.name}
            </div>
            <div className="hangar__preview-tag">{stats.tagline}</div>
            <div className="hangar__preview-stats">
              <Stat label="SPEED" value={stats.speedMul} />
              <Stat label="FIRE" value={stats.fireRateMul} />
              <Stat label="LIVES" value={stats.livesMul} />
              <Stat label="HITBOX" valueText={stats.hitboxTag.toUpperCase()} />
              {stats.dash && <Stat label="DASH" valueText="YES" />}
            </div>
          </div>
        </div>
      </section>

      <section className="hangar__upgrades">
        <div className="hangar__sub">UPGRADES</div>
        <div className="hangar__upg-grid">
          {UPGRADE_ORDER.map((id) => {
            const def = UPGRADES[id];
            const level = meta.upgrades[id] ?? 0;
            const cost = upgradeCost(id, level);
            const maxed = cost == null;
            const affordable = cost != null && cost <= meta.credits;
            return (
              <div key={id} className="hangar__upg">
                <div className="hangar__upg-head">
                  <div className="hangar__upg-name">{def.name}</div>
                  <div className="hangar__upg-lvl">L{level}/{def.maxLevel}</div>
                </div>
                <div className="hangar__upg-bars">
                  {Array.from({ length: def.maxLevel }).map((_, i) => (
                    <span
                      key={i}
                      className={`hangar__upg-bar${
                        i < level ? ' hangar__upg-bar--on' : ''
                      }`}
                    />
                  ))}
                </div>
                <div className="hangar__upg-desc">{def.description}</div>
                <button
                  className={`hangar__upg-btn${
                    maxed
                      ? ' hangar__upg-btn--max'
                      : affordable
                      ? ''
                      : ' hangar__upg-btn--locked'
                  }`}
                  onClick={() => !maxed && affordable && onPurchase(id)}
                  disabled={maxed || !affordable}
                >
                  {maxed ? 'MAX' : `${cost} CR`}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <footer className="hangar__footer">
        <button className="neon-btn" onClick={onClose}>← BACK</button>
        <div className="hangar__hint">
          CREDITS DROP IN ARCADE+ · MISSION · DAILY · ENDLESS
        </div>
      </footer>
    </div>
  );
}

function Stat({ label, value, valueText }: { label: string; value?: number; valueText?: string }) {
  return (
    <div className="hangar__stat">
      <span className="hangar__stat-label">{label}</span>
      <span className="hangar__stat-val">
        {valueText ?? `${(value ?? 1).toFixed(2)}×`}
      </span>
    </div>
  );
}

function ShipBadge({ ship, large = false }: { ship: ShipId; large?: boolean }) {
  const accent = SHIPS[ship].accent;
  const size = large ? 64 : 36;
  // Render a stylised vector ship in SVG so each variant looks distinct.
  return (
    <svg
      className="hangar__svg-ship"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`g-${ship}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="50%" stopColor={accent} />
          <stop offset="100%" stopColor="#0c0118" />
        </linearGradient>
      </defs>
      {ship === 'interceptor' ? (
        <>
          <polygon
            points="16,2 21,18 16,24 11,18"
            fill={`url(#g-${ship})`}
            stroke={accent}
            strokeWidth="0.8"
          />
          <line x1="6" y1="22" x2="13" y2="20" stroke={accent} strokeWidth="0.6" />
          <line x1="26" y1="22" x2="19" y2="20" stroke={accent} strokeWidth="0.6" />
          <rect x="15" y="20" width="2" height="6" fill="#ff3a3a" />
        </>
      ) : ship === 'heavy' ? (
        <>
          <rect
            x="6"
            y="8"
            width="20"
            height="18"
            rx="2"
            fill={`url(#g-${ship})`}
            stroke={accent}
            strokeWidth="0.8"
          />
          <rect x="12" y="3" width="8" height="7" fill={accent} />
          <rect x="2" y="14" width="6" height="6" fill="#7f1d1d" />
          <rect x="24" y="14" width="6" height="6" fill="#7f1d1d" />
          <rect x="11" y="26" width="3" height="4" fill="#fbbf24" />
          <rect x="18" y="26" width="3" height="4" fill="#fbbf24" />
        </>
      ) : ship === 'phantom' ? (
        <>
          <polygon
            points="16,4 26,16 22,26 16,22 10,26 6,16"
            fill={`url(#g-${ship})`}
            stroke={accent}
            strokeWidth="0.8"
            opacity="0.9"
          />
          <circle cx="16" cy="14" r="2.5" fill="#fff" opacity="0.85" />
          <circle cx="16" cy="14" r="1.2" fill={accent} />
        </>
      ) : ship === 'rainbow' ? (
        <>
          <polygon
            points="16,3 23,12 26,22 16,28 6,22 9,12"
            fill={accent}
            stroke="#ffffff"
            strokeWidth="0.8"
          />
          <rect x="14" y="8" width="4" height="14" fill="#fde047" />
          <circle cx="16" cy="14" r="3" fill="#22d3ee" />
          <circle cx="16" cy="14" r="1.3" fill="#ff3aa6" />
        </>
      ) : (
        <>
          <polygon
            points="16,4 23,16 19,24 13,24 9,16"
            fill={`url(#g-${ship})`}
            stroke={accent}
            strokeWidth="0.8"
          />
          <rect x="15" y="9" width="2" height="10" fill="#fde047" />
          <rect x="13" y="20" width="2" height="4" fill="#fde047" />
          <rect x="17" y="20" width="2" height="4" fill="#fde047" />
        </>
      )}
    </svg>
  );
}
