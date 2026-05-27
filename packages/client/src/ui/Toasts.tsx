import type { ToastMessage } from '../meta/types';

interface Props {
  toasts: ToastMessage[];
}

export function Toasts({ toasts }: Props) {
  if (toasts.length === 0) return null;
  // Show the most recent 3 toasts.
  const list = toasts.slice(-3);
  return (
    <div className="toasts" aria-live="polite">
      {list.map((t) => (
        <div key={t.id} className={`toast toast--${t.kind}`}>
          <div className="toast__title">{t.title}</div>
          {t.detail && <div className="toast__detail">{t.detail}</div>}
        </div>
      ))}
    </div>
  );
}
