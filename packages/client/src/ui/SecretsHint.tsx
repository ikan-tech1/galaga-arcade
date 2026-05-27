import { EASTER_EGGS, EGG_ORDER } from '../meta/easterEggs';
import type { MetaProgression } from '../meta/types';

interface Props {
  meta: MetaProgression;
  onClose: () => void;
}

export function SecretsHint({ meta, onClose }: Props) {
  const discovered = new Set(meta.discovered);
  return (
    <div className="overlay overlay--interactive secrets">
      <header className="secrets__header">
        <h2 className="secrets__title">SECRETS · {discovered.size}/{EGG_ORDER.length}</h2>
        <div className="secrets__hint">
          Hints are vague on purpose. Cracking one rewards credits + (sometimes) ship unlocks.
        </div>
      </header>
      <ul className="secrets__list">
        {EGG_ORDER.map((id) => {
          const def = EASTER_EGGS[id];
          const found = discovered.has(id);
          return (
            <li key={id} className={`secrets__row${found ? ' secrets__row--found' : ''}`}>
              <span className="secrets__icon" aria-hidden="true">
                {found ? '★' : '?'}
              </span>
              <div className="secrets__row-body">
                <div className="secrets__row-name">
                  {found ? def.name : '— UNDISCOVERED —'}
                </div>
                <div className="secrets__row-hint">{def.hint}</div>
              </div>
              {found && <span className="secrets__reward">+{def.reward}</span>}
            </li>
          );
        })}
      </ul>
      <footer className="secrets__footer">
        <button className="neon-btn" onClick={onClose}>← BACK</button>
      </footer>
    </div>
  );
}
