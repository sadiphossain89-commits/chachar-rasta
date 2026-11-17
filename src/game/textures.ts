import * as THREE from 'three';
import { GarageConfig } from './types';

function makeColorTexture(
  canvas: HTMLCanvasElement,
  anisotropy: number,
  repeatX = 1,
  repeatY = 1,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.max(1, anisotropy);
  if (repeatX !== 1 || repeatY !== 1) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
  }
  tex.needsUpdate = true;
  return tex;
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 62);
  grad.addColorStop(0, 'rgba(5, 8, 15, 0.62)');
  grad.addColorStop(0.55, 'rgba(5, 8, 15, 0.26)');
  grad.addColorStop(1, 'rgba(5, 8, 15, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export function createRoadAsphaltTexture(anisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Base worn Dhaka asphalt
  ctx.fillStyle = '#2a2f3a';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle aggregate grain
  for (let i = 0; i < 4500; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const shade = 35 + Math.floor(Math.random() * 32);
    ctx.fillStyle = `rgb(${shade},${shade + 3},${shade + 9})`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Edge kerbs (red/white Dhaka road dividers)
  ctx.fillStyle = '#e5e7eb';
  ctx.fillRect(10, 0, 10, 512);
  ctx.fillRect(492, 0, 10, 512);

  // Center dashed yellow divider
  ctx.fillStyle = '#facc15';
  for (let y = 16; y < 512; y += 96) {
    ctx.fillRect(250, y, 12, 52);
  }

  // Subtle lane dashes
  ctx.fillStyle = 'rgba(248,250,252,0.55)';
  for (let y = 24; y < 512; y += 96) {
    ctx.fillRect(132, y, 6, 40);
    ctx.fillRect(374, y, 6, 40);
  }

  return makeColorTexture(canvas, anisotropy, 1, 1);
}

export function createGroundGrassTexture(anisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#3f533c';
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 1800; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const g = 70 + Math.floor(Math.random() * 35);
    ctx.fillStyle = `rgb(${g - 15}, ${g + 12}, ${g - 22})`;
    ctx.fillRect(x, y, 3, 3);
  }

  return makeColorTexture(canvas, anisotropy, 45, 45);
}

export function createSidewalkTexture(anisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(0, 0, 256, 256);

  // Interlocking Dhaka footpath concrete pavers
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 3;
  for (let y = 0; y < 256; y += 32) {
    for (let x = 0; x < 256; x += 32) {
      const shade = ((x + y) / 32) % 2 === 0 ? '#cbd5e1' : '#b8c4d4';
      ctx.fillStyle = shade;
      ctx.fillRect(x + 2, y + 2, 28, 28);
      ctx.strokeRect(x, y, 32, 32);
    }
  }

  return makeColorTexture(canvas, anisotropy, 12, 12);
}

export function createCurbTexture(anisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 32;
  const ctx = canvas.getContext('2d')!;

  // Classic Dhaka red-and-white / yellow-and-black painted curbstone stripes
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#facc15' : '#1e293b';
    ctx.fillRect(i * 32, 0, 32, 32);
  }
  return makeColorTexture(canvas, anisotropy, 14, 1);
}

export function createHoodArtTexture(
  style: GarageConfig['hoodArt'],
  baseColor: string,
  trimColor: string,
  anisotropy: number,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Rich Bangladeshi rickshaw art canopy backdrop
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 512, 512);

  // Ornamental border
  ctx.strokeStyle = trimColor;
  ctx.lineWidth = 22;
  ctx.strokeRect(18, 18, 476, 476);

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 6;
  ctx.strokeRect(36, 36, 440, 440);

  // Corner floral medallions
  const corners = [
    [70, 70],
    [442, 70],
    [70, 442],
    [442, 442],
  ];
  corners.forEach(([cx, cy]) => {
    ctx.fillStyle = '#ec4899';
    ctx.beginPath();
    ctx.arc(cx, cy, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = trimColor;
    ctx.beginPath();
    ctx.arc(cx, cy, 11, 0, Math.PI * 2);
    ctx.fill();
  });

  if (style === 'shapla_lotus') {
    // Stylized Shapla (National Lotus) + rising sun
    ctx.fillStyle = '#06b6d4';
    ctx.beginPath();
    ctx.arc(256, 256, 130, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(256, 238, 72, 0, Math.PI * 2);
    ctx.fill();

    for (let i = -3; i <= 3; i++) {
      ctx.save();
      ctx.translate(256, 305);
      ctx.rotate(i * 0.24);
      ctx.fillStyle = i % 2 === 0 ? '#fdf2f8' : '#fbcfe8';
      ctx.beginPath();
      ctx.ellipse(0, -68, 24, 68, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  } else if (style === 'bengal_tiger') {
    // Orange sunset circle + Royal Bengal stripes
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.arc(256, 256, 135, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#111827';
    for (let y = 145; y <= 365; y += 44) {
      ctx.beginPath();
      ctx.moveTo(145, y);
      ctx.quadraticCurveTo(256, y - 24, 367, y);
      ctx.quadraticCurveTo(256, y + 6, 145, y + 18);
      ctx.fill();
    }
    // Fierce yellow eyes
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.ellipse(212, 240, 22, 12, -0.2, 0, Math.PI * 2);
    ctx.ellipse(300, 240, 22, 12, 0.2, 0, Math.PI * 2);
    ctx.fill();
  } else if (style === 'peacock_plume') {
    // Vivid peacock tail fan
    const cx = 256;
    const cy = 350;
    for (let a = -1.2; a <= 1.2; a += 0.3) {
      const fx = cx + Math.sin(a) * 165;
      const fy = cy - Math.cos(a) * 165;
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(fx, fy);
      ctx.stroke();

      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(fx, fy, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(fx, fy, 13, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // Rickshaw Geometric Mosaic
    const palette = ['#ec4899', '#f59e0b', '#06b6d4', '#22c55e', '#f43f5e'];
    for (let ring = 0; ring < 5; ring++) {
      ctx.fillStyle = palette[ring % palette.length];
      ctx.beginPath();
      ctx.arc(256, 256, 150 - ring * 26, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 12; i++) {
      const ang = (i * Math.PI) / 6;
      ctx.beginPath();
      ctx.arc(256 + Math.cos(ang) * 112, 256 + Math.sin(ang) * 112, 10, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  return makeColorTexture(canvas, anisotropy);
}

export function createSeatTexture(
  style: GarageConfig['seatStyle'],
  anisotropy: number,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const baseMap: Record<GarageConfig['seatStyle'], string> = {
    velvet_red: '#991b1b',
    emerald_gold: '#065f46',
    marigold_floral: '#d97706',
    tiger_print: '#ea580c',
    indigo_jamdani: '#1e3a8a',
  };

  ctx.fillStyle = baseMap[style];
  ctx.fillRect(0, 0, 256, 256);

  if (style === 'tiger_print') {
    ctx.fillStyle = '#18181b';
    for (let y = 16; y < 256; y += 36) {
      ctx.fillRect(0, y, 256, 12);
    }
  } else if (style === 'indigo_jamdani') {
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 3;
    for (let y = 24; y < 256; y += 48) {
      for (let x = 24; x < 256; x += 48) {
        ctx.beginPath();
        ctx.moveTo(x, y - 14);
        ctx.lineTo(x + 14, y);
        ctx.lineTo(x, y + 14);
        ctx.lineTo(x - 14, y);
        ctx.closePath();
        ctx.stroke();
      }
    }
  } else {
    // Quilted diamond stitch + floral dots
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 2;
    for (let i = -256; i < 512; i += 32) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 256, 256);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(i, 256);
      ctx.lineTo(i + 256, 0);
      ctx.stroke();
    }
    ctx.fillStyle = '#fde047';
    for (let y = 32; y < 256; y += 64) {
      for (let x = 32; x < 256; x += 64) {
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  return makeColorTexture(canvas, anisotropy);
}

export function createRearBoardTexture(
  slogan: string,
  driverName: string,
  trimColor: string,
  anisotropy: number,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Vivid hand-painted rickshaw backboard
  const grad = ctx.createLinearGradient(0, 0, 512, 256);
  grad.addColorStop(0, '#be123c');
  grad.addColorStop(0.5, '#7e22ce');
  grad.addColorStop(1, '#0284c7');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 256);

  ctx.strokeStyle = trimColor;
  ctx.lineWidth = 14;
  ctx.strokeRect(12, 12, 488, 232);

  // Decorative lotus dots
  ctx.fillStyle = '#fde047';
  [54, 458].forEach((cx) => {
    ctx.beginPath();
    ctx.arc(cx, 62, 18, 0, Math.PI * 2);
    ctx.fill();
  });

  // Bengali Slogan
  ctx.fillStyle = '#fef08a';
  ctx.font = 'bold 54px "Hind Siliguri", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(slogan || 'মায়ের দোয়া', 256, 98, 440);

  // Driver Nameplate strip
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(58, 152, 396, 62);
  ctx.strokeStyle = '#22d3ee';
  ctx.lineWidth = 4;
  ctx.strokeRect(58, 152, 396, 62);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 34px "Hind Siliguri", "Chakra Petch", sans-serif';
  ctx.fillText(`চালক: ${driverName || 'রহিম মামা'}`, 256, 184, 376);

  return makeColorTexture(canvas, anisotropy);
}

export function createShopSignTexture(
  titleBn: string,
  subtitleEn: string,
  bgColor: string,
  anisotropy: number,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 192;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, 512, 192);

  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, 496, 176);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 58px "Hind Siliguri", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(titleBn, 256, 76, 468);

  ctx.fillStyle = '#fde047';
  ctx.font = 'bold 28px "Chakra Petch", sans-serif';
  ctx.fillText(subtitleEn, 256, 138, 468);

  return makeColorTexture(canvas, anisotropy);
}

export function createRoadSignTexture(
  textBn: string,
  textEn: string,
  bgColor: string,
  anisotropy: number,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 10;
  ctx.strokeRect(10, 10, 236, 236);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 38px "Hind Siliguri", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(textBn, 128, 96, 220);

  ctx.fillStyle = '#fef08a';
  ctx.font = 'bold 24px "Chakra Petch", sans-serif';
  ctx.fillText(textEn, 128, 168, 220);

  return makeColorTexture(canvas, anisotropy);
}
