import { useCallback, useEffect, useMemo, useState } from 'react';
import { CabinetFrame } from './ui/CabinetFrame';
import { useGameLoop } from './game/useGameLoop';
import { GameCanvas } from './game/GameCanvas';
import { HUD } from './ui/HUD';
import { StageBanner } from './ui/StageBanner';
import { GameOverScreen } from './ui/GameOverScreen';
import { HiScoreEntryScreen } from './ui/HiScoreEntryScreen';
import { SettingsPanel } from './ui/SettingsPanel';
import { PauseScreen } from './ui/PauseScreen';
import { ChallengeResultScreen } from './ui/ChallengeResultScreen';
import { CRTOverlay } from './ui/CRTOverlay';
import { TouchControls } from './ui/TouchControls';
import { LoadingScreen } from './ui/LoadingScreen';
import { ModeHub } from './ui/ModeHub';
import { HangarScreen } from './ui/HangarScreen';
import { MissionBoard } from './ui/MissionBoard';
import { MissionBriefing } from './ui/MissionBriefing';
import { MissionComplete } from './ui/MissionComplete';
import { DailyCalendar } from './ui/DailyCalendar';
import { SecretsHint } from './ui/SecretsHint';
import { PowerUpHUD } from './ui/PowerUpHUD';
import { ObjectiveTracker } from './ui/ObjectiveTracker';
import { Toasts } from './ui/Toasts';
import { useSettings } from './state/useSettings';
import { useHiScores } from './state/useHiScores';
import { useDeviceCapabilities } from './state/useDeviceCapabilities';
import { useMeta } from './state/useMeta';
import { useEasterEggs } from './state/useEasterEggs';
import type { AppPhase, Phase } from './state/phase';
import type { GameMode, RunContext } from './meta/types';
import { dailyFor, dailyRewardMultiplier, utcDateKey } from './meta/daily';
import { MISSIONS } from './meta/missions';
import { UPGRADES } from './meta/upgrades';
import { computeStars } from './meta/runTracker';
import { SHIPS } from './meta/ships';
import { playMetaCue } from './game/audio';

export function App() {
  const settings = useSettings();
  const hiscores = useHiScores();
  const caps = useDeviceCapabilities();
  const metaStore = useMeta();
  const [appPhase, setAppPhase] = useState<AppPhase>('mode_hub');
  const [runCtx, setRunCtx] = useState<RunContext | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [pendingMission, setPendingMission] = useState<string | null>(null);
  const [missionResult, setMissionResult] = useState<{
    missionId: string;
    stars: 0 | 1 | 2 | 3;
    credits: number;
    score: number;
  } | null>(null);
  const [bootProgress, setBootProgress] = useState(0.05);
  const [bootGone, setBootGone] = useState(false);

  const eggs = useEasterEggs({
    isDiscovered: (id) => metaStore.meta.discovered.includes(id),
    onDiscover: (id, reward) => {
      metaStore.markEggDiscovered(id, reward);
      // Special unlocks.
      if (id === 'rainbowMode' || id === 'secretShipUnlock') {
        metaStore.unlock('rainbow');
      }
    },
  });

  // Hook the engine + meta tracker.
  const game = useGameLoop({
    settings,
    hiscores,
    caps,
    runContext: runCtx,
  });

  // Easter-egg signals from the tracker need to be drained.
  useEffect(() => {
    const t = (game.meta as any)?.raisedEggs as string[] | undefined;
    if (t) {
      // Not used: tracker signals are surfaced separately below.
    }
  }, [game.meta]);

  // Forward easter eggs raised during the run tick (rescue+perfect, namco, 7777).
  useEffect(() => {
    // We watch the meta layer's snapshot for new combinations and dispatch
    // easter-egg triggers idempotently via useEasterEggs.
    if (game.meta.rescues > 0 && game.meta.perfectChallenges > 0) {
      eggs.handleRunSignals(['rescuePerfect']);
    }
    if (game.meta.highestStage >= 88) {
      eggs.handleRunSignals(['namcoFormation']);
    }
    if (game.frame && game.frame.score >= 7777 && game.frame.score < 7800) {
      eggs.handleRunSignals(['score7777']);
    }
  }, [game.meta, game.frame?.score, eggs]);

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

  useEffect(() => {
    const node = document.getElementById('boot');
    if (!node) return;
    node.classList.add('gone');
    const id = window.setTimeout(() => node.remove(), 320);
    return () => window.clearTimeout(id);
  }, []);

  const phase: Phase = game.frame?.phase ?? 'attract';

  // Detect mission completion / game over to award credits + capture stars.
  useEffect(() => {
    if (appPhase !== 'playing') return;
    if (phase !== 'game_over' && phase !== 'hi_score_entry') return;
    const ctx = runCtx;
    if (!ctx) return;
    if (ctx.mode === 'mission' && ctx.missionId) {
      const def = MISSIONS.find((m) => m.id === ctx.missionId);
      if (!def || !game.meta.mission) return;
      const stars = computeStars(game.meta.mission, def.objectives);
      const earned =
        stars > 0 ? Math.round(def.rewardCredits * stars * (1 / 3) + game.meta.credits) : Math.round(game.meta.credits);
      setMissionResult({
        missionId: ctx.missionId,
        stars,
        credits: earned,
        score: game.frame?.score ?? 0,
      });
      metaStore.finishMission(ctx.missionId, stars, earned);
      playMetaCue('mission_complete');
    } else if (ctx.mode === 'arcadePlus' || ctx.mode === 'endless') {
      metaStore.grantCredits(game.meta.credits);
      if (ctx.mode === 'endless') {
        metaStore.updateEndless(game.frame?.score ?? 0);
      }
    } else if (ctx.mode === 'daily' && ctx.daily) {
      const mult = dailyRewardMultiplier(ctx.daily);
      const credits = Math.round((500 + game.meta.credits) * mult);
      metaStore.grantCredits(credits);
      if (game.meta.highestStage > ctx.daily.startStage + 1) {
        metaStore.recordDailyComplete(ctx.daily.date);
        playMetaCue('streak_bump');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, appPhase]);

  // Watch side quest completions for global "completed" count.
  const lastSideRef = useMemo(() => ({ count: 0 }), []);
  useEffect(() => {
    const done = game.meta.sideQuests.filter((q) => q.done).length;
    if (done > lastSideRef.count) {
      const delta = done - lastSideRef.count;
      lastSideRef.count = done;
      for (let i = 0; i < delta; i++) metaStore.recordSideQuest();
    }
  }, [game.meta.sideQuests, lastSideRef, metaStore]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        e.preventDefault();
        if (showSettings) {
          setShowSettings(false);
          return;
        }
        if (appPhase === 'playing') {
          // Allow ESC to return to mode hub from the engine.
          game.api.reset();
          setAppPhase('mode_hub');
          setRunCtx(null);
        } else if (appPhase === 'mode_hub') {
          setShowSettings(true);
        } else {
          setAppPhase('mode_hub');
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [appPhase, showSettings, game.api]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('is-touch', caps.touch);
    root.classList.toggle('is-narrow', caps.narrow);
    root.classList.toggle('is-low-end', caps.lowEnd);
    root.classList.toggle('is-rainbow', eggs.rainbow);
    root.classList.toggle('is-debug-overlay', eggs.debugOverlay);
  }, [caps.touch, caps.narrow, caps.lowEnd, eggs.rainbow, eggs.debugOverlay]);

  const showTouchControls =
    appPhase === 'playing' &&
    caps.touch &&
    !showSettings &&
    phase !== 'hi_score_entry';

  const beginMode = useCallback(
    (mode: GameMode) => {
      playMetaCue('mode_select');
      if (mode === 'mission') {
        setAppPhase('mission_board');
        return;
      }
      if (mode === 'daily') {
        setAppPhase('daily_calendar');
        return;
      }
      const ship = metaStore.meta.selectedShip;
      const ctx: RunContext = { mode, ship, rainbow: eggs.rainbow };
      if (mode === 'classic') {
        ctx.ship = 'fighter'; // Classic must stay 1981
      }
      setRunCtx(ctx);
      setAppPhase('playing');
      // Slight delay to ensure context is observed before game.start.
      window.setTimeout(() => game.api.startGame(), 30);
    },
    [metaStore.meta.selectedShip, game.api, eggs.rainbow],
  );

  const launchMission = useCallback(
    (id: string) => {
      setPendingMission(id);
      setAppPhase('mission_briefing');
    },
    [],
  );

  const confirmMissionLaunch = useCallback(() => {
    if (!pendingMission) return;
    const ctx: RunContext = {
      mode: 'mission',
      ship: metaStore.meta.selectedShip,
      missionId: pendingMission,
      rainbow: eggs.rainbow,
    };
    setRunCtx(ctx);
    setAppPhase('playing');
    window.setTimeout(() => game.api.startGame(), 30);
  }, [pendingMission, metaStore.meta.selectedShip, game.api, eggs.rainbow]);

  const launchDaily = useCallback(() => {
    const daily = dailyFor();
    const ctx: RunContext = {
      mode: 'daily',
      ship: metaStore.meta.selectedShip,
      daily,
      rainbow: eggs.rainbow,
    };
    setRunCtx(ctx);
    setAppPhase('playing');
    window.setTimeout(() => game.api.startGame(), 30);
  }, [metaStore.meta.selectedShip, game.api, eggs.rainbow]);

  const handleSubmitInitials = (initials: string) => {
    hiscores.add({
      initials,
      score: game.frame?.score ?? 0,
      stage: game.frame?.stage ?? 1,
      date: Date.now(),
    });
    game.api.submitHiScore(initials);
  };

  // Mirror tap-to-start at attract for classic-mode runs.
  useEffect(() => {
    if (appPhase !== 'playing') return;
    if (phase !== 'attract') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyZ') {
        game.api.startGame();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [appPhase, phase, game.api]);

  // Daily modifier visual hints.
  const mirrored = !!runCtx?.daily?.modifiers.includes('mirroredScreen');
  const tinyShip = !!runCtx?.daily?.modifiers.includes('tinyShip');

  const missionDef =
    runCtx?.mode === 'mission' && runCtx.missionId
      ? MISSIONS.find((m) => m.id === runCtx.missionId)
      : undefined;

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
          ship={
            eggs.rainbow && appPhase === 'playing'
              ? 'rainbow'
              : appPhase === 'playing' && runCtx?.mode !== 'classic'
              ? runCtx?.ship ?? 'fighter'
              : 'fighter'
          }
          drops={appPhase === 'playing' ? game.meta.drops : []}
          active={appPhase === 'playing' ? game.meta.active : []}
          bombFlash={game.meta.bombFlash}
          mirrored={mirrored && appPhase === 'playing'}
          tinyShip={tinyShip && appPhase === 'playing'}
        />

        {appPhase === 'playing' && (
          <HUD
            frame={game.frame}
            hiscores={hiscores.list}
            showFlags={true}
          />
        )}

        {appPhase === 'playing' &&
          (phase === 'playing' ||
            phase === 'stage_intro' ||
            phase === 'challenge_result') &&
          runCtx &&
          runCtx.mode !== 'classic' && (
            <>
              <PowerUpHUD
                active={game.meta.active}
                bombs={game.meta.bombs}
                combo={game.meta.combo}
                scoreMul={game.meta.scoreMul}
              />
              <ObjectiveTracker
                mission={game.meta.mission}
                missionDef={missionDef}
                sideQuests={game.meta.sideQuests}
              />
              <Toasts toasts={game.meta.toasts} />
            </>
          )}

        {appPhase === 'playing' &&
          phase === 'stage_intro' &&
          game.frame && (
            <StageBanner stage={game.frame.stage} challenge={game.frame.challenge} />
          )}

        {appPhase === 'playing' && phase === 'game_over' && (
          <GameOverScreen score={game.frame?.score ?? 0} />
        )}

        {appPhase === 'playing' && phase === 'hi_score_entry' && (
          <HiScoreEntryScreen
            score={game.frame?.score ?? 0}
            stage={game.frame?.stage ?? 1}
            onSubmit={handleSubmitInitials}
          />
        )}

        {appPhase === 'playing' && phase === 'challenge_result' && game.frame && (
          <ChallengeResultScreen
            hits={game.frame.challenge_hits}
            total={game.frame.challenge_total}
            perfect={game.frame.challenge_perfect}
            bonus={game.frame.challenge_bonus}
          />
        )}

        {appPhase === 'playing' && phase === 'paused' && <PauseScreen />}

        {appPhase === 'mode_hub' && (
          <ModeHub
            meta={metaStore.meta}
            onSelect={beginMode}
            onOpenHangar={() => setAppPhase('hangar')}
            onOpenSettings={() => setShowSettings(true)}
            onOpenSecrets={() => setAppPhase('secrets')}
            onLogoTap={eggs.onLogoTap}
          />
        )}

        {appPhase === 'hangar' && (
          <HangarScreen
            meta={metaStore.meta}
            onPickShip={metaStore.pickShip}
            onPurchase={(id) => {
              const ok = metaStore.tryPurchaseUpgrade(id);
              if (ok) playMetaCue('upgrade_purchase');
            }}
            onClose={() => setAppPhase('mode_hub')}
          />
        )}

        {appPhase === 'mission_board' && (
          <MissionBoard
            meta={metaStore.meta}
            onStart={launchMission}
            onClose={() => setAppPhase('mode_hub')}
          />
        )}

        {appPhase === 'mission_briefing' && pendingMission && (
          <MissionBriefing
            missionId={pendingMission}
            ship={metaStore.meta.selectedShip}
            onLaunch={confirmMissionLaunch}
            onAbort={() => setAppPhase('mission_board')}
          />
        )}

        {appPhase === 'mission_complete' && missionResult && (
          <MissionComplete
            missionId={missionResult.missionId}
            stars={missionResult.stars}
            earnedCredits={missionResult.credits}
            score={missionResult.score}
            onReturn={() => {
              setMissionResult(null);
              setRunCtx(null);
              setAppPhase('mode_hub');
            }}
          />
        )}

        {appPhase === 'daily_calendar' && (
          <DailyCalendar
            meta={metaStore.meta}
            onLaunch={launchDaily}
            onClose={() => setAppPhase('mode_hub')}
          />
        )}

        {appPhase === 'secrets' && (
          <SecretsHint
            meta={metaStore.meta}
            onClose={() => setAppPhase('mode_hub')}
          />
        )}

        {showSettings && (
          <SettingsPanel
            settings={settings.settings}
            update={settings.update}
            onClose={() => setShowSettings(false)}
            onClearHiScores={hiscores.reset}
          />
        )}

        {settings.settings.crt && (
          <CRTOverlay scanlines={settings.settings.scanlines} bloom={settings.settings.bloom} />
        )}

        {eggs.debugOverlay && (
          <DebugOverlay
            frame={game.frame}
            meta={game.meta}
            run={runCtx}
            close={() => eggs.setDebugOverlay(false)}
          />
        )}

        {!bootGone && (
          <LoadingScreen
            progress={bootProgress}
            ready={game.ready}
            error={game.loadError}
            onDone={() => setBootGone(true)}
          />
        )}
      </div>
      <span className="cab-trim cab-trim--bottom" />

      {/* Auto-show mission complete when stars are tallied. */}
      {missionResult && appPhase === 'playing' && (
        <MissionCompletePopover
          stars={missionResult.stars}
          credits={missionResult.credits}
          score={missionResult.score}
          missionId={missionResult.missionId}
          onContinue={() => {
            setAppPhase('mission_complete');
          }}
        />
      )}

      <TouchControls
        active={showTouchControls && bootGone}
        onStart={() => game.api.startGame()}
        phase={phase}
      />

      <Watermark
        utcDate={utcDateKey()}
        ship={SHIPS[metaStore.meta.selectedShip].name}
        mode={runCtx?.mode ?? 'mode_hub'}
        upgrades={Object.keys(UPGRADES)
          .map((k) => metaStore.meta.upgrades[k as keyof typeof metaStore.meta.upgrades] ?? 0)
          .reduce((a, b) => a + b, 0)}
      />
    </div>
  );
}

function DebugOverlay({
  frame,
  meta,
  run,
  close,
}: {
  frame: any;
  meta: any;
  run: RunContext | null;
  close: () => void;
}) {
  return (
    <div className="debug-overlay" onClick={close}>
      <div className="debug-overlay__panel">
        <div className="debug-overlay__title">DEBUG · GHOST</div>
        <pre className="debug-overlay__body">
          {`ENGINE
  phase   = ${frame?.phase}
  frame   = ${frame?.frame}
  stage   = ${frame?.stage}
  score   = ${frame?.score}
  hi      = ${frame?.hi_score}
  lives   = ${frame?.lives}
  dual    = ${frame?.player_dual}
  capt    = ${frame?.player_captured}
META
  mode    = ${run?.mode}
  ship    = ${run?.ship}
  kills   = ${meta?.kills}
  bosses  = ${meta?.bossKills}
  divers  = ${meta?.divingKills}
  combo   = ${meta?.combo}/${meta?.bestCombo}
  multi   = ${meta?.scoreMul}
  bombs   = ${meta?.bombs}
  drops   = ${meta?.drops?.length}
  toasts  = ${meta?.toasts?.length}
`}
        </pre>
        <button className="neon-btn" onClick={close}>CLOSE</button>
      </div>
    </div>
  );
}

function MissionCompletePopover({
  stars,
  credits,
  score,
  missionId,
  onContinue,
}: {
  stars: 0 | 1 | 2 | 3;
  credits: number;
  score: number;
  missionId: string;
  onContinue: () => void;
}) {
  // Show automatically after a short delay so the player sees their final
  // engine frame before the modal appears.
  useEffect(() => {
    const t = window.setTimeout(onContinue, 1500);
    return () => window.clearTimeout(t);
  }, [onContinue]);
  void stars;
  void credits;
  void score;
  void missionId;
  return null;
}

function Watermark({
  utcDate,
  ship,
  mode,
  upgrades,
}: {
  utcDate: string;
  ship: string;
  mode: string;
  upgrades: number;
}) {
  // Hidden semantic stamp for screenshots — also a tiny dev anchor.
  return (
    <div className="watermark" aria-hidden="true">
      <span>{utcDate}</span>
      <span>·</span>
      <span>{ship}</span>
      <span>·</span>
      <span>{mode.toUpperCase()}</span>
      <span>·</span>
      <span>UP {upgrades}</span>
    </div>
  );
}
