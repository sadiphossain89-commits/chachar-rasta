export type GameMode = 'endless' | 'race' | 'free' | 'challenge';

export type CameraMode = 'close' | 'far' | 'driver';

export type GraphicsQuality = 'low' | 'medium' | 'high';

export type ScreenState =
  | 'menu'
  | 'garage'
  | 'playing'
  | 'paused'
  | 'gameover';

export type ModalType =
  | null
  | 'locations'
  | 'races'
  | 'daily'
  | 'leaderboard'
  | 'settings'
  | 'tutorial';

export interface DistrictInfo {
  id: string;
  nameBn: string;
  nameEn: string;
  description: string;
  spawnX: number;
  spawnZ: number;
  spawnYaw: number;
  accentColor: string;
  trafficDensity: number;
}

export interface RaceDefinition {
  id: string;
  titleBn: string;
  titleEn: string;
  startDistrictId: string;
  targetCheckpoints: number;
  timeLimitSec: number;
  rewardTaka: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

export interface GarageConfig {
  bodyColor: string;
  trimColor: string;
  ledColor: string;
  seatStyle: 'velvet_red' | 'emerald_gold' | 'marigold_floral' | 'tiger_print' | 'indigo_jamdani';
  hoodArt: 'shapla_lotus' | 'bengal_tiger' | 'peacock_plume' | 'rickshaw_mosaic';
  accessory: 'none' | 'garland_bells' | 'roof_rack' | 'chrome_mirrors';
  slogan: string;
  driverName: string;
}

export interface AudioSettings {
  masterMuted: boolean;
  motorMuted: boolean;
  hornMuted: boolean;
  voiceMuted: boolean;
  sfxMuted: boolean;
}

export interface GameSettings {
  graphics: GraphicsQuality;
  targetFps: 30 | 60;
  defaultCamera: CameraMode;
  renderDistance: number; // 120 to 260
  buttonScale: number; // 0.8 to 1.3
  buttonBottomOffset: number; // 0 to 48 px
  showTouchControls: 'auto' | 'always' | 'off';
  vibrationEnabled: boolean;
  audio: AudioSettings;
}

export interface DailyTask {
  id: string;
  tier: 'Easy' | 'Medium' | 'Hard';
  titleBn: string;
  titleEn: string;
  type: 'distance' | 'score' | 'boosts' | 'crashes' | 'escapes';
  target: number;
  progress: number;
  rewardTaka: number;
  claimed: boolean;
}

export interface LeaderboardEntry {
  id: string;
  driverName: string;
  district: string;
  score: number;
  distance: number;
  combo: number;
  dateIso: string;
  isPlayer?: boolean;
}

export interface PlayerProfile {
  driverName: string;
  taka: number;
  totalRuns: number;
  bestScore: number;
  bestDistance: number;
  unlockedColors: string[];
  dailyDateKey: string;
  dailyTasks: DailyTask[];
}

export type GameOverReason =
  | 'bus_crash'
  | 'truck_crash'
  | 'crowd_caught'
  | 'crowd_stopped'
  | 'battery_dead'
  | 'race_won'
  | 'race_timeout'
  | 'challenge_won';

export interface RunSummary {
  reason: GameOverReason;
  mode: GameMode;
  districtId: string;
  finalScore: number;
  distanceMeters: number;
  totalCollisions: number;
  highestCombo: number;
  batteryRemaining: number;
  crowdEscapeCount: number;
  takaEarned: number;
  isNewBest: boolean;
  headlineBn: string;
  subheadEn: string;
  elapsedSeconds: number;
}

export interface MinimapBlip {
  x: number;
  z: number;
  type: 'charger' | 'police' | 'danger' | 'target' | 'checkpoint' | 'crowd';
}

export interface HudSnapshot {
  score: number;
  combo: number;
  comboTimerRatio: number;
  speedKmh: number;
  battery: number;
  isCharging: boolean;
  isBoosting: boolean;
  distanceMeters: number;
  collisions: number;
  highestCombo: number;
  chasingCount: number;
  clungCount: number;
  crowdEscapeCount: number;
  nearestChargerDist: number;
  nearestChargerAngle: number; // relative to player heading
  policeDist: number | null;
  policeAngle: number | null;
  policeActive: boolean;
  policeSettlingProgress: number; // 0..1 when stopped inside police box
  playerX: number;
  playerZ: number;
  playerYaw: number;
  cameraMode: CameraMode;
  districtNameBn: string;
  districtNameEn: string;
  raceTimeRemaining: number | null;
  raceCheckpointsDone: number;
  raceCheckpointsTotal: number;
  challengeProgress: number;
  challengeTarget: number;
  minimapBlips: MinimapBlip[];
}

export interface FloatingPopup {
  id: number;
  text: string;
  subtext?: string;
  x: number; // screen px
  y: number; // screen px
  color: string;
  createdAt: number;
}

export interface DialogueToast {
  id: number;
  speakerBn: string;
  lineBn: string;
  lineEn: string;
  tone: 'voice' | 'police' | 'crowd' | 'charge';
}

export const DISTRICTS: DistrictInfo[] = [
  {
    id: 'shahbag',
    nameBn: 'শাহবাগ মোড়',
    nameEn: 'Shahbag Junction',
    description: 'Iconic roundabout intersection packed with buses, CNGs, footpaths, and street stalls.',
    spawnX: 0,
    spawnZ: 0,
    spawnYaw: 0,
    accentColor: '#f59e0b',
    trafficDensity: 1.0,
  },
  {
    id: 'old_dhaka',
    nameBn: 'পুরান ঢাকা বাজার',
    nameEn: 'Old Dhaka Market',
    description: 'Tight chaotic bazaar lanes, rickshaws, tea stalls, and sudden crowd chases.',
    spawnX: -120,
    spawnZ: -120,
    spawnYaw: Math.PI * 0.5,
    accentColor: '#ec4899',
    trafficDensity: 1.2,
  },
  {
    id: 'motijheel',
    nameBn: 'মতিঝিল বাণিজ্যিক এলাকা',
    nameEn: 'Motijheel Business Hub',
    description: 'High-rise towers, corporate private cars, and heavy commuter buses.',
    spawnX: 120,
    spawnZ: -120,
    spawnYaw: Math.PI,
    accentColor: '#06b6d4',
    trafficDensity: 1.1,
  },
  {
    id: 'mirpur',
    nameBn: 'মিরপুর আবাসিক',
    nameEn: 'Mirpur Residential',
    description: 'Neighborhood streets, pickup vans, Easy Bikes, and roadside fruit carts.',
    spawnX: -120,
    spawnZ: 0,
    spawnYaw: 0,
    accentColor: '#10b981',
    trafficDensity: 0.9,
  },
  {
    id: 'uttara',
    nameBn: 'উত্তরা হাইওয়ে',
    nameEn: 'Uttara Highway',
    description: 'High-speed boulevard ideal for boost runs—watch out for speeding trucks!',
    spawnX: 0,
    spawnZ: -120,
    spawnYaw: -Math.PI * 0.5,
    accentColor: '#3b82f6',
    trafficDensity: 1.0,
  },
  {
    id: 'gulistan',
    nameBn: 'গুলিস্তান মার্কেট',
    nameEn: 'Gulistan Market',
    description: 'Bustling transit hub with dense foot traffic and prime destructible stalls.',
    spawnX: 120,
    spawnZ: 0,
    spawnYaw: Math.PI,
    accentColor: '#f97316',
    trafficDensity: 1.25,
  },
  {
    id: 'jatrabari',
    nameBn: 'যাত্রাবাড়ী মোড়',
    nameEn: 'Jatrabari Crossing',
    description: 'Southern freight gateway heavy with decorated cargo trucks and intercity buses.',
    spawnX: 120,
    spawnZ: 120,
    spawnYaw: Math.PI * 0.5,
    accentColor: '#ef4444',
    trafficDensity: 1.15,
  },
  {
    id: 'metro',
    nameBn: 'মেট্রো রেল লাইন',
    nameEn: 'Metro Rail Corridor',
    description: 'Elevated MRT viaduct overhead with modern stations and electric charging hubs.',
    spawnX: 0,
    spawnZ: 120,
    spawnYaw: 0,
    accentColor: '#22c55e',
    trafficDensity: 1.0,
  },
  {
    id: 'bridge',
    nameBn: 'বুড়িগঙ্গা সেতু',
    nameEn: 'Buriganga River Bridge',
    description: 'Scenic steel-arch river crossing where narrow lanes make every overtake thrilling.',
    spawnX: -120,
    spawnZ: 120,
    spawnYaw: -Math.PI * 0.5,
    accentColor: '#14b8a6',
    trafficDensity: 0.95,
  },
];

export const RACES: RaceDefinition[] = [
  {
    id: 'shahbag_dash',
    titleBn: 'শাহবাগ স্প্রিন্ট',
    titleEn: 'Shahbag Crossing Dash',
    startDistrictId: 'shahbag',
    targetCheckpoints: 6,
    timeLimitSec: 75,
    rewardTaka: 1500,
    difficulty: 'Easy',
  },
  {
    id: 'metro_express',
    titleBn: 'মেট্রো এক্সপ্রেস চ্যালেঞ্জ',
    titleEn: 'Metro Corridor Express',
    startDistrictId: 'metro',
    targetCheckpoints: 8,
    timeLimitSec: 85,
    rewardTaka: 2400,
    difficulty: 'Medium',
  },
  {
    id: 'dhaka_grand_loop',
    titleBn: 'পুরান ঢাকা থেকে উত্তরা',
    titleEn: 'Grand Dhaka Chaos GP',
    startDistrictId: 'old_dhaka',
    targetCheckpoints: 10,
    timeLimitSec: 95,
    rewardTaka: 3800,
    difficulty: 'Hard',
  },
];

export const SLOGAN_PRESETS = [
  'মায়ের দোয়া',
  'আস্তে চালাও বন্ধু',
  'হর্ন দিন সাইড নিন',
  'ঢাকা এক্সপ্রেস',
  'আল্লাহ ভরসা',
  'চলো পাল্টাই',
];

export const SOUND_BOMB_LINES: Array<{ bn: string; en: string }> = [
  { bn: 'আরে মামা, রাস্তা কি বাপের নাকি?! সাইড দে!', en: 'Hey uncle, is this your dad’s road?! Make way!' },
  { bn: 'ব্রেক ফেল! সরে দাঁড়াও, ইজি বাইক আসছে!', en: 'Brakes failing! Step aside, Easy Bike incoming!' },
  { bn: 'হর্ন দিলাম, এখন দায়িত্ব আপনার!', en: 'I honked—what happens next is on you!' },
  { bn: 'চায়ের কাপ সামলাও, তুফান যাচ্ছে!', en: 'Hold your tea cups, a storm is passing through!' },
  { bn: 'জ্যাম ছুটাইতে আসছি, রাস্তা খালি কর!', en: 'Here to clear the jam—open up the lane!' },
];

export const POLICE_SETTLEMENT_LINES: Array<{ bn: string; en: string }> = [
  { bn: 'ভাই, মামলার ঝামেলায় যাবেন না—৫০০ টাকায় ফয়সালা!', en: 'Brother, skip the court case—500 Taka settles it!' },
  { bn: 'কাগজপত্র তো নাই দেখতেছি... আচ্ছা, চা-নাস্তা দিয়ে যান!', en: 'No papers in sight... alright, leave some tea-snack money!' },
  { bn: 'পাবলিক ক্ষেপছে! তাড়াতাড়ি হিসাব মিটাইয়া ভাগেন!', en: 'The crowd is furious! Settle up quick and roll out!' },
];
