// Admin State
let isAdminUnlocked = false;
let isGodMode = false;
let isInfiniteAmmo = false;

'use strict';
/* ============================================================
   DEADZONE FPS Ã¢â‚¬â€ game.js
   3D First Person Shooter built with Three.js (r128)

   Architecture:
     Ã¢â‚¬Â¢ Two-pass rendering: world scene + weapon scene (no z-clip)
     Ã¢â‚¬Â¢ AABB collision (Box3 array) for player & enemies
     Ã¢â‚¬Â¢ Hitscan raycasting for player weapon
     Ã¢â‚¬Â¢ Enemy projectile spheres
     Ã¢â‚¬Â¢ Web Audio API synthesised SFX
     Ã¢â‚¬Â¢ Endless wave system with escalating difficulty
   ============================================================ */

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
//  GLOBALS
// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
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

/** @type {Array<{cx: number, cz: number, rotY: number, segments: Array}>} - Tight oriented vehicle colliders */
const vehicleColliders = [];

/** Track all level-geometry meshes so we can clear them between map loads */
const levelMeshes = [];

/** Currently selected map id ('deadzone' | 'warfront') */
let selectedMap = 'deadzone';
let isBossArenaActive = false;

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

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Weapon definitions Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
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

// Helper Ã¢â‚¬â€ current weapon object
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
const JUMP_SPEED = 8.5; // initial upward velocity on jump
let isOnGround = false; // true when player is standing on floor

/** @type {Array<{group: THREE.Group, hp: number, maxHp: number, destroyed: boolean, colliderBox: THREE.Box3, particles: Array, fireTimers: Array}>} */
const vehicles = [];

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
  // Lateral (rotation.z) kick Ã¢â‚¬â€ randomised each shot
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

/** Jump whoosh sound */
function playJumpSound() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const len = Math.floor(audioCtx.sampleRate * 0.12);
  const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 0.8) * 0.18;
  }
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  const bp = audioCtx.createBiquadFilter();
  bp.type = 'bandpass'; bp.frequency.value = 500; bp.Q.value = 0.6;
  const g = audioCtx.createGain();
  g.gain.setValueAtTime(0.22, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  src.connect(bp); bp.connect(g); g.connect(audioCtx.destination);
  src.start(now);
}

/** Deep explosion boom */
function playExplosionSound() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const len = Math.floor(audioCtx.sampleRate * 0.55);
  const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.1);
  }
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  const lp = audioCtx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 350;
  const g = audioCtx.createGain();
  g.gain.setValueAtTime(2.0, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
  src.connect(lp); lp.connect(g); g.connect(audioCtx.destination);
  src.start(now);
  // Sharp crack overtone
  const osc = audioCtx.createOscillator();
  const og = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(180, now);
  osc.frequency.exponentialRampToValueAtTime(30, now + 0.35);
  og.gain.setValueAtTime(0.7, now);
  og.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
  osc.connect(og); og.connect(audioCtx.destination);
  osc.start(now); osc.stop(now + 0.35);
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
//  AUDIO  (Web Audio API Ã¢â‚¬â€ no external files needed)
// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

/** Noise burst Ã¢â€ â€™ rifle gunshot */
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

/** Lighter pop Ã¢â€ â€™ pistol shot */
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

/** Metallic clang Ã¢â€ â€™ frying pan hit */
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

/** Dull clunk Ã¢â‚¬â€ magazine release / eject */
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

/** Hard metallic bang Ã¢â‚¬â€ mag/bolt slam home */
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

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
//  CANVAS TEXTURES
// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

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

/** Heavy wet squelch, bone crunch & gore splatter */
function playGoreHeadPopSound() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;

  // 1. Meaty low-end impact thud
  const len = Math.floor(audioCtx.sampleRate * 0.45);
  const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
  const dat = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    dat[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.4) * 0.95;
  }
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  const lp = audioCtx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.setValueAtTime(450, now);
  lp.frequency.exponentialRampToValueAtTime(80, now + 0.35);
  const g = audioCtx.createGain();
  g.gain.setValueAtTime(2.0, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
  src.connect(lp); lp.connect(g); g.connect(audioCtx.destination);
  src.start(now);

  // 2. Bone crunch / tear snap (sawtooth sweep)
  const osc = audioCtx.createOscillator();
  const og = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(340, now);
  osc.frequency.exponentialRampToValueAtTime(40, now + 0.22);
  og.gain.setValueAtTime(0.85, now);
  og.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
  osc.connect(og); og.connect(audioCtx.destination);
  osc.start(now); osc.stop(now + 0.22);

  // 3. Wet squirt / splash hiss
  const wLen = Math.floor(audioCtx.sampleRate * 0.38);
  const wBuf = audioCtx.createBuffer(1, wLen, audioCtx.sampleRate);
  const wDat = wBuf.getChannelData(0);
  for (let i = 0; i < wLen; i++) {
    wDat[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / wLen, 0.8) * 0.55;
  }
  const wSrc = audioCtx.createBufferSource();
  wSrc.buffer = wBuf;
  const bp = audioCtx.createBiquadFilter();
  bp.type = 'bandpass'; bp.frequency.value = 1100; bp.Q.value = 0.8;
  const wg = audioCtx.createGain();
  wg.gain.setValueAtTime(0.75, now + 0.04);
  wg.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
  wSrc.connect(bp); bp.connect(wg); wg.connect(audioCtx.destination);
  wSrc.start(now + 0.04);
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
//  LEVEL CREATION
// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
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

  // Ã¢â€â‚¬Ã¢â€â‚¬ Floor
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(HALF * 2, HALF * 2),
    floorMat
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  levelMeshes.push(floor);

  // Ã¢â€â‚¬Ã¢â€â‚¬ Ceiling (Removed so sky is visible)
  // const ceil = new THREE.Mesh(
  //   new THREE.PlaneGeometry(HALF * 2, HALF * 2),
  //   ceilMat
  // );
  // ceil.rotation.x = Math.PI / 2;
  // ceil.position.y = WALL_H;
  // scene.add(ceil);

  // Ã¢â€â‚¬Ã¢â€â‚¬ Sky Dome
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

  // Ã¢â€â‚¬Ã¢â€â‚¬ Helper: add solid box, register collidable & levelMeshes
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

  // Ã¢â€â‚¬Ã¢â€â‚¬ Outer boundary walls
  box(0, hw, -HALF, HALF * 2, WALL_H, 1);  // North
  box(0, hw, HALF, HALF * 2, WALL_H, 1);  // South
  box(-HALF, hw, 0, 1, WALL_H, HALF * 2); // West
  box(HALF, hw, 0, 1, WALL_H, HALF * 2); // East

  // Ã¢â€â‚¬Ã¢â€â‚¬ Central pillars
  box(0, 1.5, 0, 5, 3, 5, obstMat);
  box(-8, 1.5, 0, 1.5, 3, 1.5, obstMat);
  box(8, 1.5, 0, 1.5, 3, 1.5, obstMat);
  box(0, 1.5, -8, 1.5, 3, 1.5, obstMat);
  box(0, 1.5, 8, 1.5, 3, 1.5, obstMat);

  // Ã¢â€â‚¬Ã¢â€â‚¬ Long cover walls (cross-shaped layout)
  box(0, 1.25, -14, 10, 2.5, 1.5, obstMat);
  box(0, 1.25, 14, 10, 2.5, 1.5, obstMat);
  box(-14, 1.25, 0, 1.5, 2.5, 10, obstMat);
  box(14, 1.25, 0, 1.5, 2.5, 10, obstMat);

  // ─── Corner fortresses
  [[-24, -24], [24, -24], [-24, 24], [24, 24]].forEach(([cx, cz]) => {
    box(cx, 1.75, cz, 4.5, 3.5, 4.5, obstMat);
    box(cx + 3.5 * Math.sign(cx), 0.8, cz, 1.5, 1.6, 4.5, crateA);
    box(cx, 0.8, cz + 3.5 * Math.sign(cz), 4.5, 1.6, 1.5, crateA);
  });

  // ─── Mid-field crates / cover
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

  // Ã¢â€â‚¬Ã¢â€â‚¬ Lighting
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

  // Red accent Ã¢â‚¬â€ centre
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

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
//  WARFRONT Ã¢â‚¬â€ BATTLEFIELD MAP
// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
function createBattlefieldLevel() {
  const HALF = 38;
  const WALL_H = 5.5;

  // -- Dusty sandy floor texture
  function makeSandTexture() {
    const SIZE = 256;
    const c = document.createElement('canvas');
    c.width = SIZE; c.height = SIZE;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#c0a058';
    ctx.fillRect(0, 0, SIZE, SIZE);
    for (let i = 0; i < 5000; i++) {
      const x = Math.random() * SIZE, y = Math.random() * SIZE;
      const r = 1 + Math.random() * 5;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(190,160,90,0.3)' : 'rgba(90,60,20,0.22)';
      ctx.fill();
    }
    for (let i = 0; i < 18; i++) {
      const px = Math.random() * SIZE, py = Math.random() * SIZE;
      ctx.beginPath();
      ctx.ellipse(px, py, 18 + Math.random() * 40, 8 + Math.random() * 25, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(60,40,15,0.32)';
      ctx.fill();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(18, 18);
    return tex;
  }

  function makeConcreteTexture(rX, rY) {
    const c = document.createElement('canvas');
    c.width = 128; c.height = 128;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#80807a';
    ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 900; i++) {
      const x = Math.random() * 128, y = Math.random() * 128;
      ctx.fillStyle = `rgba(${Math.floor(Math.random() * 55 + 75)},${Math.floor(Math.random() * 55 + 75)},${Math.floor(Math.random() * 38 + 58)},0.38)`;
      ctx.fillRect(x, y, 1 + Math.random() * 6, 1 + Math.random() * 6);
    }
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * 128, Math.random() * 128);
      ctx.lineTo(Math.random() * 128, Math.random() * 128);
      ctx.strokeStyle = 'rgba(30,25,20,0.25)';
      ctx.lineWidth = 1 + Math.random();
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(rX || 1, rY || 1);
    return tex;
  }

  // -- Materials
  const floorMat = new THREE.MeshLambertMaterial({ map: makeSandTexture() });
  const concMat = new THREE.MeshLambertMaterial({ map: makeConcreteTexture(4, 2) });
  const concDarkMat = new THREE.MeshLambertMaterial({ map: makeConcreteTexture(3, 2), color: 0xaaaaaa });
  const sandBagMat = new THREE.MeshLambertMaterial({ color: 0x9b8050 });
  const metalMat = new THREE.MeshLambertMaterial({ color: 0x4a4a40 });
  function makeRustTexture() {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#4a3a24'; ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 8000; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#6b4424' : '#252010';
      ctx.fillRect(Math.random() * 256, Math.random() * 256, Math.random() * 3 + 1, Math.random() * 3 + 1);
    }
    for (let i = 0; i < 100; i++) {
      ctx.strokeStyle = '#121105';
      ctx.beginPath();
      ctx.moveTo(Math.random() * 256, Math.random() * 256);
      ctx.lineTo(Math.random() * 256, Math.random() * 256);
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  const rustTex = makeRustTexture();
  const rustMat = new THREE.MeshStandardMaterial({ map: rustTex, roughness: 0.9, metalness: 0.3 });
  const rust2Mat = new THREE.MeshStandardMaterial({ map: rustTex, roughness: 0.8, metalness: 0.5, color: 0x999999 });
  const rubbleMat = new THREE.MeshLambertMaterial({ color: 0x7a7060 });
  const wallMat = new THREE.MeshLambertMaterial({ map: makeConcreteTexture(8, 2) });
  const dirtMat = new THREE.MeshLambertMaterial({ color: 0x7a5a30 });
  const darkMetMat = new THREE.MeshLambertMaterial({ color: 0x2a2a26 });
  const oliveMat = new THREE.MeshLambertMaterial({ color: 0x4a5030 });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x111111, transparent: true, opacity: 0.8 });
  const headlightMat = new THREE.MeshLambertMaterial({ color: 0xffffee, emissive: 0xaaaa66 });
  const taillightMat = new THREE.MeshLambertMaterial({ color: 0xff2222, emissive: 0xaa0000 });

  // -- Helpers
  function box(x, y, z, w, h, d, mat) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat || concMat);
    m.position.set(x, y, z);
    m.castShadow = true; m.receiveShadow = true;
    scene.add(m);
    collidables.push(new THREE.Box3().setFromObject(m));
    levelMeshes.push(m);
    return m;
  }
  function deco(geo, mat, x, y, z, rx, ry, rz) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    if (rx) m.rotation.x = rx;
    if (ry) m.rotation.y = ry;
    if (rz) m.rotation.z = rz;
    m.castShadow = true; m.receiveShadow = true;
    scene.add(m); levelMeshes.push(m);
    return m;
  }

  // -- Floor
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2, HALF * 2), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor); levelMeshes.push(floor);

  // -- Bomb crater patches -- asymmetric positions
  const craterMat = new THREE.MeshLambertMaterial({ color: 0x3e2a0a });
  [
    [3, -7, 3.2], [-17, 9, 2.8], [22, -14, 3.8], [-6, -26, 3.0],
    [14, 21, 2.5], [-28, -4, 4.0], [30, 16, 3.5], [-12, 18, 2.2]
  ].forEach(([cx, cz, r]) => {
    deco(new THREE.CylinderGeometry(r, r + 0.4, 0.1, 14), craterMat, cx, 0.01, cz, 0, 0, 0);
    deco(new THREE.TorusGeometry(r + 0.3, 0.22, 4, 14), dirtMat, cx, 0.12, cz, Math.PI / 2, 0, 0);
  });

  // -- Warfront sky dome
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 1024; skyCanvas.height = 1024;
  const skyCtx = skyCanvas.getContext('2d');
  const skyGrad = skyCtx.createLinearGradient(0, 0, 0, skyCanvas.height);
  skyGrad.addColorStop(0, '#402810');
  skyGrad.addColorStop(0.3, '#b86e2a');
  skyGrad.addColorStop(0.6, '#cc9850');
  skyGrad.addColorStop(1, '#ddb870');
  skyCtx.fillStyle = skyGrad;
  skyCtx.fillRect(0, 0, skyCanvas.width, skyCanvas.height);
  const sgr = skyCtx.createRadialGradient(skyCanvas.width * 0.6, skyCanvas.height * 0.3, 0, skyCanvas.width * 0.6, skyCanvas.height * 0.3, 110);
  sgr.addColorStop(0, 'rgba(255,210,110,0.9)');
  sgr.addColorStop(0.45, 'rgba(255,170,70,0.45)');
  sgr.addColorStop(1, 'rgba(255,140,40,0)');
  skyCtx.fillStyle = sgr; skyCtx.fillRect(0, 0, skyCanvas.width, skyCanvas.height);
  for (let i = 0; i < 100; i++) {
    skyCtx.beginPath();
    skyCtx.arc(Math.random() * skyCanvas.width, Math.random() * skyCanvas.height * 0.8,
      35 + Math.random() * 120, 0, Math.PI * 2);
    skyCtx.fillStyle = `rgba(45,28,10,${0.03 + Math.random() * 0.13})`;
    skyCtx.fill();
  }
  const skyTex = new THREE.CanvasTexture(skyCanvas);
  const skyMesh = new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16),
    new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false }));
  scene.add(skyMesh); levelMeshes.push(skyMesh);

  // -- Outer boundary walls
  const hw = WALL_H / 2;
  box(0, hw, -HALF, HALF * 2, WALL_H, 1, wallMat);
  box(0, hw, HALF, HALF * 2, WALL_H, 1, wallMat);
  box(-HALF, hw, 0, 1, WALL_H, HALF * 2, wallMat);
  box(HALF, hw, 0, 1, WALL_H, HALF * 2, wallMat);

  // =====================================================
  //  ENTERABLE RUINED BUILDINGS
  //  Three solid walls + a doorway gap so the player
  //  can actually walk inside.
  // =====================================================
  function ruinedBuilding(cx, cz, W, D, WH, doorSide, rotY) {
    const wt = 0.85;
    const doorW = 1.9;
    const doorH = 2.3;

    function wallPart(wx, wy, wz, ww, wh, wd, mat) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(ww, wh, wd), mat || concMat);
      const cos = Math.cos(rotY), sin = Math.sin(rotY);
      m.position.set(cx + wx * cos - wz * sin, wy, cz + wx * sin + wz * cos);
      m.rotation.y = rotY;
      m.castShadow = true; m.receiveShadow = true;
      scene.add(m);
      collidables.push(new THREE.Box3().setFromObject(m));
      levelMeshes.push(m);
    }

    // Floor slab
    wallPart(0, 0.06, 0, W, 0.12, D, dirtMat);

    function addWall(side) {
      const hasDoor = (side === doorSide);
      if (side === 'north' || side === 'south') {
        const zOff = side === 'north' ? -D / 2 : D / 2;
        if (!hasDoor) {
          wallPart(0, WH / 2, zOff, W, WH, wt, concMat);
        } else {
          const sideW = (W - doorW) / 2;
          wallPart(-(doorW / 2 + sideW / 2), WH / 2, zOff, sideW, WH, wt, concMat);
          wallPart((doorW / 2 + sideW / 2), WH / 2, zOff, sideW, WH, wt, concMat);
          wallPart(0, doorH + (WH - doorH) / 2, zOff, doorW, WH - doorH, wt, concMat);
        }
      } else {
        const xOff = side === 'west' ? -W / 2 : W / 2;
        if (!hasDoor) {
          wallPart(xOff, WH / 2, 0, wt, WH, D, concMat);
        } else {
          const sideD = (D - doorW) / 2;
          wallPart(xOff, WH / 2, -(doorW / 2 + sideD / 2), wt, WH, sideD, concMat);
          wallPart(xOff, WH / 2, (doorW / 2 + sideD / 2), wt, WH, sideD, concMat);
          wallPart(xOff, doorH + (WH - doorH) / 2, 0, wt, WH - doorH, doorW, concMat);
        }
      }
    }
    addWall('north'); addWall('south'); addWall('west'); addWall('east');

    // Broken interior divider wall
    const divX = (Math.random() - 0.5) * (W * 0.4);
    const divH = WH * (0.4 + Math.random() * 0.4);
    wallPart(divX, divH / 2, 0, wt, divH, D * 0.55, concDarkMat);

    // Interior rubble
    for (let rb = 0; rb < 5; rb++) {
      const rx = (Math.random() - 0.5) * (W - 2);
      const rz = (Math.random() - 0.5) * (D - 2);
      const rh = 0.25 + Math.random() * 0.9;
      const cos = Math.cos(rotY), sin = Math.sin(rotY);
      box(cx + rx * cos - rz * sin, rh / 2, cz + rx * sin + rz * cos,
        0.5 + Math.random(), rh, 0.5 + Math.random(), rubbleMat);
    }

    // Partial collapsed roof slab (visual only)
    const slab = new THREE.Mesh(new THREE.BoxGeometry(W * 0.55, 0.22, D * 0.45), concDarkMat);
    const cos = Math.cos(rotY), sin = Math.sin(rotY);
    const sOX = (Math.random() - 0.5) * 2, sOZ = (Math.random() - 0.5) * 2;
    slab.position.set(cx + sOX * cos - sOZ * sin, WH - 0.3 + Math.random() * 0.9,
      cz + sOX * sin + sOZ * cos);
    slab.rotation.set(0.12 + Math.random() * 0.22, rotY + Math.random() * 0.3, 0.08 + Math.random() * 0.18);
    slab.castShadow = true; slab.receiveShadow = true;
    scene.add(slab); levelMeshes.push(slab);
  }

  // Asymmetric building placement
  ruinedBuilding(-24, -23, 11, 9, 5.2, 'east', 0.15);
  ruinedBuilding(27, -24, 9, 12, 4.8, 'south', -0.08);
  ruinedBuilding(-25, 26, 14, 8, 5.6, 'north', 0.22);
  ruinedBuilding(23, 25, 8, 10, 5.0, 'west', -0.18);
  ruinedBuilding(-10, 5, 7, 5, 4.0, 'south', 0.05);
  ruinedBuilding(15, -8, 6, 7, 3.8, 'east', -0.12);

  // =====================================================
  //  SANDBAG CLUSTERS -- organic scatter, not cross pattern
  // =====================================================
  function sandbagCluster(cx, cz, count, spread) {
    for (let i = 0; i < count; i++) {
      const ox = (Math.random() - 0.5) * spread;
      const oz = (Math.random() - 0.5) * spread;
      const ry = Math.random() * Math.PI;
      const m = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.68, 0.52), sandBagMat);
      m.position.set(cx + ox, 0.34, cz + oz);
      m.rotation.y = ry;
      m.castShadow = true; m.receiveShadow = true;
      scene.add(m); collidables.push(new THREE.Box3().setFromObject(m)); levelMeshes.push(m);
      if (Math.random() > 0.4) {
        const m2 = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.68, 0.52), sandBagMat);
        m2.position.set(cx + ox + (Math.random() - 0.5) * 0.6, 0.98,
          cz + oz + (Math.random() - 0.5) * 0.6);
        m2.rotation.y = ry + (Math.random() - 0.5) * 0.5;
        m2.castShadow = true; m2.receiveShadow = true;
        scene.add(m2); collidables.push(new THREE.Box3().setFromObject(m2)); levelMeshes.push(m2);
      }
    }
  }
  sandbagCluster(2, -14, 8, 5.5);
  sandbagCluster(-4, 14, 6, 4.0);
  sandbagCluster(-14, -2, 7, 4.5);
  sandbagCluster(16, 3, 5, 3.5);
  sandbagCluster(-20, -14, 6, 4.0);
  sandbagCluster(18, 17, 7, 5.0);
  sandbagCluster(-8, 24, 5, 3.5);
  sandbagCluster(10, -22, 6, 4.5);
  sandbagCluster(-30, 8, 4, 3.0);
  sandbagCluster(28, -10, 5, 3.5);
  // Tight, multi-segment vehicle collider generator (avoids oversized empty-air AABB on rotated meshes)
  function addTightVehicleColliders(cx, cz, rotY, segments) {
    vehicleColliders.push({ cx, cz, rotY, segments });
  }

  // JEEP
  function spawnJeep(x, z, rotY, tipped) {
    const bRoll = tipped ? Math.PI / 2 + (Math.random() - 0.5) * 0.35 : 0;
    const yOff = tipped ? 1.0 : 0;

    const group = new THREE.Group();

    // Body (Main Chassis)
    const body = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.8, 1.6), rustMat);
    body.position.set(0, 0.4, 0);
    body.castShadow = true; body.receiveShadow = true;
    group.add(body);

    // Engine block / Hood
    const hood = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 1.5), rust2Mat);
    hood.position.set(1.0, 0.9, 0);
    hood.rotation.z = (Math.random() > 0.5) ? 0.35 : 0; // popped hood
    hood.castShadow = true; hood.receiveShadow = true;
    group.add(hood);

    // Grille
    const grille = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 1.3), darkMetMat);
    grille.position.set(1.65, 0.9, 0);
    group.add(grille);

    // Headlights (Emissive)
    [-0.5, 0.5].forEach(zOff => {
      if (Math.random() > 0.7) return; // missing headlight
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.15, 0.2), headlightMat);
      hl.position.set(1.68, 0.95, zOff);
      group.add(hl);
    });

    // Cab base (where seats go)
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.3, 1.5), rust2Mat);
    cab.position.set(-0.4, 0.95, 0);
    cab.castShadow = true;
    group.add(cab);

    // Windshield frame & Glass
    const wsFrame = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.7, 1.5), darkMetMat);
    wsFrame.position.set(0.4, 1.4, 0);
    wsFrame.rotation.z = 0.2; // tilted back
    group.add(wsFrame);

    if (Math.random() < 0.6) { // sometimes windshield is smashed/missing
      const wsGlass = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.6, 1.4), glassMat);
      wsGlass.position.set(0.4, 1.4, 0);
      wsGlass.rotation.z = 0.2;
      group.add(wsGlass);
    }

    // Seats
    [-0.35, 0.35].forEach(zOff => {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.5), darkMetMat);
      seat.position.set(-0.5, 1.2, zOff);
      seat.rotation.z = -0.1;
      group.add(seat);
    });

    // Steering wheel
    const swPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 4), darkMetMat);
    swPipe.position.set(0.1, 1.1, 0.35);
    swPipe.rotation.z = 0.6;
    group.add(swPipe);
    const swRing = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.02, 4, 12), darkMetMat);
    swRing.position.set(0.25, 1.2, 0.35);
    swRing.rotation.y = Math.PI / 2;
    swRing.rotation.x = -0.3;
    group.add(swRing);

    // Wheels (4) - 24 segments for smoothness + inner hubs
    const wPL = [[-1.1, -0.95], [1.1, -0.95], [-1.1, 0.95], [1.1, 0.95]];
    wPL.forEach(([wlx, wlz]) => {
      if (Math.random() > 0.85) return; // Sometimes missing a wheel completely
      const wGroup = new THREE.Group();
      wGroup.position.set(wlx, 0.35, wlz);
      wGroup.rotation.x = Math.PI / 2;
      wGroup.rotation.y = (Math.random() - 0.5) * 0.45; // bent/wobbly axle

      const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.25, 24), darkMetMat);
      wGroup.add(tire);

      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.28, 12), rustMat);
      wGroup.add(hub);

      group.add(wGroup);
    });

    // Apply group transforms
    group.position.set(x, yOff, z);
    group.rotation.set(bRoll, rotY, 0);
    scene.add(group);
    levelMeshes.push(group);

    // Tight multi-segment colliders (no giant ghost boxes)
    if (tipped) {
      addTightVehicleColliders(x, z, rotY, [
        { lx: 1.0, w: 1.1, h: 1.6, d: 1.5, y: 0.8 },
        { lx: -0.1, w: 1.1, h: 1.6, d: 1.5, y: 0.8 },
        { lx: -1.1, w: 1.1, h: 1.6, d: 1.5, y: 0.8 }
      ]);
    } else {
      addTightVehicleColliders(x, z, rotY, [
        { lx: 1.0, w: 1.1, h: 1.3, d: 1.5, y: 0.65 },
        { lx: -0.1, w: 1.1, h: 1.7, d: 1.5, y: 0.85 },
        { lx: -1.1, w: 1.1, h: 1.2, d: 1.5, y: 0.60 }
      ]);
    }
  }

  // APC
  function spawnAPC(x, z, rotY) {
    const group = new THREE.Group();

    // Main hull (angled front/back)
    const hullShape = new THREE.Shape();
    hullShape.moveTo(-2.5, 0);
    hullShape.lineTo(2.2, 0);
    hullShape.lineTo(2.5, 0.8);
    hullShape.lineTo(2.0, 1.6);
    hullShape.lineTo(-2.2, 1.6);
    hullShape.lineTo(-2.5, 0);

    const extrudeSettings = { depth: 2.8, bevelEnabled: false };
    const hullGeo = new THREE.ExtrudeGeometry(hullShape, extrudeSettings);
    // Center the extruded geometry
    hullGeo.translate(0, 0, -1.4);

    const hull = new THREE.Mesh(hullGeo, oliveMat);
    hull.position.set(0, 0.4, 0);
    hull.castShadow = true; hull.receiveShadow = true;
    group.add(hull);

    // Track skirts
    [-1.5, 1.5].forEach(zOff => {
      const skirt = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.0, 0.2), darkMetMat);
      skirt.position.set(0, 0.8, zOff);
      skirt.rotation.x = (Math.random() - 0.5) * 0.15; // bent skirt
      group.add(skirt);
    });

    // Tracks (visible below skirts)
    [[-1.8, -1.3], [0, -1.3], [1.8, -1.3], [-1.8, 1.3], [0, 1.3], [1.8, 1.3]].forEach(([tx, tz]) => {
      const track = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.35, 0.4), darkMetMat);
      track.position.set(tx, 0.18, tz);
      group.add(track);
    });

    // Turret base
    const turretBase = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, 0.4, 16), rustMat);
    turretBase.position.set(0.5, 2.2, 0);
    group.add(turretBase);

    // Turret box
    const turret = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.8, 1.5), oliveMat);
    turret.position.set(0.5, 2.7, 0);
    turret.rotation.y = 0.3;
    turret.castShadow = true;
    group.add(turret);

    // Viewports (Glass)
    const viewport = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.2, 0.2), glassMat);
    viewport.position.set(0.5, 2.7, 0.7);
    viewport.rotation.y = 0.3;
    group.add(viewport);

    // Gun barrel & mantlet
    const mantlet = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), darkMetMat);
    mantlet.position.set(1.4, 2.7, 0.3);
    mantlet.rotation.y = 0.3;
    group.add(mantlet);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 1.8, 8), darkMetMat);
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(2.3, 2.7, 0.55);
    barrel.rotation.y = 0.3;
    barrel.rotation.z += Math.random() * 0.4; // gun droop
    group.add(barrel);

    // Antenna
    if (Math.random() > 0.3) {
      const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.4, 4), metalMat);
      ant.position.set(-1.0, 3.2, -0.8);
      ant.rotation.x = (Math.random() - 0.5) * 1.5; // bent antenna
      group.add(ant);
    }

    // Apply group transforms
    group.position.set(x, 0, z);
    group.rotation.set(0, rotY, 0);
    scene.add(group);
    levelMeshes.push(group);

    // Tight multi-segment APC colliders
    addTightVehicleColliders(x, z, rotY, [
      { lx: 1.8, w: 1.2, h: 1.8, d: 2.5, y: 0.9 },
      { lx: 0.6, w: 1.2, h: 2.5, d: 2.5, y: 1.25 },
      { lx: -0.6, w: 1.2, h: 1.9, d: 2.5, y: 0.95 },
      { lx: -1.8, w: 1.2, h: 1.9, d: 2.5, y: 0.95 }
    ]);
  }

  // TRUCK
  function spawnTruck(x, z, rotY, withCargo) {
    const group = new THREE.Group();

    // Chassis frame
    const frame = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.3, 1.2), rustMat);
    frame.position.set(0, 0.7, 0);
    group.add(frame);

    // Cab
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.8, 2.2), rust2Mat);
    cab.position.set(2.2, 1.7, 0);
    cab.castShadow = true; cab.receiveShadow = true;
    group.add(cab);

    // Cab Windows (Glass)
    if (Math.random() > 0.4) {
      const wFront = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.7, 1.9), glassMat);
      wFront.position.set(3.22, 2.0, 0);
      group.add(wFront);
    }

    const wSide1 = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.7, 0.1), glassMat);
    wSide1.position.set(2.4, 2.0, 1.12);
    group.add(wSide1);

    const wSide2 = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.7, 0.1), glassMat);
    wSide2.position.set(2.4, 2.0, -1.12);
    group.add(wSide2);

    // Engine hood 
    const hood = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.0, 2.2), rust2Mat);
    hood.position.set(3.8, 1.3, 0);
    hood.rotation.z = (Math.random() > 0.5) ? 0.3 : 0;
    group.add(hood);

    // Grille & Headlights
    const grille = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 1.6), darkMetMat);
    grille.position.set(4.42, 1.3, 0);
    group.add(grille);

    [-0.8, 0.8].forEach(zOff => {
      if (Math.random() > 0.8) return;
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.2), headlightMat);
      hl.position.set(4.42, 1.4, zOff);
      group.add(hl);
    });

    // Front Bumper
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 2.4), darkMetMat);
    bumper.position.set(4.5, 0.8, 0);
    bumper.rotation.x = (Math.random() - 0.5) * 0.6;
    bumper.rotation.z = (Math.random() - 0.5) * 0.3;
    group.add(bumper);

    // Exhaust pipe
    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.5, 8), rustMat);
    exhaust.position.set(1.1, 2.0, 1.2);
    exhaust.rotation.x = (Math.random() - 0.5) * 0.4;
    group.add(exhaust);

    // Flatbed
    const bed = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.25, 2.4), rustMat);
    bed.position.set(-1.0, 1.0, 0);
    bed.castShadow = true; bed.receiveShadow = true;
    group.add(bed);

    // Wheels (6)
    [[-2.5, -1.1], [-1.0, -1.1], [2.6, -1.1], [-2.5, 1.1], [-1.0, 1.1], [2.6, 1.1]].forEach(([wx, wz]) => {
      if (Math.random() > 0.9) return;
      const wGroup = new THREE.Group();
      wGroup.position.set(wx, 0.5, wz);
      wGroup.rotation.x = Math.PI / 2;
      wGroup.rotation.y = (Math.random() - 0.5) * 0.35;

      const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.3, 24), darkMetMat);
      wGroup.add(tire);

      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.32, 12), rustMat);
      wGroup.add(hub);

      group.add(wGroup);
    });

    // Optional cargo crates on flatbed
    if (withCargo) {
      for (let cr = 0; cr < 3; cr++) {
        const crate = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), oliveMat);
        crate.position.set(-2.5 + cr * 1.4, 1.7, (Math.random() - 0.5) * 0.4);
        crate.rotation.y = (Math.random() - 0.5) * 0.5;
        crate.rotation.x = (Math.random() - 0.5) * 0.2;
        crate.castShadow = true; crate.receiveShadow = true;
        group.add(crate);
      }
    }

    // Apply group transforms
    group.position.set(x, 0, z);
    group.rotation.set(0, rotY, 0);
    scene.add(group);
    levelMeshes.push(group);

    // Tight multi-segment Truck colliders
    addTightVehicleColliders(x, z, rotY, [
      { lx: 3.5, w: 1.4, h: 1.8, d: 2.1, y: 0.9 },
      { lx: 2.1, w: 1.4, h: 2.5, d: 2.1, y: 1.25 },
      { lx: 0.7, w: 1.4, h: 2.0, d: 2.1, y: 1.0 },
      { lx: -0.7, w: 1.4, h: 2.0, d: 2.1, y: 1.0 },
      { lx: -2.1, w: 1.4, h: 2.0, d: 2.1, y: 1.0 }
    ]);
  }

  // TANK HULK
  function spawnTankHulk(x, z, rotY) {
    const group = new THREE.Group();

    // Hull
    const hull = new THREE.Mesh(new THREE.BoxGeometry(6.0, 1.2, 3.2), darkMetMat);
    hull.position.set(0, 0.8, 0);
    hull.castShadow = true; hull.receiveShadow = true;
    group.add(hull);

    // Angled front glacis
    const glacisShape = new THREE.Shape();
    glacisShape.moveTo(0, 0);
    glacisShape.lineTo(1.5, 0);
    glacisShape.lineTo(0, 1.2);
    glacisShape.lineTo(0, 0);
    const glacisGeo = new THREE.ExtrudeGeometry(glacisShape, { depth: 3.2, bevelEnabled: false });
    glacisGeo.translate(0, 0, -1.6);
    const glacis = new THREE.Mesh(glacisGeo, darkMetMat);
    glacis.position.set(3.0, 0.2, 0);
    group.add(glacis);

    // Engine deck details (Rear)
    const vents = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.2, 2.5), rust2Mat);
    vents.position.set(-2.0, 1.4, 0);
    group.add(vents);

    const turY = (Math.random() - 0.5) * 1.2;

    // Turret Group
    const tGroup = new THREE.Group();
    tGroup.position.set(0.5, 1.4, 0);
    tGroup.rotation.y = turY;

    const turret = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 0.9, 16), oliveMat);
    turret.position.set(0, 0.45, 0);
    turret.castShadow = true;
    tGroup.add(turret);

    // Commander's Cupola
    const cupola = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.3, 12), rustMat);
    cupola.position.set(-0.5, 1.0, -0.5);
    cupola.rotation.z = (Math.random() > 0.5) ? 0.45 : 0;
    tGroup.add(cupola);

    // Main Gun Barrel
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 4.0, 12), darkMetMat);
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(3.5, 0.5, 0);
    barrel.rotation.z += Math.random() * 0.3;
    tGroup.add(barrel);

    // Muzzle brake
    const brake = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.4, 12), darkMetMat);
    brake.rotation.z = Math.PI / 2;
    brake.position.set(5.5, 0.5, 0);
    brake.rotation.z += (Math.random() - 0.5) * 0.2;
    tGroup.add(brake);

    group.add(tGroup);
    // Track skirts
    [-1.7, 1.7].forEach(zOff => {
      const skirt = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.8, 0.2), rust2Mat);
      skirt.position.set(0, 0.6, zOff);
      skirt.rotation.x = (Math.random() - 0.5) * 0.2; // bent skirt
      group.add(skirt);
    });

    // Blown off track section (cosmetic chaos)
    const blownTrack = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.15, 0.6), darkMetMat);
    blownTrack.position.set(3.5 + (Math.random() - 0.5), 0.12, 2.5 + (Math.random() - 0.5));
    blownTrack.rotation.set(0.1, 0.5 + Math.random(), 0.15);
    group.add(blownTrack);

    // Apply group transforms
    group.position.set(x, 0, z);
    group.rotation.set(0, rotY, 0);
    scene.add(group);
    levelMeshes.push(group);

    // Tight multi-segment Tank colliders
    addTightVehicleColliders(x, z, rotY, [
      { lx: 2.4, w: 1.3, h: 1.6, d: 3.1, y: 0.8 },
      { lx: 1.2, w: 1.3, h: 2.4, d: 3.1, y: 1.2 },
      { lx: 0.0, w: 1.3, h: 2.4, d: 3.1, y: 1.2 },
      { lx: -1.2, w: 1.3, h: 1.8, d: 3.1, y: 0.9 },
      { lx: -2.4, w: 1.3, h: 1.8, d: 3.1, y: 0.9 }
    ]);
  }

  // Asymmetric vehicle placement
  spawnJeep(-19, 17, 0.4, true);
  spawnJeep(12, -20, 2.1, false);
  spawnAPC(- 6, -15, 1.8);
  spawnAPC(22, 9, 3.5);
  spawnTruck(-28, -6, 0.9, true);
  spawnTruck(15, 25, 2.6, false);
  spawnTankHulk(-14, 18, 0.6);
  spawnTankHulk(26, -20, 2.2);

  // =====================================================
  //  FENCE LINES -- with fixed, solid tight hitboxes
  // =====================================================
  function fenceLine(x, z, len, axis, broken) {
    const posts = Math.ceil(len / 2.8);
    for (let i = 0; i < posts; i++) {
      const isGap = broken && i === Math.floor(posts / 2);
      const ox = axis === 'x' ? (i - posts / 2 + 0.5) * 2.8 : 0;
      const oz = axis === 'z' ? (i - posts / 2 + 0.5) * 2.8 : 0;

      // Post (with exact tight collision)
      if (!isGap) {
        box(x + ox, 0.85, z + oz, 0.14, 1.7, 0.14, metalMat);
      }

      // Horizontal rails & solid tight collision across each span
      if (i < posts - 1) {
        const spanIsGap = broken && (i === Math.floor(posts / 2) || i + 1 === Math.floor(posts / 2));
        const bLen = 2.82;
        const bx = x + ox + (axis === 'x' ? bLen / 2 : 0);
        const bz = z + oz + (axis === 'z' ? bLen / 2 : 0);

        if (!spanIsGap) {
          // Visual rails
          const rail1 = new THREE.Mesh(new THREE.BoxGeometry(axis === 'x' ? bLen : 0.08, 0.08, axis === 'z' ? bLen : 0.08), metalMat);
          rail1.position.set(bx, 1.30, bz);
          scene.add(rail1); levelMeshes.push(rail1);

          const rail2 = new THREE.Mesh(new THREE.BoxGeometry(axis === 'x' ? bLen : 0.08, 0.08, axis === 'z' ? bLen : 0.08), metalMat);
          rail2.position.set(bx, 0.65, bz);
          scene.add(rail2); levelMeshes.push(rail2);

          // Chain link / wire mesh visual
          const wireMat = new THREE.MeshLambertMaterial({ color: 0x333333, transparent: true, opacity: 0.7 });
          const wireMesh = new THREE.Mesh(new THREE.BoxGeometry(axis === 'x' ? bLen : 0.03, 1.35, axis === 'z' ? bLen : 0.03), wireMat);
          wireMesh.position.set(bx, 0.85, bz);
          scene.add(wireMesh); levelMeshes.push(wireMesh);

          // Single continuous, tight solid collider box (0 to 1.7m high, 0.16m thick)
          const fBox = new THREE.Box3(
            new THREE.Vector3(
              bx - (axis === 'x' ? bLen / 2 : 0.08),
              0,
              bz - (axis === 'z' ? bLen / 2 : 0.08)
            ),
            new THREE.Vector3(
              bx + (axis === 'x' ? bLen / 2 : 0.08),
              1.7,
              bz + (axis === 'z' ? bLen / 2 : 0.08)
            )
          );
          collidables.push(fBox);
        }
      }
    }
  }
  fenceLine(-31, -12, 15, 'z', true);
  fenceLine(30, 8, 12, 'z', false);
  fenceLine(-12, -33, 14, 'x', true);
  fenceLine(8, 31, 10, 'x', false);
  fenceLine(0, -9, 8, 'x', true);
  fenceLine(-18, 0, 8, 'z', false);

  // -- Rubble piles (organic positions)
  const rubblePositions = [
    [-14, 8, 5], [17, -4, 4], [-19, -9, 6], [9, 16, 4],
    [-28, 14, 5], [31, -14, 4], [-7, 30, 5], [5, -30, 4],
    [0, -17, 5], [-2, 19, 4], [-23, 3, 6], [24, -2, 4],
    [13, 10, 3], [-11, -14, 4],
  ];
  rubblePositions.forEach(([rx, rz, spread]) => {
    const pieces = 3 + Math.floor(Math.random() * 5);
    for (let p = 0; p < pieces; p++) {
      const px = rx + (Math.random() - 0.5) * spread;
      const pz = rz + (Math.random() - 0.5) * spread;
      const ph = 0.25 + Math.random() * 1.2;
      box(px, ph / 2, pz, 0.4 + Math.random() * 1.3, ph, 0.4 + Math.random() * 1.3, rubbleMat);
    }
  });

  // -- Central bombed-out watchtower (off-centre for asymmetry)
  box(3, 4.0, -2, 2.5, 8.0, 2.5, concMat);
  box(3, 7.1, -2, 5.0, 0.3, 4.5, metalMat);
  box(3, 4.5, -2, 4.0, 0.22, 3.8, metalMat);
  box(3, 0.3, -2, 4.5, 0.6, 4.5, concMat);
  const fallenWall = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.3, 2.0), concMat);
  fallenWall.position.set(6, 0.15, -4);
  fallenWall.rotation.set(0, 0.35, 0.1);
  fallenWall.castShadow = true; fallenWall.receiveShadow = true;
  scene.add(fallenWall);
  collidables.push(new THREE.Box3().setFromObject(fallenWall));
  levelMeshes.push(fallenWall);

  // -- Lighting
  const ambLight = new THREE.AmbientLight(0xb89060, 2.2);
  scene.add(ambLight); levelMeshes.push(ambLight);
  const dir = new THREE.DirectionalLight(0xd4a060, 2.0);
  dir.position.set(-18, 16, 10);
  dir.castShadow = true;
  dir.shadow.mapSize.width = 2048; dir.shadow.mapSize.height = 2048;
  dir.shadow.camera.near = 0.1; dir.shadow.camera.far = 90;
  dir.shadow.camera.left = -60; dir.shadow.camera.right = 60;
  dir.shadow.camera.top = 60; dir.shadow.camera.bottom = -60;
  scene.add(dir); levelMeshes.push(dir);
  addPointLight(3, 5, -2, 0xff4400, 3.8, 30);
  addPointLight(-6, 3, -15, 0xff5500, 2.5, 20);
  addPointLight(22, 2, 9, 0xff6600, 2.2, 18);
  addPointLight(-14, 2, 18, 0xff4800, 2.8, 22);
  addPointLight(-28, 2, -6, 0xff5a00, 1.8, 16);
  addPointLight(-32, 5, 0, 0xc07828, 1.2, 24);
  addPointLight(32, 5, 0, 0xc07828, 1.2, 24);
  addPointLight(0, 4, 32, 0xb86828, 1.0, 20);
}


// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  WAVE 10 BOSS ARENA (BLANK GROUND WITH 3 HIDING BUNKERS & SNIPER CORNER TOWER)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function createBossArena(mapId) {
  const HALF = 38;
  const WALL_H = 6.0;

  // Atmospheric tense combat lighting and fog
  scene.background = new THREE.Color(0x18050a);
  scene.fog = new THREE.FogExp2(0x220810, 0.012);

  const floorMat = mapId === 'warfront'
    ? new THREE.MeshLambertMaterial({ color: 0x8a6035, map: makeGridTexture('#805525', '#553515') })
    : new THREE.MeshLambertMaterial({ color: 0x303040, map: makeGridTexture('#404055', '#252535') });

  const wallMat = new THREE.MeshLambertMaterial({
    map: makeBrickTexture(76, 4)
  });
  const concMat = new THREE.MeshLambertMaterial({ color: 0x484d52 });
  const darkMetal = new THREE.MeshLambertMaterial({ color: 0x22252a });
  const rustMat = new THREE.MeshLambertMaterial({ color: 0x5a3320 });

  function box(x, y, z, w, h, d, mat) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
    levelMeshes.push(m);
    collidables.push(new THREE.Box3().setFromObject(m));
    return m;
  }

  // 1. Blank, Open Arena Floor
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2, HALF * 2), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  levelMeshes.push(floor);

  // 2. Outer Boundary Walls
  box(0, WALL_H / 2, -HALF, HALF * 2, WALL_H, 1, wallMat);
  box(0, WALL_H / 2, HALF, HALF * 2, WALL_H, 1, wallMat);
  box(-HALF, WALL_H / 2, 0, 1, WALL_H, HALF * 2, wallMat);
  box(HALF, WALL_H / 2, 0, 1, WALL_H, HALF * 2, wallMat);

  // 3. High Ground: Open Elevated Sniper Watchtower Nest in Far Corner (X: 28, Z: -28)
  const tx = 28, tz = -28;
  // Main concrete tower pillar base (only this ground base is collidable to prevent walking through)
  box(tx, 2.0, tz, 4.8, 4.0, 4.8, concMat);

  // Helper: purely visual architectural meshes (NOT added to collidables so they NEVER block player shots at boss)
  function decoBox(x, y, z, w, h, d, mat) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
    levelMeshes.push(m);
    return m;
  }

  // High floor platform at Y = 4.15 (surface at Y = 4.25)
  decoBox(tx, 4.15, tz, 6.4, 0.25, 6.4, darkMetal);

  // 4 corner industrial steel support columns (Y = 4.25 to 6.85, height 2.6)
  decoBox(tx - 2.8, 5.55, tz - 2.8, 0.16, 2.6, 0.16, darkMetal);
  decoBox(tx + 2.8, 5.55, tz - 2.8, 0.16, 2.6, 0.16, darkMetal);
  decoBox(tx + 2.8, 5.55, tz + 2.8, 0.16, 2.6, 0.16, darkMetal);
  decoBox(tx - 2.8, 5.55, tz + 2.8, 0.16, 2.6, 0.16, darkMetal);

  // Overhead protective steel watchtower roof canopy
  decoBox(tx, 6.95, tz, 6.8, 0.2, 6.8, darkMetal);

  // Red beacon light fixture on top of roof canopy
  decoBox(tx, 7.22, tz, 0.5, 0.35, 0.5, rustMat);

  // Open rear safety railings (Northeast outer map walls)
  decoBox(tx, 4.65, tz - 3.0, 6.0, 0.6, 0.08, darkMetal);
  decoBox(tx + 3.0, 4.65, tz, 0.08, 0.6, 6.0, darkMetal);

  // Low sandbag sniper mount at forward Southwest corner overlooking arena
  // Height only 0.42m above floor so the Boss upper body, rifle & head are 100% visible!
  decoBox(tx - 1.4, 4.46, tz + 2.8, 3.2, 0.42, 0.55, rustMat);
  decoBox(tx - 2.8, 4.46, tz - 1.4, 0.55, 0.42, 3.2, rustMat);

  // 4. EXACTLY 3 STRATEGIC HIDING SPOTS (Full-Cover Reinforced Concrete Bunkers)
  // ── Hiding Spot 1: Left Heavy Bunker ──
  const b1x = -15, b1z = -5;
  box(b1x, 1.4, b1z, 5.8, 2.8, 1.4, concMat); // Front barrier
  box(b1x - 2.5, 1.4, b1z + 1.8, 1.4, 2.8, 4.2, concMat); // Side wing
  box(b1x + 0.6, 0.4, b1z + 1.2, 3.6, 0.8, 0.8, rustMat); // Sandbag base

  // ── Hiding Spot 2: Center Reinforced Defense Wall ──
  const b2x = 0, b2z = 7;
  box(b2x, 1.4, b2z, 7.2, 2.8, 1.6, concMat); // Central main barrier
  box(b2x - 3.2, 1.4, b2z - 1.6, 1.4, 2.8, 3.8, concMat); // Left return wing
  box(b2x + 3.2, 1.4, b2z - 1.6, 1.4, 2.8, 3.8, concMat); // Right return wing
  box(b2x, 0.45, b2z - 1.2, 4.5, 0.9, 0.9, rustMat); // Sandbags

  // ── Hiding Spot 3: Right Heavy Bunker ──
  const b3x = 16, b3z = 2;
  box(b3x, 1.4, b3z, 5.8, 2.8, 1.4, concMat); // Front barrier
  box(b3x + 2.5, 1.4, b3z - 1.8, 1.4, 2.8, 4.2, concMat); // Side wing
  box(b3x - 0.6, 0.4, b3z - 1.2, 3.6, 0.8, 0.8, rustMat); // Sandbags

  // Lighting
  const ambLight = new THREE.AmbientLight(0xff6070, 1.4);
  scene.add(ambLight); levelMeshes.push(ambLight);
  const dir = new THREE.DirectionalLight(0xff3040, 2.4);
  dir.position.set(-20, 25, 15);
  scene.add(dir); levelMeshes.push(dir);

  // Red beacon warning light on sniper tower roof
  addPointLight(tx, 7.6, tz, 0xff0022, 5.0, 30);
  addPointLight(b1x, 2.5, b1z, 0xffaa44, 1.5, 14);
  addPointLight(b2x, 2.5, b2z, 0xffaa44, 1.5, 14);
  addPointLight(b3x, 2.5, b3z, 0xffaa44, 1.5, 14);
}

function clearCurrentLevel() {
  levelMeshes.forEach(m => scene.remove(m));
  levelMeshes.length = 0;
  collidables.length = 0;
  vehicleColliders.length = 0;
}

function ensureCorrectLevelForWave(targetWave) {
  if (targetWave === 10) {
    if (!isBossArenaActive) {
      clearCurrentLevel();
      createBossArena(selectedMap);
      isBossArenaActive = true;
    }
  } else {
    if (isBossArenaActive) {
      clearCurrentLevel();
      createLevel(selectedMap);
      isBossArenaActive = false;
      camera.position.set(0, player.eyeHeight, 5);
      player.yaw = 0;
      player.pitch = 0;
    }
  }
}

// ── Dispatcher: build the right level based on map id
function createLevel(mapId) {
  if (wave === 10) {
    createBossArena(mapId);
    isBossArenaActive = true;
    return;
  }
  isBossArenaActive = false;
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

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
//  WEAPON (rendered in a separate scene Ã¢â‚¬â€ no z-clip)
// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

/**
 * Build a left hand group (palm + fingers + thumb) in skin tone.
 * @param {number} x  Local X offset from weapon origin
 * @param {number} y  Local Y offset
 * @param {number} z  Local Z offset
 * @param {object} [rot] Optional {x,y,z} Euler rotations in radians
 */
function buildLeftHand(x, y, z, rot = {}) {
  const skin = new THREE.MeshLambertMaterial({ color: 0xc68642 });
  const skinDk = new THREE.MeshLambertMaterial({ color: 0xb5733a });

  const hand = new THREE.Group();

  // Palm
  const palm = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.026, 0.072), skin);
  hand.add(palm);

  // Four fingers (index Ã¢â€ â€™ pinky), spread slightly
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
  thumb.rotation.z = 0.45;
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

  // Magazine (curved/angled downwards) Ã¢â‚¬â€ animated during reload
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

/** Build M9 Beretta (procedural geometry Ã¢â‚¬â€ no external files needed) */
function buildPistol() {
  const steel = new THREE.MeshLambertMaterial({ color: 0x1c1c1c }); // Dark slide
  const frame = new THREE.MeshLambertMaterial({ color: 0x2a2a2a }); // Frame body
  const polymer = new THREE.MeshLambertMaterial({ color: 0x111111 }); // Black grip panels
  const chrome = new THREE.MeshLambertMaterial({ color: 0x888888 }); // Barrel / metal accents
  const bronze = new THREE.MeshLambertMaterial({ color: 0x7a6030 }); // Trigger / small parts

  const g = new THREE.Group();

  // Ã¢â€â‚¬Ã¢â€â‚¬ Slide (M9 has a long, open-top slide) Ã¢â€â‚¬Ã¢â€â‚¬
  // Main slide body
  g.add(mesh(new THREE.BoxGeometry(0.068, 0.072, 0.42), steel));

  // Open-top cutout effect Ã¢â‚¬â€ two side rails sit higher than centre
  const railL = meshAt(new THREE.BoxGeometry(0.012, 0.03, 0.28), steel, -0.028, 0.051, -0.05);
  g.add(railL);
  const railR = meshAt(new THREE.BoxGeometry(0.012, 0.03, 0.28), steel, 0.028, 0.051, -0.05);
  g.add(railR);

  // Front of slide (solid end cap)
  g.add(meshAt(new THREE.BoxGeometry(0.068, 0.072, 0.04), steel, 0, 0, -0.23));

  // Ã¢â€â‚¬Ã¢â€â‚¬ Barrel (sticks out front, exposed under the open slide) Ã¢â€â‚¬Ã¢â€â‚¬
  const barrel = mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.38, 10), chrome);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.005, -0.09);
  g.add(barrel);

  // Muzzle bushing (ring at the front)
  const bushing = mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.025, 10), steel);
  bushing.rotation.x = Math.PI / 2;
  bushing.position.set(0, 0.005, -0.265);
  g.add(bushing);

  // Ã¢â€â‚¬Ã¢â€â‚¬ Frame Ã¢â€â‚¬Ã¢â€â‚¬
  g.add(meshAt(new THREE.BoxGeometry(0.068, 0.052, 0.40), frame, 0, -0.038, -0.01));

  // Ã¢â€â‚¬Ã¢â€â‚¬ Grip (M9 has a long straight grip) Ã¢â€â‚¬Ã¢â€â‚¬
  const grip = meshAt(new THREE.BoxGeometry(0.062, 0.21, 0.095), frame, 0, -0.165, 0.155);
  grip.rotation.x = 0.12;
  g.add(grip);

  // Grip panel texture strips (raised lines on M9 grip)
  for (let i = 0; i < 5; i++) {
    const strip = meshAt(new THREE.BoxGeometry(0.066, 0.006, 0.07), polymer, 0, -0.10 - i * 0.022, 0.148 + i * 0.003);
    strip.rotation.x = 0.12;
    g.add(strip);
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ Squared trigger guard (M9 signature feature) Ã¢â€â‚¬Ã¢â€â‚¬
  // Bottom bar
  g.add(meshAt(new THREE.BoxGeometry(0.060, 0.008, 0.072), frame, 0, -0.075, 0.035));
  // Front vertical
  g.add(meshAt(new THREE.BoxGeometry(0.060, 0.038, 0.008), frame, 0, -0.060, -0.001));
  // Rear vertical (connects to frame)
  g.add(meshAt(new THREE.BoxGeometry(0.060, 0.028, 0.008), frame, 0, -0.068, 0.072));

  // Ã¢â€â‚¬Ã¢â€â‚¬ Trigger Ã¢â€â‚¬Ã¢â€â‚¬
  const trig = meshAt(new THREE.BoxGeometry(0.008, 0.042, 0.012), bronze, 0, -0.065, 0.030);
  trig.rotation.x = 0.2;
  g.add(trig);

  // Ã¢â€â‚¬Ã¢â€â‚¬ Magazine body (slides inside grip, visible below it, animated during reload) Ã¢â€â‚¬Ã¢â€â‚¬
  const pistolMag = meshAt(new THREE.BoxGeometry(0.054, 0.188, 0.083), polymer, 0, -0.240, 0.155);
  pistolMag.rotation.x = 0.12;
  g.add(pistolMag);
  g.userData.mag = pistolMag;
  g.userData.magRestY = -0.240;
  g.userData.magDrop = 0.22;

  // Ã¢â€â‚¬Ã¢â€â‚¬ Magazine base plate Ã¢â€â‚¬Ã¢â€â‚¬
  g.add(meshAt(new THREE.BoxGeometry(0.068, 0.010, 0.095), polymer, 0, -0.268, 0.155));

  // Ã¢â€â‚¬Ã¢â€â‚¬ Exposed hammer (M9's external hammer) Ã¢â€â‚¬Ã¢â€â‚¬
  const hammer = meshAt(new THREE.BoxGeometry(0.012, 0.032, 0.018), steel, 0, 0.052, 0.197);
  hammer.rotation.x = -0.4;
  g.add(hammer);

  // Ã¢â€â‚¬Ã¢â€â‚¬ Sights Ã¢â€â‚¬Ã¢â€â‚¬
  // Rear sight (U-notch)
  g.add(meshAt(new THREE.BoxGeometry(0.038, 0.012, 0.008), steel, 0, 0.042, 0.185));
  // Front sight post
  g.add(meshAt(new THREE.BoxGeometry(0.008, 0.016, 0.008), steel, 0, 0.042, -0.195));

  // Ã¢â€â‚¬Ã¢â€â‚¬ Safety lever (left side) Ã¢â€â‚¬Ã¢â€â‚¬
  g.add(meshAt(new THREE.BoxGeometry(0.006, 0.018, 0.028), bronze, -0.037, 0.010, 0.12));

  // Ã¢â€â‚¬Ã¢â€â‚¬ Muzzle flash Ã¢â€â‚¬Ã¢â€â‚¬
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

/** Build shotgun (procedural geometry Ã¢â‚¬â€ no external files needed) */
function buildShotgun() {
  const g = new THREE.Group();

  const wood = new THREE.MeshLambertMaterial({ color: 0x6b3a1f });
  const metal = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
  const dark = new THREE.MeshLambertMaterial({ color: 0x111111 });

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

  // Magazine (Large, Boxy, Black) Ã¢â‚¬â€ animated during reload
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

/** Build Desert Eagle Ã¢â‚¬â€ detailed procedural geometry */
function buildDesertEagle() {
  // Ã¢â€â‚¬Ã¢â€â‚¬ Materials Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  // Polished chrome slide
  const slideChrome = new THREE.MeshPhongMaterial({ color: 0x9a9a9a, specular: 0xffffff, shininess: 120 });
  // Slightly darker frame / lower receiver
  const frameMetal = new THREE.MeshPhongMaterial({ color: 0x7a7a7a, specular: 0xcccccc, shininess: 80 });
  // Near-black polymer grip panels
  const polymer = new THREE.MeshPhongMaterial({ color: 0x1a1a1a, specular: 0x333333, shininess: 30 });
  // Dark barrel / internal parts
  const darkMetal = new THREE.MeshPhongMaterial({ color: 0x222222, specular: 0x666666, shininess: 60 });
  // Bright polished barrel muzzle ring
  const barrelRing = new THREE.MeshPhongMaterial({ color: 0xbbbbbb, specular: 0xffffff, shininess: 160 });
  // Trigger gold/bronze tint
  const bronze = new THREE.MeshPhongMaterial({ color: 0x8a6030, specular: 0xddaa44, shininess: 80 });

  const g = new THREE.Group();

  // Ã¢â€â‚¬Ã¢â€â‚¬ 1. SLIDE (upper receiver) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  // Main slide body Ã¢â‚¬â€ thick and tall (Desert Eagle slide is chunky)
  g.add(mesh(new THREE.BoxGeometry(0.090, 0.115, 0.390), slideChrome));

  // Top-of-slide bevel chamfer (angled strips along top edges for that angular look)
  const topBevelL = meshAt(new THREE.BoxGeometry(0.012, 0.020, 0.380), darkMetal, -0.039, 0.058, 0.005);
  topBevelL.rotation.z = 0.45;
  g.add(topBevelL);
  const topBevelR = meshAt(new THREE.BoxGeometry(0.012, 0.020, 0.380), darkMetal, 0.039, 0.058, 0.005);
  topBevelR.rotation.z = -0.45;
  g.add(topBevelR);

  // Ejection port cutout simulation Ã¢â‚¬â€ a recessed dark panel on the right side
  g.add(meshAt(new THREE.BoxGeometry(0.004, 0.040, 0.120), darkMetal, 0.047, 0.020, -0.055));

  // Serrations on the rear of the slide (cocking serrations Ã¢â‚¬â€ thin ridges)
  for (let i = 0; i < 7; i++) {
    const ridge = meshAt(new THREE.BoxGeometry(0.093, 0.090, 0.004), darkMetal, 0, 0.010, 0.115 + i * 0.018);
    g.add(ridge);
  }

  // Front slide taper (nose of the slide is slightly narrower)
  const slideNose = meshAt(new THREE.BoxGeometry(0.080, 0.100, 0.045), slideChrome, 0, 0.003, -0.218);
  g.add(slideNose);

  // Ã¢â€â‚¬Ã¢â€â‚¬ 2. BARREL Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  // The Desert Eagle has a prominent fixed barrel (polygonal rifling barrel)
  // Outer barrel shroud Ã¢â‚¬â€ octagonal cross-section approximated with a cylinder
  const barrelShroud = mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.330, 8), darkMetal);
  barrelShroud.rotation.x = Math.PI / 2;
  barrelShroud.position.set(0, 0.018, -0.100);
  g.add(barrelShroud);

  // Muzzle end Ã¢â‚¬â€ polished ring
  const muzzleRing = mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.018, 16), barrelRing);
  muzzleRing.rotation.x = Math.PI / 2;
  muzzleRing.position.set(0, 0.018, -0.264);
  g.add(muzzleRing);

  // Inner bore hole (dark circle visible at muzzle face)
  const bore = mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.022, 12), darkMetal);
  bore.rotation.x = Math.PI / 2;
  bore.position.set(0, 0.018, -0.272);
  g.add(bore);

  // Gas tube (Desert Eagle is gas-operated Ã¢â‚¬â€ tube runs above the barrel)
  const gasTube = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.240, 8), darkMetal);
  gasTube.rotation.x = Math.PI / 2;
  gasTube.position.set(0, 0.048, -0.100);
  g.add(gasTube);

  // Gas block / front lug
  g.add(meshAt(new THREE.BoxGeometry(0.036, 0.022, 0.028), darkMetal, 0, 0.045, -0.200));

  // Ã¢â€â‚¬Ã¢â€â‚¬ 3. FRAME (lower receiver) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  // Main frame body Ã¢â‚¬â€ slightly shorter Z than slide, sits below
  g.add(meshAt(new THREE.BoxGeometry(0.082, 0.062, 0.360), frameMetal, 0, -0.039, 0.005));

  // Dust-cover / frame rail ledge at the front bottom
  g.add(meshAt(new THREE.BoxGeometry(0.082, 0.016, 0.090), frameMetal, 0, -0.075, -0.155));

  // Frame bevel Ã¢â‚¬â€ bottom-front chamfer on the frame
  const frameFrontBevel = meshAt(new THREE.BoxGeometry(0.082, 0.022, 0.030), frameMetal, 0, -0.062, -0.197);
  frameFrontBevel.rotation.x = 0.5;
  g.add(frameFrontBevel);

  // Ã¢â€â‚¬Ã¢â€â‚¬ 4. GRIP Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  // Desert Eagle has a distinctive long, slightly-angled grip
  // Main grip block
  const gripMain = meshAt(new THREE.BoxGeometry(0.074, 0.195, 0.098), polymer, 0, -0.168, 0.145);
  gripMain.rotation.x = 0.12;   // slight forward cant
  g.add(gripMain);

  // Ã¢â€â‚¬Ã¢â€â‚¬ Magazine body (inside grip, animated during reload) Ã¢â€â‚¬Ã¢â€â‚¬
  const deagleMag = meshAt(new THREE.BoxGeometry(0.066, 0.178, 0.090), polymer, 0, -0.245, 0.145);
  deagleMag.rotation.x = 0.12;
  g.add(deagleMag);
  g.userData.mag = deagleMag;
  g.userData.magRestY = -0.245;
  g.userData.magDrop = 0.26;

  // Grip panel texture Ã¢â‚¬â€ raised horizontal ridges (checkering simulation)
  for (let i = 0; i < 8; i++) {
    const ridge = meshAt(new THREE.BoxGeometry(0.077, 0.007, 0.092), darkMetal, 0, -0.085 - i * 0.018, 0.143 + i * 0.002);
    ridge.rotation.x = 0.12;
    g.add(ridge);
  }

  // Backstrap Ã¢â‚¬â€ thin metal strip at the rear of the grip
  const backstrap = meshAt(new THREE.BoxGeometry(0.010, 0.190, 0.010), frameMetal, 0, -0.168, 0.193);
  backstrap.rotation.x = 0.12;
  g.add(backstrap);

  // Magazine base plate Ã¢â‚¬â€ flat bottom of the grip
  g.add(meshAt(new THREE.BoxGeometry(0.078, 0.012, 0.102), polymer, 0, -0.264, 0.145));

  // Ã¢â€â‚¬Ã¢â€â‚¬ 5. TRIGGER GUARD Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
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

  // Ã¢â€â‚¬Ã¢â€â‚¬ 6. TRIGGER Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  const trig = meshAt(new THREE.BoxGeometry(0.010, 0.050, 0.014), bronze, 0, -0.077, 0.023);
  trig.rotation.x = 0.18;
  g.add(trig);

  // Ã¢â€â‚¬Ã¢â€â‚¬ 7. HAMMER Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  // External spur hammer at the rear of the slide
  const hammerBase = meshAt(new THREE.BoxGeometry(0.022, 0.038, 0.022), darkMetal, 0, 0.068, 0.210);
  hammerBase.rotation.x = -0.30;
  g.add(hammerBase);
  // Hammer spur
  const hammerSpur = meshAt(new THREE.BoxGeometry(0.018, 0.012, 0.028), darkMetal, 0, 0.085, 0.228);
  hammerSpur.rotation.x = -0.55;
  g.add(hammerSpur);

  // Ã¢â€â‚¬Ã¢â€â‚¬ 8. SIGHTS Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  // Rear sight Ã¢â‚¬â€ low-profile, wide notch style
  g.add(meshAt(new THREE.BoxGeometry(0.048, 0.014, 0.010), slideChrome, 0, 0.065, 0.170));
  // Rear sight wings (create the U-notch silhouette)
  g.add(meshAt(new THREE.BoxGeometry(0.010, 0.016, 0.010), darkMetal, -0.019, 0.065, 0.170));
  g.add(meshAt(new THREE.BoxGeometry(0.010, 0.016, 0.010), darkMetal, 0.019, 0.065, 0.170));

  // Front sight post Ã¢â‚¬â€ Desert Eagle has a tall, prominent front sight
  g.add(meshAt(new THREE.BoxGeometry(0.010, 0.022, 0.010), slideChrome, 0, 0.065, -0.185));

  // Ã¢â€â‚¬Ã¢â€â‚¬ 9. SAFETY LEVER (left side) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  g.add(meshAt(new THREE.BoxGeometry(0.008, 0.020, 0.036), bronze, -0.047, 0.020, 0.110));

  // Ã¢â€â‚¬Ã¢â€â‚¬ 10. MAGAZINE RELEASE BUTTON Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  g.add(meshAt(new THREE.BoxGeometry(0.008, 0.012, 0.016), bronze, -0.043, -0.040, 0.085));

  // Ã¢â€â‚¬Ã¢â€â‚¬ 11. SLIDE STOP LEVER Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  g.add(meshAt(new THREE.BoxGeometry(0.008, 0.010, 0.042), darkMetal, -0.044, -0.012, -0.020));

  // Ã¢â€â‚¬Ã¢â€â‚¬ 12. MUZZLE FLASH Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  const flashMat = new THREE.MeshBasicMaterial({
    color: 0xffdd00, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide
  });
  const flash = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.16), flashMat);
  flash.position.set(0, 0.018, -0.280);
  g.userData.muzzleFlash = flash;
  g.add(flash);

  // Ã¢â€â‚¬Ã¢â€â‚¬ 13. HAND Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  // Two-handed pistol grip Ã¢â‚¬â€ supporting hand cups the grip from the left
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
  // Long Magazine Ã¢â‚¬â€ animated during reload
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
    { dur: 0.12, pos: [0.00, -0.030, 0.020], rot: [0.20, 0.00, 0.06], snap: true },
    { dur: 0.18, pos: [0.02, -0.090, 0.060], rot: [0.48, -0.12, 0.18], snap: true, shake: 0.014, sound: 'eject' },
    { dur: 0.50, pos: [0.02, -0.090, 0.060], rot: [0.48, -0.12, 0.18], snap: false },
    { dur: 0.20, pos: [0.00, -0.040, 0.010], rot: [0.22, 0.00, 0.04], snap: true, shake: 0.020, sound: 'slam' },
    { dur: 0.22, pos: [0.02, -0.030, -0.030], rot: [-0.08, 0.10, -0.06], snap: true, shake: 0.008 },
    { dur: 0.78, pos: [0.00, 0.000, 0.000], rot: [0.00, 0.00, 0.00], snap: false },
  ],
  shotgun: [
    { dur: 0.14, pos: [0.02, 0.020, 0.030], rot: [0.35, 0.05, 0.10], snap: true },
    { dur: 0.18, pos: [0.02, -0.010, 0.060], rot: [0.40, 0.08, 0.12], snap: true, shake: 0.012, sound: 'eject' },
    { dur: 0.32, pos: [0.02, -0.010, 0.060], rot: [0.40, 0.08, 0.12], snap: false },
    { dur: 0.20, pos: [0.01, 0.010, -0.020], rot: [0.30, 0.04, 0.08], snap: true, shake: 0.010, sound: 'slam' },
    { dur: 0.50, pos: [0.01, 0.010, -0.020], rot: [0.30, 0.04, 0.08], snap: false },
  ],
  sniper: [
    { dur: 0.18, pos: [0.05, 0.000, 0.010], rot: [0.08, 0.00, 0.22], snap: true },
    { dur: 0.25, pos: [0.05, -0.040, 0.070], rot: [0.14, 0.18, 0.28], snap: true, shake: 0.018, sound: 'eject' },
    { dur: 0.55, pos: [0.05, -0.040, 0.070], rot: [0.14, 0.18, 0.28], snap: false },
    { dur: 0.22, pos: [0.02, -0.010, -0.010], rot: [0.04, 0.04, 0.12], snap: true, shake: 0.025, sound: 'slam' },
    { dur: 0.80, pos: [0.00, 0.000, 0.000], rot: [0.00, 0.00, 0.00], snap: false },
  ],
  pistol: [
    { dur: 0.13, pos: [0.00, -0.040, 0.025], rot: [0.22, -0.08, 0.08], snap: true },
    { dur: 0.18, pos: [0.02, -0.080, 0.050], rot: [0.38, -0.14, 0.14], snap: true, shake: 0.010, sound: 'eject' },
    { dur: 0.35, pos: [0.02, -0.080, 0.050], rot: [0.38, -0.14, 0.14], snap: false },
    { dur: 0.18, pos: [0.00, -0.040, 0.010], rot: [0.15, 0.00, 0.04], snap: true, shake: 0.016, sound: 'slam' },
    { dur: 0.14, pos: [-0.01, -0.020, -0.020], rot: [-0.07, 0.07, -0.04], snap: true, shake: 0.007 },
    { dur: 0.42, pos: [0.00, 0.000, 0.000], rot: [0.00, 0.00, 0.00], snap: false },
  ],
  deagle: [
    { dur: 0.16, pos: [0.01, -0.060, 0.050], rot: [0.32, -0.08, 0.12], snap: true },
    { dur: 0.20, pos: [0.03, -0.130, 0.090], rot: [0.52, -0.18, 0.20], snap: true, shake: 0.024, sound: 'eject' },
    { dur: 0.52, pos: [0.03, -0.130, 0.090], rot: [0.52, -0.18, 0.20], snap: false },
    { dur: 0.22, pos: [0.01, -0.060, 0.020], rot: [0.20, -0.05, 0.08], snap: true, shake: 0.030, sound: 'slam' },
    { dur: 0.18, pos: [0.02, -0.040, -0.020], rot: [-0.04, 0.12, -0.06], snap: true, shake: 0.010 },
    { dur: 0.72, pos: [0.00, 0.000, 0.000], rot: [0.00, 0.00, 0.00], snap: false },
  ],
  uzi: [
    { dur: 0.14, pos: [0.03, -0.030, 0.020], rot: [0.18, 0.25, 0.12], snap: true },
    { dur: 0.20, pos: [0.04, -0.100, 0.040], rot: [0.28, 0.30, 0.18], snap: true, shake: 0.012, sound: 'eject' },
    { dur: 0.46, pos: [0.04, -0.100, 0.040], rot: [0.28, 0.30, 0.18], snap: false },
    { dur: 0.22, pos: [0.02, -0.050, 0.010], rot: [0.10, 0.14, 0.08], snap: true, shake: 0.018, sound: 'slam' },
    { dur: 0.78, pos: [0.00, 0.000, 0.000], rot: [0.00, 0.00, 0.00], snap: false },
  ],
  bat: [], // Melee Ã¢â‚¬â€ no reload animation
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

  // Dedicated camera Ã¢â‚¬â€ never moves, gun position is fixed
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

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
//  ENEMY CLASS
// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
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

        // ─── Compute fall direction: away from the player (bullet impact pushback) ───
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
          // ─── Body fall targets (the whole group tips over) ───
          groupTargetX: fallX * (Math.PI / 2 + (Math.random() - 0.5) * 0.3),
          groupTargetZ: fallZ * (0.2 + Math.random() * 0.3),
          groupVelX: fallX * (2.0 + Math.random()),
          groupVelZ: fallZ * (0.5 + Math.random() * 0.5),

          // ─── Head: angular velocity (starts with whiplash from impact) ───
          headVelX: 1.5 + Math.random() * 2.5,
          headVelZ: (Math.random() - 0.5) * 3.0,
          headVelY: (Math.random() - 0.5) * 1.5,

          // ─── Left arm: swings loose ───
          lArmVelX: (Math.random() - 0.5) * 4.0,
          lArmVelZ: 1.5 + Math.random() * 2.0,  // flop outward
          lArmVelY: (Math.random() - 0.5) * 2.0,

          // ─── Right arm: swings loose ───
          rArmVelX: (Math.random() - 0.5) * 4.0,
          rArmVelZ: -1.5 - Math.random() * 2.0,  // flop outward other side
          rArmVelY: (Math.random() - 0.5) * 2.0,

          // ─── Left leg: kicks out ───
          lLegVelX: (Math.random() - 0.5) * 2.0,
          lLegVelZ: 0.5 + Math.random() * 1.5,
          lLegVelY: (Math.random() - 0.5) * 1.0,

          // ─── Right leg: kicks out ───
          rLegVelX: (Math.random() - 0.5) * 2.0,
          rLegVelZ: -0.5 - Math.random() * 1.5,
          rLegVelY: (Math.random() - 0.5) * 1.0,

          // Track if settled
          settled: false,
        };

        // Slide target: push body away from player slightly
        this.slideX = this.group.position.x + fallDirX * (0.6 + Math.random() * 0.4);
        this.slideZ = this.group.position.z + fallDirZ * (0.6 + Math.random() * 0.4);

        // ─── Register a rigid body hitbox for the dead body ───
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

      // ─── Physics constants ───
      const GRAVITY_TORQUE = 6.0;   // gravity pulling limbs down
      const DAMPING = 3.2;   // angular velocity damping
      const GROUND_BOUNCE = 0.3;   // bounciness when hitting joint limits

      if (!r.settled) {
        // ──────────────────────────────────────────────
        //  BODY FALL (the whole group tips over)
        // ──────────────────────────────────────────────

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

        // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
        //  HEAD Ã¢â‚¬â€ whiplash then loll
        // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
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

        // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
        //  LEFT ARM Ã¢â‚¬â€ swings loose from shoulder
        // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
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

        // ---------------------------------------------
        //  RIGHT ARM — swings loose from shoulder
        // ---------------------------------------------
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

        // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
        //  LEFT LEG Ã¢â‚¬â€ kicks out loosely
        // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
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

        // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
        //  RIGHT LEG Ã¢â‚¬â€ kicks out loosely
        // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
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

        // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
        //  UPDATE RIGID BODY HITBOX position
        // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
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

        // ─── Arterial blood spurting continuously from severed neck stump ───
        if (this.headDestroyed && (this.neckBloodTimer === undefined || this.neckBloodTimer > 0)) {
          if (this.neckBloodTimer === undefined) this.neckBloodTimer = 2.8;
          this.neckBloodTimer -= dt;
          this.neckSpurtCD = (this.neckSpurtCD || 0) - dt;
          if (this.neckSpurtCD <= 0) {
            this.neckSpurtCD = 0.05; // ~20 spurts per second
            const stumpPos = new THREE.Vector3();
            if (this.neckStump) {
              this.neckStump.getWorldPosition(stumpPos);
            } else {
              stumpPos.copy(this.group.position);
              stumpPos.y += 1.4;
            }

            const bloodColors = [0x8a0303, 0xaa0000, 0x5e0000, 0xb80c0c];
            const count = 3 + Math.floor(Math.random() * 3);
            for (let s = 0; s < count; s++) {
              const color = bloodColors[Math.floor(Math.random() * bloodColors.length)];
              const size = 0.035 + Math.random() * 0.04;
              const drop = new THREE.Mesh(
                new THREE.BoxGeometry(size, size, size),
                new THREE.MeshBasicMaterial({ color })
              );
              drop.position.copy(stumpPos).add(new THREE.Vector3(
                (Math.random() - 0.5) * 0.1,
                (Math.random() - 0.5) * 0.06,
                (Math.random() - 0.5) * 0.1
              ));
              scene.add(drop);

              // Upward & forward arching arterial spurts
              const spurtVel = new THREE.Vector3(
                (Math.random() - 0.5) * 2.2,
                1.5 + Math.random() * 3.2,
                (Math.random() - 0.5) * 2.2
              );
              bloodFountainParticles.push({
                mesh: drop,
                vel: spurtVel,
                gravity: -13.5,
                life: 0.6 + Math.random() * 0.5,
                maxLife: 1.1,
                size
              });
            }

            // Expanding pool of blood on floor underneath
            if (Math.random() < 0.35) {
              spawnBloodPuddle(
                stumpPos.x + (Math.random() - 0.5) * 0.4,
                stumpPos.z + (Math.random() - 0.5) * 0.4,
                0.16 + Math.random() * 0.22
              );
            }
          }
        }

        // Ã¢â€â‚¬Ã¢â€â‚¬ Check if settled (all velocities near zero)
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

  takeDamage(dmg, canDecapitate = false, shotDir = null, hitPoint = null) {
    if (!this.alive) return;

    if (canDecapitate) {
      // Shotgun headshots bypass armor and deal direct critical damage
      this.armor = 0;
      if (this.armorFill) this.armorFill.style.width = '0%';
      this.hp = Math.max(0, this.hp - dmg);
    } else {
      if (this.armor > 0) {
        if (dmg <= this.armor) {
          this.armor -= dmg;
          dmg = 0;
        } else {
          dmg -= this.armor;
          this.armor = 0;
        }
        if (this.armorFill) this.armorFill.style.width = ((this.armor / this.maxArmor) * 100) + '%';
      }

      if (dmg > 0) {
        this.hp = Math.max(0, this.hp - dmg);
      }
    }

    if (this.hpFill) this.hpFill.style.width = ((this.hp / this.maxHp) * 100) + '%';

    if (this.hp <= 0) {
      if (canDecapitate && !this.headDestroyed) {
        this.explodeHead(shotDir, hitPoint);
      } else {
        this._die();
      }
    }
  }

  explodeHead(shotDir, hitPoint) {
    if (this.headDestroyed) return;
    this.headDestroyed = true;
    this.neckBloodTimer = 2.8;

    // Head blown off means INSTANT FATAL DEATH - cannot walk or shoot without head!
    this.hp = 0;
    this.armor = 0;
    if (this.alive) {
      this._die();
    }

    // 1. Hide the intact head mesh and its facial features
    if (this.head) {
      this.head.visible = false;
    }

    // 2. Add bloody severed neck stump with meat & vertebrae bone to the body group
    const stumpMat = new THREE.MeshLambertMaterial({ color: 0x6a0000 });
    const boneMat = new THREE.MeshLambertMaterial({ color: 0xd8d0c0 });
    const stump = new THREE.Group();

    // Torn flesh ring
    const meat = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.17, 0.14, 10), stumpMat);
    meat.position.y = 1.38;
    stump.add(meat);

    // Severed vertebrae bone in the center
    const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.16, 8), boneMat);
    bone.position.y = 1.41;
    stump.add(bone);

    this.group.add(stump);
    this.neckStump = stump;

    // 3. Play wet meaty gore splatter explosion SFX
    playGoreHeadPopSound();

    // 4. Head position in 3D world space
    const headWorldPos = new THREE.Vector3();
    this.head.getWorldPosition(headWorldPos);
    if (headWorldPos.lengthSq() < 0.1) {
      headWorldPos.copy(this.group.position);
      headWorldPos.y += 1.6;
    }

    // 5. Spawn flying skull/flesh/brain gibs (blow into pieces)
    spawnGoreGibs(headWorldPos, shotDir || new THREE.Vector3(0, 0, -1));

    // 6. Spawn massive high-pressure blood fountain & mist
    spawnBloodFountain(headWorldPos, shotDir || new THREE.Vector3(0, 0, -1));

    // 7. Extra ragdoll force: headless body snaps back hard
    if (this.ragdoll) {
      this.ragdoll.groupVelX *= 2.2;
      this.ragdoll.groupVelZ *= 2.2;
    }
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

// ────────────────────────────────────────────────────────────
//  WAVE 10 APEX SNIPER BOSS CLASS
// ────────────────────────────────────────────────────────────
class BossSniper {
  constructor(x, y, z) {
    this.type = 'boss_sniper';
    this.isBoss = true;
    this.hp = 1800;
    this.maxHp = 1800;
    this.alive = true;
    this.damage = 50; // 2 direct hits = lethal fatal damage

    // State machine: tracking (2.2s) -> locking (1.0s flash/beep) -> firing -> cooldown (2.4s)
    this.state = 'tracking';
    this.stateTimer = 2.2;
    this.beepTimer = 0;
    this.flashTimer = 0;
    this.lockedAimPos = new THREE.Vector3();
    this.barrelWorldPos = new THREE.Vector3();

    this.headDestroyed = false;
    this._deadBodyBox = null;

    this._buildMesh(x, y, z);
    this._buildLaser();
    this._updateBossHUD();
  }

  _buildMesh(x, y, z) {
    this.group = new THREE.Group();
    this.group.position.set(x, y, z);

    // Sniper boss tactical materials
    const zombieSkin = new THREE.MeshLambertMaterial({ color: 0x2e502e });
    const clothesMat = new THREE.MeshLambertMaterial({ color: 0x182018 });
    const vestMat = new THREE.MeshLambertMaterial({ color: 0x111611 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0022 });
    const gunDark = new THREE.MeshLambertMaterial({ color: 0x141416 });
    const metalMat = new THREE.MeshLambertMaterial({ color: 0x30353c });
    const lensMat = new THREE.MeshBasicMaterial({ color: 0x00e1ff });

    // 1. Elevated Combat Crouch Body: Torso raised above the low sandbag ledge
    this.torso = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.72, 0.55), clothesMat);
    this.torso.position.set(0, 0.48, 0.15);
    this.torso.castShadow = true;
    this.group.add(this.torso);

    // Heavy tactical armor vest plate
    const vest = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.58, 0.58), vestMat);
    vest.position.set(0, 0.48, 0.15);
    this.group.add(vest);

    // 2. Kneeling / Crouched Legs firmly planted on the elevated watchtower floor
    [-0.26, 0.26].forEach(lx => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.42, 0.72), clothesMat);
      leg.position.set(lx, 0.20, 0.42);
      leg.rotation.x = -0.35;
      this.group.add(leg);
    });

    // 3. Arms reaching forward over the sandbag mount resting on the rifle stock
    [-0.34, 0.34].forEach((ax, idx) => {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.22, 0.75), clothesMat);
      arm.position.set(ax, 0.45, -0.2);
      arm.rotation.y = idx === 0 ? 0.25 : -0.25;
      arm.rotation.x = 0.15;
      this.group.add(arm);
    });

    // 4. Elevated Head looking down into the arena (clearly visible from the ground)
    this.head = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.48, 0.48), zombieSkin);
    this.head.position.set(0, 0.98, 0.05);
    this.head.rotation.x = 0.22;
    this.group.add(this.head);

    // Glowing Menacing Red Optics / Eyes (piercing red glare visible at distance)
    [-0.12, 0.12].forEach(ex => {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.07, 0.10), eyeMat);
      eye.position.set(ex, 0.05, -0.24);
      this.head.add(eye);
    });

    // 5. Heavy .50 Cal Sniper Rifle Group resting forward on sandbag ledge
    this.gunPivot = new THREE.Group();
    this.gunPivot.position.set(0, 0.52, -0.35);

    // Rifle Receiver & Stock
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.85), gunDark);
    receiver.position.set(0, 0, 0);
    this.gunPivot.add(receiver);

    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.26, 0.6), metalMat);
    stock.position.set(0, -0.04, 0.6);
    this.gunPivot.add(stock);

    // Massive .50 Cal Fluted Barrel (3.4m long)
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 3.4, 12), metalMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.02, -1.9);
    this.gunPivot.add(barrel);

    // Heavy Muzzle Brake
    const muzzleBrake = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.38), gunDark);
    muzzleBrake.position.set(0, 0.02, -3.65);
    this.gunPivot.add(muzzleBrake);

    // High-Magnification Sniper Scope
    const scopeTube = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.7, 12), gunDark);
    scopeTube.rotation.x = Math.PI / 2;
    scopeTube.position.set(0, 0.20, -0.15);
    this.gunPivot.add(scopeTube);

    const scopeLens = new THREE.Mesh(new THREE.CircleGeometry(0.06, 12), lensMat);
    scopeLens.position.set(0, 0.20, -0.51);
    scopeLens.rotation.y = Math.PI;
    this.gunPivot.add(scopeLens);

    // Heavy Bipod Stand planted on sandbags
    [-0.24, 0.24].forEach(bx => {
      const bipod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.45, 6), metalMat);
      bipod.position.set(bx, -0.16, -1.2);
      bipod.rotation.z = bx > 0 ? -0.3 : 0.3;
      bipod.rotation.x = 0.2;
      this.gunPivot.add(bipod);
    });

    // Barrel tip anchor point for shots and laser beam
    this.muzzleTip = new THREE.Object3D();
    this.muzzleTip.position.set(0, 0.02, -3.85);
    this.gunPivot.add(this.muzzleTip);

    this.group.add(this.gunPivot);

    // 6. Generous invisible Hitbox volume covering boss body and head so incoming bullets register easily
    const hitBoxMat = new THREE.MeshBasicMaterial({ visible: false });
    this.hitboxMesh = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.8, 1.6), hitBoxMat);
    this.hitboxMesh.position.set(0, 0.8, 0);
    this.group.add(this.hitboxMesh);

    scene.add(this.group);
  }

  _buildLaser() {
    // 3D Red Laser targeting beam
    const laserGeo = new THREE.CylinderGeometry(0.025, 0.025, 1, 6);
    laserGeo.rotateX(Math.PI / 2);
    laserGeo.translate(0, 0, 0.5);

    this.laserMat = new THREE.MeshBasicMaterial({
      color: 0xff0022,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.laserMesh = new THREE.Mesh(laserGeo, this.laserMat);
    this.laserMesh.visible = false;
    scene.add(this.laserMesh);
  }

  update(dt) {
    if (!this.alive) {
      if (this.laserMesh) this.laserMesh.visible = false;
      return;
    }

    // Get current muzzle tip world position
    this.muzzleTip.getWorldPosition(this.barrelWorldPos);

    // Player head target in world coordinates
    const playerTarget = camera.position.clone();

    if (this.state === 'tracking') {
      // 1. AIM & TRACK PLAYER REAL-TIME
      this.stateTimer -= dt;

      // Aim entire body facing player direction
      const dx = camera.position.x - this.group.position.x;
      const dz = camera.position.z - this.group.position.z;
      const angle = Math.atan2(dx, dz);
      this.group.rotation.y = angle + Math.PI;

      this.gunPivot.lookAt(playerTarget);

      // Update laser from barrel to player position
      this._updateLaserBeam(this.barrelWorldPos, playerTarget, 0.7, 0xff0022);
      this.laserMesh.visible = true;

      // When tracking time expires, LOCK IN PLACE!
      if (this.stateTimer <= 0) {
        this.state = 'locking';
        this.stateTimer = 1.0; // 1.0 second warning lock-on before firing!
        this.lockedAimPos.copy(playerTarget);
        this.beepTimer = 0;
        this.flashTimer = 0;

        // Show screen warning banner
        const warnEl = document.getElementById('laser-lock-warning');
        if (warnEl) warnEl.classList.remove('hidden');
      }

    } else if (this.state === 'locking') {
      // 2. LASER LOCKED IN PLACE & FLASHING RAPIDLY WITH WARNING BEEPS
      this.stateTimer -= dt;
      this.flashTimer += dt;
      this.beepTimer += dt;

      // Warning audio pulse
      if (this.beepTimer >= 0.16) {
        this.beepTimer = 0;
        playLockOnBeep(1.0 + (1.0 - this.stateTimer) * 0.6);
      }

      // Laser beam strobe flash (alternating bright red & hot white)
      const flash = Math.sin(this.flashTimer * 45) > 0;
      this._updateLaserBeam(
        this.barrelWorldPos,
        this.lockedAimPos,
        flash ? 1.0 : 0.25,
        flash ? 0xffffff : 0xff0011
      );
      this.laserMesh.visible = true;

      // Fire when 1-second lock-on expires!
      if (this.stateTimer <= 0) {
        this._fireSniperShot();
        this.state = 'cooldown';
        this.stateTimer = 2.4; // Bolt cycle / cooldown
        this.laserMesh.visible = false;

        const warnEl = document.getElementById('laser-lock-warning');
        if (warnEl) warnEl.classList.add('hidden');
      }

    } else if (this.state === 'cooldown') {
      // 3. BOLT RE-CYCLE & RE-ACQUISITION COOLDOWN
      this.stateTimer -= dt;
      this.laserMesh.visible = false;

      if (this.stateTimer <= 0) {
        this.state = 'tracking';
        this.stateTimer = 2.2;
      }
    }
  }

  _updateLaserBeam(start, target, opacity, colorHex) {
    const dist = start.distanceTo(target);
    this.laserMesh.position.copy(start);
    this.laserMesh.lookAt(target);
    this.laserMesh.scale.set(1, 1, Math.max(0.1, dist));
    this.laserMat.opacity = opacity;
    this.laserMat.color.setHex(colorHex);
  }

  _fireSniperShot() {
    if (!player.alive) return;

    // 1. Play massive .50 cal thunderous boom SFX
    playBossSniperShot();

    // 2. Heavy muzzle flash and blast smoke
    this.muzzleTip.getWorldPosition(this.barrelWorldPos);
    const shotDir = this.lockedAimPos.clone().sub(this.barrelWorldPos).normalize();
    spawnMuzzleSmoke('sniper', this.barrelWorldPos, shotDir);

    // 3. Line-of-sight & Cover Check:
    // Determine whether a reinforced bunker blocks line-of-sight between boss and player
    const playerHeadPos = camera.position.clone();
    const toPlayerDir = playerHeadPos.clone().sub(this.barrelWorldPos).normalize();
    const playerDist = this.barrelWorldPos.distanceTo(playerHeadPos);
    const coverRay = new THREE.Ray(this.barrelWorldPos.clone(), toPlayerDir);

    let isPlayerInCover = false;
    let coverHitPoint = null;
    const pt = new THREE.Vector3();

    for (const c of collidables) {
      if (coverRay.intersectBox(c, pt)) {
        const hitD = this.barrelWorldPos.distanceTo(pt);
        // If a bunker obstacle is between the boss and player (with margin)
        if (hitD < playerDist - 1.2) {
          isPlayerInCover = true;
          coverHitPoint = pt.clone();
          break;
        }
      }
    }

    // 4. Spawn high-velocity supersonic glowing .50 Cal Sniper Tracer Bullet
    const bulletOrigin = this.barrelWorldPos.clone().addScaledVector(shotDir, 1.2);
    const bulletGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.4, 6);
    bulletGeo.rotateX(Math.PI / 2);
    const bulletMat = new THREE.MeshBasicMaterial({ color: 0xff3300 });
    const bulletMesh = new THREE.Mesh(bulletGeo, bulletMat);
    bulletMesh.position.copy(bulletOrigin);
    bulletMesh.lookAt(bulletOrigin.clone().add(shotDir));
    scene.add(bulletMesh);

    // Add bright yellow-hot core
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xffee44 });
    const coreMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.5, 6), coreMat);
    coreMesh.rotation.x = Math.PI / 2;
    bulletMesh.add(coreMesh);

    // Trajectory direction
    const projDir = isPlayerInCover && coverHitPoint
      ? coverHitPoint.clone().sub(bulletOrigin).normalize()
      : shotDir;

    enemyProjectiles.push({
      mesh: bulletMesh,
      dir: projDir,
      speed: 85, // Supersonic .50 cal speed
      life: 2.5,
      damage: this.damage,
      isBossSniper: true
    });

    // 5. Deal direct damage if player was not in cover and failed to dodge
    const playerMovedDist = playerHeadPos.distanceTo(this.lockedAimPos);

    if (!isPlayerInCover && playerMovedDist < 4.5) {
      setTimeout(() => {
        if (player.alive && !isGodMode) {
          player.health = Math.max(0, player.health - this.damage);
          updateHealthHUD();
          triggerDamageFlash();
          shakeIntensity = Math.min(0.2, shakeIntensity + 0.12);
          if (player.health <= 0) playerDie();
        }
      }, 90); // ~90ms ballistic arrival delay
    }
  }

  takeDamage(dmg, canDecapitate = false, shotDir = null, hitPoint = null) {
    if (!this.alive) return;

    this.hp = Math.max(0, this.hp - dmg);
    this._updateBossHUD();

    // Hit reaction flinch
    if (this.head) {
      this.head.rotation.x = -0.15;
      setTimeout(() => { if (this.head) this.head.rotation.x = 0.22; }, 90);
    }

    if (this.hp <= 0) {
      this._die();
    }
  }

  _updateBossHUD() {
    const bar = document.getElementById('boss-bar-fill');
    const txt = document.getElementById('boss-hp-text');
    if (bar) bar.style.width = Math.max(0, (this.hp / this.maxHp) * 100) + '%';
    if (txt) txt.textContent = `${this.hp} / ${this.maxHp}`;
  }

  explodeHead(shotDir, hitPoint) {
    // Boss head cannot be popped at distance, dies with honor
  }

  _die() {
    this.alive = false;
    if (this.laserMesh) scene.remove(this.laserMesh);

    const warnEl = document.getElementById('laser-lock-warning');
    if (warnEl) warnEl.classList.add('hidden');

    const bossHud = document.getElementById('boss-hud');
    if (bossHud) bossHud.classList.add('hidden');

    // Death sound & effects
    playDeathSound();
    playGoreHeadPopSound();
    spawnBloodFountain(this.group.position.clone().add(new THREE.Vector3(0, 1, 0)), new THREE.Vector3(0, 1, 0));

    // Slouch reaction
    this.torso.rotation.z = 0.45;
    this.head.position.y = 0.5;

    kills++;
    document.getElementById('kills').textContent = kills;
  }
}

// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
//  WAVE MANAGEMENT
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
function spawnWave() {
  // Dispose previous wave — also remove dead body hitboxes from collidables
  enemies.forEach(e => {
    scene.remove(e.group);
    if (e.hpEl && e.hpEl.parentNode) e.hpEl.remove();
    if (e.laserMesh) scene.remove(e.laserMesh);
    if (e._deadBodyBox) {
      const idx = collidables.indexOf(e._deadBodyBox);
      if (idx !== -1) collidables.splice(idx, 1);
    }
  });
  enemies = [];
  enemyProjectiles.forEach(p => scene.remove(p.mesh));
  enemyProjectiles = [];

  // Ensure correct level landscape is loaded for current wave (boss arena for 10, normal map for others)
  ensureCorrectLevelForWave(wave);

  // Hide boss HUD elements if not wave 10
  const bossHud = document.getElementById('boss-hud');
  const warnEl = document.getElementById('laser-lock-warning');
  if (bossHud && wave !== 10) bossHud.classList.add('hidden');
  if (warnEl) warnEl.classList.add('hidden');

  // ────────────────────────────────────────────────────────────
  //  WAVE 10: APEX SNIPER BOSS ENCOUNTER
  // ────────────────────────────────────────────────────────────
  if (wave === 10) {
    // Position player behind safety in the arena facing the sniper nest
    camera.position.set(0, player.eyeHeight, 22);
    player.yaw = 0;
    player.pitch = 0;

    // Spawn the single Apex Sniper Boss at the forward sniper ledge overlooking the battlefield
    const boss = new BossSniper(26.6, 4.25, -26.6);
    enemies.push(boss);

    document.getElementById('enemy-num').textContent = 1;
    document.getElementById('wave-num').textContent = '10 (BOSS)';
    if (bossHud) {
      bossHud.classList.remove('hidden');
      document.getElementById('boss-hp-text').textContent = '1800 / 1800';
      document.getElementById('boss-bar-fill').style.width = '100%';
    }
    return;
  }

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

/** Rapid electronic lock-on warning beep */
function playLockOnBeep(pitchMult = 1.0) {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(1400 * pitchMult, now);
  osc.frequency.exponentialRampToValueAtTime(2200 * pitchMult, now + 0.07);
  g.gain.setValueAtTime(0.35, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
  osc.connect(g);
  g.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.07);
}

/** Thunderous .50 cal boss sniper rifle shot with deep echoing reverb */
function playBossSniperShot() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;

  // 1. Supersonic crack
  const crackLen = Math.floor(audioCtx.sampleRate * 0.08);
  const crackBuf = audioCtx.createBuffer(1, crackLen, audioCtx.sampleRate);
  const crackDat = crackBuf.getChannelData(0);
  for (let i = 0; i < crackLen; i++) crackDat[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / crackLen, 0.4);
  const crackSrc = audioCtx.createBufferSource();
  crackSrc.buffer = crackBuf;
  const hp = audioCtx.createBiquadFilter();
  hp.type = 'highpass'; hp.frequency.value = 1800;
  const cg = audioCtx.createGain();
  cg.gain.setValueAtTime(1.8, now);
  cg.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  crackSrc.connect(hp); hp.connect(cg); cg.connect(audioCtx.destination);
  crackSrc.start(now);

  // 2. Heavy low-end explosive cannon boom
  const boomLen = Math.floor(audioCtx.sampleRate * 0.85);
  const boomBuf = audioCtx.createBuffer(1, boomLen, audioCtx.sampleRate);
  const boomDat = boomBuf.getChannelData(0);
  for (let i = 0; i < boomLen; i++) boomDat[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / boomLen, 1.2);
  const boomSrc = audioCtx.createBufferSource();
  boomSrc.buffer = boomBuf;
  const lp = audioCtx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(320, now);
  lp.frequency.exponentialRampToValueAtTime(45, now + 0.85);
  const bg = audioCtx.createGain();
  bg.gain.setValueAtTime(2.4, now);
  bg.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
  boomSrc.connect(lp); lp.connect(bg); bg.connect(audioCtx.destination);
  boomSrc.start(now);

  // 3. Sub-bass shockwave sweep
  const osc = audioCtx.createOscillator();
  const og = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(160, now);
  osc.frequency.exponentialRampToValueAtTime(28, now + 0.65);
  og.gain.setValueAtTime(1.6, now);
  og.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
  osc.connect(og); og.connect(audioCtx.destination);
  osc.start(now); osc.stop(now + 0.65);
}

// ─────────────────────────────────────────────────────────────
//  PLAYER COLLISION
// ─────────────────────────────────────────────────────────────
function playerCollidesAt(x, y, z) {
  const RADIUS = 0.32;
  const box = new THREE.Box3(
    new THREE.Vector3(x - RADIUS, y - player.eyeHeight + 0.1, z - RADIUS),
    new THREE.Vector3(x + RADIUS, y + 0.08, z + RADIUS)
  );
  for (let i = 0; i < collidables.length; i++) {
    if (box.intersectsBox(collidables[i])) return true;
  }

  // Exact oriented vehicle bounding collision (no ghost-wall padding at any angle)
  for (let i = 0; i < vehicleColliders.length; i++) {
    const vc = vehicleColliders[i];
    const dx = x - vc.cx;
    const dz = z - vc.cz;
    const cos = Math.cos(-vc.rotY);
    const sin = Math.sin(-vc.rotY);
    const lx = dx * cos - dz * sin;
    const lz = dx * sin + dz * cos;

    for (let s = 0; s < vc.segments.length; s++) {
      const seg = vc.segments[s];
      const slx = seg.lx || 0;
      const slz = seg.lz || 0;
      const minX = slx - seg.w / 2;
      const maxX = slx + seg.w / 2;
      const minZ = slz - seg.d / 2;
      const maxZ = slz + seg.d / 2;

      if (lx + RADIUS > minX && lx - RADIUS < maxX && lz + RADIUS > minZ && lz - RADIUS < maxZ) {
        return true;
      }
    }
  }
  return false;
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
//  WEAPON SWITCHING
// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
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
  const ammoSep = document.querySelector('.ammo-sep');
  if (w.melee) {
    ammoSection.style.opacity = '0.7';
    document.getElementById('ammo-current').textContent = '\u221E';
    document.getElementById('ammo-reserve').textContent = '';
    if (ammoSep) ammoSep.style.display = 'none';
    document.getElementById('reload-indicator').classList.add('hidden');
  } else {
    ammoSection.style.opacity = '1';
    document.getElementById('ammo-current').textContent = w.ammo;
    document.getElementById('ammo-reserve').textContent = w.reserveAmmo;
    if (ammoSep) ammoSep.style.display = 'inline';
  }
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
//  BAT SWING Ã¢â‚¬â€ handles both weak quick-swing and charged instakill
// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
function performBatSwing(isCharged) {
  if (!isMobile && !isPointerLocked) return;
  if (isSwitchingWeapon) return;
  if (batState.isSwinging) return;
  if (player.shootCooldown > 0) return;

  const w = cw();
  if (!w.melee) return;

  const damage = isCharged ? 9999 : 40 + Math.floor(Math.random() * 20);
  const cooldown = isCharged ? 1.1 : 0.55;

  player.shootCooldown = cooldown;
  batState.isSwinging = true;
  batState.swingTimer = 0;
  batState.isCharged = isCharged;
  batState.windupActive = false;
  batState.isCharging = false;
  batState.chargeTime = 0;

  // Sound: weak = whoosh, charged = whoosh + clang
  playPanSwing(isCharged);

  // Hitscan Ã¢â‚¬â€ charged has longer reach
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
        const hitPt = intersects[0].point.clone();
        const swingDir = camera.getWorldDirection(new THREE.Vector3());
        // Only shotgun can decapitate heads - bat deals heavy blunt damage with head intact
        enemy.takeDamage(damage, false, swingDir, hitPt);
        showHitMarker();
        shakeIntensity = isCharged ? 0.22 : 0.08;
        break;
      }
    }
  }
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
//  PLAYER WEAPON Ã¢â‚¬â€ SHOOTING
// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
function playerShoot() {
  // On desktop require pointer lock; on mobile bypass that requirement
  if (!isMobile && !isPointerLocked) return;
  if (isSwitchingWeapon) return;
  if (player.shootCooldown > 0) return;

  const w = cw();

  // â”€â”€â”€ MELEE (bat) â”€â”€â”€
  if (w.melee) return;

  // â”€â”€â”€ RANGED â”€â”€â”€
  if (w.ammo <= 0 && !w.isReloading && !isInfiniteAmmo) return;

  // Interrupt reload if firing and we have ammo
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
      return;
    }
  }

  if (!isInfiniteAmmo) w.ammo--;
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

  // Realistic spent brass casing ejection on every shot (except shotgun which ejects on pump)
  if (w.id !== 'shotgun' && gunGroup) {
    spawnEjectedShell(gunGroup, w.id);
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
    weaponRecoil.zVel += zV;
    weaponRecoil.rotVel += rVel;
    weaponRecoil.latVel += lVel;
    shakeIntensity = Math.max(shakeIntensity, sInt);
  }

  document.getElementById('ammo-current').textContent = w.ammo;

  // Compute 3D world origin of the gun muzzle
  const muzzleWorldPos = getPlayerMuzzleWorldPos();

  // Spawn expanding gunpowder smoke from the barrel tip
  spawnMuzzleSmoke(w.id, muzzleWorldPos, camera.getWorldDirection(new THREE.Vector3()));

  // Raycaster from screen center (camera view)
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

  const targets = [];
  enemies.forEach(e => {
    if (e.alive) e.group.traverse(c => { if (c.isMesh) targets.push(c); });
  });

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

    // 1. Raycast against level collidables
    let closestWallDist = Infinity;
    let wallHitPoint = null;
    let wallHitNormal = new THREE.Vector3(0, 1, 0);
    const pt = new THREE.Vector3();
    for (const c of collidables) {
      if (raycaster.ray.intersectBox(c, pt)) {
        const d = pt.distanceTo(camera.position);
        if (d < closestWallDist) {
          closestWallDist = d;
          wallHitPoint = pt.clone();
          wallHitNormal = getBoxHitNormal(c, pt);
        }
      }
    }

    // Also raycast against exact oriented vehicle colliders
    for (let v = 0; v < vehicleColliders.length; v++) {
      const vc = vehicleColliders[v];
      const localRay = raycaster.ray.clone();
      localRay.origin.x -= vc.cx;
      localRay.origin.z -= vc.cz;
      const cos = Math.cos(-vc.rotY);
      const sin = Math.sin(-vc.rotY);

      const lox = localRay.origin.x * cos - localRay.origin.z * sin;
      const loz = localRay.origin.x * sin + localRay.origin.z * cos;
      localRay.origin.x = lox;
      localRay.origin.z = loz;

      const ldx = localRay.direction.x * cos - localRay.direction.z * sin;
      const ldz = localRay.direction.x * sin + localRay.direction.z * cos;
      localRay.direction.x = ldx;
      localRay.direction.z = ldz;

      const lpt = new THREE.Vector3();
      for (let s = 0; s < vc.segments.length; s++) {
        const seg = vc.segments[s];
        const slx = seg.lx || 0;
        const slz = seg.lz || 0;
        const minH = seg.y !== undefined ? (seg.y - seg.h / 2) : 0;
        const maxH = seg.y !== undefined ? (seg.y + seg.h / 2) : (seg.h || 2.0);
        const segBox = new THREE.Box3(
          new THREE.Vector3(slx - seg.w / 2, minH, slz - seg.d / 2),
          new THREE.Vector3(slx + seg.w / 2, maxH, slz + seg.d / 2)
        );
        if (localRay.intersectBox(segBox, lpt)) {
          const wCos = Math.cos(vc.rotY);
          const wSin = Math.sin(vc.rotY);
          const wx = vc.cx + lpt.x * wCos - lpt.z * wSin;
          const wz = vc.cz + lpt.x * wSin + lpt.z * wCos;
          const worldHitPt = new THREE.Vector3(wx, lpt.y, wz);
          const d = worldHitPt.distanceTo(camera.position);
          if (d < closestWallDist) {
            closestWallDist = d;
            wallHitPoint = worldHitPt;
            wallHitNormal = new THREE.Vector3(0, 1, 0);
          }
        }
      }
    }

    // 2. Raycast against enemies
    const enemyIntersects = raycaster.intersectObjects(targets, false);
    let hitEnemy = null;
    let enemyHitDist = Infinity;
    let enemyHitPoint = null;
    let isHeadshot = false;

    if (enemyIntersects.length > 0 && enemyIntersects[0].distance < closestWallDist) {
      const hitObj = enemyIntersects[0].object;
      for (const enemy of enemies) {
        if (!enemy.alive) continue;
        let matched = false;
        enemy.group.traverse(c => { if (c === hitObj) matched = true; });
        if (matched) {
          hitEnemy = enemy;
          enemyHitDist = enemyIntersects[0].distance;
          enemyHitPoint = enemyIntersects[0].point.clone();
          isHeadshot = enemyHitPoint.y > 1.3;
          break;
        }
      }
    }

    // 3. Determine target impact point and trigger mechanics
    let targetDist = 120;
    let targetPoint = muzzleWorldPos.clone().addScaledVector(shotDir, 120);
    let targetNormal = new THREE.Vector3(0, 1, 0);
    let isEnemyHit = false;

    if (hitEnemy && enemyHitPoint) {
      targetDist = muzzleWorldPos.distanceTo(enemyHitPoint);
      targetPoint = enemyHitPoint;
      isEnemyHit = true;

      // Damage calculation
      let dmg = w.damage;
      const isPointBlankShotgun = isShotgun && targetDist <= 4.2;

      if (isHeadshot && isShotgun) {
        // Point-blank shotgun headshot is catastrophic instakill
        dmg = isPointBlankShotgun ? 9999 : (dmg + 25);
      } else if (isHeadshot) {
        if (w.id === 'sniper') {
          dmg = 9999; // Sniper is lethal headshot kill with head intact
        } else if (w.id === 'deagle') {
          dmg = 125;
        } else {
          dmg += Math.floor(Math.random() * 15) + 30;
        }
      } else {
        dmg += Math.floor(Math.random() * (isShotgun ? 5 : 18));
      }

      // ONLY POINT-BLANK / CLOSE-RANGE SHOTGUN HEADSHOTS CAN DECAPITATE (< 4.2m)
      // At mid or long range, scattered pellets will kill low-health enemies with head intact.
      const canDecapitate = isHeadshot && isShotgun && isPointBlankShotgun;
      if (canDecapitate && !hitEnemy.headDestroyed) {
        hitEnemy.explodeHead(shotDir, enemyHitPoint);
      }
      hitEnemy.takeDamage(dmg, canDecapitate, shotDir, enemyHitPoint);
      showHitMarker();
      playHitSound();
    } else if (wallHitPoint) {
      targetDist = muzzleWorldPos.distanceTo(wallHitPoint);
      targetPoint = wallHitPoint;
      targetNormal = wallHitNormal;
    }

    // 4. Spawn high-velocity supersonic bullet projectile & tracer in 3D space
    spawnPlayerBullet(w.id, muzzleWorldPos, shotDir, targetDist, targetPoint, targetNormal, isEnemyHit);
  }

  // Start shotgun pump animation
  if (isShotgun && (w.ammo > 0 || isInfiniteAmmo)) {
    shotgunPumpActive = true;
    shotgunPumpTimer = 0;
    shotgunPumpSound1 = false;
    shotgunPumpSound2 = false;
  }

  // UZI Recoil
  if (w.id === 'uzi') {
    player.pitch = Math.min(1.45, player.pitch + 0.015);
    shakeIntensity = Math.min(0.08, shakeIntensity + 0.03);
  }

  if (w.ammo === 0 && !isInfiniteAmmo) startReload();
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
  document.getElementById('ammo-reserve').textContent = w.reserveAmmo; const sep = document.querySelector('.ammo-sep'); if (sep) sep.style.display = 'inline';

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

// Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬
//  RELOAD ANIMATION
// Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬
/**
 * Drives gunGroup position and rotation through per-weapon clunky keyframe phases
 * while isReloading is true. Called each frame from the weapon animation block.
 */
function updateReloadAnimation(dt, w) {
  // Ã¢â€â‚¬Ã¢â€â‚¬ Magazine / shell visual animation (always runs when reload is active) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  if (w.id === 'shotgun') {
    animateShotgunShell(dt, w);
  } else if (w.id !== 'bat') {
    animateMagazine(dt, w);
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ Body / rotation phase animation Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  const phases = RELOAD_ANIM[w.id];
  if (!phases || phases.length === 0) return;

  const ra = reloadAnim;
  const [rx, ry, rz] = WEAPON_REST[w.id];

  // All phases exhausted Ã¢â‚¬â€ idle lerp back toward rest while timer finishes
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
    if (phase.shake) shakeIntensity = Math.max(shakeIntensity, phase.shake);
    if (phase.sound === 'eject') playMagEject();
    if (phase.sound === 'slam') playBoltSlam();
  }

  ra.phaseTimer += dt;

  // Advance when phase duration expires
  if (ra.phaseTimer >= phase.dur) {
    ra.phase++;
    ra.phaseTimer = 0;
    return;
  }

  // Lerp gun toward phase target Ã¢â‚¬â€ high rate = clunky snap, low rate = slow drift
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
  const mag = gunGroup.userData.mag;
  const restY = gunGroup.userData.magRestY || 0;
  const DROP = gunGroup.userData.magDrop || 0.25;

  // progress: 0 = just started, 1 = finished
  const progress = 1 - (w.reloadTimer / w.reloadDuration);

  let targetY;
  if (progress < 0.22) {
    // Phase 1 Ã¢â‚¬â€ EJECT: mag snaps downward hard
    const t = progress / 0.22;
    targetY = restY - DROP * t;
  } else if (progress < 0.55) {
    // Phase 2 Ã¢â‚¬â€ OUT: fully ejected, held below the weapon
    targetY = restY - DROP;
  } else if (progress < 0.82) {
    // Phase 3 Ã¢â‚¬â€ INSERT: new mag punches upward and clicks in
    const t = (progress - 0.55) / 0.27;
    targetY = restY - DROP + DROP * t;
  } else {
    // Phase 4 Ã¢â‚¬â€ SEATED: perfectly in place
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
    const tip = new THREE.MeshLambertMaterial({ color: 0xdd3300 });
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

  const shell = reloadAnim.shell;
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
    // Shell slides across into the loading port (X Ã¢â€ â€™ centre, Z Ã¢â€ â€™ barrel)
    const t = (progress - 0.15) / 0.30;
    shell.visible = true;
    shell.position.set(
      0.10 - t * 0.115,   // right to centre
      -0.022 + t * 0.005, // very slight rise
      0.05 - t * 0.20    // toward barrel
    );
    if (hand) hand.position.copy(shell.position).add(new THREE.Vector3(-0.02, -0.02, 0));
  } else if (progress < 0.58) {
    // Shell is at the loading port Ã¢â‚¬â€ chambering pause
    shell.visible = true;
    shell.position.set(-0.015, -0.017, -0.15);
    if (hand) hand.position.copy(shell.position).add(new THREE.Vector3(-0.02, -0.02, 0));
  } else {
    // Chambered Ã¢â‚¬â€ shell disappears (inside the tube)
    shell.visible = false;
    if (hand && hRest) hand.position.lerp(hRest, Math.min(1, dt * 20));
  }
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
//  HUD EFFECTS
// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
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

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
//  INPUT SETUP
// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
function setupInput() {
  // Ã¢â€â‚¬Ã¢â€â‚¬ Keyboard Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  document.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (gameState === 'playing') {
      if (e.code === 'KeyR') startReload();
    if (e.code === 'Backquote' || e.code === 'F2') openAdminPanel();
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

  // Ã¢â€â‚¬Ã¢â€â‚¬ Desktop Mouse Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
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
            batState.isCharging = true;
            batState.chargeTime = 0;
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
        batState.isCharging = false;
        batState.windupActive = false;
        batState.chargeTime = 0;
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

  // Ã¢â€â‚¬Ã¢â€â‚¬ Mobile Touch Controls Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  if (isMobile) {
    setupMobileControls();
  }
}

// ─── MOBILE TOUCH CONTROL SETUP ───────────────────────────
function setupMobileControls() {
  const JOYSTICK_RADIUS = 50; // max distance knob travels
  const LOOK_SENS = 4.5; // pixels-per-radian multiplier for touch look

  const joystickZone = document.getElementById('joystick-zone');
  const joystickBase = document.getElementById('joystick-base');
  const joystickKnob = document.getElementById('joystick-knob');
  const lookZone = document.getElementById('look-zone');

  // ─── Joystick Zone ───────────────────────────────────────
  joystickZone.addEventListener('touchstart', e => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (joystick.active) continue;
      joystick.active = true;
      joystick.id = t.identifier;
      const rect = joystickZone.getBoundingClientRect();
      joystick.startX = t.clientX - rect.left;
      joystick.startY = t.clientY - rect.top;
      joystick.curX = joystick.startX;
      joystick.curY = joystick.startY;

      // Position joystick base at touch point
      joystickBase.style.left = joystick.startX + 'px';
      joystickBase.style.top = joystick.startY + 'px';
      joystickBase.classList.add('visible');

      // Centre knob initially
      joystickKnob.style.left = '50%';
      joystickKnob.style.top = '50%';
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
      joystickKnob.style.left = (60 + dx) + 'px';
      joystickKnob.style.top = (60 + dy) + 'px';
      joystickKnob.style.transform = 'translate(-50%, -50%)';
    }
  }, { passive: false });

  const endJoystick = e => {
    for (const t of e.changedTouches) {
      if (t.identifier !== joystick.id) continue;
      joystick.active = false;
      joystick.id = null;
      joystick.normX = 0;
      joystick.normY = 0;
      joystickBase.classList.remove('visible');
      joystickKnob.style.left = '50%';
      joystickKnob.style.top = '50%';
    }
  };
  joystickZone.addEventListener('touchend', endJoystick, { passive: false });
  joystickZone.addEventListener('touchcancel', endJoystick, { passive: false });

  // Ã¢â€â‚¬Ã¢â€â‚¬ Look Zone Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  lookZone.addEventListener('touchstart', e => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (lookTouch.active) continue;
      lookTouch.active = true;
      lookTouch.id = t.identifier;
      lookTouch.lastX = t.clientX;
      lookTouch.lastY = t.clientY;
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
      // 1 touch pixel Ã¢â€°Ë† LOOK_SENS mouse pixels of feel
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
      lookTouch.id = null;
    }
  };
  lookZone.addEventListener('touchend', endLook, { passive: false });
  lookZone.addEventListener('touchcancel', endLook, { passive: false });

  // Ã¢â€â‚¬Ã¢â€â‚¬ Action Buttons Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  const btnShoot = document.getElementById('btn-shoot');
  const btnReload = document.getElementById('btn-reload');
  const btnAds = document.getElementById('btn-ads');
  const btnPause = document.getElementById('btn-pause-mob');
  const btnJump = document.getElementById('btn-jump');

  if (btnJump) {
    btnJump.addEventListener('touchstart', e => {
      e.preventDefault();
      if (gameState !== 'playing') return;
      initAudio();
      keys['Space'] = true;
    }, { passive: false });
    btnJump.addEventListener('touchend', e => {
      e.preventDefault();
      keys['Space'] = false;
    }, { passive: false });
    btnJump.addEventListener('touchcancel', e => {
      e.preventDefault();
      keys['Space'] = false;
    }, { passive: false });
  }

  // Shoot Ã¢â‚¬â€ hold for auto, tap for semi, hold to charge bat
  btnShoot.addEventListener('touchstart', e => {
    e.preventDefault();
    if (gameState !== 'playing') return;
    initAudio();
    mouseDown = true;
    const w = cw();
    if (w.melee) {
      if (!batState.isSwinging) {
        batState.isCharging = true;
        batState.chargeTime = 0;
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
      batState.isCharging = false;
      batState.windupActive = false;
      batState.chargeTime = 0;
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

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
//  PLAYER UPDATE  (called every frame while playing)
// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
function updatePlayer(dt) {
  if (!player.alive) return;

  // Ã¢â€â‚¬Ã¢â€â‚¬ Mouse look
  const sens = 0.0022;
  player.yaw -= mouseDeltaX * sens;
  player.pitch = Math.max(-1.45, Math.min(1.45, player.pitch - mouseDeltaY * sens));
  mouseDeltaX = 0;
  mouseDeltaY = 0;

  camera.rotation.order = 'YXZ';
  camera.rotation.y = player.yaw;
  camera.rotation.x = player.pitch;

  // Ã¢â€â‚¬Ã¢â€â‚¬ Movement vectors (XZ only; gravity handles Y)
  const sy = Math.sin(player.yaw);
  const cy = Math.cos(player.yaw);
  const fwdX = -sy; const fwdZ = -cy;   // forward
  const rgtX = cy; const rgtZ = -sy;   // right

  // Movement Ã¢â‚¬â€ keyboard or virtual joystick
  const mZ = (keys['KeyW'] ? 1 : 0) - (keys['KeyS'] ? 1 : 0) + (joystick.active ? -joystick.normY : 0);
  const mX = (keys['KeyD'] ? 1 : 0) - (keys['KeyA'] ? 1 : 0) + (joystick.active ? joystick.normX : 0);

  let movX = fwdX * mZ + rgtX * mX;
  let movZ = fwdZ * mZ + rgtZ * mX;
  const movLen = Math.sqrt(movX * movX + movZ * movZ);
  if (movLen > 0) { movX /= movLen; movZ /= movLen; }

  const isSprint = keys['ShiftLeft'] && movLen > 0;
  const isCrouch = keys['ControlLeft'];
  const spd = isSprint ? 8.5 : (isCrouch ? 2.5 : 5.5);

  // Ã¢â€â‚¬Ã¢â€â‚¬ Horizontal movement (axis-split collision)
  const nx = camera.position.x + movX * spd * dt;
  const nz = camera.position.z + movZ * spd * dt;

  if (!playerCollidesAt(nx, camera.position.y, camera.position.z)) camera.position.x = nx;
  if (!playerCollidesAt(camera.position.x, camera.position.y, nz)) camera.position.z = nz;

  // Ã¢â€â‚¬Ã¢â€â‚¬ Gravity
  playerVelY += GRAVITY * dt;
  camera.position.y += playerVelY * dt;
  const eyeH = isCrouch ? player.crouchEyeHeight : player.eyeHeight;

  isOnGround = camera.position.y <= eyeH;
  if (isOnGround) {
    camera.position.y = eyeH;
    playerVelY = 0;
    if (keys['Space']) {
      playerVelY = JUMP_SPEED;
      isOnGround = false;
      playJumpSound();
    }
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ Arena boundary clamp (keeps player inside outer walls)
  const BOUND = 37.3;
  camera.position.x = Math.max(-BOUND, Math.min(BOUND, camera.position.x));
  camera.position.z = Math.max(-BOUND, Math.min(BOUND, camera.position.z));

  // Ã¢â€â‚¬Ã¢â€â‚¬ Shooting & Bat Charging
  player.shootCooldown = Math.max(0, player.shootCooldown - dt);
  const w = cw();
  if (mouseDown && w.auto) playerShoot();

  // Ã¢â€â‚¬Ã¢â€â‚¬ Bat Charge Meter UI
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

  // Ã¢â€â‚¬Ã¢â€â‚¬ Reload timer
  if (w.isReloading) {
    w.reloadTimer -= dt;
    if (w.reloadTimer <= 0) finishReload();
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ Weapon-switch slide-in animation
  if (isSwitchingWeapon) {
    switchTimer = Math.max(0, switchTimer - dt);
    const [rx, ry, rz] = WEAPON_REST[cw().id];
    if (gunGroup && gunGroup.visible) {
      // Slide up from below
      gunGroup.position.y += (ry - gunGroup.position.y) * dt * 18;
    }
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ Weapon animation
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
        // Ã¢â€â‚¬Ã¢â€â‚¬ Clunky reload animation drives everything
        updateReloadAnimation(dt, w);
      } else {
        // Ã¢â€â‚¬Ã¢â€â‚¬ Weapon spring recoil simulation Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
        // Drives camera pitch, gun Z position, gun rotation.x and .z
        // via a damped spring: a = -k*x - c*v
        const k = weaponRecoil.stiffness;
        const c = weaponRecoil.damping;

        // Pitch spring
        weaponRecoil.pitchVel += (-k * weaponRecoil.pitchDisp - c * weaponRecoil.pitchVel) * dt;
        weaponRecoil.pitchDisp += weaponRecoil.pitchVel * dt;

        // Z spring
        weaponRecoil.zVel += (-k * weaponRecoil.zDisp - c * weaponRecoil.zVel) * dt;
        weaponRecoil.zDisp += weaponRecoil.zVel * dt;

        // Rotation.x spring
        weaponRecoil.rotVel += (-k * weaponRecoil.rotDisp - c * weaponRecoil.rotVel) * dt;
        weaponRecoil.rotDisp += weaponRecoil.rotVel * dt;

        // Lateral (rotation.z) spring
        weaponRecoil.latVel += (-k * weaponRecoil.latDisp - c * weaponRecoil.latVel) * dt;
        weaponRecoil.latDisp += weaponRecoil.latVel * dt;

        // Apply to camera pitch Ã¢â‚¬â€ add spring displacement as a direct offset
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
          const dur = batState.isCharged ? 0.55 : 0.32;
          const prog = Math.min(batState.swingTimer / dur, 1);

          if (batState.isCharged) {
            // Ã¢â€â‚¬Ã¢â€â‚¬ CHARGED: dramatic top-down overhead slam Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
            // Wind up (rotate back/up), then slam forward
            const windUpEnd = 0.35;
            if (prog < windUpEnd) {
              const t = prog / windUpEnd;
              gunGroup.rotation.x = t * 1.6;  // bat swings back over shoulder
              gunGroup.rotation.y = -t * 0.5;
              gunGroup.rotation.z = t * 0.4;
            } else {
              const t = (prog - windUpEnd) / (1 - windUpEnd);
              const slam = Math.sin(t * Math.PI); // in-out arc
              gunGroup.rotation.x = 1.6 - t * 2.8;  // slam forward past neutral
              gunGroup.rotation.y = -0.5 + t * 0.8;
              gunGroup.rotation.z = 0.4 - t * 0.6;
            }
          } else {
            // Ã¢â€â‚¬Ã¢â€â‚¬ WEAK: fast horizontal side-swipe Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
            const swingAngle = Math.sin(prog * Math.PI) * 1.4;
            gunGroup.rotation.y = swingAngle;
            gunGroup.rotation.z = -swingAngle * 0.25;
            gunGroup.rotation.x = swingAngle * 0.15;
          }

          if (prog >= 1) {
            batState.isSwinging = false;
            gunGroup.rotation.set(0, 0, 0);
          }

        } else if (w.melee && batState.isCharging) {
          // Ã¢â€â‚¬Ã¢â€â‚¬ WIND-UP POSE: bat slowly pulls back as charge builds Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
          const chargeRatio = Math.min(batState.chargeTime / batState.chargeDuration, 1);
          // Ease-in: slow pull-back at first, snaps to ready at full charge
          const ease = chargeRatio * chargeRatio;
          gunGroup.rotation.x = ease * 1.4;   // pull back along X
          gunGroup.rotation.y = -ease * 0.35;
          gunGroup.rotation.z = ease * 0.3;
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
                  spawnEjectedShell(gunGroup, 'shotgun');
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

  // Ã¢â€â‚¬Ã¢â€â‚¬ Screen shake
  if (shakeIntensity > 0) {
    camera.position.x += (Math.random() - 0.5) * shakeIntensity;
    camera.position.y += (Math.random() - 0.5) * shakeIntensity * 0.3;
    shakeIntensity *= (1 - dt * 9);
    if (shakeIntensity < 0.001) shakeIntensity = 0;
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ Low-health vignette
  const lvEl = document.getElementById('low-health-vignette');
  if (player.health < 30) {
    lvEl.style.opacity = String(0.3 + Math.sin(Date.now() * 0.004) * 0.15);
  } else {
    lvEl.style.opacity = '0';
  }
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
//  PROJECTILE UPDATE
// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
function updateProjectiles(dt) {
  for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
    const p = enemyProjectiles[i];
    p.mesh.position.x += p.dir.x * p.speed * dt;
    p.mesh.position.y += p.dir.y * p.speed * dt;
    p.mesh.position.z += p.dir.z * p.speed * dt;
    p.life -= dt;

    // Player hit (sphere vs camera position)
    // Boss sniper bullet damage is handled via setTimeout in _fireSniperShot — skip double-hit here
    if (!p.isBossSniper && p.mesh.position.distanceTo(camera.position) < 0.58) {
      if (!isGodMode) player.health = Math.max(0, player.health - p.damage);
      showDamageOverlay();
      updateHealthHUD();
      scene.remove(p.mesh);
      enemyProjectiles.splice(i, 1);
      if (player.health <= 0 && player.alive) triggerGameOver();
      continue;
    } else if (p.isBossSniper && p.mesh.position.distanceTo(camera.position) < 0.9) {
      // Tracer reaches player position — destroy visually (damage already applied above)
      scene.remove(p.mesh);
      enemyProjectiles.splice(i, 1);
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

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
//  GAME FLOW
// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
function startGame() {
  const bossHud = document.getElementById('boss-hud');
  if (bossHud) bossHud.classList.add('hidden');
  const warnEl = document.getElementById('laser-lock-warning');
  if (warnEl) warnEl.classList.add('hidden');
  // Ã¢â€â‚¬Ã¢â€â‚¬ Read & apply map selection
  const mapSelectEl = document.getElementById('map-select');
  if (mapSelectEl) selectedMap = mapSelectEl.value;

  // Ã¢â€â‚¬Ã¢â€â‚¬ Tear down previous level geometry
  levelMeshes.forEach(m => scene.remove(m));
  levelMeshes.length = 0;
  playerBullets.forEach(b => scene.remove(b.mesh));
  playerBullets.length = 0;
  bulletSparks.forEach(s => scene.remove(s.mesh));
  bulletSparks.length = 0;
  impactSmokes.forEach(s => scene.remove(s.mesh));
  impactSmokes.length = 0;
  bulletHoles.forEach(h => scene.remove(h.mesh));
  bulletHoles.length = 0;
  goreGibs.forEach(g => scene.remove(g.mesh));
  goreGibs.length = 0;
  bloodFountainParticles.forEach(b => scene.remove(b.mesh));
  bloodFountainParticles.length = 0;
  bloodPuddles.forEach(p => scene.remove(p.mesh));
  bloodPuddles.length = 0;
  ejectedShells.forEach(s => {
    if (weaponScene) {
      weaponScene.remove(s.mesh);
    }
  });
  ejectedShells.length = 0;
  muzzleSmokes.forEach(s => scene.remove(s.mesh));
  muzzleSmokes.length = 0;
  // Remove level-owned lights (directional/ambient are re-added per createLevel call)
  // Reset collidables to only the boundary entries; safest is to clear all static entries
  collidables.length = 0;
  vehicleColliders.length = 0;

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

  // All enemies dead - restore player to full max health
  player.health = player.maxHealth;
  updateHealthHUD();

  // Hide boss HUD elements
  const bossHud = document.getElementById('boss-hud');
  if (bossHud) bossHud.classList.add('hidden');
  const warnEl = document.getElementById('laser-lock-warning');
  if (warnEl) warnEl.classList.add('hidden');

  gameState = 'wavecomplete';
  if (!isMobile) document.exitPointerLock();
  document.getElementById('click-to-start').style.display = 'none';

  if (wave === 10) {
    document.getElementById('wave-complete-text').textContent =
      `APEX SNIPER BOSS ELIMINATED! You conquered Wave 10!`;
  } else {
    document.getElementById('wave-complete-text').textContent =
      `Wave ${wave} cleared!  ${enemies.length} enemies eliminated.`;
  }
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

      // Ensure landscape reverts to normal map after wave 10 (or loads boss arena for 10)
      ensureCorrectLevelForWave(wave);

      // Full health restoration after every wave
      player.health = player.maxHealth;

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
  const bossHud = document.getElementById('boss-hud');
  if (bossHud) bossHud.classList.add('hidden');
  const warnEl = document.getElementById('laser-lock-warning');
  if (warnEl) warnEl.classList.add('hidden');
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
  muzzleSmokes.forEach(s => scene.remove(s.mesh));
  muzzleSmokes.length = 0;
  if (!isMobile) document.exitPointerLock();
  gameState = 'menu';
}

// â”€â”€â”€ PLAYER BULLETS, BALLISTICS & CASING EJECTION SYSTEM â”€â”€â”€
const ejectedShells = [];
const muzzleSmokes = [];
const playerBullets = [];
const bulletSparks = [];
const impactSmokes = [];
const bulletHoles = [];
const goreGibs = [];
const bloodFountainParticles = [];
const bloodPuddles = [];

/** Spawn flying skull, bone and brain gibs when head explodes */
function spawnGoreGibs(origin, shotDir) {
  const boneMat = new THREE.MeshLambertMaterial({ color: 0xe0d6c4 });
  const fleshMat = new THREE.MeshLambertMaterial({ color: 0x6e0808 });
  const darkMeatMat = new THREE.MeshLambertMaterial({ color: 0x420000 });

  const numGibs = 9 + Math.floor(Math.random() * 4);
  for (let i = 0; i < numGibs; i++) {
    const isBone = i % 3 === 0;
    const mat = isBone ? boneMat : (i % 2 === 0 ? fleshMat : darkMeatMat);
    const sx = 0.08 + Math.random() * 0.12;
    const sy = 0.08 + Math.random() * 0.12;
    const sz = 0.08 + Math.random() * 0.12;
    const gib = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);

    gib.position.copy(origin).add(new THREE.Vector3(
      (Math.random() - 0.5) * 0.25,
      (Math.random() - 0.5) * 0.25,
      (Math.random() - 0.5) * 0.25
    ));

    scene.add(gib);

    // Violent explosive scatter along shotgun blast + upward burst
    const vel = shotDir.clone().multiplyScalar(4.0 + Math.random() * 6.0).add(new THREE.Vector3(
      (Math.random() - 0.5) * 4.5,
      3.0 + Math.random() * 4.0,
      (Math.random() - 0.5) * 4.5
    ));

    const rotVel = new THREE.Vector3(
      (Math.random() - 0.5) * 18,
      (Math.random() - 0.5) * 18,
      (Math.random() - 0.5) * 18
    );

    goreGibs.push({
      mesh: gib,
      vel: vel,
      rotVel: rotVel,
      gravity: -16.0,
      life: 8.0,
      onGround: false
    });
  }
}

function updateGoreGibs(dt) {
  for (let i = goreGibs.length - 1; i >= 0; i--) {
    const g = goreGibs[i];
    if (!g.onGround) {
      g.vel.y += g.gravity * dt;
      g.mesh.position.addScaledVector(g.vel, dt);
      g.mesh.rotation.x += g.rotVel.x * dt;
      g.mesh.rotation.y += g.rotVel.y * dt;
      g.mesh.rotation.z += g.rotVel.z * dt;

      // Hit floor
      if (g.mesh.position.y <= 0.06) {
        g.mesh.position.y = 0.06;
        g.onGround = true;
        g.vel.set(0, 0, 0);
        g.rotVel.set(0, 0, 0);
        spawnBloodPuddle(g.mesh.position.x, g.mesh.position.z, 0.2 + Math.random() * 0.25);
      }
    }
    g.life -= dt;
    if (g.life < 2.0 && g.mesh.material) {
      g.mesh.material.opacity = Math.max(0, g.life / 2.0);
      g.mesh.material.transparent = true;
    }
    if (g.life <= 0) {
      scene.remove(g.mesh);
      goreGibs.splice(i, 1);
    }
  }
}

/** Spawn massive blood fountain & droplet spray */
function spawnBloodFountain(origin, shotDir) {
  const bloodColors = [0x8a0303, 0xaa0000, 0x5e0000, 0xb80c0c];

  const numDrops = 60 + Math.floor(Math.random() * 20);
  for (let i = 0; i < numDrops; i++) {
    const color = bloodColors[Math.floor(Math.random() * bloodColors.length)];
    const size = 0.035 + Math.random() * 0.045;
    const drop = new THREE.Mesh(
      new THREE.BoxGeometry(size, size, size),
      new THREE.MeshBasicMaterial({ color: color })
    );

    drop.position.copy(origin).add(new THREE.Vector3(
      (Math.random() - 0.5) * 0.2,
      (Math.random() - 0.5) * 0.2,
      (Math.random() - 0.5) * 0.2
    ));

    scene.add(drop);

    // Mix of upward fountain jet (from neck stump) + forward shotgun blast cone
    let vel;
    if (i < 30) {
      // High-pressure upward fountain erupting from neck
      vel = new THREE.Vector3(
        (Math.random() - 0.5) * 3.5,
        4.5 + Math.random() * 5.5,
        (Math.random() - 0.5) * 3.5
      );
    } else {
      // Directional blood spray blasted backward by shotgun pellets
      vel = shotDir.clone().multiplyScalar(5.5 + Math.random() * 7.5).add(new THREE.Vector3(
        (Math.random() - 0.5) * 4.0,
        1.5 + Math.random() * 4.0,
        (Math.random() - 0.5) * 4.0
      ));
    }

    bloodFountainParticles.push({
      mesh: drop,
      vel: vel,
      gravity: -14.5,
      life: 0.8 + Math.random() * 0.7,
      maxLife: 1.5,
      size: size
    });
  }
}

function updateBloodFountain(dt) {
  for (let i = bloodFountainParticles.length - 1; i >= 0; i--) {
    const p = bloodFountainParticles[i];
    p.vel.y += p.gravity * dt;
    p.mesh.position.addScaledVector(p.vel, dt);
    p.life -= dt;

    // Floor impact creates blood splatters
    if (p.mesh.position.y <= 0.03) {
      spawnBloodPuddle(p.mesh.position.x, p.mesh.position.z, 0.12 + Math.random() * 0.18);
      scene.remove(p.mesh);
      bloodFountainParticles.splice(i, 1);
      continue;
    }

    if (p.life <= 0) {
      scene.remove(p.mesh);
      bloodFountainParticles.splice(i, 1);
    }
  }
}

/** Spawn blood puddle decal on floor */
function spawnBloodPuddle(x, z, radius = 0.2) {
  if (bloodPuddles.length > 80) {
    const old = bloodPuddles.shift();
    scene.remove(old.mesh);
  }

  const pGeo = new THREE.PlaneGeometry(radius * 2, radius * 2);
  const pMat = new THREE.MeshBasicMaterial({
    color: Math.random() > 0.4 ? 0x5a0000 : 0x400000,
    transparent: true,
    opacity: 0.88,
    depthWrite: false
  });
  const puddle = new THREE.Mesh(pGeo, pMat);
  puddle.position.set(x, 0.015, z);
  puddle.rotation.x = -Math.PI / 2;
  puddle.rotation.z = Math.random() * Math.PI * 2;

  scene.add(puddle);
  bloodPuddles.push({ mesh: puddle, life: 16.0 });
}


function updateBloodPuddles(dt) {
  for (let i = bloodPuddles.length - 1; i >= 0; i--) {
    const p = bloodPuddles[i];
    p.life -= dt;
    if (p.life < 3.0 && p.mesh.material) {
      p.mesh.material.opacity = Math.max(0, (p.life / 3.0) * 0.88);
    }
    if (p.life <= 0) {
      scene.remove(p.mesh);
      bloodPuddles.splice(i, 1);
    }
  }
}

/** Compute the world position of the player's weapon muzzle */
function getPlayerMuzzleWorldPos() {
  const fwd = new THREE.Vector3(0, 0, -1).applyEuler(camera.rotation);
  const rgt = new THREE.Vector3(1, 0, 0).applyEuler(camera.rotation);
  const up = new THREE.Vector3(0, 1, 0).applyEuler(camera.rotation);

  if (isAds) {
    return camera.position.clone()
      .addScaledVector(fwd, 0.75)
      .addScaledVector(up, -0.05);
  } else {
    return camera.position.clone()
      .addScaledVector(fwd, 0.68)
      .addScaledVector(rgt, 0.22)
      .addScaledVector(up, -0.14);
  }
}

/** Compute outward face normal for an axis-aligned box collision */
function getBoxHitNormal(box, pt) {
  const center = new THREE.Vector3();
  box.getCenter(center);
  const size = new THREE.Vector3();
  box.getSize(size);
  const local = pt.clone().sub(center);
  const half = size.clone().multiplyScalar(0.5);

  const dx = Math.abs(Math.abs(local.x) - half.x);
  const dy = Math.abs(Math.abs(local.y) - half.y);
  const dz = Math.abs(Math.abs(local.z) - half.z);

  const normal = new THREE.Vector3(0, 1, 0);
  if (dx <= dy && dx <= dz) {
    normal.set(Math.sign(local.x) || 1, 0, 0);
  } else if (dy <= dx && dy <= dz) {
    normal.set(0, Math.sign(local.y) || 1, 0);
  } else {
    normal.set(0, 0, Math.sign(local.z) || 1);
  }
  return normal;
}

// ─── REALISTIC WEAPON CASING & SHELL MATERIALS CACHE ───
const SHELL_MATS = {
  brass: new THREE.MeshStandardMaterial({
    color: 0xdfa028,
    metalness: 0.94,
    roughness: 0.20,
  }),
  brassMirror: new THREE.MeshStandardMaterial({
    color: 0xe8b835,
    metalness: 0.96,
    roughness: 0.15,
  }),
  darkBrass: new THREE.MeshStandardMaterial({
    color: 0xb87d20,
    metalness: 0.88,
    roughness: 0.32,
  }),
  heatAnnealed: new THREE.MeshStandardMaterial({
    color: 0xa87028,
    metalness: 0.82,
    roughness: 0.40,
  }),
  scorchedNeck: new THREE.MeshStandardMaterial({
    color: 0x4a3a22,
    metalness: 0.70,
    roughness: 0.58,
  }),
  primerNickel: new THREE.MeshStandardMaterial({
    color: 0xcccccc,
    metalness: 0.92,
    roughness: 0.25,
  }),
  primerDimple: new THREE.MeshBasicMaterial({
    color: 0x1a1a1a,
  }),
  shotgunHullRed: new THREE.MeshStandardMaterial({
    color: 0x9e1a1a,
    metalness: 0.08,
    roughness: 0.38,
  }),
  shotgunHullRib: new THREE.MeshStandardMaterial({
    color: 0x821313,
    metalness: 0.06,
    roughness: 0.45,
  }),
  shotgunInnerWad: new THREE.MeshBasicMaterial({
    color: 0x14100c,
  }),
  hollowMouth: new THREE.MeshBasicMaterial({
    color: 0x0a0a0a,
  }),
  smoke: new THREE.MeshBasicMaterial({
    color: 0xcccccc,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
    side: THREE.DoubleSide
  })
};

/** Build realistic 12-Gauge Shotgun Shell (High-Brass, Ribbed Plastic Hull, Star Crimp & Inner Wad) */
function buildShotgunShellMesh() {
  const g = new THREE.Group();

  // 1. High-Brass Head / Base
  const brassHead = new THREE.Mesh(new THREE.CylinderGeometry(0.0104, 0.0104, 0.014, 12), SHELL_MATS.brass);
  brassHead.rotation.x = Math.PI / 2;
  brassHead.position.z = 0.018;
  g.add(brassHead);

  // 2. Extractor Rim Flange at bottom of brass head
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.0116, 0.0116, 0.0032, 12), SHELL_MATS.brass);
  rim.rotation.x = Math.PI / 2;
  rim.position.z = 0.024;
  g.add(rim);

  // 3. Extractor Groove (relief band just ahead of rim)
  const groove = new THREE.Mesh(new THREE.CylinderGeometry(0.0098, 0.0098, 0.002, 12), SHELL_MATS.darkBrass);
  groove.rotation.x = Math.PI / 2;
  groove.position.z = 0.0215;
  g.add(groove);

  // 4. Centered Primer Cap & Firing Pin Strike Mark
  const primer = new THREE.Mesh(new THREE.CylinderGeometry(0.0038, 0.0038, 0.001, 8), SHELL_MATS.primerNickel);
  primer.rotation.x = Math.PI / 2;
  primer.position.z = 0.0256;
  g.add(primer);

  const dimple = new THREE.Mesh(new THREE.CylinderGeometry(0.0014, 0.0014, 0.0015, 6), SHELL_MATS.primerDimple);
  dimple.rotation.x = Math.PI / 2;
  dimple.position.z = 0.0258;
  g.add(dimple);

  // 5. Ribbed Plastic Hull Tube (Crimson Red)
  const plasticBody = new THREE.Mesh(new THREE.CylinderGeometry(0.0102, 0.0102, 0.036, 12), SHELL_MATS.shotgunHullRed);
  plasticBody.rotation.x = Math.PI / 2;
  plasticBody.position.z = -0.007;
  g.add(plasticBody);

  // 6. Hull Ribbing bands (tactile grooves characteristic of 12g shells)
  [-0.018, -0.012, -0.006, 0.000, 0.006].forEach(zPos => {
    const rib = new THREE.Mesh(new THREE.CylinderGeometry(0.0105, 0.0105, 0.0018, 12), SHELL_MATS.shotgunHullRib);
    rib.rotation.x = Math.PI / 2;
    rib.position.z = zPos;
    g.add(rib);
  });

  // 7. Spent Star Crimp / Flared Mouth Lip
  const mouthLip = new THREE.Mesh(new THREE.CylinderGeometry(0.0106, 0.0100, 0.004, 12), SHELL_MATS.shotgunHullRib);
  mouthLip.rotation.x = Math.PI / 2;
  mouthLip.position.z = -0.026;
  g.add(mouthLip);

  // 8. Dark Interior / Spent Plastic Wad Cup inside mouth
  const innerWad = new THREE.Mesh(new THREE.CylinderGeometry(0.0086, 0.0086, 0.002, 10), SHELL_MATS.shotgunInnerWad);
  innerWad.rotation.x = Math.PI / 2;
  innerWad.position.z = -0.0265;
  g.add(innerWad);

  return g;
}

/** Build 5.56x45mm NATO Assault Rifle Brass Casing */
function buildRifleShellMesh() {
  const g = new THREE.Group();

  // Tapered Casing Body
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.0056, 0.0063, 0.026, 10), SHELL_MATS.brass);
  body.rotation.x = Math.PI / 2;
  body.position.z = -0.005;
  g.add(body);

  // Bottleneck Shoulder Cone
  const shoulder = new THREE.Mesh(new THREE.CylinderGeometry(0.0042, 0.0056, 0.006, 10), SHELL_MATS.brass);
  shoulder.rotation.x = Math.PI / 2;
  shoulder.position.z = -0.0205;
  g.add(shoulder);

  // Neck Tube with Heat-Annealed Finish
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.0042, 0.0042, 0.007, 10), SHELL_MATS.heatAnnealed);
  neck.rotation.x = Math.PI / 2;
  neck.position.z = -0.0265;
  g.add(neck);

  // Hollow Open Mouth
  const mouth = new THREE.Mesh(new THREE.CylinderGeometry(0.0032, 0.0032, 0.001, 8), SHELL_MATS.hollowMouth);
  mouth.rotation.x = Math.PI / 2;
  mouth.position.z = -0.030;
  g.add(mouth);

  // Extractor Groove
  const groove = new THREE.Mesh(new THREE.CylinderGeometry(0.0052, 0.0052, 0.0025, 10), SHELL_MATS.darkBrass);
  groove.rotation.x = Math.PI / 2;
  groove.position.z = 0.009;
  g.add(groove);

  // Extractor Rim Flange
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.0066, 0.0066, 0.003, 10), SHELL_MATS.brass);
  rim.rotation.x = Math.PI / 2;
  rim.position.z = 0.0115;
  g.add(rim);

  // Primer Cap & Strike Mark
  const primer = new THREE.Mesh(new THREE.CylinderGeometry(0.0024, 0.0024, 0.0008, 8), SHELL_MATS.primerNickel);
  primer.rotation.x = Math.PI / 2;
  primer.position.z = 0.0131;
  g.add(primer);

  const dimple = new THREE.Mesh(new THREE.CylinderGeometry(0.0009, 0.0009, 0.001, 6), SHELL_MATS.primerDimple);
  dimple.rotation.x = Math.PI / 2;
  dimple.position.z = 0.0133;
  g.add(dimple);

  return g;
}

/** Build .338 Lapua Magnum Heavy Sniper Casing */
function buildSniperShellMesh() {
  const g = new THREE.Group();

  // Heavy Tapered Body
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.0076, 0.0086, 0.038, 12), SHELL_MATS.brass);
  body.rotation.x = Math.PI / 2;
  body.position.z = -0.007;
  g.add(body);

  // Sharp Shoulder Cone
  const shoulder = new THREE.Mesh(new THREE.CylinderGeometry(0.0052, 0.0076, 0.0075, 12), SHELL_MATS.brass);
  shoulder.rotation.x = Math.PI / 2;
  shoulder.position.z = -0.029;
  g.add(shoulder);

  // Extended Neck with Scorched Powder Tip
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.0052, 0.0052, 0.009, 12), SHELL_MATS.scorchedNeck);
  neck.rotation.x = Math.PI / 2;
  neck.position.z = -0.0368;
  g.add(neck);

  // Hollow Mouth
  const mouth = new THREE.Mesh(new THREE.CylinderGeometry(0.0042, 0.0042, 0.001, 8), SHELL_MATS.hollowMouth);
  mouth.rotation.x = Math.PI / 2;
  mouth.position.z = -0.0414;
  g.add(mouth);

  // Deep Extractor Cannelure Groove
  const groove = new THREE.Mesh(new THREE.CylinderGeometry(0.0070, 0.0070, 0.003, 12), SHELL_MATS.darkBrass);
  groove.rotation.x = Math.PI / 2;
  groove.position.z = 0.0132;
  g.add(groove);

  // Heavy Rim Base
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.0088, 0.0088, 0.0038, 12), SHELL_MATS.brass);
  rim.rotation.x = Math.PI / 2;
  rim.position.z = 0.0165;
  g.add(rim);

  // Large Magnum Primer
  const primer = new THREE.Mesh(new THREE.CylinderGeometry(0.0034, 0.0034, 0.001, 8), SHELL_MATS.primerNickel);
  primer.rotation.x = Math.PI / 2;
  primer.position.z = 0.0185;
  g.add(primer);

  const dimple = new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.0012, 0.0012, 6), SHELL_MATS.primerDimple);
  dimple.rotation.x = Math.PI / 2;
  dimple.position.z = 0.0187;
  g.add(dimple);

  return g;
}

/** Build .50 Action Express Magnum Casing (Desert Eagle) */
function buildDeagleShellMesh() {
  const g = new THREE.Group();

  // Chunky Straight-Wall Body (Mirror Polished Brass)
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.0085, 0.0088, 0.026, 12), SHELL_MATS.brassMirror);
  body.rotation.x = Math.PI / 2;
  body.position.z = -0.002;
  g.add(body);

  // Chamfered Open Mouth
  const mouth = new THREE.Mesh(new THREE.CylinderGeometry(0.0072, 0.0072, 0.001, 10), SHELL_MATS.hollowMouth);
  mouth.rotation.x = Math.PI / 2;
  mouth.position.z = -0.0152;
  g.add(mouth);

  // Undercut Extractor Groove
  const groove = new THREE.Mesh(new THREE.CylinderGeometry(0.0068, 0.0068, 0.0026, 12), SHELL_MATS.darkBrass);
  groove.rotation.x = Math.PI / 2;
  groove.position.z = 0.012;
  g.add(groove);

  // Signature .50 AE Rebated Rim (narrower than body diameter)
  const rebatedRim = new THREE.Mesh(new THREE.CylinderGeometry(0.0078, 0.0078, 0.003, 12), SHELL_MATS.brassMirror);
  rebatedRim.rotation.x = Math.PI / 2;
  rebatedRim.position.z = 0.0146;
  g.add(rebatedRim);

  // Large Magnum Primer
  const primer = new THREE.Mesh(new THREE.CylinderGeometry(0.0032, 0.0032, 0.001, 8), SHELL_MATS.primerNickel);
  primer.rotation.x = Math.PI / 2;
  primer.position.z = 0.0162;
  g.add(primer);

  const dimple = new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.0012, 0.0012, 6), SHELL_MATS.primerDimple);
  dimple.rotation.x = Math.PI / 2;
  dimple.position.z = 0.0164;
  g.add(dimple);

  return g;
}

/** Build 9x19mm Parabellum Standard Pistol Casing */
function buildPistolShellMesh() {
  const g = new THREE.Group();

  // Compact 9mm Tapered Body
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.0048, 0.0052, 0.018, 10), SHELL_MATS.brass);
  body.rotation.x = Math.PI / 2;
  body.position.z = -0.002;
  g.add(body);

  // Hollow Mouth
  const mouth = new THREE.Mesh(new THREE.CylinderGeometry(0.0038, 0.0038, 0.001, 8), SHELL_MATS.hollowMouth);
  mouth.rotation.x = Math.PI / 2;
  mouth.position.z = -0.0112;
  g.add(mouth);

  // Extractor Groove
  const groove = new THREE.Mesh(new THREE.CylinderGeometry(0.0043, 0.0043, 0.002, 10), SHELL_MATS.darkBrass);
  groove.rotation.x = Math.PI / 2;
  groove.position.z = 0.0078;
  g.add(groove);

  // Base Rim
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0055, 0.0022, 10), SHELL_MATS.brass);
  rim.rotation.x = Math.PI / 2;
  rim.position.z = 0.0098;
  g.add(rim);

  // Boxer Primer
  const primer = new THREE.Mesh(new THREE.CylinderGeometry(0.0021, 0.0021, 0.0008, 8), SHELL_MATS.primerNickel);
  primer.rotation.x = Math.PI / 2;
  primer.position.z = 0.0110;
  g.add(primer);

  const dimple = new THREE.Mesh(new THREE.CylinderGeometry(0.0008, 0.0008, 0.001, 6), SHELL_MATS.primerDimple);
  dimple.rotation.x = Math.PI / 2;
  dimple.position.z = 0.0112;
  g.add(dimple);

  return g;
}

/** Build 9mm Submachine Gun Casing (UZI) */
function buildUziShellMesh() {
  const g = new THREE.Group();

  // Compact Heat-Worn 9mm Body
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.0047, 0.0051, 0.017, 10), SHELL_MATS.darkBrass);
  body.rotation.x = Math.PI / 2;
  body.position.z = -0.002;
  g.add(body);

  // Scorched Mouth Rim
  const mouth = new THREE.Mesh(new THREE.CylinderGeometry(0.0037, 0.0037, 0.001, 8), SHELL_MATS.scorchedNeck);
  mouth.rotation.x = Math.PI / 2;
  mouth.position.z = -0.0108;
  g.add(mouth);

  // Extractor Groove
  const groove = new THREE.Mesh(new THREE.CylinderGeometry(0.0042, 0.0042, 0.002, 10), SHELL_MATS.scorchedNeck);
  groove.rotation.x = Math.PI / 2;
  groove.position.z = 0.0074;
  g.add(groove);

  // Base Rim
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.0054, 0.0054, 0.0022, 10), SHELL_MATS.darkBrass);
  rim.rotation.x = Math.PI / 2;
  rim.position.z = 0.0093;
  g.add(rim);

  // Primer
  const primer = new THREE.Mesh(new THREE.CylinderGeometry(0.0020, 0.0020, 0.0008, 8), SHELL_MATS.primerNickel);
  primer.rotation.x = Math.PI / 2;
  primer.position.z = 0.0105;
  g.add(primer);

  const dimple = new THREE.Mesh(new THREE.CylinderGeometry(0.0008, 0.0008, 0.001, 6), SHELL_MATS.primerDimple);
  dimple.rotation.x = Math.PI / 2;
  dimple.position.z = 0.0107;
  g.add(dimple);

  return g;
}

/** Eject realistic spent brass shell casing matching real firearm caliber mechanics */
function spawnEjectedShell(wGroup, weaponId = 'shotgun') {
  if (!wGroup) return;

  const shellGroup = new THREE.Group();
  let vel, rotVel, life = 1.6;
  let offset = new THREE.Vector3(0.05, 0.02, -0.08);

  if (weaponId === 'shotgun') {
    shellGroup.add(buildShotgunShellMesh());
    offset.set(0.048, 0.025, -0.08);
    life = 2.0;

    // Satisfying pump-action ejection arc: flips outward to the right, slightly up and back
    vel = new THREE.Vector3(
      1.5 + Math.random() * 0.4,
      1.1 + Math.random() * 0.3,
      0.35 + Math.random() * 0.3
    );
    rotVel = new THREE.Vector3(
      (Math.random() - 0.5) * 16,
      (Math.random() - 0.5) * 14,
      8.0 + Math.random() * 6.0
    );
  } else if (weaponId === 'rifle') {
    shellGroup.add(buildRifleShellMesh());
    offset.set(0.065, 0.03, -0.12);
    life = 1.7;

    // High velocity gas-operated extraction: flips vigorously to the right (+X), up (+Y), and back (+Z)
    vel = new THREE.Vector3(
      2.3 + Math.random() * 0.6,
      1.3 + Math.random() * 0.4,
      0.55 + Math.random() * 0.35
    );
    rotVel = new THREE.Vector3(
      (Math.random() - 0.5) * 32,
      (Math.random() - 0.5) * 26,
      (Math.random() - 0.5) * 32
    );
  } else if (weaponId === 'sniper') {
    shellGroup.add(buildSniperShellMesh());
    offset.set(0.055, 0.04, -0.05);
    life = 2.2;

    // Heavy magnum kick: powerful high arcing trajectory with weighty tumbling
    vel = new THREE.Vector3(
      1.9 + Math.random() * 0.5,
      1.5 + Math.random() * 0.4,
      0.6 + Math.random() * 0.3
    );
    rotVel = new THREE.Vector3(
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 18,
      (Math.random() - 0.5) * 22
    );
  } else if (weaponId === 'deagle') {
    shellGroup.add(buildDeagleShellMesh());
    offset.set(0.052, 0.035, -0.055);
    life = 1.8;

    // Punchy magnum slide kick: high upward toss and rapid spin
    vel = new THREE.Vector3(
      2.0 + Math.random() * 0.5,
      1.3 + Math.random() * 0.4,
      0.5 + Math.random() * 0.3
    );
    rotVel = new THREE.Vector3(
      (Math.random() - 0.5) * 26,
      (Math.random() - 0.5) * 22,
      (Math.random() - 0.5) * 28
    );
  } else if (weaponId === 'uzi') {
    shellGroup.add(buildUziShellMesh());
    offset.set(0.048, 0.045, -0.04);
    life = 1.5;

    // Rapid SMG scatter: fast erratic scatter ejection
    vel = new THREE.Vector3(
      2.5 + Math.random() * 0.7,
      1.4 + Math.random() * 0.5,
      0.6 + Math.random() * 0.4
    );
    rotVel = new THREE.Vector3(
      (Math.random() - 0.5) * 36,
      (Math.random() - 0.5) * 30,
      (Math.random() - 0.5) * 36
    );
  } else {
    // pistol (standard 9mm)
    shellGroup.add(buildPistolShellMesh());
    offset.set(0.042, 0.035, -0.05);
    life = 1.6;

    // Clean semi-auto pistol ejection arc
    vel = new THREE.Vector3(
      1.7 + Math.random() * 0.4,
      1.1 + Math.random() * 0.3,
      0.4 + Math.random() * 0.25
    );
    rotVel = new THREE.Vector3(
      (Math.random() - 0.5) * 24,
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 24
    );
  }

  // Orient and place shell at the weapon's ejection port in 3D weapon space
  offset.applyEuler(wGroup.rotation);
  shellGroup.position.copy(wGroup.position).add(offset);
  shellGroup.rotation.copy(wGroup.rotation);

  weaponScene.add(shellGroup);
  ejectedShells.push({
    mesh: shellGroup,
    vel,
    rotVel,
    life,
    maxLife: life
  });
}

function updateEjectedShells(dt) {
  for (let i = ejectedShells.length - 1; i >= 0; i--) {
    const s = ejectedShells[i];
    s.mesh.position.addScaledVector(s.vel, dt);
    s.mesh.rotation.x += s.rotVel.x * dt;
    s.mesh.rotation.y += s.rotVel.y * dt;
    s.mesh.rotation.z += s.rotVel.z * dt;

    // Atmospheric drag on tumbling casing
    s.vel.x *= Math.max(0, 1 - dt * 0.35);
    s.vel.z *= Math.max(0, 1 - dt * 0.35);
    s.vel.y -= 4.6 * dt; // Gravity in weaponScene space

    s.life -= dt;
    if (s.life <= 0) {
      weaponScene.remove(s.mesh);
      ejectedShells.splice(i, 1);
    }
  }
}

/** Spawn realistic gunpowder barrel smoke billowing forward from the muzzle tip */
function spawnMuzzleSmoke(weaponId, muzzlePos, shotDir) {
  const isShotgun = weaponId === 'shotgun';
  const numPuffs = isShotgun ? 4 : 2;

  for (let i = 0; i < numPuffs; i++) {
    const radius = 0.035 + Math.random() * 0.035;
    const smokeGeo = new THREE.SphereGeometry(radius, 6, 6);
    const smokeMat = new THREE.MeshBasicMaterial({
      color: 0xcccccc,
      transparent: true,
      opacity: 0.38,
      depthWrite: false
    });
    const puff = new THREE.Mesh(smokeGeo, smokeMat);

    // Position at the muzzle barrel tip with subtle forward/radial offset
    puff.position.copy(muzzlePos).addScaledVector(shotDir, 0.08 + Math.random() * 0.12).add(new THREE.Vector3(
      (Math.random() - 0.5) * 0.05,
      (Math.random() - 0.5) * 0.05,
      (Math.random() - 0.5) * 0.05
    ));

    scene.add(puff);

    // Billowing forward blast with thermal buoyancy
    const fwdSpd = isShotgun ? (3.5 + Math.random() * 3.0) : (2.2 + Math.random() * 1.8);
    const vel = shotDir.clone().multiplyScalar(fwdSpd).add(new THREE.Vector3(
      (Math.random() - 0.5) * 0.6,
      0.5 + Math.random() * 0.7,
      (Math.random() - 0.5) * 0.6
    ));

    const life = 0.45 + Math.random() * 0.30;
    muzzleSmokes.push({
      mesh: puff,
      vel,
      expandRate: 2.8 + Math.random() * 1.8,
      life,
      maxLife: life
    });
  }
}

function updateMuzzleSmokes(dt) {
  for (let i = muzzleSmokes.length - 1; i >= 0; i--) {
    const s = muzzleSmokes[i];
    s.mesh.position.addScaledVector(s.vel, dt);
    s.vel.multiplyScalar(Math.max(0, 1 - dt * 5.5)); // Aerodynamic drag
    s.vel.y += 0.35 * dt; // Upward thermal rise

    s.mesh.scale.addScalar(dt * s.expandRate);
    s.life -= dt;

    if (s.mesh.material) {
      s.mesh.material.opacity = Math.max(0, (s.life / s.maxLife) * 0.38);
    }

    if (s.life <= 0) {
      scene.remove(s.mesh);
      muzzleSmokes.splice(i, 1);
    }
  }
}

/** Spawn 3D supersonic bullet projectile with luminous tracer streak */
function spawnPlayerBullet(weaponId, startPos, dir, targetDist, targetPoint, targetNormal, isEnemy) {
  const bulletGroup = new THREE.Group();

  let tracerColor = 0xffe680;
  let coreColor = 0xffffff;
  let length = 0.65;
  let radius = 0.020;
  let speed = 210; // realistic assault rifle supersonic velocity feel

  if (weaponId === 'rifle') {
    tracerColor = 0xffbf44;
    coreColor = 0xffffff;
    length = 0.72;
    radius = 0.024;
    speed = 225;
  } else if (weaponId === 'sniper') {
    tracerColor = 0x88e0ff;
    coreColor = 0xffffff;
    length = 1.35;
    radius = 0.028;
    speed = 280;
  } else if (weaponId === 'deagle') {
    tracerColor = 0xffa033;
    coreColor = 0xffffff;
    length = 0.52;
    radius = 0.030;
    speed = 180;
  } else if (weaponId === 'uzi') {
    tracerColor = 0xffd466;
    coreColor = 0xffffff;
    length = 0.42;
    radius = 0.016;
    speed = 165;
  } else if (weaponId === 'shotgun') {
    tracerColor = 0xff8833;
    coreColor = 0xffeedd;
    length = 0.32;
    radius = 0.016;
    speed = 145;
  }

  // Glowing Tracer streak cylinder aligned with flight vector
  const tracerGeo = new THREE.CylinderGeometry(radius * 0.35, radius, length, 8);
  tracerGeo.rotateX(Math.PI / 2);
  const tracerMat = new THREE.MeshBasicMaterial({
    color: tracerColor,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const tracerMesh = new THREE.Mesh(tracerGeo, tracerMat);
  tracerMesh.position.z = length * 0.5;
  bulletGroup.add(tracerMesh);

  // Bright incandescent core
  const coreGeo = new THREE.CylinderGeometry(radius * 0.15, radius * 0.4, length * 0.75, 6);
  coreGeo.rotateX(Math.PI / 2);
  const coreMat = new THREE.MeshBasicMaterial({
    color: coreColor,
    transparent: true,
    opacity: 1.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const coreMesh = new THREE.Mesh(coreGeo, coreMat);
  coreMesh.position.z = length * 0.5;
  bulletGroup.add(coreMesh);

  // Orient bullet in 3D flight direction
  bulletGroup.position.copy(startPos);
  bulletGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), dir);

  scene.add(bulletGroup);

  playerBullets.push({
    mesh: bulletGroup,
    dir: dir.clone(),
    speed: speed,
    distanceTraveled: 0,
    maxDistance: targetDist || 120,
    targetPoint: targetPoint ? targetPoint.clone() : null,
    targetNormal: targetNormal ? targetNormal.clone() : new THREE.Vector3(0, 1, 0),
    isEnemy: !!isEnemy,
    weaponId: weaponId,
    life: 1.5
  });
}

function updatePlayerBullets(dt) {
  for (let i = playerBullets.length - 1; i >= 0; i--) {
    const b = playerBullets[i];
    const moveDist = b.speed * dt;
    b.distanceTraveled += moveDist;
    b.mesh.position.addScaledVector(b.dir, moveDist);
    b.life -= dt;

    if (b.distanceTraveled >= b.maxDistance || b.life <= 0) {
      if (b.targetPoint) {
        spawnBulletImpact(b.targetPoint, b.targetNormal, b.isEnemy, b.weaponId);
      }
      scene.remove(b.mesh);
      playerBullets.splice(i, 1);
    }
  }
}

/** Spawn terminal ballistics impact: sparks, dust/smoke, bullet holes, or blood */
function spawnBulletImpact(pos, normal, isEnemy, weaponId) {
  if (isEnemy) {
    // Blood / flesh particle burst
    for (let i = 0; i < 12; i++) {
      const p = new THREE.Mesh(
        new THREE.BoxGeometry(0.045, 0.045, 0.045),
        new THREE.MeshBasicMaterial({ color: Math.random() > 0.3 ? 0x880000 : 0xaa1111 })
      );
      p.position.copy(pos);
      scene.add(p);
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 3.5,
        Math.random() * 3.5 + 1.2,
        (Math.random() - 0.5) * 3.5
      );
      bulletSparks.push({ mesh: p, vel, gravity: -14, life: 0.35 + Math.random() * 0.2 });
    }
    return;
  }

  // Wall / surface ricochet sparks

  const numSparks = weaponId === 'rifle' ? 12 : (weaponId === 'sniper' ? 18 : 8);
  for (let i = 0; i < numSparks; i++) {
    const s = new THREE.Mesh(
      new THREE.BoxGeometry(0.025, 0.025, 0.025),
      new THREE.MeshBasicMaterial({
        color: Math.random() > 0.35 ? 0xffcc33 : 0xff8811,
        transparent: true,
        opacity: 1
      })
    );
    s.position.copy(pos).addScaledVector(normal, 0.02);
    scene.add(s);

    const vel = normal.clone()
      .multiplyScalar(3.5 + Math.random() * 4.5)
      .add(new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4
      ));

    bulletSparks.push({ mesh: s, vel, gravity: -18, life: 0.22 + Math.random() * 0.25 });
  }

  // Impact dust / smoke cloud
  for (let i = 0; i < 3; i++) {
    const smokeGeo = new THREE.PlaneGeometry(0.14, 0.14);
    const smokeMat = new THREE.MeshBasicMaterial({
      color: 0xc8b89e,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const sm = new THREE.Mesh(smokeGeo, smokeMat);
    sm.position.copy(pos).addScaledVector(normal, 0.04);
    sm.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    scene.add(sm);
    const vel = normal.clone().multiplyScalar(0.8 + Math.random() * 0.8).add(new THREE.Vector3(
      (Math.random() - 0.5) * 0.5,
      Math.random() * 0.5,
      (Math.random() - 0.5) * 0.5
    ));
    impactSmokes.push({ mesh: sm, vel, scaleRate: 2.2, life: 0.35 + Math.random() * 0.2, maxLife: 0.5 });
  }

  // Bullet Hole Decal on solid surfaces
  if (bulletHoles.length > 60) {
    const old = bulletHoles.shift();
    scene.remove(old.mesh);
  }
  const holeGeo = new THREE.PlaneGeometry(0.09, 0.09);
  const holeMat = new THREE.MeshBasicMaterial({
    color: 0x111111,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const holeMesh = new THREE.Mesh(holeGeo, holeMat);
  holeMesh.position.copy(pos).addScaledVector(normal, 0.008);
  holeMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
  scene.add(holeMesh);
  bulletHoles.push({ mesh: holeMesh, life: 10.0 });
}

function updateBulletSparks(dt) {
  for (let i = bulletSparks.length - 1; i >= 0; i--) {
    const sp = bulletSparks[i];
    sp.vel.y += sp.gravity * dt;
    sp.mesh.position.addScaledVector(sp.vel, dt);
    sp.life -= dt;
    if (sp.mesh.material && sp.mesh.material.opacity !== undefined) {
      sp.mesh.material.opacity = Math.max(0, sp.life / 0.35);
    }
    if (sp.life <= 0) {
      scene.remove(sp.mesh);
      bulletSparks.splice(i, 1);
    }
  }
}

function updateImpactSmokes(dt) {
  for (let i = impactSmokes.length - 1; i >= 0; i--) {
    const sm = impactSmokes[i];
    sm.mesh.position.addScaledVector(sm.vel, dt);
    const s = 1 + sm.scaleRate * dt;
    sm.mesh.scale.multiplyScalar(s);
    sm.life -= dt;
    if (sm.mesh.material) {
      sm.mesh.material.opacity = Math.max(0, (sm.life / sm.maxLife) * 0.6);
    }
    if (sm.life <= 0) {
      scene.remove(sm.mesh);
      impactSmokes.splice(i, 1);
    }
  }
}

function updateBulletHoles(dt) {
  for (let i = bulletHoles.length - 1; i >= 0; i--) {
    const h = bulletHoles[i];
    h.life -= dt;
    if (h.life < 2.0 && h.mesh.material) {
      h.mesh.material.opacity = Math.max(0, h.life / 2.0) * 0.9;
    }
    if (h.life <= 0) {
      scene.remove(h.mesh);
      bulletHoles.splice(i, 1);
    }
  }
}

// â”€â”€â”€ MAIN GAME LOOP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    updatePlayerBullets(dt);
    updateBulletSparks(dt);
    updateImpactSmokes(dt);
    updateBulletHoles(dt);
    updateGoreGibs(dt);
    updateBloodFountain(dt);
    updateBloodPuddles(dt);
    updateMuzzleSmokes(dt);
    updateEjectedShells(dt);
  }

  // Two-pass render: world Ã¢â€ â€™ weapon (depth-cleared so gun never clips)
  renderer.autoClear = false;
  renderer.clear();
  renderer.render(scene, camera);
  renderer.clearDepth();
  renderer.render(weaponScene, weaponCamera);
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
//  INITIALISATION
// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  ADMIN PANEL SYSTEM
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function openAdminPanel() {
  const modal = document.getElementById('admin-modal');
  if (!modal) return;

  if (!isMobile && isPointerLocked) {
    document.exitPointerLock();
  }

  modal.classList.remove('hidden');
  const lockView = document.getElementById('admin-lock-view');
  const unlockedView = document.getElementById('admin-unlocked-view');
  const errorMsg = document.getElementById('admin-error-msg');
  const passInput = document.getElementById('admin-pass-input');

  if (isAdminUnlocked) {
    if (lockView) lockView.classList.add('hidden');
    if (unlockedView) unlockedView.classList.remove('hidden');
    const waveInp = document.getElementById('admin-wave-input');
    if (waveInp) waveInp.value = wave;
  } else {
    if (lockView) lockView.classList.remove('hidden');
    if (unlockedView) unlockedView.classList.add('hidden');
    if (errorMsg) errorMsg.classList.add('hidden');
    if (passInput) {
      passInput.value = '';
      setTimeout(() => passInput.focus(), 80);
    }
  }
}

function closeAdminPanel() {
  const modal = document.getElementById('admin-modal');
  if (modal) modal.classList.add('hidden');

  if (gameState === 'paused') {
    resumeGame();
  } else if (gameState === 'playing' && !isMobile) {
    document.getElementById('game-canvas').requestPointerLock();
  }
}

function attemptAdminUnlock() {
  const passInput = document.getElementById('admin-pass-input');
  const errorMsg = document.getElementById('admin-error-msg');
  const lockView = document.getElementById('admin-lock-view');
  const unlockedView = document.getElementById('admin-unlocked-view');

  if (!passInput) return;

  if (passInput.value.trim() === 'Taheer') {
    isAdminUnlocked = true;
    if (errorMsg) errorMsg.classList.add('hidden');
    if (lockView) lockView.classList.add('hidden');
    if (unlockedView) unlockedView.classList.remove('hidden');
    const waveInp = document.getElementById('admin-wave-input');
    if (waveInp) waveInp.value = wave;
    if (audioCtx) playLockOnBeep(1.8);
  } else {
    if (errorMsg) {
      errorMsg.classList.remove('hidden');
      passInput.select();
    }
  }
}

function adminJumpToWave(targetWave) {
  targetWave = parseInt(targetWave, 10);
  if (isNaN(targetWave) || targetWave < 1) targetWave = 1;

  wave = targetWave;
  closeAdminPanel();

  // If game is in menu or paused, start/resume it
  if (gameState === 'menu' || gameState === 'gameover') {
    document.getElementById('main-menu').classList.remove('active');
    document.getElementById('game-over').classList.add('hidden');
    document.getElementById('game-container').classList.remove('hidden');
    startGame();
    wave = targetWave; // retain target wave
    ensureCorrectLevelForWave(wave);
    spawnWave();
  } else if (gameState === 'paused') {
    document.getElementById('pause-menu').classList.add('hidden');
    gameState = 'playing';
    ensureCorrectLevelForWave(wave);
    spawnWave();
  } else {
    // Already playing or wavecomplete
    document.getElementById('wave-complete').classList.add('hidden');
    if (waveCountdownTimer) { clearInterval(waveCountdownTimer); waveCountdownTimer = null; }
    gameState = 'playing';
    ensureCorrectLevelForWave(wave);
    spawnWave();
  }

  // Ensure full health & HUD update
  player.health = player.maxHealth;
  updateHealthHUD();

  if (!isMobile) {
    document.getElementById('game-canvas').requestPointerLock();
  }
}

function setupAdminEventListeners() {
  // Admin button in Main Menu
  const adminMenuBtn = document.getElementById('admin-menu-btn');
  if (adminMenuBtn) adminMenuBtn.addEventListener('click', openAdminPanel);

  // Admin button in Pause Menu
  const adminPauseBtn = document.getElementById('admin-pause-btn');
  if (adminPauseBtn) adminPauseBtn.addEventListener('click', openAdminPanel);

  // Close & Cancel buttons
  const closeBtn = document.getElementById('admin-close-btn');
  if (closeBtn) closeBtn.addEventListener('click', closeAdminPanel);

  const doneBtn = document.getElementById('admin-done-btn');
  if (doneBtn) doneBtn.addEventListener('click', closeAdminPanel);

  // Unlock button & Enter key
  const unlockBtn = document.getElementById('admin-unlock-btn');
  if (unlockBtn) unlockBtn.addEventListener('click', attemptAdminUnlock);

  const passInput = document.getElementById('admin-pass-input');
  if (passInput) {
    passInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') attemptAdminUnlock();
    });
  }

  // Jump to wave button
  const jumpBtn = document.getElementById('admin-jump-wave-btn');
  if (jumpBtn) {
    jumpBtn.addEventListener('click', () => {
      const waveInp = document.getElementById('admin-wave-input');
      if (waveInp) adminJumpToWave(waveInp.value);
    });
  }

  // Quick wave buttons
  document.querySelectorAll('.quick-wave-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-wave');
      if (target) adminJumpToWave(target);
    });
  });

  // Cheats: Restore HP
  const healBtn = document.getElementById('admin-heal-btn');
  if (healBtn) healBtn.addEventListener('click', adminRestoreHP);

  // Cheats: Infinite Ammo
  const ammoBtn = document.getElementById('admin-ammo-btn');
  if (ammoBtn) ammoBtn.addEventListener('click', adminToggleInfiniteAmmo);

  // Cheats: God Mode
  const godBtn = document.getElementById('admin-god-btn');
  if (godBtn) godBtn.addEventListener('click', adminToggleGodMode);

  // Cheats: Nuke All Enemies
  const killallBtn = document.getElementById('admin-killall-btn');
  if (killallBtn) killallBtn.addEventListener('click', adminNukeAll);
}

function adminRestoreHP() {
  player.health = player.maxHealth;
  updateHealthHUD();
  const healBtn = document.getElementById('admin-heal-btn');
  if (healBtn) {
    healBtn.classList.add('active');
    setTimeout(() => healBtn.classList.remove('active'), 300);
  }
}

function adminToggleInfiniteAmmo() {
  isInfiniteAmmo = !isInfiniteAmmo;
  const statusSpan = document.getElementById('inf-ammo-status');
  if (statusSpan) statusSpan.textContent = isInfiniteAmmo ? 'ON' : 'OFF';
  const ammoBtn = document.getElementById('admin-ammo-btn');
  if (isInfiniteAmmo) {
    if (ammoBtn) ammoBtn.classList.add('active');
    WEAPONS.forEach(w => { w.ammo = w.maxAmmo; w.reserveAmmo = 999; });
    updateWeaponHUD();
  } else {
    if (ammoBtn) ammoBtn.classList.remove('active');
  }
}

function adminToggleGodMode() {
  isGodMode = !isGodMode;
  const statusSpan = document.getElementById('god-mode-status');
  if (statusSpan) statusSpan.textContent = isGodMode ? 'ON' : 'OFF';
  const godBtn = document.getElementById('admin-god-btn');
  if (isGodMode) {
    if (godBtn) godBtn.classList.add('active');
    player.health = player.maxHealth;
    updateHealthHUD();
  } else {
    if (godBtn) godBtn.classList.remove('active');
  }
}

function adminNukeAll() {
  enemies.forEach(e => {
    if (e.alive) e.takeDamage(99999);
  });
  const killallBtn = document.getElementById('admin-killall-btn');
  if (killallBtn) {
    killallBtn.classList.add('active');
    setTimeout(() => killallBtn.classList.remove('active'), 300);
  }
}

// Global window bindings
window.openAdminPanel = openAdminPanel;
window.closeAdminPanel = closeAdminPanel;
window.attemptAdminUnlock = attemptAdminUnlock;
window.adminJumpToWave = adminJumpToWave;
window.adminRestoreHP = adminRestoreHP;
window.adminToggleInfiniteAmmo = adminToggleInfiniteAmmo;
window.adminToggleGodMode = adminToggleGodMode;
window.adminNukeAll = adminNukeAll;

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
  setupAdminEventListeners();

  // Resize handler
  window.addEventListener('resize', () => {
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    weaponCamera.aspect = w / h;
    weaponCamera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });

  // Ã¢â€â‚¬Ã¢â€â‚¬ UI event listeners Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

  // Update menu footer for mobile
  if (isMobile) {
    const hint = document.getElementById('menu-footer-hint');
    if (hint) hint.textContent = 'LEFT JOYSTICK Ã‚Â· DRAG RIGHT TO LOOK Ã‚Â· FIRE BUTTON Ã‚Â· TOUCH TO PLAY';
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
