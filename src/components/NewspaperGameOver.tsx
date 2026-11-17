import React, { useState } from 'react';
import { Award, Check, Home, RotateCcw, Share2 } from 'lucide-react';
import { motion } from 'motion/react';
import { DISTRICTS, RunSummary } from '../game/types';

interface NewspaperGameOverProps {
  summary: RunSummary;
  driverName: string;
  onPlayAgain: () => void;
  onMainMenu: () => void;
}

export const NewspaperGameOver: React.FC<NewspaperGameOverProps> = ({
  summary,
  driverName,
  onPlayAgain,
  onMainMenu,
}) => {
  const [copied, setCopied] = useState(false);
  const district = DISTRICTS.find((d) => d.id === summary.districtId) || DISTRICTS[0];
  const isVictory = summary.reason === 'race_won' || summary.reason === 'challenge_won';

  const handleShare = async () => {
    const shareText = `🛺 Dhaka Road Chaos 3D — ${driverName}\n📰 ${summary.headlineBn}\n💥 National Loss: ৳${summary.finalScore.toLocaleString()}\n🛣️ Distance: ${summary.distanceMeters}m | 🔥 Max Combo: x${summary.highestCombo}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Dhaka Road Chaos 3D', text: shareText });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareText);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(2, 6, 23, 0.82)' }}
    >
      <motion.div
        initial={{ scale: 0.55, rotate: -14, opacity: 0 }}
        animate={{ scale: 1, rotate: -1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 18 }}
        className="w-full max-w-xl bg-[#f5efe2] text-stone-900 rounded-md shadow-2xl border-4 border-stone-900 overflow-hidden"
      >
        {/* Newspaper Masthead */}
        <div className="bg-stone-900 text-[#f5efe2] px-5 py-2.5 flex items-center justify-between border-b-4 border-rose-700">
          <div>
            <div className="text-[10px] tracking-[0.22em] uppercase text-amber-300 font-bold">
              SPECIAL EDITION • DHAKA STREET CHRONICLE
            </div>
            <div className="text-xl sm:text-2xl font-extrabold font-['Hind_Siliguri'] leading-tight">
              দৈনিক ঢাকার হালচাল
            </div>
          </div>
          <div className="text-right text-[11px] font-['JetBrains_Mono']">
            <div>৳ ২ মাত্র</div>
            <div className="text-amber-300">{district.nameBn}</div>
          </div>
        </div>

        {/* Breaking Headline */}
        <div className="p-5">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span
              className={`px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-wider text-white ${
                isVictory ? 'bg-emerald-700' : 'bg-rose-700'
              }`}
            >
              {isVictory ? '🏆 VICTORY SPECIAL' : '🚨 BREAKING NEWS'}
            </span>
            {summary.isNewBest && (
              <span className="px-2.5 py-0.5 bg-amber-400 text-stone-950 text-xs font-extrabold flex items-center gap-1 rounded">
                <Award className="w-3.5 h-3.5" />
                NEW PERSONAL RECORD!
              </span>
            )}
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold font-['Hind_Siliguri'] leading-tight text-stone-950 border-b-2 border-stone-400 pb-2.5">
            {summary.headlineBn}
          </h2>
          <p className="text-xs sm:text-sm font-semibold text-stone-700 mt-1.5 italic">
            “{summary.subheadEn}” — চালক: {driverName}
          </p>

          {/* Key Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-4 tabular-nums">
            <div className="bg-stone-200/80 border border-stone-400 p-2.5 rounded">
              <div className="text-[10px] uppercase font-bold text-stone-600">
                Final National Loss
              </div>
              <div className="text-xl font-black text-rose-700 font-['JetBrains_Mono']">
                ৳ {summary.finalScore.toLocaleString()}
              </div>
            </div>
            <div className="bg-stone-200/80 border border-stone-400 p-2.5 rounded">
              <div className="text-[10px] uppercase font-bold text-stone-600">Distance Driven</div>
              <div className="text-xl font-black text-stone-900 font-['JetBrains_Mono']">
                {summary.distanceMeters} m
              </div>
            </div>
            <div className="bg-stone-200/80 border border-stone-400 p-2.5 rounded">
              <div className="text-[10px] uppercase font-bold text-stone-600">Total Collisions</div>
              <div className="text-xl font-black text-stone-900 font-['JetBrains_Mono']">
                {summary.totalCollisions}
              </div>
            </div>
            <div className="bg-stone-200/80 border border-stone-400 p-2.5 rounded">
              <div className="text-[10px] uppercase font-bold text-stone-600">Highest Combo</div>
              <div className="text-xl font-black text-amber-700 font-['JetBrains_Mono']">
                x{summary.highestCombo}
              </div>
            </div>
            <div className="bg-stone-200/80 border border-stone-400 p-2.5 rounded">
              <div className="text-[10px] uppercase font-bold text-stone-600">Battery Left</div>
              <div className="text-xl font-black text-emerald-700 font-['JetBrains_Mono']">
                {summary.batteryRemaining}%
              </div>
            </div>
            <div className="bg-stone-200/80 border border-stone-400 p-2.5 rounded">
              <div className="text-[10px] uppercase font-bold text-stone-600">Crowd Escapes</div>
              <div className="text-xl font-black text-sky-800 font-['JetBrains_Mono']">
                {summary.crowdEscapeCount}
              </div>
            </div>
          </div>

          <div className="mt-3 px-3 py-2 bg-emerald-900 text-amber-200 rounded flex items-center justify-between text-xs font-bold">
            <span className="font-['Hind_Siliguri']">ভাড়া ও বোনাস আয় (Earned Taka):</span>
            <span className="text-base font-['JetBrains_Mono']">+৳ {summary.takaEarned.toLocaleString()}</span>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-2.5 mt-4">
            <button
              onClick={onPlayAgain}
              className="py-3 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-sm flex items-center justify-center gap-1.5 shadow active:scale-95 transition-transform"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="font-['Hind_Siliguri']">আবার খেলুন</span>
            </button>
            <button
              onClick={onMainMenu}
              className="py-3 px-3 rounded-lg bg-stone-800 hover:bg-stone-700 text-white font-bold text-sm flex items-center justify-center gap-1.5 shadow active:scale-95 transition-transform"
            >
              <Home className="w-4 h-4" />
              <span className="font-['Hind_Siliguri']">মেইন মেনু</span>
            </button>
            <button
              onClick={handleShare}
              className="py-3 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm flex items-center justify-center gap-1.5 shadow active:scale-95 transition-transform"
            >
              {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
              <span className="font-['Hind_Siliguri']">{copied ? 'কপি হয়েছে!' : 'শেয়ার'}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
