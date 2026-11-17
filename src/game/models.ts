import * as THREE from 'three';
import {
  createHoodArtTexture,
  createRearBoardTexture,
  createSeatTexture,
  createShopSignTexture,
} from './textures';
import { GarageConfig } from './types';

export type TrafficKind =
  | 'bus'
  | 'truck'
  | 'car'
  | 'cng'
  | 'rickshaw'
  | 'moto'
  | 'easybike'
  | 'pickup';

export type DestructibleKind = 'tea_stall' | 'fruit_cart' | 'barrier' | 'ad_stand';

export interface EasyBikeHandle {
  root: THREE.Group;
  bodyTilt: THREE.Group;
  frontFork: THREE.Group;
  handlebar: THREE.Group;
  wheels: THREE.Object3D[];
  brakeLightMats: THREE.MeshStandardMaterial[];
  ledMats: THREE.MeshStandardMaterial[];
  bodyMat: THREE.MeshStandardMaterial;
  trimMat: THREE.MeshStandardMaterial;
  seatMat: THREE.MeshStandardMaterial;
  hoodMat: THREE.MeshStandardMaterial;
  rearBoardMat: THREE.MeshStandardMaterial;
  batteryBar: THREE.Mesh;
  batteryBarMat: THREE.MeshStandardMaterial;
  driverTorso: THREE.Group;
  accGroups: {
    garland: THREE.Group;
    rack: THREE.Group;
    mirrors: THREE.Group;
  };
  chargePortPos: THREE.Vector3;
  applyConfig: (cfg: GarageConfig, anisotropy: number) => void;
}

function addContactShadow(
  parent: THREE.Object3D,
  tex: THREE.Texture,
  width: number,
  depth: number,
  opacity = 0.48,
): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(width, depth);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    opacity,
  });
  const shadow = new THREE.Mesh(geo, mat);
  shadow.position.y = 0.025;
  parent.add(shadow);
  return shadow;
}

function createWheel(radius: number, width: number, rimColor = 0xd1d5db): THREE.Group {
  const g = new THREE.Group();
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.88,
    metalness: 0.08,
  });
  const rimMat = new THREE.MeshStandardMaterial({
    color: rimColor,
    roughness: 0.28,
    metalness: 0.85,
  });

  const tire = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 16), tireMat);
  tire.rotation.z = Math.PI / 2;
  tire.castShadow = true;
  g.add(tire);

  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.56, radius * 0.56, width + 0.02, 12),
    rimMat,
  );
  rim.rotation.z = Math.PI / 2;
  g.add(rim);

  // Hub bolt visual so rotation is clearly legible
  const spoke = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.03, radius * 0.9, radius * 0.16),
    rimMat,
  );
  g.add(spoke);

  return g;
}

export function createEasyBikeModel(
  cfg: GarageConfig,
  anisotropy: number,
  shadowTex: THREE.Texture,
): EasyBikeHandle {
  const root = new THREE.Group();
  addContactShadow(root, shadowTex, 2.3, 3.6, 0.52);

  const bodyTilt = new THREE.Group();
  root.add(bodyTilt);

  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: cfg.bodyColor,
    roughness: 0.28,
    metalness: 0.35,
    clearcoat: 0.9,
    clearcoatRoughness: 0.14,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: cfg.trimColor,
    roughness: 0.32,
    metalness: 0.72,
  });
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.52,
    metalness: 0.78,
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.18,
    metalness: 0.92,
  });
  const ledMat = new THREE.MeshStandardMaterial({
    color: cfg.ledColor,
    emissive: cfg.ledColor,
    emissiveIntensity: 1.6,
    roughness: 0.2,
  });
  const seatMat = new THREE.MeshStandardMaterial({
    map: createSeatTexture(cfg.seatStyle, anisotropy),
    roughness: 0.82,
    metalness: 0.05,
  });
  const hoodMat = new THREE.MeshStandardMaterial({
    map: createHoodArtTexture(cfg.hoodArt, cfg.bodyColor, cfg.trimColor, anisotropy),
    roughness: 0.58,
    metalness: 0.12,
    side: THREE.DoubleSide,
  });
  const rearBoardMat = new THREE.MeshStandardMaterial({
    map: createRearBoardTexture(cfg.slogan, cfg.driverName, cfg.trimColor, anisotropy),
    roughness: 0.42,
    metalness: 0.15,
  });

  // 1. Chassis Floorboard & Undercarriage
  const floorboard = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.12, 2.55), darkMetalMat);
  floorboard.position.set(0, 0.38, -0.05);
  floorboard.castShadow = true;
  floorboard.receiveShadow = true;
  bodyTilt.add(floorboard);

  // Rear axle housing
  const rearAxle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.5, 10), darkMetalMat);
  rearAxle.rotation.z = Math.PI / 2;
  rearAxle.position.set(0, 0.3, -0.95);
  root.add(rearAxle);

  // 2. Wheels (3 wheels: 1 front steerable + 2 rear)
  const wheels: THREE.Object3D[] = [];
  const rearLeft = createWheel(0.3, 0.2, 0xfbbf24);
  rearLeft.position.set(-0.75, 0.3, -0.95);
  root.add(rearLeft);
  wheels.push(rearLeft);

  const rearRight = createWheel(0.3, 0.2, 0xfbbf24);
  rearRight.position.set(0.75, 0.3, -0.95);
  root.add(rearRight);
  wheels.push(rearRight);

  // Front Fork & Steerable Wheel Assembly
  const frontFork = new THREE.Group();
  frontFork.position.set(0, 0.3, 1.15);
  bodyTilt.add(frontFork);

  const frontWheel = createWheel(0.3, 0.19, 0xfbbf24);
  frontFork.add(frontWheel);
  wheels.push(frontWheel);

  const mudguard = new THREE.Mesh(
    new THREE.CylinderGeometry(0.36, 0.36, 0.22, 14, 1, true, -Math.PI * 0.35, Math.PI * 0.7),
    bodyMat,
  );
  mudguard.rotation.z = Math.PI / 2;
  mudguard.rotation.y = Math.PI / 2;
  frontFork.add(mudguard);

  const forkStem = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.92, 10), chromeMat);
  forkStem.position.set(0, 0.46, -0.05);
  forkStem.rotation.x = -0.18;
  frontFork.add(forkStem);

  // Handlebar (for Driver View + external read)
  const handlebar = new THREE.Group();
  handlebar.position.set(0, 0.92, -0.14);
  frontFork.add(handlebar);

  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.86, 10), chromeMat);
  bar.rotation.z = Math.PI / 2;
  handlebar.add(bar);

  [-0.38, 0.38].forEach((gx) => {
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.16, 10), darkMetalMat);
    grip.rotation.z = Math.PI / 2;
    grip.position.set(gx, 0, 0);
    handlebar.add(grip);
  });

  // 3. Sculpted Front Cowl, Windshield & Headlight
  const frontCowl = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.78, 0.56), bodyMat);
  frontCowl.position.set(0, 0.78, 0.92);
  frontCowl.rotation.x = -0.14;
  frontCowl.castShadow = true;
  bodyTilt.add(frontCowl);

  const frontTrim = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.12, 0.58), trimMat);
  frontTrim.position.set(0, 0.56, 0.96);
  bodyTilt.add(frontTrim);

  // Circular Headlight
  const headlightHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.12, 16), chromeMat);
  headlightHousing.rotation.x = Math.PI / 2;
  headlightHousing.position.set(0, 0.82, 1.22);
  bodyTilt.add(headlightHousing);

  const headlightLens = new THREE.Mesh(
    new THREE.CircleGeometry(0.12, 16),
    new THREE.MeshStandardMaterial({
      color: 0xfef9c3,
      emissive: 0xfef08a,
      emissiveIntensity: 2.0,
    }),
  );
  headlightLens.position.set(0, 0.82, 1.285);
  bodyTilt.add(headlightLens);

  // Windshield Frame + Glass
  const windshieldMat = new THREE.MeshPhysicalMaterial({
    color: 0xdbeafe,
    roughness: 0.08,
    metalness: 0.1,
    transparent: true,
    opacity: 0.38,
  });
  const windshield = new THREE.Mesh(new THREE.PlaneGeometry(1.06, 0.66), windshieldMat);
  windshield.position.set(0, 1.44, 0.78);
  windshield.rotation.x = -0.22;
  bodyTilt.add(windshield);

  // 4. Dashboard & Digital Battery Meter (visible in Driver View!)
  const dashBox = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.16, 0.22), darkMetalMat);
  dashBox.position.set(0, 1.06, 0.76);
  dashBox.rotation.x = -0.35;
  bodyTilt.add(dashBox);

  const batteryBarMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    emissive: 0x22c55e,
    emissiveIntensity: 1.4,
  });
  const batteryBar = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.05, 0.03), batteryBarMat);
  batteryBar.position.set(0, 1.09, 0.66);
  bodyTilt.add(batteryBar);

  // 5. Rear Passenger Cabin + Seats + Side Guards + Rear Slogan Board
  const rearLowerBody = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.62, 1.38), bodyMat);
  rearLowerBody.position.set(0, 0.68, -0.78);
  rearLowerBody.castShadow = true;
  bodyTilt.add(rearLowerBody);

  // Side passenger cutouts / cushioned benches
  const rearSeat = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.16, 0.56), seatMat);
  rearSeat.position.set(0, 0.76, -1.08);
  bodyTilt.add(rearSeat);

  const rearBackrest = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.52, 0.14), seatMat);
  rearBackrest.position.set(0, 1.02, -1.36);
  bodyTilt.add(rearBackrest);

  const driverSeat = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.14, 0.42), seatMat);
  driverSeat.position.set(0, 0.68, 0.26);
  bodyTilt.add(driverSeat);

  // Rear Slogan & Driver Nameboard
  const rearBoard = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.58, 0.05), rearBoardMat);
  rearBoard.position.set(0, 1.04, -1.49);
  bodyTilt.add(rearBoard);

  // Brake Lights (left & right)
  const brakeLightMats: THREE.MeshStandardMaterial[] = [];
  [-0.56, 0.56].forEach((bx) => {
    const bMat = new THREE.MeshStandardMaterial({
      color: 0x991b1b,
      emissive: 0xef4444,
      emissiveIntensity: 0.45,
      roughness: 0.25,
    });
    brakeLightMats.push(bMat);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.06), bMat);
    lamp.position.set(bx, 0.62, -1.49);
    bodyTilt.add(lamp);
  });

  // 6. Canopy Pillars & Rickshaw-Art Roof
  const pillarPositions = [
    [-0.56, 0.72],
    [0.56, 0.72],
    [-0.64, -0.15],
    [0.64, -0.15],
    [-0.64, -1.38],
    [0.64, -1.38],
  ];
  pillarPositions.forEach(([px, pz]) => {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.15, 8), chromeMat);
    pillar.position.set(px, 1.38, pz);
    pillar.castShadow = true;
    bodyTilt.add(pillar);
  });

  const roofBase = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.08, 2.28), bodyMat);
  roofBase.position.set(0, 1.94, -0.34);
  roofBase.castShadow = true;
  bodyTilt.add(roofBase);

  // Hood artwork decal on top of canopy
  const hoodArtPlane = new THREE.Mesh(new THREE.PlaneGeometry(1.34, 2.16), hoodMat);
  hoodArtPlane.rotation.x = -Math.PI / 2;
  hoodArtPlane.position.set(0, 1.985, -0.34);
  bodyTilt.add(hoodArtPlane);

  // 7. LED Neon Strips (sides + rear)
  const ledMats: THREE.MeshStandardMaterial[] = [ledMat];
  [-0.72, 0.72].forEach((lx) => {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 2.18), ledMat);
    strip.position.set(lx, 1.9, -0.34);
    bodyTilt.add(strip);

    const underStrip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 2.1), ledMat);
    underStrip.position.set(lx * 0.94, 0.34, -0.15);
    bodyTilt.add(underStrip);
  });
  const rearLed = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.045, 0.045), ledMat);
  rearLed.position.set(0, 1.36, -1.49);
  bodyTilt.add(rearLed);

  // 8. Driver Character seated at front
  const driverTorso = new THREE.Group();
  driverTorso.position.set(0, 0.76, 0.26);
  bodyTilt.add(driverTorso);

  const shirtMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.78 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xc68642, roughness: 0.72 });
  const capMat = new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.7 });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.46, 0.24), shirtMat);
  torso.position.y = 0.25;
  torso.castShadow = true;
  driverTorso.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), skinMat);
  head.position.y = 0.6;
  driverTorso.add(head);

  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.14, 0.07, 12), capMat);
  cap.position.y = 0.69;
  driverTorso.add(cap);

  [-0.22, 0.22].forEach((ax) => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.44), shirtMat);
    arm.position.set(ax, 0.36, 0.24);
    arm.rotation.x = 0.18;
    driverTorso.add(arm);
  });

  // 9. Optional Customizable Accessories
  // A) Marigold Garland & Brass Bells
  const garland = new THREE.Group();
  const marigoldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.6 });
  const redRoseMat = new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.6 });
  for (let i = -3; i <= 3; i++) {
    const flower = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 8, 8),
      i % 2 === 0 ? marigoldMat : redRoseMat,
    );
    flower.position.set(i * 0.15, 1.88 - Math.cos(i * 0.4) * 0.08, 0.74);
    garland.add(flower);
  }
  bodyTilt.add(garland);

  // B) Roof Luggage Rack
  const rack = new THREE.Group();
  const rackFrame = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 1.3), chromeMat);
  rackFrame.position.set(0, 2.04, -0.55);
  rack.add(rackFrame);
  bodyTilt.add(rack);

  // C) Dual Chrome Side Mirrors
  const mirrors = new THREE.Group();
  [-0.64, 0.64].forEach((mx) => {
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.22, 6), chromeMat);
    stalk.position.set(mx, 1.24, 0.74);
    stalk.rotation.z = mx < 0 ? 0.5 : -0.5;
    mirrors.add(stalk);

    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, 0.03), chromeMat);
    glass.position.set(mx + (mx < 0 ? -0.09 : 0.09), 1.33, 0.74);
    mirrors.add(glass);
  });
  bodyTilt.add(mirrors);

  const syncAccessoryVisibility = (acc: GarageConfig['accessory']) => {
    garland.visible = acc === 'garland_bells';
    rack.visible = acc === 'roof_rack';
    mirrors.visible = acc === 'chrome_mirrors';
  };
  syncAccessoryVisibility(cfg.accessory);

  const applyConfig = (next: GarageConfig, nextAniso: number) => {
    bodyMat.color.set(next.bodyColor);
    trimMat.color.set(next.trimColor);
    ledMat.color.set(next.ledColor);
    ledMat.emissive.set(next.ledColor);

    if (seatMat.map) seatMat.map.dispose();
    seatMat.map = createSeatTexture(next.seatStyle, nextAniso);
    seatMat.needsUpdate = true;

    if (hoodMat.map) hoodMat.map.dispose();
    hoodMat.map = createHoodArtTexture(next.hoodArt, next.bodyColor, next.trimColor, nextAniso);
    hoodMat.needsUpdate = true;

    if (rearBoardMat.map) rearBoardMat.map.dispose();
    rearBoardMat.map = createRearBoardTexture(next.slogan, next.driverName, next.trimColor, nextAniso);
    rearBoardMat.needsUpdate = true;

    syncAccessoryVisibility(next.accessory);
  };

  return {
    root,
    bodyTilt,
    frontFork,
    handlebar,
    wheels,
    brakeLightMats,
    ledMats,
    bodyMat,
    trimMat,
    seatMat,
    hoodMat,
    rearBoardMat,
    batteryBar,
    batteryBarMat,
    driverTorso,
    accGroups: { garland, rack, mirrors },
    chargePortPos: new THREE.Vector3(-0.72, 0.72, -0.5),
    applyConfig,
  };
}

export interface TrafficVisual {
  group: THREE.Group;
  wheels: THREE.Object3D[];
}

export function createTrafficVehicleModel(
  kind: TrafficKind,
  shadowTex: THREE.Texture,
): TrafficVisual {
  const g = new THREE.Group();
  const wheels: THREE.Object3D[] = [];

  const metalDark = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.65, metalness: 0.45 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xbae6fd,
    roughness: 0.12,
    metalness: 0.55,
  });
  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfef08a,
    emissiveIntensity: 1.4,
  });
  const taillightMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xdc2626,
    emissiveIntensity: 0.8,
  });

  const addWheelPair = (z: number, xOffset: number, radius: number, width: number) => {
    [-xOffset, xOffset].forEach((x) => {
      const w = createWheel(radius, width);
      w.position.set(x, radius, z);
      g.add(w);
      wheels.push(w);
    });
  };

  if (kind === 'bus') {
    addContactShadow(g, shadowTex, 3.3, 9.6, 0.58);
    const busPalette = [0xdc2626, 0x059669, 0x2563eb];
    const color = busPalette[Math.floor(Math.random() * busPalette.length)];
    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.38, metalness: 0.25 });
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 });

    const hull = new THREE.Mesh(new THREE.BoxGeometry(2.55, 2.7, 8.6), bodyMat);
    hull.position.y = 1.85;
    hull.castShadow = true;
    g.add(hull);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.34, 8.64), stripeMat);
    stripe.position.y = 1.45;
    g.add(stripe);

    const windshield = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.0, 0.1), glassMat);
    windshield.position.set(0, 2.35, 4.3);
    g.add(windshield);

    const sideWindows = new THREE.Mesh(new THREE.BoxGeometry(2.58, 0.72, 7.2), glassMat);
    sideWindows.position.set(0, 2.42, -0.2);
    g.add(sideWindows);

    // Hazard front bumper
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.62, 0.34, 0.32), metalDark);
    bumper.position.set(0, 0.62, 4.32);
    g.add(bumper);

    // Roof AC unit
    const roofAc = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.28, 3.4), metalDark);
    roofAc.position.set(0, 3.34, 0);
    g.add(roofAc);

    [-0.95, 0.95].forEach((hx) => {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 0.1), headlightMat);
      hl.position.set(hx, 0.98, 4.32);
      g.add(hl);
    });

    addWheelPair(2.7, 1.18, 0.48, 0.32);
    addWheelPair(-2.6, 1.18, 0.48, 0.32);
  } else if (kind === 'truck') {
    addContactShadow(g, shadowTex, 3.1, 8.4, 0.56);
    const cabMat = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.35, metalness: 0.35 });
    const cargoMat = new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.72, metalness: 0.1 });
    const decorMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.5 });

    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.35, 1.85, 2.2), cabMat);
    cab.position.set(0, 1.48, 2.45);
    cab.castShadow = true;
    g.add(cab);

    const cabWindshield = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.72, 0.1), glassMat);
    cabWindshield.position.set(0, 1.85, 3.55);
    g.add(cabWindshield);

    // Tall decorated Bangladeshi wooden truck crown above cab
    const crown = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.55, 1.1), decorMat);
    crown.position.set(0, 2.65, 2.55);
    g.add(crown);

    // Cargo bed
    const cargo = new THREE.Mesh(new THREE.BoxGeometry(2.45, 2.1, 4.9), cargoMat);
    cargo.position.set(0, 1.75, -1.2);
    cargo.castShadow = true;
    g.add(cargo);

    const cargoTrim = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.35, 4.94), decorMat);
    cargoTrim.position.set(0, 2.55, -1.2);
    g.add(cargoTrim);

    [-0.85, 0.85].forEach((hx) => {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.2, 0.1), headlightMat);
      hl.position.set(hx, 0.9, 3.56);
      g.add(hl);
    });

    addWheelPair(2.4, 1.12, 0.46, 0.3);
    addWheelPair(-1.6, 1.12, 0.46, 0.32);
    addWheelPair(-2.8, 1.12, 0.46, 0.32);
  } else if (kind === 'car') {
    addContactShadow(g, shadowTex, 2.3, 4.5, 0.46);
    const carColors = [0xf8fafc, 0x94a3b8, 0x1d4ed8, 0xb91c1c, 0x111827];
    const carMat = new THREE.MeshPhysicalMaterial({
      color: carColors[Math.floor(Math.random() * carColors.length)],
      roughness: 0.22,
      metalness: 0.55,
      clearcoat: 0.85,
    });

    const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.62, 4.1), carMat);
    chassis.position.y = 0.62;
    chassis.castShadow = true;
    g.add(chassis);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.56, 2.05), carMat);
    cabin.position.set(0, 1.18, -0.15);
    cabin.castShadow = true;
    g.add(cabin);

    const windows = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.44, 1.85), glassMat);
    windows.position.set(0, 1.18, -0.15);
    g.add(windows);

    [-0.65, 0.65].forEach((hx) => {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.14, 0.08), headlightMat);
      hl.position.set(hx, 0.66, 2.06);
      g.add(hl);
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.14, 0.08), taillightMat);
      tl.position.set(hx, 0.66, -2.06);
      g.add(tl);
    });

    addWheelPair(1.25, 0.86, 0.32, 0.22);
    addWheelPair(-1.25, 0.86, 0.32, 0.22);
  } else if (kind === 'cng') {
    addContactShadow(g, shadowTex, 1.9, 3.0, 0.45);
    const cngGreen = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.35, metalness: 0.3 });
    const canopyYellow = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.72 });

    const nose = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.75, 0.75), cngGreen);
    nose.position.set(0, 0.64, 0.78);
    nose.castShadow = true;
    g.add(nose);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.68, 1.32), cngGreen);
    cabin.position.set(0, 0.62, -0.34);
    cabin.castShadow = true;
    g.add(cabin);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.65, 1.75), canopyYellow);
    roof.position.set(0, 1.32, -0.18);
    roof.castShadow = true;
    g.add(roof);

    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.48, 0.08), glassMat);
    windshield.position.set(0, 1.24, 0.72);
    g.add(windshield);

    const fw = createWheel(0.26, 0.16);
    fw.position.set(0, 0.26, 0.92);
    g.add(fw);
    wheels.push(fw);
    addWheelPair(-0.68, 0.68, 0.26, 0.18);
  } else if (kind === 'rickshaw') {
    addContactShadow(g, shadowTex, 1.6, 2.7, 0.42);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.45, metalness: 0.5 });
    const hoodMat = new THREE.MeshStandardMaterial({ color: 0xdb2777, roughness: 0.65 });
    const seatMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.75 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.42, 0.95), frameMat);
    body.position.set(0, 0.56, -0.45);
    g.add(body);

    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.22, 0.5), seatMat);
    seat.position.set(0, 0.85, -0.45);
    g.add(seat);

    const hood = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.65, 0.82), hoodMat);
    hood.position.set(0, 1.32, -0.58);
    hood.rotation.x = -0.22;
    g.add(hood);

    // Puller character
    const puller = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.68, 0.22),
      new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.8 }),
    );
    puller.position.set(0, 1.05, 0.35);
    g.add(puller);

    const pHead = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xb47b44, roughness: 0.75 }),
    );
    pHead.position.set(0, 1.5, 0.38);
    g.add(pHead);

    const fw = createWheel(0.32, 0.08);
    fw.position.set(0, 0.32, 0.76);
    g.add(fw);
    wheels.push(fw);
    addWheelPair(-0.56, 0.55, 0.32, 0.08);
  } else if (kind === 'moto') {
    addContactShadow(g, shadowTex, 1.0, 2.2, 0.38);
    const bikeMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.25, metalness: 0.7 });
    const tank = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.42, 1.15), bikeMat);
    tank.position.set(0, 0.68, 0);
    g.add(tank);

    const rider = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.6, 0.24),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 }),
    );
    rider.position.set(0, 1.12, -0.08);
    rider.rotation.x = 0.25;
    g.add(rider);

    const helmet = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2, metalness: 0.5 }),
    );
    helmet.position.set(0, 1.52, 0.02);
    g.add(helmet);

    const fw = createWheel(0.28, 0.12);
    fw.position.set(0, 0.28, 0.62);
    g.add(fw);
    wheels.push(fw);
    const rw = createWheel(0.28, 0.14);
    rw.position.set(0, 0.28, -0.62);
    g.add(rw);
    wheels.push(rw);
  } else if (kind === 'pickup') {
    addContactShadow(g, shadowTex, 2.3, 4.8, 0.48);
    const pickMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.38, metalness: 0.35 });
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.86, 1.25, 1.75), pickMat);
    cab.position.set(0, 1.05, 1.05);
    cab.castShadow = true;
    g.add(cab);

    const bed = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.65, 2.35), pickMat);
    bed.position.set(0, 0.74, -0.95);
    bed.castShadow = true;
    g.add(bed);

    const win = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.54, 0.08), glassMat);
    win.position.set(0, 1.28, 1.93);
    g.add(win);

    addWheelPair(1.3, 0.88, 0.34, 0.22);
    addWheelPair(-1.3, 0.88, 0.34, 0.22);
  } else {
    // Rival Easy Bike
    addContactShadow(g, shadowTex, 2.0, 3.2, 0.45);
    const ebColors = [0x0ea5e9, 0x9333ea, 0xe11d48, 0x16a34a];
    const ebMat = new THREE.MeshStandardMaterial({
      color: ebColors[Math.floor(Math.random() * ebColors.length)],
      roughness: 0.35,
      metalness: 0.3,
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.68, 2.2), ebMat);
    body.position.set(0, 0.64, -0.1);
    body.castShadow = true;
    g.add(body);

    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(1.32, 0.08, 2.0),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.5 }),
    );
    roof.position.set(0, 1.84, -0.2);
    g.add(roof);

    [-0.56, 0.56].forEach((px) => {
      const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.1, 6), metalDark);
      p1.position.set(px, 1.3, 0.72);
      g.add(p1);
      const p2 = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.1, 6), metalDark);
      p2.position.set(px, 1.3, -1.05);
      g.add(p2);
    });

    const fw = createWheel(0.28, 0.16);
    fw.position.set(0, 0.28, 1.0);
    g.add(fw);
    wheels.push(fw);
    addWheelPair(-0.85, 0.66, 0.28, 0.16);
  }

  return { group: g, wheels };
}

export function createDestructiblePropModel(
  kind: DestructibleKind,
  shadowTex: THREE.Texture,
  anisotropy: number,
): THREE.Group {
  const g = new THREE.Group();

  if (kind === 'tea_stall') {
    addContactShadow(g, shadowTex, 3.0, 2.4, 0.45);
    const wood = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 });
    const tarp = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.75 });
    const steel = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.3, metalness: 0.8 });

    const counter = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.95, 1.1), wood);
    counter.position.set(0, 0.48, 0);
    counter.castShadow = true;
    g.add(counter);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.08, 1.7), tarp);
    roof.position.set(0, 2.25, 0.15);
    roof.rotation.x = 0.12;
    g.add(roof);

    [-1.05, 1.05].forEach((px) => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.25, 6), wood);
      pole.position.set(px, 1.12, -0.45);
      g.add(pole);
    });

    const signMat = new THREE.MeshStandardMaterial({
      map: createShopSignTexture('মামা চা স্টল', 'MAMA TEA STALL', '#0f766e', anisotropy),
      roughness: 0.5,
    });
    const sign = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.55, 0.06), signMat);
    sign.position.set(0, 1.9, 0.6);
    g.add(sign);

    // Kettle + biscuit jars
    const kettle = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.24, 10), steel);
    kettle.position.set(-0.5, 1.08, 0.15);
    g.add(kettle);
  } else if (kind === 'fruit_cart') {
    addContactShadow(g, shadowTex, 2.5, 1.8, 0.42);
    const wood = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.82 });
    const bed = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.25, 1.25), wood);
    bed.position.set(0, 0.72, 0);
    bed.castShadow = true;
    g.add(bed);

    const umbrella = new THREE.Mesh(
      new THREE.ConeGeometry(1.35, 0.48, 8),
      new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.7 }),
    );
    umbrella.position.set(0, 2.15, 0);
    g.add(umbrella);

    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 1.5, 6),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.7, roughness: 0.3 }),
    );
    pole.position.set(0, 1.4, 0);
    g.add(pole);

    // Colorful fruit piles
    [0xfacc15, 0x22c55e, 0xf97316].forEach((col, i) => {
      const pile = new THREE.Mesh(
        new THREE.SphereGeometry(0.24, 10, 8),
        new THREE.MeshStandardMaterial({ color: col, roughness: 0.55 }),
      );
      pile.position.set((i - 1) * 0.58, 0.96, 0);
      g.add(pile);
    });

    const w1 = createWheel(0.32, 0.1);
    w1.position.set(-0.85, 0.32, 0);
    g.add(w1);
    const w2 = createWheel(0.32, 0.1);
    w2.position.set(0.85, 0.32, 0);
    g.add(w2);
  } else if (kind === 'barrier') {
    addContactShadow(g, shadowTex, 2.1, 0.8, 0.35);
    const orangeMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.45 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.45 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.58, 0.48), orangeMat);
    base.position.y = 0.29;
    base.castShadow = true;
    g.add(base);

    const top = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.28, 0.42), whiteMat);
    top.position.y = 0.72;
    g.add(top);
  } else {
    addContactShadow(g, shadowTex, 1.6, 1.2, 0.36);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.6, roughness: 0.4 });
    const boardMat = new THREE.MeshStandardMaterial({
      map: createShopSignTexture('বিকাশ / রিচার্জ', 'MEGA OFFER 24/7', '#db2777', anisotropy),
      roughness: 0.45,
    });
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.45, 0.1), boardMat);
    board.position.y = 0.9;
    board.castShadow = true;
    g.add(board);

    [-0.5, 0.5].forEach((lx) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 0.55), frameMat);
      leg.position.set(lx, 0.45, 0);
      g.add(leg);
    });
  }

  return g;
}

export interface CrowdNpcHandle {
  group: THREE.Group;
  torsoPivot: THREE.Group;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  alertMark: THREE.Mesh;
}

const npcGeoCache = (() => {
  const legGeo = new THREE.BoxGeometry(0.14, 0.56, 0.14);
  legGeo.translate(0, -0.28, 0);
  return {
    legGeo,
    torsoGeo: new THREE.BoxGeometry(0.42, 0.54, 0.24),
    headGeo: new THREE.SphereGeometry(0.145, 8, 6),
    hairGeo: new THREE.SphereGeometry(0.15, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.55),
    armGeo: new THREE.BoxGeometry(0.11, 0.46, 0.11),
    stickGeo: new THREE.CylinderGeometry(0.025, 0.032, 0.85, 6),
    alertGeo: new THREE.ConeGeometry(0.11, 0.28, 6),
    skinMat: new THREE.MeshStandardMaterial({ color: 0xc68642, roughness: 0.72 }),
    hairMat: new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 }),
    stickMat: new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.8 }),
    alertMat: new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xef4444,
      emissiveIntensity: 1.0,
    }),
    colorMatCache: new Map<string, THREE.MeshStandardMaterial>(),
  };
})();

function getNpcClothMat(hex: number, roughness: number): THREE.MeshStandardMaterial {
  const key = `${hex}_${roughness}`;
  let m = npcGeoCache.colorMatCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color: hex, roughness });
    npcGeoCache.colorMatCache.set(key, m);
  }
  return m;
}

export function createCrowdNpcModel(
  shirtHex: number,
  lungiHex: number,
  shadowTex: THREE.Texture,
  isAngry = true,
): CrowdNpcHandle {
  const group = new THREE.Group();
  addContactShadow(group, shadowTex, 0.95, 0.95, 0.38);

  const shirtMat = getNpcClothMat(shirtHex, 0.78);
  const lungiMat = getNpcClothMat(lungiHex, 0.85);

  // Legs pivoted at hip so running swings cleanly
  const leftLeg = new THREE.Mesh(npcGeoCache.legGeo, lungiMat);
  leftLeg.position.set(-0.1, 0.56, 0);
  group.add(leftLeg);

  const rightLeg = new THREE.Mesh(npcGeoCache.legGeo, lungiMat);
  rightLeg.position.set(0.1, 0.56, 0);
  group.add(rightLeg);

  // Upper body pivot for leaning/punching lunges
  const torsoPivot = new THREE.Group();
  torsoPivot.position.set(0, 0.56, 0);
  group.add(torsoPivot);

  const torso = new THREE.Mesh(npcGeoCache.torsoGeo, shirtMat);
  torso.position.y = 0.27;
  torso.castShadow = true;
  torsoPivot.add(torso);

  const head = new THREE.Mesh(npcGeoCache.headGeo, npcGeoCache.skinMat);
  head.position.y = 0.68;
  torsoPivot.add(head);

  const hair = new THREE.Mesh(npcGeoCache.hairGeo, npcGeoCache.hairMat);
  hair.position.y = 0.7;
  torsoPivot.add(hair);

  // Hinged Shoulder Arm Groups (pivot at shoulder y=0.48)
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.27, 0.48, 0);
  const lMesh = new THREE.Mesh(npcGeoCache.armGeo, shirtMat);
  lMesh.position.y = -0.2;
  leftArm.add(lMesh);
  torsoPivot.add(leftArm);

  const rightArm = new THREE.Group();
  rightArm.position.set(0.27, 0.48, 0);
  const rMesh = new THREE.Mesh(npcGeoCache.armGeo, shirtMat);
  rMesh.position.y = -0.2;
  rightArm.add(rMesh);

  // Comic bamboo stick / broom in right hand for angry crowd NPCs!
  if (isAngry) {
    const stick = new THREE.Mesh(npcGeoCache.stickGeo, npcGeoCache.stickMat);
    stick.rotation.x = Math.PI / 2;
    stick.position.set(0, -0.4, 0.36);
    rightArm.add(stick);
  }
  torsoPivot.add(rightArm);

  // Comic angry red exclamation mark above head
  const alertMark = new THREE.Mesh(npcGeoCache.alertGeo, npcGeoCache.alertMat);
  alertMark.rotation.x = Math.PI;
  alertMark.position.y = 1.08;
  alertMark.visible = isAngry;
  torsoPivot.add(alertMark);

  return { group, torsoPivot, leftLeg, rightLeg, leftArm, rightArm, alertMark };
}

export function createChargingStationModel(
  shadowTex: THREE.Texture,
  anisotropy: number,
): THREE.Group {
  const g = new THREE.Group();
  addContactShadow(g, shadowTex, 6.5, 6.5, 0.28);

  const poleMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.55, metalness: 0.6 });
  const yellowMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0xeab308,
    emissiveIntensity: 0.6,
    roughness: 0.35,
  });

  // Electric pole beside the road
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 6.2, 8), poleMat);
  pole.position.set(-2.4, 3.1, 0);
  pole.castShadow = true;
  g.add(pole);

  const transformer = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.0, 0.65), poleMat);
  transformer.position.set(-2.4, 4.4, 0);
  g.add(transformer);

  // Glowing yellow charging kiosk box + sign
  const kiosk = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.6, 0.55), yellowMat);
  kiosk.position.set(-1.9, 0.8, 0);
  g.add(kiosk);

  const signMat = new THREE.MeshStandardMaterial({
    map: createShopSignTexture('ইলেকট্রিক চার্জিং', 'FAST EV CHARGE ⚡', '#ca8a04', anisotropy),
    roughness: 0.4,
  });
  const sign = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.68, 0.1), signMat);
  sign.position.set(-2.1, 2.5, 0);
  g.add(sign);

  // Ground luminous charging zone ring
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(2.6, 3.1, 32),
    new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(0.4, 0.04, 0);
  g.add(ring);

  return g;
}

export function createPoliceBoxModel(
  shadowTex: THREE.Texture,
  anisotropy: number,
): THREE.Group {
  const g = new THREE.Group();
  addContactShadow(g, shadowTex, 6.0, 6.0, 0.32);

  const blueMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.42 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.45 });

  // Traffic Police Booth
  const booth = new THREE.Mesh(new THREE.BoxGeometry(1.7, 2.1, 1.7), whiteMat);
  booth.position.set(-2.6, 1.05, 0);
  booth.castShadow = true;
  g.add(booth);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.55, 0.65, 4), blueMat);
  roof.rotation.y = Math.PI / 4;
  roof.position.set(-2.6, 2.42, 0);
  g.add(roof);

  const signMat = new THREE.MeshStandardMaterial({
    map: createShopSignTexture('ট্রাফিক পুলিশ বক্স', 'SETTLEMENT DESK', '#1e40af', anisotropy),
    roughness: 0.4,
  });
  const sign = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.55, 0.08), signMat);
  sign.position.set(-2.6, 1.75, 0.88);
  g.add(sign);

  // Traffic Officer NPC standing outside
  const officerTorso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.56, 0.24), blueMat);
  officerTorso.position.set(-1.3, 0.92, 0.4);
  g.add(officerTorso);

  const officerHead = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xc68642, roughness: 0.7 }),
  );
  officerHead.position.set(-1.3, 1.34, 0.4);
  g.add(officerHead);

  // Settlement Zone Circle
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(2.8, 3.35, 32),
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.88,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(0.5, 0.045, 0);
  g.add(ring);

  return g;
}
