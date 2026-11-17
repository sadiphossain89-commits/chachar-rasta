import React, { useState } from 'react';
import { ArrowLeft, Check, Palette, Sparkles } from 'lucide-react';
import { GarageConfig, SLOGAN_PRESETS } from '../game/types';

interface GarageOverlayProps {
  config: GarageConfig;
  taka: number;
  onChange: (next: GarageConfig) => void;
  onBack: () => void;
}

const BODY_PAINTS = [
  { name: 'Dhaka Emerald', hex: '#00a86b' },
  { name: 'Rickshaw Crimson', hex: '#e11d48' },
  { name: 'Marigold Gold', hex: '#f59e0b' },
  { name: 'Padma Sky', hex: '#0284c7' },
  { name: 'Jamuna Violet', hex: '#7c3aed' },
  { name: 'Bengal Mint', hex: '#16a34a' },
];

const LED_COLORS = [
  { name: 'Cyan', hex: '#22d3ee' },
  { name: 'Hot Pink', hex: '#ec4899' },
  { name: 'Emerald', hex: '#4ade80' },
  { name: 'Gold', hex: '#facc15' },
  { name: 'Crimson', hex: '#fb7185' },
];

const SEAT_STYLES: Array<{ id: GarageConfig['seatStyle']; label: string }> = [
  { id: 'velvet_red', label: 'Velvet Red' },
  { id: 'emerald_gold', label: 'Emerald Gold' },
  { id: 'marigold_floral', label: 'Marigold Floral' },
  { id: 'tiger_print', label: 'Bengal Tiger' },
  { id: 'indigo_jamdani', label: 'Indigo Jamdani' },
];

const HOOD_ARTS: Array<{ id: GarageConfig['hoodArt']; label: string }> = [
  { id: 'shapla_lotus', label: 'শাপলা পদ্ম (Lotus)' },
  { id: 'bengal_tiger', label: 'রয়্যাল টাইগার' },
  { id: 'peacock_plume', label: 'ময়ূর পাখা (Peacock)' },
  { id: 'rickshaw_mosaic', label: 'রিকশা আর্ট' },
];

const ACCESSORIES: Array<{ id: GarageConfig['accessory']; label: string }> = [
  { id: 'garland_bells', label: 'ফুলের মালা (Garland)' },
  { id: 'roof_rack', label: 'ছাদের ক্যারিয়ার (Rack)' },
  { id: 'chrome_mirrors', label: 'সাইড মিরর (Mirrors)' },
  { id: 'none', label: 'সিম্পল (Clean)' },
];

export const GarageOverlay: React.FC<GarageOverlayProps> = ({
  config,
  taka,
  onChange,
  onBack,
}) => {
  const [tab, setTab] = useState<'paint' | 'decor' | 'board'>('paint');

  const update = (patch: Partial<GarageConfig>) => {
    onChange({ ...config, ...patch });
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-30 flex flex-col justify-between p-4">
      {/* Top Bar */}
      <div className="flex items-center justify-between pointer-events-auto">
        <button
          onClick={onBack}
          className="px-4 py-2.5 rounded-xl border border-slate-600 text-white font-bold text-sm flex items-center gap-2 hover:border-amber-400 active:scale-95"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.9)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="font-['Hind_Siliguri']">মেইন মেনু</span>
        </button>

        <div
          className="px-4 py-2 rounded-xl border border-amber-400/50 text-center"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.9)' }}
        >
          <div className="text-sm font-bold text-amber-300 font-['Hind_Siliguri']">
            গ্যারেজ শোরুম • ইজি বাইক কাস্টমাইজেশন
          </div>
          <div className="text-[11px] text-slate-300">
            Drag anywhere to rotate · Scroll to zoom · Cosmetic only (Fair Play)
          </div>
        </div>

        <div
          className="px-4 py-2 rounded-xl border border-emerald-400/50 text-emerald-300 font-bold text-sm tabular-nums font-['JetBrains_Mono']"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.9)' }}
        >
          ৳ {taka.toLocaleString()}
        </div>
      </div>

      {/* Bottom Dock (keeps center 3D showroom 100% clear) */}
      <div
        className="w-full max-w-4xl mx-auto rounded-2xl border border-amber-400/40 p-3.5 pointer-events-auto shadow-2xl"
        style={{ backgroundColor: 'rgba(15, 23, 42, 0.92)' }}
      >
        <div className="flex items-center justify-between gap-2 mb-3 border-b border-slate-700 pb-2">
          <div className="flex gap-2">
            <button
              onClick={() => setTab('paint')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
                tab === 'paint'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              Paint & LED
            </button>
            <button
              onClick={() => setTab('decor')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
                tab === 'decor'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Hood Art, Seats & Gear
            </button>
            <button
              onClick={() => setTab('board')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold ${
                tab === 'board'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Slogan & Driver Board
            </button>
          </div>
          <button
            onClick={onBack}
            className="px-4 py-1.5 rounded-lg bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center gap-1 active:scale-95"
          >
            <Check className="w-3.5 h-3.5" />
            Save & Exit
          </button>
        </div>

        {tab === 'paint' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="text-[11px] font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                Body Paint (বডি কালার)
              </div>
              <div className="flex flex-wrap gap-2">
                {BODY_PAINTS.map((p) => (
                  <button
                    key={p.hex}
                    onClick={() => update({ bodyColor: p.hex })}
                    className={`w-9 h-9 rounded-lg border-2 transition-transform active:scale-90 ${
                      config.bodyColor === p.hex ? 'border-white scale-110' : 'border-slate-600'
                    }`}
                    style={{ backgroundColor: p.hex }}
                    title={p.name}
                  />
                ))}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                LED Underglow & Trim (এলইডি লাইট)
              </div>
              <div className="flex flex-wrap gap-2">
                {LED_COLORS.map((l) => (
                  <button
                    key={l.hex}
                    onClick={() => update({ ledColor: l.hex })}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 ${
                      config.ledColor === l.hex
                        ? 'border-white bg-slate-700 text-white'
                        : 'border-slate-600 bg-slate-800 text-slate-300'
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: l.hex }}
                    />
                    {l.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'decor' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <div className="text-[11px] font-bold text-slate-300 mb-1.5">Hood Artwork</div>
              <div className="flex flex-wrap gap-1.5">
                {HOOD_ARTS.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => update({ hoodArt: h.id })}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border font-['Hind_Siliguri'] ${
                      config.hoodArt === h.id
                        ? 'bg-pink-600 border-pink-300 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-300'
                    }`}
                  >
                    {h.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-300 mb-1.5">Seat Decoration</div>
              <div className="flex flex-wrap gap-1.5">
                {SEAT_STYLES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => update({ seatStyle: s.id })}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border ${
                      config.seatStyle === s.id
                        ? 'bg-amber-500 border-amber-200 text-slate-950'
                        : 'bg-slate-800 border-slate-700 text-slate-300'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-300 mb-1.5">Accessories</div>
              <div className="flex flex-wrap gap-1.5">
                {ACCESSORIES.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => update({ accessory: a.id })}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border font-['Hind_Siliguri'] ${
                      config.accessory === a.id
                        ? 'bg-cyan-600 border-cyan-300 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-300'
                    }`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'board' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="text-[11px] font-bold text-slate-300 mb-1.5">
                Rear Bengali Slogan (পেছনের স্লোগান)
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {SLOGAN_PRESETS.map((sl) => (
                  <button
                    key={sl}
                    onClick={() => update({ slogan: sl })}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border font-['Hind_Siliguri'] ${
                      config.slogan === sl
                        ? 'bg-rose-600 border-rose-300 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-300'
                    }`}
                  >
                    {sl}
                  </button>
                ))}
              </div>
              <input
                type="text"
                maxLength={22}
                value={config.slogan}
                onChange={(e) => update({ slogan: e.target.value })}
                placeholder="Custom Bengali/English slogan..."
                className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-600 text-sm text-white font-['Hind_Siliguri']"
              />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-300 mb-1.5">
                Driver Name on Rear Board (চালকের নাম)
              </div>
              <input
                type="text"
                maxLength={18}
                value={config.driverName}
                onChange={(e) => update({ driverName: e.target.value })}
                placeholder="Enter driver name..."
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-sm text-white font-['Hind_Siliguri']"
              />
              <div className="text-[11px] text-slate-400 mt-1.5">
                Rotate the Easy Bike in the 3D view above to inspect your rear nameplate!
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
