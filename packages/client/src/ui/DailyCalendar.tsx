import { DAILY_MODIFIERS, calendarGrid, dailyFor, utcDateKey, dailyRewardMultiplier } from '../meta/daily';
import type { MetaProgression } from '../meta/types';

interface Props {
  meta: MetaProgression;
  onLaunch: () => void;
  onClose: () => void;
}

export function DailyCalendar({ meta, onLaunch, onClose }: Props) {
  const today = new Date();
  const daily = dailyFor(today);
  const todayKey = utcDateKey(today);
  const cells = calendarGrid(today);
  const doneToday = meta.daily.lastCompletedDate === todayKey;
  const completedSet = new Set(meta.daily.completedDates);
  const rewardMul = dailyRewardMultiplier(daily);

  return (
    <div className="overlay overlay--interactive daily">
      <header className="daily__header">
        <h2 className="daily__title">DAILY CHALLENGE</h2>
        <div className="daily__streak">
          <span>STREAK</span>
          <strong>{meta.daily.current}</strong>
          <span>· BEST</span>
          <strong>{meta.daily.best}</strong>
        </div>
      </header>

      <section className="daily__today">
        <div className="daily__today-label">TODAY · {todayKey}</div>
        <div className="daily__today-title">{daily.title}</div>
        <ul className="daily__mods">
          {daily.modifiers.map((id) => {
            const m = DAILY_MODIFIERS[id];
            return (
              <li key={id} className="daily__mod">
                <div className="daily__mod-name">{m.name}</div>
                <div className="daily__mod-desc">{m.description}</div>
                <div className="daily__mod-mul">×{m.rewardMul.toFixed(1)} REWARD</div>
              </li>
            );
          })}
        </ul>
        <div className="daily__reward">
          BASE 500 CR · TOTAL ×{rewardMul.toFixed(2)}
        </div>
        <button
          className="neon-btn neon-btn--start"
          onClick={onLaunch}
          disabled={false}
        >
          {doneToday ? 'PLAY AGAIN (NO STREAK)' : 'BEGIN CHALLENGE'}
        </button>
      </section>

      <section className="daily__calendar">
        <div className="daily__cal-head">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>
        <div className="daily__cal-grid">
          {cells.map(({ date, key }) => {
            const isToday = key === todayKey;
            const isFuture = date.getTime() > today.getTime();
            const done = completedSet.has(key);
            return (
              <div
                key={key}
                className={`daily__cell${done ? ' daily__cell--done' : ''}${
                  isToday ? ' daily__cell--today' : ''
                }${isFuture ? ' daily__cell--future' : ''}`}
                title={key}
              >
                <span className="daily__cell-day">{date.getUTCDate()}</span>
                {done && <span className="daily__cell-mark">✓</span>}
              </div>
            );
          })}
        </div>
      </section>

      <footer className="daily__footer">
        <button className="neon-btn" onClick={onClose}>← BACK</button>
      </footer>
    </div>
  );
}
