import { useCallback, useEffect, useRef, useState } from 'react';
import { GameHUD } from './components/GameHUD';
import { GarageOverlay } from './components/GarageOverlay';
import { MainMenu } from './components/MainMenu';
import { Modals, PauseModal } from './components/Modals';
import { NewspaperGameOver } from './components/NewspaperGameOver';
import { ControlState, DhakaGameEngine } from './game/engine';
import {
  loadGarage,
  loadLeaderboard,
  loadProfile,
  loadSettings,
  recordLeaderboardRun,
  saveGarage,
  saveProfile,
  saveSettings,
} from './game/storage';
import {
  DialogueToast,
  DISTRICTS,
  FloatingPopup,
  GameMode,
  GameSettings,
  GarageConfig,
  HudSnapshot,
  LeaderboardEntry,
  ModalType,
  PlayerProfile,
  RACES,
  RunSummary,
  ScreenState,
} from './game/types';

const INITIAL_HUD: HudSnapshot = {
  score: 0,
  combo: 0,
  comboTimerRatio: 0,
  speedKmh: 0,
  battery: 100,
  isCharging: false,
  isBoosting: false,
  distanceMeters: 0,
  collisions: 0,
  highestCombo: 0,
  chasingCount: 0,
  clungCount: 0,
  crowdEscapeCount: 0,
  nearestChargerDist: 50,
  nearestChargerAngle: 0,
  policeDist: null,
  policeAngle: null,
  policeActive: false,
  policeSettlingProgress: 0,
  playerX: 0,
  playerZ: 0,
  playerYaw: 0,
  cameraMode: 'close',
  districtNameBn: 'শাহবাগ মোড়',
  districtNameEn: 'Shahbag Junction',
  raceTimeRemaining: null,
  raceCheckpointsDone: 0,
  raceCheckpointsTotal: 6,
  challengeProgress: 0,
  challengeTarget: 12000,
  minimapBlips: [],
};

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<DhakaGameEngine | null>(null);

  const [screen, setScreen] = useState<ScreenState>('menu');
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [selectedMode, setSelectedMode] = useState<GameMode>('endless');
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>('shahbag');
  const [selectedRaceId, setSelectedRaceId] = useState<string>(RACES[0].id);

  const [profile, setProfile] = useState<PlayerProfile>(() => loadProfile());
  const [garageConfig, setGarageConfig] = useState<GarageConfig>(() => loadGarage());
  const [settings, setSettings] = useState<GameSettings>(() => loadSettings());
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => loadLeaderboard());

  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [popups, setPopups] = useState<FloatingPopup[]>([]);
  const [toast, setToast] = useState<DialogueToast | null>(null);
  const [runSummary, setRunSummary] = useState<RunSummary | null>(null);

  const screenRef = useRef(screen);
  screenRef.current = screen;
  const profileRef = useRef(profile);
  profileRef.current = profile;

  // Cleanup expired floating popups cleanly
  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = performance.now();
      setPopups((prev) => {
        if (prev.length === 0) return prev;
        const next = prev.filter((p) => now - p.createdAt < 950);
        return next.length === prev.length ? prev : next;
      });
    }, 150);
    return () => window.clearInterval(timer);
  }, []);

  const handleTaskProgress = useCallback(
    (delta: {
      distance?: number;
      score?: number;
      boosts?: number;
      crashes?: number;
      escapes?: number;
    }) => {
      setProfile((prev) => {
        let changed = false;
        const nextTasks = prev.dailyTasks.map((t) => {
          if (t.claimed || t.progress >= t.target) return t;
          const inc = delta[t.type] || 0;
          if (inc <= 0) return t;
          changed = true;
          return { ...t, progress: Math.min(t.target, t.progress + inc) };
        });
        if (!changed) return prev;
        const updated = { ...prev, dailyTasks: nextTasks };
        saveProfile(updated);
        return updated;
      });
    },
    [],
  );

  // Mount isolated Three.js engine once
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const engine = new DhakaGameEngine(container, garageConfig, settings, {
      onHudUpdate: (snap) => setHud(snap),
      onPopup: (p) => setPopups((prev) => [...prev.slice(-7), p]),
      onToast: (t) => {
        setToast(t);
        window.setTimeout(() => {
          setToast((cur) => (cur?.id === t.id ? null : cur));
        }, 3200);
      },
      onPoliceSettlementFee: (fee) => {
        setProfile((prev) => {
          const updated = { ...prev, taka: Math.max(0, prev.taka - fee) };
          saveProfile(updated);
          return updated;
        });
      },
      onPauseToggle: () => {
        setScreen((cur) => {
          if (cur === 'playing') {
            engine.setSceneMode('paused');
            return 'paused';
          }
          if (cur === 'paused') {
            engine.setSceneMode('playing');
            return 'playing';
          }
          return cur;
        });
      },
      onTaskProgress: handleTaskProgress,
      onGameOver: (summary) => {
        const curProfile = profileRef.current;
        const isNewBest = summary.finalScore > curProfile.bestScore && summary.finalScore > 0;
        const finalSummary: RunSummary = { ...summary, isNewBest };

        const updatedProfile: PlayerProfile = {
          ...curProfile,
          taka: curProfile.taka + summary.takaEarned,
          totalRuns: curProfile.totalRuns + 1,
          bestScore: Math.max(curProfile.bestScore, summary.finalScore),
          bestDistance: Math.max(curProfile.bestDistance, summary.distanceMeters),
        };
        saveProfile(updatedProfile);
        setProfile(updatedProfile);

        if (summary.finalScore > 0) {
          const distObj = DISTRICTS.find((d) => d.id === summary.districtId) || DISTRICTS[0];
          const updatedLb = recordLeaderboardRun({
            driverName: updatedProfile.driverName,
            district: distObj.nameBn,
            score: summary.finalScore,
            distance: summary.distanceMeters,
            combo: summary.highestCombo,
          });
          setLeaderboard(updatedLb);
        }

        setRunSummary(finalSummary);
        setScreen('gameover');
      },
    });

    engineRef.current = engine;
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
    // Mount once intentionally; settings/garage live-updated via methods below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePlay = useCallback(
    (modeOverride?: GameMode, districtOverride?: string, raceOverride?: string) => {
      const m = modeOverride || selectedMode;
      const d = districtOverride || selectedDistrictId;
      const r = raceOverride || selectedRaceId;
      setRunSummary(null);
      setActiveModal(null);
      setScreen('playing');
      engineRef.current?.startRun(m, d, r);
    },
    [selectedMode, selectedDistrictId, selectedRaceId],
  );

  // Enter / Space shortcut to start from Main Menu
  useEffect(() => {
    const onMenuKey = (e: KeyboardEvent) => {
      if (screenRef.current !== 'menu' || activeModal !== null) return;
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        handlePlay();
      }
    };
    window.addEventListener('keydown', onMenuKey);
    return () => window.removeEventListener('keydown', onMenuKey);
  }, [activeModal, handlePlay]);

  const handleGarageChange = (next: GarageConfig) => {
    setGarageConfig(next);
    saveGarage(next);
    engineRef.current?.updateGarageConfig(next);

    if (next.driverName !== profile.driverName) {
      const updated = { ...profile, driverName: next.driverName };
      setProfile(updated);
      saveProfile(updated);
    }
  };

  const handleSettingsChange = (next: GameSettings) => {
    setSettings(next);
    saveSettings(next);
    engineRef.current?.updateSettings(next);
  };

  const handleUpdateDriverName = (name: string) => {
    const updatedProfile = { ...profile, driverName: name };
    setProfile(updatedProfile);
    saveProfile(updatedProfile);

    const updatedGarage = { ...garageConfig, driverName: name };
    setGarageConfig(updatedGarage);
    saveGarage(updatedGarage);
    engineRef.current?.updateGarageConfig(updatedGarage);
  };

  const handleClaimDailyTask = (taskId: string) => {
    const targetTask = profile.dailyTasks.find((t) => t.id === taskId);
    if (!targetTask || targetTask.claimed || targetTask.progress < targetTask.target) return;
    const updated: PlayerProfile = {
      ...profile,
      taka: profile.taka + targetTask.rewardTaka,
      dailyTasks: profile.dailyTasks.map((t) =>
        t.id === taskId ? { ...t, claimed: true } : t,
      ),
    };
    setProfile(updated);
    saveProfile(updated);
  };

  const handleControlChange = (key: keyof ControlState, down: boolean) => {
    engineRef.current?.setTouchControl(key, down);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950">
      {/* Isolated Full-Viewport WebGL Container */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full" />

      {screen === 'menu' && (
        <MainMenu
          profile={profile}
          selectedMode={selectedMode}
          selectedDistrictId={selectedDistrictId}
          onSelectMode={setSelectedMode}
          onPlay={() => handlePlay()}
          onOpenGarage={() => {
            setScreen('garage');
            engineRef.current?.setSceneMode('garage');
          }}
          onOpenModal={setActiveModal}
        />
      )}

      {screen === 'garage' && (
        <GarageOverlay
          config={garageConfig}
          taka={profile.taka}
          onChange={handleGarageChange}
          onBack={() => {
            setScreen('menu');
            engineRef.current?.setSceneMode('menu');
          }}
        />
      )}

      {(screen === 'playing' || screen === 'paused') && (
        <GameHUD
          hud={hud}
          mode={selectedMode}
          driverName={profile.driverName}
          settings={settings}
          popups={popups}
          toast={toast}
          onControlChange={handleControlChange}
          onHorn={() => engineRef.current?.triggerHorn()}
          onSoundBomb={() => engineRef.current?.triggerSoundBomb()}
          onCycleCamera={() => {
            const nextCam = engineRef.current?.cycleCamera();
            if (nextCam) setHud((h) => ({ ...h, cameraMode: nextCam }));
          }}
          onPause={() => {
            setScreen('paused');
            engineRef.current?.setSceneMode('paused');
          }}
        />
      )}

      {screen === 'paused' && !activeModal && (
        <PauseModal
          onResume={() => {
            setScreen('playing');
            engineRef.current?.setSceneMode('playing');
          }}
          onRestart={() => handlePlay()}
          onOpenSettings={() => setActiveModal('settings')}
          onMainMenu={() => {
            setScreen('menu');
            engineRef.current?.setSceneMode('menu');
          }}
        />
      )}

      {screen === 'gameover' && runSummary && (
        <NewspaperGameOver
          summary={runSummary}
          driverName={profile.driverName}
          onPlayAgain={() => handlePlay()}
          onMainMenu={() => {
            setRunSummary(null);
            setScreen('menu');
            engineRef.current?.setSceneMode('menu');
          }}
        />
      )}

      <Modals
        modal={activeModal}
        profile={profile}
        settings={settings}
        selectedDistrictId={selectedDistrictId}
        leaderboard={leaderboard}
        onClose={() => setActiveModal(null)}
        onSelectDistrict={setSelectedDistrictId}
        onStartRace={(raceId, startDistrictId) => {
          setSelectedMode('race');
          setSelectedRaceId(raceId);
          setSelectedDistrictId(startDistrictId);
          handlePlay('race', startDistrictId, raceId);
        }}
        onClaimDailyTask={handleClaimDailyTask}
        onUpdateDriverName={handleUpdateDriverName}
        onUpdateSettings={handleSettingsChange}
      />
    </div>
  );
}
