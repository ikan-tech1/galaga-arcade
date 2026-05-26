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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        setLetters((prev) => {
          const next = [...prev];
          const idx = ALPHABET.indexOf(next[cursor]);
          next[cursor] = ALPHABET[(idx + ALPHABET.length - 1) % ALPHABET.length];
          return next;
        });
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        setLetters((prev) => {
          const next = [...prev];
          const idx = ALPHABET.indexOf(next[cursor]);
          next[cursor] = ALPHABET[(idx + 1) % ALPHABET.length];
          return next;
        });
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD' || e.code === 'Space' || e.code === 'KeyZ') {
        e.preventDefault();
        if (cursor < 2) setCursor(cursor + 1);
        else onSubmit(letters.join(''));
      } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault();
        setCursor(Math.max(0, cursor - 1));
      } else if (e.code === 'Enter') {
        e.preventDefault();
        onSubmit(letters.join(''));
      } else if (/^Key[A-Z]$/.test(e.code)) {
        const ch = e.code.slice(3);
        setLetters((prev) => {
          const next = [...prev];
          next[cursor] = ch;
          return next;
        });
        if (cursor < 2) setCursor(cursor + 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cursor, letters, onSubmit]);

  return (
    <div className="overlay overlay--interactive overlay__center">
      <div className="hientry">
        <div className="hientry__title">NEW HIGH SCORE</div>
        <div className="hientry__score">{pad(score, 6)}</div>
        <div className="gameover__line">STAGE {pad(stage, 3)}</div>
        <div className="hientry__slots">
          {letters.map((ltr, i) => (
            <div
              key={i}
              className={`hientry__slot${i === cursor ? ' hientry__slot--active' : ''}`}
            >
              {ltr}
            </div>
          ))}
        </div>
        <div className="menu__hint">↑/↓ CHANGE · ↵ CONFIRM</div>
      </div>
    </div>
  );
}
