import {
  DailyTask,
  GameSettings,
  GarageConfig,
  LeaderboardEntry,
  PlayerProfile,
} from './types';

const STORAGE_KEYS = {
  PROFILE: 'dhaka_chaos_profile_v1',
  GARAGE: 'dhaka_chaos_garage_v1',
  SETTINGS: 'dhaka_chaos_settings_v1',
  LEADERBOARD: 'dhaka_chaos_leaderboard_v1',
};

/**
 * Returns current date string in Bangladesh Standard Time (UTC+6).
 */
export function getBangladeshDateKey(): string {
  const now = new Date();
  const bdMillis = now.getTime() + 6 * 60 * 60 * 1000;
  const bdDate = new Date(bdMillis);
  return bdDate.toISOString().slice(0, 10);
}

export function getTimeUntilBangladeshMidnight(): string {
  const now = new Date();
  const bdMillis = now.getTime() + 6 * 60 * 60 * 1000;
  const bdDate = new Date(bdMillis);
  const hoursLeft = 23 - bdDate.getUTCHours();
  const minsLeft = 59 - bdDate.getUTCMinutes();
  return `${hoursLeft}h ${minsLeft}m`;
}

function generateDailyTasks(dateKey: string): DailyTask[] {
  // Deterministic seed from dateKey so tasks vary per BD day
  let seed = 0;
  for (let i = 0; i < dateKey.length; i++) {
    seed = (seed * 31 + dateKey.charCodeAt(i)) >>> 0;
  }
  const pick = (n: number) => seed % n;

  const easyPool: Omit<DailyTask, 'progress' | 'claimed'>[] = [
    {
      id: 'easy_dist',
      tier: 'Easy',
      titleBn: '৫০০ মিটার রাস্তা চালান',
      titleEn: 'Drive 500m through Dhaka',
      type: 'distance',
      target: 500,
      rewardTaka: 400,
    },
    {
      id: 'easy_boost',
      tier: 'Easy',
      titleBn: '৫ বার ইলেকট্রিক বুস্ট ব্যবহার করুন',
      titleEn: 'Use Electric Boost 5 times',
      type: 'boosts',
      target: 5,
      rewardTaka: 450,
    },
  ];

  const medPool: Omit<DailyTask, 'progress' | 'claimed'>[] = [
    {
      id: 'med_crashes',
      tier: 'Medium',
      titleBn: '১২টি টার্গেট ধাক্কা দিন',
      titleEn: 'Smash 12 arcade targets',
      type: 'crashes',
      target: 12,
      rewardTaka: 850,
    },
    {
      id: 'med_score',
      tier: 'Medium',
      titleBn: 'এক রানে ১২,০০০ ন্যাশনাল লস করুন',
      titleEn: 'Reach 12,000 National Loss in runs',
      type: 'score',
      target: 12000,
      rewardTaka: 950,
    },
  ];

  const hardPool: Omit<DailyTask, 'progress' | 'claimed'>[] = [
    {
      id: 'hard_escapes',
      tier: 'Hard',
      titleBn: '৫ জন ক্ষিপ্ত জনতাকে ঝেড়ে ফেলুন',
      titleEn: 'Shake off 5 chasing crowd NPCs',
      type: 'escapes',
      target: 5,
      rewardTaka: 1600,
    },
    {
      id: 'hard_score',
      tier: 'Hard',
      titleBn: 'মোট ৩০,০০০ ন্যাশনাল লস সংগ্রহ করুন',
      titleEn: 'Accumulate 30,000 National Loss',
      type: 'score',
      target: 30000,
      rewardTaka: 1800,
    },
  ];

  const e = easyPool[pick(easyPool.length)];
  const m = medPool[(pick(medPool.length) + 1) % medPool.length];
  const h = hardPool[pick(hardPool.length)];

  return [
    { ...e, progress: 0, claimed: false },
    { ...m, progress: 0, claimed: false },
    { ...h, progress: 0, claimed: false },
  ];
}

export const DEFAULT_GARAGE: GarageConfig = {
  bodyColor: '#00a86b', // Iconic Dhaka emerald green
  trimColor: '#fbbf24', // Marigold yellow
  ledColor: '#22d3ee', // Electric cyan
  seatStyle: 'velvet_red',
  hoodArt: 'shapla_lotus',
  accessory: 'garland_bells',
  slogan: 'মায়ের দোয়া',
  driverName: 'রহিম মামা',
};

export const DEFAULT_SETTINGS: GameSettings = {
  graphics: 'medium',
  targetFps: 60,
  defaultCamera: 'close',
  renderDistance: 180,
  buttonScale: 1.0,
  buttonBottomOffset: 12,
  showTouchControls: 'always',
  vibrationEnabled: true,
  audio: {
    masterMuted: false,
    motorMuted: false,
    hornMuted: false,
    voiceMuted: false,
    sfxMuted: false,
  },
};

export function loadProfile(): PlayerProfile {
  const todayKey = getBangladeshDateKey();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (raw) {
      const parsed = JSON.parse(raw) as PlayerProfile;
      if (parsed.dailyDateKey !== todayKey) {
        parsed.dailyDateKey = todayKey;
        parsed.dailyTasks = generateDailyTasks(todayKey);
      }
      return parsed;
    }
  } catch {
    // ignore corrupt storage
  }
  const fresh: PlayerProfile = {
    driverName: 'রহিম মামা',
    taka: 2500,
    totalRuns: 0,
    bestScore: 0,
    bestDistance: 0,
    unlockedColors: ['#00a86b', '#e11d48', '#f59e0b', '#0284c7', '#7c3aed', '#16a34a'],
    dailyDateKey: todayKey,
    dailyTasks: generateDailyTasks(todayKey),
  };
  saveProfile(fresh);
  return fresh;
}

export function saveProfile(profile: PlayerProfile): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  } catch {
    // ignore quota errors
  }
}

export function loadGarage(): GarageConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.GARAGE);
    if (raw) return { ...DEFAULT_GARAGE, ...JSON.parse(raw) };
  } catch {
    // ignore
  }
  return { ...DEFAULT_GARAGE };
}

export function saveGarage(config: GarageConfig): void {
  try {
    localStorage.setItem(STORAGE_KEYS.GARAGE, JSON.stringify(config));
  } catch {
    // ignore
  }
}

export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        audio: { ...DEFAULT_SETTINGS.audio, ...(parsed.audio || {}) },
      };
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(settings: GameSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

const SEED_LEADERBOARD: LeaderboardEntry[] = [
  {
    id: 'seed-1',
    driverName: 'বজলু বস',
    district: 'শাহবাগ মোড়',
    score: 28400,
    distance: 2150,
    combo: 8,
    dateIso: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: 'seed-2',
    driverName: 'কামাল ভাই',
    district: 'পুরান ঢাকা বাজার',
    score: 21950,
    distance: 1740,
    combo: 6,
    dateIso: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'seed-3',
    driverName: 'সোহেল এক্সপ্রেস',
    district: 'গুলিস্তান মার্কেট',
    score: 16800,
    distance: 1320,
    combo: 5,
    dateIso: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
  {
    id: 'seed-4',
    driverName: 'বাবুল মামা',
    district: 'মেট্রো রেল লাইন',
    score: 12400,
    distance: 980,
    combo: 4,
    dateIso: new Date(Date.now() - 86400000 * 12).toISOString(),
  },
  {
    id: 'seed-5',
    driverName: 'জামাল তুফান',
    district: 'উত্তরা হাইওয়ে',
    score: 9100,
    distance: 840,
    combo: 3,
    dateIso: new Date(Date.now() - 86400000 * 18).toISOString(),
  },
];

export function loadLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LEADERBOARD);
    if (raw) {
      const parsed = JSON.parse(raw) as LeaderboardEntry[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  return [...SEED_LEADERBOARD];
}

export function recordLeaderboardRun(entry: Omit<LeaderboardEntry, 'id' | 'dateIso'>): LeaderboardEntry[] {
  const existing = loadLeaderboard();
  const next: LeaderboardEntry[] = [
    ...existing,
    {
      ...entry,
      id: `run-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      dateIso: new Date().toISOString(),
      isPlayer: true,
    },
  ]
    .sort((a, b) => b.score - a.score)
    .slice(0, 30);

  try {
    localStorage.setItem(STORAGE_KEYS.LEADERBOARD, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}
