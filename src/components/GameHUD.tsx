import React, { useEffect, useRef } from 'react';
import {
  BatteryCharging,
  Camera,
  ChevronLeft,
  ChevronRight,
  Flame,
  Megaphone,
  Navigation,
  Pause,
  ShieldAlert,
  User,
  Volume2,
  Zap,
} from 'lucide-react';
import {
  CameraMode,
  DialogueToast,
  FloatingPopup,
  GameMode,
  GameSettings,
  HudSnapshot,
} from '../game/types';
import { ControlState } from '../game/engine';

interface GameHUDProps {
  hud: HudSnapshot;
  mode: GameMode;
  driverName: string;
  settings: GameSettings;
  popups: FloatingPopup[];
  toast: DialogueToast | null;
  onControlChange: (key: keyof ControlState, down: boolean) => void;
  onHorn: () => void;
  onSoundBomb: () => void;
  onCycleCamera: () => void;
  onPause: () => void;
}

const CAMERA_LABELS: Record<CameraMode, string> = {
  close: 'Close',
  far: 'Far',
  driver: 'Driver',
};

export const GameHUD: React.FC<GameHUDProps> = ({
  hud,
  mode,
  driverName,
  settings,
  popups,
  toast,
  onControlChange,
  onHorn,
  onSoundBomb,
  onCycleCamera,
  onPause,
}) => {
  const minimapRef = useRef<HTMLCanvasElement | null>(null);

  // Draw crisp circular Dhaka mini-map
  useEffect(() => {
    const canvas = minimapRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const half = size / 2;
    const scale = 0.48; // world meters -> px

    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.beginPath();
    ctx.arc(half, half, half - 2, 0, Math.PI * 2);
    ctx.clip();

    // Dark map backdrop
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, size, size);

    // Rotate map relative to player heading so UP = forward
    ctx.translate(half, half);
    ctx.rotate(hud.playerYaw);

    // Draw expanded 5x5 Dhaka avenue grid lines
    const roadCoords = [-240, -120, 0, 120, 240];
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 7;
    roadCoords.forEach((rc) => {
      const rx = (rc - hud.playerX) * scale;
      const rz = (rc - hud.playerZ) * scale;
      // N-S avenue
      ctx.beginPath();
      ctx.moveTo(rx, -400);
      ctx.lineTo(rx, 400);
      ctx.stroke();
      // E-W avenue
      ctx.beginPath();
      ctx.moveTo(-400, rz);
      ctx.lineTo(400, rz);
      ctx.stroke();
    });

    // Draw blips
    hud.minimapBlips.forEach((b) => {
      const bx = (b.x - hud.playerX) * scale;
      const bz = (b.z - hud.playerZ) * scale;
      if (bx * bx + bz * bz > half * half) return;

      ctx.beginPath();
      if (b.type === 'charger') {
        ctx.fillStyle = '#facc15';
        ctx.arc(bx, bz, 4.5, 0, Math.PI * 2);
      } else if (b.type === 'police') {
        ctx.fillStyle = '#38bdf8';
        ctx.arc(bx, bz, 5, 0, Math.PI * 2);
      } else if (b.type === 'danger') {
        ctx.fillStyle = '#ef4444';
        ctx.arc(bx, bz, 3.6, 0, Math.PI * 2);
      } else if (b.type === 'checkpoint') {
        ctx.fillStyle = '#22d3ee';
        ctx.arc(bx, bz, 5.5, 0, Math.PI * 2);
      } else if (b.type === 'crowd') {
        ctx.fillStyle = '#f97316';
        ctx.arc(bx, bz, 3.2, 0, Math.PI * 2);
      } else {
        ctx.fillStyle = '#4ade80';
        ctx.arc(bx, bz, 2.3, 0, Math.PI * 2);
      }
      ctx.fill();
    });

    ctx.restore();

    // Player triangle at center (pointing up)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(half, half - 7);
    ctx.lineTo(half - 5, half + 6);
    ctx.lineTo(half + 5, half + 6);
    ctx.closePath();
    ctx.fill();

    // Outer brass bezel
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(half, half, half - 2, 0, Math.PI * 2);
    ctx.stroke();
  }, [hud]);

  const showTouch =
    settings.showTouchControls === 'always' ||
    (settings.showTouchControls === 'auto' &&
      (typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 1024)));

  const holdProps = (key: keyof ControlState) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      onControlChange(key, true);
    },
    onPointerUp: (e: React.PointerEvent) => {
      e.preventDefault();
      onControlChange(key, false);
    },
    onPointerCancel: () => onControlChange(key, false),
    onLostPointerCapture: () => onControlChange(key, false),
  });

  const batColor =
    hud.battery > 45 ? 'bg-emerald-500' : hud.battery > 20 ? 'bg-amber-400' : 'bg-rose-500';

  return (
    <div className="fixed inset-0 pointer-events-none select-none z-20 overflow-hidden">
      {/* TOP LEFT: National Loss Score, Driver Profile & Combo */}
      <div className="absolute top-3 left-3 flex flex-col gap-2 max-w-[260px]">
        <div
          className="rounded-xl border border-amber-400/50 px-3.5 py-2.5 shadow-lg"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.88)' }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 border border-amber-300 flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="leading-tight">
                <div className="text-[11px] font-bold text-amber-300 font-['Hind_Siliguri']">
                  {driverName}
                </div>
                <div className="text-[10px] text-slate-300 truncate max-w-[130px]">
                  {hud.districtNameBn}
                </div>
              </div>
            </div>
            <div className="text-right tabular-nums">
              <div className="text-[10px] uppercase tracking-wider text-slate-400">Speed</div>
              <div className="text-sm font-bold text-cyan-300 font-['JetBrains_Mono']">
                {hud.speedKmh} <span className="text-[10px]">km/h</span>
              </div>
            </div>
          </div>

          <div className="mt-2 pt-1.5 border-t border-slate-700/80">
            <div className="text-[10px] uppercase tracking-wider text-rose-300 font-semibold font-['Hind_Siliguri']">
              জাতীয় ক্ষতি / National Loss
            </div>
            <div className="text-2xl font-extrabold text-amber-300 tabular-nums font-['JetBrains_Mono'] leading-none mt-0.5">
              ৳ {hud.score.toLocaleString()}
            </div>
          </div>

          {hud.combo > 1 && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs font-bold text-rose-300">
                <span className="flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  COMBO x{hud.combo}
                </span>
                <span className="tabular-nums">{hud.distanceMeters}m</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-rose-500 transition-[width] duration-75"
                  style={{ width: `${Math.round(hud.comboTimerRatio * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Mode Objective Pill (Race / Challenge) */}
        {mode === 'race' && hud.raceTimeRemaining !== null && (
          <div
            className="rounded-lg border border-cyan-400/50 px-3 py-1.5 text-xs font-bold flex items-center justify-between tabular-nums"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.88)' }}
          >
            <span className="text-cyan-300">
              🏁 {hud.raceCheckpointsDone}/{hud.raceCheckpointsTotal} Checkpoints
            </span>
            <span className={hud.raceTimeRemaining < 15 ? 'text-rose-400' : 'text-white'}>
              {Math.max(0, Math.ceil(hud.raceTimeRemaining))}s
            </span>
          </div>
        )}

        {mode === 'challenge' && (
          <div
            className="rounded-lg border border-emerald-400/50 px-3 py-1.5 text-xs font-bold tabular-nums"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.88)' }}
          >
            <div className="flex justify-between text-emerald-300">
              <span>🎯 Target</span>
              <span>
                ৳{hud.challengeProgress.toLocaleString()} / ৳{hud.challengeTarget.toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {/* Angry Crowd Warning */}
        {hud.chasingCount > 0 && (
          <div
            className="rounded-lg border border-rose-500 px-3 py-1.5 text-xs font-bold text-rose-100 flex items-center justify-between gap-2"
            style={{ backgroundColor: 'rgba(127, 29, 29, 0.9)' }}
          >
            <span className="font-['Hind_Siliguri']">
              😡 জনতা ধাওয়া: {hud.chasingCount} | ঝুলছে: {hud.clungCount}/3
            </span>
            {hud.clungCount > 0 && (
              <span className="text-[10px] text-amber-300 uppercase">Boost to shake!</span>
            )}
          </div>
        )}
      </div>

      {/* TOP RIGHT: Circular Mini-Map, Battery %, Camera & Pause */}
      <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
        <div className="flex items-start gap-2 pointer-events-auto">
          <div className="flex flex-col gap-1.5 items-end">
            <div className="flex items-center gap-1.5">
              <button
                onClick={(e) => {
                  e.currentTarget.blur();
                  onCycleCamera();
                }}
                className="px-2.5 py-2 rounded-lg border border-slate-600 text-xs font-bold text-slate-100 hover:border-cyan-400 active:scale-95 flex items-center gap-1.5"
                style={{ backgroundColor: 'rgba(15, 23, 42, 0.88)' }}
                title="Switch Camera (C)"
              >
                <Camera className="w-3.5 h-3.5 text-cyan-300" />
                <span>{CAMERA_LABELS[hud.cameraMode]}</span>
              </button>
              <button
                onClick={(e) => {
                  e.currentTarget.blur();
                  onPause();
                }}
                className="p-2 rounded-lg border border-slate-600 text-white hover:border-amber-400 active:scale-95"
                style={{ backgroundColor: 'rgba(15, 23, 42, 0.88)' }}
                title="Pause (Esc)"
              >
                <Pause className="w-4 h-4" />
              </button>
            </div>

            {/* Battery Meter */}
            <div
              className="w-32 rounded-lg border border-slate-700 px-2.5 py-1.5"
              style={{ backgroundColor: 'rgba(15, 23, 42, 0.88)' }}
            >
              <div className="flex items-center justify-between text-[11px] font-bold tabular-nums">
                <span className="flex items-center gap-1 text-amber-300">
                  <BatteryCharging className="w-3.5 h-3.5" />
                  ব্যাটারি
                </span>
                <span className={hud.battery <= 20 ? 'text-rose-400' : 'text-emerald-300'}>
                  {hud.battery}%
                </span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mt-1">
                <div
                  className={`h-full ${batColor} transition-[width] duration-150`}
                  style={{ width: `${hud.battery}%` }}
                />
              </div>
            </div>
          </div>

          {/* Circular Mini-Map */}
          <canvas
            ref={minimapRef}
            width={110}
            height={110}
            className="w-[104px] h-[104px] rounded-full shadow-xl"
          />
        </div>

        {/* UNDER MINI-MAP: Nearest Charging Station + Police Settlement Marker */}
        <div className="flex flex-col items-end gap-1">
          <div
            className="rounded-lg border border-amber-400/50 px-2.5 py-1 text-[11px] font-bold text-amber-200 flex items-center gap-1.5 tabular-nums"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.88)' }}
          >
            <Navigation
              className="w-3.5 h-3.5 text-amber-400"
              style={{ transform: `rotate(${(-hud.nearestChargerAngle * 180) / Math.PI}deg)` }}
            />
            <span className="font-['Hind_Siliguri']">
              {hud.isCharging ? '⚡ চার্জ হচ্ছে...' : `⚡ চার্জিং: ${hud.nearestChargerDist}m`}
            </span>
          </div>

          {hud.policeActive && hud.policeDist !== null && hud.policeAngle !== null && (
            <div
              className="rounded-lg border border-sky-400/60 px-2.5 py-1 text-[11px] font-bold text-sky-200 flex items-center gap-1.5 tabular-nums"
              style={{ backgroundColor: 'rgba(12, 74, 110, 0.9)' }}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-sky-300" />
              <span className="font-['Hind_Siliguri']">
                👮 পুলিশ বক্স: {hud.policeDist}m
              </span>
              <Navigation
                className="w-3 h-3 text-sky-300"
                style={{ transform: `rotate(${(-hud.policeAngle * 180) / Math.PI}deg)` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Charging or Police Settling Center Status Banner */}
      {hud.isCharging && (
        <div
          className="absolute top-20 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-xl border border-amber-400 text-amber-200 text-xs font-bold font-['Hind_Siliguri']"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.92)' }}
        >
          ⚡ ইলেকট্রিক পোল থেকে চার্জ হচ্ছে ({hud.battery}%)
        </div>
      )}

      {hud.policeSettlingProgress > 0.05 && (
        <div
          className="absolute top-28 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl border border-sky-400 text-sky-100 text-xs font-bold font-['Hind_Siliguri']"
          style={{ backgroundColor: 'rgba(12, 74, 110, 0.94)' }}
        >
          👮 পুলিশের সাথে কথা চলছে... ({Math.round(hud.policeSettlingProgress * 100)}%)
        </div>
      )}

      {/* Funny Bengali Dialogue Toast */}
      {toast && (
        <div
          className="absolute top-4 left-1/2 -translate-x-1/2 max-w-md w-[90vw] rounded-xl border px-4 py-2.5 text-center shadow-xl"
          style={{
            backgroundColor:
              toast.tone === 'police'
                ? 'rgba(12, 74, 110, 0.95)'
                : toast.tone === 'crowd'
                  ? 'rgba(127, 29, 29, 0.95)'
                  : 'rgba(15, 23, 42, 0.94)',
            borderColor:
              toast.tone === 'police'
                ? '#38bdf8'
                : toast.tone === 'crowd'
                  ? '#f87171'
                  : '#fbbf24',
          }}
        >
          <div className="text-[11px] font-bold text-amber-300 font-['Hind_Siliguri']">
            {toast.speakerBn}
          </div>
          <div className="text-sm font-bold text-white font-['Hind_Siliguri'] leading-snug">
            “{toast.lineBn}”
          </div>
          <div className="text-[11px] text-slate-300">{toast.lineEn}</div>
        </div>
      )}

      {/* Floating 3D-Projected Damage Score Popups */}
      {popups.map((p) => (
        <div
          key={p.id}
          className="absolute -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none"
          style={{ left: p.x, top: p.y }}
        >
          <div
            className="text-xl font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] font-['JetBrains_Mono']"
            style={{ color: p.color }}
          >
            {p.text}
          </div>
          {p.subtext && (
            <div className="text-[11px] font-bold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)] font-['Hind_Siliguri']">
              {p.subtext}
            </div>
          )}
        </div>
      ))}

      {/* BOTTOM CONTROLS: Touch Arcade Controls + Desktop Keyboard Quick Strip */}
      {showTouch ? (
        <>
          {/* BOTTOM LEFT: Left / Right Steering + Horn + Sound Bomb */}
          <div
            className="absolute left-3 pointer-events-auto flex flex-col gap-2 origin-bottom-left"
            style={{
              bottom: `${12 + settings.buttonBottomOffset}px`,
              transform: `scale(${settings.buttonScale})`,
            }}
          >
            <div className="flex gap-2">
              <button
                onPointerDown={(e) => {
                  e.preventDefault();
                  onHorn();
                }}
                className="w-16 h-12 rounded-xl border border-amber-400/70 text-amber-200 font-bold text-xs flex flex-col items-center justify-center active:scale-90 transition-transform"
                style={{ backgroundColor: 'rgba(15, 23, 42, 0.86)' }}
              >
                <Megaphone className="w-4 h-4" />
                <span className="text-[10px] font-['Hind_Siliguri']">হর্ন</span>
              </button>
              <button
                onPointerDown={(e) => {
                  e.preventDefault();
                  onSoundBomb();
                }}
                className="w-20 h-12 rounded-xl border border-pink-400/70 text-pink-200 font-bold text-xs flex flex-col items-center justify-center active:scale-90 transition-transform"
                style={{ backgroundColor: 'rgba(80, 7, 36, 0.86)' }}
              >
                <Volume2 className="w-4 h-4" />
                <span className="text-[10px] font-['Hind_Siliguri']">সাউন্ড বোম</span>
              </button>
            </div>
            <div className="flex gap-2.5">
              <button
                {...holdProps('left')}
                className="w-[72px] h-[68px] rounded-2xl border-2 border-slate-400/70 text-white flex items-center justify-center active:scale-90 active:border-amber-400 transition-transform"
                style={{ backgroundColor: 'rgba(15, 23, 42, 0.86)' }}
              >
                <ChevronLeft className="w-9 h-9" />
              </button>
              <button
                {...holdProps('right')}
                className="w-[72px] h-[68px] rounded-2xl border-2 border-slate-400/70 text-white flex items-center justify-center active:scale-90 active:border-amber-400 transition-transform"
                style={{ backgroundColor: 'rgba(15, 23, 42, 0.86)' }}
              >
                <ChevronRight className="w-9 h-9" />
              </button>
            </div>
          </div>

          {/* BOTTOM RIGHT: Boost + Brake + Drive */}
          <div
            className="absolute right-3 pointer-events-auto flex flex-col items-end gap-2 origin-bottom-right"
            style={{
              bottom: `${12 + settings.buttonBottomOffset}px`,
              transform: `scale(${settings.buttonScale})`,
            }}
          >
            <button
              {...holdProps('boost')}
              className="w-32 h-12 rounded-xl border-2 border-cyan-400 text-cyan-200 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-90 transition-transform"
              style={{ backgroundColor: 'rgba(8, 51, 68, 0.9)' }}
            >
              <Zap className="w-4 h-4 text-cyan-300" />
              <span className="font-['Hind_Siliguri']">বুস্ট BOOST</span>
            </button>
            <div className="flex gap-2.5">
              <button
                {...holdProps('brake')}
                className="w-[68px] h-[68px] rounded-2xl border-2 border-rose-500/80 text-rose-200 font-bold text-xs flex flex-col items-center justify-center active:scale-90 transition-transform"
                style={{ backgroundColor: 'rgba(69, 10, 10, 0.88)' }}
              >
                <span className="font-['Hind_Siliguri'] text-sm">ব্রেক</span>
                <span className="text-[10px]">BRAKE</span>
              </button>
              <button
                {...holdProps('drive')}
                className="w-[78px] h-[68px] rounded-2xl border-2 border-emerald-400 text-emerald-100 font-bold text-xs flex flex-col items-center justify-center active:scale-90 transition-transform"
                style={{ backgroundColor: 'rgba(6, 78, 59, 0.9)' }}
              >
                <span className="font-['Hind_Siliguri'] text-sm">গ্যাস</span>
                <span className="text-[10px]">DRIVE</span>
              </button>
            </div>
          </div>
        </>
      ) : (
        /* Desktop quick action buttons + single flat control-hint line */
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              onClick={onHorn}
              className="px-3 py-1.5 rounded-lg border border-amber-400/60 text-amber-200 text-xs font-bold flex items-center gap-1.5 active:scale-95"
              style={{ backgroundColor: 'rgba(15, 23, 42, 0.85)' }}
            >
              <Megaphone className="w-3.5 h-3.5" />
              <span>হর্ন (H)</span>
            </button>
            <button
              onClick={onSoundBomb}
              className="px-3 py-1.5 rounded-lg border border-pink-400/60 text-pink-200 text-xs font-bold flex items-center gap-1.5 active:scale-95"
              style={{ backgroundColor: 'rgba(80, 7, 36, 0.85)' }}
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>সাউন্ড বোম (B)</span>
            </button>
          </div>
          <div
            className="px-3.5 py-1 rounded-lg border border-slate-700 text-[11px] text-slate-300 tracking-wide"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.82)' }}
          >
            WASD / Arrows Drive · Space Boost · H Horn · B Sound Bomb · C Camera · Esc Pause
          </div>
        </div>
      )}
    </div>
  );
};
