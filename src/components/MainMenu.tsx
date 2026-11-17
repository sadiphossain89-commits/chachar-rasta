import React from 'react';
import {
  BookOpen,
  CalendarCheck,
  Flag,
  MapPin,
  Play,
  Settings,
  Trophy,
  Wrench,
} from 'lucide-react';
import { DISTRICTS, GameMode, ModalType, PlayerProfile } from '../game/types';

interface MainMenuProps {
  profile: PlayerProfile;
  selectedMode: GameMode;
  selectedDistrictId: string;
  onSelectMode: (mode: GameMode) => void;
  onPlay: () => void;
  onOpenGarage: () => void;
  onOpenModal: (modal: ModalType) => void;
}

const MODE_OPTIONS: Array<{ id: GameMode; bn: string; en: string }> = [
  { id: 'endless', bn: 'এন্ডলেস কেওস', en: 'Endless Chaos' },
  { id: 'race', bn: 'রেস মোড', en: 'Race Mode' },
  { id: 'free', bn: 'ফ্রি ড্রাইভ', en: 'Free Drive' },
  { id: 'challenge', bn: 'চ্যালেঞ্জ', en: 'Challenge' },
];

export const MainMenu: React.FC<MainMenuProps> = ({
  profile,
  selectedMode,
  selectedDistrictId,
  onSelectMode,
  onPlay,
  onOpenGarage,
  onOpenModal,
}) => {
  const district = DISTRICTS.find((d) => d.id === selectedDistrictId) || DISTRICTS[0];
  const unclaimedCount = profile.dailyTasks.filter((t) => t.progress >= t.target && !t.claimed).length;

  return (
    <div className="fixed inset-0 z-30 pointer-events-none flex flex-col justify-between p-4 sm:p-6">
      {/* Top Strip: Bespoke SVG Title Lockup + Driver Balance (leaves center Easy Bike showcase clean) */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div
          className="pointer-events-auto rounded-2xl border-2 border-amber-400/70 px-5 py-3.5 shadow-2xl max-w-md"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.88)' }}
        >
          <div className="flex items-center gap-3">
            {/* Bespoke Bangladeshi Rickshaw-Art Easy Bike Emblem SVG */}
            <svg width="46" height="46" viewBox="0 0 64 64" className="shrink-0">
              <circle cx="32" cy="32" r="30" fill="#065f46" stroke="#fbbf24" strokeWidth="3" />
              <circle cx="32" cy="32" r="18" fill="#e11d48" />
              <path
                d="M16 36 L20 20 L44 20 L48 36 Z"
                fill="#22d3ee"
                stroke="#fef08a"
                strokeWidth="2.5"
              />
              <circle cx="22" cy="44" r="5" fill="#111827" stroke="#fbbf24" strokeWidth="2" />
              <circle cx="42" cy="44" r="5" fill="#111827" stroke="#fbbf24" strokeWidth="2" />
              <circle cx="32" cy="28" r="4" fill="#fef08a" />
            </svg>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-amber-300 font-['Chakra_Petch'] leading-none">
                DHAKA ROAD CHAOS 3D
              </h1>
              <div className="text-sm font-bold text-emerald-300 font-['Hind_Siliguri'] mt-1">
                ঢাকা রোড কেওস • ব্যাটারি ইজি বাইক আর্কেড
              </div>
            </div>
          </div>
        </div>

        {/* Player Profile & Best Record */}
        <div
          className="pointer-events-auto rounded-2xl border border-slate-600 px-4 py-2.5 flex items-center gap-4 shadow-xl"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.88)' }}
        >
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400">Driver</div>
            <div className="text-sm font-bold text-white font-['Hind_Siliguri']">
              {profile.driverName}
            </div>
          </div>
          <div className="h-7 w-px bg-slate-700" />
          <div className="tabular-nums">
            <div className="text-[10px] uppercase tracking-wider text-slate-400">Best Loss</div>
            <div className="text-sm font-bold text-rose-300 font-['JetBrains_Mono']">
              ৳ {profile.bestScore.toLocaleString()}
            </div>
          </div>
          <div className="h-7 w-px bg-slate-700" />
          <div className="tabular-nums">
            <div className="text-[10px] uppercase tracking-wider text-slate-400">Wallet</div>
            <div className="text-sm font-bold text-emerald-300 font-['JetBrains_Mono']">
              ৳ {profile.taka.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Dock: Mode Switcher + Primary Play CTA + 8 Menu Actions */}
      <div className="w-full max-w-5xl mx-auto pointer-events-auto flex flex-col gap-2.5">
        {/* Mode & Location Bar */}
        <div
          className="rounded-2xl border border-slate-700 p-2.5 flex flex-wrap items-center justify-between gap-2 shadow-2xl"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.92)' }}
        >
          <div className="flex flex-wrap gap-1.5">
            {MODE_OPTIONS.map((m) => (
              <button
                key={m.id}
                onClick={() => onSelectMode(m.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors border ${
                  selectedMode === m.id
                    ? 'bg-emerald-600 border-amber-300 text-white'
                    : 'bg-slate-800/90 border-slate-700 text-slate-300 hover:border-slate-500'
                }`}
              >
                <span className="font-['Hind_Siliguri']">{m.bn}</span>
                <span className="ml-1.5 text-[10px] opacity-80">({m.en})</span>
              </button>
            ))}
          </div>

          <button
            onClick={() => onOpenModal('locations')}
            className="px-3 py-1.5 rounded-xl bg-slate-800 border border-amber-400/50 text-xs font-bold text-amber-200 flex items-center gap-1.5 hover:bg-slate-700"
          >
            <MapPin className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-['Hind_Siliguri']">{district.nameBn}</span>
            <span className="text-[10px] text-slate-400">({district.nameEn})</span>
          </button>
        </div>

        {/* Main 8 Menu Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {/* 1. রাস্তায় নামেন (Play) */}
          <button
            onClick={onPlay}
            className="col-span-2 sm:col-span-2 lg:col-span-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 border-2 border-amber-300 text-white font-extrabold flex items-center justify-center gap-2 shadow-lg hover:brightness-110 active:scale-95 transition-transform"
          >
            <Play className="w-5 h-5 fill-current" />
            <div className="text-left leading-tight">
              <div className="text-sm font-['Hind_Siliguri']">রাস্তায় নামেন</div>
              <div className="text-[10px] tracking-wider uppercase text-amber-200">Hit the Road</div>
            </div>
          </button>

          {/* 2. জায়গা বাছুন (Start Location) */}
          <button
            onClick={() => onOpenModal('locations')}
            className="py-2.5 px-3 rounded-xl border border-slate-600 text-slate-100 hover:border-amber-400 flex flex-col items-center justify-center gap-0.5 active:scale-95"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.92)' }}
          >
            <MapPin className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold font-['Hind_Siliguri']">জায়গা বাছুন</span>
            <span className="text-[10px] text-slate-400">Locations</span>
          </button>

          {/* 3. গ্যারেজ (Garage) */}
          <button
            onClick={onOpenGarage}
            className="py-2.5 px-3 rounded-xl border border-slate-600 text-slate-100 hover:border-pink-400 flex flex-col items-center justify-center gap-0.5 active:scale-95"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.92)' }}
          >
            <Wrench className="w-4 h-4 text-pink-400" />
            <span className="text-xs font-bold font-['Hind_Siliguri']">গ্যারেজ</span>
            <span className="text-[10px] text-slate-400">Garage 3D</span>
          </button>

          {/* 4. রেস (Races) */}
          <button
            onClick={() => onOpenModal('races')}
            className="py-2.5 px-3 rounded-xl border border-slate-600 text-slate-100 hover:border-cyan-400 flex flex-col items-center justify-center gap-0.5 active:scale-95"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.92)' }}
          >
            <Flag className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold font-['Hind_Siliguri']">রেস</span>
            <span className="text-[10px] text-slate-400">Races</span>
          </button>

          {/* 5. আজকের কাজ (Daily Tasks) */}
          <button
            onClick={() => onOpenModal('daily')}
            className="relative py-2.5 px-3 rounded-xl border border-slate-600 text-slate-100 hover:border-emerald-400 flex flex-col items-center justify-center gap-0.5 active:scale-95"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.92)' }}
          >
            {unclaimedCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] font-black flex items-center justify-center">
                {unclaimedCount}
              </span>
            )}
            <CalendarCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold font-['Hind_Siliguri']">আজকের কাজ</span>
            <span className="text-[10px] text-slate-400">Daily Tasks</span>
          </button>

          {/* 6. স্কোরবোর্ড (Leaderboard) */}
          <button
            onClick={() => onOpenModal('leaderboard')}
            className="py-2.5 px-3 rounded-xl border border-slate-600 text-slate-100 hover:border-amber-300 flex flex-col items-center justify-center gap-0.5 active:scale-95"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.92)' }}
          >
            <Trophy className="w-4 h-4 text-amber-300" />
            <span className="text-xs font-bold font-['Hind_Siliguri']">স্কোরবোর্ড</span>
            <span className="text-[10px] text-slate-400">Leaderboard</span>
          </button>

          {/* 7 & 8: Settings + Tutorial stacked compactly or side-by-side */}
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => onOpenModal('settings')}
              className="py-2 px-2 rounded-xl border border-slate-600 text-slate-100 hover:border-slate-300 flex flex-col items-center justify-center gap-0.5 active:scale-95"
              style={{ backgroundColor: 'rgba(15, 23, 42, 0.92)' }}
              title="সেটিংস (Settings)"
            >
              <Settings className="w-4 h-4 text-slate-300" />
              <span className="text-[10px] font-bold font-['Hind_Siliguri']">সেটিংস</span>
            </button>
            <button
              onClick={() => onOpenModal('tutorial')}
              className="py-2 px-2 rounded-xl border border-slate-600 text-slate-100 hover:border-sky-300 flex flex-col items-center justify-center gap-0.5 active:scale-95"
              style={{ backgroundColor: 'rgba(15, 23, 42, 0.92)' }}
              title="কীভাবে খেলবেন (Tutorial)"
            >
              <BookOpen className="w-4 h-4 text-sky-300" />
              <span className="text-[10px] font-bold font-['Hind_Siliguri']">গাইড</span>
            </button>
          </div>
        </div>

        <div className="text-center text-[11px] text-slate-200 font-medium">
          Enter / Space Start · WASD / Touch Drive · H Horn · B Sound Bomb · Esc Pause
        </div>
      </div>
    </div>
  );
};
