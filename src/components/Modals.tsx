import React, { useState } from 'react';
import {
  BatteryCharging,
  Check,
  Clock,
  Flag,
  Home,
  MapPin,
  Play,
  RotateCcw,
  Settings as SettingsIcon,
  ShieldAlert,
  Trophy,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import { getTimeUntilBangladeshMidnight } from '../game/storage';
import {
  CameraMode,
  DISTRICTS,
  GameSettings,
  GraphicsQuality,
  LeaderboardEntry,
  ModalType,
  PlayerProfile,
  RACES,
} from '../game/types';

interface ModalsProps {
  modal: ModalType;
  profile: PlayerProfile;
  settings: GameSettings;
  selectedDistrictId: string;
  leaderboard: LeaderboardEntry[];
  onClose: () => void;
  onSelectDistrict: (id: string) => void;
  onStartRace: (raceId: string, startDistrictId: string) => void;
  onClaimDailyTask: (taskId: string) => void;
  onUpdateDriverName: (name: string) => void;
  onUpdateSettings: (next: GameSettings) => void;
}

export const Modals: React.FC<ModalsProps> = ({
  modal,
  profile,
  settings,
  selectedDistrictId,
  leaderboard,
  onClose,
  onSelectDistrict,
  onStartRace,
  onClaimDailyTask,
  onUpdateDriverName,
  onUpdateSettings,
}) => {
  const [lbTab, setLbTab] = useState<'all' | 'weekly' | 'monthly'>('all');

  if (!modal) return null;

  const nowMs = Date.now();
  const filteredLb = leaderboard.filter((entry) => {
    if (lbTab === 'all') return true;
    const ageDays = (nowMs - new Date(entry.dateIso).getTime()) / 86400000;
    return lbTab === 'weekly' ? ageDays <= 7 : ageDays <= 30;
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(2, 6, 23, 0.84)' }}
    >
      <div className="w-full max-w-3xl max-h-[88vh] flex flex-col rounded-2xl border-2 border-amber-400/60 bg-slate-900 text-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="font-bold text-lg text-amber-300 font-['Hind_Siliguri']">
            {modal === 'locations' && 'জায়গা বাছুন • Select Dhaka Start Location'}
            {modal === 'races' && 'রেস মোড • Dhaka Street Races'}
            {modal === 'daily' && 'আজকের কাজ • Daily Missions'}
            {modal === 'leaderboard' && 'স্কোরবোর্ড • Dhaka Legends'}
            {modal === 'settings' && 'সেটিংস • Graphics, Audio & Controls'}
            {modal === 'tutorial' && 'কীভাবে খেলবেন • Street Survival Guide'}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* 1. LOCATIONS */}
          {modal === 'locations' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {DISTRICTS.map((d) => {
                const active = d.id === selectedDistrictId;
                return (
                  <button
                    key={d.id}
                    onClick={() => {
                      onSelectDistrict(d.id);
                      onClose();
                    }}
                    className={`text-left p-3.5 rounded-xl border-2 transition-colors ${
                      active
                        ? 'bg-emerald-950/80 border-amber-400'
                        : 'bg-slate-800/80 border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: d.accentColor }}
                      />
                      {active && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-400 text-slate-950">
                          SELECTED
                        </span>
                      )}
                    </div>
                    <div className="text-base font-bold text-white font-['Hind_Siliguri'] mt-2">
                      {d.nameBn}
                    </div>
                    <div className="text-xs font-semibold text-amber-300">{d.nameEn}</div>
                    <p className="text-[11px] text-slate-300 mt-1.5 leading-relaxed">
                      {d.description}
                    </p>
                  </button>
                );
              })}
            </div>
          )}

          {/* 2. RACES */}
          {modal === 'races' && (
            <div className="space-y-3">
              {RACES.map((r) => (
                <div
                  key={r.id}
                  className="p-4 rounded-xl bg-slate-800/90 border border-slate-700 flex flex-wrap items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <Flag className="w-4 h-4 text-cyan-400" />
                      <span className="text-base font-bold text-white font-['Hind_Siliguri']">
                        {r.titleBn}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-amber-300 font-bold">
                        {r.difficulty}
                      </span>
                    </div>
                    <div className="text-xs text-slate-300 mt-1">
                      {r.titleEn} · {r.targetCheckpoints} Checkpoints · {r.timeLimitSec}s Limit ·
                      Reward: <span className="text-emerald-300 font-bold">৳{r.rewardTaka}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => onStartRace(r.id, r.startDistrictId)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center gap-1.5"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Start Race
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 3. DAILY TASKS */}
          {modal === 'daily' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <Clock className="w-4 h-4 text-amber-400" />
                  Resets at Bangladesh Midnight (BST UTC+6):{' '}
                  <strong className="text-amber-300">{getTimeUntilBangladeshMidnight()}</strong>
                </span>
                <span className="font-bold text-emerald-300">
                  Wallet: ৳{profile.taka.toLocaleString()}
                </span>
              </div>

              {profile.dailyTasks.map((t) => {
                const done = t.progress >= t.target;
                const pct = Math.min(100, Math.round((t.progress / t.target) * 100));
                return (
                  <div
                    key={t.id}
                    className="p-4 rounded-xl bg-slate-800/90 border border-slate-700 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                            t.tier === 'Easy'
                              ? 'bg-emerald-700 text-white'
                              : t.tier === 'Medium'
                                ? 'bg-amber-500 text-slate-950'
                                : 'bg-rose-600 text-white'
                          }`}
                        >
                          {t.tier}
                        </span>
                        <span className="font-bold text-sm font-['Hind_Siliguri']">
                          {t.titleBn}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">{t.titleEn}</div>
                      <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden mt-2">
                        <div
                          className="h-full bg-emerald-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="text-[11px] text-slate-300 mt-1 tabular-nums">
                        {Math.min(t.target, Math.floor(t.progress)).toLocaleString()} /{' '}
                        {t.target.toLocaleString()} · Reward: ৳{t.rewardTaka}
                      </div>
                    </div>

                    <button
                      disabled={!done || t.claimed}
                      onClick={() => onClaimDailyTask(t.id)}
                      className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 ${
                        t.claimed
                          ? 'bg-slate-700 text-slate-400 cursor-default'
                          : done
                            ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                            : 'bg-slate-700/60 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {t.claimed ? (
                        <>
                          <Check className="w-4 h-4" /> Claimed
                        </>
                      ) : (
                        <>Claim ৳{t.rewardTaka}</>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* 4. LEADERBOARD */}
          {modal === 'leaderboard' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-800 p-3 rounded-xl border border-slate-700">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-300 font-bold">Driver Name:</span>
                  <input
                    type="text"
                    maxLength={18}
                    value={profile.driverName}
                    onChange={(e) => onUpdateDriverName(e.target.value)}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-600 text-sm text-white font-['Hind_Siliguri']"
                  />
                </div>
                <div className="flex gap-1.5">
                  {(['all', 'weekly', 'monthly'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setLbTab(tab)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold capitalize ${
                        lbTab === tab
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {tab === 'all' ? 'Local Best' : tab}
                    </button>
                  ))}
                </div>
              </div>

              <div className="divide-y divide-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                {filteredLb.map((entry, idx) => (
                  <div
                    key={entry.id}
                    className={`px-4 py-2.5 flex items-center justify-between text-sm ${
                      entry.isPlayer ? 'bg-emerald-950/60' : 'bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 text-center font-black text-amber-300 font-['JetBrains_Mono']">
                        #{idx + 1}
                      </span>
                      <div>
                        <div className="font-bold text-white font-['Hind_Siliguri']">
                          {entry.driverName}{' '}
                          {entry.isPlayer && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-600 ml-1">
                              YOU
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {entry.district} · {entry.distance}m · Max x{entry.combo}
                        </div>
                      </div>
                    </div>
                    <div className="font-black text-rose-300 tabular-nums font-['JetBrains_Mono']">
                      ৳ {entry.score.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. SETTINGS */}
          {modal === 'settings' && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 space-y-3">
                  <div className="font-bold text-amber-300">Performance & Graphics</div>
                  <div>
                    <div className="text-xs text-slate-300 mb-1">Graphics Preset</div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['low', 'medium', 'high'] as GraphicsQuality[]).map((q) => (
                        <button
                          key={q}
                          onClick={() => onUpdateSettings({ ...settings, graphics: q })}
                          className={`py-1.5 rounded-lg text-xs font-bold capitalize border ${
                            settings.graphics === q
                              ? 'bg-emerald-600 border-amber-300 text-white'
                              : 'bg-slate-900 border-slate-700 text-slate-300'
                          }`}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-300 mb-1">Target Frame Rate</div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {([30, 60] as const).map((fps) => (
                        <button
                          key={fps}
                          onClick={() => onUpdateSettings({ ...settings, targetFps: fps })}
                          className={`py-1.5 rounded-lg text-xs font-bold border ${
                            settings.targetFps === fps
                              ? 'bg-emerald-600 border-amber-300 text-white'
                              : 'bg-slate-900 border-slate-700 text-slate-300'
                          }`}
                        >
                          {fps} FPS
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span>Render Distance</span>
                      <span>{settings.renderDistance}m</span>
                    </div>
                    <input
                      type="range"
                      min={110}
                      max={260}
                      step={10}
                      value={settings.renderDistance}
                      onChange={(e) =>
                        onUpdateSettings({ ...settings, renderDistance: Number(e.target.value) })
                      }
                      className="w-full accent-amber-400"
                    />
                  </div>

                  <div>
                    <div className="text-xs text-slate-300 mb-1">Default Camera</div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['close', 'far', 'driver'] as CameraMode[]).map((cm) => (
                        <button
                          key={cm}
                          onClick={() => onUpdateSettings({ ...settings, defaultCamera: cm })}
                          className={`py-1.5 rounded-lg text-xs font-bold capitalize border ${
                            settings.defaultCamera === cm
                              ? 'bg-cyan-600 border-cyan-300 text-white'
                              : 'bg-slate-900 border-slate-700 text-slate-300'
                          }`}
                        >
                          {cm}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 space-y-3">
                  <div className="font-bold text-amber-300">Audio & Touch Controls</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(
                      [
                        ['masterMuted', 'Master Audio'],
                        ['motorMuted', 'EV Motor'],
                        ['hornMuted', 'Auto Horn'],
                        ['voiceMuted', 'Sound Bomb'],
                        ['sfxMuted', 'Crash & Charge'],
                      ] as const
                    ).map(([key, label]) => {
                      const muted = settings.audio[key];
                      return (
                        <button
                          key={key}
                          onClick={() =>
                            onUpdateSettings({
                              ...settings,
                              audio: { ...settings.audio, [key]: !muted },
                            })
                          }
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border flex items-center justify-between ${
                            muted
                              ? 'bg-rose-950 border-rose-700 text-rose-300'
                              : 'bg-slate-900 border-slate-700 text-emerald-300'
                          }`}
                        >
                          <span>{label}</span>
                          {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                        </button>
                      );
                    })}
                  </div>

                  <div>
                    <div className="text-xs text-slate-300 mb-1">On-Screen Touch Buttons</div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['auto', 'always', 'off'] as const).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => onUpdateSettings({ ...settings, showTouchControls: mode })}
                          className={`py-1.5 rounded-lg text-xs font-bold capitalize border ${
                            settings.showTouchControls === mode
                              ? 'bg-emerald-600 border-amber-300 text-white'
                              : 'bg-slate-900 border-slate-700 text-slate-300'
                          }`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span>Touch Button Size</span>
                      <span>{Math.round(settings.buttonScale * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0.8}
                      max={1.25}
                      step={0.05}
                      value={settings.buttonScale}
                      onChange={(e) =>
                        onUpdateSettings({ ...settings, buttonScale: Number(e.target.value) })
                      }
                      className="w-full accent-amber-400"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span>Touch Button Height Offset</span>
                      <span>{settings.buttonBottomOffset}px</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={44}
                      step={4}
                      value={settings.buttonBottomOffset}
                      onChange={(e) =>
                        onUpdateSettings({
                          ...settings,
                          buttonBottomOffset: Number(e.target.value),
                        })
                      }
                      className="w-full accent-amber-400"
                    />
                  </div>

                  <label className="flex items-center justify-between text-xs text-slate-200 pt-1">
                    <span>Haptic Vibration Feedback</span>
                    <input
                      type="checkbox"
                      checked={settings.vibrationEnabled}
                      onChange={(e) =>
                        onUpdateSettings({ ...settings, vibrationEnabled: e.target.checked })
                      }
                      className="w-4 h-4 accent-emerald-500"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* 6. TUTORIAL */}
          {modal === 'tutorial' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs leading-relaxed">
              <div className="p-3.5 rounded-xl bg-slate-800 border border-slate-700 space-y-1.5">
                <div className="font-bold text-sm text-amber-300 font-['Hind_Siliguri']">
                  ১. অটো চালানো ও বুস্ট (Controls)
                </div>
                <p className="text-slate-300">
                  Use <strong>W/S</strong> or <strong>Up/Down</strong> (or touch Drive/Brake) and{' '}
                  <strong>A/D</strong> or <strong>Left/Right</strong> to weave through Dhaka lanes.
                  Press <strong>Space</strong> for Electric Boost—it works even independently of Drive!
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-800 border border-slate-700 space-y-1.5">
                <div className="font-bold text-sm text-rose-300 font-['Hind_Siliguri']">
                  ২. বাস-ট্রাক সাবধান! (Scoring & Hazards)
                </div>
                <p className="text-slate-300">
                  Smash Cars, CNGs, Rickshaws, Motorbikes, Tea Stalls, and Fruit Carts to build{' '}
                  <strong>National Loss Combos</strong>. Avoid <strong>Buses & Trucks</strong>—one
                  hit ends your run immediately!
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-800 border border-slate-700 space-y-1.5">
                <div className="font-bold text-sm text-emerald-300 font-['Hind_Siliguri']">
                  ৩. জনতা ধাওয়া ও পুলিশ সেটেলমেন্ট
                </div>
                <p className="text-slate-300 flex items-start gap-2">
                  <ShieldAlert className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                  <span>
                    Angry citizens chase you after crashes! If <strong>3 cling on</strong> or you
                    stop, you get caught. Use <strong>Boost</strong> to shake them off, or stop
                    inside a blue <strong>Police Box</strong> to settle for ৳500!
                  </span>
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-800 border border-slate-700 space-y-1.5">
                <div className="font-bold text-sm text-yellow-300 font-['Hind_Siliguri']">
                  ৪. ব্যাটারি চার্জ ও সাউন্ড বোম
                </div>
                <p className="text-slate-300 flex items-start gap-2">
                  <BatteryCharging className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    Follow the yellow mini-map markers to Electric Poles and stop inside the yellow
                    ring to plug in and recharge! Press <strong>H</strong> for Horn or{' '}
                    <strong>B</strong> for funny Bengali Sound Bombs.
                  </span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onOpenSettings: () => void;
  onMainMenu: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onOpenSettings,
  onMainMenu,
}) => (
  <div
    className="fixed inset-0 z-40 flex items-center justify-center p-4"
    style={{ backgroundColor: 'rgba(2, 6, 23, 0.78)' }}
  >
    <div className="w-full max-w-sm rounded-2xl border-2 border-amber-400/70 bg-slate-900 p-6 text-center shadow-2xl space-y-3">
      <div className="text-2xl font-black text-amber-300 font-['Hind_Siliguri']">
        বিরতি • GAME PAUSED
      </div>
      <div className="space-y-2.5 pt-2">
        <button
          onClick={onResume}
          className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-2"
        >
          <Play className="w-4 h-4 fill-current" />
          <span className="font-['Hind_Siliguri']">চালিয়ে যান (Resume)</span>
        </button>
        <button
          onClick={onRestart}
          className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-bold flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          <span className="font-['Hind_Siliguri']">নতুন করে শুরু (Restart)</span>
        </button>
        <button
          onClick={onOpenSettings}
          className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-bold flex items-center justify-center gap-2"
        >
          <SettingsIcon className="w-4 h-4" />
          <span className="font-['Hind_Siliguri']">সেটিংস (Settings)</span>
        </button>
        <button
          onClick={onMainMenu}
          className="w-full py-3 rounded-xl bg-rose-900/80 hover:bg-rose-800 border border-rose-700 text-rose-100 font-bold flex items-center justify-center gap-2"
        >
          <Home className="w-4 h-4" />
          <span className="font-['Hind_Siliguri']">মেইন মেনু (Main Menu)</span>
        </button>
      </div>
    </div>
  </div>
);
