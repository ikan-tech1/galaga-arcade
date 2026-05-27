import { useEffect, useState } from 'react';

interface Props {
  score: number;
  stage: number;
  onSubmit: (initials: string) => void;
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ.-';

function pad(n: number, w: number) {
  return n.toString().padStart(w, '0');
}

export function HiScoreEntryScreen({ score, stage, onSubmit }: Props) {
  const [letters, setLetters] = useState<string[]>(['A', 'A', 'A']);
  const [cursor, setCursor] = useState(0);

  const setLetter = (idx: number, ch: string) => {
    setLetters((prev) => {
      const next = [...prev];
      next[idx] = ch;
      return next;
    });
  };

  const cycle = (dir: 1 | -1) => {
    setLetters((prev) => {
      const next = [...prev];
      const i = ALPHABET.indexOf(next[cursor]);
      next[cursor] = ALPHABET[(i + ALPHABET.length + dir) % ALPHABET.length];
      return next;
    });
  };

  const advance = () => {
    if (cursor < 2) setCursor(cursor + 1);
    else onSubmit(letters.join(''));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        cycle(-1);
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        cycle(1);
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD' || e.code === 'Space' || e.code === 'KeyZ') {
        e.preventDefault();
        advance();
      } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault();
        setCursor(Math.max(0, cursor - 1));
      } else if (e.code === 'Enter') {
        e.preventDefault();
        onSubmit(letters.join(''));
      } else if (/^Key[A-Z]$/.test(e.code)) {
        const ch = e.code.slice(3);
        setLetter(cursor, ch);
        if (cursor < 2) setCursor(cursor + 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, letters, onSubmit]);

  return (
    <div className="overlay overlay--interactive overlay__center">
      <div className="hientry">
        <div className="hientry__title">NEW HIGH SCORE</div>
        <div className="hientry__score">{pad(score, 6)}</div>
        <div className="gameover__line">STAGE {pad(stage, 3)}</div>
        <div className="hientry__slots" role="group" aria-label="Initials">
          {letters.map((ltr, i) => (
            <button
              key={i}
              type="button"
              className={`hientry__slot${i === cursor ? ' hientry__slot--active' : ''}`}
              onClick={() => setCursor(i)}
              aria-label={`Initial ${i + 1} is ${ltr}, tap to edit`}
            >
              {ltr}
            </button>
          ))}
        </div>
        <div className="hientry__keyboard" role="group" aria-label="Pick a letter">
          {ALPHABET.split('').map((ch) => (
            <button
              key={ch}
              type="button"
              className={`hientry__key${letters[cursor] === ch ? ' hientry__key--active' : ''}`}
              onClick={() => {
                setLetter(cursor, ch);
                if (cursor < 2) setCursor(cursor + 1);
              }}
            >
              {ch}
            </button>
          ))}
        </div>
        <div className="hientry__actions">
          <button
            type="button"
            className="neon-btn neon-btn--mag"
            onClick={() => setCursor(Math.max(0, cursor - 1))}
          >
            ◀ BACK
          </button>
          <button type="button" className="neon-btn neon-btn--gold" onClick={advance}>
            {cursor < 2 ? 'NEXT ▶' : 'SUBMIT ✓'}
          </button>
        </div>
        <div className="menu__hint">↑/↓ CHANGE · ↵ CONFIRM · TAP TO PICK</div>
      </div>
    </div>
  );
}
