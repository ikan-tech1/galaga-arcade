import type { Settings } from '@galaga/shared';

interface Props {
  settings: Settings;
  update: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  onClose: () => void;
  onClearHiScores: () => void;
}

export function SettingsPanel({ settings, update, onClose, onClearHiScores }: Props) {
  return (
    <div className="settings" role="dialog" aria-modal="true" aria-label="Settings">
      <div className="settings__title">SETTINGS</div>

      <Toggle label="CRT FILTER" value={settings.crt} onChange={(v) => update('crt', v)} />
      <Toggle label="SCANLINES" value={settings.scanlines} onChange={(v) => update('scanlines', v)} />
      <Toggle label="NEON BLOOM" value={settings.bloom} onChange={(v) => update('bloom', v)} />
      <Toggle label="STARFIELD" value={settings.starfield} onChange={(v) => update('starfield', v)} />
      <Toggle label="DEEP PARALLAX" value={settings.parallax} onChange={(v) => update('parallax', v)} />

      <RangeRow label="SFX VOL" value={settings.sfx} onChange={(v) => update('sfx', v)} />
      <RangeRow label="MUSIC VOL" value={settings.music} onChange={(v) => update('music', v)} />

      <SelectRow
        label="DIFFICULTY"
        value={settings.difficulty}
        options={['easy', 'normal', 'hard', 'rank-d']}
        onChange={(v) => update('difficulty', v as Settings['difficulty'])}
      />
      <SelectRow
        label="BONUS FIGHTER"
        value={settings.bonusFighter}
        options={['low', 'mid', 'high', 'none']}
        onChange={(v) => update('bonusFighter', v as Settings['bonusFighter'])}
      />
      <Toggle label="FREE PLAY" value={settings.freePlay} onChange={(v) => update('freePlay', v)} />
      <SelectRow
        label="CONTROLS"
        value={settings.controls}
        options={['auto', 'kbd', 'gamepad']}
        onChange={(v) => update('controls', v as Settings['controls'])}
      />

      <div className="settings__row">
        <label>HIGH SCORES</label>
        <button className="neon-btn neon-btn--mag" onClick={onClearHiScores}>
          CLEAR
        </button>
      </div>

      <div className="settings__actions">
        <button className="neon-btn" onClick={onClose}>BACK</button>
      </div>
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="settings__row">
      <label>{label}</label>
      <button
        className={`settings__toggle${value ? ' settings__toggle--on' : ''}`}
        aria-pressed={value}
        onClick={() => onChange(!value)}
      >
        <span className="settings__toggle__dot" />
      </button>
    </div>
  );
}

function RangeRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="settings__row">
      <label>{label}</label>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}

function SelectRow({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div className="settings__row">
      <label>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o} value={o}>{o.toUpperCase()}</option>
        ))}
      </select>
    </div>
  );
}
