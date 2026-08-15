'use strict';
/* ============================================================
   DEADZONE FPS — game.js
   3D First Person Shooter built with Three.js (r128)

   Architecture:
     • Two-pass rendering: world scene + weapon scene (no z-clip)
     • AABB collision (Box3 array) for player & enemies
     • Hitscan raycasting for player weapon
     • Enemy projectile spheres
     • Web Audio API synthesised SFX
     • Endless wave system with escalating difficulty
   ============================================================ */

// ─────────────────────────────────────────────────────────
//  GLOBALS
// ─────────────────────────────────────────────────────────
let scene, camera, renderer, clock;
let weaponScene, weaponCamera;

/** @type {'menu'|'playing'|'paused'|'wavecomplete'|'gameover'} */
let gameState = 'menu';

let wave = 1;
let kills = 0;

/** @type {Enemy[]} */
let enemies = [];

/** @type {Array<{mesh: THREE.Mesh, dir: THREE.Vector3, speed: number, life: number, damage: number}>} */
let enemyProjectiles = [];

/** @type {THREE.Box3[]} - Static level collidables */
const collidables = [];

/** Track all level-geometry meshes so we can clear them between map loads */
const levelMeshes = [];

/** Currently selected map id ('deadzone' | 'warfront') */
let selectedMap = 'deadzone';

// Input
const keys = {};
let mouseDeltaX = 0;
let mouseDeltaY = 0;
let mouseDown = false;
let isPointerLocked = false;

// Mobile detection & state
const isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

// Virtual joystick state
const joystick = {
  active: false,
  id: null,          // touch identifier
  startX: 0, startY: 0,
  curX: 0, curY: 0,
  normX: 0, normY: 0, // -1..1 movement axes
};

// Look-zone touch state
const lookTouch = {
  active: false,
  id: null,
  lastX: 0, lastY: 0,
};

// Whether the mobile ADS toggle is on
let mobileAdsOn = false;

// ─── Weapon definitions ─────────────────────────────────
const WEAPON_DB = {
  rifle: { id: 'rifle', name: 'ASSAULT RIFLE', slot: 1, ammo: 30, maxAmmo: 30, reserveAmmo: 120, isReloading: false, reloadTimer: 0, reloadDuration: 2.0, shootRate: 0.10, damage: 35, melee: false, auto: true },
  shotgun: { id: 'shotgun', name: 'SHOTGUN', slot: 1, ammo: 8, maxAmmo: 8, reserveAmmo: 32, isReloading: false, reloadTimer: 0, reloadDuration: 1.2, shootRate: 0.8, damage: 15, melee: false, auto: false },
  sniper: { id: 'sniper', name: 'SNIPER RIFLE', slot: 1, ammo: 5, maxAmmo: 5, reserveAmmo: 20, isReloading: false, reloadTimer: 0, reloadDuration: 2.0, shootRate: 1.2, damage: 120, melee: false, auto: false },
  pistol: { id: 'pistol', name: 'STANDARD PISTOL', slot: 2, ammo: 12, maxAmmo: 12, reserveAmmo: 60, isReloading: false, reloadTimer: 0, reloadDuration: 1.4, shootRate: 0.22, damage: 28, melee: false, auto: false },
  deagle: { id: 'deagle', name: 'DESERT EAGLE', slot: 2, ammo: 7, maxAmmo: 7, reserveAmmo: 35, isReloading: false, reloadTimer: 0, reloadDuration: 2.0, shootRate: 1.5, damage: 50, melee: false, auto: false },
  uzi: { id: 'uzi', name: 'UZI', slot: 2, ammo: 50, maxAmmo: 50, reserveAmmo: 200, isReloading: false, reloadTimer: 0, reloadDuration: 1.8, shootRate: 0.05, damage: 12, melee: false, auto: true },
  bat: { id: 'bat', name: 'METAL BAT', slot: 3, ammo: Infinity, maxAmmo: Infinity, reserveAmmo: Infinity, isReloading: false, reloadTimer: 0, reloadDuration: 0, shootRate: 0.65, damage: 120, melee: true, auto: false }
};

let WEAPONS = [];

let currentWeaponIdx = 0;  // index into WEAPONS array
let isSwitchingWeapon = false;
let switchTimer = 0;
const SWITCH_DURATION = 0.22;

// Reload animation state
const reloadAnim = { active: false, phase: 0, phaseTimer: 0, shell: null };

// Helper — current weapon object
function cw() { return WEAPONS[currentWeaponIdx]; }

// Player state (initialised once THREE is ready)
const player = {
  health: 100,
  maxHealth: 100,
  yaw: 0,
  pitch: 0,
  eyeHeight: 1.65,
  crouchEyeHeight: 0.95,
  alive: true,
  shootCooldown: 0,
};

let playerVelY = 0;    // vertical velocity (gravity)
const GRAVITY = -20;

// Weapon refs
let gunGroup, muzzleFlash;
let panSwinging = false;
let panSwingTimer = 0;
let muzzleFlashTimer = 0;
let shakeIntensity = 0;
let gunBobT = 0;   // accumulated time for walk bob
let isAds = false;

// Shotgun pump animation state
let shotgunPumpActive = false;
let shotgunPumpTimer = 0;
let shotgunPumpSound1 = false;
let shotgunPumpSound2 = false;

// Bat charge state
const batState = {
  isCharging: false,      // mouse is held down and bat is equpped
  chargeTime: 0,          // seconds held so far
  chargeDuration: 1.5,    // seconds to reach full charge
  isSwinging: false,      // currently playing swing animation
  swingTimer: 0,
  isCharged: false,       // was this swing a charged (strong) swing?
  windupActive: false,    // playing the windup pose before release
};

// Weapon recoil spring state (physically-based spring simulation)
const weaponRecoil = {
  // Spring values for camera pitch (upward kick)
  pitchVel: 0,       // current angular velocity (rad/s)
  pitchDisp: 0,      // current displacement from rest
  // Spring values for gun Z position (backward push)
  zVel: 0,
  zDisp: 0,
  // Spring values for gun rotation.x (barrel tilt up)
  rotVel: 0,
  rotDisp: 0,
  // Lateral (rotation.z) kick — randomised each shot
  latDisp: 0,
  latVel: 0,
  // Spring constants
  stiffness: 28,     // how fast it snaps back
  damping: 5.5,      // how quickly oscillation dies (critical ~2*sqrt(k))
};

// Raycaster (reused every frame for shooting)
const raycaster = new THREE.Raycaster();

// Audio context
let audioCtx;

// ─────────────────────────────────────────────────────────
//  AUDIO  (Web Audio API — no external files needed)
// ─────────────────────────────────────────────────────────
function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

/** Noise burst → rifle gunshot */
function playGunshot() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const len = Math.floor(audioCtx.sampleRate * 0.14);
  const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.8);
  }
  const src = audioCtx.createBufferSource();
  src.buffer = buf;

  const lp = audioCtx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 1800;

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(1.2, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

  src.connect(lp);
  lp.connect(gain);
  gain.connect(audioCtx.destination);
  src.start(now);
}

/** Lighter pop → pistol shot */
function playPistolShot() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const len = Math.floor(audioCtx.sampleRate * 0.09);
  const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.4) * 0.8;
  }
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  const hp = audioCtx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 400;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.9, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
  src.connect(hp); hp.connect(gain); gain.connect(audioCtx.destination);
  src.start(now);
}

/** Metallic clang → frying pan hit */
function playPanSwing(hit) {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  // Whoosh
  const wLen = Math.floor(audioCtx.sampleRate * 0.12);
  const wBuf = audioCtx.createBuffer(1, wLen, audioCtx.sampleRate);
  const wDat = wBuf.getChannelData(0);
  for (let i = 0; i < wLen; i++) wDat[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / wLen, 1.2) * 0.3;
  const wSrc = audioCtx.createBufferSource();
  wSrc.buffer = wBuf;
  const wBp = audioCtx.createBiquadFilter();
  wBp.type = 'bandpass'; wBp.frequency.value = 300; wBp.Q.value = 0.8;
  const wG = audioCtx.createGain(); wG.gain.value = 0.6;
  wSrc.connect(wBp); wBp.connect(wG); wG.connect(audioCtx.destination);
  wSrc.start(now);
  if (hit) {
    // CLANG on hit
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc1.type = 'sine'; osc1.frequency.setValueAtTime(1100, now + 0.05);
    osc1.frequency.exponentialRampToValueAtTime(180, now + 0.45);
    osc2.type = 'sine'; osc2.frequency.setValueAtTime(800, now + 0.05);
    osc2.frequency.exponentialRampToValueAtTime(120, now + 0.45);
    g.gain.setValueAtTime(0.6, now + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc1.connect(g); osc2.connect(g); g.connect(audioCtx.destination);
    osc1.start(now + 0.05); osc1.stop(now + 0.45);
    osc2.start(now + 0.05); osc2.stop(now + 0.45);
  }
}

/** Weapon-switch click */
function playWeaponSwitch() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(900, now);
  osc.frequency.exponentialRampToValueAtTime(400, now + 0.1);
  g.gain.setValueAtTime(0.15, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
  osc.connect(g); g.connect(audioCtx.destination);
  osc.start(now); osc.stop(now + 0.1);
}

/** High-pitched tick on enemy hit */
function playHitSound() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(600, now);
  osc.frequency.exponentialRampToValueAtTime(120, now + 0.07);
  g.gain.setValueAtTime(0.18, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
  osc.connect(g);
  g.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.07);
}

/** Softer enemy gunshot */
function playEnemyShot() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const len = Math.floor(audioCtx.sampleRate * 0.07);
  const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.5) * 0.55;
  }
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  const bp = audioCtx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 700;
  bp.Q.value = 0.5;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.55, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
  src.connect(bp);
  bp.connect(gain);
  gain.connect(audioCtx.destination);
  src.start(now);
}

/** Falling sawtooth on enemy death */
function playDeathSound() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(220, now);
  osc.frequency.exponentialRampToValueAtTime(30, now + 0.45);
  g.gain.setValueAtTime(0.4, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
  osc.connect(g);
  g.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.45);
}

/** Two metallic clicks */
function playReloadSound() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  [0, 0.55].forEach((t, i) => {
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.value = i === 0 ? 1600 : 1100;
    g.gain.setValueAtTime(0.12, now + t);
    g.gain.exponentialRampToValueAtTime(0.001, now + t + 0.045);
    osc.connect(g);
    g.connect(audioCtx.destination);
    osc.start(now + t);
    osc.stop(now + t + 0.045);
  });
}

/** Dull clunk — magazine release / eject */
function playMagEject() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  // Low-freq body thud
  const len = Math.floor(audioCtx.sampleRate * 0.07);
  const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 0.55) * 0.75;
  }
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  const lp = audioCtx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 380;
  const g = audioCtx.createGain();
  g.gain.setValueAtTime(0.55, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
  src.connect(lp); lp.connect(g); g.connect(audioCtx.destination);
  src.start(now);
  // Metallic scrape click on top
  const osc = audioCtx.createOscillator();
  const og = audioCtx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(2600, now + 0.01);
  osc.frequency.exponentialRampToValueAtTime(280, now + 0.04);
  og.gain.setValueAtTime(0.11, now + 0.01);
  og.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
  osc.connect(og); og.connect(audioCtx.destination);
  osc.start(now + 0.01); osc.stop(now + 0.04);
}

/** Hard metallic bang — mag/bolt slam home */
function playBoltSlam() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  // Hard noise transient
  const len = Math.floor(audioCtx.sampleRate * 0.055);
  const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.6);
  }
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  const bp = audioCtx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 900;
  bp.Q.value = 0.35;
  const g = audioCtx.createGain();
  g.gain.setValueAtTime(0.70, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
  src.connect(bp); bp.connect(g); g.connect(audioCtx.destination);
  src.start(now);
  // High clack overtone
  const osc = audioCtx.createOscillator();
  const og = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(3400, now);
  osc.frequency.exponentialRampToValueAtTime(520, now + 0.045);
  og.gain.setValueAtTime(0.15, now);
  og.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
  osc.connect(og); og.connect(audioCtx.destination);
  osc.start(now); osc.stop(now + 0.045);
}

// ─────────────────────────────────────────────────────────
//  CANVAS TEXTURES
// ─────────────────────────────────────────────────────────

/** Create a grid texture for the floor */
function makeGridTexture(gridColor, bgColor) {
  const SIZE = 256;
  const c = document.createElement('canvas');
  c.width = SIZE;
  c.height = SIZE;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 0.8;
  const STEP = 32;
  for (let i = 0; i <= SIZE; i += STEP) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, SIZE); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(SIZE, i); ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(22, 22);
  return tex;
}

function makeBrickTexture(repeatX, repeatY) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#b0b0b0'; // mortar
  ctx.fillRect(0, 0, 128, 128);

  const bw = 64;
  const bh = 32;
  const m = 4; // mortar thickness

  for (let y = 0; y < 128; y += bh) {
    const off = (y / bh) % 2 === 0 ? 0 : bw / 2;
    for (let x = -bw; x < 128; x += bw) {
      const bx = (x + off + 128) % 128;
      const isDark = ((bx * 7 + y * 13) % 5) < 2;
      ctx.fillStyle = isDark ? '#a04030' : '#c05040';
      ctx.fillRect(x + off + m / 2, y + m / 2, bw - m, bh - m);
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX || 1, repeatY || 1);
  return tex;
}

// ─────────────────────────────────────────────────────────
//  LEVEL CREATION
// ─────────────────────────────────────────────────────────
function createDeadzoneLevel() {
  const HALF = 38;    // arena half-size (metres)
  const WALL_H = 5.5;

  const floorMat = new THREE.MeshLambertMaterial({
    map: makeGridTexture('#5a5a7a', '#3a3a4e'),
  });
  const ceilMat = new THREE.MeshLambertMaterial({ color: 0x141420 });
  const wallMat = new THREE.MeshLambertMaterial({
    map: makeBrickTexture(76, 4)
  });
  const obstMat = new THREE.MeshLambertMaterial({ color: 0x3a4d60 });
  const crateA = new THREE.MeshLambertMaterial({ color: 0x4a3820 });
  const crateB = new THREE.MeshLambertMaterial({ color: 0x3d3010 });

  // ── Floor
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(HALF * 2, HALF * 2),
    floorMat
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  levelMeshes.push(floor);

  // ── Ceiling (Removed so sky is visible)
  // const ceil = new THREE.Mesh(
  //   new THREE.PlaneGeometry(HALF * 2, HALF * 2),
  //   ceilMat
  // );
  // ceil.rotation.x = Math.PI / 2;
  // ceil.position.y = WALL_H;
  // scene.add(ceil);

  // ── Sky Dome
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 1024;
  skyCanvas.height = 1024;
  const skyCtx = skyCanvas.getContext('2d');

  // Sky gradient
  const skyGrad = skyCtx.createLinearGradient(0, 0, 0, skyCanvas.height);
  skyGrad.addColorStop(0, '#1a508b');
  skyGrad.addColorStop(0.5, '#6eb5ff');
  skyGrad.addColorStop(1, '#ffffff');
  skyCtx.fillStyle = skyGrad;
  skyCtx.fillRect(0, 0, skyCanvas.width, skyCanvas.height);

  // Sun
  skyCtx.beginPath();
  skyCtx.arc(skyCanvas.width * 0.2, skyCanvas.height * 0.25, 50, 0, Math.PI * 2);
  skyCtx.fillStyle = '#fffae6';
  skyCtx.shadowColor = '#ffea70';
  skyCtx.shadowBlur = 60;
  skyCtx.fill();
  skyCtx.shadowBlur = 0; // reset for clouds

  // Clouds
  for (let i = 0; i < 60; i++) {
    skyCtx.beginPath();
    skyCtx.arc(
      Math.random() * skyCanvas.width,
      Math.random() * skyCanvas.height * 0.6,
      30 + Math.random() * 60,
      0, Math.PI * 2
    );
    skyCtx.fillStyle = 'rgba(255, 255, 255, ' + (0.1 + Math.random() * 0.2) + ')';
    skyCtx.fill();
  }

  const skyTex = new THREE.CanvasTexture(skyCanvas);
  const skyGeo = new THREE.SphereGeometry(100, 32, 16);
  const skyMat = new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false });
  const skyMesh = new THREE.Mesh(skyGeo, skyMat);
  scene.add(skyMesh);
  levelMeshes.push(skyMesh);

  // ── Helper: add solid box, register collidable & levelMeshes
  function box(x, y, z, w, h, d, mat) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat || wallMat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    collidables.push(new THREE.Box3().setFromObject(mesh));
    levelMeshes.push(mesh);
    return mesh;
  }

  const hw = WALL_H / 2;   // half-height for wall centres

  // ── Outer boundary walls
  box(0, hw, -HALF, HALF * 2, WALL_H, 1);  // North
  box(0, hw, HALF, HALF * 2, WALL_H, 1);  // South
  box(-HALF, hw, 0, 1, WALL_H, HALF * 2); // West
  box(HALF, hw, 0, 1, WALL_H, HALF * 2); // East

  // ── Central pillars
  box(0, 1.5, 0, 5, 3, 5, obstMat);
  box(-8, 1.5, 0, 1.5, 3, 1.5, obstMat);
  box(8, 1.5, 0, 1.5, 3, 1.5, obstMat);
  box(0, 1.5, -8, 1.5, 3, 1.5, obstMat);
  box(0, 1.5, 8, 1.5, 3, 1.5, obstMat);

  // ── Long cover walls (cross-shaped layout)
  box(0, 1.25, -14, 10, 2.5, 1.5, obstMat);
  box(0, 1.25, 14, 10, 2.5, 1.5, obstMat);
  box(-14, 1.25, 0, 1.5, 2.5, 10, obstMat);
  box(14, 1.25, 0, 1.5, 2.5, 10, obstMat);

  // ── Corner fortresses
  [[-24, -24], [24, -24], [-24, 24], [24, 24]].forEach(([cx, cz]) => {
    box(cx, 1.75, cz, 4.5, 3.5, 4.5, obstMat);
    box(cx + 3.5 * Math.sign(cx), 0.8, cz, 1.5, 1.6, 4.5, crateA);
    box(cx, 0.8, cz + 3.5 * Math.sign(cz), 4.5, 1.6, 1.5, crateA);
  });

  // ── Mid-field crates / cover
  const cratePositions = [
    [-18, 5], [18, 5], [-18, -5], [18, -5],
    [-5, 22], [5, -22], [-5, -22], [5, 22],
    [-28, 0], [28, 0],
    [-8, -22], [8, 22],
    [-22, 14], [22, -14],
  ];
  cratePositions.forEach(([cx, cz]) => {
    const h = 1.2 + Math.random() * 0.8;
    box(cx, h / 2, cz, 1.8, h, 1.8, Math.random() > 0.5 ? crateA : crateB);
  });

  // ── Lighting
  // Ambient
  const ambLight = new THREE.AmbientLight(0x6080aa, 2.8);
  scene.add(ambLight);
  levelMeshes.push(ambLight);

  // Directional (sun from above)
  const dir = new THREE.DirectionalLight(0xfffaee, 2.4);
  dir.position.set(8, 20, 5);
  dir.castShadow = true;
  dir.shadow.mapSize.width = 2048;
  dir.shadow.mapSize.height = 2048;
  dir.shadow.camera.near = 0.1;
  dir.shadow.camera.far = 80;
  dir.shadow.camera.left = -55;
  dir.shadow.camera.right = 55;
  dir.shadow.camera.top = 55;
  dir.shadow.camera.bottom = -55;
  scene.add(dir);
  levelMeshes.push(dir);

  // Red accent — centre
  addPointLight(0, 3.5, 0, 0xff1133, 2.5, 22);
  // Blue corners
  addPointLight(-25, 3, -25, 0x0033cc, 1.8, 18);
  addPointLight(25, 3, -25, 0x0033cc, 1.8, 18);
  addPointLight(-25, 3, 25, 0x0033cc, 1.8, 18);
  addPointLight(25, 3, 25, 0x0033cc, 1.8, 18);
  // Orange mid
  addPointLight(-14, 3, 0, 0xff6600, 1.2, 12);
  addPointLight(14, 3, 0, 0xff6600, 1.2, 12);
}

// ─────────────────────────────────────────────────────────
//  WARFRONT — BATTLEFIELD MAP
// ─────────────────────────────────────────────────────────
function createBattlefieldLevel() {
  const HALF = 38;
  const WALL_H = 5.5;

  // ── Dusty sandy floor texture
  function makeSandTexture() {
    const SIZE = 256;
    const c = document.createElement('canvas');
    c.width = SIZE; c.height = SIZE;
    const ctx = c.getContext('2d');
    // base sand tone
    ctx.fillStyle = '#c8a060';
    ctx.fillRect(0, 0, SIZE, SIZE);
    // noise variation
    for (let i = 0; i < 4000; i++) {
      const x = Math.random() * SIZE;
      const y = Math.random() * SIZE;
      const r = 1 + Math.random() * 6;
      const light = Math.random() > 0.5;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = light ? 'rgba(200,170,100,0.35)' : 'rgba(100,70,30,0.25)';
      ctx.fill();
    }
    // mud patches
    for (let i = 0; i < 12; i++) {
      const px = Math.random() * SIZE, py = Math.random() * SIZE;
      ctx.beginPath();
      ctx.ellipse(px, py, 20 + Math.random() * 30, 10 + Math.random() * 20, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(70,50,20,0.35)';
      ctx.fill();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(18, 18);
    return tex;
  }

  // ── Concrete rubble texture
  function makeConcreteTexture(rX, rY) {
    const c = document.createElement('canvas');
    c.width = 128; c.height = 128;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#888880';
    ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 800; i++) {
      const x = Math.random() * 128, y = Math.random() * 128;
      ctx.fillStyle = `rgba(${Math.floor(Math.random()*60+80)},${Math.floor(Math.random()*60+80)},${Math.floor(Math.random()*40+60)},0.4)`;
      ctx.fillRect(x, y, 2 + Math.random() * 5, 2 + Math.random() * 5);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(rX || 1, rY || 1);
    return tex;
  }

  // ── Materials
  const floorMat   = new THREE.MeshLambertMaterial({ map: makeSandTexture() });
  const concMat    = new THREE.MeshLambertMaterial({ map: makeConcreteTexture(4, 2) });
  const sandBagMat = new THREE.MeshLambertMaterial({ color: 0x9b8050 });
  const metalMat   = new THREE.MeshLambertMaterial({ color: 0x4a4a40 });
  const rustMat    = new THREE.MeshLambertMaterial({ color: 0x6b3a20 });
  const rubbleMat  = new THREE.MeshLambertMaterial({ color: 0x7a7060 });
  const wallMat    = new THREE.MeshLambertMaterial({ map: makeConcreteTexture(8, 2) });
  const dirtMat    = new THREE.MeshLambertMaterial({ color: 0x7a5a30 });

  // ── Helper: add solid box, register collidable & levelMeshes
  function box(x, y, z, w, h, d, mat) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat || concMat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
    collidables.push(new THREE.Box3().setFromObject(m));
    levelMeshes.push(m);
    return m;
  }

  // ── Floor
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2, HALF * 2), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  levelMeshes.push(floor);

  // ── Bomb crater darkened patches (flat cosmetic discs)
  const craterMat = new THREE.MeshLambertMaterial({ color: 0x4a3010 });
  [[0, 0], [-18, 12], [20, -15], [-8, -25], [15, 20]].forEach(([cx, cz]) => {
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(3.5 + Math.random() * 1.5, 4 + Math.random() * 1.5, 0.08, 16), craterMat);
    disc.position.set(cx, 0.01, cz);
    disc.receiveShadow = true;
    scene.add(disc);
    levelMeshes.push(disc);
  });

  // ── Warfront sky dome — dusty amber overcast
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 1024; skyCanvas.height = 1024;
  const skyCtx = skyCanvas.getContext('2d');
  const skyGrad = skyCtx.createLinearGradient(0, 0, 0, skyCanvas.height);
  skyGrad.addColorStop(0, '#5a4020');   // dark brownish zenith
  skyGrad.addColorStop(0.35, '#c8803a'); // amber mid
  skyGrad.addColorStop(0.65, '#d4a870'); // warm haze
  skyGrad.addColorStop(1, '#e8c090');   // pale horizon
  skyCtx.fillStyle = skyGrad;
  skyCtx.fillRect(0, 0, skyCanvas.width, skyCanvas.height);
  // Hazy sun (partially obscured)
  const sgr = skyCtx.createRadialGradient(skyCanvas.width * 0.65, skyCanvas.height * 0.28, 0, skyCanvas.width * 0.65, skyCanvas.height * 0.28, 90);
  sgr.addColorStop(0, 'rgba(255,220,120,0.85)');
  sgr.addColorStop(0.5, 'rgba(255,180,80,0.4)');
  sgr.addColorStop(1, 'rgba(255,150,50,0)');
  skyCtx.fillStyle = sgr;
  skyCtx.fillRect(0, 0, skyCanvas.width, skyCanvas.height);
  // Smoke / dust clouds
  for (let i = 0; i < 80; i++) {
    skyCtx.beginPath();
    skyCtx.arc(
      Math.random() * skyCanvas.width,
      Math.random() * skyCanvas.height * 0.75,
      40 + Math.random() * 100,
      0, Math.PI * 2
    );
    const a = 0.04 + Math.random() * 0.14;
    skyCtx.fillStyle = `rgba(60,40,20,${a})`;
    skyCtx.fill();
  }
  const skyTex = new THREE.CanvasTexture(skyCanvas);
  const skyGeo = new THREE.SphereGeometry(100, 32, 16);
  const skyMat = new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false });
  const skyMesh = new THREE.Mesh(skyGeo, skyMat);
  scene.add(skyMesh);
  levelMeshes.push(skyMesh);

  // ── Outer boundary walls (concrete)
  const hw = WALL_H / 2;
  box(0,    hw, -HALF, HALF * 2, WALL_H, 1, wallMat);  // North
  box(0,    hw,  HALF, HALF * 2, WALL_H, 1, wallMat);  // South
  box(-HALF, hw, 0,   1, WALL_H, HALF * 2, wallMat);   // West
  box( HALF, hw, 0,   1, WALL_H, HALF * 2, wallMat);   // East

  // ── Ruined building shells at each corner
  // Each corner: partial walls with a gap on one side
  [
    { cx: -26, cz: -26, gapSide: 'east'  },
    { cx:  26, cz: -26, gapSide: 'west'  },
    { cx: -26, cz:  26, gapSide: 'east'  },
    { cx:  26, cz:  26, gapSide: 'west'  },
  ].forEach(({ cx, cz, gapSide }) => {
    const W = 10; const D = 10; const WH = 5.5; const wt = 0.9;
    // Floor slab
    box(cx, 0.05, cz, W, 0.12, D, dirtMat);
    // Four partial walls — skip one side for the gap
    if (gapSide !== 'north') box(cx, WH / 2, cz - D / 2, W, WH, wt, concMat); // North wall
    if (gapSide !== 'south') box(cx, WH / 2, cz + D / 2, W, WH, wt, concMat); // South wall
    if (gapSide !== 'west')  box(cx - W / 2, WH / 2, cz, wt, WH, D, concMat); // West wall
    if (gapSide !== 'east')  box(cx + W / 2, WH / 2, cz, wt, WH, D, concMat); // East wall
    // Partial interior divider (blown-out room feel)
    box(cx - 1.5, WH * 0.35, cz, wt, WH * 0.7, D * 0.5, concMat);
    // Rubble pile inside
    for (let rb = 0; rb < 4; rb++) {
      const rx = cx + (Math.random() - 0.5) * 7;
      const rz = cz + (Math.random() - 0.5) * 7;
      const rh = 0.3 + Math.random() * 0.8;
      box(rx, rh / 2, rz, 0.6 + Math.random(), rh, 0.6 + Math.random(), rubbleMat);
    }
  });

  // ── Sandbag barriers scattered across mid-field
  function sandbagWall(x, z, len, axis) {
    // axis: 'x' = runs along X axis, 'z' = runs along Z axis
    const count = Math.ceil(len / 1.2);
    for (let i = 0; i < count; i++) {
      const ox = axis === 'x' ? (i - count / 2) * 1.1 : (Math.random() - 0.5) * 0.15;
      const oz = axis === 'z' ? (i - count / 2) * 1.1 : (Math.random() - 0.5) * 0.15;
      box(x + ox, 0.35, z + oz, 1.05, 0.7, 0.55, sandBagMat);
      // Second row staggered on top
      if (Math.random() > 0.35) {
        box(x + ox + (axis === 'x' ? 0.52 : 0), 0.95,
            z + oz + (axis === 'z' ? 0.52 : 0),
            1.05, 0.7, 0.55, sandBagMat);
      }
    }
  }
  sandbagWall(0,    -13, 10, 'x');
  sandbagWall(0,     13, 10, 'x');
  sandbagWall(-13,   0, 10, 'z');
  sandbagWall( 13,   0, 10, 'z');
  sandbagWall(-20,  -8,  6, 'x');
  sandbagWall( 20,   8,  6, 'x');
  sandbagWall(-7,   22,  6, 'z');
  sandbagWall( 7,  -22,  6, 'z');

  // ── Destroyed vehicle hulks
  function vehicleHulk(x, z, rotY) {
    const body = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1.4, 2.2), rustMat);
    body.position.set(x, 0.7, z);
    body.rotation.y = rotY;
    body.castShadow = true; body.receiveShadow = true;
    scene.add(body);
    collidables.push(new THREE.Box3().setFromObject(body));
    levelMeshes.push(body);

    // Cab / turret stub
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.0, 1.8), metalMat);
    cab.position.set(x, 1.9, z);
    cab.rotation.y = rotY;
    cab.castShadow = true;
    scene.add(cab);
    collidables.push(new THREE.Box3().setFromObject(cab));
    levelMeshes.push(cab);

    // Wheels (cosmetic cylinders)
    [[-1.8, -1.1], [0, -1.1], [1.8, -1.1], [-1.8, 1.1], [0, 1.1], [1.8, 1.1]].forEach(([wx, wz]) => {
      const wCos = Math.cos(rotY), wSin = Math.sin(rotY);
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.28, 10), metalMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x + wx * wCos - wz * wSin, 0.38, z + wx * wSin + wz * wCos);
      scene.add(wheel);
      levelMeshes.push(wheel);
    });
  }
  vehicleHulk(-20,  18, 0.4);
  vehicleHulk( 20, -18, 2.8);
  vehicleHulk(-8,  -18, 1.0);
  vehicleHulk( 8,   18, 3.5);

  // ── Rubble piles (mid-field scatter cover)
  const rubblePositions = [
    [-16, 6], [16, 6], [-16, -6], [16, -6],
    [-28, 12], [28, -12],
    [-5, 28], [5, -28],
    [0, -18], [0, 18],
    [-22, 0], [22, 0],
  ];
  rubblePositions.forEach(([rx, rz]) => {
    const pieces = 3 + Math.floor(Math.random() * 4);
    for (let p = 0; p < pieces; p++) {
      const px = rx + (Math.random() - 0.5) * 3;
      const pz = rz + (Math.random() - 0.5) * 3;
      const ph = 0.3 + Math.random() * 1.1;
      const pw = 0.5 + Math.random() * 1.2;
      const pd = 0.5 + Math.random() * 1.2;
      box(px, ph / 2, pz, pw, ph, pd, rubbleMat);
    }
  });

  // ── Barbed wire fence sections (thin poles + cross bars)
  function barbedWireFence(x, z, len, axis) {
    const posts = Math.ceil(len / 3);
    for (let i = 0; i < posts; i++) {
      const ox = axis === 'x' ? (i - posts / 2) * 3 : 0;
      const oz = axis === 'z' ? (i - posts / 2) * 3 : 0;
      // Post
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.5, 0.08), metalMat);
      post.position.set(x + ox, 0.75, z + oz);
      scene.add(post);
      levelMeshes.push(post);
      // Cross bar
      const bar = new THREE.Mesh(new THREE.BoxGeometry(axis === 'x' ? 3 : 0.06, 0.06, axis === 'z' ? 3 : 0.06), metalMat);
      bar.position.set(x + ox, 1.3, z + oz);
      scene.add(bar);
      levelMeshes.push(bar);
    }
  }
  barbedWireFence(-32, -10, 12, 'z');
  barbedWireFence( 32,  10, 12, 'z');
  barbedWireFence(-10, -32, 12, 'x');
  barbedWireFence( 10,  32, 12, 'x');

  // ── Central destroyed watchtower (tall box with platforms)
  box(0, 3.5, 0, 2.5, 7, 2.5, concMat);       // Tower shaft
  box(0, 6.8, 0, 4.5, 0.35, 4.5, metalMat);   // Top platform
  box(0, 4.2, 0, 3.5, 0.25, 3.5, metalMat);   // Mid platform
  // Damaged corner of tower
  box(0.8, 1.5, 0.8, 1.5, 3, 1.5, rubbleMat);

  // ── Lighting — warm battlefield atmosphere
  scene.add(new THREE.AmbientLight(0xb89060, 2.2));

  const dir = new THREE.DirectionalLight(0xd4a060, 2.0);
  dir.position.set(-15, 18, 8);  // low-angle side lighting
  dir.castShadow = true;
  dir.shadow.mapSize.width = 2048;
  dir.shadow.mapSize.height = 2048;
  dir.shadow.camera.near = 0.1;
  dir.shadow.camera.far = 90;
  dir.shadow.camera.left = -60;
  dir.shadow.camera.right = 60;
  dir.shadow.camera.top = 60;
  dir.shadow.camera.bottom = -60;
  scene.add(dir);
  levelMeshes.push(dir);

  // Burning fire glow — centre tower
  addPointLight(0, 4, 0, 0xff4400, 3.5, 28);
  // Secondary fires at vehicle hulks
  addPointLight(-20, 2, 18, 0xff6600, 2.2, 18);
  addPointLight( 20, 2, -18, 0xff5500, 2.0, 16);
  // Dusty fill lights
  addPointLight(-30, 4, 0, 0xc87830, 1.2, 22);
  addPointLight( 30, 4, 0, 0xc87830, 1.2, 22);
}

// ── Dispatcher: build the right level based on map id
function createLevel(mapId) {
  if (mapId === 'warfront') {
    // Warfront atmosphere
    scene.background = new THREE.Color(0xc8803a);
    scene.fog = new THREE.FogExp2(0xc8a060, 0.013);
    createBattlefieldLevel();
  } else {
    // Original Deadzone arena
    scene.background = new THREE.Color(0x6eb5ff);
    scene.fog = new THREE.FogExp2(0x6eb5ff, 0.011);
    createDeadzoneLevel();
  }
}

function addPointLight(x, y, z, color, intensity, distance) {
  const light = new THREE.PointLight(color, intensity, distance);
  light.position.set(x, y, z);
  scene.add(light);
  levelMeshes.push(light); // auto-register for cleanup on map reload
  return light;
}

// ─────────────────────────────────────────────────────────
//  WEAPON (rendered in a separate scene — no z-clip)
// ─────────────────────────────────────────────────────────

/**
 * Build a left hand group (palm + fingers + thumb) in skin tone.
 * @param {number} x  Local X offset from weapon origin
 * @param {number} y  Local Y offset
 * @param {number} z  Local Z offset
 * @param {object} [rot] Optional {x,y,z} Euler rotations in radians
 */
function buildLeftHand(x, y, z, rot = {}) {
  const skin   = new THREE.MeshLambertMaterial({ color: 0xc68642 });
  const skinDk = new THREE.MeshLambertMaterial({ color: 0xb5733a });

  const hand = new THREE.Group();

  // Palm
  const palm = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.026, 0.072), skin);
  hand.add(palm);

  // Four fingers (index → pinky), spread slightly
  const fingerOffsets = [-0.028, -0.009, 0.010, 0.029];
  fingerOffsets.forEach((fx) => {
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.024, 0.040), skin);
    f.position.set(fx, 0, -0.055);
    hand.add(f);
    // knuckle crease
    const k = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.026, 0.004), skinDk);
    k.position.set(fx, 0, -0.037);
    hand.add(k);
  });

  // Thumb (angled down toward trigger-guard side)
  const thumb = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.016, 0.034), skin);
  thumb.rotation.z =  0.45;
  thumb.rotation.x = -0.3;
  thumb.position.set(-0.046, -0.010, -0.006);
  hand.add(thumb);

  // Position & orient the whole hand
  hand.position.set(x, y, z);
  if (rot.x) hand.rotation.x = rot.x;
  if (rot.y) hand.rotation.y = rot.y;
  if (rot.z) hand.rotation.z = rot.z;

  return hand;
}

/** Build a 3D mesh group for the rifle */
function buildRifle() {
  const dark = new THREE.MeshLambertMaterial({ color: 0x151515 });
  const metal = new THREE.MeshLambertMaterial({ color: 0x222222 });
  const chrome = new THREE.MeshLambertMaterial({ color: 0x111111 });

  const g = new THREE.Group();

  // Upper/Lower Receiver
  g.add(mesh(new THREE.BoxGeometry(0.08, 0.12, 0.35), dark));
  
  // Handguard (Quad rail)
  g.add(meshAt(new THREE.BoxGeometry(0.07, 0.08, 0.4), metal, 0, 0.02, -0.35));
  
  // Barrel
  g.add(meshAt(new THREE.BoxGeometry(0.02, 0.02, 0.15), metal, 0, 0.02, -0.6));
  
  // Suppressor
  g.add(meshAt(new THREE.BoxGeometry(0.06, 0.06, 0.3), dark, 0, 0.02, -0.8));
  
  // Stock
  const stock = meshAt(new THREE.BoxGeometry(0.06, 0.14, 0.35), dark, 0, -0.05, 0.35);
  stock.rotation.x = -0.05;
  g.add(stock);
  
  // Pistol grip
  const grip = meshAt(new THREE.BoxGeometry(0.06, 0.16, 0.08), dark, 0, -0.12, 0.1);
  grip.rotation.x = 0.15;
  g.add(grip);
  
  // Foregrip (vertical grip under handguard)
  g.add(meshAt(new THREE.BoxGeometry(0.04, 0.12, 0.05), dark, 0, -0.08, -0.3));

  // Magazine (curved/angled downwards) — animated during reload
  const mag = meshAt(new THREE.BoxGeometry(0.05, 0.22, 0.08), metal, 0, -0.16, -0.02);
  mag.rotation.x = -0.1;
  g.add(mag);
  g.userData.mag = mag;
  g.userData.magRestY = -0.16;
  g.userData.magDrop = 0.26;

  // Trigger guard & trigger
  g.add(meshAt(new THREE.BoxGeometry(0.01, 0.04, 0.08), metal, 0, -0.08, 0.04));
  const trig = meshAt(new THREE.BoxGeometry(0.01, 0.04, 0.02), chrome, 0, -0.08, 0.03);
  trig.rotation.x = 0.3;
  g.add(trig);

  // Scope (ACOG style)
  g.add(meshAt(new THREE.BoxGeometry(0.04, 0.06, 0.2), dark, 0, 0.09, -0.05));
  g.add(meshAt(new THREE.BoxGeometry(0.02, 0.02, 0.25), dark, 0, 0.13, -0.05));
  g.add(meshAt(new THREE.BoxGeometry(0.01, 0.03, 0.15), metal, 0, 0.06, -0.05));

  // Front iron sight block (M4 style triangle)
  g.add(meshAt(new THREE.BoxGeometry(0.02, 0.08, 0.05), metal, 0, 0.06, -0.55));

  // Muzzle flash
  const flashMat = new THREE.MeshBasicMaterial({ color: 0xffcc00, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  const flash = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.16), flashMat);
  flash.position.set(0, 0.02, -1.05);
  g.userData.muzzleFlash = flash;
  g.add(flash);

  // Left hand gripping the handguard
  const hand = buildLeftHand(-0.04, -0.05, -0.32, { x: 0.1, y: 0.0, z: -0.15 });
  g.add(hand);
  g.userData.leftHand = hand;
  g.userData.handRest = hand.position.clone();

  return g;
}

/** Build M9 Beretta (procedural geometry — no external files needed) */
function buildPistol() {
  const steel    = new THREE.MeshLambertMaterial({ color: 0x1c1c1c }); // Dark slide
  const frame    = new THREE.MeshLambertMaterial({ color: 0x2a2a2a }); // Frame body
  const polymer  = new THREE.MeshLambertMaterial({ color: 0x111111 }); // Black grip panels
  const chrome   = new THREE.MeshLambertMaterial({ color: 0x888888 }); // Barrel / metal accents
  const bronze   = new THREE.MeshLambertMaterial({ color: 0x7a6030 }); // Trigger / small parts

  const g = new THREE.Group();

  // ── Slide (M9 has a long, open-top slide) ──
  // Main slide body
  g.add(mesh(new THREE.BoxGeometry(0.068, 0.072, 0.42), steel));

  // Open-top cutout effect — two side rails sit higher than centre
  const railL = meshAt(new THREE.BoxGeometry(0.012, 0.03, 0.28), steel, -0.028, 0.051, -0.05);
  g.add(railL);
  const railR = meshAt(new THREE.BoxGeometry(0.012, 0.03, 0.28), steel,  0.028, 0.051, -0.05);
  g.add(railR);

  // Front of slide (solid end cap)
  g.add(meshAt(new THREE.BoxGeometry(0.068, 0.072, 0.04), steel, 0, 0, -0.23));

  // ── Barrel (sticks out front, exposed under the open slide) ──
  const barrel = mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.38, 10), chrome);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.005, -0.09);
  g.add(barrel);

  // Muzzle bushing (ring at the front)
  const bushing = mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.025, 10), steel);
  bushing.rotation.x = Math.PI / 2;
  bushing.position.set(0, 0.005, -0.265);
  g.add(bushing);

  // ── Frame ──
  g.add(meshAt(new THREE.BoxGeometry(0.068, 0.052, 0.40), frame, 0, -0.038, -0.01));

  // ── Grip (M9 has a long straight grip) ──
  const grip = meshAt(new THREE.BoxGeometry(0.062, 0.21, 0.095), frame, 0, -0.165, 0.155);
  grip.rotation.x = 0.12;
  g.add(grip);

  // Grip panel texture strips (raised lines on M9 grip)
  for (let i = 0; i < 5; i++) {
    const strip = meshAt(new THREE.BoxGeometry(0.066, 0.006, 0.07), polymer, 0, -0.10 - i * 0.022, 0.148 + i * 0.003);
    strip.rotation.x = 0.12;
    g.add(strip);
  }

  // ── Squared trigger guard (M9 signature feature) ──
  // Bottom bar
  g.add(meshAt(new THREE.BoxGeometry(0.060, 0.008, 0.072), frame, 0, -0.075, 0.035));
  // Front vertical
  g.add(meshAt(new THREE.BoxGeometry(0.060, 0.038, 0.008), frame, 0, -0.060, -0.001));
  // Rear vertical (connects to frame)
  g.add(meshAt(new THREE.BoxGeometry(0.060, 0.028, 0.008), frame, 0, -0.068, 0.072));

  // ── Trigger ──
  const trig = meshAt(new THREE.BoxGeometry(0.008, 0.042, 0.012), bronze, 0, -0.065, 0.030);
  trig.rotation.x = 0.2;
  g.add(trig);

  // ── Magazine body (slides inside grip, visible below it, animated during reload) ──
  const pistolMag = meshAt(new THREE.BoxGeometry(0.054, 0.188, 0.083), polymer, 0, -0.240, 0.155);
  pistolMag.rotation.x = 0.12;
  g.add(pistolMag);
  g.userData.mag = pistolMag;
  g.userData.magRestY = -0.240;
  g.userData.magDrop = 0.22;

  // ── Magazine base plate ──
  g.add(meshAt(new THREE.BoxGeometry(0.068, 0.010, 0.095), polymer, 0, -0.268, 0.155));

  // ── Exposed hammer (M9's external hammer) ──
  const hammer = meshAt(new THREE.BoxGeometry(0.012, 0.032, 0.018), steel, 0, 0.052, 0.197);
  hammer.rotation.x = -0.4;
  g.add(hammer);

  // ── Sights ──
  // Rear sight (U-notch)
  g.add(meshAt(new THREE.BoxGeometry(0.038, 0.012, 0.008), steel, 0, 0.042, 0.185));
  // Front sight post
  g.add(meshAt(new THREE.BoxGeometry(0.008, 0.016, 0.008), steel, 0, 0.042, -0.195));

  // ── Safety lever (left side) ──
  g.add(meshAt(new THREE.BoxGeometry(0.006, 0.018, 0.028), bronze, -0.037, 0.010, 0.12));

  // ── Muzzle flash ──
  const flashMat = new THREE.MeshBasicMaterial({ color: 0xffee00, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  const flash = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.12), flashMat);
  flash.position.set(0, 0.005, -0.285);
  g.userData.muzzleFlash = flash;
  g.add(flash);

  // Left hand supporting the frame (two-handed pistol grip)
  const hand = buildLeftHand(-0.04, -0.12, 0.05, { x: 0.2, y: 0.0, z: -0.2 });
  g.add(hand);
  g.userData.leftHand = hand;
  g.userData.handRest = hand.position.clone();

  return g;
}

/** Build shotgun (procedural geometry — no external files needed) */
function buildShotgun() {
  const g = new THREE.Group();

  const wood   = new THREE.MeshLambertMaterial({ color: 0x6b3a1f });
  const metal  = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
  const dark   = new THREE.MeshLambertMaterial({ color: 0x111111 });

  // Main body / receiver
  g.add(mesh(new THREE.BoxGeometry(0.07, 0.09, 0.38), metal));

  // Barrel (long, slightly above center)
  const barrel = mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.55, 10), metal);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.01, -0.45);
  g.add(barrel);

  // Barrel shroud / heat shield (sits below the barrel)
  const shroud = mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.40, 8), dark);
  shroud.rotation.x = Math.PI / 2;
  shroud.position.set(0, -0.04, -0.38);
  g.add(shroud);

  // Magazine tube (under barrel)
  const magTube = mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.42, 8), metal);
  magTube.rotation.x = Math.PI / 2;
  magTube.position.set(0, -0.032, -0.38);
  g.add(magTube);

  // Stock (wood)
  const stock = mesh(new THREE.BoxGeometry(0.055, 0.07, 0.28), wood);
  stock.position.set(0, -0.01, 0.25);
  g.add(stock);

  // Pistol grip
  const grip = mesh(new THREE.BoxGeometry(0.045, 0.11, 0.055), wood);
  grip.position.set(0, -0.09, 0.08);
  g.add(grip);

  // Trigger guard
  const guard = mesh(new THREE.TorusGeometry(0.028, 0.006, 6, 12, Math.PI), metal);
  guard.rotation.x = -Math.PI / 2;
  guard.position.set(0, -0.07, 0.08);
  g.add(guard);

  // Front sight
  const fSight = mesh(new THREE.BoxGeometry(0.006, 0.018, 0.006), metal);
  fSight.position.set(0, 0.035, -0.67);
  g.add(fSight);

  // Rear sight
  const rSight = mesh(new THREE.BoxGeometry(0.03, 0.012, 0.006), metal);
  rSight.position.set(0, 0.055, -0.08);
  g.add(rSight);

  // Muzzle flash
  const flashMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  const flash = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.2), flashMat);
  flash.position.set(0, 0.01, -0.73);
  g.userData.muzzleFlash = flash;
  g.add(flash);

  // Left hand gripping the pump / foregrip area
  const hand = buildLeftHand(-0.04, -0.04, -0.35, { x: 0.15, y: 0.0, z: -0.18 });
  g.add(hand);
  g.userData.leftHand = hand;
  g.userData.handRest = hand.position.clone();

  g.userData.magType = 'shells'; // uses individual shell loading
  return g;
}

/** Build sniper */
function buildSniper() {
  const tan = new THREE.MeshLambertMaterial({ color: 0xb0a070 });
  const dark = new THREE.MeshLambertMaterial({ color: 0x151515 });
  const metal = new THREE.MeshLambertMaterial({ color: 0x222222 });

  const g = new THREE.Group();
  
  // Chassis / Main Body (Tan)
  g.add(mesh(new THREE.BoxGeometry(0.08, 0.10, 0.5), tan));
  
  // Long Barrel (Thick, Dark)
  g.add(meshAt(new THREE.BoxGeometry(0.045, 0.045, 0.8), metal, 0, 0.02, -0.55));
  
  // Muzzle Brake
  g.add(meshAt(new THREE.BoxGeometry(0.055, 0.055, 0.1), dark, 0, 0.02, -0.95));
  
  // Massive Scope
  g.add(meshAt(new THREE.BoxGeometry(0.055, 0.055, 0.4), dark, 0, 0.12, -0.05)); // Scope body
  g.add(meshAt(new THREE.BoxGeometry(0.065, 0.065, 0.15), dark, 0, 0.12, -0.2)); // Front bell
  g.add(meshAt(new THREE.BoxGeometry(0.06, 0.06, 0.1), dark, 0, 0.12, 0.1)); // Rear ocular
  
  // Scope Mounts
  g.add(meshAt(new THREE.BoxGeometry(0.02, 0.04, 0.05), metal, 0, 0.07, -0.05));
  g.add(meshAt(new THREE.BoxGeometry(0.02, 0.04, 0.05), metal, 0, 0.07, 0.1));
  
  // Pistol Grip (Black)
  const grip = meshAt(new THREE.BoxGeometry(0.06, 0.15, 0.08), dark, 0, -0.1, 0.15);
  grip.rotation.x = 0.15;
  g.add(grip);
  
  // Magazine (Large, Boxy, Black) — animated during reload
  const sniperMag = meshAt(new THREE.BoxGeometry(0.06, 0.12, 0.1), metal, 0, -0.09, -0.05);
  g.add(sniperMag);
  g.userData.mag = sniperMag;
  g.userData.magRestY = -0.09;
  g.userData.magDrop = 0.20;
  
  // Stock (Tan)
  const stock = meshAt(new THREE.BoxGeometry(0.06, 0.12, 0.35), tan, 0, -0.02, 0.42);
  g.add(stock);
  
  // Cheek Rest (Black)
  g.add(meshAt(new THREE.BoxGeometry(0.065, 0.04, 0.15), dark, 0, 0.06, 0.4));
  
  // Buttpad (Black)
  g.add(meshAt(new THREE.BoxGeometry(0.065, 0.13, 0.03), dark, 0, -0.02, 0.58));
  
  // Bipod legs (Folded down/forward)
  const leftLeg = meshAt(new THREE.BoxGeometry(0.02, 0.25, 0.02), dark, 0.06, -0.1, -0.4);
  leftLeg.rotation.z = -0.3;
  leftLeg.rotation.x = 0.3;
  g.add(leftLeg);
  
  const rightLeg = meshAt(new THREE.BoxGeometry(0.02, 0.25, 0.02), dark, -0.06, -0.1, -0.4);
  rightLeg.rotation.z = 0.3;
  rightLeg.rotation.x = 0.3;
  g.add(rightLeg);

  const flashMat = new THREE.MeshBasicMaterial({ color: 0xffcc00, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  const flash = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.18), flashMat);
  flash.position.set(0, 0.02, -1.1); // Move past muzzle brake
  g.userData.muzzleFlash = flash;
  g.add(flash);

  // Left hand gripping the foregrip area below the barrel
  const hand = buildLeftHand(-0.04, -0.06, -0.38, { x: 0.1, y: 0.0, z: -0.15 });
  g.add(hand);
  g.userData.leftHand = hand;
  g.userData.handRest = hand.position.clone();

  return g;
}

/** Build Desert Eagle — detailed procedural geometry */
function buildDesertEagle() {
  // ── Materials ──────────────────────────────────────────────
  // Polished chrome slide
  const slideChrome = new THREE.MeshPhongMaterial({ color: 0x9a9a9a, specular: 0xffffff, shininess: 120 });
  // Slightly darker frame / lower receiver
  const frameMetal  = new THREE.MeshPhongMaterial({ color: 0x7a7a7a, specular: 0xcccccc, shininess:  80 });
  // Near-black polymer grip panels
  const polymer     = new THREE.MeshPhongMaterial({ color: 0x1a1a1a, specular: 0x333333, shininess:  30 });
  // Dark barrel / internal parts
  const darkMetal   = new THREE.MeshPhongMaterial({ color: 0x222222, specular: 0x666666, shininess:  60 });
  // Bright polished barrel muzzle ring
  const barrelRing  = new THREE.MeshPhongMaterial({ color: 0xbbbbbb, specular: 0xffffff, shininess: 160 });
  // Trigger gold/bronze tint
  const bronze      = new THREE.MeshPhongMaterial({ color: 0x8a6030, specular: 0xddaa44, shininess:  80 });

  const g = new THREE.Group();

  // ── 1. SLIDE (upper receiver) ─────────────────────────────
  // Main slide body — thick and tall (Desert Eagle slide is chunky)
  g.add(mesh(new THREE.BoxGeometry(0.090, 0.115, 0.390), slideChrome));

  // Top-of-slide bevel chamfer (angled strips along top edges for that angular look)
  const topBevelL = meshAt(new THREE.BoxGeometry(0.012, 0.020, 0.380), darkMetal, -0.039, 0.058, 0.005);
  topBevelL.rotation.z =  0.45;
  g.add(topBevelL);
  const topBevelR = meshAt(new THREE.BoxGeometry(0.012, 0.020, 0.380), darkMetal,  0.039, 0.058, 0.005);
  topBevelR.rotation.z = -0.45;
  g.add(topBevelR);

  // Ejection port cutout simulation — a recessed dark panel on the right side
  g.add(meshAt(new THREE.BoxGeometry(0.004, 0.040, 0.120), darkMetal,  0.047, 0.020, -0.055));

  // Serrations on the rear of the slide (cocking serrations — thin ridges)
  for (let i = 0; i < 7; i++) {
    const ridge = meshAt(new THREE.BoxGeometry(0.093, 0.090, 0.004), darkMetal, 0, 0.010, 0.115 + i * 0.018);
    g.add(ridge);
  }

  // Front slide taper (nose of the slide is slightly narrower)
  const slideNose = meshAt(new THREE.BoxGeometry(0.080, 0.100, 0.045), slideChrome, 0, 0.003, -0.218);
  g.add(slideNose);

  // ── 2. BARREL ─────────────────────────────────────────────
  // The Desert Eagle has a prominent fixed barrel (polygonal rifling barrel)
  // Outer barrel shroud — octagonal cross-section approximated with a cylinder
  const barrelShroud = mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.330, 8), darkMetal);
  barrelShroud.rotation.x = Math.PI / 2;
  barrelShroud.position.set(0, 0.018, -0.100);
  g.add(barrelShroud);

  // Muzzle end — polished ring
  const muzzleRing = mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.018, 16), barrelRing);
  muzzleRing.rotation.x = Math.PI / 2;
  muzzleRing.position.set(0, 0.018, -0.264);
  g.add(muzzleRing);

  // Inner bore hole (dark circle visible at muzzle face)
  const bore = mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.022, 12), darkMetal);
  bore.rotation.x = Math.PI / 2;
  bore.position.set(0, 0.018, -0.272);
  g.add(bore);

  // Gas tube (Desert Eagle is gas-operated — tube runs above the barrel)
  const gasTube = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.240, 8), darkMetal);
  gasTube.rotation.x = Math.PI / 2;
  gasTube.position.set(0, 0.048, -0.100);
  g.add(gasTube);

  // Gas block / front lug
  g.add(meshAt(new THREE.BoxGeometry(0.036, 0.022, 0.028), darkMetal, 0, 0.045, -0.200));

  // ── 3. FRAME (lower receiver) ─────────────────────────────
  // Main frame body — slightly shorter Z than slide, sits below
  g.add(meshAt(new THREE.BoxGeometry(0.082, 0.062, 0.360), frameMetal, 0, -0.039, 0.005));

  // Dust-cover / frame rail ledge at the front bottom
  g.add(meshAt(new THREE.BoxGeometry(0.082, 0.016, 0.090), frameMetal, 0, -0.075, -0.155));

  // Frame bevel — bottom-front chamfer on the frame
  const frameFrontBevel = meshAt(new THREE.BoxGeometry(0.082, 0.022, 0.030), frameMetal, 0, -0.062, -0.197);
  frameFrontBevel.rotation.x =  0.5;
  g.add(frameFrontBevel);

  // ── 4. GRIP ───────────────────────────────────────────────
  // Desert Eagle has a distinctive long, slightly-angled grip
  // Main grip block
  const gripMain = meshAt(new THREE.BoxGeometry(0.074, 0.195, 0.098), polymer, 0, -0.168, 0.145);
  gripMain.rotation.x = 0.12;   // slight forward cant
  g.add(gripMain);

  // ── Magazine body (inside grip, animated during reload) ──
  const deagleMag = meshAt(new THREE.BoxGeometry(0.066, 0.178, 0.090), polymer, 0, -0.245, 0.145);
  deagleMag.rotation.x = 0.12;
  g.add(deagleMag);
  g.userData.mag = deagleMag;
  g.userData.magRestY = -0.245;
  g.userData.magDrop = 0.26;

  // Grip panel texture — raised horizontal ridges (checkering simulation)
  for (let i = 0; i < 8; i++) {
    const ridge = meshAt(new THREE.BoxGeometry(0.077, 0.007, 0.092), darkMetal, 0, -0.085 - i * 0.018, 0.143 + i * 0.002);
    ridge.rotation.x = 0.12;
    g.add(ridge);
  }

  // Backstrap — thin metal strip at the rear of the grip
  const backstrap = meshAt(new THREE.BoxGeometry(0.010, 0.190, 0.010), frameMetal, 0, -0.168, 0.193);
  backstrap.rotation.x = 0.12;
  g.add(backstrap);

  // Magazine base plate — flat bottom of the grip
  g.add(meshAt(new THREE.BoxGeometry(0.078, 0.012, 0.102), polymer, 0, -0.264, 0.145));

  // ── 5. TRIGGER GUARD ─────────────────────────────────────
  // Desert Eagle has a LARGE, curved trigger guard with a finger groove at front
  // Bottom bar of the guard
  g.add(meshAt(new THREE.BoxGeometry(0.072, 0.010, 0.085), frameMetal, 0, -0.089, 0.022));
  // Front vertical of guard
  g.add(meshAt(new THREE.BoxGeometry(0.072, 0.048, 0.010), frameMetal, 0, -0.068, -0.020));
  // Rear vertical connecting to frame
  g.add(meshAt(new THREE.BoxGeometry(0.072, 0.036, 0.010), frameMetal, 0, -0.074, 0.065));
  // Hooked front bottom of guard (finger groove ledge)
  const guardHook = meshAt(new THREE.BoxGeometry(0.072, 0.012, 0.020), polymer, 0, -0.092, -0.013);
  guardHook.rotation.x = -0.35;
  g.add(guardHook);

  // ── 6. TRIGGER ────────────────────────────────────────────
  const trig = meshAt(new THREE.BoxGeometry(0.010, 0.050, 0.014), bronze, 0, -0.077, 0.023);
  trig.rotation.x = 0.18;
  g.add(trig);

  // ── 7. HAMMER ─────────────────────────────────────────────
  // External spur hammer at the rear of the slide
  const hammerBase = meshAt(new THREE.BoxGeometry(0.022, 0.038, 0.022), darkMetal, 0, 0.068, 0.210);
  hammerBase.rotation.x = -0.30;
  g.add(hammerBase);
  // Hammer spur
  const hammerSpur = meshAt(new THREE.BoxGeometry(0.018, 0.012, 0.028), darkMetal, 0, 0.085, 0.228);
  hammerSpur.rotation.x = -0.55;
  g.add(hammerSpur);

  // ── 8. SIGHTS ─────────────────────────────────────────────
  // Rear sight — low-profile, wide notch style
  g.add(meshAt(new THREE.BoxGeometry(0.048, 0.014, 0.010), slideChrome, 0, 0.065, 0.170));
  // Rear sight wings (create the U-notch silhouette)
  g.add(meshAt(new THREE.BoxGeometry(0.010, 0.016, 0.010), darkMetal, -0.019, 0.065, 0.170));
  g.add(meshAt(new THREE.BoxGeometry(0.010, 0.016, 0.010), darkMetal,  0.019, 0.065, 0.170));

  // Front sight post — Desert Eagle has a tall, prominent front sight
  g.add(meshAt(new THREE.BoxGeometry(0.010, 0.022, 0.010), slideChrome, 0, 0.065, -0.185));

  // ── 9. SAFETY LEVER (left side) ──────────────────────────
  g.add(meshAt(new THREE.BoxGeometry(0.008, 0.020, 0.036), bronze, -0.047, 0.020, 0.110));

  // ── 10. MAGAZINE RELEASE BUTTON ──────────────────────────
  g.add(meshAt(new THREE.BoxGeometry(0.008, 0.012, 0.016), bronze, -0.043, -0.040, 0.085));

  // ── 11. SLIDE STOP LEVER ─────────────────────────────────
  g.add(meshAt(new THREE.BoxGeometry(0.008, 0.010, 0.042), darkMetal, -0.044, -0.012, -0.020));

  // ── 12. MUZZLE FLASH ─────────────────────────────────────
  const flashMat = new THREE.MeshBasicMaterial({
    color: 0xffdd00, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide
  });
  const flash = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.16), flashMat);
  flash.position.set(0, 0.018, -0.280);
  g.userData.muzzleFlash = flash;
  g.add(flash);

  // ── 13. HAND ─────────────────────────────────────────────
  // Two-handed pistol grip — supporting hand cups the grip from the left
  const hand = buildLeftHand(-0.044, -0.118, 0.048, { x: 0.18, y: 0.0, z: -0.18 });
  g.add(hand);
  g.userData.leftHand = hand;
  g.userData.handRest = hand.position.clone();

  return g;
}

/** Build UZI */
function buildUzi() {
  const metal = new THREE.MeshLambertMaterial({ color: 0x222222 });
  const dark = new THREE.MeshLambertMaterial({ color: 0x151515 });

  const g = new THREE.Group();
  // Boxy receiver
  g.add(mesh(new THREE.BoxGeometry(0.08, 0.1, 0.3), metal));
  // Short Barrel
  g.add(meshAt(new THREE.BoxGeometry(0.03, 0.03, 0.15), metal, 0, 0.01, -0.22));
  // Grip / Magwell
  const grip = meshAt(new THREE.BoxGeometry(0.07, 0.18, 0.08), dark, 0, -0.13, 0.0);
  g.add(grip);
  // Long Magazine — animated during reload
  const uziMag = meshAt(new THREE.BoxGeometry(0.05, 0.25, 0.06), metal, 0, -0.22, 0.0);
  g.add(uziMag);
  g.userData.mag = uziMag;
  g.userData.magRestY = -0.22;
  g.userData.magDrop = 0.30;
  // Sights
  g.add(meshAt(new THREE.BoxGeometry(0.03, 0.03, 0.02), metal, 0, 0.06, -0.12));
  g.add(meshAt(new THREE.BoxGeometry(0.03, 0.03, 0.02), metal, 0, 0.06, 0.12));

  const flashMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  const flash = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.1), flashMat);
  flash.position.set(0, 0.01, -0.32);
  g.userData.muzzleFlash = flash;
  g.add(flash);

  // Left hand gripping the foregrip / receiver area
  const hand = buildLeftHand(-0.04, -0.06, -0.10, { x: 0.1, y: 0.0, z: -0.18 });
  g.add(hand);
  g.userData.leftHand = hand;
  g.userData.handRest = hand.position.clone();

  return g;
}

/** Build a metal bat mesh */
function buildMetalBat() {
  const metal = new THREE.MeshPhongMaterial({ color: 0x3a3a3a, specular: 0xa0a0a0, shininess: 90 });
  const dark = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
  const red = new THREE.MeshLambertMaterial({ color: 0x880000 });

  const outer = new THREE.Group();
  const inner = new THREE.Group();

  // Angle it like a held bat
  inner.rotation.z = 0.4;
  inner.rotation.x = 0.2;
  inner.rotation.y = -0.1;
  outer.add(inner);

  // Barrel (thick part)
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.025, 0.45, 16), metal);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0, -0.25);
  inner.add(barrel);

  // Grip (thin part)
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.20, 16), dark);
  grip.rotation.x = Math.PI / 2;
  grip.position.set(0, 0, 0.075);
  inner.add(grip);

  // Tape/Ring detail
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.02, 16), red);
  ring.rotation.x = Math.PI / 2;
  ring.position.set(0, 0, -0.02);
  inner.add(ring);

  // Knob (bottom end)
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 16), metal);
  knob.rotation.x = Math.PI / 2;
  knob.position.set(0, 0, 0.185);
  inner.add(knob);

  // Left hand gripping the bat handle
  inner.add(buildLeftHand(-0.04, -0.03, 0.09, { x: 0.0, y: 0.0, z: -0.2 }));

  outer.userData.muzzleFlash = null;
  return outer;
}

/** Helper: create positioned mesh */
function meshAt(geo, mat, x, y, z) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  return m;
}
function mesh(geo, mat) {
  return new THREE.Mesh(geo, mat);
}

/** REST positions per weapon [x, y, z] in weapon-camera space */
const WEAPON_REST = {
  rifle: [0.19, -0.20, -0.42],
  shotgun: [0.18, -0.22, -0.40],
  sniper: [0.22, -0.24, -0.45],
  pistol: [0.155, -0.165, -0.36],
  deagle: [0.16, -0.17, -0.38],
  uzi: [0.17, -0.18, -0.35],
  bat: [0.14, -0.18, -0.36],
};

const WEAPON_ADS_REST = {
  rifle: [0.0, -0.068, -0.35],
  shotgun: [0.0, -0.07, -0.30],
  sniper: [0.0, -0.06, -0.25], // Sniper scope alignment
  pistol: [0.0, -0.058, -0.30],
  deagle: [0.0, -0.06, -0.30],
  uzi: [0.0, -0.08, -0.25],
  bat: [0.14, -0.18, -0.36], // No ADS for bat
};

/**
 * Per-weapon clunky reload keyframe table.
 * Each phase: { dur, pos:[dx,dy,dz] offset from REST, rot:[rx,ry,rz] absolute,
 *               snap: true=instant(rate*55) false=slow(rate*10),
 *               shake: optional shakeIntensity,
 *               sound: 'eject'|'slam' }
 */
const RELOAD_ANIM = {
  rifle: [
    { dur: 0.12, pos: [ 0.00, -0.030,  0.020], rot: [ 0.20,  0.00,  0.06], snap: true  },
    { dur: 0.18, pos: [ 0.02, -0.090,  0.060], rot: [ 0.48, -0.12,  0.18], snap: true,  shake: 0.014, sound: 'eject' },
    { dur: 0.50, pos: [ 0.02, -0.090,  0.060], rot: [ 0.48, -0.12,  0.18], snap: false },
    { dur: 0.20, pos: [ 0.00, -0.040,  0.010], rot: [ 0.22,  0.00,  0.04], snap: true,  shake: 0.020, sound: 'slam'  },
    { dur: 0.22, pos: [ 0.02, -0.030, -0.030], rot: [-0.08,  0.10, -0.06], snap: true,  shake: 0.008 },
    { dur: 0.78, pos: [ 0.00,  0.000,  0.000], rot: [ 0.00,  0.00,  0.00], snap: false },
  ],
  shotgun: [
    { dur: 0.14, pos: [ 0.02,  0.020,  0.030], rot: [ 0.35,  0.05,  0.10], snap: true  },
    { dur: 0.18, pos: [ 0.02, -0.010,  0.060], rot: [ 0.40,  0.08,  0.12], snap: true,  shake: 0.012, sound: 'eject' },
    { dur: 0.32, pos: [ 0.02, -0.010,  0.060], rot: [ 0.40,  0.08,  0.12], snap: false },
    { dur: 0.20, pos: [ 0.01,  0.010, -0.020], rot: [ 0.30,  0.04,  0.08], snap: true,  shake: 0.010, sound: 'slam'  },
    { dur: 0.50, pos: [ 0.01,  0.010, -0.020], rot: [ 0.30,  0.04,  0.08], snap: false },
  ],
  sniper: [
    { dur: 0.18, pos: [ 0.05,  0.000,  0.010], rot: [ 0.08,  0.00,  0.22], snap: true  },
    { dur: 0.25, pos: [ 0.05, -0.040,  0.070], rot: [ 0.14,  0.18,  0.28], snap: true,  shake: 0.018, sound: 'eject' },
    { dur: 0.55, pos: [ 0.05, -0.040,  0.070], rot: [ 0.14,  0.18,  0.28], snap: false },
    { dur: 0.22, pos: [ 0.02, -0.010, -0.010], rot: [ 0.04,  0.04,  0.12], snap: true,  shake: 0.025, sound: 'slam'  },
    { dur: 0.80, pos: [ 0.00,  0.000,  0.000], rot: [ 0.00,  0.00,  0.00], snap: false },
  ],
  pistol: [
    { dur: 0.13, pos: [ 0.00, -0.040,  0.025], rot: [ 0.22, -0.08,  0.08], snap: true  },
    { dur: 0.18, pos: [ 0.02, -0.080,  0.050], rot: [ 0.38, -0.14,  0.14], snap: true,  shake: 0.010, sound: 'eject' },
    { dur: 0.35, pos: [ 0.02, -0.080,  0.050], rot: [ 0.38, -0.14,  0.14], snap: false },
    { dur: 0.18, pos: [ 0.00, -0.040,  0.010], rot: [ 0.15,  0.00,  0.04], snap: true,  shake: 0.016, sound: 'slam'  },
    { dur: 0.14, pos: [-0.01, -0.020, -0.020], rot: [-0.07,  0.07, -0.04], snap: true,  shake: 0.007 },
    { dur: 0.42, pos: [ 0.00,  0.000,  0.000], rot: [ 0.00,  0.00,  0.00], snap: false },
  ],
  deagle: [
    { dur: 0.16, pos: [ 0.01, -0.060,  0.050], rot: [ 0.32, -0.08,  0.12], snap: true  },
    { dur: 0.20, pos: [ 0.03, -0.130,  0.090], rot: [ 0.52, -0.18,  0.20], snap: true,  shake: 0.024, sound: 'eject' },
    { dur: 0.52, pos: [ 0.03, -0.130,  0.090], rot: [ 0.52, -0.18,  0.20], snap: false },
    { dur: 0.22, pos: [ 0.01, -0.060,  0.020], rot: [ 0.20, -0.05,  0.08], snap: true,  shake: 0.030, sound: 'slam'  },
    { dur: 0.18, pos: [ 0.02, -0.040, -0.020], rot: [-0.04,  0.12, -0.06], snap: true,  shake: 0.010 },
    { dur: 0.72, pos: [ 0.00,  0.000,  0.000], rot: [ 0.00,  0.00,  0.00], snap: false },
  ],
  uzi: [
    { dur: 0.14, pos: [ 0.03, -0.030,  0.020], rot: [ 0.18,  0.25,  0.12], snap: true  },
    { dur: 0.20, pos: [ 0.04, -0.100,  0.040], rot: [ 0.28,  0.30,  0.18], snap: true,  shake: 0.012, sound: 'eject' },
    { dur: 0.46, pos: [ 0.04, -0.100,  0.040], rot: [ 0.28,  0.30,  0.18], snap: false },
    { dur: 0.22, pos: [ 0.02, -0.050,  0.010], rot: [ 0.10,  0.14,  0.08], snap: true,  shake: 0.018, sound: 'slam'  },
    { dur: 0.78, pos: [ 0.00,  0.000,  0.000], rot: [ 0.00,  0.00,  0.00], snap: false },
  ],
  bat: [], // Melee — no reload animation
};

function createWeapon() {
  weaponScene = new THREE.Scene();

  // Lighting for weapon scene
  weaponScene.add(new THREE.AmbientLight(0xffffff, 1.5));
  const wl = new THREE.DirectionalLight(0xffffff, 0.7);
  wl.position.set(0.5, 1, 0.5);
  weaponScene.add(wl);
  const wl2 = new THREE.DirectionalLight(0x88aaff, 0.3);
  wl2.position.set(-1, 0.5, 1);
  weaponScene.add(wl2);

  // Dedicated camera — never moves, gun position is fixed
  weaponCamera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.01,
    10
  );

  // Build all weapon models, hide non-active ones
  createWeapon._allModels = {
    rifle: buildRifle(),
    shotgun: buildShotgun(),
    sniper: buildSniper(),
    pistol: buildPistol(),
    deagle: buildDesertEagle(),
    uzi: buildUzi(),
    bat: buildMetalBat()
  };

  for (const id in createWeapon._allModels) {
    const model = createWeapon._allModels[id];
    model.position.set(...WEAPON_REST[id]);
    model.visible = false;
    weaponScene.add(model);
  }

  // Active models array will be set during startGame
  createWeapon._activeModels = [];
  gunGroup = null;
}

// ─────────────────────────────────────────────────────────
//  ENEMY CLASS
// ─────────────────────────────────────────────────────────
class Enemy {
  /**
   * @param {number} x  World-space X spawn position
   * @param {number} z  World-space Z spawn position
   */
  constructor(x, z, type = 'pistol') {
    this.type = type;
    this.hp = 80 + wave * 18;
    this.maxHp = this.hp;
    this.alive = true;
    this.state = 'idle';                              // idle | chase | attack
    this.speed = 2.0 + wave * 0.45;
    this.shootCD = 1 + Math.random() * 1.5;            // stagger initial shots
    this.detRange = 32;
    this.atkRange = 20;
    this.bobPhase = Math.random() * Math.PI * 2;    // offset leg animation

    if (this.type === 'ak47') {
      this.damage = 10 + wave * 3;
      this.shootRate = 0.15; // fast burst
      this.ammo = 30;
      this.maxAmmo = 30;
      this.isReloading = false;
      this.reloadTimer = 0;
      this.reloadDuration = 1.0;
      this.armor = 100 + wave * 15;
      this.maxArmor = this.armor;
    } else {
      this.damage = 8 + wave * 3;
      this.shootRate = Math.max(0.75, 2.8 - wave * 0.15);
      this.armor = 0;
      this.maxArmor = 0;
    }

    this._buildMesh(x, z);
    this._buildHpBar();
  }

  _buildMesh(x, z) {
    this.group = new THREE.Group();

    // Materials
    const bodyMat = new THREE.MeshLambertMaterial({ color: this.type === 'ak47' ? 0x222222 : 0x1c5a1c });
    const headMat = new THREE.MeshLambertMaterial({ color: 0x2a7a2a });
    const legMat = new THREE.MeshLambertMaterial({ color: 0x143314 });
    const armMat = new THREE.MeshLambertMaterial({ color: this.type === 'ak47' ? 0x222222 : 0x1c5a1c });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const gunMat = new THREE.MeshLambertMaterial({ color: 0x111111 });

    // Torso
    this.torso = new THREE.Mesh(new THREE.BoxGeometry(0.65, 1.0, 0.38), bodyMat);
    this.torso.position.y = 0.85;
    this.group.add(this.torso);

    // Head
    this.head = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.52, 0.46), headMat);
    this.head.position.y = 1.61;
    this.group.add(this.head);

    // Face: Eyes
    [-0.10, 0.10].forEach(xo => {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.055, 0.07), eyeMat);
      eye.position.set(xo, 0.05, -0.24);
      this.head.add(eye);
    });

    // Face: Mouth
    const mouthMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.07), mouthMat);
    mouth.position.set(0, -0.13, -0.24);
    this.head.add(mouth);

    // Arms
    this.leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.7, 0.22), armMat);
    this.leftArm.position.set(-0.43, 0.85, 0);
    this.group.add(this.leftArm);

    // Right arm (raised, pointing forward)
    this.rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.22, 0.7), armMat);
    this.rightArm.position.set(0.43, 1.1, -0.15);
    this.group.add(this.rightArm);

    // Legs
    this.leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.65, 0.28), legMat);
    this.rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.65, 0.28), legMat);
    this.leftLeg.position.set(-0.17, 0.25, 0);
    this.rightLeg.position.set(0.17, 0.25, 0);
    this.group.add(this.leftLeg, this.rightLeg);

    // Gun model (attached to right arm)
    const eGunGroup = new THREE.Group();

    if (this.type === 'ak47') {
      const woodMat = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
      const gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.45), gunMat);
      eGunGroup.add(gunBody);

      const barrelMat = new THREE.MeshLambertMaterial({ color: 0x444444 });
      this.gunBarrel = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.3), barrelMat);
      this.gunBarrel.position.set(0, 0.02, -0.35);
      eGunGroup.add(this.gunBarrel);

      const gunMag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.15, 0.08), gunMat);
      gunMag.position.set(0, -0.12, 0.05);
      eGunGroup.add(gunMag);

      const gunStock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.25), woodMat);
      gunStock.position.set(0, -0.04, 0.3);
      eGunGroup.add(gunStock);

      eGunGroup.position.set(0, 0, -0.45);
    } else {
      const gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.25), gunMat);
      eGunGroup.add(gunBody);

      const barrelMat = new THREE.MeshLambertMaterial({ color: 0x444444 });
      this.gunBarrel = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.15), barrelMat);
      this.gunBarrel.position.set(0, 0.02, -0.15);
      eGunGroup.add(this.gunBarrel);

      eGunGroup.position.set(0, 0, -0.35);
    }
    this.rightArm.add(eGunGroup);

    this.group.position.set(x, 0, z);
    scene.add(this.group);
  }

  _buildHpBar() {
    this.hpEl = document.createElement('div');
    this.hpEl.className = 'enemy-hp-bar';
    if (this.type === 'ak47') {
      this.hpEl.classList.add('has-armor');
      this.armorFill = document.createElement('div');
      this.armorFill.className = 'enemy-armor-fill';
      this.hpEl.appendChild(this.armorFill);
    }
    this.hpFill = document.createElement('div');
    this.hpFill.className = 'enemy-hp-fill';
    this.hpEl.appendChild(this.hpFill);
    document.getElementById('enemy-hp-container').appendChild(this.hpEl);
  }

  update(dt) {
    if (!this.alive) {
      if (this.collapseTimer === undefined) {
        this.collapseTimer = 0;

        // ── Compute fall direction: away from the player (bullet impact pushback)
        const dx = this.group.position.x - camera.position.x;
        const dz = this.group.position.z - camera.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz) || 1;
        const fallDirX = dx / dist;
        const fallDirZ = dz / dist;

        // Determine which way the body tips based on impact angle
        // Convert fall direction to local space of the group
        const localAngle = Math.atan2(fallDirX, fallDirZ) - this.group.rotation.y;
        const fallX = -Math.cos(localAngle); // pitch (forward/back)
        const fallZ = Math.sin(localAngle); // roll (left/right)

        this.ragdoll = {
          // ── Body fall targets (the whole group tips over)
          groupTargetX: fallX * (Math.PI / 2 + (Math.random() - 0.5) * 0.3),
          groupTargetZ: fallZ * (0.2 + Math.random() * 0.3),
          groupVelX: fallX * (2.0 + Math.random()),
          groupVelZ: fallZ * (0.5 + Math.random() * 0.5),

          // ── Head: angular velocity (starts with whiplash from impact)
          headVelX: 1.5 + Math.random() * 2.5,
          headVelZ: (Math.random() - 0.5) * 3.0,
          headVelY: (Math.random() - 0.5) * 1.5,

          // ── Left arm: swings loose
          lArmVelX: (Math.random() - 0.5) * 4.0,
          lArmVelZ: 1.5 + Math.random() * 2.0,  // flop outward
          lArmVelY: (Math.random() - 0.5) * 2.0,

          // ── Right arm: swings loose
          rArmVelX: (Math.random() - 0.5) * 4.0,
          rArmVelZ: -1.5 - Math.random() * 2.0,  // flop outward other side
          rArmVelY: (Math.random() - 0.5) * 2.0,

          // ── Left leg: kicks out
          lLegVelX: (Math.random() - 0.5) * 2.0,
          lLegVelZ: 0.5 + Math.random() * 1.5,
          lLegVelY: (Math.random() - 0.5) * 1.0,

          // ── Right leg: kicks out
          rLegVelX: (Math.random() - 0.5) * 2.0,
          rLegVelZ: -0.5 - Math.random() * 1.5,
          rLegVelY: (Math.random() - 0.5) * 1.0,

          // Track if settled
          settled: false,
        };

        // Slide target: push body away from player slightly
        this.slideX = this.group.position.x + fallDirX * (0.6 + Math.random() * 0.4);
        this.slideZ = this.group.position.z + fallDirZ * (0.6 + Math.random() * 0.4);

        // ── Register a rigid body hitbox for the dead body
        this._deadBodyBox = new THREE.Box3(
          new THREE.Vector3(
            this.group.position.x - 0.5,
            0,
            this.group.position.z - 0.5
          ),
          new THREE.Vector3(
            this.group.position.x + 0.5,
            0.6,
            this.group.position.z + 0.5
          )
        );
        collidables.push(this._deadBodyBox);
      }

      this.collapseTimer += dt;
      const r = this.ragdoll;

      // ── Physics constants
      const GRAVITY_TORQUE = 6.0;   // gravity pulling limbs down
      const DAMPING = 3.2;   // angular velocity damping
      const GROUND_BOUNCE = 0.3;   // bounciness when hitting joint limits

      if (!r.settled) {
        // ═══════════════════════════════════════════════
        //  BODY FALL (the whole group tips over)
        // ═══════════════════════════════════════════════

        // Apply angular velocity with gravity assist
        r.groupVelX += (r.groupTargetX > 0 ? GRAVITY_TORQUE : -GRAVITY_TORQUE) * 0.5 * dt;
        r.groupVelX *= (1 - DAMPING * dt);
        this.group.rotation.x += r.groupVelX * dt;

        r.groupVelZ *= (1 - DAMPING * dt);
        this.group.rotation.z += r.groupVelZ * dt;

        // Clamp body rotation (it's lying on ground, can't go past ~90°)
        const maxTilt = Math.PI / 2 + 0.15;
        if (Math.abs(this.group.rotation.x) > maxTilt) {
          this.group.rotation.x = Math.sign(this.group.rotation.x) * maxTilt;
          r.groupVelX *= -GROUND_BOUNCE;
        }
        if (Math.abs(this.group.rotation.z) > 0.5) {
          this.group.rotation.z = Math.sign(this.group.rotation.z) * 0.5;
          r.groupVelZ *= -GROUND_BOUNCE;
        }

        // Slide body position
        this.group.position.x += (this.slideX - this.group.position.x) * dt * 4;
        this.group.position.z += (this.slideZ - this.group.position.z) * dt * 4;
        // Lower to ground as it falls
        const targetY = 0.15;
        this.group.position.y += (targetY - this.group.position.y) * dt * 5;

        // ═══════════════════════════════════════════════
        //  HEAD — whiplash then loll
        // ═══════════════════════════════════════════════
        // Gravity pulls head forward (nod down)
        r.headVelX += GRAVITY_TORQUE * 0.7 * dt;
        r.headVelX *= (1 - DAMPING * 1.2 * dt);
        r.headVelZ *= (1 - DAMPING * 1.0 * dt);
        r.headVelY *= (1 - DAMPING * 1.0 * dt);

        this.head.rotation.x += r.headVelX * dt;
        this.head.rotation.z += r.headVelZ * dt;
        this.head.rotation.y += r.headVelY * dt;

        // Joint constraints for head
        const headMaxX = 1.0, headMaxZ = 0.8, headMaxY = 0.9;
        if (Math.abs(this.head.rotation.x) > headMaxX) {
          this.head.rotation.x = Math.sign(this.head.rotation.x) * headMaxX;
          r.headVelX *= -GROUND_BOUNCE;
        }
        if (Math.abs(this.head.rotation.z) > headMaxZ) {
          this.head.rotation.z = Math.sign(this.head.rotation.z) * headMaxZ;
          r.headVelZ *= -GROUND_BOUNCE;
        }
        if (Math.abs(this.head.rotation.y) > headMaxY) {
          this.head.rotation.y = Math.sign(this.head.rotation.y) * headMaxY;
          r.headVelY *= -GROUND_BOUNCE;
        }

        // ═══════════════════════════════════════════════
        //  LEFT ARM — swings loose from shoulder
        // ═══════════════════════════════════════════════
        r.lArmVelX += GRAVITY_TORQUE * 0.5 * dt;
        r.lArmVelX *= (1 - DAMPING * dt);
        r.lArmVelZ *= (1 - DAMPING * 0.9 * dt);
        r.lArmVelY *= (1 - DAMPING * 0.9 * dt);

        this.leftArm.rotation.x += r.lArmVelX * dt;
        this.leftArm.rotation.z += r.lArmVelZ * dt;
        // also allow y-axis twist
        if (this.leftArm.rotation.y === undefined) this.leftArm.rotation.y = 0;
        this.leftArm.rotation.y += r.lArmVelY * dt;

        // Joint constraints
        const armMaxX = 2.0, armMaxZ = 1.5, armMaxY = 1.2;
        if (Math.abs(this.leftArm.rotation.x) > armMaxX) {
          this.leftArm.rotation.x = Math.sign(this.leftArm.rotation.x) * armMaxX;
          r.lArmVelX *= -GROUND_BOUNCE;
        }
        if (Math.abs(this.leftArm.rotation.z) > armMaxZ) {
          this.leftArm.rotation.z = Math.sign(this.leftArm.rotation.z) * armMaxZ;
          r.lArmVelZ *= -GROUND_BOUNCE;
        }
        if (Math.abs(this.leftArm.rotation.y) > armMaxY) {
          this.leftArm.rotation.y = Math.sign(this.leftArm.rotation.y) * armMaxY;
          r.lArmVelY *= -GROUND_BOUNCE;
        }

        // ═══════════════════════════════════════════════
        //  RIGHT ARM — swings loose from shoulder
        // ═══════════════════════════════════════════════
        r.rArmVelX += GRAVITY_TORQUE * 0.5 * dt;
        r.rArmVelX *= (1 - DAMPING * dt);
        r.rArmVelZ *= (1 - DAMPING * 0.9 * dt);
        r.rArmVelY *= (1 - DAMPING * 0.9 * dt);

        this.rightArm.rotation.x += r.rArmVelX * dt;
        this.rightArm.rotation.z += r.rArmVelZ * dt;
        if (this.rightArm.rotation.y === undefined) this.rightArm.rotation.y = 0;
        this.rightArm.rotation.y += r.rArmVelY * dt;

        if (Math.abs(this.rightArm.rotation.x) > armMaxX) {
          this.rightArm.rotation.x = Math.sign(this.rightArm.rotation.x) * armMaxX;
          r.rArmVelX *= -GROUND_BOUNCE;
        }
        if (Math.abs(this.rightArm.rotation.z) > armMaxZ) {
          this.rightArm.rotation.z = Math.sign(this.rightArm.rotation.z) * armMaxZ;
          r.rArmVelZ *= -GROUND_BOUNCE;
        }
        if (Math.abs(this.rightArm.rotation.y) > armMaxY) {
          this.rightArm.rotation.y = Math.sign(this.rightArm.rotation.y) * armMaxY;
          r.rArmVelY *= -GROUND_BOUNCE;
        }

        // ═══════════════════════════════════════════════
        //  LEFT LEG — kicks out loosely
        // ═══════════════════════════════════════════════
        r.lLegVelX += GRAVITY_TORQUE * 0.3 * dt;
        r.lLegVelX *= (1 - DAMPING * 1.1 * dt);
        r.lLegVelZ *= (1 - DAMPING * 1.1 * dt);
        r.lLegVelY *= (1 - DAMPING * 1.1 * dt);

        this.leftLeg.rotation.x += r.lLegVelX * dt;
        this.leftLeg.rotation.z += r.lLegVelZ * dt;
        if (this.leftLeg.rotation.y === undefined) this.leftLeg.rotation.y = 0;
        this.leftLeg.rotation.y += r.lLegVelY * dt;

        // Joint constraints (legs can't bend as far)
        const legMaxX = 1.3, legMaxZ = 0.8, legMaxY = 0.5;
        if (Math.abs(this.leftLeg.rotation.x) > legMaxX) {
          this.leftLeg.rotation.x = Math.sign(this.leftLeg.rotation.x) * legMaxX;
          r.lLegVelX *= -GROUND_BOUNCE;
        }
        if (Math.abs(this.leftLeg.rotation.z) > legMaxZ) {
          this.leftLeg.rotation.z = Math.sign(this.leftLeg.rotation.z) * legMaxZ;
          r.lLegVelZ *= -GROUND_BOUNCE;
        }
        if (Math.abs(this.leftLeg.rotation.y) > legMaxY) {
          this.leftLeg.rotation.y = Math.sign(this.leftLeg.rotation.y) * legMaxY;
          r.lLegVelY *= -GROUND_BOUNCE;
        }

        // ═══════════════════════════════════════════════
        //  RIGHT LEG — kicks out loosely
        // ═══════════════════════════════════════════════
        r.rLegVelX += GRAVITY_TORQUE * 0.3 * dt;
        r.rLegVelX *= (1 - DAMPING * 1.1 * dt);
        r.rLegVelZ *= (1 - DAMPING * 1.1 * dt);
        r.rLegVelY *= (1 - DAMPING * 1.1 * dt);

        this.rightLeg.rotation.x += r.rLegVelX * dt;
        this.rightLeg.rotation.z += r.rLegVelZ * dt;
        if (this.rightLeg.rotation.y === undefined) this.rightLeg.rotation.y = 0;
        this.rightLeg.rotation.y += r.rLegVelY * dt;

        if (Math.abs(this.rightLeg.rotation.x) > legMaxX) {
          this.rightLeg.rotation.x = Math.sign(this.rightLeg.rotation.x) * legMaxX;
          r.rLegVelX *= -GROUND_BOUNCE;
        }
        if (Math.abs(this.rightLeg.rotation.z) > legMaxZ) {
          this.rightLeg.rotation.z = Math.sign(this.rightLeg.rotation.z) * legMaxZ;
          r.rLegVelZ *= -GROUND_BOUNCE;
        }
        if (Math.abs(this.rightLeg.rotation.y) > legMaxY) {
          this.rightLeg.rotation.y = Math.sign(this.rightLeg.rotation.y) * legMaxY;
          r.rLegVelY *= -GROUND_BOUNCE;
        }

        // ═══════════════════════════════════════════════
        //  UPDATE RIGID BODY HITBOX position
        // ═══════════════════════════════════════════════
        if (this._deadBodyBox) {
          this._deadBodyBox.min.set(
            this.group.position.x - 0.6,
            0,
            this.group.position.z - 0.6
          );
          this._deadBodyBox.max.set(
            this.group.position.x + 0.6,
            0.5,
            this.group.position.z + 0.6
          );
        }

        // ── Check if settled (all velocities near zero)
        if (this.collapseTimer > 2.5) {
          const totalVel = Math.abs(r.groupVelX) + Math.abs(r.groupVelZ) +
            Math.abs(r.headVelX) + Math.abs(r.headVelZ) +
            Math.abs(r.lArmVelX) + Math.abs(r.lArmVelZ) +
            Math.abs(r.rArmVelX) + Math.abs(r.rArmVelZ) +
            Math.abs(r.lLegVelX) + Math.abs(r.lLegVelZ) +
            Math.abs(r.rLegVelX) + Math.abs(r.rLegVelZ);
          if (totalVel < 0.1) {
            r.settled = true;
          }
        }
      }
      return;
    }

    const cp = camera.position;
    const ep = this.group.position;
    const dx = cp.x - ep.x;
    const dz = cp.z - ep.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    // Always face player (lookAt points +Z, but enemy is built facing -Z)
    this.group.lookAt(cp.x, ep.y, cp.z);
    this.group.rotation.y += Math.PI;

    // State transitions
    if (dist < this.detRange) {
      this.state = (dist < this.atkRange) ? 'attack' : 'chase';
    } else {
      this.state = 'idle';
    }

    // Movement
    if (this.state !== 'idle' && dist > 3.2) {
      const nx = ep.x + (dx / dist) * this.speed * dt;
      const nz = ep.z + (dz / dist) * this.speed * dt;
      const tb = new THREE.Box3(
        new THREE.Vector3(nx - 0.38, 0, nz - 0.38),
        new THREE.Vector3(nx + 0.38, 2, nz + 0.38)
      );
      let blocked = false;
      for (const c of collidables) {
        if (tb.intersectsBox(c)) { blocked = true; break; }
      }
      if (!blocked) { ep.x = nx; ep.z = nz; }
    }

    // Shooting
    if (this.state === 'attack') {
      if (this.isReloading) {
        this.reloadTimer -= dt;
        if (this.reloadTimer <= 0) {
          this.isReloading = false;
          this.ammo = this.maxAmmo;
        }
      } else {
        this.shootCD -= dt;
        if (this.shootCD <= 0) {
          this._shoot();
          this.shootCD = this.shootRate;

          if (this.type === 'ak47') {
            this.ammo--;
            if (this.ammo <= 0) {
              this.isReloading = true;
              this.reloadTimer = this.reloadDuration;
            }
          }
        }
      }
    }

    // Walk animation
    const t = clock.getElapsedTime() + this.bobPhase;
    if (this.state !== 'idle') {
      const bob = Math.sin(t * 6) * 0.06;
      this.leftLeg.position.y = 0.25 + bob;
      this.rightLeg.position.y = 0.25 - bob;
      this.leftArm.rotation.x = bob * 0.6;
      this.rightArm.rotation.x = -bob * 0.6;
      // torso slight bob
      this.torso.position.y = 0.85 + Math.abs(Math.sin(t * 6)) * 0.02;
    }

    // Update screen-space HP bar
    this._updateHpBar();
  }

  _shoot() {
    if (!player.alive) return;
    playEnemyShot();

    const origin = new THREE.Vector3();
    if (this.gunBarrel) {
      this.gunBarrel.getWorldPosition(origin);
    } else {
      origin.copy(this.group.position);
      origin.y = 1.55;
    }

    const dir = new THREE.Vector3(
      camera.position.x - origin.x,
      camera.position.y - origin.y,
      camera.position.z - origin.z
    ).normalize();

    // Add spread based on wave
    const spread = 0.14 - Math.min(wave * 0.005, 0.06);
    dir.x += (Math.random() - 0.5) * spread;
    dir.y += (Math.random() - 0.5) * spread * 0.5;
    dir.z += (Math.random() - 0.5) * spread;
    dir.normalize();

    const proj = new THREE.Mesh(
      new THREE.SphereGeometry(0.065, 5, 5),
      new THREE.MeshBasicMaterial({ color: 0xff5500 })
    );
    proj.position.copy(origin);
    scene.add(proj);

    enemyProjectiles.push({ mesh: proj, dir, speed: 17, life: 4.5, damage: this.damage });
  }

  takeDamage(dmg) {
    if (!this.alive) return;

    if (this.armor > 0) {
      if (dmg <= this.armor) {
        this.armor -= dmg;
        dmg = 0;
      } else {
        dmg -= this.armor;
        this.armor = 0;
      }
      this.armorFill.style.width = ((this.armor / this.maxArmor) * 100) + '%';
    }

    if (dmg > 0) {
      this.hp = Math.max(0, this.hp - dmg);
      this.hpFill.style.width = ((this.hp / this.maxHp) * 100) + '%';
    }

    if (this.hp <= 0) this._die();
  }

  _die() {
    this.alive = false;
    playDeathSound();
    // Do NOT remove from scene, allow ragdoll fall
    if (this.hpEl && this.hpEl.parentNode) this.hpEl.remove();
    kills++;
    document.getElementById('kills').textContent = kills;
  }

  _updateHpBar() {
    const worldPos = this.group.position.clone();
    worldPos.y = 2.25;
    const projected = worldPos.project(camera);

    // Behind camera
    if (projected.z > 1) { this.hpEl.style.display = 'none'; return; }

    const sx = (projected.x * 0.5 + 0.5) * window.innerWidth;
    const sy = (-projected.y * 0.5 + 0.5) * window.innerHeight;

    if (sx < -70 || sx > window.innerWidth + 70 || sy < 0 || sy > window.innerHeight) {
      this.hpEl.style.display = 'none';
    } else {
      this.hpEl.style.display = 'block';
      this.hpEl.style.left = (sx - 30) + 'px';
      this.hpEl.style.top = (sy - 6) + 'px';
    }
  }
}

// ─────────────────────────────────────────────────────────
//  WAVE MANAGEMENT
// ─────────────────────────────────────────────────────────
function spawnWave() {
  // Dispose previous wave — also remove dead body hitboxes from collidables
  enemies.forEach(e => {
    scene.remove(e.group);
    if (e.hpEl && e.hpEl.parentNode) e.hpEl.remove();
    if (e._deadBodyBox) {
      const idx = collidables.indexOf(e._deadBodyBox);
      if (idx !== -1) collidables.splice(idx, 1);
    }
  });
  enemies = [];
  enemyProjectiles.forEach(p => scene.remove(p.mesh));
  enemyProjectiles = [];

  const count = Math.min(4 + wave * 2, 22);
  const TAU = Math.PI * 2;

  for (let i = 0; i < count; i++) {
    let type = 'pistol';
    if (wave >= 5 && i === 0) {
      type = 'ak47';
    }

    let ex, ez;
    let attempts = 0;
    do {
      const angle = (i / count) * TAU + (Math.random() - 0.5) * 0.9;
      const radius = 27 + Math.random() * 7;
      ex = Math.cos(angle) * radius;
      ez = Math.sin(angle) * radius;

      // Check collision to avoid spawning in walls
      const box = new THREE.Box3(
        new THREE.Vector3(ex - 0.4, 0, ez - 0.4),
        new THREE.Vector3(ex + 0.4, 2, ez + 0.4)
      );
      let blocked = false;
      for (const c of collidables) {
        if (box.intersectsBox(c)) { blocked = true; break; }
      }
      if (!blocked) break;
      attempts++;
    } while (attempts < 50);

    enemies.push(new Enemy(ex, ez, type));
  }

  document.getElementById('enemy-num').textContent = count;
  document.getElementById('wave-num').textContent = wave;
}

// ─────────────────────────────────────────────────────────
//  PLAYER COLLISION
// ─────────────────────────────────────────────────────────
function playerCollidesAt(x, y, z) {
  const RADIUS = 0.32;
  const box = new THREE.Box3(
    new THREE.Vector3(x - RADIUS, y - player.eyeHeight + 0.1, z - RADIUS),
    new THREE.Vector3(x + RADIUS, y + 0.08, z + RADIUS)
  );
  for (const c of collidables) {
    if (box.intersectsBox(c)) return true;
  }
  return false;
}

// ─────────────────────────────────────────────────────────
//  WEAPON SWITCHING
// ─────────────────────────────────────────────────────────
function switchWeapon(idx) {
  if (idx === currentWeaponIdx) return;
  if (isSwitchingWeapon) return;

  // Cancel any in-progress reload on the weapon we're leaving
  if (cw() && cw().isReloading) {
    cw().isReloading = false;
    cw().reloadTimer = 0;
    reloadAnim.active = false;
    reloadAnim.phase = 0;
    reloadAnim.phaseTimer = 0;
    // Reset old weapon's magazine to rest position (gunGroup still points to old weapon here)
    if (gunGroup && gunGroup.userData.mag) {
      gunGroup.userData.mag.position.y = gunGroup.userData.magRestY || 0;
    }
    // Snap left hand back to rest position
    if (gunGroup && gunGroup.userData.leftHand && gunGroup.userData.handRest) {
      gunGroup.userData.leftHand.position.copy(gunGroup.userData.handRest);
    }
    // Remove any shotgun shell
    if (reloadAnim.shell) {
      if (reloadAnim.shell.parent) reloadAnim.shell.parent.remove(reloadAnim.shell);
      reloadAnim.shell = null;
    }
    document.getElementById('reload-indicator').classList.add('hidden');
  }

  isSwitchingWeapon = true;
  switchTimer = SWITCH_DURATION;

  shotgunPumpActive = false;
  shotgunPumpTimer = 0;

  playWeaponSwitch();

  const models = createWeapon._activeModels;
  const prevIdx = currentWeaponIdx;
  currentWeaponIdx = idx;
  gunGroup = models[idx];
  // Sync global muzzleFlash to the new weapon's own flash mesh
  muzzleFlash = gunGroup.userData.muzzleFlash || null;

  // Hide old, show new after half the switch duration
  setTimeout(() => {
    if (models[prevIdx]) models[prevIdx].visible = false;
    if (models[idx]) {
      models[idx].visible = true;
      const wid = WEAPONS[idx].id;
      const [rx, ry, rz] = WEAPON_REST[wid];
      gunGroup.position.set(rx, ry + 0.25, rz);
      gunGroup.rotation.set(0, 0, 0);
    }
  }, SWITCH_DURATION * 500);

  setTimeout(() => { isSwitchingWeapon = false; }, SWITCH_DURATION * 1000);

  updateWeaponHUD();
}

function updateWeaponHUD() {
  const w = cw();
  const nameEl = document.getElementById('weapon-name');
  if (nameEl) nameEl.textContent = w.name;

  // Update slot indicators (main HUD + mobile slots)
  [1, 2, 3].forEach((n, i) => {
    const el = document.getElementById('slot-' + n);
    if (el) el.classList.toggle('active', i === currentWeaponIdx);
    // Mirror to mobile slot buttons
    const mob = document.getElementById('mob-slot-' + n);
    if (mob) mob.classList.toggle('active', i === currentWeaponIdx);
  });

  const ammoSection = document.getElementById('ammo-section');
  if (w.melee) {
    ammoSection.style.opacity = '0.35';
    document.getElementById('ammo-current').textContent = '∞';
    document.getElementById('ammo-reserve').textContent = '';
    document.getElementById('reload-indicator').classList.add('hidden');
  } else {
    ammoSection.style.opacity = '1';
    document.getElementById('ammo-current').textContent = w.ammo;
    document.getElementById('ammo-reserve').textContent = w.reserveAmmo;
  }
}

// ─────────────────────────────────────────────────────────
//  BAT SWING — handles both weak quick-swing and charged instakill
// ─────────────────────────────────────────────────────────
function performBatSwing(isCharged) {
  if (!isMobile && !isPointerLocked) return;
  if (isSwitchingWeapon) return;
  if (batState.isSwinging) return;
  if (player.shootCooldown > 0) return;

  const w = cw();
  if (!w.melee) return;

  const damage   = isCharged ? 9999 : 40 + Math.floor(Math.random() * 20);
  const cooldown = isCharged ? 1.1  : 0.55;

  player.shootCooldown = cooldown;
  batState.isSwinging  = true;
  batState.swingTimer  = 0;
  batState.isCharged   = isCharged;
  batState.windupActive = false;
  batState.isCharging  = false;
  batState.chargeTime  = 0;

  // Sound: weak = whoosh, charged = whoosh + clang
  playPanSwing(isCharged);

  // Hitscan — charged has longer reach
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const targets = [];
  enemies.forEach(e => {
    if (e.alive) e.group.traverse(c => { if (c.isMesh) targets.push(c); });
  });
  const intersects = raycaster.intersectObjects(targets, false);
  const range = isCharged ? 3.2 : 2.2;
  if (intersects.length > 0 && intersects[0].distance < range) {
    const hitObj = intersects[0].object;
    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      let matched = false;
      enemy.group.traverse(c => { if (c === hitObj) matched = true; });
      if (matched) {
        enemy.takeDamage(damage);
        showHitMarker();
        shakeIntensity = isCharged ? 0.22 : 0.08;
        break;
      }
    }
  }
}

// ─────────────────────────────────────────────────────────
//  PLAYER WEAPON — SHOOTING
// ─────────────────────────────────────────────────────────
function playerShoot() {
  // On desktop require pointer lock; on mobile bypass that requirement
  if (!isMobile && !isPointerLocked) return;
  if (isSwitchingWeapon) return;
  if (player.shootCooldown > 0) return;

  const w = cw();

  // ─── MELEE (bat) — charging handled by mousedown/mouseup, not here ───
  if (w.melee) return;

  // ─── RANGED ───
  if (w.ammo <= 0 && !w.isReloading) return;
  
  // Interrupt reload if firing and we have ammo (mainly for shotgun)
  if (w.isReloading) {
    if (w.ammo > 0) {
      w.isReloading = false;
      w.reloadTimer = 0;
      reloadAnim.active = false;
      reloadAnim.phase = 0;
      reloadAnim.phaseTimer = 0;
      if (gunGroup && gunGroup.userData.mag) {
        gunGroup.userData.mag.position.y = gunGroup.userData.magRestY || 0;
      }
      if (reloadAnim.shell) {
        if (reloadAnim.shell.parent) reloadAnim.shell.parent.remove(reloadAnim.shell);
        reloadAnim.shell = null;
      }
      document.getElementById('reload-indicator').classList.add('hidden');
    } else {
      return; // Still 0 ammo, can't interrupt to shoot
    }
  }

  w.ammo--;
  player.shootCooldown = w.shootRate;

  // Sound
  if (w.id === 'rifle') playGunshot();
  else playPistolShot();

  // Muzzle flash
  if (muzzleFlash) {
    muzzleFlash.material.opacity = 1;
    muzzleFlash.rotation.z = Math.random() * Math.PI;
    muzzleFlashTimer = 0.055;
  }

  // Recoil kick applied to all weapons
  let pVel = 0, zV = 0, rVel = 0, lVel = 0, sInt = 0;
  
  if (w.id === 'deagle') {
    pVel = 3.8; zV = -0.45; rVel = 2.5; lVel = (Math.random() - 0.5) * 1.8;
    sInt = 0.09;
  } else if (w.id === 'sniper') {
    pVel = 2.8; zV = -0.38; rVel = 2.0; lVel = (Math.random() - 0.5) * 1.5;
    sInt = 0.07;
  } else if (w.id === 'shotgun') {
    pVel = 2.2; zV = -0.30; rVel = 1.6; lVel = (Math.random() - 0.5) * 1.4;
    sInt = 0.06;
  } else if (w.id === 'rifle') {
    pVel = 0.5; zV = -0.15; rVel = 0.4; lVel = (Math.random() - 0.5) * 0.4;
    sInt = 0.02;
  } else if (w.id === 'uzi') {
    pVel = 0.35; zV = -0.09; rVel = 0.25; lVel = (Math.random() - 0.5) * 0.7;
    sInt = 0.015;
  } else if (w.id === 'pistol') {
    pVel = 0.8; zV = -0.12; rVel = 0.6; lVel = (Math.random() - 0.5) * 0.5;
    sInt = 0.02;
  }
  
  if (w.id !== 'bat') {
    weaponRecoil.pitchVel += pVel;
    weaponRecoil.zVel    += zV;
    weaponRecoil.rotVel  += rVel;
    weaponRecoil.latVel  += lVel;
    shakeIntensity = Math.max(shakeIntensity, sInt);
  }

  document.getElementById('ammo-current').textContent = w.ammo;

  // Hitscan raycast from screen centre
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

  // Find distance to closest wall
  let closestWallDist = Infinity;
  const pt = new THREE.Vector3();
  for (const c of collidables) {
    if (raycaster.ray.intersectBox(c, pt)) {
      const d = pt.distanceTo(camera.position);
      if (d < closestWallDist) closestWallDist = d;
    }
  }

  const targets = [];
  enemies.forEach(e => {
    if (e.alive) e.group.traverse(c => { if (c.isMesh) targets.push(c); });
  });

  // Calculate number of shots (shotgun shoots pellets)
  const isShotgun = w.id === 'shotgun';
  const numShots = isShotgun ? 8 : 1;
  const baseDir = raycaster.ray.direction.clone();
  
  for (let s = 0; s < numShots; s++) {
    let shotDir = baseDir.clone();
    if (isShotgun) {
      shotDir.x += (Math.random() - 0.5) * 0.15;
      shotDir.y += (Math.random() - 0.5) * 0.15;
      shotDir.z += (Math.random() - 0.5) * 0.15;
      shotDir.normalize();
    }
    
    raycaster.ray.direction.copy(shotDir);
    const intersects = raycaster.intersectObjects(targets, false);
    if (intersects.length > 0 && intersects[0].distance < closestWallDist) {
      const hitObj = intersects[0].object;
      for (const enemy of enemies) {
        if (!enemy.alive) continue;
        let matched = false;
        enemy.group.traverse(c => { if (c === hitObj) matched = true; });
        if (matched) {
          // Headshot logic
          const headshot = intersects[0].point.y > 1.3;
          let dmg = w.damage;
          
          if (headshot && w.id === 'deagle') {
            dmg = 9999; // Instant kill
          } else {
            dmg += Math.floor(Math.random() * (isShotgun ? 5 : 18)) + (headshot ? (isShotgun ? 10 : 20) : 0);
          }
          
          enemy.takeDamage(dmg);
          showHitMarker();
          playHitSound();
          break; // Next shot (pellet)
        }
      }
    }
  }

  // Start shotgun pump animation
  if (isShotgun && w.ammo > 0) {
    shotgunPumpActive = true;
    shotgunPumpTimer = 0;
    shotgunPumpSound1 = false;
    shotgunPumpSound2 = false;
  }

  // UZI Recoil (add to pitch and shake)
  if (w.id === 'uzi') {
    player.pitch = Math.min(1.45, player.pitch + 0.015);
    shakeIntensity = Math.min(0.08, shakeIntensity + 0.03);
  }

  if (w.ammo === 0) startReload();
}

function startReload() {
  const w = cw();
  if (w.melee) return;
  if (w.isReloading) return;
  if (w.reserveAmmo <= 0) return;
  if (w.ammo === w.maxAmmo) return;
  w.isReloading = true;
  w.reloadTimer = w.reloadDuration;
  // Start the clunky animation
  reloadAnim.active = true;
  reloadAnim.phase = 0;
  reloadAnim.phaseTimer = 0;
  document.getElementById('reload-indicator').classList.remove('hidden');
  playReloadSound();
}

function finishReload() {
  const w = cw();
  const isShotgun = w.id === 'shotgun';
  const needed = Math.min(isShotgun ? 1 : w.maxAmmo - w.ammo, Math.max(0, w.maxAmmo - w.ammo));
  const taken = Math.min(needed, w.reserveAmmo);
  w.ammo += taken;
  w.reserveAmmo -= taken;

  document.getElementById('ammo-current').textContent = w.ammo;
  document.getElementById('ammo-reserve').textContent = w.reserveAmmo;

  if (isShotgun && w.ammo < w.maxAmmo && w.reserveAmmo > 0) {
    // Shotgun needs to load more shells. Restart the reload cycle immediately.
    w.reloadTimer = w.reloadDuration;
    reloadAnim.phase = 1; // Start from shell insert phase to stay tilted
    reloadAnim.phaseTimer = 0;
    
    // Remove the old shell so a new one spawns
    if (reloadAnim.shell) {
      if (reloadAnim.shell.parent) reloadAnim.shell.parent.remove(reloadAnim.shell);
      reloadAnim.shell = null;
    }
    return; // Don't end reloading state
  }

  w.isReloading = false;
  // Deactivate animation, gun will lerp back to rest naturally next frame
  reloadAnim.active = false;
  reloadAnim.phase = 0;
  reloadAnim.phaseTimer = 0;
  // Snap magazine back to rest position
  if (gunGroup && gunGroup.userData.mag) {
    gunGroup.userData.mag.position.y = gunGroup.userData.magRestY || 0;
  }
  // Snap left hand back to rest position
  if (gunGroup && gunGroup.userData.leftHand && gunGroup.userData.handRest) {
    gunGroup.userData.leftHand.position.copy(gunGroup.userData.handRest);
  }
  // Remove any shotgun shell mesh
  if (reloadAnim.shell) {
    if (reloadAnim.shell.parent) reloadAnim.shell.parent.remove(reloadAnim.shell);
    reloadAnim.shell = null;
  }
  document.getElementById('reload-indicator').classList.add('hidden');
}

// ─────────────────────────────────────────────────────────
//  RELOAD ANIMATION
// ─────────────────────────────────────────────────────────
/**
 * Drives gunGroup position and rotation through per-weapon clunky keyframe phases
 * while isReloading is true. Called each frame from the weapon animation block.
 */
function updateReloadAnimation(dt, w) {
  // ── Magazine / shell visual animation (always runs when reload is active) ─────
  if (w.id === 'shotgun') {
    animateShotgunShell(dt, w);
  } else if (w.id !== 'bat') {
    animateMagazine(dt, w);
  }

  // ── Body / rotation phase animation ────────────────────────────
  const phases = RELOAD_ANIM[w.id];
  if (!phases || phases.length === 0) return;

  const ra = reloadAnim;
  const [rx, ry, rz] = WEAPON_REST[w.id];

  // All phases exhausted — idle lerp back toward rest while timer finishes
  if (ra.phase >= phases.length) {
    gunGroup.position.x += (rx - gunGroup.position.x) * dt * 10;
    gunGroup.position.y += (ry - gunGroup.position.y) * dt * 10;
    gunGroup.position.z += (rz - gunGroup.position.z) * dt * 10;
    gunGroup.rotation.x += (0 - gunGroup.rotation.x) * dt * 10;
    gunGroup.rotation.y += (0 - gunGroup.rotation.y) * dt * 10;
    gunGroup.rotation.z += (0 - gunGroup.rotation.z) * dt * 10;
    return;
  }

  const phase = phases[ra.phase];

  // First frame of a new phase: fire shake and sounds
  if (ra.phaseTimer === 0) {
    if (phase.shake)            shakeIntensity = Math.max(shakeIntensity, phase.shake);
    if (phase.sound === 'eject') playMagEject();
    if (phase.sound === 'slam')  playBoltSlam();
  }

  ra.phaseTimer += dt;

  // Advance when phase duration expires
  if (ra.phaseTimer >= phase.dur) {
    ra.phase++;
    ra.phaseTimer = 0;
    return;
  }

  // Lerp gun toward phase target — high rate = clunky snap, low rate = slow drift
  const rate = Math.min(1, dt * (phase.snap ? 55 : 10));
  const [px, py, pz] = phase.pos;
  const [rotX, rotY, rotZ] = phase.rot;

  gunGroup.position.x += ((rx + px) - gunGroup.position.x) * rate;
  gunGroup.position.y += ((ry + py) - gunGroup.position.y) * rate;
  gunGroup.position.z += ((rz + pz) - gunGroup.position.z) * rate;
  gunGroup.rotation.x += (rotX - gunGroup.rotation.x) * rate;
  gunGroup.rotation.y += (rotY - gunGroup.rotation.y) * rate;
  gunGroup.rotation.z += (rotZ - gunGroup.rotation.z) * rate;
}

/**
 * Physically animates the weapon's magazine mesh ejecting and re-inserting.
 * Uses w.reloadTimer to drive progress independently of the body-phase system.
 */
function animateMagazine(dt, w) {
  if (!gunGroup || !gunGroup.userData.mag) return;
  const mag    = gunGroup.userData.mag;
  const restY  = gunGroup.userData.magRestY || 0;
  const DROP   = gunGroup.userData.magDrop  || 0.25;

  // progress: 0 = just started, 1 = finished
  const progress = 1 - (w.reloadTimer / w.reloadDuration);

  let targetY;
  if (progress < 0.22) {
    // Phase 1 — EJECT: mag snaps downward hard
    const t = progress / 0.22;
    targetY = restY - DROP * t;
  } else if (progress < 0.55) {
    // Phase 2 — OUT: fully ejected, held below the weapon
    targetY = restY - DROP;
  } else if (progress < 0.82) {
    // Phase 3 — INSERT: new mag punches upward and clicks in
    const t = (progress - 0.55) / 0.27;
    targetY = restY - DROP + DROP * t;
  } else {
    // Phase 4 — SEATED: perfectly in place
    targetY = restY;
  }

  // Very fast lerp so motion is abrupt and clunky
  mag.position.y += (targetY - mag.position.y) * Math.min(1, dt * 52);

  // Animate the left hand to track the magazine
  if (gunGroup.userData.leftHand && gunGroup.userData.handRest) {
    const hand = gunGroup.userData.leftHand;
    const hRest = gunGroup.userData.handRest;
    
    if (progress < 0.85) {
      // Hand grabs the mag
      const targetX = mag.position.x - 0.03; 
      const targetY = mag.position.y - 0.02;
      const targetZ = mag.position.z + 0.02;
      
      hand.position.x += (targetX - hand.position.x) * Math.min(1, dt * 30);
      hand.position.y += (targetY - hand.position.y) * Math.min(1, dt * 30);
      hand.position.z += (targetZ - hand.position.z) * Math.min(1, dt * 30);
    } else {
      // Hand returns to rest
      hand.position.lerp(hRest, Math.min(1, dt * 25));
    }
  }
}

/**
 * Spawns a single brass shotgun shell mesh and animates it
 * being slid into the loading port during reload.
 */
function animateShotgunShell(dt, w) {
  // Lazily create the shell mesh the first time this is called
  if (!reloadAnim.shell) {
    const brass = new THREE.MeshLambertMaterial({ color: 0xcc8800 });
    const tip   = new THREE.MeshLambertMaterial({ color: 0xdd3300 });
    const shellGroup = new THREE.Group();

    // Brass case
    const caseMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.048, 8), brass);
    caseMesh.rotation.x = Math.PI / 2;
    shellGroup.add(caseMesh);

    // Red plastic crimp / wad at front
    const crimp = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.008, 8), tip);
    crimp.rotation.x = Math.PI / 2;
    crimp.position.z = -0.028;  // sits at the front of the shell
    shellGroup.add(crimp);

    // Start position: to the right of the receiver at loading port height
    shellGroup.position.set(0.10, -0.022, 0.05);
    shellGroup.visible = false;
    gunGroup.add(shellGroup);
    reloadAnim.shell = shellGroup;
  }

  const shell    = reloadAnim.shell;
  const progress = 1 - (w.reloadTimer / w.reloadDuration);
  
  const hand = (gunGroup && gunGroup.userData.leftHand) ? gunGroup.userData.leftHand : null;
  const hRest = (gunGroup && gunGroup.userData.handRest) ? gunGroup.userData.handRest : null;

  if (progress < 0.15) {
    // Shell appears to the side of the receiver
    shell.visible = true;
    shell.position.set(0.10, -0.022, 0.05);
    if (hand) {
      hand.position.x += (0.08 - hand.position.x) * Math.min(1, dt * 25);
      hand.position.y += (-0.04 - hand.position.y) * Math.min(1, dt * 25);
      hand.position.z += (0.05 - hand.position.z) * Math.min(1, dt * 25);
    }
  } else if (progress < 0.45) {
    // Shell slides across into the loading port (X → centre, Z → barrel)
    const t = (progress - 0.15) / 0.30;
    shell.visible = true;
    shell.position.set(
      0.10 - t * 0.115,   // right to centre
      -0.022 + t * 0.005, // very slight rise
      0.05  - t * 0.20    // toward barrel
    );
    if (hand) hand.position.copy(shell.position).add(new THREE.Vector3(-0.02, -0.02, 0));
  } else if (progress < 0.58) {
    // Shell is at the loading port — chambering pause
    shell.visible = true;
    shell.position.set(-0.015, -0.017, -0.15);
    if (hand) hand.position.copy(shell.position).add(new THREE.Vector3(-0.02, -0.02, 0));
  } else {
    // Chambered — shell disappears (inside the tube)
    shell.visible = false;
    if (hand && hRest) hand.position.lerp(hRest, Math.min(1, dt * 20));
  }
}

// ─────────────────────────────────────────────────────────
//  HUD EFFECTS
// ─────────────────────────────────────────────────────────
function showHitMarker() {
  const el = document.getElementById('hit-marker');
  el.classList.add('active');
  setTimeout(() => el.classList.remove('active'), 100);
}

function showDamageOverlay() {
  const el = document.getElementById('damage-overlay');
  el.classList.add('active');
  setTimeout(() => el.classList.remove('active'), 380);
  shakeIntensity = 0.12;
}

function updateHealthHUD() {
  const pct = player.health / player.maxHealth;
  const bar = document.getElementById('health-bar');
  bar.style.width = (pct * 100) + '%';
  document.getElementById('health-text').textContent = Math.ceil(player.health);

  if (pct > 0.6) bar.style.background = 'linear-gradient(90deg, #00ff88, #00cc66)';
  else if (pct > 0.3) bar.style.background = 'linear-gradient(90deg, #ffaa00, #ff6600)';
  else bar.style.background = 'linear-gradient(90deg, #ff2244, #aa0022)';
}

// ─────────────────────────────────────────────────────────
//  INPUT SETUP
// ─────────────────────────────────────────────────────────
function setupInput() {
  // ── Keyboard ──────────────────────────────────────────
  document.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (gameState === 'playing') {
      if (e.code === 'KeyR') startReload();
      if (e.code === 'Digit1') switchWeapon(0);
      if (e.code === 'Digit2') switchWeapon(1);
      if (e.code === 'Digit3') switchWeapon(2);
    }
    if (e.code === 'Escape') {
      if (gameState === 'playing') pauseGame();
      else if (gameState === 'paused') resumeGame();
    }
  });

  document.addEventListener('keyup', e => { keys[e.code] = false; });

  // ── Desktop Mouse ─────────────────────────────────────
  document.addEventListener('mousemove', e => {
    if (!isPointerLocked) return;
    mouseDeltaX += e.movementX || 0;
    mouseDeltaY += e.movementY || 0;
  });

  document.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('mousedown', e => {
    if (gameState === 'playing' && isPointerLocked) {
      if (e.button === 0) {
        mouseDown = true;
        const w = cw();
        if (w.melee) {
          // Start bat charge on hold; release fires the swing
          if (!batState.isSwinging) {
            batState.isCharging  = true;
            batState.chargeTime  = 0;
            batState.windupActive = true;
          }
        } else if (!w.auto) {
          playerShoot();
        }
      } else if (e.button === 2) {
        isAds = true;
      }
    }
  });
  document.addEventListener('mouseup', e => {
    if (e.button === 0) {
      mouseDown = false;
      const w = cw();
      if (w && w.melee && batState.isCharging) {
        // Release: full charge = strong swing, partial = weak swing
        const isCharged = batState.chargeTime >= batState.chargeDuration;
        batState.isCharging   = false;
        batState.windupActive = false;
        batState.chargeTime   = 0;
        performBatSwing(isCharged);
      }
    }
    else if (e.button === 2) isAds = false;
  });

  const canvas = document.getElementById('game-canvas');

  if (!isMobile) {
    // Desktop: click canvas to request pointer lock
    canvas.addEventListener('click', () => {
      if (gameState === 'playing') canvas.requestPointerLock();
    });
    document.getElementById('click-to-start').addEventListener('click', () => {
      if (gameState === 'playing') canvas.requestPointerLock();
    });
  }

  document.addEventListener('pointerlockchange', () => {
    isPointerLocked = (document.pointerLockElement === canvas);
    const ctsEl = document.getElementById('click-to-start');
    if (!isMobile && gameState === 'playing') {
      ctsEl.style.display = isPointerLocked ? 'none' : 'flex';
    } else {
      ctsEl.style.display = 'none';
    }
  });

  // ── Mobile Touch Controls ─────────────────────────────
  if (isMobile) {
    setupMobileControls();
  }
}

// ─────────────────────────────────────────────────────────
//  MOBILE TOUCH CONTROL SETUP
// ─────────────────────────────────────────────────────────
function setupMobileControls() {
  const JOYSTICK_RADIUS = 50; // max distance knob travels
  const LOOK_SENS = 4.5;      // pixels-per-radian multiplier for touch look

  const joystickZone  = document.getElementById('joystick-zone');
  const joystickBase  = document.getElementById('joystick-base');
  const joystickKnob  = document.getElementById('joystick-knob');
  const lookZone      = document.getElementById('look-zone');

  // ── Joystick Zone ──────────────────────────────────────
  joystickZone.addEventListener('touchstart', e => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (joystick.active) continue;
      joystick.active = true;
      joystick.id     = t.identifier;
      const rect = joystickZone.getBoundingClientRect();
      joystick.startX = t.clientX - rect.left;
      joystick.startY = t.clientY - rect.top;
      joystick.curX   = joystick.startX;
      joystick.curY   = joystick.startY;

      // Position joystick base at touch point
      joystickBase.style.left = joystick.startX + 'px';
      joystickBase.style.top  = joystick.startY + 'px';
      joystickBase.classList.add('visible');

      // Centre knob initially
      joystickKnob.style.left = '50%';
      joystickKnob.style.top  = '50%';
      joystickKnob.style.transform = 'translate(-50%, -50%)';
    }
  }, { passive: false });

  joystickZone.addEventListener('touchmove', e => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier !== joystick.id) continue;
      const rect = joystickZone.getBoundingClientRect();
      joystick.curX = t.clientX - rect.left;
      joystick.curY = t.clientY - rect.top;

      let dx = joystick.curX - joystick.startX;
      let dy = joystick.curY - joystick.startY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > JOYSTICK_RADIUS) {
        const sc = JOYSTICK_RADIUS / dist;
        dx *= sc; dy *= sc;
      }

      joystick.normX = dx / JOYSTICK_RADIUS;
      joystick.normY = dy / JOYSTICK_RADIUS;

      // Move knob visually (relative to base centre)
      joystickKnob.style.left      = (60 + dx) + 'px';
      joystickKnob.style.top       = (60 + dy) + 'px';
      joystickKnob.style.transform = 'translate(-50%, -50%)';
    }
  }, { passive: false });

  const endJoystick = e => {
    for (const t of e.changedTouches) {
      if (t.identifier !== joystick.id) continue;
      joystick.active = false;
      joystick.id     = null;
      joystick.normX  = 0;
      joystick.normY  = 0;
      joystickBase.classList.remove('visible');
      joystickKnob.style.left = '50%';
      joystickKnob.style.top  = '50%';
    }
  };
  joystickZone.addEventListener('touchend',    endJoystick, { passive: false });
  joystickZone.addEventListener('touchcancel', endJoystick, { passive: false });

  // ── Look Zone ──────────────────────────────────────────
  lookZone.addEventListener('touchstart', e => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (lookTouch.active) continue;
      lookTouch.active = true;
      lookTouch.id     = t.identifier;
      lookTouch.lastX  = t.clientX;
      lookTouch.lastY  = t.clientY;
    }
  }, { passive: false });

  lookZone.addEventListener('touchmove', e => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier !== lookTouch.id) continue;
      const dx = t.clientX - lookTouch.lastX;
      const dy = t.clientY - lookTouch.lastY;
      // Accumulate as if these were mouse movement pixels at LOOK_SENS sensitivity
      // updatePlayer multiplies delta by 0.0022; here we pre-scale so that
      // 1 touch pixel ≈ LOOK_SENS mouse pixels of feel
      mouseDeltaX += dx * LOOK_SENS;
      mouseDeltaY += dy * LOOK_SENS;
      lookTouch.lastX = t.clientX;
      lookTouch.lastY = t.clientY;
    }
  }, { passive: false });

  const endLook = e => {
    for (const t of e.changedTouches) {
      if (t.identifier !== lookTouch.id) continue;
      lookTouch.active = false;
      lookTouch.id     = null;
    }
  };
  lookZone.addEventListener('touchend',    endLook, { passive: false });
  lookZone.addEventListener('touchcancel', endLook, { passive: false });

  // ── Action Buttons ─────────────────────────────────────
  const btnShoot  = document.getElementById('btn-shoot');
  const btnReload = document.getElementById('btn-reload');
  const btnAds    = document.getElementById('btn-ads');
  const btnPause  = document.getElementById('btn-pause-mob');

  // Shoot — hold for auto, tap for semi, hold to charge bat
  btnShoot.addEventListener('touchstart', e => {
    e.preventDefault();
    if (gameState !== 'playing') return;
    initAudio();
    mouseDown = true;
    const w = cw();
    if (w.melee) {
      if (!batState.isSwinging) {
        batState.isCharging  = true;
        batState.chargeTime  = 0;
        batState.windupActive = true;
      }
    } else if (!w.auto) {
      playerShoot();
    }
  }, { passive: false });
  btnShoot.addEventListener('touchend', e => {
    e.preventDefault();
    mouseDown = false;
    const w = cw();
    if (w && w.melee && batState.isCharging) {
      const isCharged = batState.chargeTime >= batState.chargeDuration;
      batState.isCharging   = false;
      batState.windupActive = false;
      batState.chargeTime   = 0;
      performBatSwing(isCharged);
    }
  }, { passive: false });
  btnShoot.addEventListener('touchcancel', e => {
    e.preventDefault();
    mouseDown = false;
  }, { passive: false });

  // Reload
  btnReload.addEventListener('touchstart', e => {
    e.preventDefault();
    if (gameState === 'playing') startReload();
  }, { passive: false });

  // ADS toggle
  btnAds.addEventListener('touchstart', e => {
    e.preventDefault();
    if (gameState !== 'playing') return;
    mobileAdsOn = !mobileAdsOn;
    isAds = mobileAdsOn;
    btnAds.classList.toggle('ads-active', mobileAdsOn);
  }, { passive: false });

  // Pause
  btnPause.addEventListener('touchstart', e => {
    e.preventDefault();
    if (gameState === 'playing') pauseGame();
    else if (gameState === 'paused') resumeGame();
  }, { passive: false });

  // Weapon slots
  [0, 1, 2].forEach(i => {
    const btn = document.getElementById('mob-slot-' + (i + 1));
    btn.addEventListener('touchstart', ev => {
      ev.preventDefault();
      if (gameState === 'playing') switchWeapon(i);
    }, { passive: false });
  });
}

// ─────────────────────────────────────────────────────────
//  PLAYER UPDATE  (called every frame while playing)
// ─────────────────────────────────────────────────────────
function updatePlayer(dt) {
  if (!player.alive) return;

  // ── Mouse look
  const sens = 0.0022;
  player.yaw -= mouseDeltaX * sens;
  player.pitch = Math.max(-1.45, Math.min(1.45, player.pitch - mouseDeltaY * sens));
  mouseDeltaX = 0;
  mouseDeltaY = 0;

  camera.rotation.order = 'YXZ';
  camera.rotation.y = player.yaw;
  camera.rotation.x = player.pitch;

  // ── Movement vectors (XZ only; gravity handles Y)
  const sy = Math.sin(player.yaw);
  const cy = Math.cos(player.yaw);
  const fwdX = -sy; const fwdZ = -cy;   // forward
  const rgtX = cy; const rgtZ = -sy;   // right

  // Movement — keyboard or virtual joystick
  const mZ = (keys['KeyW'] ? 1 : 0) - (keys['KeyS'] ? 1 : 0) + (joystick.active ? -joystick.normY : 0);
  const mX = (keys['KeyD'] ? 1 : 0) - (keys['KeyA'] ? 1 : 0) + (joystick.active ?  joystick.normX : 0);

  let movX = fwdX * mZ + rgtX * mX;
  let movZ = fwdZ * mZ + rgtZ * mX;
  const movLen = Math.sqrt(movX * movX + movZ * movZ);
  if (movLen > 0) { movX /= movLen; movZ /= movLen; }

  const isSprint = keys['ShiftLeft'] && movLen > 0;
  const isCrouch = keys['ControlLeft'];
  const spd = isSprint ? 8.5 : (isCrouch ? 2.5 : 5.5);

  // ── Horizontal movement (axis-split collision)
  const nx = camera.position.x + movX * spd * dt;
  const nz = camera.position.z + movZ * spd * dt;

  if (!playerCollidesAt(nx, camera.position.y, camera.position.z)) camera.position.x = nx;
  if (!playerCollidesAt(camera.position.x, camera.position.y, nz)) camera.position.z = nz;

  // ── Gravity
  playerVelY += GRAVITY * dt;
  camera.position.y += playerVelY * dt;
  const eyeH = isCrouch ? player.crouchEyeHeight : player.eyeHeight;
  if (camera.position.y < eyeH) {
    camera.position.y = eyeH;
    playerVelY = 0;
  }

  // ── Arena boundary clamp (keeps player inside outer walls)
  const BOUND = 37.3;
  camera.position.x = Math.max(-BOUND, Math.min(BOUND, camera.position.x));
  camera.position.z = Math.max(-BOUND, Math.min(BOUND, camera.position.z));

  // ── Shooting & Bat Charging
  player.shootCooldown = Math.max(0, player.shootCooldown - dt);
  const w = cw();
  if (mouseDown && w.auto) playerShoot();

  // ── Bat Charge Meter UI
  const chargeContainer = document.getElementById('bat-charge-container');
  const chargeBar = document.getElementById('bat-charge-bar');
  if (w.melee && batState.isCharging) {
    batState.chargeTime += dt;
    const ratio = Math.min(batState.chargeTime / batState.chargeDuration, 1);
    if (chargeContainer) {
      chargeContainer.classList.remove('hidden');
      chargeContainer.classList.toggle('full-charge', ratio >= 1);
      if (chargeBar) chargeBar.style.width = (ratio * 100) + '%';
    }
  } else {
    if (chargeContainer) {
      chargeContainer.classList.add('hidden');
      chargeContainer.classList.remove('full-charge');
      if (chargeBar) chargeBar.style.width = '0%';
    }
  }

  // ── Reload timer
  if (w.isReloading) {
    w.reloadTimer -= dt;
    if (w.reloadTimer <= 0) finishReload();
  }

  // ── Weapon-switch slide-in animation
  if (isSwitchingWeapon) {
    switchTimer = Math.max(0, switchTimer - dt);
    const [rx, ry, rz] = WEAPON_REST[cw().id];
    if (gunGroup && gunGroup.visible) {
      // Slide up from below
      gunGroup.position.y += (ry - gunGroup.position.y) * dt * 18;
    }
  }

  // ── Weapon animation
  if (gunGroup) {
    const usingAds = isAds && !w.melee && !isSwitchingWeapon && !w.isReloading;
    const isSniperScope = usingAds && w.id === 'sniper';

    // Zoom camera for ADS
    const targetWeaponFov = usingAds ? 60 / 1.2 : 60; // 1.2x zoom for weapon model
    const targetMainFov = usingAds ? (w.id === 'sniper' ? 25 : 82 / 1.5) : 82; // Strong zoom for sniper, medium for others

    weaponCamera.fov += (targetWeaponFov - weaponCamera.fov) * dt * 15;
    weaponCamera.updateProjectionMatrix();
    camera.fov += (targetMainFov - camera.fov) * dt * 15;
    camera.updateProjectionMatrix();
    
    // Toggle scope overlay and hide gun mesh
    const scopeEl = document.getElementById('sniper-scope');
    const chEl = document.getElementById('crosshair');
    if (isSniperScope) {
      if (scopeEl) scopeEl.classList.remove('hidden');
      if (chEl) chEl.style.display = 'none';
      gunGroup.visible = false;
    } else {
      if (scopeEl) scopeEl.classList.add('hidden');
      if (chEl) chEl.style.display = '';
      gunGroup.visible = true;
    }

    const [rx, ry, rz] = usingAds ? WEAPON_ADS_REST[w.id] : WEAPON_REST[w.id];

    if (!isSwitchingWeapon) {
      if (w.isReloading && reloadAnim.active) {
        // ── Clunky reload animation drives everything
        updateReloadAnimation(dt, w);
      } else {
        // ── Weapon spring recoil simulation ────────────────────────────
        // Drives camera pitch, gun Z position, gun rotation.x and .z
        // via a damped spring: a = -k*x - c*v
        const k = weaponRecoil.stiffness;
        const c = weaponRecoil.damping;

        // Pitch spring
        weaponRecoil.pitchVel  += (-k * weaponRecoil.pitchDisp - c * weaponRecoil.pitchVel) * dt;
        weaponRecoil.pitchDisp += weaponRecoil.pitchVel * dt;

        // Z spring
        weaponRecoil.zVel  += (-k * weaponRecoil.zDisp - c * weaponRecoil.zVel) * dt;
        weaponRecoil.zDisp += weaponRecoil.zVel * dt;

        // Rotation.x spring
        weaponRecoil.rotVel  += (-k * weaponRecoil.rotDisp - c * weaponRecoil.rotVel) * dt;
        weaponRecoil.rotDisp += weaponRecoil.rotVel * dt;

        // Lateral (rotation.z) spring
        weaponRecoil.latVel  += (-k * weaponRecoil.latDisp - c * weaponRecoil.latVel) * dt;
        weaponRecoil.latDisp += weaponRecoil.latVel * dt;

        // Apply to camera pitch — add spring displacement as a direct offset
        // on top of the player's aimed pitch (camera.rotation.x was set above).
        camera.rotation.x = Math.max(-1.45, Math.min(1.45,
          player.pitch + weaponRecoil.pitchDisp));

        // Apply to gun model
        gunGroup.position.z = rz + weaponRecoil.zDisp;
        gunGroup.rotation.x = weaponRecoil.rotDisp;
        gunGroup.rotation.z = weaponRecoil.latDisp * 0.18;

        // Melee bat swing animation (two types: weak horizontal arc, charged vertical slam)
        if (w.melee && batState.isSwinging) {
          batState.swingTimer += dt;
          const dur  = batState.isCharged ? 0.55 : 0.32;
          const prog = Math.min(batState.swingTimer / dur, 1);

          if (batState.isCharged) {
            // ── CHARGED: dramatic top-down overhead slam ──────────────────
            // Wind up (rotate back/up), then slam forward
            const windUpEnd = 0.35;
            if (prog < windUpEnd) {
              const t = prog / windUpEnd;
              gunGroup.rotation.x =  t * 1.6;  // bat swings back over shoulder
              gunGroup.rotation.y = -t * 0.5;
              gunGroup.rotation.z =  t * 0.4;
            } else {
              const t = (prog - windUpEnd) / (1 - windUpEnd);
              const slam = Math.sin(t * Math.PI); // in-out arc
              gunGroup.rotation.x =  1.6 - t * 2.8;  // slam forward past neutral
              gunGroup.rotation.y = -0.5 + t * 0.8;
              gunGroup.rotation.z =  0.4 - t * 0.6;
            }
          } else {
            // ── WEAK: fast horizontal side-swipe ─────────────────────────
            const swingAngle = Math.sin(prog * Math.PI) * 1.4;
            gunGroup.rotation.y = swingAngle;
            gunGroup.rotation.z = -swingAngle * 0.25;
            gunGroup.rotation.x =  swingAngle * 0.15;
          }

          if (prog >= 1) {
            batState.isSwinging = false;
            gunGroup.rotation.set(0, 0, 0);
          }

        } else if (w.melee && batState.isCharging) {
          // ── WIND-UP POSE: bat slowly pulls back as charge builds ───────
          const chargeRatio = Math.min(batState.chargeTime / batState.chargeDuration, 1);
          // Ease-in: slow pull-back at first, snaps to ready at full charge
          const ease = chargeRatio * chargeRatio;
          gunGroup.rotation.x =  ease * 1.4;   // pull back along X
          gunGroup.rotation.y = -ease * 0.35;
          gunGroup.rotation.z =  ease * 0.3;
          // Subtle tremble at full charge
          if (chargeRatio >= 1) {
            gunGroup.rotation.x += (Math.random() - 0.5) * 0.04;
            gunGroup.rotation.z += (Math.random() - 0.5) * 0.04;
          }
        } else if (w.id === 'shotgun' && shotgunPumpActive) {
          shotgunPumpTimer += dt;
          // Shoot rate is 0.8s, we use 0.6s for the pump animation
          const prog = Math.min(shotgunPumpTimer / 0.6, 1);
          
          if (prog < 1) {
            // Tilt gun up quickly (0.35 rad), hold, then down
            let tilt = 0;
            if (prog < 0.2) tilt = (prog / 0.2) * 0.35;
            else if (prog < 0.8) tilt = 0.35;
            else tilt = (1 - (prog - 0.8) / 0.2) * 0.35;
            gunGroup.rotation.x = tilt;

            // Pump action (hand moves back along Z, then forward)
            const hand = gunGroup.userData.leftHand;
            const hRest = gunGroup.userData.handRest;
            if (hand && hRest) {
              let pumpZ = 0;
              if (prog >= 0.2 && prog <= 0.5) {
                if (!shotgunPumpSound1) {
                  playMagEject();
                  shotgunPumpSound1 = true;
                  spawnEjectedShell(gunGroup);
                }
                pumpZ = ((prog - 0.2) / 0.3) * 0.15;
              } else if (prog > 0.5 && prog <= 0.8) {
                if (!shotgunPumpSound2) { playBoltSlam(); shotgunPumpSound2 = true; }
                pumpZ = (1 - (prog - 0.5) / 0.3) * 0.15;
              }
              hand.position.z = hRest.z + pumpZ;
            }
          } else {
            shotgunPumpActive = false;
            gunGroup.rotation.x = 0;
            if (gunGroup.userData.leftHand && gunGroup.userData.handRest) {
              gunGroup.userData.leftHand.position.z = gunGroup.userData.handRest.z;
            }
          }
        } else if (!w.melee) {
          gunGroup.rotation.x += (0 - gunGroup.rotation.x) * dt * 12;
          if (w.id === 'shotgun' && gunGroup.userData.leftHand && gunGroup.userData.handRest) {
             gunGroup.userData.leftHand.position.lerp(gunGroup.userData.handRest, dt * 15);
          }
        }

        // Walk bob
        if (movLen > 0) {
          gunBobT += dt * (isSprint ? 14 : 9);
          const bobAmt = isSprint ? 0.013 : 0.007;
          gunGroup.position.y = ry + Math.sin(gunBobT) * bobAmt;
          gunGroup.position.x = rx + Math.cos(gunBobT * 0.5) * bobAmt * 0.5;
        } else {
          gunGroup.position.y += (ry - gunGroup.position.y) * dt * 7;
          gunGroup.position.x += (rx - gunGroup.position.x) * dt * 7;
        }
      }
    }

    // Muzzle flash decay
    if (muzzleFlashTimer > 0 && muzzleFlash) {
      muzzleFlashTimer -= dt;
      if (muzzleFlashTimer <= 0) {
        muzzleFlash.material.opacity = 0;
        muzzleFlashTimer = 0;
      } else {
        muzzleFlash.material.opacity = muzzleFlashTimer / 0.055;
        muzzleFlash.rotation.z += dt * 20;
      }
    }
  }

  // ── Screen shake
  if (shakeIntensity > 0) {
    camera.position.x += (Math.random() - 0.5) * shakeIntensity;
    camera.position.y += (Math.random() - 0.5) * shakeIntensity * 0.3;
    shakeIntensity *= (1 - dt * 9);
    if (shakeIntensity < 0.001) shakeIntensity = 0;
  }

  // ── Low-health vignette
  const lvEl = document.getElementById('low-health-vignette');
  if (player.health < 30) {
    lvEl.style.opacity = String(0.3 + Math.sin(Date.now() * 0.004) * 0.15);
  } else {
    lvEl.style.opacity = '0';
  }
}

// ─────────────────────────────────────────────────────────
//  PROJECTILE UPDATE
// ─────────────────────────────────────────────────────────
function updateProjectiles(dt) {
  for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
    const p = enemyProjectiles[i];
    p.mesh.position.x += p.dir.x * p.speed * dt;
    p.mesh.position.y += p.dir.y * p.speed * dt;
    p.mesh.position.z += p.dir.z * p.speed * dt;
    p.life -= dt;

    // Player hit (sphere vs camera position)
    if (p.mesh.position.distanceTo(camera.position) < 0.58) {
      player.health = Math.max(0, player.health - p.damage);
      showDamageOverlay();
      updateHealthHUD();
      scene.remove(p.mesh);
      enemyProjectiles.splice(i, 1);
      if (player.health <= 0 && player.alive) triggerGameOver();
      continue;
    }

    // Wall collision
    let hit = false;
    const pb = new THREE.Box3().setFromObject(p.mesh);
    for (const c of collidables) {
      if (pb.intersectsBox(c)) { hit = true; break; }
    }

    if (hit || p.life <= 0) {
      scene.remove(p.mesh);
      enemyProjectiles.splice(i, 1);
    }
  }
}

// ─────────────────────────────────────────────────────────
//  GAME FLOW
// ─────────────────────────────────────────────────────────
function startGame() {
  // ── Read & apply map selection
  const mapSelectEl = document.getElementById('map-select');
  if (mapSelectEl) selectedMap = mapSelectEl.value;

  // ── Tear down previous level geometry
  levelMeshes.forEach(m => scene.remove(m));
  levelMeshes.length = 0;
  // Remove level-owned lights (directional/ambient are re-added per createLevel call)
  // Reset collidables to only the boundary entries; safest is to clear all static entries
  collidables.length = 0;

  // Rebuild level for selected map
  createLevel(selectedMap);

  wave = 1;
  kills = 0;
  player.health = 100;
  player.alive = true;
  player.yaw = 0;
  player.pitch = 0;
  playerVelY = 0;
  gunBobT = 0;
  shakeIntensity = 0;
  panSwinging = false;
  panSwingTimer = 0;
  isSwitchingWeapon = false;
  isAds = false;
  shotgunPumpActive = false;
  shotgunPumpTimer = 0;
  mobileAdsOn = false;
  joystick.active = false;
  joystick.normX = 0;
  joystick.normY = 0;
  lookTouch.active = false;

  // Apply Loadout
  const p1Val = document.getElementById('primary-weapon').value;
  const p2Val = document.getElementById('secondary-weapon').value;
  
  WEAPONS = [
    JSON.parse(JSON.stringify(WEAPON_DB[p1Val])),
    JSON.parse(JSON.stringify(WEAPON_DB[p2Val])),
    JSON.parse(JSON.stringify(WEAPON_DB['bat']))
  ];
  
  // Ensure slots are assigned
  WEAPONS[0].slot = 1;
  WEAPONS[1].slot = 2;
  WEAPONS[2].slot = 3;

  // Build active models array based on loadout
  createWeapon._activeModels = [
    createWeapon._allModels[WEAPONS[0].id],
    createWeapon._allModels[WEAPONS[1].id],
    createWeapon._allModels[WEAPONS[2].id],
  ];

  // Hide all weapon models first
  for (const id in createWeapon._allModels) {
    createWeapon._allModels[id].visible = false;
  }

  // Switch to primary
  currentWeaponIdx = 0;
  gunGroup = createWeapon._activeModels[0];
  gunGroup.visible = true;
  gunGroup.position.set(...WEAPON_REST[WEAPONS[0].id]);
  gunGroup.rotation.set(0, 0, 0);
  
  // Sync global muzzleFlash
  muzzleFlash = gunGroup.userData.muzzleFlash || null;
  if (muzzleFlash) muzzleFlash.material.opacity = 0;

  camera.position.set(0, player.eyeHeight, 5);
  camera.rotation.set(0, 0, 0);

  document.getElementById('kills').textContent = '0';
  document.getElementById('reload-indicator').classList.add('hidden');
  updateHealthHUD();
  updateWeaponHUD();

  // Hide all overlays
  ['pause-menu', 'wave-complete', 'game-over'].forEach(id => {
    document.getElementById(id).classList.add('hidden');
  });

  spawnWave();
  gameState = 'playing';
}

function pauseGame() {
  if (gameState !== 'playing') return;
  gameState = 'paused';
  if (!isMobile) document.exitPointerLock();
  // Reset mobile move/shoot state
  joystick.active = false; joystick.normX = 0; joystick.normY = 0;
  mouseDown = false;
  document.getElementById('pause-menu').classList.remove('hidden');
  document.getElementById('click-to-start').style.display = 'none';
}

function resumeGame() {
  if (gameState !== 'paused') return;
  gameState = 'playing';
  document.getElementById('pause-menu').classList.add('hidden');
  if (!isMobile) {
    document.getElementById('game-canvas').requestPointerLock();
  }
}

function triggerGameOver() {
  if (!player.alive && gameState === 'gameover') return; // prevent double-trigger
  player.alive = false;
  gameState = 'gameover';
  if (!isMobile) document.exitPointerLock();
  joystick.active = false; joystick.normX = 0; joystick.normY = 0;
  mouseDown = false;
  document.getElementById('click-to-start').style.display = 'none';

  document.getElementById('final-waves').textContent = wave;
  document.getElementById('final-kills').textContent = kills;

  setTimeout(() => {
    document.getElementById('game-over').classList.remove('hidden');
  }, 900);
}

let waveCountdownTimer = null;

function checkWaveComplete() {
  if (!enemies.length || gameState !== 'playing') return;
  const alive = enemies.filter(e => e.alive).length;
  if (alive > 0) return;

  // All enemies dead
  gameState = 'wavecomplete';
  if (!isMobile) document.exitPointerLock();
  document.getElementById('click-to-start').style.display = 'none';

  document.getElementById('wave-complete-text').textContent =
    `Wave ${wave} cleared!  ${enemies.length} enemies eliminated.`;
  document.getElementById('wave-complete').classList.remove('hidden');

  let cd = 3;
  document.getElementById('countdown').textContent = cd;

  if (waveCountdownTimer) clearInterval(waveCountdownTimer);
  waveCountdownTimer = setInterval(() => {
    cd--;
    document.getElementById('countdown').textContent = cd;
    if (cd <= 0) {
      clearInterval(waveCountdownTimer);
      waveCountdownTimer = null;
      document.getElementById('wave-complete').classList.add('hidden');
      wave++;

      // Between-wave bonuses
      player.health = Math.min(player.maxHealth, player.health + 25);
      
      // Cancel any active reload
      const w = cw();
      if (w && w.isReloading) {
        w.isReloading = false;
        w.reloadTimer = 0;
        reloadAnim.active = false;
        reloadAnim.phase = 0;
        reloadAnim.phaseTimer = 0;
        if (gunGroup && gunGroup.userData.mag) {
          gunGroup.userData.mag.position.y = gunGroup.userData.magRestY || 0;
        }
        if (gunGroup && gunGroup.userData.leftHand && gunGroup.userData.handRest) {
          gunGroup.userData.leftHand.position.copy(gunGroup.userData.handRest);
        }
        if (reloadAnim.shell) {
          if (reloadAnim.shell.parent) reloadAnim.shell.parent.remove(reloadAnim.shell);
          reloadAnim.shell = null;
        }
        document.getElementById('reload-indicator').classList.add('hidden');
      }

      WEAPONS.forEach(w => {
        if (!w.melee) {
          w.ammo = w.maxAmmo;
          const maxRes = WEAPON_DB[w.id].reserveAmmo;
          const resRestock = Math.floor(maxRes / 2);
          w.reserveAmmo = Math.min(maxRes, w.reserveAmmo + resRestock);
        }
      });
      updateHealthHUD();
      updateWeaponHUD();

      spawnWave();
      gameState = 'playing';
      if (!isMobile) document.getElementById('game-canvas').requestPointerLock();
    }
  }, 1000);
}

function cleanupAndGoMenu() {
  if (waveCountdownTimer) { clearInterval(waveCountdownTimer); waveCountdownTimer = null; }
  enemies.forEach(e => {
    scene.remove(e.group);
    if (e.hpEl && e.hpEl.parentNode) e.hpEl.remove();
    if (e._deadBodyBox) {
      const idx = collidables.indexOf(e._deadBodyBox);
      if (idx !== -1) collidables.splice(idx, 1);
    }
  });
  enemies = [];
  enemyProjectiles.forEach(p => scene.remove(p.mesh));
  enemyProjectiles = [];
  ejectedShells.forEach(s => weaponScene.remove(s.mesh));
  ejectedShells.length = 0;
  if (!isMobile) document.exitPointerLock();
  gameState = 'menu';
}

const ejectedShells = [];

function spawnEjectedShell(wGroup) {
  const brass = new THREE.MeshLambertMaterial({ color: 0xcc8800 });
  const plastic = new THREE.MeshLambertMaterial({ color: 0xaa2211 });
  
  const shellGroup = new THREE.Group();
  
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.035, 8), plastic);
  body.rotation.x = Math.PI / 2;
  body.position.z = -0.01;
  shellGroup.add(body);
  
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.0092, 0.0092, 0.015, 8), brass);
  base.rotation.x = Math.PI / 2;
  base.position.z = 0.015;
  shellGroup.add(base);
  
  // Ejection port offset (right side of receiver)
  const offset = new THREE.Vector3(0.05, 0.02, -0.10);
  offset.applyEuler(wGroup.rotation);
  
  shellGroup.position.copy(wGroup.position).add(offset);
  shellGroup.rotation.copy(wGroup.rotation);
  
  weaponScene.add(shellGroup);
  
  // Eject outwards to the right (+X), slightly up (+Y), slightly back (+Z)
  const vel = new THREE.Vector3(
    1.2 + Math.random() * 0.5,
    0.8 + Math.random() * 0.4,
    0.3 + Math.random() * 0.3
  );
  
  const rotVel = new THREE.Vector3(
    Math.random() * 8 - 4,
    Math.random() * 8 - 4,
    Math.random() * 8 - 4
  );
  
  ejectedShells.push({ mesh: shellGroup, vel, rotVel, life: 1.5 });
}

function updateEjectedShells(dt) {
  for (let i = ejectedShells.length - 1; i >= 0; i--) {
    const s = ejectedShells[i];
    s.mesh.position.addScaledVector(s.vel, dt);
    s.mesh.rotation.x += s.rotVel.x * dt;
    s.mesh.rotation.y += s.rotVel.y * dt;
    s.mesh.rotation.z += s.rotVel.z * dt;
    s.vel.y -= 4.0 * dt; // Gravity in weaponScene space
    s.life -= dt;
    if (s.life <= 0) {
      weaponScene.remove(s.mesh);
      ejectedShells.splice(i, 1);
    }
  }
}

// ─────────────────────────────────────────────────────────
//  MAIN GAME LOOP
// ─────────────────────────────────────────────────────────
function gameLoop() {
  requestAnimationFrame(gameLoop);
  const dt = Math.min(clock.getDelta(), 0.05); // cap at 50 ms to prevent spiral-of-death

  if (gameState === 'playing' || gameState === 'wavecomplete' || gameState === 'gameover') {
    updatePlayer(dt);

    let alive = 0;
    enemies.forEach(e => { e.update(dt); if (e.alive) alive++; });

    if (gameState === 'playing') {
      document.getElementById('enemy-num').textContent = alive;
      checkWaveComplete();
    }

    updateProjectiles(dt);
    updateEjectedShells(dt);
  }

  // Two-pass render: world → weapon (depth-cleared so gun never clips)
  renderer.autoClear = false;
  renderer.clear();
  renderer.render(scene, camera);
  renderer.clearDepth();
  renderer.render(weaponScene, weaponCamera);
}

// ─────────────────────────────────────────────────────────
//  INITIALISATION
// ─────────────────────────────────────────────────────────
function init() {
  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x6eb5ff); // Natural bright blue sky
  scene.fog = new THREE.FogExp2(0x6eb5ff, 0.011);

  // Main camera (becomes the player's head)
  camera = new THREE.PerspectiveCamera(
    82,                                      // FOV
    window.innerWidth / window.innerHeight,
    0.1,                                     // near
    130                                      // far
  );
  camera.position.set(0, player.eyeHeight, 5);

  // Renderer
  renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById('game-canvas'),
    antialias: !isMobile,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(isMobile ? 1 : Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = !isMobile;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Clock
  clock = new THREE.Clock();

  // Build initial level (Deadzone default) and weapons
  createLevel('deadzone');
  createWeapon();

  // Input
  setupInput();

  // Resize handler
  window.addEventListener('resize', () => {
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    weaponCamera.aspect = w / h;
    weaponCamera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });

  // ── UI event listeners ────────────────────────────────

  // Update menu footer for mobile
  if (isMobile) {
    const hint = document.getElementById('menu-footer-hint');
    if (hint) hint.textContent = 'LEFT JOYSTICK · DRAG RIGHT TO LOOK · FIRE BUTTON · TOUCH TO PLAY';
  }

  // Main menu: Play
  document.getElementById('play-btn').addEventListener('click', () => {
    initAudio();
    document.getElementById('main-menu').classList.remove('active');
    document.getElementById('game-container').classList.remove('hidden');
    startGame();

    if (isMobile) {
      // Try to enter fullscreen and lock to landscape
      const docEl = document.documentElement;
      const requestFS = docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.mozRequestFullScreen || docEl.msRequestFullscreen;
      if (requestFS) {
        requestFS.call(docEl).then(() => {
          if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('landscape').catch(e => console.log('Orientation lock failed', e));
          }
        }).catch(err => console.log('Fullscreen failed', err));
      }

      // Show mobile controls, skip pointer lock / click-to-start
      document.getElementById('mobile-controls').classList.remove('hidden');
      document.getElementById('click-to-start').style.display = 'none';
    } else {
      // Desktop: show click-to-start overlay until pointer locked
      document.getElementById('click-to-start').style.display = 'flex';
    }
  });

  // Main menu: Controls
  document.getElementById('controls-btn').addEventListener('click', () => {
    document.getElementById('main-menu').classList.remove('active');
    document.getElementById('controls-screen').classList.add('active');
  });

  // Controls: Back
  document.getElementById('back-btn').addEventListener('click', () => {
    document.getElementById('controls-screen').classList.remove('active');
    document.getElementById('main-menu').classList.add('active');
  });

  // Pause: Resume
  document.getElementById('resume-btn').addEventListener('click', resumeGame);

  // Pause: Restart
  document.getElementById('restart-btn').addEventListener('click', () => {
    document.getElementById('pause-menu').classList.add('hidden');
    startGame();
    if (!isMobile) document.getElementById('game-canvas').requestPointerLock();
  });

  // Pause: Quit
  document.getElementById('quit-btn').addEventListener('click', () => {
    document.getElementById('pause-menu').classList.add('hidden');
    cleanupAndGoMenu();
    document.getElementById('game-container').classList.add('hidden');
    document.getElementById('mobile-controls').classList.add('hidden');
    document.getElementById('main-menu').classList.add('active');
  });

  // Game Over: Retry
  document.getElementById('retry-btn').addEventListener('click', () => {
    document.getElementById('game-over').classList.add('hidden');
    startGame();
    if (!isMobile) document.getElementById('game-canvas').requestPointerLock();
  });

  // Game Over: Menu
  document.getElementById('menu-btn-go').addEventListener('click', () => {
    document.getElementById('game-over').classList.add('hidden');
    cleanupAndGoMenu();
    document.getElementById('game-container').classList.add('hidden');
    document.getElementById('mobile-controls').classList.add('hidden');
    document.getElementById('main-menu').classList.add('active');
  });

  // Start loop
  gameLoop();
}

// Kick everything off once the DOM + Three.js are ready
window.addEventListener('load', init);
