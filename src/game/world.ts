import * as THREE from 'three';
import {
  createChargingStationModel,
  createDestructiblePropModel,
  createPoliceBoxModel,
  DestructibleKind,
} from './models';
import {
  createCurbTexture,
  createGroundGrassTexture,
  createRoadAsphaltTexture,
  createRoadSignTexture,
  createShopSignTexture,
  createSidewalkTexture,
} from './textures';
import { DISTRICTS } from './types';

export interface BuildingCollider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface DestructibleEntity {
  id: number;
  kind: DestructibleKind;
  mesh: THREE.Group;
  x: number;
  z: number;
  origX: number;
  origY: number;
  origZ: number;
  origRotY: number;
  radius: number;
  points: number;
  smashed: boolean;
  respawnTimer: number;
  vx: number;
  vy: number;
  vz: number;
  spinX: number;
  spinZ: number;
}

export interface StationPoint {
  id: string;
  x: number;
  z: number;
  districtName: string;
  group: THREE.Group;
}

export interface RoadLane {
  axis: 'x' | 'z';
  coord: number;
  dir: 1 | -1;
}

export interface FootpathLoop {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface DhakaWorld {
  root: THREE.Group;
  colliders: BuildingCollider[];
  destructibles: DestructibleEntity[];
  chargingStations: StationPoint[];
  policeStations: StationPoint[];
  roadLanes: RoadLane[];
  footpathLoops: FootpathLoop[];
  metroTrain: THREE.Group;
  riverWater: THREE.Mesh;
  checkpointRing: THREE.Mesh;
  roadCoords: number[];
  roadHalfWidth: number;
  isOnFootpath: (x: number, z: number) => boolean;
}

export function buildDhakaWorld(
  anisotropy: number,
  shadowTex: THREE.Texture,
): DhakaWorld {
  const root = new THREE.Group();
  const colliders: BuildingCollider[] = [];
  const destructibles: DestructibleEntity[] = [];
  const chargingStations: StationPoint[] = [];
  const policeStations: StationPoint[] = [];
  const footpathLoops: FootpathLoop[] = [];

  // Expanded 5x5 dense Dhaka road grid (25 intersections!)
  const roadCoords = [-240, -120, 0, 120, 240];
  const roadWidth = 20;
  const roadHalfWidth = roadWidth / 2;
  const roadSpan = 660;
  const footpathHeight = 0.24;

  // Helper: check if (x, z) is on a raised city-block footpath
  const isOnFootpath = (x: number, z: number): boolean => {
    if (Math.abs(x) > 250 || Math.abs(z) > 250) return false;
    for (let i = 0; i < roadCoords.length; i++) {
      if (Math.abs(x - roadCoords[i]) <= roadHalfWidth + 0.35) return false;
      if (Math.abs(z - roadCoords[i]) <= roadHalfWidth + 0.35) return false;
    }
    return true;
  };

  // 1. Extended Ground Plane (natural horizon, zero boxed-in walls)
  const grassTex = createGroundGrassTexture(anisotropy);
  const groundMat = new THREE.MeshStandardMaterial({
    map: grassTex,
    roughness: 0.92,
    metalness: 0.02,
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1500, 1500), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  root.add(ground);

  // 2. Buriganga River & Steel Arch Bridge Zone (Southwest near X=-120, Z=120)
  const riverMat = new THREE.MeshStandardMaterial({
    color: 0x0e7490,
    roughness: 0.18,
    metalness: 0.65,
  });
  const riverWater = new THREE.Mesh(new THREE.PlaneGeometry(110, 76), riverMat);
  riverWater.rotation.x = -Math.PI / 2;
  riverWater.position.set(-180, 0.02, 120);
  root.add(riverWater);

  const bridgeSteel = new THREE.MeshStandardMaterial({
    color: 0xe11d48,
    roughness: 0.35,
    metalness: 0.72,
  });
  [-11, 11].forEach((sideZ) => {
    for (let xOff = -36; xOff <= 36; xOff += 18) {
      const arch = new THREE.Mesh(
        new THREE.TorusGeometry(8.5, 0.42, 8, 16, Math.PI),
        bridgeSteel,
      );
      arch.position.set(-180 + xOff, 0.2, 120 + sideZ);
      root.add(arch);
    }
  });

  // 3. Connected 5x5 Dhaka Asphalt Road Strips
  const roadTex = createRoadAsphaltTexture(anisotropy);
  const roadTexNS = roadTex.clone();
  roadTexNS.needsUpdate = true;
  roadTexNS.repeat.set(1, 28);
  const roadMatNS = new THREE.MeshStandardMaterial({
    map: roadTexNS,
    roughness: 0.78,
    metalness: 0.06,
  });

  const roadTexEW = roadTex.clone();
  roadTexEW.needsUpdate = true;
  roadTexEW.repeat.set(1, 28);
  const roadMatEW = new THREE.MeshStandardMaterial({
    map: roadTexEW,
    roughness: 0.78,
    metalness: 0.06,
  });

  const roadLanes: RoadLane[] = [];

  roadCoords.forEach((cx) => {
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(roadWidth, roadSpan), roadMatNS);
    strip.rotation.x = -Math.PI / 2;
    strip.position.set(cx, 0.03, 0);
    strip.receiveShadow = true;
    root.add(strip);

    roadLanes.push({ axis: 'z', coord: cx - 5.8, dir: 1 });
    roadLanes.push({ axis: 'z', coord: cx - 2.6, dir: 1 });
    roadLanes.push({ axis: 'z', coord: cx + 2.6, dir: -1 });
    roadLanes.push({ axis: 'z', coord: cx + 5.8, dir: -1 });
  });

  roadCoords.forEach((cz) => {
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(roadWidth, roadSpan), roadMatEW);
    strip.rotation.x = -Math.PI / 2;
    strip.rotation.z = Math.PI / 2;
    strip.position.set(0, 0.034, cz);
    strip.receiveShadow = true;
    root.add(strip);

    roadLanes.push({ axis: 'x', coord: cz - 5.8, dir: -1 });
    roadLanes.push({ axis: 'x', coord: cz - 2.6, dir: -1 });
    roadLanes.push({ axis: 'x', coord: cz + 2.6, dir: 1 });
    roadLanes.push({ axis: 'x', coord: cz + 5.8, dir: 1 });
  });

  // Zebra Crosswalks at intersections (single InstancedMesh for crisp performance)
  const zebraMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.65 });
  const zebraGeo = new THREE.PlaneGeometry(1.1, 3.8);
  zebraGeo.rotateX(-Math.PI / 2);
  const zebraPositions: Array<[number, number]> = [];
  roadCoords.forEach((ix) => {
    roadCoords.forEach((iz) => {
      if (ix === 0 && iz === 0) return;
      for (let s = -6; s <= 6; s += 3) {
        zebraPositions.push([ix + s, iz - 11.2], [ix + s, iz + 11.2]);
      }
    });
  });
  const zebraInst = new THREE.InstancedMesh(zebraGeo, zebraMat, zebraPositions.length);
  const zDummy = new THREE.Object3D();
  zebraPositions.forEach(([zx, zz], idx) => {
    zDummy.position.set(zx, 0.042, zz);
    zDummy.updateMatrix();
    zebraInst.setMatrixAt(idx, zDummy.matrix);
  });
  zebraInst.instanceMatrix.needsUpdate = true;
  zebraInst.computeBoundingSphere();
  root.add(zebraInst);

  // Shahbag Central Roundabout Monument (at 0,0)
  const roundaboutBase = new THREE.Mesh(
    new THREE.CylinderGeometry(4.2, 4.5, 0.6, 24),
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.65 }),
  );
  roundaboutBase.position.set(0, 0.3, 0);
  root.add(roundaboutBase);

  const monumentPillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.65, 1.1, 6.5, 12),
    new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4, metalness: 0.2 }),
  );
  monumentPillar.position.set(0, 3.55, 0);
  monumentPillar.castShadow = true;
  root.add(monumentPillar);

  const monumentRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.7, 0.22, 10, 24),
    new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.35 }),
  );
  monumentRing.position.set(0, 6.2, 0);
  root.add(monumentRing);

  // 4. Dhaka Metro Rail Viaduct + Elevated MRT Train along Z = 134 corridor
  const metroConcrete = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.8 });
  const metroDeck = new THREE.Mesh(new THREE.BoxGeometry(620, 1.3, 7.2), metroConcrete);
  metroDeck.position.set(0, 9.5, 134);
  metroDeck.castShadow = true;
  root.add(metroDeck);

  for (let px = -260; px <= 260; px += 40) {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(2.2, 9.5, 2.2), metroConcrete);
    pier.position.set(px, 4.75, 134);
    pier.castShadow = true;
    root.add(pier);
  }

  const metroTrain = new THREE.Group();
  const trainBodyMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.28, metalness: 0.35 });
  const trainStripeMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.35 });
  const trainWinMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.15, metalness: 0.7 });
  for (let c = 0; c < 4; c++) {
    const car = new THREE.Mesh(new THREE.BoxGeometry(11.5, 2.5, 2.7), trainBodyMat);
    car.position.set((c - 1.5) * 12.2, 11.45, 134);
    metroTrain.add(car);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(11.55, 0.35, 2.74), trainStripeMat);
    stripe.position.set((c - 1.5) * 12.2, 10.7, 134);
    metroTrain.add(stripe);
    const win = new THREE.Mesh(new THREE.BoxGeometry(9.8, 0.85, 2.76), trainWinMat);
    win.position.set((c - 1.5) * 12.2, 11.75, 134);
    metroTrain.add(win);
  }
  root.add(metroTrain);

  // 5. Raised 3D Footpaths (Sidewalks) + Painted Curbstones + Buildings in all 16 City Blocks
  const sidewalkMat = new THREE.MeshStandardMaterial({
    map: createSidewalkTexture(anisotropy),
    roughness: 0.85,
    metalness: 0.04,
  });
  const curbMat = new THREE.MeshStandardMaterial({
    map: createCurbTexture(anisotropy),
    roughness: 0.65,
  });

  const shopSigns = [
    { bn: 'ঢাকা বিরিয়ানি হাউস', en: 'DHAKA BIRYANI HOUSE', bg: '#b91c1c' },
    { bn: 'বাংলাদেশ ফার্মেসি', en: '24/7 MEDICAL STORE', bg: '#047857' },
    { bn: 'পদ্মা টেলিকম এন্ড ইজি লোড', en: 'MOBILE & FLEXILOAD', bg: '#1d4ed8' },
    { bn: 'রহিম অটো ওয়ার্কশপ', en: 'EASY BIKE PARTS', bg: '#7e22ce' },
    { bn: 'মেট্রো ফ্যাশন গ্যালারি', en: 'EID COLLECTION', bg: '#be185d' },
    { bn: 'সোনালী জেনারেল স্টোর', en: 'TEA • SNACKS • COLD', bg: '#c2410c' },
  ];
  const signMaterials = shopSigns.map(
    (s) =>
      new THREE.MeshStandardMaterial({
        map: createShopSignTexture(s.bn, s.en, s.bg, anisotropy),
        roughness: 0.42,
      }),
  );
  const buildingPalettes = [0xe2e8f0, 0xfef3c7, 0xdbeafe, 0xfce7f3, 0xd1fae5, 0xfed7aa];
  const buildingBodyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.82 });
  const sharedShutterMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.5,
    metalness: 0.4,
  });
  const sharedParapetMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.7 });

  // 16 blocks centered at (-180, -60, 60, 180) x (-180, -60, 60, 180)
  const blockCentersCoord = [-180, -60, 60, 180];
  const blockFootprint = 99; // Leaves 21m road corridor between 120m centers

  // Instanced raised footpath curb slabs + tiled tops (2 draw calls total)
  const curbInst = new THREE.InstancedMesh(
    new THREE.BoxGeometry(blockFootprint, footpathHeight - 0.01, blockFootprint),
    curbMat,
    16,
  );
  const sidewalkTopGeo = new THREE.PlaneGeometry(blockFootprint - 0.04, blockFootprint - 0.04);
  sidewalkTopGeo.rotateX(-Math.PI / 2);
  const sidewalkInst = new THREE.InstancedMesh(sidewalkTopGeo, sidewalkMat, 16);
  sidewalkInst.receiveShadow = true;

  // Instanced building parts across all 64 buildings (3 draw calls + 6 sign batches!)
  const buildingCount = 64;
  const bodyInst = new THREE.InstancedMesh(new THREE.BoxGeometry(28, 1, 28), buildingBodyMat, buildingCount);
  bodyInst.castShadow = true;
  bodyInst.receiveShadow = true;
  const shutterInst = new THREE.InstancedMesh(new THREE.BoxGeometry(28.3, 3.2, 28.3), sharedShutterMat, buildingCount);
  const parapetInst = new THREE.InstancedMesh(new THREE.BoxGeometry(28.6, 0.7, 28.6), sharedParapetMat, buildingCount);
  const signBuckets: Array<Array<{ x: number; y: number; z: number }>> = signMaterials.map(() => []);

  const lamppostPositions: Array<[number, number]> = [];
  const treePositions: Array<[number, number, number]> = [];
  const blockDummy = new THREE.Object3D();
  const bTint = new THREE.Color();
  let blockIdx = 0;
  let buildingIdx = 0;

  blockCentersCoord.forEach((bx, bxi) => {
    blockCentersCoord.forEach((bz, bzi) => {
      // 5a. Raised Footpath Platform (0.24m high)
      blockDummy.position.set(bx, (footpathHeight - 0.01) / 2, bz);
      blockDummy.scale.set(1, 1, 1);
      blockDummy.updateMatrix();
      curbInst.setMatrixAt(blockIdx, blockDummy.matrix);

      blockDummy.position.set(bx, footpathHeight, bz);
      blockDummy.updateMatrix();
      sidewalkInst.setMatrixAt(blockIdx, blockDummy.matrix);
      blockIdx++;

      // Register pedestrian sidewalk loop around the perimeter of this block (4.2m inside curb)
      const loopHalf = blockFootprint / 2 - 4.2;
      footpathLoops.push({
        minX: bx - loopHalf,
        maxX: bx + loopHalf,
        minZ: bz - loopHalf,
        maxZ: bz + loopHalf,
      });

      // Streetlights at the 4 corners of each raised footpath
      const cornerOff = blockFootprint / 2 - 2.2;
      lamppostPositions.push(
        [bx - cornerOff, bz - cornerOff],
        [bx + cornerOff, bz - cornerOff],
        [bx - cornerOff, bz + cornerOff],
        [bx + cornerOff, bz + cornerOff],
      );

      // Shade trees along the sidewalk edge
      treePositions.push(
        [bx - cornerOff + 8, bz - cornerOff, 0.85],
        [bx + cornerOff - 8, bz + cornerOff, 0.9],
      );

      // 5b. 2x2 Cluster of Dhaka Shops & Multi-Story Buildings inside the block (leaving wide 14m footpaths!)
      const subOffsets = [-21, 21];
      subOffsets.forEach((ox, sxi) => {
        subOffsets.forEach((oz, szi) => {
          const x = bx + ox;
          const z = bz + oz;
          const w = 28;
          const d = 28;
          const h = 11 + ((Math.abs(bxi * 3 + bzi * 5 + sxi * 2 + szi * 7) % 5) * 5.2);

          blockDummy.position.set(x, footpathHeight + h / 2, z);
          blockDummy.scale.set(1, h, 1);
          blockDummy.updateMatrix();
          bodyInst.setMatrixAt(buildingIdx, blockDummy.matrix);
          bTint.setHex(buildingPalettes[(bxi + bzi + sxi + szi) % buildingPalettes.length]);
          bodyInst.setColorAt(buildingIdx, bTint);

          blockDummy.position.set(x, footpathHeight + 1.6, z);
          blockDummy.scale.set(1, 1, 1);
          blockDummy.updateMatrix();
          shutterInst.setMatrixAt(buildingIdx, blockDummy.matrix);

          blockDummy.position.set(x, footpathHeight + h + 0.35, z);
          blockDummy.updateMatrix();
          parapetInst.setMatrixAt(buildingIdx, blockDummy.matrix);

          buildingIdx++;

          const signBucketIdx = (bxi + bzi + sxi + szi) % signMaterials.length;
          signBuckets[signBucketIdx].push({
            x,
            y: footpathHeight + 3.8,
            z: z + (oz < 0 ? -d / 2 - 0.2 : d / 2 + 0.2),
          });

          colliders.push({
            minX: x - w / 2 - 0.3,
            maxX: x + w / 2 + 0.3,
            minZ: z - d / 2 - 0.3,
            maxZ: z + d / 2 + 0.3,
          });
        });
      });
    });
  });

  curbInst.instanceMatrix.needsUpdate = true;
  sidewalkInst.instanceMatrix.needsUpdate = true;
  bodyInst.instanceMatrix.needsUpdate = true;
  if (bodyInst.instanceColor) bodyInst.instanceColor.needsUpdate = true;
  shutterInst.instanceMatrix.needsUpdate = true;
  parapetInst.instanceMatrix.needsUpdate = true;
  curbInst.computeBoundingSphere();
  sidewalkInst.computeBoundingSphere();
  bodyInst.computeBoundingSphere();
  shutterInst.computeBoundingSphere();
  parapetInst.computeBoundingSphere();
  root.add(curbInst, sidewalkInst, bodyInst, shutterInst, parapetInst);

  const signGeo = new THREE.BoxGeometry(28 * 0.68, 2.0, 0.2);
  signBuckets.forEach((coords, idx) => {
    if (coords.length === 0) return;
    const sInst = new THREE.InstancedMesh(signGeo, signMaterials[idx], coords.length);
    coords.forEach((c, ci) => {
      blockDummy.position.set(c.x, c.y, c.z);
      blockDummy.scale.set(1, 1, 1);
      blockDummy.updateMatrix();
      sInst.setMatrixAt(ci, blockDummy.matrix);
    });
    sInst.instanceMatrix.needsUpdate = true;
    sInst.computeBoundingSphere();
    root.add(sInst);
  });

  // 6. Instanced Roadside Streetlights along all Footpaths
  const poleGeo = new THREE.CylinderGeometry(0.08, 0.12, 5.2, 6);
  poleGeo.translate(0, 2.6, 0);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7, roughness: 0.35 });
  const lampInst = new THREE.InstancedMesh(poleGeo, poleMat, lamppostPositions.length);

  const bulbGeo = new THREE.BoxGeometry(0.65, 0.14, 0.3);
  bulbGeo.translate(0, 5.2, 0);
  const bulbMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfef08a,
    emissiveIntensity: 1.2,
  });
  const bulbInst = new THREE.InstancedMesh(bulbGeo, bulbMat, lamppostPositions.length);

  const dummy = new THREE.Object3D();
  lamppostPositions.forEach(([lx, lz], idx) => {
    dummy.position.set(lx, footpathHeight, lz);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    lampInst.setMatrixAt(idx, dummy.matrix);
    bulbInst.setMatrixAt(idx, dummy.matrix);
  });
  lampInst.instanceMatrix.needsUpdate = true;
  bulbInst.instanceMatrix.needsUpdate = true;
  lampInst.computeBoundingSphere();
  bulbInst.computeBoundingSphere();
  root.add(lampInst, bulbInst);

  // 7. Instanced Tropical Dhaka Trees (Outer forest perimeter + footpath trees)
  for (let i = -320; i <= 320; i += 24) {
    treePositions.push([i, -290, 0.95]);
    treePositions.push([i, 290, 0.95]);
    treePositions.push([-290, i, 0.95]);
    treePositions.push([290, i, 0.95]);
  }

  const trunkGeo = new THREE.CylinderGeometry(0.26, 0.4, 3.2, 7);
  trunkGeo.translate(0, 1.6, 0);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.92 });
  const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, treePositions.length);

  const crownGeo = new THREE.DodecahedronGeometry(2.1, 1);
  crownGeo.translate(0, 4.3, 0);
  const crownMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.84 });
  const crownInst = new THREE.InstancedMesh(crownGeo, crownMat, treePositions.length);

  const tint = new THREE.Color();
  treePositions.forEach(([tx, tz, sc], idx) => {
    const ty = isOnFootpath(tx, tz) ? footpathHeight : 0;
    dummy.position.set(tx, ty, tz);
    dummy.rotation.y = (idx * 1.37) % (Math.PI * 2);
    dummy.scale.setScalar(sc);
    dummy.updateMatrix();
    trunkInst.setMatrixAt(idx, dummy.matrix);
    crownInst.setMatrixAt(idx, dummy.matrix);
    tint.setHSL(0.32 + (idx % 5) * 0.015, 0.58, 0.32 + (idx % 4) * 0.04);
    crownInst.setColorAt(idx, tint);
  });
  trunkInst.instanceMatrix.needsUpdate = true;
  crownInst.instanceMatrix.needsUpdate = true;
  if (crownInst.instanceColor) crownInst.instanceColor.needsUpdate = true;
  trunkInst.computeBoundingSphere();
  crownInst.computeBoundingSphere();
  root.add(trunkInst, crownInst);

  // 8. Bengali Road Signs at District Junctions
  DISTRICTS.forEach((d) => {
    const signGroup = new THREE.Group();
    const sx = d.spawnX + 12.5;
    const sz = d.spawnZ + 12.5;
    signGroup.position.set(sx, isOnFootpath(sx, sz) ? footpathHeight : 0, sz);

    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 3.6, 8),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.7, roughness: 0.3 }),
    );
    post.position.y = 1.8;
    signGroup.add(post);

    const board = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 1.7, 0.12),
      new THREE.MeshStandardMaterial({
        map: createRoadSignTexture(d.nameBn, d.nameEn, '#0369a1', anisotropy),
        roughness: 0.4,
      }),
    );
    board.position.y = 3.5;
    board.rotation.y = -Math.PI / 4;
    signGroup.add(board);

    root.add(signGroup);
  });

  // 9. Electric Pole Charging Stations (8 stations across the 5x5 grid)
  const chargerCoords: Array<{ x: number; z: number; name: string }> = [
    { x: 12.5, z: 48, name: 'Shahbag EV Point' },
    { x: -107.5, z: -65, name: 'Old Dhaka EV Point' },
    { x: 107.5, z: -65, name: 'Motijheel EV Point' },
    { x: -12.5, z: -72, name: 'Uttara EV Point' },
    { x: 107.5, z: 55, name: 'Gulistan EV Point' },
    { x: -12.5, z: 165, name: 'Metro EV Point' },
    { x: -227.5, z: 45, name: 'West Mirpur EV Point' },
    { x: 227.5, z: -45, name: 'East Hub EV Point' },
  ];
  chargerCoords.forEach((c, idx) => {
    const group = createChargingStationModel(shadowTex, anisotropy);
    group.position.set(c.x, 0, c.z);
    if (c.x < 0) group.rotation.y = Math.PI;
    root.add(group);
    chargingStations.push({
      id: `charger-${idx}`,
      x: c.x,
      z: c.z,
      districtName: c.name,
      group,
    });
  });

  // 10. Police Settlement Booths (5 strategic locations)
  const policeCoords: Array<{ x: number; z: number; name: string }> = [
    { x: -12.5, z: -45, name: 'Shahbag Traffic Box' },
    { x: 107.5, z: 165, name: 'Jatrabari Police Box' },
    { x: -107.5, z: 45, name: 'Mirpur Police Box' },
    { x: 45, z: -107.5, name: 'Uttara Traffic Box' },
    { x: -107.5, z: -165, name: 'Old Dhaka Police Box' },
  ];
  policeCoords.forEach((p, idx) => {
    const group = createPoliceBoxModel(shadowTex, anisotropy);
    group.position.set(p.x, 0, p.z);
    root.add(group);
    policeStations.push({
      id: `police-${idx}`,
      x: p.x,
      z: p.z,
      districtName: p.name,
      group,
    });
  });

  // 11. Destructible Roadside Stalls, Carts, Barriers & Ad Stands placed on Footpaths/Shoulders
  let nextDestId = 1;
  const pointValues: Record<DestructibleKind, number> = {
    tea_stall: 400,
    fruit_cart: 350,
    ad_stand: 250,
    barrier: 150,
  };
  const kinds: DestructibleKind[] = ['tea_stall', 'fruit_cart', 'barrier', 'ad_stand'];

  roadCoords.forEach((rc) => {
    for (let pos = -215; pos <= 215; pos += 48) {
      if (roadCoords.some((ic) => Math.abs(pos - ic) < 22)) continue;

      const kindA = kinds[Math.abs(pos + rc) % kinds.length];
      const meshA = createDestructiblePropModel(kindA, shadowTex, anisotropy);
      const ax = rc + 11.8;
      const az = pos;
      const ay = isOnFootpath(ax, az) ? footpathHeight : 0;
      meshA.position.set(ax, ay, az);
      meshA.rotation.y = -Math.PI / 2;
      root.add(meshA);
      destructibles.push({
        id: nextDestId++,
        kind: kindA,
        mesh: meshA,
        x: ax,
        z: az,
        origX: ax,
        origY: ay,
        origZ: az,
        origRotY: -Math.PI / 2,
        radius: 1.25,
        points: pointValues[kindA],
        smashed: false,
        respawnTimer: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        spinX: 0,
        spinZ: 0,
      });

      const kindB = kinds[Math.abs(pos * 2 + rc + 1) % kinds.length];
      const meshB = createDestructiblePropModel(kindB, shadowTex, anisotropy);
      const bx = pos;
      const bz = rc - 11.8;
      const by = isOnFootpath(bx, bz) ? footpathHeight : 0;
      meshB.position.set(bx, by, bz);
      meshB.rotation.y = 0;
      root.add(meshB);
      destructibles.push({
        id: nextDestId++,
        kind: kindB,
        mesh: meshB,
        x: bx,
        z: bz,
        origX: bx,
        origY: by,
        origZ: bz,
        origRotY: 0,
        radius: 1.25,
        points: pointValues[kindB],
        smashed: false,
        respawnTimer: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        spinX: 0,
        spinZ: 0,
      });
    }
  });

  // 12. Race Mode Glowing Checkpoint Beacon Ring
  const checkpointRing = new THREE.Mesh(
    new THREE.TorusGeometry(3.8, 0.28, 12, 32),
    new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      emissive: 0x06b6d4,
      emissiveIntensity: 1.8,
    }),
  );
  checkpointRing.position.set(0, 3.2, -60);
  checkpointRing.visible = false;
  root.add(checkpointRing);

  return {
    root,
    colliders,
    destructibles,
    chargingStations,
    policeStations,
    roadLanes,
    footpathLoops,
    metroTrain,
    riverWater,
    checkpointRing,
    roadCoords,
    roadHalfWidth,
    isOnFootpath,
  };
}
