import { useEffect, useState } from 'react';
import { CabinetFrame } from './ui/CabinetFrame';
import { useGameLoop } from './game/useGameLoop';
import { GameCanvas } from './game/GameCanvas';
import { HUD } from './ui/HUD';
import { AttractScreen } from './ui/AttractScreen';
import { StageBanner } from './ui/StageBanner';
import { GameOverScreen } from './ui/GameOverScreen';
import { HiScoreEntryScreen } from './ui/HiScoreEntryScreen';
import { SettingsPanel } from './ui/SettingsPanel';
import { PauseScreen } from './ui/PauseScreen';
import { ChallengeResultScreen } from './ui/ChallengeResultScreen';
import { CRTOverlay } from './ui/CRTOverlay';
import { TouchControls } from './ui/TouchControls';
import { LoadingScreen } from './ui/LoadingScreen';
import { useSettings } from './state/useSettings';
import { useHiScores } from './state/useHiScores';
import { useDeviceCapabilities } from './state/useDeviceCapabilities';
import type { Phase } from './state/phase';

export function App() {
  const settings = useSettings();
  const hiscores = useHiScores();
  const caps = useDeviceCapabilities();
  const [showSettings, setShowSettings] = useState(false);
  const [bootProgress, setBootProgress] = useState(0.05);
  const [bootGone, setBootGone] = useState(false);

  const game = useGameLoop({ settings, hiscores, caps });

  // Smooth the loading-bar fill while WASM + sprites prepare. When ready,
  // snap to 100% so the bar visibly completes before fade-out.
  useEffect(() => {
    if (game.ready) {
      setBootProgress(1);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = () => {
      const elapsed = (performance.now() - start) / 1000;
      const eased = 1 - Math.exp(-elapsed / 1.2);
      setBootProgress(0.05 + eased * 0.9);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [game.ready]);

  // Remove the pre-React HTML loader once React has mounted; the React
  // <LoadingScreen> takes over without overlap.
  useEffect(() => {
    const node = document.getElementById('boot');
    if (!node) return;
    node.classList.add('gone');
    const id = window.setTimeout(() => node.remove(), 320);
    return () => window.clearTimeout(id);
  }, []);

  const handleStart = () => {
    game.api.startGame();
  };

  const handleSubmitInitials = (initials: string) => {
    hiscores.add({
      initials,
      score: game.frame?.score ?? 0,
      stage: game.frame?.stage ?? 1,
      date: Date.now(),
    });
    game.api.submitHiScore(initials);
  };

  const phase: Phase = game.frame?.phase ?? 'attract';

  // Wire global keys for menu (ESC = settings/exit).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        e.preventDefault();
        setShowSettings((s) => !s);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Reflect touch / narrow state on <html> so CSS can react without prop-drill.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('is-touch', caps.touch);
    root.classList.toggle('is-narrow', caps.narrow);
    root.classList.toggle('is-low-end', caps.lowEnd);
  }, [caps.touch, caps.narrow, caps.lowEnd]);

  const showTouchControls = caps.touch && !showSettings && phase !== 'hi_score_entry';

  return (
    <div className={`cabinet${caps.touch ? ' cabinet--touch' : ''}`}>
      <span className="cab-trim cab-trim--top" />
      <div className="cabinet__frame">
        <CabinetFrame title="GALAGA" />

        <GameCanvas
          frame={game.frame}
          settings={settings.settings}
          attract={phase === 'attract' || phase === 'demo'}
          quality={caps.lowEnd ? 'low' : caps.narrow ? 'medium' : 'high'}
        />

        <HUD
          frame={game.frame}
          hiscores={hiscores.list}
          showFlags={true}
        />

        {phase === 'attract' && (
          <AttractScreen
            hiScores={hiscores.list}
            onStart={handleStart}
            onSettings={() => setShowSettings(true)}
            touch={caps.touch}
          />
        )}

        {phase === 'stage_intro' && game.frame && (
          <StageBanner stage={game.frame.stage} challenge={game.frame.challenge} />
        )}

        {phase === 'game_over' && <GameOverScreen score={game.frame?.score ?? 0} />}

        {phase === 'hi_score_entry' && (
          <HiScoreEntryScreen
            score={game.frame?.score ?? 0}
            stage={game.frame?.stage ?? 1}
            onSubmit={handleSubmitInitials}
          />
        )}

        {phase === 'challenge_result' && game.frame && (
          <ChallengeResultScreen
            hits={game.frame.challenge_hits}
            total={game.frame.challenge_total}
            perfect={game.frame.challenge_perfect}
            bonus={game.frame.challenge_bonus}
          />
        )}

        {phase === 'paused' && <PauseScreen />}

        {showSettings && (
          <SettingsPanel
            settings={settings.settings}
            update={settings.update}
            onClose={() => setShowSettings(false)}
            onClearHiScores={hiscores.reset}
          />
        )}

        {settings.settings.crt && <CRTOverlay scanlines={settings.settings.scanlines} bloom={settings.settings.bloom} />}

        {!bootGone && (
          <LoadingScreen
            progress={bootProgress}
            ready={game.ready}
            onDone={() => setBootGone(true)}
          />
        )}
      </div>
      <span className="cab-trim cab-trim--bottom" />

      <TouchControls
        active={showTouchControls && bootGone}
        onStart={handleStart}
        phase={phase}
      />
    </div>
  );
}
