import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { DhakaAudioEngine } from './audio';
import {
  createCrowdNpcModel,
  createEasyBikeModel,
  createTrafficVehicleModel,
  CrowdNpcHandle,
  EasyBikeHandle,
  TrafficKind,
} from './models';
import { createContactShadowTexture } from './textures';
import {
  CameraMode,
  DISTRICTS,
  FloatingPopup,
  GameMode,
  GameOverReason,
  GameSettings,
  GarageConfig,
  HudSnapshot,
  MinimapBlip,
  POLICE_SETTLEMENT_LINES,
  RACES,
  RunSummary,
  SOUND_BOMB_LINES,
  DialogueToast,
} from './types';
import { buildDhakaWorld, DhakaWorld } from './world';

// Module-scope scratch math objects (zero GC in 60fps loop)
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _camTarget = new THREE.Vector3();
const _camDesired = new THREE.Vector3();
const _projVec = new THREE.Vector3();

interface TrafficAgent {
  id: number;
  kind: TrafficKind;
  group: THREE.Group;
  wheels: THREE.Object3D[];
  x: number;
  y: number;
  z: number;
  axis: 'x' | 'z';
  dir: 1 | -1;
  laneCoord: number;
  speed: number;
  baseSpeed: number;
  radius: number;
  points: number;
  isDangerous: boolean;
  smashed: boolean;
  smashTimer: number;
  vx: number;
  vy: number;
  vz: number;
  spinX: number;
  spinY: number;
  swerveOffset: number;
  swerveTimer: number;
}

interface CrowdAgent {
  id: number;
  handle: CrowdNpcHandle;
  x: number;
  y: number;
  z: number;
  speed: number;
  state: 'chasing' | 'clinging' | 'shaken';
  clingSlot: number; // 0, 1, 2
  grip: number; // 1.0 -> 0.0 when shaken off
  beatTimer: number;
  life: number;
  runPhase: number;
  vx: number;
  vy: number;
  vz: number;
}

interface PedestrianAgent {
  id: number;
  handle: CrowdNpcHandle;
  loopIdx: number;
  edge: 0 | 1 | 2 | 3; // 0: +X top, 1: +Z right, 2: -X bottom, 3: -Z left
  x: number;
  y: number;
  z: number;
  yaw: number;
  speed: number;
  walkPhase: number;
  state: 'walking' | 'knocked';
  knockTimer: number;
  vx: number;
  vy: number;
  vz: number;
  spinX: number;
  dodgeTimer: number;
}

interface Particle {
  mesh: THREE.Mesh;
  active: boolean;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
}

export interface ControlState {
  left: boolean;
  right: boolean;
  drive: boolean;
  brake: boolean;
  boost: boolean;
}

export interface EngineCallbacks {
  onHudUpdate: (hud: HudSnapshot) => void;
  onPopup: (popup: FloatingPopup) => void;
  onToast: (toast: DialogueToast) => void;
  onGameOver: (summary: RunSummary) => void;
  onPoliceSettlementFee: (fee: number) => void;
  onPauseToggle: () => void;
  onTaskProgress: (delta: {
    distance?: number;
    score?: number;
    boosts?: number;
    crashes?: number;
    escapes?: number;
  }) => void;
}

export class DhakaGameEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private world: DhakaWorld;
  private easyBike: EasyBikeHandle;
  private audio: DhakaAudioEngine;
  private callbacks: EngineCallbacks;
  private isSoftwareGl: boolean;
  private maxAnisotropy: number;
  private shadowTex: THREE.Texture;

  private sunLight: THREE.DirectionalLight;
  private chargeCableLine: THREE.Line;
  private chargeCableMat: THREE.LineBasicMaterial;

  // Game loop state
  private frameId = 0;
  private disposed = false;
  private lastTime = performance.now();
  private hudTimer = 0;
  private hitstopTimer = 0;
  private frameAccumulator = 0;

  // Mode & Config
  private sceneMode: 'menu' | 'garage' | 'playing' | 'paused' | 'gameover' = 'menu';
  private gameMode: GameMode = 'endless';
  private districtId = 'shahbag';
  private raceId = RACES[0].id;
  private settings: GameSettings;
  private garageConfig: GarageConfig;
  private cameraMode: CameraMode = 'close';

  // Player Physics
  private playerX = 0;
  private playerY = 0;
  private playerZ = 0;
  private playerYaw = 0;
  private speed = 0;
  private steerAngle = 0;
  private bodyRoll = 0;
  private bodyPitch = 0;
  private battery = 100;
  private condition = 1.0; // degrades slightly on minor hits, affects drain slightly
  private shakeIntensity = 0;
  private boostVisualTimer = 0;

  // Garage Orbit State
  private garageYaw = 0.65;
  private garagePitch = 0.25;
  private garageDist = 5.2;
  private isDraggingGarage = false;
  private lastPointerX = 0;
  private lastPointerY = 0;

  // Run Stats
  private score = 0;
  private combo = 0;
  private comboTimer = 0;
  private highestCombo = 0;
  private collisions = 0;
  private distanceMeters = 0;
  private crowdEscapeCount = 0;
  private elapsedSeconds = 0;
  private chargeSoundTimer = 0;
  private policeSettleTimer = 0;
  private stoppedClungTimer = 0;
  private soundBombCooldown = 0;
  private hornCooldown = 0;
  private popupSeq = 1;
  private toastSeq = 1;
  private prevBoostHeld = false;

  // Race & Challenge state
  private raceTimeRemaining: number | null = null;
  private raceCheckpointsDone = 0;
  private raceCheckpointsTotal = 6;
  private checkpointX = 0;
  private checkpointZ = -80;
  private challengeTarget = 12000;

  // Dynamic Entities
  private traffic: TrafficAgent[] = [];
  private crowd: CrowdAgent[] = [];
  private pedestrians: PedestrianAgent[] = [];
  private particles: Particle[] = [];
  private nextCrowdId = 1;

  // Input state
  private touchControls: ControlState = {
    left: false,
    right: false,
    drive: false,
    brake: false,
    boost: false,
  };
  private keyControls: ControlState = {
    left: false,
    right: false,
    drive: false,
    brake: false,
    boost: false,
  };

  constructor(
    container: HTMLElement,
    garageConfig: GarageConfig,
    settings: GameSettings,
    callbacks: EngineCallbacks,
  ) {
    this.container = container;
    this.garageConfig = { ...garageConfig };
    this.settings = { ...settings };
    this.cameraMode = settings.defaultCamera;
    this.callbacks = callbacks;
    this.audio = new DhakaAudioEngine(settings.audio);

    // 1. Detect Software WebGL (SwiftShader / llvmpipe / WARP)
    this.isSoftwareGl = (() => {
      try {
        const probe = document.createElement('canvas').getContext('webgl2');
        if (!probe) return true;
        const ext = probe.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
        const gpu = String(probe.getParameter(param));
        probe.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    // 2. Renderer Configuration
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl && settings.graphics !== 'low',
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    this.applyGraphicsSettings();

    this.maxAnisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    container.appendChild(this.renderer.domElement);

    // 3. Scene, Sky, Horizon-Matched Fog & Studio RoomEnvironment
    this.scene = new THREE.Scene();
    const skyColor = new THREE.Color(0x9bd4ee);
    this.scene.background = skyColor;
    this.scene.fog = new THREE.Fog(skyColor, 75, settings.renderDistance + 55);

    if (!this.isSoftwareGl) {
      const pmrem = new THREE.PMREMGenerator(this.renderer);
      this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      pmrem.dispose();
    }

    // 4. Camera
    const aspect = (container.clientWidth || window.innerWidth) / (container.clientHeight || window.innerHeight);
    this.camera = new THREE.PerspectiveCamera(62, aspect, 0.15, this.isSoftwareGl ? 240 : 420);

    // 5. Warm Key Sun + Cool Hemisphere Fill
    const hemi = new THREE.HemisphereLight(0xdbeafe, 0x475569, this.isSoftwareGl ? 1.15 : 0.72);
    this.scene.add(hemi);

    this.sunLight = new THREE.DirectionalLight(0xfff1d6, 1.55);
    this.sunLight.position.set(45, 72, 35);
    this.sunLight.castShadow = !this.isSoftwareGl && settings.graphics !== 'low';
    this.sunLight.shadow.mapSize.set(1024, 1024);
    this.sunLight.shadow.camera.near = 5;
    this.sunLight.shadow.camera.far = 180;
    const d = 48;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    // 6. World, Player Easy Bike, Traffic & Particles
    this.shadowTex = createContactShadowTexture();
    this.world = buildDhakaWorld(this.maxAnisotropy, this.shadowTex);
    this.scene.add(this.world.root);

    this.easyBike = createEasyBikeModel(this.garageConfig, this.maxAnisotropy, this.shadowTex);
    this.scene.add(this.easyBike.root);

    // Charging Cable Line (hidden until docked)
    const cableGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(),
      new THREE.Vector3(),
      new THREE.Vector3(),
    ]);
    this.chargeCableMat = new THREE.LineBasicMaterial({ color: 0xfacc15, linewidth: 2 });
    this.chargeCableLine = new THREE.Line(cableGeo, this.chargeCableMat);
    this.chargeCableLine.visible = false;
    this.scene.add(this.chargeCableLine);

    this.spawnInitialTraffic();
    this.spawnInitialPedestrians();
    this.initParticlePool();

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    // Place Easy Bike nicely at Shahbag for menu showcase
    this.positionPlayerAtDistrict('shahbag');
    this.bindEvents();
    this.startLoop();
  }

  private applyGraphicsSettings(): void {
    const g = this.settings.graphics;
    if (this.isSoftwareGl) {
      this.renderer.setPixelRatio(1);
      this.renderer.shadowMap.enabled = false;
    } else {
      const maxDpr = g === 'high' ? 2 : g === 'medium' ? 1.5 : 1;
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
      this.renderer.shadowMap.enabled = g !== 'low';
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    if (this.scene?.fog instanceof THREE.Fog) {
      this.scene.fog.near = Math.max(45, this.settings.renderDistance * 0.42);
      this.scene.fog.far = this.settings.renderDistance + 55;
    }
    if (this.sunLight) {
      this.sunLight.castShadow = !this.isSoftwareGl && g !== 'low';
    }
  }

  private initParticlePool(): void {
    const geo = new THREE.BoxGeometry(0.22, 0.22, 0.22);
    for (let i = 0; i < 85; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.particles.push({
        mesh,
        active: false,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 0.5,
      });
    }
  }

  private spawnParticles(x: number, y: number, z: number, colorHex: number, count: number, speedScale = 1): void {
    let spawned = 0;
    for (let i = 0; i < this.particles.length && spawned < count; i++) {
      const p = this.particles[i];
      if (!p.active) {
        p.active = true;
        p.life = 0;
        p.maxLife = 0.35 + Math.random() * 0.35;
        p.vx = (Math.random() - 0.5) * 9 * speedScale;
        p.vy = (2 + Math.random() * 5) * speedScale;
        p.vz = (Math.random() - 0.5) * 9 * speedScale;
        p.mesh.position.set(x, y, z);
        p.mesh.scale.setScalar(1);
        (p.mesh.material as THREE.MeshBasicMaterial).color.setHex(colorHex);
        p.mesh.visible = true;
        spawned++;
      }
    }
  }

  private spawnInitialTraffic(): void {
    const kindPool: TrafficKind[] = [
      'car',
      'cng',
      'rickshaw',
      'moto',
      'easybike',
      'pickup',
      'car',
      'cng',
      'bus',
      'truck',
    ];
    const pointMap: Record<TrafficKind, number> = {
      bus: 0,
      truck: 0,
      car: 800,
      pickup: 700,
      cng: 600,
      easybike: 550,
      moto: 500,
      rickshaw: 450,
    };
    const radiusMap: Record<TrafficKind, number> = {
      bus: 2.3,
      truck: 2.2,
      car: 1.5,
      pickup: 1.55,
      cng: 1.15,
      easybike: 1.15,
      moto: 0.85,
      rickshaw: 1.0,
    };
    const speedMap: Record<TrafficKind, number> = {
      bus: 12.5,
      truck: 11.5,
      car: 14.5,
      pickup: 13.0,
      cng: 11.5,
      easybike: 10.5,
      moto: 16.0,
      rickshaw: 6.5,
    };

    const lanes = this.world.roadLanes;
    for (let i = 0; i < 48; i++) {
      const kind = kindPool[i % kindPool.length];
      const lane = lanes[i % lanes.length];
      const visual = createTrafficVehicleModel(kind, this.shadowTex);
      this.scene.add(visual.group);

      const posAlong = -260 + ((i * 53) % 520);
      const x = lane.axis === 'z' ? lane.coord : posAlong;
      const z = lane.axis === 'x' ? lane.coord : posAlong;

      this.traffic.push({
        id: i + 1,
        kind,
        group: visual.group,
        wheels: visual.wheels,
        x,
        y: 0,
        z,
        axis: lane.axis,
        dir: lane.dir,
        laneCoord: lane.coord,
        speed: speedMap[kind],
        baseSpeed: speedMap[kind],
        radius: radiusMap[kind],
        points: pointMap[kind],
        isDangerous: kind === 'bus' || kind === 'truck',
        smashed: false,
        smashTimer: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        spinX: 0,
        spinY: 0,
        swerveOffset: 0,
        swerveTimer: 0,
      });
    }
  }

  private spawnInitialPedestrians(): void {
    const shirts = [0xf97316, 0x0284c7, 0xe11d48, 0x16a34a, 0x9333ea, 0xfacc15, 0xf8fafc];
    const lungis = [0x1e293b, 0x7c2d12, 0x312e81, 0x064e3b, 0x4c1d95];
    const loops = this.world.footpathLoops;
    if (loops.length === 0) return;

    for (let i = 0; i < 44; i++) {
      const loopIdx = i % loops.length;
      const loop = loops[loopIdx];
      const edge = (i % 4) as 0 | 1 | 2 | 3;
      const t = ((i * 19) % 100) / 100;
      let x = loop.minX;
      let z = loop.minZ;
      if (edge === 0) {
        x = THREE.MathUtils.lerp(loop.minX, loop.maxX, t);
        z = loop.minZ;
      } else if (edge === 1) {
        x = loop.maxX;
        z = THREE.MathUtils.lerp(loop.minZ, loop.maxZ, t);
      } else if (edge === 2) {
        x = THREE.MathUtils.lerp(loop.maxX, loop.minX, t);
        z = loop.maxZ;
      } else {
        x = loop.minX;
        z = THREE.MathUtils.lerp(loop.maxZ, loop.minZ, t);
      }

      const handle = createCrowdNpcModel(
        shirts[i % shirts.length],
        lungis[i % lungis.length],
        this.shadowTex,
        false,
      );
      handle.group.position.set(x, 0.24, z);
      this.scene.add(handle.group);

      this.pedestrians.push({
        id: i + 1,
        handle,
        loopIdx,
        edge,
        x,
        y: 0.24,
        z,
        yaw: 0,
        speed: 2.1 + (i % 4) * 0.45,
        walkPhase: Math.random() * 6,
        state: 'walking',
        knockTimer: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        spinX: 0,
        dodgeTimer: 0,
      });
    }
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);

    const dom = this.renderer.domElement;
    dom.addEventListener('pointerdown', this.handlePointerDown);
    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp);
    dom.addEventListener('wheel', this.handleWheel, { passive: true });
  }

  private handleResize = (): void => {
    if (this.disposed) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private handleBlur = (): void => {
    this.keyControls = { left: false, right: false, drive: false, brake: false, boost: false };
    this.touchControls = { left: false, right: false, drive: false, brake: false, boost: false };
    this.isDraggingGarage = false;
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    // Ignore typing inside input fields
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

    this.audio.ensureUnlocked();
    const code = e.code;
    if (code === 'KeyA' || code === 'ArrowLeft') this.keyControls.left = true;
    if (code === 'KeyD' || code === 'ArrowRight') this.keyControls.right = true;
    if (code === 'KeyW' || code === 'ArrowUp') this.keyControls.drive = true;
    if (code === 'KeyS' || code === 'ArrowDown') this.keyControls.brake = true;
    if (code === 'Space' || code === 'ShiftLeft' || code === 'ShiftRight') {
      if (this.sceneMode === 'playing') e.preventDefault();
      this.keyControls.boost = true;
    }
    if (code === 'KeyH' && this.sceneMode === 'playing') this.triggerHorn();
    if (code === 'KeyB' && this.sceneMode === 'playing') this.triggerSoundBomb();
    if (code === 'KeyC' && this.sceneMode === 'playing') this.cycleCamera();
    if (code === 'Escape' && (this.sceneMode === 'playing' || this.sceneMode === 'paused')) {
      this.callbacks.onPauseToggle();
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    const code = e.code;
    if (code === 'KeyA' || code === 'ArrowLeft') this.keyControls.left = false;
    if (code === 'KeyD' || code === 'ArrowRight') this.keyControls.right = false;
    if (code === 'KeyW' || code === 'ArrowUp') this.keyControls.drive = false;
    if (code === 'KeyS' || code === 'ArrowDown') this.keyControls.brake = false;
    if (code === 'Space' || code === 'ShiftLeft' || code === 'ShiftRight') this.keyControls.boost = false;
  };

  private handlePointerDown = (e: PointerEvent): void => {
    this.audio.ensureUnlocked();
    if (this.sceneMode === 'garage') {
      this.isDraggingGarage = true;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
    }
  };

  private handlePointerMove = (e: PointerEvent): void => {
    if (!this.isDraggingGarage || this.sceneMode !== 'garage') return;
    const dx = e.clientX - this.lastPointerX;
    const dy = e.clientY - this.lastPointerY;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
    this.garageYaw -= dx * 0.009;
    this.garagePitch = THREE.MathUtils.clamp(this.garagePitch + dy * 0.006, 0.08, 0.95);
  };

  private handlePointerUp = (): void => {
    this.isDraggingGarage = false;
  };

  private handleWheel = (e: WheelEvent): void => {
    if (this.sceneMode !== 'garage') return;
    this.garageDist = THREE.MathUtils.clamp(this.garageDist + e.deltaY * 0.004, 3.2, 8.2);
  };

  // Public API for React UI
  public setTouchControl(key: keyof ControlState, value: boolean): void {
    this.audio.ensureUnlocked();
    this.touchControls[key] = value;
  }

  public updateGarageConfig(cfg: GarageConfig): void {
    this.garageConfig = { ...cfg };
    this.easyBike.applyConfig(this.garageConfig, this.maxAnisotropy);
  }

  public updateSettings(next: GameSettings): void {
    this.settings = { ...next };
    this.audio.updateSettings(next.audio);
    this.applyGraphicsSettings();
  }

  public setSceneMode(mode: 'menu' | 'garage' | 'playing' | 'paused' | 'gameover'): void {
    this.sceneMode = mode;
    if (mode !== 'playing') {
      this.audio.updateMotor(0, false, false);
    }
    if (mode === 'garage') {
      this.positionPlayerAtDistrict('shahbag');
      this.garageYaw = 0.65;
      this.garagePitch = 0.25;
      this.garageDist = 5.0;
    }
  }

  public cycleCamera(): CameraMode {
    const order: CameraMode[] = ['close', 'far', 'driver'];
    const idx = (order.indexOf(this.cameraMode) + 1) % order.length;
    this.cameraMode = order[idx];
    return this.cameraMode;
  }

  public setCameraMode(mode: CameraMode): void {
    this.cameraMode = mode;
  }

  public startRun(mode: GameMode, districtId: string, raceId?: string): void {
    this.audio.ensureUnlocked();
    this.gameMode = mode;
    this.districtId = districtId;
    if (raceId) this.raceId = raceId;
    this.cameraMode = this.settings.defaultCamera;

    this.positionPlayerAtDistrict(districtId);
    this.speed = 0;
    this.steerAngle = 0;
    this.bodyRoll = 0;
    this.bodyPitch = 0;
    this.battery = 100;
    this.condition = 1.0;
    this.shakeIntensity = 0;
    this.score = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.highestCombo = 0;
    this.collisions = 0;
    this.distanceMeters = 0;
    this.crowdEscapeCount = 0;
    this.elapsedSeconds = 0;
    this.stoppedClungTimer = 0;
    this.policeSettleTimer = 0;
    this.chargeCableLine.visible = false;

    // Reset destructibles
    this.world.destructibles.forEach((d) => {
      d.smashed = false;
      d.respawnTimer = 0;
      d.x = d.origX;
      d.z = d.origZ;
      d.mesh.position.set(d.origX, d.origY, d.origZ);
      d.mesh.rotation.set(0, d.origRotY, 0);
      d.mesh.visible = true;
    });

    // Clear crowd
    this.crowd.forEach((c) => this.scene.remove(c.handle.group));
    this.crowd = [];

    // Reposition traffic safely away from spawn
    this.traffic.forEach((t, idx) => {
      t.smashed = false;
      t.smashTimer = 0;
      t.y = 0;
      t.group.rotation.set(0, t.axis === 'z' ? (t.dir > 0 ? 0 : Math.PI) : (t.dir > 0 ? Math.PI / 2 : -Math.PI / 2), 0);
      const dist = Math.hypot(t.x - this.playerX, t.z - this.playerZ);
      if (dist < 26) {
        if (t.axis === 'z') t.z += (idx % 2 === 0 ? 1 : -1) * 45;
        else t.x += (idx % 2 === 0 ? 1 : -1) * 45;
      }
      t.group.position.set(t.x, 0, t.z);
    });

    // Race / Challenge setup
    if (mode === 'race') {
      const race = RACES.find((r) => r.id === this.raceId) || RACES[0];
      this.raceTimeRemaining = race.timeLimitSec;
      this.raceCheckpointsDone = 0;
      this.raceCheckpointsTotal = race.targetCheckpoints;
      this.pickNextCheckpoint();
      this.world.checkpointRing.visible = true;
    } else {
      this.raceTimeRemaining = null;
      this.world.checkpointRing.visible = false;
    }

    this.challengeTarget = 12000;
    this.hudTimer = 0.06;
    this.sceneMode = 'playing';
  }

  private pickNextCheckpoint(): void {
    const candidates = [
      [0, -120],
      [120, -120],
      [120, 0],
      [120, 120],
      [0, 120],
      [-120, 120],
      [-120, 0],
      [-120, -120],
      [240, 0],
      [-240, 0],
      [0, 240],
      [0, -240],
    ];
    let best = candidates[Math.floor(Math.random() * candidates.length)];
    for (let tries = 0; tries < 5; tries++) {
      const c = candidates[Math.floor(Math.random() * candidates.length)];
      if (Math.hypot(c[0] - this.playerX, c[1] - this.playerZ) > 70) {
        best = c;
        break;
      }
    }
    this.checkpointX = best[0];
    this.checkpointZ = best[1];
    this.world.checkpointRing.position.set(this.checkpointX, 3.0, this.checkpointZ);
  }

  private positionPlayerAtDistrict(id: string): void {
    const d = DISTRICTS.find((dist) => dist.id === id) || DISTRICTS[0];
    // Offset slightly off center roundabout if Shahbag
    this.playerX = d.id === 'shahbag' ? 0 : d.spawnX;
    this.playerZ = d.id === 'shahbag' ? 16 : d.spawnZ;
    this.playerYaw = d.spawnYaw;
    this.easyBike.root.position.set(this.playerX, 0, this.playerZ);
    this.easyBike.root.rotation.set(0, this.playerYaw, 0);
  }

  public triggerHorn(): void {
    if (this.sceneMode !== 'playing' || this.hornCooldown > 0) return;
    this.hornCooldown = 0.25;
    this.audio.playHorn();

    // Nearby smaller vehicles react by swerving aside!
    this.traffic.forEach((t) => {
      if (t.smashed || t.isDangerous) return;
      const d = Math.hypot(t.x - this.playerX, t.z - this.playerZ);
      if (d < 26) {
        t.swerveTimer = 1.4;
        t.swerveOffset = (Math.random() > 0.5 ? 1 : -1) * 2.2;
      }
    });

    // Nearby pedestrians hop/dodge
    this.pedestrians.forEach((p) => {
      if (p.state === 'walking' && Math.hypot(p.x - this.playerX, p.z - this.playerZ) < 18) {
        p.dodgeTimer = 0.8;
      }
    });
  }

  public triggerSoundBomb(): void {
    if (this.sceneMode !== 'playing' || this.soundBombCooldown > 0) return;
    this.soundBombCooldown = 2.8;
    const line = SOUND_BOMB_LINES[Math.floor(Math.random() * SOUND_BOMB_LINES.length)];
    this.audio.playSoundBomb(line.bn);
    this.shakeIntensity = Math.max(this.shakeIntensity, 0.22);

    this.callbacks.onToast({
      id: this.toastSeq++,
      speakerBn: 'সাউন্ড বোম 💣',
      lineBn: line.bn,
      lineEn: line.en,
      tone: 'voice',
    });

    // Nearby traffic scatters & slows temporarily
    this.traffic.forEach((t) => {
      if (t.smashed) return;
      const d = Math.hypot(t.x - this.playerX, t.z - this.playerZ);
      if (d < 36) {
        t.swerveTimer = 2.2;
        t.swerveOffset = (Math.random() > 0.5 ? 1 : -1) * 3.0;
        if (!t.isDangerous) t.speed *= 0.6;
      }
    });

    // Blasts clinging crowd NPCs right off the Easy Bike!
    this.crowd.forEach((c) => {
      if (c.state === 'clinging') {
        c.grip = 0;
      }
    });
  }

  private pollGamepad(controls: ControlState): void {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
    const pads = navigator.getGamepads();
    const gp = pads?.[0];
    if (!gp) return;

    const axisX = gp.axes[0] || 0;
    if (axisX < -0.25 || gp.buttons[14]?.pressed) controls.left = true;
    if (axisX > 0.25 || gp.buttons[15]?.pressed) controls.right = true;
    if (gp.buttons[7]?.pressed || gp.buttons[0]?.pressed) controls.drive = true; // RT or A
    if (gp.buttons[6]?.pressed || gp.buttons[1]?.pressed) controls.brake = true; // LT or B
    if (gp.buttons[2]?.pressed || gp.buttons[5]?.pressed) controls.boost = true; // X or RB
    if (gp.buttons[3]?.pressed) this.triggerHorn();
    if (gp.buttons[4]?.pressed) this.triggerSoundBomb();
  }

  private startLoop(): void {
    const tick = () => {
      if (this.disposed) return;

      const now = performance.now();
      const rawDt = (now - this.lastTime) / 1000;
      this.lastTime = now;
      const dt = Math.min(rawDt, 0.05);

      // Optional 30 FPS limiter if configured
      if (this.settings.targetFps === 30 && !this.isSoftwareGl) {
        this.frameAccumulator += rawDt;
        if (this.frameAccumulator < 1 / 32) {
          this.frameId = requestAnimationFrame(tick);
          return;
        }
        this.frameAccumulator = 0;
      }

      this.update(dt, now * 0.001);
      this.renderer.render(this.scene, this.camera);

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.frameId = requestAnimationFrame(tick);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || !gl.fenceSync) {
      this.frameId = window.setTimeout(cb, 120);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    let polls = 0;
    const poll = () => {
      if (this.disposed) return;
      polls++;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED && polls < 8) {
        this.frameId = window.setTimeout(poll, 8);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 120);
      }
    };
    this.frameId = window.setTimeout(poll, 8);
  }

  private update(dt: number, elapsed: number): void {
    // Animate Dhaka Metro Rail train continuously
    this.world.metroTrain.position.x = ((elapsed * 18) % 520) - 260;

    if (this.sceneMode === 'menu') {
      // Atmospheric slow orbital pan around the decorated Easy Bike at Shahbag
      const angle = elapsed * 0.28;
      _camTarget.set(this.playerX, 1.25, this.playerZ);
      _camDesired.set(
        this.playerX + Math.sin(angle) * 6.4,
        2.6 + Math.sin(elapsed * 0.4) * 0.35,
        this.playerZ + Math.cos(angle) * 6.4,
      );
      this.camera.position.lerp(_camDesired, 1 - Math.exp(-4 * dt));
      this.camera.lookAt(_camTarget);
      this.updateTraffic(dt * 0.5);
      this.updatePedestrians(dt * 0.6, elapsed);
      return;
    }

    if (this.sceneMode === 'garage') {
      // Interactive 3D showroom camera
      const dist = this.garageDist;
      const cosP = Math.cos(this.garagePitch);
      _camDesired.set(
        this.playerX + Math.sin(this.garageYaw) * cosP * dist,
        1.15 + Math.sin(this.garagePitch) * dist,
        this.playerZ + Math.cos(this.garageYaw) * cosP * dist,
      );
      _camTarget.set(this.playerX, 1.05, this.playerZ);
      this.camera.position.lerp(_camDesired, 1 - Math.exp(-10 * dt));
      this.camera.lookAt(_camTarget);
      return;
    }

    if (this.sceneMode !== 'playing') {
      return;
    }

    // Hitstop freeze frame on heavy non-fatal collisions
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      return;
    }

    this.elapsedSeconds += dt;
    if (this.hornCooldown > 0) this.hornCooldown -= dt;
    if (this.soundBombCooldown > 0) this.soundBombCooldown -= dt;

    // 1. Merge Input (Keyboard + Touch + Gamepad)
    const controls: ControlState = {
      left: this.keyControls.left || this.touchControls.left,
      right: this.keyControls.right || this.touchControls.right,
      drive: this.keyControls.drive || this.touchControls.drive,
      brake: this.keyControls.brake || this.touchControls.brake,
      boost: this.keyControls.boost || this.touchControls.boost,
    };
    this.pollGamepad(controls);

    if (controls.boost && !this.prevBoostHeld && this.battery > 1) {
      this.audio.playBoost();
      this.callbacks.onTaskProgress({ boosts: 1 });
    }
    this.prevBoostHeld = controls.boost;

    // 2. Player Easy Bike Physics
    const isBoosting = controls.boost && this.battery > 1.0;
    const isDriving = controls.drive && this.battery > 0.2;
    const isBraking = controls.brake;

    // Independent boost accelerates even without holding Drive!
    const topSpeed = isBoosting ? 31.5 : 21.0;
    const accelRate = isBoosting ? 28.0 : 14.5;

    if (isBoosting) {
      this.speed = Math.min(topSpeed, this.speed + accelRate * dt);
      this.boostVisualTimer += dt;
      this.shakeIntensity = Math.max(this.shakeIntensity, 0.06);
      if (Math.random() < 0.65) {
        const bx = this.playerX - Math.sin(this.playerYaw) * 1.4;
        const bz = this.playerZ - Math.cos(this.playerYaw) * 1.4;
        this.spawnParticles(bx, 0.45, bz, 0x22d3ee, 1, 0.55);
      }
    } else if (isDriving) {
      if (this.speed < topSpeed) {
        this.speed = Math.min(topSpeed, this.speed + accelRate * dt);
      } else {
        this.speed = THREE.MathUtils.damp(this.speed, topSpeed, 3.0, dt);
      }
    } else if (isBraking) {
      if (this.speed > 0.5) {
        this.speed = Math.max(0, this.speed - 28.0 * dt);
      } else {
        // Gentle reverse
        this.speed = Math.max(-7.5, this.speed - 11.0 * dt);
      }
    } else {
      // Natural rolling friction
      this.speed = THREE.MathUtils.damp(this.speed, 0, 2.2, dt);
    }

    // Steering smoothness
    const steerInput = (controls.left ? 1 : 0) - (controls.right ? 1 : 0);
    this.steerAngle = THREE.MathUtils.damp(this.steerAngle, steerInput * 0.46, 12, dt);

    const turnScale = Math.min(1, Math.abs(this.speed) / 3.2) * (this.speed >= 0 ? 1 : -1);
    this.playerYaw += this.steerAngle * 3.1 * turnScale * dt;

    // Move player
    const prevX = this.playerX;
    const prevZ = this.playerZ;
    this.playerX += Math.sin(this.playerYaw) * this.speed * dt;
    this.playerZ += Math.cos(this.playerYaw) * this.speed * dt;

    // Natural city perimeter bounds (trees/riverbank)
    this.playerX = THREE.MathUtils.clamp(this.playerX, -290, 290);
    this.playerZ = THREE.MathUtils.clamp(this.playerZ, -290, 290);

    // Building AABB slide collisions
    const pRad = 1.15;
    for (let i = 0; i < this.world.colliders.length; i++) {
      const b = this.world.colliders[i];
      const closestX = THREE.MathUtils.clamp(this.playerX, b.minX, b.maxX);
      const closestZ = THREE.MathUtils.clamp(this.playerZ, b.minZ, b.maxZ);
      const dx = this.playerX - closestX;
      const dz = this.playerZ - closestZ;
      const distSq = dx * dx + dz * dz;
      if (distSq < pRad * pRad) {
        const dist = Math.sqrt(distSq) || 0.001;
        const overlap = pRad - dist;
        this.playerX += (dx / dist) * overlap;
        this.playerZ += (dz / dist) * overlap;
        this.speed *= 0.65;
      }
    }

    // Central Shahbag Roundabout Monument collision
    const monDist = Math.hypot(this.playerX, this.playerZ);
    if (monDist < 5.1) {
      const nx = this.playerX / (monDist || 1);
      const nz = this.playerZ / (monDist || 1);
      this.playerX = nx * 5.1;
      this.playerZ = nz * 5.1;
      this.speed *= 0.55;
    }

    const movedStep = Math.hypot(this.playerX - prevX, this.playerZ - prevZ);
    this.distanceMeters += movedStep;

    // Suspension roll/pitch & visual animations on Easy Bike
    const targetRoll = -steerInput * Math.min(1, Math.abs(this.speed) / 14) * 0.14;
    const targetPitch = isBraking && this.speed > 2 ? 0.08 : isBoosting ? -0.07 : 0;
    this.bodyRoll = THREE.MathUtils.damp(this.bodyRoll, targetRoll, 10, dt);
    this.bodyPitch = THREE.MathUtils.damp(this.bodyPitch, targetPitch, 10, dt);

    const targetPlayerY = this.world.isOnFootpath(this.playerX, this.playerZ) ? 0.24 : 0;
    this.playerY = THREE.MathUtils.damp(this.playerY, targetPlayerY, 18, dt);

    this.easyBike.root.position.set(this.playerX, this.playerY, this.playerZ);
    this.easyBike.root.rotation.y = this.playerYaw;
    this.easyBike.bodyTilt.rotation.z = this.bodyRoll;
    this.easyBike.bodyTilt.rotation.x = this.bodyPitch;
    this.easyBike.bodyTilt.position.y = Math.sin(elapsed * 18) * Math.min(1, Math.abs(this.speed) / 20) * 0.018;
    this.easyBike.frontFork.rotation.y = this.steerAngle * 0.9;
    this.easyBike.driverTorso.rotation.z = -this.bodyRoll * 1.4;

    const wheelSpin = (this.speed / 0.3) * dt;
    for (let i = 0; i < this.easyBike.wheels.length; i++) {
      this.easyBike.wheels[i].rotation.x += wheelSpin;
    }

    // Brake light glow
    const brakeGlow = isBraking ? 2.4 : 0.45;
    this.easyBike.brakeLightMats.forEach((m) => (m.emissiveIntensity = brakeGlow));

    // Dashboard battery bar color & scale
    const batRatio = Math.max(0.02, this.battery / 100);
    this.easyBike.batteryBar.scale.x = batRatio;
    this.easyBike.batteryBarMat.color.setHex(
      this.battery > 45 ? 0x22c55e : this.battery > 20 ? 0xf59e0b : 0xef4444,
    );
    this.easyBike.batteryBarMat.emissive.copy(this.easyBike.batteryBarMat.color);

    // 3. Battery Drain & Charging Station Logic
    let isCharging = false;
    let nearestChargerDist = Infinity;
    let nearestCharger = this.world.chargingStations[0];
    for (const cs of this.world.chargingStations) {
      const d = Math.hypot(cs.x - this.playerX, cs.z - this.playerZ);
      if (d < nearestChargerDist) {
        nearestChargerDist = d;
        nearestCharger = cs;
      }
    }

    if (nearestChargerDist < 4.5 && Math.abs(this.speed) < 2.3 && this.battery < 100) {
      isCharging = true;
      this.battery = Math.min(100, this.battery + 28 * dt);
      this.condition = Math.min(1.0, this.condition + 0.1 * dt);
      this.chargeSoundTimer -= dt;
      if (this.chargeSoundTimer <= 0) {
        this.chargeSoundTimer = 0.28;
        this.audio.playChargeTick();
      }
      // Update 3D Charging Cable between electric pole kiosk and Easy Bike
      const startPt = _v1.set(nearestCharger.x - 1.4, 1.15, nearestCharger.z);
      const endPt = _v2.copy(this.easyBike.chargePortPos);
      endPt.applyAxisAngle(_v3.set(0, 1, 0), this.playerYaw);
      endPt.add(this.easyBike.root.position);
      const midPt = _v3
        .copy(startPt)
        .lerp(endPt, 0.5)
        .add(new THREE.Vector3(0, -0.35 + Math.sin(elapsed * 8) * 0.06, 0));

      const posAttr = this.chargeCableLine.geometry.attributes.position as THREE.BufferAttribute;
      posAttr.setXYZ(0, startPt.x, startPt.y, startPt.z);
      posAttr.setXYZ(1, midPt.x, midPt.y, midPt.z);
      posAttr.setXYZ(2, endPt.x, endPt.y, endPt.z);
      posAttr.needsUpdate = true;
      this.chargeCableLine.visible = true;
    } else {
      this.chargeCableLine.visible = false;
      if (this.gameMode !== 'free') {
        const speedNorm = Math.abs(this.speed) / 21;
        const accelDrain = isDriving ? 0.45 : 0.05;
        const boostDrain = isBoosting ? 3.8 : 0;
        const wearFactor = 1 + (1 - this.condition) * 0.35;
        const drain = (0.28 + speedNorm * 1.15 + accelDrain + boostDrain) * wearFactor * dt;
        this.battery = Math.max(0, this.battery - drain);
      }
    }

    if (this.battery <= 0 && Math.abs(this.speed) < 0.8 && this.gameMode !== 'free') {
      this.endRun('battery_dead');
      return;
    }

    // 4. Audio Motor Update
    this.audio.updateMotor(Math.abs(this.speed) / 21, isBoosting, true);

    // 5. Combo Decay
    if (this.combo > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 0;
      }
    }

    // 6. Traffic AI & Collisions
    this.updateTraffic(dt);
    if (this.sceneMode !== 'playing') return;

    // 7. Destructibles Collisions & Flying Physics
    this.updateDestructibles(dt);

    // 7b. Footpath Pedestrians Walking & Impact
    this.updatePedestrians(dt, elapsed);

    // 8. Crowd Chase, Beating & Police Settlement
    const chaseResult = this.updateCrowdAndPolice(dt, elapsed, isBoosting);
    if (chaseResult) {
      this.endRun(chaseResult);
      return;
    }

    // 9. Race / Challenge Mode Checkpoints & Timers
    if (this.gameMode === 'race' && this.raceTimeRemaining !== null) {
      this.raceTimeRemaining -= dt;
      this.world.checkpointRing.rotation.y += dt * 2.2;
      const cpDist = Math.hypot(this.playerX - this.checkpointX, this.playerZ - this.checkpointZ);
      if (cpDist < 5.5) {
        this.raceCheckpointsDone++;
        this.audio.playPickup();
        this.emitWorldPopup(this.playerX, 2.2, this.playerZ, `চেকপয়েন্ট ${this.raceCheckpointsDone}/${this.raceCheckpointsTotal}!`, '+500 ৳', '#22d3ee');
        this.score += 500;
        if (this.raceCheckpointsDone >= this.raceCheckpointsTotal) {
          this.endRun('race_won');
          return;
        }
        this.pickNextCheckpoint();
      } else if (this.raceTimeRemaining <= 0) {
        this.endRun('race_timeout');
        return;
      }
    } else if (this.gameMode === 'challenge' && this.score >= this.challengeTarget) {
      this.endRun('challenge_won');
      return;
    }

    // 10. Particles & Camera
    this.updateParticles(dt);
    this.updateDrivingCamera(dt, isBoosting);

    // Follow sun shadow frustum with player
    this.sunLight.position.set(this.playerX + 45, 72, this.playerZ + 35);
    this.sunLight.target.position.set(this.playerX, 0, this.playerZ);

    // 11. Throttled HUD Snapshot (~16Hz so React never stalls 60fps loop)
    this.hudTimer += dt;
    if (this.hudTimer >= 0.06) {
      this.hudTimer = 0;
      this.callbacks.onTaskProgress({ distance: movedStep * 3 });
      this.emitHudSnapshot(nearestCharger, nearestChargerDist, isCharging, isBoosting);
    }
  }

  private updateTraffic(dt: number): void {
    const halfCity = 275;
    for (let i = 0; i < this.traffic.length; i++) {
      const t = this.traffic[i];

      if (t.smashed) {
        t.smashTimer += dt;
        t.x += t.vx * dt;
        t.y += t.vy * dt;
        t.z += t.vz * dt;
        t.vy -= 22 * dt;
        if (t.y < 0) {
          t.y = 0;
          t.vy = Math.abs(t.vy) * 0.35;
          t.vx *= 0.72;
          t.vz *= 0.72;
        }
        t.group.position.set(t.x, t.y, t.z);
        t.group.rotation.x += t.spinX * dt;
        t.group.rotation.y += t.spinY * dt;

        if (t.smashTimer > 5.5) {
          // Respawn far away cleanly
          t.smashed = false;
          t.smashTimer = 0;
          t.y = 0;
          t.group.rotation.set(0, 0, 0);
          const lane = this.world.roadLanes[Math.floor(Math.random() * this.world.roadLanes.length)];
          t.axis = lane.axis;
          t.dir = lane.dir;
          t.laneCoord = lane.coord;
          const farPos = (Math.random() > 0.5 ? 1 : -1) * 240;
          t.x = lane.axis === 'z' ? lane.coord : farPos;
          t.z = lane.axis === 'x' ? lane.coord : farPos;
          t.speed = t.baseSpeed;
        }
        continue;
      }

      if (t.swerveTimer > 0) {
        t.swerveTimer -= dt;
        if (t.swerveTimer <= 0) t.swerveOffset = 0;
      }

      // Simple obstacle & vehicle-ahead slowing
      let targetSpeed = t.baseSpeed;
      for (let j = 0; j < this.traffic.length; j++) {
        if (i === j || this.traffic[j].smashed) continue;
        const o = this.traffic[j];
        if (o.axis === t.axis && o.dir === t.dir && Math.abs(o.laneCoord - t.laneCoord) < 1.5) {
          const forwardDelta = t.axis === 'z' ? (o.z - t.z) * t.dir : (o.x - t.x) * t.dir;
          if (forwardDelta > 0 && forwardDelta < 14) {
            targetSpeed = Math.min(targetSpeed, o.speed * 0.75);
          }
        }
      }
      t.speed = THREE.MathUtils.damp(t.speed, targetSpeed, 4, dt);

      if (t.axis === 'z') {
        t.z += t.dir * t.speed * dt;
        if (t.z > halfCity) t.z = -halfCity;
        if (t.z < -halfCity) t.z = halfCity;
        t.x = THREE.MathUtils.damp(t.x, t.laneCoord + t.swerveOffset, 5, dt);
        t.group.rotation.y = t.dir > 0 ? 0 : Math.PI;
      } else {
        t.x += t.dir * t.speed * dt;
        if (t.x > halfCity) t.x = -halfCity;
        if (t.x < -halfCity) t.x = halfCity;
        t.z = THREE.MathUtils.damp(t.z, t.laneCoord + t.swerveOffset, 5, dt);
        t.group.rotation.y = t.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      }

      // Occasional intersection turn
      if (Math.random() < 0.004) {
        for (const rc of this.world.roadCoords) {
          if (Math.abs(t.x - rc) < 2.5 && Math.abs(t.z - rc) < 2.5) {
            // Switch perpendicular axis
            if (t.axis === 'z') {
              t.axis = 'x';
              t.laneCoord = rc + (t.dir > 0 ? 5.2 : -5.2);
            } else {
              t.axis = 'z';
              t.laneCoord = rc + (t.dir > 0 ? -5.2 : 5.2);
            }
            break;
          }
        }
      }

      t.group.position.set(t.x, 0, t.z);
      for (let w = 0; w < t.wheels.length; w++) {
        t.wheels[w].rotation.x += t.speed * 2.2 * dt;
      }

      // Collision Check with Player Easy Bike
      if (this.sceneMode === 'playing') {
        const dx = t.x - this.playerX;
        const dz = t.z - this.playerZ;
        const hitDist = t.radius + 1.05;
        if (dx * dx + dz * dz < hitDist * hitDist) {
          if (t.isDangerous && this.gameMode !== 'free') {
            // Fatal crash with heavy Bus or Truck!
            this.audio.playCrash(1.6, true);
            this.vibrate(250);
            this.shakeIntensity = 1.1;
            this.spawnParticles(this.playerX, 1.0, this.playerZ, 0xef4444, 24, 1.5);
            this.endRun(t.kind === 'bus' ? 'bus_crash' : 'truck_crash');
            return;
          } else {
            // Smashable arcade target!
            t.smashed = true;
            t.vx = (dx / (Math.hypot(dx, dz) || 1)) * (10 + Math.abs(this.speed) * 0.7);
            t.vz = (dz / (Math.hypot(dx, dz) || 1)) * (10 + Math.abs(this.speed) * 0.7);
            t.vy = 6.5 + Math.random() * 4.5;
            t.spinX = (Math.random() - 0.5) * 8;
            t.spinY = (Math.random() - 0.5) * 10;

            this.registerSmashHit(t.points, t.x, t.z, true);
          }
        }
      }
    }
  }

  private updateDestructibles(dt: number): void {
    for (let i = 0; i < this.world.destructibles.length; i++) {
      const d = this.world.destructibles[i];
      if (d.smashed) {
        d.respawnTimer += dt;
        if (d.respawnTimer < 2.2) {
          d.x += d.vx * dt;
          d.z += d.vz * dt;
          d.mesh.position.x = d.x;
          d.mesh.position.z = d.z;
          d.mesh.position.y = Math.max(0, d.mesh.position.y + d.vy * dt);
          d.vy -= 20 * dt;
          d.mesh.rotation.x += d.spinX * dt;
          d.mesh.rotation.z += d.spinZ * dt;
        } else if (d.respawnTimer < 16) {
          d.mesh.visible = false;
        } else {
          // Respawn gently when far from player
          if (Math.hypot(d.origX - this.playerX, d.origZ - this.playerZ) > 45) {
            d.smashed = false;
            d.respawnTimer = 0;
            d.x = d.origX;
            d.z = d.origZ;
            d.mesh.position.set(d.origX, d.origY, d.origZ);
            d.mesh.rotation.set(0, d.origRotY, 0);
            d.mesh.visible = true;
          }
        }
        continue;
      }

      const dx = d.x - this.playerX;
      const dz = d.z - this.playerZ;
      const hitRad = d.radius + 1.0;
      if (dx * dx + dz * dz < hitRad * hitRad) {
        d.smashed = true;
        d.respawnTimer = 0;
        const len = Math.hypot(dx, dz) || 1;
        d.vx = (dx / len) * (8 + Math.abs(this.speed) * 0.55);
        d.vz = (dz / len) * (8 + Math.abs(this.speed) * 0.55);
        d.vy = 5.5;
        d.spinX = (Math.random() - 0.5) * 9;
        d.spinZ = (Math.random() - 0.5) * 9;

        this.registerSmashHit(d.points, d.x, d.z, d.kind === 'tea_stall' || d.kind === 'fruit_cart');
      }
    }
  }

  private registerSmashHit(basePoints: number, hitX: number, hitZ: number, spawnCrowd: boolean): void {
    this.combo = Math.min(10, this.combo + 1);
    this.comboTimer = 4.6;
    this.highestCombo = Math.max(this.highestCombo, this.combo);
    this.collisions++;

    const gained = basePoints * this.combo;
    this.score += gained;
    this.condition = Math.max(0.55, this.condition - 0.02);
    this.speed *= 0.88;
    this.hitstopTimer = 0.042;
    this.shakeIntensity = Math.max(this.shakeIntensity, 0.45);

    this.audio.playCrash(1.0, false);
    this.vibrate(75);
    this.spawnParticles(hitX, 1.1, hitZ, 0xfbbf24, 14, 1.1);

    this.emitWorldPopup(
      hitX,
      2.1,
      hitZ,
      `+${gained.toLocaleString()} ৳`,
      this.combo > 1 ? `COMBO x${this.combo}!` : 'জাতীয় ক্ষতি!',
      this.combo >= 4 ? '#f43f5e' : '#facc15',
    );

    this.callbacks.onTaskProgress({ score: gained, crashes: 1 });

    // Spawn angry crowd NPCs on certain collisions!
    if (spawnCrowd && this.gameMode !== 'free' && this.crowd.length < 8) {
      const count = this.combo >= 3 ? 2 : 1;
      const shirts = [0xef4444, 0xf97316, 0x2563eb, 0x059669];
      const lungis = [0x1e293b, 0x7c2d12, 0x312e81];
      for (let k = 0; k < count; k++) {
        const handle = createCrowdNpcModel(
          shirts[Math.floor(Math.random() * shirts.length)],
          lungis[Math.floor(Math.random() * lungis.length)],
          this.shadowTex,
        );
        const ang = Math.random() * Math.PI * 2;
        const sx = hitX + Math.cos(ang) * 4.2;
        const sz = hitZ + Math.sin(ang) * 4.2;
        handle.group.position.set(sx, 0, sz);
        this.scene.add(handle.group);
        this.crowd.push({
          id: this.nextCrowdId++,
          handle,
          x: sx,
          y: 0,
          z: sz,
          speed: 14.0 + Math.random() * 3.0,
          state: 'chasing',
          clingSlot: -1,
          grip: 1.0,
          beatTimer: 0,
          life: 14,
          runPhase: Math.random() * 6,
          vx: 0,
          vy: 0,
          vz: 0,
        });
      }
      if (Math.random() < 0.5) {
        this.callbacks.onToast({
          id: this.toastSeq++,
          speakerBn: 'ক্ষিপ্ত জনতা 😡',
          lineBn: 'ধর ধর! এই ব্যাটার অটো থামা!',
          lineEn: 'Catch him! Stop that Easy Bike!',
          tone: 'crowd',
        });
      }
    }
  }

  private updatePedestrians(dt: number, elapsed: number): void {
    const loops = this.world.footpathLoops;
    if (loops.length === 0) return;

    for (let i = 0; i < this.pedestrians.length; i++) {
      const p = this.pedestrians[i];

      if (p.state === 'knocked') {
        p.knockTimer += dt;
        p.x += p.vx * dt;
        p.z += p.vz * dt;
        p.y = Math.max(0, p.y + p.vy * dt);
        p.vy -= 22 * dt;
        if (p.y <= 0) {
          p.y = 0;
          p.vy = Math.abs(p.vy) * 0.25;
          p.vx *= 0.78;
          p.vz *= 0.78;
        }
        p.handle.group.position.set(p.x, p.y, p.z);
        p.handle.group.rotation.x += p.spinX * dt;

        if (p.knockTimer > 2.8) {
          // Respawn back on footpath loop away from player
          const loop = loops[p.loopIdx];
          p.state = 'walking';
          p.knockTimer = 0;
          p.x = loop.minX;
          p.z = loop.minZ;
          p.y = 0.24;
          p.edge = 0;
          p.handle.group.rotation.set(0, 0, 0);
        }
        continue;
      }

      const loop = loops[p.loopIdx];
      const spd = p.dodgeTimer > 0 ? p.speed * 2.1 : p.speed;
      if (p.dodgeTimer > 0) p.dodgeTimer -= dt;

      if (p.edge === 0) {
        p.x += spd * dt;
        p.yaw = Math.PI / 2;
        if (p.x >= loop.maxX) {
          p.x = loop.maxX;
          p.edge = 1;
        }
      } else if (p.edge === 1) {
        p.z += spd * dt;
        p.yaw = 0;
        if (p.z >= loop.maxZ) {
          p.z = loop.maxZ;
          p.edge = 2;
        }
      } else if (p.edge === 2) {
        p.x -= spd * dt;
        p.yaw = -Math.PI / 2;
        if (p.x <= loop.minX) {
          p.x = loop.minX;
          p.edge = 3;
        }
      } else {
        p.z -= spd * dt;
        p.yaw = Math.PI;
        if (p.z <= loop.minZ) {
          p.z = loop.minZ;
          p.edge = 0;
        }
      }

      p.y = 0.24 + (p.dodgeTimer > 0 ? Math.abs(Math.sin(elapsed * 14)) * 0.16 : 0);
      p.walkPhase += dt * spd * 3.2;

      p.handle.group.position.set(p.x, p.y, p.z);
      p.handle.group.rotation.y = p.yaw;
      p.handle.leftLeg.rotation.x = Math.sin(p.walkPhase) * 0.55;
      p.handle.rightLeg.rotation.x = -Math.sin(p.walkPhase) * 0.55;
      p.handle.leftArm.rotation.x = -Math.sin(p.walkPhase) * 0.45;
      p.handle.rightArm.rotation.x = Math.sin(p.walkPhase) * 0.45;

      // Hit check with Easy Bike
      if (this.sceneMode === 'playing' && Math.abs(this.speed) > 1.5) {
        const dx = p.x - this.playerX;
        const dz = p.z - this.playerZ;
        if (dx * dx + dz * dz < 2.2) {
          const len = Math.hypot(dx, dz) || 1;
          p.state = 'knocked';
          p.knockTimer = 0;
          p.vx = (dx / len) * (9 + Math.abs(this.speed) * 0.55);
          p.vz = (dz / len) * (9 + Math.abs(this.speed) * 0.55);
          p.vy = 6.2;
          p.spinX = 8.5;
          this.registerSmashHit(350, p.x, p.z, true);
        }
      }
    }
  }

  private updateCrowdAndPolice(
    dt: number,
    elapsed: number,
    isBoosting: boolean,
  ): GameOverReason | null {
    let clungCount = 0;
    const clingSlotsOccupied = [false, false, false];
    for (const c of this.crowd) {
      if (c.state === 'clinging' && c.clingSlot >= 0) {
        clingSlotsOccupied[c.clingSlot] = true;
        clungCount++;
      }
    }

    const isSwerving = Math.abs(this.steerAngle) > 0.22 && Math.abs(this.speed) > 7.5;
    const isFast = Math.abs(this.speed) > 16.5;

    for (let i = this.crowd.length - 1; i >= 0; i--) {
      const c = this.crowd[i];
      c.life -= dt;

      if (c.state === 'shaken') {
        c.x += c.vx * dt;
        c.z += c.vz * dt;
        c.y = Math.max(0, c.y + c.vy * dt);
        c.vy -= 20 * dt;
        if (c.y <= 0) {
          c.y = 0;
          c.vy = Math.abs(c.vy) * 0.28;
          c.vx *= 0.8;
          c.vz *= 0.8;
        }
        c.handle.group.position.set(c.x, c.y, c.z);
        c.handle.group.rotation.x += dt * 7.5;
        c.handle.leftArm.rotation.x = -1.2;
        c.handle.rightArm.rotation.x = -1.2;
        if (c.life <= 0) {
          this.scene.remove(c.handle.group);
          this.crowd.splice(i, 1);
        }
        continue;
      }

      if (c.state === 'clinging') {
        // Position clinging / attacking beside the Easy Bike
        const slotOffsets = [
          [-1.08, -0.55],
          [1.08, -0.55],
          [0, -1.85],
        ];
        const [ox, oz] = slotOffsets[c.clingSlot] || [0, -1.85];
        const sinY = Math.sin(this.playerYaw);
        const cosY = Math.cos(this.playerYaw);
        c.x = this.playerX + ox * cosY + oz * sinY;
        c.z = this.playerZ - ox * sinY + oz * cosY;

        // Face INWARD toward the Easy Bike while beating it!
        const faceAngle = c.clingSlot === 0 ? this.playerYaw - Math.PI / 2 : c.clingSlot === 1 ? this.playerYaw + Math.PI / 2 : this.playerYaw;
        c.handle.group.position.set(c.x, this.playerY + 0.14 + Math.abs(Math.sin(elapsed * 18 + c.id)) * 0.12, c.z);
        c.handle.group.rotation.y = faceAngle;

        // Expressive beating / stick-whacking animation!
        const whack = Math.sin(elapsed * 26 + c.id * 2.1);
        c.handle.rightArm.rotation.x = -1.35 + whack * 1.15;
        c.handle.leftArm.rotation.x = -0.95 - whack * 0.65;
        c.handle.torsoPivot.rotation.x = 0.24 + whack * 0.18;
        c.handle.leftLeg.rotation.x = Math.sin(elapsed * 18) * 0.4;
        c.handle.rightLeg.rotation.x = -Math.sin(elapsed * 18) * 0.4;

        c.beatTimer += dt;
        if (c.beatTimer >= 0.42) {
          c.beatTimer = 0;
          this.spawnParticles(c.x, this.playerY + 1.1, c.z, 0xfef08a, 3, 0.45);
          this.shakeIntensity = Math.max(this.shakeIntensity, 0.08);
        }

        // Dynamic grip drain so NPCs NEVER stay permanently glued onto the car!
        let drain = 0.14; // natural fatigue
        if (isBoosting) drain += 1.85;
        if (isSwerving) drain += 1.25;
        if (isFast) drain += 0.55;
        c.grip -= drain * dt;

        if (c.grip <= 0) {
          c.state = 'shaken';
          c.life = 1.65;
          c.vy = 5.4;
          c.vx = -sinY * (8 + Math.abs(this.speed) * 0.3) + (ox * cosY) * 4.5;
          c.vz = -cosY * (8 + Math.abs(this.speed) * 0.3) - (ox * sinY) * 4.5;
          this.crowdEscapeCount++;
          this.score += 250;
          this.callbacks.onTaskProgress({ escapes: 1, score: 250 });
          this.emitWorldPopup(c.x, 1.9, c.z, 'ছাড়া পাইছে! +250', 'SHAKEN OFF!', '#22c55e');
        }
        continue;
      }

      // Chasing state
      const dx = this.playerX - c.x;
      const dz = this.playerZ - c.z;
      const dist = Math.hypot(dx, dz);

      if (c.life <= 0 || dist > 85) {
        if (dist > 38) {
          this.crowdEscapeCount++;
          this.callbacks.onTaskProgress({ escapes: 1 });
        }
        this.scene.remove(c.handle.group);
        this.crowd.splice(i, 1);
        continue;
      }

      const dirX = dx / (dist || 1);
      const dirZ = dz / (dist || 1);
      c.x += dirX * c.speed * dt;
      c.z += dirZ * c.speed * dt;
      c.y = this.world.isOnFootpath(c.x, c.z) ? 0.24 : 0;
      c.runPhase += dt * 16;

      c.handle.group.position.set(c.x, c.y, c.z);
      c.handle.group.rotation.y = Math.atan2(dirX, dirZ);
      c.handle.torsoPivot.rotation.x = 0.25;
      c.handle.leftLeg.rotation.x = Math.sin(c.runPhase) * 0.85;
      c.handle.rightLeg.rotation.x = -Math.sin(c.runPhase) * 0.85;
      c.handle.leftArm.rotation.x = -Math.sin(c.runPhase) * 0.8;
      // Waving bamboo stick overhead while chasing!
      c.handle.rightArm.rotation.x = -1.6 + Math.sin(c.runPhase * 1.4) * 0.7;

      // Catch & Attack / Cling onto Easy Bike
      if (dist < 1.95) {
        const freeSlot = clingSlotsOccupied.findIndex((occ) => !occ);
        if (freeSlot !== -1) {
          c.state = 'clinging';
          c.clingSlot = freeSlot;
          c.grip = 1.0;
          c.beatTimer = 0.35;
          c.life = 14;
          clingSlotsOccupied[freeSlot] = true;
          clungCount++;
          this.vibrate(110);
          this.audio.playCrash(0.45, false);
          this.shakeIntensity = Math.max(this.shakeIntensity, 0.28);
        }
      }
    }

    // Rule 1: 3 NPCs attacking simultaneously triggers Game Over
    if (clungCount >= 3) {
      return 'crowd_caught';
    }

    // Rule 2: Stopping while crowd is attacking triggers Game Over
    if (clungCount > 0 && Math.abs(this.speed) < 1.2) {
      const nearPolice = this.getNearestPolice();
      if (nearPolice.dist < 5.0) {
        this.policeSettleTimer += dt;
        if (this.policeSettleTimer >= 1.1) {
          this.executePoliceSettlement();
        }
      } else {
        this.stoppedClungTimer += dt;
        if (this.stoppedClungTimer >= 1.25) {
          return 'crowd_stopped';
        }
      }
    } else {
      this.stoppedClungTimer = 0;
      if (this.crowd.length > 0 && Math.abs(this.speed) < 1.8) {
        const nearPolice = this.getNearestPolice();
        if (nearPolice.dist < 5.0) {
          this.policeSettleTimer += dt;
          if (this.policeSettleTimer >= 1.1) {
            this.executePoliceSettlement();
          }
        } else {
          this.policeSettleTimer = Math.max(0, this.policeSettleTimer - dt * 2);
        }
      } else {
        this.policeSettleTimer = 0;
      }
    }

    return null;
  }

  private getNearestPolice() {
    let best = this.world.policeStations[0];
    let bestDist = Infinity;
    for (const ps of this.world.policeStations) {
      const d = Math.hypot(ps.x - this.playerX, ps.z - this.playerZ);
      if (d < bestDist) {
        bestDist = d;
        best = ps;
      }
    }
    return { station: best, dist: bestDist };
  }

  private executePoliceSettlement(): void {
    this.policeSettleTimer = 0;
    this.stoppedClungTimer = 0;
    const escaped = this.crowd.length;
    this.crowdEscapeCount += escaped;
    this.callbacks.onTaskProgress({ escapes: escaped });

    // Disperse all crowd NPCs
    this.crowd.forEach((c) => this.scene.remove(c.handle.group));
    this.crowd = [];

    this.audio.playPoliceWhistle();
    this.callbacks.onPoliceSettlementFee(500);

    const line = POLICE_SETTLEMENT_LINES[Math.floor(Math.random() * POLICE_SETTLEMENT_LINES.length)];
    this.callbacks.onToast({
      id: this.toastSeq++,
      speakerBn: 'সার্জেন্ট হাবিব 👮',
      lineBn: line.bn,
      lineEn: `${line.en} (-৳500 Settlement)`,
      tone: 'police',
    });
  }

  private updateParticles(dt: number): void {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        p.mesh.visible = false;
        continue;
      }
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y = Math.max(0.05, p.mesh.position.y + p.vy * dt);
      p.mesh.position.z += p.vz * dt;
      p.vy -= 14 * dt;
      p.mesh.scale.setScalar(1 - p.life / p.maxLife);
    }
  }

  private updateDrivingCamera(dt: number, isBoosting: boolean): void {
    const sinY = Math.sin(this.playerYaw);
    const cosY = Math.cos(this.playerYaw);

    if (this.cameraMode === 'driver') {
      // First-person Driver View looking over handlebar & dashboard
      const targetFov = isBoosting ? 84 : 74;
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 7, dt);
      this.camera.updateProjectionMatrix();

      _camDesired.set(
        this.playerX + sinY * 0.25,
        1.52,
        this.playerZ + cosY * 0.25,
      );
      _camTarget.set(
        this.playerX + sinY * 14,
        1.25,
        this.playerZ + cosY * 14,
      );
      this.camera.position.copy(_camDesired);
      this.camera.lookAt(_camTarget);
    } else {
      const isFar = this.cameraMode === 'far';
      const dist = isFar ? 10.5 : 6.4;
      const height = isFar ? 4.8 : 2.95;
      // Aim slightly ahead & upward so Easy Bike sits cleanly near bottom of screen!
      const lookY = isFar ? 1.55 : 1.38;
      const targetFov = isBoosting ? 76 : 62;
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 6, dt);
      this.camera.updateProjectionMatrix();

      _camDesired.set(
        this.playerX - sinY * dist,
        height,
        this.playerZ - cosY * dist,
      );
      _camTarget.set(
        this.playerX + sinY * 3.8,
        lookY,
        this.playerZ + cosY * 3.8,
      );

      this.camera.position.lerp(_camDesired, 1 - Math.exp(-9 * dt));
      this.camera.lookAt(_camTarget);
    }

    // Decaying Camera Shake
    if (this.shakeIntensity > 0.005) {
      this.camera.position.x += (Math.random() - 0.5) * this.shakeIntensity;
      this.camera.position.y += (Math.random() - 0.5) * this.shakeIntensity * 0.7;
      this.shakeIntensity = THREE.MathUtils.damp(this.shakeIntensity, 0, 10, dt);
    }
  }

  private emitWorldPopup(
    wx: number,
    wy: number,
    wz: number,
    text: string,
    subtext: string | undefined,
    color: string,
  ): void {
    _projVec.set(wx, wy, wz).project(this.camera);
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    const x = ((_projVec.x + 1) / 2) * w;
    const y = ((-_projVec.y + 1) / 2) * h;

    this.callbacks.onPopup({
      id: this.popupSeq++,
      text,
      subtext,
      x: THREE.MathUtils.clamp(x, 80, w - 80),
      y: THREE.MathUtils.clamp(y, 90, h - 140),
      color,
      createdAt: performance.now(),
    });
  }

  private emitHudSnapshot(
    nearestCharger: { x: number; z: number },
    nearestChargerDist: number,
    isCharging: boolean,
    isBoosting: boolean,
  ): void {
    const chargerBearing = Math.atan2(nearestCharger.x - this.playerX, nearestCharger.z - this.playerZ);
    const chargerRelAngle = chargerBearing - this.playerYaw;

    const chaseActive = this.crowd.length > 0;
    let policeDist: number | null = null;
    let policeAngle: number | null = null;
    if (chaseActive) {
      const np = this.getNearestPolice();
      policeDist = Math.round(np.dist);
      policeAngle = Math.atan2(np.station.x - this.playerX, np.station.z - this.playerZ) - this.playerYaw;
    }

    // Determine closest Dhaka district
    let curDistrict = DISTRICTS[0];
    let bestD = Infinity;
    for (const d of DISTRICTS) {
      const dd = Math.hypot(d.spawnX - this.playerX, d.spawnZ - this.playerZ);
      if (dd < bestD) {
        bestD = dd;
        curDistrict = d;
      }
    }

    const blips: MinimapBlip[] = [];
    for (const cs of this.world.chargingStations) {
      blips.push({ x: cs.x, z: cs.z, type: 'charger' });
    }
    if (chaseActive) {
      for (const ps of this.world.policeStations) {
        blips.push({ x: ps.x, z: ps.z, type: 'police' });
      }
    }
    for (const t of this.traffic) {
      if (t.smashed) continue;
      if (Math.hypot(t.x - this.playerX, t.z - this.playerZ) < 110) {
        blips.push({ x: t.x, z: t.z, type: t.isDangerous ? 'danger' : 'target' });
      }
    }
    for (const c of this.crowd) {
      blips.push({ x: c.x, z: c.z, type: 'crowd' });
    }
    if (this.gameMode === 'race') {
      blips.push({ x: this.checkpointX, z: this.checkpointZ, type: 'checkpoint' });
    }

    let clung = 0;
    for (const c of this.crowd) {
      if (c.state === 'clinging') clung++;
    }

    this.callbacks.onHudUpdate({
      score: this.score,
      combo: this.combo,
      comboTimerRatio: Math.max(0, this.comboTimer / 4.6),
      speedKmh: Math.round(Math.abs(this.speed) * 2.4),
      battery: Math.round(this.battery),
      isCharging,
      isBoosting,
      distanceMeters: Math.round(this.distanceMeters * 3),
      collisions: this.collisions,
      highestCombo: this.highestCombo,
      chasingCount: this.crowd.length,
      clungCount: clung,
      crowdEscapeCount: this.crowdEscapeCount,
      nearestChargerDist: Math.round(nearestChargerDist),
      nearestChargerAngle: chargerRelAngle,
      policeDist,
      policeAngle,
      policeActive: chaseActive,
      policeSettlingProgress: Math.min(1, this.policeSettleTimer / 1.1),
      playerX: this.playerX,
      playerZ: this.playerZ,
      playerYaw: this.playerYaw,
      cameraMode: this.cameraMode,
      districtNameBn: curDistrict.nameBn,
      districtNameEn: curDistrict.nameEn,
      raceTimeRemaining: this.raceTimeRemaining,
      raceCheckpointsDone: this.raceCheckpointsDone,
      raceCheckpointsTotal: this.raceCheckpointsTotal,
      challengeProgress: this.score,
      challengeTarget: this.challengeTarget,
      minimapBlips: blips,
    });
  }

  private endRun(reason: GameOverReason): void {
    this.sceneMode = 'gameover';
    this.audio.updateMotor(0, false, false);
    this.chargeCableLine.visible = false;

    const headlines: Record<GameOverReason, { bn: string; en: string }> = {
      bus_crash: {
        bn: 'দৈনিক ঢাকার ব্রেকিং: ডাবল-ডেকার বাসের সাথে অটোর মুখোমুখি টক্কর!',
        en: 'City Bus wins the lane argument against a fearless Easy Bike!',
      },
      truck_crash: {
        bn: 'যাত্রাবাড়ী হাইওয়েতে তুলকালাম: ট্রাকের বাম্পারে আটকে গেল ইজি বাইক!',
        en: 'Decorated cargo truck stops an unstoppable Dhaka Easy Bike run!',
      },
      crowd_caught: {
        bn: 'উত্তেজিত জনতার হাতেনাতে আটক: ৩ জন ঝুলে পড়ায় অটো থামল!',
        en: 'Three furious citizens clung onto the canopy until it gave in!',
      },
      crowd_stopped: {
        bn: 'জ্যামে ব্রেক চেপে বিপদ! জনতা ধরে ফেলেছে মায়ের দোয়া অটো!',
        en: 'Braking while chased proved costly as the Dhaka crowd caught up!',
      },
      battery_dead: {
        bn: 'চার্জ শূন্য! মাঝ রাস্তায় ব্যাটারি শেষ হয়ে ঠেলে নিতে হলো অটো!',
        en: 'Zero percent battery! Time to push the Easy Bike to the nearest pole!',
      },
      race_won: {
        bn: 'ঢাকা স্পিড চ্যাম্পিয়ন: রেকর্ড সময়ে সব চেকপয়েন্ট জয়!',
        en: 'Victory! Conquered Dhaka traffic in record checkpoint time!',
      },
      race_timeout: {
        bn: 'সময় শেষ! মিরপুরের জ্যামে আটকে গেল রেসের স্বপ্ন!',
        en: 'Time expired before reaching the final Dhaka checkpoint!',
      },
      challenge_won: {
        bn: 'চ্যালেঞ্জ কমপ্লিট! রাস্তায় নেমেই ন্যাশনাল লস টার্গেট পার!',
        en: 'Challenge target smashed! Unrivaled street chaos mastery!',
      },
    };

    const takaEarned =
      Math.floor(this.score * 0.08) +
      Math.floor(this.distanceMeters * 0.4) +
      (reason === 'race_won' ? 1500 : reason === 'challenge_won' ? 1200 : 100);

    this.callbacks.onGameOver({
      reason,
      mode: this.gameMode,
      districtId: this.districtId,
      finalScore: this.score,
      distanceMeters: Math.round(this.distanceMeters * 3),
      totalCollisions: this.collisions,
      highestCombo: this.highestCombo,
      batteryRemaining: Math.round(this.battery),
      crowdEscapeCount: this.crowdEscapeCount,
      takaEarned,
      isNewBest: false,
      headlineBn: headlines[reason].bn,
      subheadEn: headlines[reason].en,
      elapsedSeconds: Math.round(this.elapsedSeconds),
    });
  }

  private vibrate(ms: number): void {
    if (this.settings.vibrationEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(ms);
      } catch {
        // ignore unsupported
      }
    }
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);

    const dom = this.renderer.domElement;
    dom.removeEventListener('pointerdown', this.handlePointerDown);
    dom.removeEventListener('wheel', this.handleWheel);
    if (dom.parentElement) dom.parentElement.removeChild(dom);

    this.audio.dispose();
    this.scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material?.dispose();
        }
      }
    });
    this.renderer.dispose();
  }
}
