import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const $ = (id) => document.getElementById(id);

const CFG = {
  worldBounds: 106,
  eye: 1.8,
  playerRadius: 0.5,
  moveSpeed: 9,
  dashSpeed: 32,
  dashCost: 40,
  staminaRegen: 22,
  gravity: 28,
  jumpSpeed: 9,
  comboWindow: 4.5,
  baseFov: 75,
  hemiIntensity: 1.55,
  moonIntensity: 1.75,
  flashlightIntensity: 110,
  bloomStrength: 0.28,
  bloomThreshold: 1.08,
  maxPixelRatio: 1.5
};

const STORAGE = { name: 'bf_name', best: 'bf_best', local: 'bf_local_scores' };

const WEAPONS = {
  rifle: {
    name: 'ИМПУЛЬСНЫЙ КАРАБИН',
    mag: 30, reserveMax: 240, interval: 0.11, reload: 1.5,
    pellets: 1, spread: 0.004, bloomAdd: 0.012, bloomMax: 0.05,
    damage: 34, kick: 0.012, falloff: 0, knock: 0.6,
    base: new THREE.Vector3(0.26, -0.24, -0.5)
  },
  shotgun: {
    name: 'ТАКТИЧЕСКИЙ ДРОБОВИК',
    mag: 8, reserveMax: 48, interval: 0.85, reload: 1.9,
    pellets: 8, spread: 0.055, bloomAdd: 0, bloomMax: 0,
    damage: 14, kick: 0.07, falloff: 45, knock: 5,
    base: new THREE.Vector3(0.27, -0.26, -0.52)
  }
};

const ENEMY_TYPES = {
  stalker: { hp: 100, speed: 5.0, scale: 1, width: 1, dmg: 16, cd: 1.45, windup: 0.45, score: 100, body: 0x8b1616, emissive: 0x380808, glow: 0xff2a2a, zig: false, resist: 1 },
  runner: { hp: 55, speed: 8.6, scale: 0.85, width: 0.8, dmg: 10, cd: 1.25, windup: 0.36, score: 150, body: 0x995d0d, emissive: 0x3b2205, glow: 0xffb020, zig: true, resist: 1.3 },
  brute: { hp: 420, speed: 3.0, scale: 1.7, width: 1.25, dmg: 28, cd: 1.75, windup: 0.55, score: 350, body: 0x521d73, emissive: 0x2a0c3d, glow: 0xc050ff, zig: false, resist: 0.2 }
};

const COLORS = {
  fogNormal: new THREE.Color(0x0d1628),
  fogBlood: new THREE.Color(0x28060a),
  moonNormal: new THREE.Color(0.0, 0.0, 0.0).setRGB(3.0, 3.2, 3.8),
  moonBlood: new THREE.Color().setRGB(3.2, 0.5, 0.4),
  lightNormal: new THREE.Color(0x9fb8ff),
  lightBlood: new THREE.Color(0xff5a4a),
  skyNormal: new THREE.Color(0x4b6ba8),
  skyBlood: new THREE.Color(0x8a2828)
};

const state = {
  running: false,
  playing: false,
  gameOver: false,
  health: 100,
  kills: 0,
  headshots: 0,
  score: 0,
  shots: 0,
  hits: 0,
  combo: 0,
  comboT: 0,
  stamina: 100,
  staminaDelay: 0,
  weapon: 'rifle',
  ammo: { rifle: { mag: 30, reserve: 120 }, shotgun: { mag: 8, reserve: 24 } },
  firing: false,
  fireCd: 0,
  reload: null,
  bloom: 0,
  recoil: 0,
  recoilRot: 0,
  switchT: 1,
  flashlight: true,
  postBloom: true,
  flashT: 0,
  hitT: 0,
  damageT: 0,
  healT: 0,
  promptT: 0,
  heartT: 0,
  stepT: 0,
  dashT: 0,
  fov: CFG.baseFov,
  envBlend: 0,
  envTarget: 0,
  dirHitT: 0,
  hitSourceX: 0,
  hitSourceZ: 0
};

const wave = { n: 0, state: 'idle', queue: [], total: 0, spawnTimer: 0, timer: 0, info: null };
const player = { x: 0, y: CFG.eye, z: 0, vx: 0, vz: 0, vy: 0, onGround: true };
const keys = { fwd: false, back: false, left: false, right: false };
const sway = { x: 0, y: 0 };

let scene, camera, renderer, composer, controls;
let hemi, moonLight, flashlight, playerLight, muzzleLight, boomLight;
let moonMesh, stars;
let enemies = [];
let pickups = [];
let colliders = [];
let weaponModels = {};
let muzzleFlash;
let particles;
let bannerTimer = null;
let bobPhase = 0;
let time = 0;
const tracers = [];
const clock = new THREE.Clock();

const UP = new THREE.Vector3(0, 1, 0);
const _o = new THREE.Vector3();
const _f = new THREE.Vector3();
const _r = new THREE.Vector3();
const _u = new THREE.Vector3();
const _d = new THREE.Vector3();
const _m = new THREE.Vector3();
const _e = new THREE.Vector3();
const _dummy = new THREE.Object3D();

const ui = {
  healthValue: $('health-value'), healthBar: $('health-bar'),
  staminaBar: $('stamina-bar'), staminaLabel: $('stamina-label'),
  killsValue: $('kills-value'), headshotsValue: $('headshots-value'),
  ammoValue: $('ammo-value'), ammoReserve: $('ammo-reserve'),
  weaponLabel: $('weapon-label'), reloadBar: $('reload-bar'),
  slotRifle: $('slot-rifle'), slotShotgun: $('slot-shotgun'),
  waveValue: $('wave-value'), waveSubtitle: $('wave-subtitle'), waveBar: $('wave-progress-bar'),
  scoreValue: $('score-value'), comboBadge: $('combo-badge'), comboFill: $('combo-bar-fill'),
  hud: $('hud'), hudTop: $('hud-top'), crosshair: $('crosshair'), hitmarker: $('hitmarker'),
  dirRing: $('dir-ring'), radarCanvas: $('radar-canvas'),
  damage: $('damage-overlay'), heal: $('heal-overlay'), lowHp: $('low-hp-overlay'), threat: $('threat-indicator'),
  banner: $('wave-banner'), bannerTitle: $('wave-banner-title'), bannerSub: $('wave-banner-sub'),
  prompt: $('status-prompt'),
  startScreen: $('start-screen'), startBtn: $('start-btn'), startSubtitle: $('start-subtitle'),
  gameOver: $('game-over'), restartBtn: $('restart-btn'),
  hudFlash: $('hud-flashlight'), hudBloom: $('hud-bloom'), hudSound: $('hud-sound'), backLink: $('site-back-link'),
  bestScore: $('best-score-label'), bestWave: $('best-wave-label'),
  finalScore: $('final-score'), finalWave: $('final-wave'), finalKills: $('final-kills'),
  finalAccuracy: $('final-accuracy'), newRecord: $('new-record-badge'),
  nameInput: $('player-name-input'), submitBtn: $('submit-score-btn'), submitStatus: $('submit-status'),
  lbStart: $('start-leaderboard-container'), lbOver: $('gameover-leaderboard-container'),
  lbBadge: $('leaderboard-mode-badge')
};

function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SFX_FILES = [
  'rifle', 'shotgun', 'pump', 'reload_rifle', 'reload_shotgun', 'empty',
  'hit', 'headshot', 'kill', 'explosion', 'pickup', 'dash', 'hurt',
  'step', 'heartbeat', 'ambience'
];

class Sfx {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.raw = {};
    this.buffers = {};
    this.ambienceNode = null;
    this.musicAudio = null;
    this.musicFilter = null;
    this.musicGain = null;
    this.musicMode = 'menu';
    this.enabled = true;
    this.preload();
  }

  preload() {
    this.musicAudio = new Audio('sfx/music.mp3');
    this.musicAudio.loop = true;
    this.musicAudio.preload = 'auto';

    SFX_FILES.forEach((name) => {
      fetch(`sfx/${name}.mp3`)
        .then((r) => (r.ok ? r.arrayBuffer() : null))
        .then((buf) => {
          if (!buf) return;
          this.raw[name] = buf;
          if (this.ctx) this.decodeOne(name);
        })
        .catch(() => {});
    });
  }

  decodeOne(name) {
    const raw = this.raw[name];
    if (!raw || this.buffers[name] || !this.ctx) return;
    delete this.raw[name];
    this.ctx.decodeAudioData(
      raw.slice(0),
      (decoded) => {
        this.buffers[name] = decoded;
        if (name === 'ambience') this.startAmbience();
      },
      () => {}
    );
  }

  init() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.enabled ? 0.75 : 0;
      const comp = this.ctx.createDynamicsCompressor();
      this.master.connect(comp);
      comp.connect(this.ctx.destination);

      if (this.musicAudio) {
        const mediaSrc = this.ctx.createMediaElementSource(this.musicAudio);
        this.musicFilter = this.ctx.createBiquadFilter();
        this.musicFilter.type = 'lowpass';
        this.musicFilter.frequency.value = 1400;
        this.musicFilter.Q.value = 0.85;

        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = 0.32;

        mediaSrc.connect(this.musicFilter);
        this.musicFilter.connect(this.musicGain);
        this.musicGain.connect(this.master);
      }

      Object.keys(this.raw).forEach((name) => this.decodeOne(name));
      this.setMusicMode(this.musicMode);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (this.musicAudio && this.musicAudio.paused) {
      this.musicAudio.play().catch(() => {});
    }
    this.startAmbience();
  }

  setMusicMode(mode) {
    this.musicMode = mode;
    if (!this.ctx || !this.musicFilter || !this.musicGain) return;
    const presets = {
      menu: { freq: 1400, vol: 0.32, rate: 1.0 },
      intermission: { freq: 3200, vol: 0.28, rate: 1.0 },
      combat: { freq: 20000, vol: 0.46, rate: 1.0 },
      blood: { freq: 20000, vol: 0.56, rate: 1.03 },
      gameover: { freq: 900, vol: 0.26, rate: 0.94 }
    };
    const p = presets[mode] || presets.menu;
    const t = this.ctx.currentTime;
    this.musicFilter.frequency.setTargetAtTime(p.freq, t, 0.35);
    this.musicGain.gain.setTargetAtTime(p.vol, t, 0.35);
    if (this.musicAudio) this.musicAudio.playbackRate = p.rate;
  }

  startAmbience() {
    if (!this.ctx || this.ambienceNode || !this.buffers.ambience) return;
    const src = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    src.buffer = this.buffers.ambience;
    src.loop = true;
    gain.gain.value = 0.2;
    src.connect(gain);
    gain.connect(this.master);
    src.start(0);
    this.ambienceNode = src;
  }

  setEnabled(value) {
    this.enabled = value;
    if (this.master) this.master.gain.value = value ? 0.75 : 0;
  }

  play(name, opts = {}) {
    if (!this.ctx || !this.enabled) return;
    const buf = this.buffers[name];
    if (!buf) return;
    const {
      vol = 1,
      rate = 1,
      jitter = 0,
      delay = 0,
      maxDur = 0,
      offset = 0
    } = opts;
    const t = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    src.buffer = buf;
    const finalRate = Math.max(0.25, rate * (1 + (Math.random() * 2 - 1) * jitter));
    src.playbackRate.setValueAtTime(finalRate, t);
    gain.gain.setValueAtTime(vol, t);

    if (maxDur > 0) {
      const fadeStart = t + Math.max(0.02, maxDur - 0.06);
      gain.gain.setValueAtTime(vol, fadeStart);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + maxDur);
    }

    src.connect(gain);
    gain.connect(this.master);
    src.start(t, offset);
    if (maxDur > 0) src.stop(t + maxDur + 0.02);
  }

  rifle() {
    this.play('rifle', { vol: 0.72, jitter: 0.05 });
  }

  shotgun() {
    this.play('shotgun', { vol: 0.92, jitter: 0.04 });
    this.play('pump', { vol: 0.55, delay: 0.28, jitter: 0.03 });
  }

  reload(long) {
    if (long) {
      this.play('reload_shotgun', { vol: 0.75, jitter: 0.04 });
      this.play('reload_shotgun', { vol: 0.75, delay: 0.55, jitter: 0.04 });
      this.play('pump', { vol: 0.65, delay: 1.25 });
    } else {
      this.play('reload_rifle', { vol: 0.75, maxDur: 1.5 });
    }
  }

  empty() {
    this.play('empty', { vol: 0.7, jitter: 0.04 });
  }

  hit() {
    this.play('hit', { vol: 0.65, jitter: 0.06 });
  }

  headshot() {
    this.play('headshot', { vol: 0.85, rate: 1.05, jitter: 0.05 });
    this.play('hit', { vol: 0.55, rate: 1.15 });
  }

  kill() {
    this.play('kill', { vol: 0.75, jitter: 0.12 });
  }

  growl() {
    this.play('kill', { vol: 0.48, rate: 1.32, jitter: 0.08, maxDur: 0.36 });
  }

  explosion() {
    this.play('explosion', { vol: 0.95, jitter: 0.05 });
  }

  pickup() {
    this.play('pickup', { vol: 0.75, jitter: 0.05 });
  }

  dash() {
    this.play('dash', { vol: 0.8, jitter: 0.06 });
  }

  hurt() {
    this.play('hurt', { vol: 0.8, jitter: 0.06, maxDur: 0.9 });
    this.play('hit', { vol: 0.7, rate: 0.85 });
  }

  step() {
    this.play('step', { vol: 0.28, rate: 1.15, jitter: 0.1, maxDur: 0.28 });
  }

  jump() {
    this.play('dash', { vol: 0.45, rate: 0.82, jitter: 0.05 });
  }

  swap() {
    this.play('pump', { vol: 0.5, rate: 1.12, jitter: 0.04 });
  }

  waveStart() {}

  heartbeat() {
    this.play('heartbeat', { vol: 0.65, maxDur: 0.85 });
  }
}

const sfx = new Sfx();

const Leaderboard = {
  mode: 'local',
  scores: [],

  readLocal() {
    try {
      const list = JSON.parse(localStorage.getItem(STORAGE.local) || '[]');
      return Array.isArray(list) ? list : [];
    } catch (err) {
      return [];
    }
  },

  writeLocal(entry) {
    const list = this.readLocal();
    list.push({ ...entry, date: new Date().toISOString().slice(0, 10) });
    list.sort((a, b) => b.score - a.score);
    const top = list.slice(0, 10);
    localStorage.setItem(STORAGE.local, JSON.stringify(top));
    return top;
  },

  async load() {
    try {
      const res = await fetch('leaderboard.php', { cache: 'no-store' });
      if (!res.ok) throw new Error('bad status');
      const data = await res.json();
      if (!data.success || !Array.isArray(data.scores)) throw new Error('bad data');
      this.mode = 'server';
      this.scores = data.scores;
    } catch (err) {
      this.mode = 'local';
      this.scores = this.readLocal();
    }
    this.render();
  },

  async submit(entry) {
    try {
      const res = await fetch('leaderboard.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'rejected');
      this.mode = 'server';
      this.scores = data.scores;
    } catch (err) {
      this.mode = 'local';
      this.scores = this.writeLocal(entry);
    }
    this.render();
    return this.mode;
  },

  render() {
    const mine = (localStorage.getItem(STORAGE.name) || '').toLowerCase();
    ui.lbBadge.textContent = (this.mode === 'server' ? 'ГЛОБАЛЬНАЯ' : 'ЛОКАЛЬНАЯ') + ' · ТОП-10';
    renderBoard(ui.lbStart, this.scores, mine);
    renderBoard(ui.lbOver, this.scores, mine);
  }
};

function renderBoard(container, scores, mine) {
  container.replaceChildren();
  if (!scores.length) {
    const empty = document.createElement('div');
    empty.className = 'leaderboard-empty';
    empty.textContent = 'Пока никого. Станьте первым.';
    container.append(empty);
    return;
  }
  const table = document.createElement('table');
  table.className = 'leaderboard-table';
  const head = document.createElement('tr');
  [['#', ''], ['ПОЗЫВНОЙ', ''], ['СЧЁТ', 'num'], ['ВОЛНА', 'num'], ['УБИТО', 'num']].forEach(([text, cls]) => {
    const th = document.createElement('th');
    th.textContent = text;
    if (cls) th.className = cls;
    head.append(th);
  });
  table.append(head);
  scores.slice(0, 10).forEach((item, index) => {
    const row = document.createElement('tr');
    if (mine && String(item.name).toLowerCase() === mine) row.className = 'me';
    const cells = [
      [String(index + 1), 'rank-cell'],
      [String(item.name), ''],
      [String(item.score), 'num'],
      [String(item.wave), 'num'],
      [String(item.kills), 'num']
    ];
    cells.forEach(([text, cls]) => {
      const td = document.createElement('td');
      td.textContent = text;
      if (cls) td.className = cls;
      row.append(td);
    });
    table.append(row);
  });
  container.append(table);
}

function readBest() {
  try {
    const best = JSON.parse(localStorage.getItem(STORAGE.best) || '{}');
    return { score: best.score || 0, wave: best.wave || 1 };
  } catch (err) {
    return { score: 0, wave: 1 };
  }
}

function makeCanvasTexture(size, draw, repeatX, repeatY) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  draw(canvas.getContext('2d'), size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.repeat.set(repeatX, repeatY);
  return tex;
}

function createGroundTexture(rand) {
  return makeCanvasTexture(512, (g, size) => {
    g.fillStyle = '#364d2b';
    g.fillRect(0, 0, size, size);
    const palette = ['#2a3d21', '#405834', '#483f2a', '#314627', '#545438', '#353624'];
    for (let i = 0; i < 260; i++) {
      g.globalAlpha = 0.25 + rand() * 0.25;
      g.fillStyle = palette[Math.floor(rand() * palette.length)];
      g.beginPath();
      g.ellipse(rand() * size, rand() * size, 6 + rand() * 22, 4 + rand() * 14, rand() * 3, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
    for (let i = 0; i < 7000; i++) {
      g.fillStyle = palette[Math.floor(rand() * palette.length)];
      g.fillRect(rand() * size, rand() * size, 1 + rand() * 2, 1 + rand() * 2);
    }
  }, 60, 60);
}

function createBarkTexture(rand) {
  return makeCanvasTexture(128, (g, size) => {
    g.fillStyle = '#3a2a1c';
    g.fillRect(0, 0, size, size);
    for (let x = 0; x < size; x += 2) {
      const l = 18 + rand() * 18;
      g.fillStyle = `hsl(28, 35%, ${l}%)`;
      g.fillRect(x, 0, 2, size);
    }
    g.fillStyle = 'rgba(0,0,0,0.45)';
    for (let i = 0; i < 40; i++) {
      g.fillRect(rand() * size, rand() * size, 1, 6 + rand() * 24);
    }
  }, 1, 2);
}

function createFoliageTexture(rand) {
  return makeCanvasTexture(128, (g, size) => {
    g.fillStyle = '#b8b8b8';
    g.fillRect(0, 0, size, size);
    for (let i = 0; i < 900; i++) {
      const l = 90 + Math.floor(rand() * 150);
      g.fillStyle = `rgb(${l},${l},${l})`;
      g.fillRect(rand() * size, rand() * size, 2 + rand() * 4, 1 + rand() * 2);
    }
  }, 2, 2);
}

function createFlashTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const g = canvas.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,200,110,0.9)');
  grad.addColorStop(0.6, 'rgba(255,110,30,0.35)');
  grad.addColorStop(1, 'rgba(255,60,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function addCollider(x, z, r, h) {
  colliders.push({ x, z, r, h });
}

function findFreeSpot(rand, radius, minOrigin) {
  for (let attempt = 0; attempt < 30; attempt++) {
    const x = (rand() - 0.5) * 2 * (CFG.worldBounds + 4);
    const z = (rand() - 0.5) * 2 * (CFG.worldBounds + 4);
    if (Math.hypot(x, z) < minOrigin) continue;
    let free = true;
    for (const c of colliders) {
      if (Math.hypot(x - c.x, z - c.z) < c.r + radius + 1.5) {
        free = false;
        break;
      }
    }
    if (free) return { x, z };
  }
  return null;
}

function makeInstanced(geometry, material, count, castShadow, receiveShadow) {
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = receiveShadow;
  scene.add(mesh);
  return mesh;
}

function setInstance(mesh, index, position, scale, rotationY, quaternion) {
  _dummy.position.copy(position);
  _dummy.scale.copy(scale);
  if (quaternion) _dummy.quaternion.copy(quaternion);
  else _dummy.rotation.set(0, rotationY || 0, 0);
  _dummy.updateMatrix();
  mesh.setMatrixAt(index, _dummy.matrix);
}

function buildForest() {
  const rand = mulberry32(20240607);
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3();
  const color = new THREE.Color();

  const bark = new THREE.MeshLambertMaterial({ map: createBarkTexture(rand) });
  const foliage = new THREE.MeshLambertMaterial({ map: createFoliageTexture(rand) });

  const PINES = 75;
  const trunkGeo = new THREE.CylinderGeometry(0.3, 0.5, 1, 7);
  trunkGeo.translate(0, 0.5, 0);
  const pineTrunks = makeInstanced(trunkGeo, bark, PINES, true, true);
  const coneGeo = new THREE.ConeGeometry(1, 1, 8);
  coneGeo.translate(0, 0.5, 0);
  const crowns = [0, 1, 2, 3].map(() => makeInstanced(coneGeo, foliage, PINES, false, false));

  for (let i = 0; i < PINES; i++) {
    const spot = findFreeSpot(rand, 0.6, 9) || { x: 200, z: 200 };
    const H = 9 + rand() * 5;
    const yaw = rand() * Math.PI * 2;
    setInstance(pineTrunks, i, pos.set(spot.x, 0, spot.z), scl.set(1 + rand() * 0.3, H * 0.8, 1 + rand() * 0.3), yaw);
    const hue = 0.33 + rand() * 0.06;
    const light = 0.2 + rand() * 0.1;
    for (let t = 0; t < 4; t++) {
      const baseY = H * 0.3 + t * H * 0.18;
      const rad = H * 0.24 * (1 - 0.25 * t);
      const h = H * 0.34 * (1 - 0.1 * t);
      setInstance(crowns[t], i, pos.set(spot.x, baseY, spot.z), scl.set(rad, h, rad), yaw);
      crowns[t].setColorAt(i, color.setHSL(hue, 0.45, light + t * 0.015, THREE.SRGBColorSpace));
    }
    addCollider(spot.x, spot.z, 0.65, H);
  }
  pineTrunks.instanceMatrix.needsUpdate = true;
  crowns.forEach((c) => {
    c.instanceMatrix.needsUpdate = true;
    c.instanceColor.needsUpdate = true;
  });

  const DEAD = 16;
  const BRANCHES = 3;
  const deadGeo = new THREE.CylinderGeometry(0.15, 0.38, 1, 6);
  deadGeo.translate(0, 0.5, 0);
  const deadTrunks = makeInstanced(deadGeo, bark, DEAD, true, true);
  const branchGeo = new THREE.CylinderGeometry(0.04, 0.12, 1, 5);
  branchGeo.translate(0, 0.5, 0);
  const branches = makeInstanced(branchGeo, bark, DEAD * BRANCHES, false, false);
  const quat = new THREE.Quaternion();
  const dir = new THREE.Vector3();

  for (let i = 0; i < DEAD; i++) {
    const spot = findFreeSpot(rand, 0.5, 9) || { x: 200, z: 200 };
    const H = 6 + rand() * 3;
    setInstance(deadTrunks, i, pos.set(spot.x, 0, spot.z), scl.set(1, H, 1), rand() * 6);
    for (let b = 0; b < BRANCHES; b++) {
      const a = rand() * Math.PI * 2;
      const tilt = 0.8 + rand() * 0.4;
      const len = 2 + rand() * 1.8;
      dir.set(Math.sin(tilt) * Math.cos(a), Math.cos(tilt), Math.sin(tilt) * Math.sin(a));
      quat.setFromUnitVectors(UP, dir);
      setInstance(branches, i * BRANCHES + b, pos.set(spot.x, H * (0.45 + b * 0.18), spot.z), scl.set(1, len, 1), 0, quat);
    }
    addCollider(spot.x, spot.z, 0.45, H);
  }
  deadTrunks.instanceMatrix.needsUpdate = true;
  branches.instanceMatrix.needsUpdate = true;

  const ROCKS = 28;
  const rocks = makeInstanced(
    new THREE.DodecahedronGeometry(1, 0),
    new THREE.MeshLambertMaterial({ color: 0x8a92a0, flatShading: true }),
    ROCKS, true, true
  );
  for (let i = 0; i < ROCKS; i++) {
    const spot = findFreeSpot(rand, 1.5, 9) || { x: 200, z: 200 };
    const sx = 0.8 + rand() * 1.4;
    const sy = 0.6 + rand() * 1.2;
    const sz = 0.8 + rand() * 1.4;
    setInstance(rocks, i, pos.set(spot.x, sy * 0.4, spot.z), scl.set(sx, sy, sz), rand() * 6);
    rocks.setColorAt(i, color.setHSL(0.6, 0.1, 0.18 + rand() * 0.12, THREE.SRGBColorSpace));
    addCollider(spot.x, spot.z, Math.max(sx, sz) * 0.85, sy * 1.2);
  }
  rocks.instanceMatrix.needsUpdate = true;
  rocks.instanceColor.needsUpdate = true;

  const GRASS = 250;
  const grassGeo = new THREE.ConeGeometry(0.07, 0.8, 4);
  grassGeo.translate(0, 0.4, 0);
  const grass = makeInstanced(grassGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), GRASS, false, false);
  for (let i = 0; i < GRASS; i++) {
    const x = (rand() - 0.5) * 2 * (CFG.worldBounds + 6);
    const z = (rand() - 0.5) * 2 * (CFG.worldBounds + 6);
    const s = 0.7 + rand() * 1.2;
    _dummy.position.set(x, 0, z);
    _dummy.rotation.set((rand() - 0.5) * 0.4, rand() * 6, (rand() - 0.5) * 0.4);
    _dummy.scale.set(s, s, s);
    _dummy.updateMatrix();
    grass.setMatrixAt(i, _dummy.matrix);
    grass.setColorAt(i, color.setHSL(0.28 + rand() * 0.08, 0.5, 0.1 + rand() * 0.1, THREE.SRGBColorSpace));
  }
  grass.instanceMatrix.needsUpdate = true;
  grass.instanceColor.needsUpdate = true;
}

function buildSky() {
  const rand = mulberry32(777);
  const count = 550;
  const arr = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const theta = rand() * Math.PI * 2;
    const phi = Math.acos(0.12 + rand() * 0.88);
    arr[i * 3] = 400 * Math.sin(phi) * Math.cos(theta);
    arr[i * 3 + 1] = 400 * Math.cos(phi);
    arr[i * 3 + 2] = 400 * Math.sin(phi) * Math.sin(theta);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  stars = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xdbe6ff, size: 1.4, sizeAttenuation: false, fog: false }));
  stars.frustumCulled = false;
  scene.add(stars);

  moonMesh = new THREE.Mesh(
    new THREE.SphereGeometry(14, 24, 16),
    new THREE.MeshBasicMaterial({ color: COLORS.moonNormal.clone(), fog: false })
  );
  moonMesh.frustumCulled = false;
  scene.add(moonMesh);
}

class ParticlePool {
  constructor(max) {
    this.max = max;
    this.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial(), max);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    const white = new THREE.Color(1, 1, 1);
    _dummy.scale.set(0, 0, 0);
    _dummy.updateMatrix();
    for (let i = 0; i < max; i++) {
      this.mesh.setColorAt(i, white);
      this.mesh.setMatrixAt(i, _dummy.matrix);
    }
    this.pos = new Float32Array(max * 3);
    this.vel = new Float32Array(max * 3);
    this.life = new Float32Array(max);
    this.maxLife = new Float32Array(max);
    this.size = new Float32Array(max);
    this.grav = new Float32Array(max);
    this.next = 0;
    this.dirty = false;
    scene.add(this.mesh);
  }

  emit(x, y, z, vx, vy, vz, size, life, grav, color) {
    const i = this.next;
    this.next = (this.next + 1) % this.max;
    this.pos[i * 3] = x;
    this.pos[i * 3 + 1] = y;
    this.pos[i * 3 + 2] = z;
    this.vel[i * 3] = vx;
    this.vel[i * 3 + 1] = vy;
    this.vel[i * 3 + 2] = vz;
    this.size[i] = size;
    this.life[i] = life;
    this.maxLife[i] = life;
    this.grav[i] = grav;
    this.mesh.setColorAt(i, color);
    this.mesh.instanceColor.needsUpdate = true;
    this.dirty = true;
  }

  burst(x, y, z, count, speed, color, size, life, grav, bx, by, bz) {
    for (let n = 0; n < count; n++) {
      const s = speed * (0.35 + Math.random() * 0.65);
      this.emit(
        x, y, z,
        ((Math.random() - 0.5) * 2 + bx) * s,
        ((Math.random() - 0.5) * 2 + by) * s,
        ((Math.random() - 0.5) * 2 + bz) * s,
        size * (0.6 + Math.random() * 0.8), life * (0.6 + Math.random() * 0.6), grav, color
      );
    }
  }

  update(dt) {
    if (!this.dirty) return;
    let alive = 0;
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        _dummy.scale.set(0, 0, 0);
        _dummy.updateMatrix();
        this.mesh.setMatrixAt(i, _dummy.matrix);
        continue;
      }
      alive++;
      const i3 = i * 3;
      this.vel[i3 + 1] -= this.grav[i] * dt;
      this.pos[i3] += this.vel[i3] * dt;
      this.pos[i3 + 1] += this.vel[i3 + 1] * dt;
      this.pos[i3 + 2] += this.vel[i3 + 2] * dt;
      if (this.pos[i3 + 1] < 0.03) {
        this.pos[i3 + 1] = 0.03;
        this.vel[i3] *= 0.5;
        this.vel[i3 + 2] *= 0.5;
        this.vel[i3 + 1] = 0;
      }
      const s = this.size[i] * (this.life[i] / this.maxLife[i]);
      _dummy.position.set(this.pos[i3], this.pos[i3 + 1], this.pos[i3 + 2]);
      _dummy.scale.set(s, s, s);
      _dummy.updateMatrix();
      this.mesh.setMatrixAt(i, _dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (!alive) this.dirty = false;
  }

  clear() {
    this.life.fill(0);
    _dummy.scale.set(0, 0, 0);
    _dummy.updateMatrix();
    for (let i = 0; i < this.max; i++) this.mesh.setMatrixAt(i, _dummy.matrix);
    this.mesh.instanceMatrix.needsUpdate = true;
    this.dirty = false;
  }
}

const PCOL = {
  blood: new THREE.Color(0x7a0a12),
  bloodBright: new THREE.Color(0xb01822),
  dust: new THREE.Color(0x6b6b5a),
  wood: new THREE.Color(0x6b4a2a),
  spark: new THREE.Color().setRGB(2.6, 1.7, 0.6),
  purple: new THREE.Color().setRGB(1.8, 0.5, 2.6),
  fire: new THREE.Color().setRGB(2.4, 0.8, 0.2),
  stone: new THREE.Color(0x8a8f99)
};

function buildTracers() {
  const geo = new THREE.BoxGeometry(1, 1, 1);
  for (let i = 0; i < 40; i++) {
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      color: new THREE.Color().setRGB(2.4, 1.7, 0.6), transparent: true, fog: false, depthWrite: false
    }));
    mesh.visible = false;
    mesh.frustumCulled = false;
    scene.add(mesh);
    tracers.push({ mesh, life: 0, ttl: 0.07 });
  }
}

let tracerIndex = 0;
function addTracer(from, to, thickness) {
  const t = tracers[tracerIndex];
  tracerIndex = (tracerIndex + 1) % tracers.length;
  const len = from.distanceTo(to);
  if (len < 0.2) return;
  t.mesh.position.copy(from).add(to).multiplyScalar(0.5);
  t.mesh.scale.set(thickness, thickness, len);
  t.mesh.lookAt(to);
  t.mesh.material.opacity = 1;
  t.mesh.visible = true;
  t.life = t.ttl;
}

function updateTracers(dt) {
  for (const t of tracers) {
    if (t.life <= 0) continue;
    t.life -= dt;
    if (t.life <= 0) t.mesh.visible = false;
    else t.mesh.material.opacity = t.life / t.ttl;
  }
}

function buildRifle() {
  const g = new THREE.Group();
  const dark = new THREE.MeshLambertMaterial({ color: 0x2c2f38 });
  const mid = new THREE.MeshLambertMaterial({ color: 0x4a4f5c });
  const black = new THREE.MeshLambertMaterial({ color: 0x15171c });
  const glow = new THREE.MeshBasicMaterial({ color: 0xff8c00 });
  const dot = new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(0.2, 1.8, 0.4) });

  const add = (geo, mat, x, y, z, rx) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    if (rx) m.rotation.x = rx;
    g.add(m);
    return m;
  };
  add(new THREE.BoxGeometry(0.08, 0.12, 0.5), dark, 0, 0, -0.1);
  add(new THREE.BoxGeometry(0.07, 0.08, 0.28), mid, 0, -0.01, -0.45);
  add(new THREE.CylinderGeometry(0.018, 0.022, 0.3, 8), black, 0, 0.015, -0.72, Math.PI / 2);
  add(new THREE.BoxGeometry(0.06, 0.15, 0.08), dark, 0, -0.11, 0.06, -0.3);
  add(new THREE.BoxGeometry(0.045, 0.14, 0.07), black, 0, -0.1, -0.08);
  add(new THREE.BoxGeometry(0.06, 0.1, 0.18), dark, 0, -0.02, 0.22);
  add(new THREE.BoxGeometry(0.05, 0.05, 0.1), black, 0, 0.09, -0.15);
  add(new THREE.BoxGeometry(0.052, 0.003, 0.34), glow, 0, 0.062, -0.1);
  add(new THREE.BoxGeometry(0.004, 0.004, 0.004), dot, 0, 0.1, -0.2);
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.015, -0.88);
  g.add(muzzle);
  return { group: g, muzzle };
}

function buildShotgun() {
  const g = new THREE.Group();
  const dark = new THREE.MeshLambertMaterial({ color: 0x2a2623 });
  const wood = new THREE.MeshLambertMaterial({ color: 0x5b3a22 });
  const metal = new THREE.MeshLambertMaterial({ color: 0x4d5058 });
  const black = new THREE.MeshLambertMaterial({ color: 0x14151a });
  const glow = new THREE.MeshBasicMaterial({ color: 0xff6a00 });

  const add = (geo, mat, x, y, z, rx) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    if (rx) m.rotation.x = rx;
    g.add(m);
    return m;
  };
  add(new THREE.BoxGeometry(0.09, 0.12, 0.34), dark, 0, 0, 0);
  add(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 10), metal, 0, 0.025, -0.5, Math.PI / 2);
  add(new THREE.CylinderGeometry(0.022, 0.022, 0.55, 8), black, 0, -0.035, -0.42, Math.PI / 2);
  const pump = add(new THREE.BoxGeometry(0.075, 0.07, 0.2), wood, 0, -0.045, -0.35);
  add(new THREE.BoxGeometry(0.06, 0.13, 0.07), wood, 0, -0.1, 0.12, -0.25);
  add(new THREE.BoxGeometry(0.07, 0.12, 0.28), wood, 0, -0.03, 0.3, 0.12);
  add(new THREE.BoxGeometry(0.094, 0.004, 0.2), glow, 0, 0.062, 0.0);
  g.userData.pump = pump;
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.025, -0.88);
  g.add(muzzle);
  return { group: g, muzzle };
}

function buildWeapons() {
  weaponModels = { rifle: buildRifle(), shotgun: buildShotgun() };
  for (const key of Object.keys(weaponModels)) {
    const model = weaponModels[key];
    model.group.position.copy(WEAPONS[key].base);
    model.group.visible = key === state.weapon;
    camera.add(model.group);
  }

  const flashMat = new THREE.MeshBasicMaterial({
    map: createFlashTexture(), transparent: true, blending: THREE.AdditiveBlending,
    depthWrite: false, fog: false, color: new THREE.Color().setRGB(2.4, 1.8, 1.0)
  });
  muzzleFlash = new THREE.Group();
  const p1 = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4), flashMat);
  const p2 = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), flashMat);
  p2.rotation.z = Math.PI / 4;
  muzzleFlash.add(p1, p2);
  muzzleFlash.visible = false;
  camera.add(muzzleFlash);
}

function currentMuzzle() {
  return weaponModels[state.weapon].muzzle;
}

const enemyGeo = {
  torso: new THREE.BoxGeometry(0.9, 1.2, 0.55),
  head: new THREE.BoxGeometry(0.5, 0.5, 0.5),
  arm: new THREE.BoxGeometry(0.22, 0.95, 0.22),
  leg: new THREE.BoxGeometry(0.28, 0.9, 0.28),
  core: new THREE.SphereGeometry(0.16, 8, 6),
  eye: new THREE.BoxGeometry(0.1, 0.06, 0.05),
  spike: new THREE.ConeGeometry(0.16, 0.55, 5),
  bar: new THREE.PlaneGeometry(1, 0.12)
};
enemyGeo.bar.translate(0.5, 0, 0);

const glowMats = {};
Object.keys(ENEMY_TYPES).forEach((key) => {
  const c = new THREE.Color(ENEMY_TYPES[key].glow);
  c.multiplyScalar(2.4);
  glowMats[key] = new THREE.MeshBasicMaterial({ color: c });
});
const barBackMat = new THREE.MeshBasicMaterial({ color: 0x120505, fog: false, depthTest: false, transparent: true, opacity: 0.8 });
const barFillMat = new THREE.MeshBasicMaterial({ color: 0xff3355, fog: false, depthTest: false });

function createEnemy(typeKey) {
  const cfg = ENEMY_TYPES[typeKey];
  const group = new THREE.Group();
  const baseEmissive = new THREE.Color(cfg.emissive);
  const mat = new THREE.MeshLambertMaterial({ color: cfg.body, emissive: baseEmissive.clone() });
  const glow = glowMats[typeKey];

  const add = (geo, material, x, y, z, parent) => {
    const m = new THREE.Mesh(geo, material);
    m.position.set(x, y, z);
    m.castShadow = true;
    (parent || group).add(m);
    return m;
  };
  add(enemyGeo.torso, mat, 0, 1.5, 0);
  add(enemyGeo.core, glow, 0, 1.55, 0.3).castShadow = false;
  const head = add(enemyGeo.head, mat, 0, 2.45, 0.03);
  add(enemyGeo.eye, glow, -0.12, 2.5, 0.28).castShadow = false;
  add(enemyGeo.eye, glow, 0.12, 2.5, 0.28).castShadow = false;

  const makePivot = (x, y) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    group.add(pivot);
    return pivot;
  };
  const armL = makePivot(-0.58, 2.0);
  const armR = makePivot(0.58, 2.0);
  add(enemyGeo.arm, mat, 0, -0.4, 0, armL);
  add(enemyGeo.arm, mat, 0, -0.4, 0, armR);
  const legL = makePivot(-0.22, 0.9);
  const legR = makePivot(0.22, 0.9);
  add(enemyGeo.leg, mat, 0, -0.45, 0, legL);
  add(enemyGeo.leg, mat, 0, -0.45, 0, legR);

  if (typeKey === 'brute') {
    const s1 = add(enemyGeo.spike, mat, -0.55, 2.4, -0.1);
    s1.rotation.z = 0.5;
    const s2 = add(enemyGeo.spike, mat, 0.55, 2.4, -0.1);
    s2.rotation.z = -0.5;
  } else if (typeKey === 'runner') {
    const h1 = add(enemyGeo.spike, mat, -0.15, 2.85, 0);
    h1.scale.set(0.5, 0.7, 0.5);
    const h2 = add(enemyGeo.spike, mat, 0.15, 2.85, 0);
    h2.scale.set(0.5, 0.7, 0.5);
  }

  group.scale.set(cfg.scale * cfg.width, cfg.scale, cfg.scale * cfg.width);

  let bar = null;
  if (typeKey === 'brute') {
    bar = new THREE.Group();
    const back = new THREE.Mesh(enemyGeo.bar, barBackMat);
    back.position.x = -1.1;
    back.scale.set(2.2, 1.4, 1);
    const fill = new THREE.Mesh(enemyGeo.bar, barFillMat);
    fill.position.x = -1.05;
    fill.scale.set(2.1, 1, 1);
    back.renderOrder = 10;
    fill.renderOrder = 11;
    bar.add(back, fill);
    bar.userData.fill = fill;
    scene.add(bar);
  }

  return { group, mat, baseEmissive, bar, armL, armR, legL, legR, head };
}

function spawnEnemy(typeKey) {
  const cfg = ENEMY_TYPES[typeKey];
  const info = wave.info;
  const parts = createEnemy(typeKey);
  camera.getWorldDirection(_f);
  const baseAngle = Math.atan2(_f.x, _f.z);
  let x = 0;
  let z = 0;
  for (let attempt = 0; attempt < 12; attempt++) {
    const angle = baseAngle + (Math.random() - 0.5) * Math.PI * 0.62;
    const dist = 34 + Math.random() * 18;
    const cx = player.x + Math.sin(angle) * dist;
    const cz = player.z + Math.cos(angle) * dist;
    if (Math.abs(cx) <= CFG.worldBounds && Math.abs(cz) <= CFG.worldBounds) {
      x = cx;
      z = cz;
      break;
    }
    x = THREE.MathUtils.clamp(cx, -CFG.worldBounds, CFG.worldBounds);
    z = THREE.MathUtils.clamp(cz, -CFG.worldBounds, CFG.worldBounds);
  }
  parts.group.position.set(x, 0, z);
  scene.add(parts.group);
  const hp = Math.round(cfg.hp * info.hpMul);
  enemies.push({
    ...parts, type: typeKey, cfg, x, z,
    hp, maxHp: hp,
    speed: cfg.speed * info.speedMul * (0.92 + Math.random() * 0.16),
    dmg: cfg.dmg * info.dmgMul,
    flash: 0, kx: 0, kz: 0, attackCd: 0.7, windup: 0, windupMax: 0,
    phase: Math.random() * 6, walk: Math.random() * 6, dead: false,
    radius: 0.7 * cfg.scale * cfg.width
  });
}

function removeEnemy(e) {
  e.dead = true;
  scene.remove(e.group);
  e.mat.dispose();
  if (e.bar) scene.remove(e.bar);
  const idx = enemies.indexOf(e);
  if (idx !== -1) enemies.splice(idx, 1);
}

function clearWorldObjects() {
  for (let i = enemies.length - 1; i >= 0; i--) removeEnemy(enemies[i]);
  enemies.length = 0;
  pickups.forEach((p) => scene.remove(p.mesh));
  pickups.length = 0;
  tracers.forEach((t) => {
    t.life = 0;
    t.mesh.visible = false;
  });
  particles.clear();
}

const pickupGeo = {
  box: new THREE.BoxGeometry(0.8, 0.5, 0.8),
  hCrossA: new THREE.BoxGeometry(0.5, 0.1, 0.14),
  hCrossB: new THREE.BoxGeometry(0.14, 0.1, 0.5),
  bullet: new THREE.CylinderGeometry(0.05, 0.05, 0.3, 6),
  beam: new THREE.CylinderGeometry(0.22, 0.22, 3.2, 8, 1, true)
};
const pickupMat = {
  healthBox: new THREE.MeshLambertMaterial({ color: 0xdfe6e0 }),
  healthGlow: new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(0.2, 2.4, 0.6) }),
  ammoBox: new THREE.MeshLambertMaterial({ color: 0x5a4a1c }),
  ammoGlow: new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(2.4, 1.4, 0.2) }),
  healthBeam: new THREE.MeshBasicMaterial({ color: 0x2eff7b, transparent: true, opacity: 0.16, depthWrite: false, fog: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }),
  ammoBeam: new THREE.MeshBasicMaterial({ color: 0xffa020, transparent: true, opacity: 0.16, depthWrite: false, fog: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })
};

function spawnPickup(type, x, z) {
  const group = new THREE.Group();
  const body = new THREE.Group();
  if (type === 'health') {
    body.add(new THREE.Mesh(pickupGeo.box, pickupMat.healthBox));
    const a = new THREE.Mesh(pickupGeo.hCrossA, pickupMat.healthGlow);
    const b = new THREE.Mesh(pickupGeo.hCrossB, pickupMat.healthGlow);
    a.position.y = 0.27;
    b.position.y = 0.27;
    body.add(a, b);
  } else {
    body.add(new THREE.Mesh(pickupGeo.box, pickupMat.ammoBox));
    for (let i = 0; i < 3; i++) {
      const bullet = new THREE.Mesh(pickupGeo.bullet, pickupMat.ammoGlow);
      bullet.position.set(-0.2 + i * 0.2, 0.3, 0);
      bullet.rotation.x = Math.PI / 2;
      body.add(bullet);
    }
  }
  const beam = new THREE.Mesh(pickupGeo.beam, type === 'health' ? pickupMat.healthBeam : pickupMat.ammoBeam);
  beam.position.y = 1.6;
  group.add(body, beam);
  group.position.set(x, 0.5, z);
  scene.add(group);
  pickups.push({ mesh: group, body, type, x, z, life: 30, phase: Math.random() * 6 });
}

function dropLoot(x, z) {
  const hpNeed = state.health < 45;
  const a = state.ammo[state.weapon];
  const ammoLow = a.mag + a.reserve < WEAPONS[state.weapon].mag;
  const roll = Math.random();
  const hc = hpNeed ? 0.3 : 0.14;
  const ac = ammoLow ? 0.4 : 0.2;
  if (roll < hc) spawnPickup('health', x, z);
  else if (roll < hc + ac) spawnPickup('ammo', x, z);
}

function resolveCollisions(obj, radius) {
  for (const c of colliders) {
    const dx = obj.x - c.x;
    const dz = obj.z - c.z;
    const min = radius + c.r;
    const d2 = dx * dx + dz * dz;
    if (d2 < min * min && d2 > 1e-6) {
      const d = Math.sqrt(d2);
      const push = min - d;
      obj.x += (dx / d) * push;
      obj.z += (dz / d) * push;
    }
  }
  const b = CFG.worldBounds + 2;
  obj.x = THREE.MathUtils.clamp(obj.x, -b, b);
  obj.z = THREE.MathUtils.clamp(obj.z, -b, b);
}

function raySphere(o, d, cx, cy, cz, r) {
  const lx = cx - o.x;
  const ly = cy - o.y;
  const lz = cz - o.z;
  const tca = lx * d.x + ly * d.y + lz * d.z;
  if (tca < 0) return -1;
  const d2 = lx * lx + ly * ly + lz * lz - tca * tca;
  if (d2 > r * r) return -1;
  const thc = Math.sqrt(r * r - d2);
  const t = tca - thc;
  return t >= 0 ? t : tca + thc;
}

const rayResult = { t: 0, kind: 'none', enemy: null, head: false };

function castRay(o, d, maxDist) {
  let tBest = maxDist;
  rayResult.kind = 'none';
  rayResult.enemy = null;
  rayResult.head = false;

  if (d.y < -1e-4) {
    const tg = -o.y / d.y;
    if (tg > 0 && tg < tBest) {
      tBest = tg;
      rayResult.kind = 'ground';
    }
  }

  for (const c of colliders) {
    const ox = o.x - c.x;
    const oz = o.z - c.z;
    const a = d.x * d.x + d.z * d.z;
    if (a < 1e-8) continue;
    const b = ox * d.x + oz * d.z;
    const cc = ox * ox + oz * oz - c.r * c.r;
    const disc = b * b - a * cc;
    if (disc < 0) continue;
    const t = (-b - Math.sqrt(disc)) / a;
    if (t > 0 && t < tBest) {
      const y = o.y + d.y * t;
      if (y >= 0 && y <= c.h) {
        tBest = t;
        rayResult.kind = 'tree';
      }
    }
  }

  for (const e of enemies) {
    if (e.dead) continue;
    const s = e.cfg.scale;
    const w = e.cfg.width;
    const th = raySphere(o, d, e.x, (2.45 * s), e.z, 0.42 * s * Math.max(1, w * 0.9));
    const tt = raySphere(o, d, e.x, 1.5 * s, e.z, 0.85 * s * w);
    const tl = raySphere(o, d, e.x, 0.55 * s, e.z, 0.6 * s * w);
    let tb = -1;
    if (tt >= 0) tb = tt;
    if (tl >= 0 && (tb < 0 || tl < tb)) tb = tl;
    if (th < 0 && tb < 0) continue;
    const isHead = th >= 0 && (tb < 0 || th <= tb + 0.4);
    const t = isHead ? th : tb;
    if (t < tBest) {
      tBest = t;
      rayResult.kind = 'enemy';
      rayResult.enemy = e;
      rayResult.head = isHead;
    }
  }

  rayResult.t = tBest;
  return rayResult;
}

function fireWeapon() {
  const w = WEAPONS[state.weapon];
  const ammo = state.ammo[state.weapon];
  ammo.mag--;
  state.fireCd = w.interval;
  state.shots++;

  camera.updateMatrixWorld(true);
  camera.getWorldPosition(_o);
  camera.getWorldDirection(_f);
  _r.crossVectors(_f, UP).normalize();
  _u.crossVectors(_r, _f).normalize();
  currentMuzzle().getWorldPosition(_m);

  const moving = Math.hypot(player.vx, player.vz) / CFG.moveSpeed;
  const spread = w.spread + state.bloom + (player.onGround ? moving * 0.01 : 0.03);
  let hitAny = false;
  let headAny = false;
  let killedAny = false;

  for (let p = 0; p < w.pellets; p++) {
    const ang = Math.random() * Math.PI * 2;
    const rad = Math.sqrt(Math.random()) * spread;
    _d.copy(_f).addScaledVector(_r, Math.cos(ang) * rad).addScaledVector(_u, Math.sin(ang) * rad).normalize();
    const res = castRay(_o, _d, 220);
    _e.copy(_o).addScaledVector(_d, res.t);

    if (res.kind === 'enemy') {
      let dmg = w.damage;
      if (w.falloff) dmg *= Math.max(0.25, 1 - res.t / w.falloff);
      if (res.head) dmg *= 2;
      hitAny = true;
      if (res.head) headAny = true;
      const target = res.enemy;
      particles.burst(_e.x, _e.y, _e.z, res.head ? 9 : 5, 5, PCOL.blood, 0.12, 0.5, 14, -_d.x, 0.3, -_d.z);
      if (damageEnemy(target, dmg, res.head, _d, w.knock)) killedAny = true;
    } else if (res.kind === 'tree') {
      particles.burst(_e.x, _e.y, _e.z, 4, 4, PCOL.wood, 0.1, 0.5, 14, -_d.x, 0.4, -_d.z);
      particles.burst(_e.x, _e.y, _e.z, 2, 5, PCOL.spark, 0.06, 0.25, 8, -_d.x, 0.3, -_d.z);
    } else if (res.kind === 'ground') {
      particles.burst(_e.x, _e.y + 0.05, _e.z, 4, 3, PCOL.dust, 0.12, 0.5, 8, 0, 1.2, 0);
    }
    addTracer(_m, _e, w.pellets > 1 ? 0.012 : 0.02);
  }

  if (hitAny) {
    state.hits++;
    state.hitT = 0.1;
    ui.hitmarker.classList.add('active');
    ui.hitmarker.classList.toggle('headshot', headAny);
    if (!killedAny) {
      if (headAny) sfx.headshot();
      else sfx.hit();
    }
  }

  state.bloom = Math.min(w.bloomMax, state.bloom + w.bloomAdd);
  state.recoil = state.weapon === 'shotgun' ? 1 : 0.5;
  state.recoilRot = state.weapon === 'shotgun' ? 0.35 : 0.12;
  state.flashT = 0.05;
  muzzleFlash.position.copy(currentMuzzle().position).add(weaponModels[state.weapon].group.position);
  muzzleFlash.rotation.z = Math.random() * 6;
  const fs = 0.8 + Math.random() * 0.6;
  muzzleFlash.scale.set(fs, fs, fs);
  muzzleFlash.visible = true;
  muzzleLight.intensity = state.weapon === 'shotgun' ? 40 : 22;

  camera.rotation.x = THREE.MathUtils.clamp(camera.rotation.x + w.kick * (0.7 + Math.random() * 0.6), -1.45, 1.45);
  camera.rotation.y += (Math.random() - 0.5) * w.kick * 0.5;

  if (state.weapon === 'shotgun') sfx.shotgun();
  else sfx.rifle();

  updateHUD();
}

function damageEnemy(e, dmg, head, dir, knock) {
  e.hp -= dmg;
  e.flash = 0.12;
  e.kx += dir.x * knock * e.cfg.resist;
  e.kz += dir.z * knock * e.cfg.resist;
  if (e.hp <= 0) {
    killEnemy(e, head);
    return true;
  }
  return false;
}

function killEnemy(e, head) {
  const s = e.cfg.scale;
  particles.burst(e.x, 1.4 * s, e.z, 28, 8, PCOL.blood, 0.22, 0.9, 18, 0, 0.8, 0);
  particles.burst(e.x, 1.2 * s, e.z, 12, 6, PCOL.bloodBright, 0.15, 0.7, 18, 0, 0.8, 0);
  sfx.kill();

  if (e.type === 'brute') {
    particles.burst(e.x, 1.5, e.z, 40, 14, PCOL.purple, 0.25, 0.8, 16, 0, 0.6, 0);
    particles.burst(e.x, 1.5, e.z, 20, 18, PCOL.fire, 0.18, 0.6, 20, 0, 0.6, 0);
    boomLight.position.set(e.x, 2, e.z);
    boomLight.intensity = 160;
    sfx.explosion();
    const dist = Math.hypot(e.x - player.x, e.z - player.z);
    if (dist < 6) hurtPlayer(Math.round((6 - dist) * 7), e.x, e.z);
  }

  state.kills++;
  if (head) state.headshots++;
  state.combo++;
  state.comboT = CFG.comboWindow;
  const mult = comboMultiplier();
  addScore(e.cfg.score * (head ? 1.5 : 1) * mult);
  dropLoot(e.x, e.z);
  removeEnemy(e);
  updateHUD();
}

function comboMultiplier() {
  return Math.min(4, 1 + Math.floor(state.combo / 3));
}

function addScore(value) {
  state.score += Math.round(value);
  updateHUD();
}

function resetCombo() {
  state.combo = 0;
  state.comboT = 0;
}

function hurtPlayer(amount, srcX = player.x, srcZ = player.z) {
  if (state.gameOver || amount <= 0) return;
  state.health = Math.max(0, state.health - Math.round(amount));
  state.damageT = 0.22;
  state.dirHitT = 0.75;
  state.hitSourceX = srcX;
  state.hitSourceZ = srcZ;
  resetCombo();
  sfx.hurt();
  camera.rotation.x = THREE.MathUtils.clamp(camera.rotation.x + (Math.random() - 0.3) * 0.04, -1.45, 1.45);
  camera.rotation.y += (Math.random() - 0.5) * 0.05;
  updateHUD();
  if (state.health <= 0) endGame();
}

function healPlayer(amount) {
  state.health = Math.min(100, state.health + amount);
  state.healT = 0.2;
  updateHUD();
}

function startReload() {
  const w = WEAPONS[state.weapon];
  const a = state.ammo[state.weapon];
  if (state.reload || a.mag >= w.mag || a.reserve <= 0) return;
  state.reload = { t: 0, dur: w.reload, weapon: state.weapon };
  sfx.reload(state.weapon === 'shotgun');
}

function finishReload() {
  const w = WEAPONS[state.reload.weapon];
  const a = state.ammo[state.reload.weapon];
  const take = Math.min(w.mag - a.mag, a.reserve);
  a.mag += take;
  a.reserve -= take;
  state.reload = null;
  updateHUD();
}

function setWeapon(name) {
  if (name === state.weapon) return;
  state.reload = null;
  state.weapon = name;
  state.switchT = 0;
  state.bloom = 0;
  Object.keys(weaponModels).forEach((k) => {
    weaponModels[k].group.visible = k === name;
  });
  muzzleFlash.visible = false;
  sfx.swap();
  updateHUD();
}

function cycleWeapon() {
  setWeapon(state.weapon === 'rifle' ? 'shotgun' : 'rifle');
}

function showPrompt(text, duration) {
  ui.prompt.textContent = text;
  state.promptT = duration;
}

function waveInfo(n) {
  const blood = n % 5 === 0;
  const total = 6 + n * 3 + (blood ? 4 : 0);
  let name = 'ГЛУБОКАЯ НОЧЬ';
  if (n <= 2) name = 'СУМЕРКИ';
  else if (n <= 4) name = 'ГОНЧИЕ В ТУМАНЕ';
  if (blood) name = 'КРОВАВАЯ ЛУНА';
  return {
    n, blood, total, name,
    maxAlive: Math.min(22, 5 + Math.ceil(n * 1.5)),
    hpMul: Math.min(3.5, 1 + 0.12 * (n - 1)),
    speedMul: Math.min(1.6, 1 + 0.04 * (n - 1)),
    dmgMul: Math.min(2, 1 + 0.05 * (n - 1)),
    runnerW: n >= 3 ? Math.min(0.45, 0.18 + 0.03 * (n - 3)) : 0,
    bruteW: n >= 5 ? Math.min(0.22, 0.05 + 0.02 * (n - 5)) : 0,
    brutesGuaranteed: blood ? Math.floor(n / 5) + 1 : 0,
    spawnInterval: Math.max(0.35, 1.3 - n * 0.06)
  };
}

function buildQueue(info) {
  const brutes = Math.min(info.total - 1, info.brutesGuaranteed + Math.round(info.total * info.bruteW));
  const runners = Math.min(info.total - brutes, Math.round(info.total * info.runnerW));
  const stalkers = info.total - brutes - runners;
  const queue = [];
  for (let i = 0; i < brutes; i++) queue.push('brute');
  for (let i = 0; i < runners; i++) queue.push('runner');
  for (let i = 0; i < stalkers; i++) queue.push('stalker');
  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }
  return queue;
}

function showBanner(title, sub, blood, duration) {
  ui.bannerTitle.textContent = title;
  ui.bannerSub.textContent = sub;
  ui.banner.classList.toggle('blood', blood);
  ui.banner.classList.add('active');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => ui.banner.classList.remove('active'), duration);
}

function startWave(n) {
  const info = waveInfo(n);
  wave.n = n;
  wave.info = info;
  wave.queue = buildQueue(info);
  wave.total = wave.queue.length;
  wave.state = 'active';
  wave.spawnTimer = 0.6;
  state.envTarget = info.blood ? 1 : 0;
  ui.waveValue.textContent = n;
  ui.waveSubtitle.textContent = info.name;
  ui.waveSubtitle.classList.toggle('blood-moon', info.blood);
  showBanner('ВОЛНА ' + n, info.name, info.blood, 2800);
  sfx.waveStart(info.blood);
  sfx.setMusicMode(info.blood ? 'blood' : 'combat');
}

function completeWave() {
  const info = wave.info;
  const bonus = (500 + info.n * 250) * (info.blood ? 2 : 1);
  addScore(bonus);
  healPlayer(20);
  const loot = info.blood ? 2 : 1;
  for (let i = 0; i < loot; i++) {
    const a = Math.random() * Math.PI * 2;
    spawnPickup('ammo', player.x + Math.sin(a) * 4, player.z + Math.cos(a) * 4);
    spawnPickup('health', player.x - Math.sin(a) * 4, player.z - Math.cos(a) * 4);
  }
  wave.state = 'intermission';
  wave.timer = 5;
  showBanner('ВОЛНА ' + info.n + ' ПРОЙДЕНА', 'БОНУС +' + bonus, false, 3200);
  sfx.pickup();
  sfx.setMusicMode('intermission');
}

function updateWave(dt) {
  if (wave.state === 'intermission') {
    wave.timer -= dt;
    if (wave.timer <= 0) startWave(wave.n + 1);
    return;
  }
  if (wave.state !== 'active') return;
  wave.spawnTimer -= dt;
  if (wave.queue.length && enemies.length < wave.info.maxAlive && wave.spawnTimer <= 0) {
    spawnEnemy(wave.queue.pop());
    wave.spawnTimer = wave.info.spawnInterval;
  }
  const remaining = wave.queue.length + enemies.length;
  ui.waveBar.style.width = (remaining / wave.total) * 100 + '%';
  if (remaining === 0) completeWave();
}

function hasLineOfSight(ax, az, bx, bz) {
  const dx = bx - ax;
  const dz = bz - az;
  const len2 = dx * dx + dz * dz;
  if (len2 < 1e-6) return true;
  for (const c of colliders) {
    const t = THREE.MathUtils.clamp(((c.x - ax) * dx + (c.z - az) * dz) / len2, 0, 1);
    const px = ax + t * dx - c.x;
    const pz = az + t * dz - c.z;
    if (px * px + pz * pz < c.r * c.r) return false;
  }
  return true;
}

function updateEnemies(dt) {
  const px = player.x;
  const pz = player.z;
  let threat = null;
  let threatDist = 11;

  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    if (e.dead) continue;
    const cfg = e.cfg;
    let dx = px - e.x;
    let dz = pz - e.z;
    let dist = Math.hypot(dx, dz) || 0.001;
    let nx = dx / dist;
    let nz = dz / dist;
    let tx = nx;
    let tz = nz;
    if (cfg.zig && dist > 4.5) {
      const side = Math.sin(time * 2.8 + e.phase) * 0.65 * Math.min(1, dist / 14);
      tx = nx - nz * side;
      tz = nz + nx * side;
      const l = Math.hypot(tx, tz) || 1;
      tx /= l;
      tz /= l;
    }

    const reach = 1.45 + 0.55 * cfg.scale;
    const stopDist = CFG.playerRadius + e.radius + 0.55;
    const speed = e.windup > 0 ? e.speed * 0.1 : (dist <= stopDist + 0.1 ? 0 : e.speed);
    e.x += (tx * speed + e.kx) * dt;
    e.z += (tz * speed + e.kz) * dt;
    const decay = Math.exp(-6 * dt);
    e.kx *= decay;
    e.kz *= decay;

    for (let j = i + 1; j < enemies.length; j++) {
      const o = enemies[j];
      const ox = e.x - o.x;
      const oz = e.z - o.z;
      const min = e.radius + o.radius;
      const d2 = ox * ox + oz * oz;
      if (d2 < min * min && d2 > 1e-6) {
        const d = Math.sqrt(d2);
        const push = (min - d) * 0.5;
        e.x += (ox / d) * push;
        e.z += (oz / d) * push;
        o.x -= (ox / d) * push;
        o.z -= (oz / d) * push;
      }
    }
    resolveCollisions(e, e.radius);

    dx = px - e.x;
    dz = pz - e.z;
    dist = Math.hypot(dx, dz) || 0.001;
    nx = dx / dist;
    nz = dz / dist;
    if (dist < stopDist) {
      const push = stopDist - dist;
      e.x -= nx * push;
      e.z -= nz * push;
      dist = stopDist;
    }

    e.group.position.x = e.x;
    e.group.position.z = e.z;
    e.group.rotation.y = Math.atan2(nx, nz);

    e.walk += speed * dt * 1.4;
    const swing = Math.sin(e.walk) * 0.7;
    e.legL.rotation.x = swing;
    e.legR.rotation.x = -swing;
    if (e.windup > 0) {
      const p = 1 - e.windup / e.windupMax;
      e.armL.rotation.x = -2.3 * p;
      e.armR.rotation.x = -2.3 * p;
    } else {
      e.armL.rotation.x = -swing * 0.8 - 0.5;
      e.armR.rotation.x = swing * 0.8 - 0.5;
    }
    e.group.position.y = Math.abs(Math.sin(e.walk)) * 0.07 * cfg.scale;

    if (e.flash > 0) {
      e.flash -= dt;
      const f = Math.max(0, e.flash / 0.12);
      e.mat.emissive.setRGB(
        e.baseEmissive.r + f * 0.85,
        e.baseEmissive.g + f * 0.35,
        e.baseEmissive.b + f * 0.25
      );
    } else {
      e.mat.emissive.copy(e.baseEmissive);
    }

    if (e.bar) {
      e.bar.position.set(e.x, 3.6 * cfg.scale + 0.4, e.z);
      e.bar.quaternion.copy(camera.quaternion);
      e.bar.userData.fill.scale.x = 2.1 * Math.max(0, e.hp / e.maxHp);
    }

    if (e.windup > 0) {
      e.windup -= dt;
      if (e.windup <= 0) {
        const airborne = player.y > CFG.eye + 0.9;
        if (dist <= reach + 0.2 && !airborne && hasLineOfSight(e.x, e.z, px, pz)) {
          hurtPlayer(e.dmg, e.x, e.z);
          player.vx += nx * 3.5;
          player.vz += nz * 3.5;
        }
        e.kx -= nx * 4.5;
        e.kz -= nz * 4.5;
        e.attackCd = cfg.cd;
      }
    } else if (e.attackCd > 0) {
      e.attackCd -= dt;
    } else if (dist <= reach && hasLineOfSight(e.x, e.z, px, pz)) {
      e.windup = cfg.windup;
      e.windupMax = cfg.windup;
      sfx.growl();
    }

    if (dist < threatDist) {
      threatDist = dist;
      threat = e;
    }
    if (state.gameOver) return;
  }

  updateThreat(threat);
}

function getRelativeAngleDeg(targetX, targetZ) {
  camera.getWorldDirection(_f);
  const fl = Math.hypot(_f.x, _f.z) || 1;
  const fx = _f.x / fl;
  const fz = _f.z / fl;
  const dx = targetX - player.x;
  const dz = targetZ - player.z;
  const dl = Math.hypot(dx, dz) || 1;
  const forwardDot = (fx * dx + fz * dz) / dl;
  const rightDot = (-fz * dx + fx * dz) / dl;
  return {
    angleDeg: Math.atan2(rightDot, forwardDot) * (180 / Math.PI),
    forwardDot,
    rightDot
  };
}

function updateThreat(e) {
  ui.threat.className = 'threat-indicator';
  if (state.dirHitT > 0) {
    const rel = getRelativeAngleDeg(state.hitSourceX, state.hitSourceZ);
    ui.dirRing.style.setProperty('--dir-angle', rel.angleDeg.toFixed(1) + 'deg');
    ui.dirRing.className = 'dir-ring hit';
    return;
  }

  if (!e) {
    ui.dirRing.className = 'dir-ring';
    return;
  }

  const rel = getRelativeAngleDeg(e.x, e.z);
  const dist = Math.hypot(e.x - player.x, e.z - player.z);
  if (dist > 6 || (rel.forwardDot > 0.55 && e.windup <= 0)) {
    ui.dirRing.className = 'dir-ring';
    return;
  }
  ui.dirRing.style.setProperty('--dir-angle', rel.angleDeg.toFixed(1) + 'deg');
  ui.dirRing.className = 'dir-ring warn';
}

function updatePickups(dt) {
  for (let i = pickups.length - 1; i >= 0; i--) {
    const p = pickups[i];
    p.life -= dt;
    p.phase += dt * 3;
    p.body.rotation.y += dt * 1.5;
    p.mesh.position.y = 0.5 + Math.sin(p.phase) * 0.12;
    p.mesh.visible = p.life > 4 || Math.floor(p.life * 6) % 2 === 0;
    const dx = player.x - p.x;
    const dz = player.z - p.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 5 && dist > 0.001) {
      const pull = 7 * dt;
      p.x += (dx / dist) * pull;
      p.z += (dz / dist) * pull;
      p.mesh.position.x = p.x;
      p.mesh.position.z = p.z;
    }
    let taken = false;
    if (dist < 1.8) {
      if (p.type === 'health') {
        if (state.health < 100) {
          healPlayer(30);
          showPrompt('+ ЗДОРОВЬЕ', 0.8);
          taken = true;
        }
      } else {
        state.ammo.rifle.reserve = Math.min(WEAPONS.rifle.reserveMax, state.ammo.rifle.reserve + 30);
        state.ammo.shotgun.reserve = Math.min(WEAPONS.shotgun.reserveMax, state.ammo.shotgun.reserve + 6);
        showPrompt('+ ПАТРОНЫ', 0.8);
        updateHUD();
        taken = true;
      }
    }
    if (taken) sfx.pickup();
    if (taken || p.life <= 0) {
      scene.remove(p.mesh);
      pickups.splice(i, 1);
    }
  }
}

function updatePlayer(dt) {
  const yaw = camera.rotation.y;
  const fx = -Math.sin(yaw);
  const fz = -Math.cos(yaw);
  const rx = Math.cos(yaw);
  const rz = -Math.sin(yaw);
  const ix = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  const iz = (keys.fwd ? 1 : 0) - (keys.back ? 1 : 0);
  let wx = fx * iz + rx * ix;
  let wz = fz * iz + rz * ix;
  const wl = Math.hypot(wx, wz);
  if (wl > 0) {
    wx /= wl;
    wz /= wl;
  }
  const speed = CFG.moveSpeed * (iz < 0 ? 0.8 : 1);
  const rate = state.dashT > 0 ? 1.5 : (player.onGround ? 14 : 3);
  const k = 1 - Math.exp(-rate * dt);
  player.vx += (wx * speed - player.vx) * k;
  player.vz += (wz * speed - player.vz) * k;

  player.x += player.vx * dt;
  player.z += player.vz * dt;
  for (const e of enemies) {
    if (e.dead) continue;
    const dx = player.x - e.x;
    const dz = player.z - e.z;
    const min = CFG.playerRadius + e.radius + 0.45;
    const d2 = dx * dx + dz * dz;
    if (d2 < min * min && d2 > 1e-6) {
      const d = Math.sqrt(d2);
      const push = min - d;
      player.x += (dx / d) * push;
      player.z += (dz / d) * push;
    }
  }
  resolveCollisions(player, CFG.playerRadius);

  player.vy -= CFG.gravity * dt;
  player.y += player.vy * dt;
  if (player.y <= CFG.eye) {
    player.y = CFG.eye;
    player.vy = 0;
    player.onGround = true;
  } else {
    player.onGround = false;
  }

  const planar = Math.hypot(player.vx, player.vz);
  if (player.onGround && planar > 3) {
    state.stepT -= dt * (planar / CFG.moveSpeed);
    if (state.stepT <= 0) {
      sfx.step();
      state.stepT = 0.36;
    }
  }

  if (state.dashT > 0) state.dashT -= dt;
  if (state.staminaDelay > 0) state.staminaDelay -= dt;
  else state.stamina = Math.min(100, state.stamina + CFG.staminaRegen * dt);
}

function tryDash() {
  if (state.stamina < CFG.dashCost || state.dashT > 0) return;
  const yaw = camera.rotation.y;
  const ix = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  const iz = (keys.fwd ? 1 : 0) - (keys.back ? 1 : 0);
  let dx;
  let dz;
  if (ix === 0 && iz === 0) {
    dx = -Math.sin(yaw);
    dz = -Math.cos(yaw);
  } else {
    dx = -Math.sin(yaw) * iz + Math.cos(yaw) * ix;
    dz = -Math.cos(yaw) * iz - Math.sin(yaw) * ix;
    const l = Math.hypot(dx, dz);
    dx /= l;
    dz /= l;
  }
  player.vx = dx * CFG.dashSpeed;
  player.vz = dz * CFG.dashSpeed;
  state.dashT = 0.22;
  state.stamina -= CFG.dashCost;
  state.staminaDelay = 0.8;
  sfx.dash();
}

function tryJump() {
  if (!player.onGround) return;
  player.vy = CFG.jumpSpeed;
  player.onGround = false;
  sfx.jump();
}

function updateWeaponLogic(dt) {
  const w = WEAPONS[state.weapon];
  if (state.fireCd > 0) state.fireCd -= dt;
  state.bloom = Math.max(0, state.bloom - dt * 0.08);

  if (state.reload) {
    state.reload.t += dt;
    if (state.reload.t >= state.reload.dur) finishReload();
  }

  if (state.firing && !state.reload && state.fireCd <= 0 && state.switchT >= 0.6) {
    const a = state.ammo[state.weapon];
    if (a.mag > 0) fireWeapon();
    else if (a.reserve > 0) startReload();
    else {
      sfx.empty();
      showPrompt('НЕТ ПАТРОНОВ', 0.8);
      state.fireCd = 0.35;
    }
  }
  return w;
}

function updateWeaponModel(dt) {
  const w = WEAPONS[state.weapon];
  const model = weaponModels[state.weapon].group;
  const planar = Math.hypot(player.vx, player.vz) / CFG.moveSpeed;
  const moveN = player.onGround ? Math.min(1, planar) : 0;
  if (moveN > 0.1) bobPhase += dt * (6 + moveN * 5);

  const decay = Math.exp(-10 * dt);
  sway.x *= decay;
  sway.y *= decay;
  state.recoil *= Math.exp(-14 * dt);
  state.recoilRot *= Math.exp(-9 * dt);
  if (state.switchT < 1) state.switchT = Math.min(1, state.switchT + dt / 0.25);

  let reloadDip = 0;
  let reloadTilt = 0;
  if (state.reload) {
    const p = state.reload.t / state.reload.dur;
    const s = Math.sin(Math.PI * Math.min(1, p));
    reloadDip = s * 0.18;
    reloadTilt = s * 0.7;
  }

  model.position.x = w.base.x + Math.cos(bobPhase * 0.5) * 0.012 * moveN + sway.x;
  model.position.y = w.base.y + Math.sin(bobPhase) * 0.014 * moveN + sway.y - (1 - state.switchT) * 0.4 - reloadDip;
  model.position.z = w.base.z + state.recoil * 0.07;
  model.rotation.x = state.recoilRot + reloadTilt + sway.y * 1.5;
  model.rotation.y = -0.05 + sway.x * 2;
  model.rotation.z = reloadTilt * 0.3;

  if (state.weapon === 'shotgun') {
    const pump = model.userData.pump;
    pump.position.z = -0.35 + (state.fireCd > 0.2 ? Math.sin(Math.min(1, (state.fireCd - 0.2) / 0.5) * Math.PI) * 0.1 : 0);
  }

  if (state.flashT > 0) {
    state.flashT -= dt;
    if (state.flashT <= 0) muzzleFlash.visible = false;
  }
  muzzleLight.intensity *= Math.exp(-30 * dt);
  boomLight.intensity *= Math.exp(-5 * dt);

  const targetFov = CFG.baseFov + (state.dashT > 0 ? 10 : 0);
  state.fov += (targetFov - state.fov) * (1 - Math.exp(-12 * dt));
  if (Math.abs(camera.fov - state.fov) > 0.05) {
    camera.fov = state.fov;
    camera.updateProjectionMatrix();
  }

  const bob = Math.sin(bobPhase * 2) * 0.03 * moveN;
  camera.position.set(player.x, player.y + bob, player.z);
}

function updateTimers(dt) {
  if (state.comboT > 0) {
    state.comboT -= dt;
    if (state.comboT <= 0) resetCombo();
  }
  if (state.hitT > 0) {
    state.hitT -= dt;
    if (state.hitT <= 0) ui.hitmarker.classList.remove('active', 'headshot');
  }
  if (state.damageT > 0) {
    state.damageT -= dt;
    if (state.damageT <= 0) ui.damage.classList.remove('active');
  }
  if (state.dirHitT > 0) state.dirHitT = Math.max(0, state.dirHitT - dt);
  if (state.healT > 0) {
    state.healT -= dt;
    if (state.healT <= 0) ui.heal.classList.remove('active');
  }
  if (state.damageT > 0) ui.damage.classList.add('active');
  if (state.healT > 0) ui.heal.classList.add('active');
  if (state.promptT > 0) state.promptT -= dt;

  const low = state.health <= 30;
  ui.lowHp.classList.toggle('active', low);
  if (low) {
    state.heartT -= dt;
    if (state.heartT <= 0) {
      sfx.heartbeat();
      state.heartT = 0.95;
    }
  }

  const a = state.ammo[state.weapon];
  if (state.reload) {
    ui.prompt.textContent = 'ПЕРЕЗАРЯДКА...';
    ui.prompt.classList.add('active');
    ui.reloadBar.style.width = (state.reload.t / state.reload.dur) * 100 + '%';
  } else {
    ui.reloadBar.style.width = '100%';
    if (state.promptT > 0) ui.prompt.classList.add('active');
    else if (a.mag === 0 && a.reserve === 0) {
      ui.prompt.textContent = 'НЕТ ПАТРОНОВ';
      ui.prompt.classList.add('active');
    } else if (a.mag === 0) {
      ui.prompt.textContent = 'НАЖМИТЕ R';
      ui.prompt.classList.add('active');
    } else ui.prompt.classList.remove('active');
  }

  ui.staminaBar.style.width = state.stamina + '%';
  ui.staminaLabel.textContent = state.stamina >= CFG.dashCost ? 'ГОТОВ' : 'ЗАРЯДКА';

  const mult = comboMultiplier();
  ui.comboBadge.textContent = '×' + mult;
  ui.comboBadge.classList.toggle('active', state.combo >= 3);
  ui.comboFill.style.width = state.combo > 0 ? (state.comboT / CFG.comboWindow) * 100 + '%' : '0%';

  const planar = Math.hypot(player.vx, player.vz) / CFG.moveSpeed;
  const spread = 6 + planar * 8 + state.bloom * 260 + (player.onGround ? 0 : 8) + state.recoil * 6;
  ui.crosshair.style.setProperty('--spread', spread.toFixed(1) + 'px');
}

function updateEnvironment(dt) {
  state.envBlend += (state.envTarget - state.envBlend) * (1 - Math.exp(-0.8 * dt));
  const b = state.envBlend;
  scene.fog.color.lerpColors(COLORS.fogNormal, COLORS.fogBlood, b);
  scene.background.copy(scene.fog.color);
  moonLight.color.lerpColors(COLORS.lightNormal, COLORS.lightBlood, b);
  hemi.color.lerpColors(COLORS.skyNormal, COLORS.skyBlood, b);
  moonMesh.material.color.lerpColors(COLORS.moonNormal, COLORS.moonBlood, b);

  stars.position.copy(camera.position);
  const moonDir = _d.set(0.45, 0.6, 0.35).normalize();
  moonMesh.position.copy(camera.position).addScaledVector(moonDir, 360);
  moonLight.position.set(player.x + moonDir.x * 80, moonDir.y * 80, player.z + moonDir.z * 80);
  moonLight.target.position.set(player.x, 0, player.z);
}

function drawRadar() {
  const cvs = ui.radarCanvas;
  if (!cvs) return;
  const g = cvs.getContext('2d');
  const w = cvs.width;
  const h = cvs.height;
  const cx = w / 2;
  const cy = h / 2;
  const maxR = cx - 5;
  const range = 45;

  g.clearRect(0, 0, w, h);

  camera.getWorldDirection(_f);
  const fl = Math.hypot(_f.x, _f.z) || 1;
  const fx = _f.x / fl;
  const fz = _f.z / fl;
  const rx = -fz;
  const rz = fx;

  g.fillStyle = 'rgba(255, 140, 0, 0.11)';
  g.beginPath();
  g.moveTo(cx, cy);
  g.arc(cx, cy, maxR, -Math.PI / 2 - 0.65, -Math.PI / 2 + 0.65);
  g.closePath();
  g.fill();

  g.strokeStyle = 'rgba(255, 140, 0, 0.22)';
  g.lineWidth = 1;
  for (const frac of [0.33, 0.66, 1]) {
    g.beginPath();
    g.arc(cx, cy, maxR * frac, 0, Math.PI * 2);
    g.stroke();
  }

  for (const p of pickups) {
    const dx = p.x - player.x;
    const dz = p.z - player.z;
    const px = cx + ((dx * rx + dz * rz) / range) * maxR;
    const py = cy - ((dx * fx + dz * fz) / range) * maxR;
    if (Math.hypot(px - cx, py - cy) > maxR) continue;
    g.fillStyle = p.type === 'health' ? '#2eff7b' : '#ffc44d';
    g.fillRect(px - 2, py - 2, 4, 4);
  }

  for (const e of enemies) {
    if (e.dead) continue;
    const dx = e.x - player.x;
    const dz = e.z - player.z;
    let sx = ((dx * rx + dz * rz) / range) * maxR;
    let sy = -((dx * fx + dz * fz) / range) * maxR;
    const d = Math.hypot(sx, sy);
    if (d > maxR - 2) {
      sx = (sx / d) * (maxR - 2);
      sy = (sy / d) * (maxR - 2);
    }
    g.fillStyle = e.type === 'brute' ? '#d86bff' : (e.type === 'runner' ? '#ffb82e' : '#ff3b3b');
    const dotR = e.type === 'brute' ? 4.2 : (e.windup > 0 ? 4.0 : 3.0);
    g.beginPath();
    g.arc(cx + sx, cy + sy, dotR, 0, Math.PI * 2);
    g.fill();
  }

  g.fillStyle = '#ffffff';
  g.beginPath();
  g.arc(cx, cy, 3, 0, Math.PI * 2);
  g.fill();
}

function updateHUD() {
  ui.healthValue.textContent = state.health;
  ui.healthValue.classList.toggle('low', state.health <= 30);
  ui.healthBar.style.width = state.health + '%';
  ui.killsValue.textContent = state.kills;
  ui.headshotsValue.textContent = state.headshots;
  ui.scoreValue.textContent = state.score;
  const a = state.ammo[state.weapon];
  ui.ammoValue.textContent = a.mag;
  ui.ammoReserve.textContent = '/ ' + a.reserve;
  ui.weaponLabel.textContent = WEAPONS[state.weapon].name + ' [R]';
  ui.slotRifle.classList.toggle('active', state.weapon === 'rifle');
  ui.slotShotgun.classList.toggle('active', state.weapon === 'shotgun');
}

function showHud(visible) {
  ui.hud.style.display = visible ? 'flex' : 'none';
  ui.hudTop.style.display = visible ? 'flex' : 'none';
  ui.crosshair.style.display = visible ? 'block' : 'none';
  ui.backLink.classList.toggle('hidden', visible);
}

function newRun() {
  sfx.init();
  clearWorldObjects();
  Object.assign(state, {
    running: true, gameOver: false, health: 100, kills: 0, headshots: 0, score: 0,
    shots: 0, hits: 0, combo: 0, comboT: 0, stamina: 100, staminaDelay: 0,
    weapon: 'rifle', firing: false, fireCd: 0, reload: null, bloom: 0, recoil: 0, recoilRot: 0,
    switchT: 1, flashT: 0, hitT: 0, damageT: 0, dirHitT: 0, healT: 0, promptT: 0, dashT: 0,
    envBlend: 0, envTarget: 0
  });
  state.ammo = { rifle: { mag: 30, reserve: 120 }, shotgun: { mag: 8, reserve: 24 } };
  Object.keys(weaponModels).forEach((k) => {
    weaponModels[k].group.visible = k === 'rifle';
  });
  muzzleFlash.visible = false;
  Object.assign(player, { x: 0, y: CFG.eye, z: 0, vx: 0, vz: 0, vy: 0, onGround: true });
  camera.rotation.set(0, 0, 0, 'YXZ');
  wave.n = 0;
  wave.state = 'intermission';
  wave.timer = 2.5;
  wave.info = waveInfo(1);
  ui.waveValue.textContent = '1';
  ui.waveSubtitle.textContent = 'СУМЕРКИ';
  ui.waveSubtitle.classList.remove('blood-moon');
  ui.waveBar.style.width = '100%';
  ui.gameOver.classList.add('hidden');
  updateHUD();
  onLock();
  try { controls.lock(); } catch (err) {}
}

function endGame() {
  if (state.gameOver) return;
  state.gameOver = true;
  state.playing = false;
  state.running = false;
  state.firing = false;
  controls.unlock();
  showHud(false);
  ui.backLink.classList.remove('hidden');
  ui.damage.classList.remove('active');
  ui.lowHp.classList.remove('active');
  ui.threat.className = 'threat-indicator';
  ui.dirRing.className = 'dir-ring';
  ui.prompt.classList.remove('active');
  ui.banner.classList.remove('active');
  sfx.setMusicMode('gameover');

  const best = readBest();
  const isRecord = state.score > best.score;
  if (isRecord || (state.score === best.score && wave.n > best.wave)) {
    localStorage.setItem(STORAGE.best, JSON.stringify({ score: state.score, wave: wave.n }));
  } else if (wave.n > best.wave) {
    localStorage.setItem(STORAGE.best, JSON.stringify({ score: best.score, wave: wave.n }));
  }
  refreshBest();

  const accuracy = state.shots ? Math.round((state.hits / state.shots) * 100) : 0;
  ui.finalScore.textContent = state.score;
  ui.finalWave.textContent = wave.n;
  ui.finalKills.textContent = state.kills;
  ui.finalAccuracy.textContent = state.headshots + ' / ' + accuracy + '%';
  ui.newRecord.classList.toggle('hidden', !isRecord || state.score === 0);
  ui.nameInput.value = localStorage.getItem(STORAGE.name) || '';
  ui.submitBtn.disabled = state.score <= 0;
  ui.submitStatus.textContent = '';
  ui.gameOver.classList.remove('hidden');
  ui.startScreen.classList.add('hidden');
  Leaderboard.load();
}

function refreshBest() {
  const best = readBest();
  ui.bestScore.textContent = best.score;
  ui.bestWave.textContent = best.wave;
}

async function submitScore() {
  if (ui.submitBtn.disabled) return;
  const name = (ui.nameInput.value.trim() || 'ОХОТНИК').toUpperCase().slice(0, 16);
  ui.nameInput.value = name;
  localStorage.setItem(STORAGE.name, name);
  ui.submitBtn.disabled = true;
  ui.submitStatus.textContent = 'Отправка...';
  const mode = await Leaderboard.submit({
    name, score: state.score, wave: wave.n, kills: state.kills, headshots: state.headshots
  });
  ui.submitStatus.textContent = mode === 'server'
    ? 'Результат записан в таблицу'
    : 'Сервер недоступен, результат сохранён на этом устройстве';
}

function onLock() {
  state.playing = true;
  state.gameOver = false;
  showHud(true);
  ui.startScreen.classList.add('hidden');
  ui.gameOver.classList.add('hidden');
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  if (wave.state === 'active' && wave.info) {
    sfx.setMusicMode(wave.info.blood ? 'blood' : 'combat');
  } else {
    sfx.setMusicMode('intermission');
  }
  updateHUD();
}

function onUnlock() {
  state.playing = false;
  state.firing = false;
  keys.fwd = keys.back = keys.left = keys.right = false;
  showHud(false);
  ui.backLink.classList.remove('hidden');
  if (!state.gameOver) {
    sfx.setMusicMode('menu');
    ui.startScreen.classList.remove('hidden');
    ui.startBtn.textContent = state.running ? 'ПРОДОЛЖИТЬ' : 'ВСТУПИТЬ В БОЙ';
    ui.startSubtitle.textContent = state.running ? 'ПАУЗА' : 'ТАКТИЧЕСКИЙ ВЫЖИВАЧ В НОЧНОМ ЛЕСУ';
  }
}

function bindInput() {
  const unlockMenuAudio = () => sfx.init();
  document.addEventListener('pointerdown', unlockMenuAudio, { once: true });
  document.addEventListener('keydown', unlockMenuAudio, { once: true });
  document.addEventListener('keydown', (e) => {
    if (e.target && e.target.tagName === 'INPUT') {
      if (e.code === 'Enter') submitScore();
      return;
    }
    if (e.code === 'KeyM') {
      sfx.setEnabled(!sfx.enabled);
      ui.hudSound.innerHTML = '<span>[M]</span> ЗВУК: ' + (sfx.enabled ? 'ВКЛ' : 'ВЫКЛ');
      ui.hudSound.classList.toggle('off', !sfx.enabled);
    }
    if (e.code === 'KeyB') {
      state.postBloom = !state.postBloom;
      ui.hudBloom.innerHTML = '<span>[B]</span> BLOOM: ' + (state.postBloom ? 'ВКЛ' : 'ВЫКЛ');
      ui.hudBloom.classList.toggle('off', !state.postBloom);
    }
    if (!state.playing) return;
    switch (e.code) {
      case 'Escape': if (!controls.isLocked) onUnlock(); break;
      case 'KeyW': case 'ArrowUp': keys.fwd = true; break;
      case 'KeyS': case 'ArrowDown': keys.back = true; break;
      case 'KeyA': case 'ArrowLeft': keys.left = true; break;
      case 'KeyD': case 'ArrowRight': keys.right = true; break;
      case 'Space': e.preventDefault(); tryJump(); break;
      case 'ShiftLeft': case 'ShiftRight': if (!e.repeat) tryDash(); break;
      case 'Digit1': setWeapon('rifle'); break;
      case 'Digit2': setWeapon('shotgun'); break;
      case 'KeyR': startReload(); break;
      case 'KeyF':
        state.flashlight = !state.flashlight;
        flashlight.intensity = state.flashlight ? CFG.flashlightIntensity : 0;
        ui.hudFlash.innerHTML = '<span>[F]</span> ФОНАРИК: ' + (state.flashlight ? 'ВКЛ' : 'ВЫКЛ');
        ui.hudFlash.classList.toggle('off', !state.flashlight);
        break;
      default: break;
    }
  });

  document.addEventListener('keyup', (e) => {
    switch (e.code) {
      case 'KeyW': case 'ArrowUp': keys.fwd = false; break;
      case 'KeyS': case 'ArrowDown': keys.back = false; break;
      case 'KeyA': case 'ArrowLeft': keys.left = false; break;
      case 'KeyD': case 'ArrowRight': keys.right = false; break;
      default: break;
    }
  });

  document.addEventListener('mousedown', (e) => {
    if (!state.playing || e.button !== 0) return;
    if (!controls.isLocked) {
      try { controls.lock(); } catch (err) {}
    }
    state.firing = true;
  });
  document.addEventListener('mouseup', (e) => {
    if (e.button === 0) state.firing = false;
  });
  document.addEventListener('mousemove', (e) => {
    if (!state.playing) return;
    if (!controls.isLocked) {
      camera.rotation.y -= e.movementX * 0.0022;
      camera.rotation.x = THREE.MathUtils.clamp(camera.rotation.x - e.movementY * 0.0022, -1.45, 1.45);
    }
    sway.x = THREE.MathUtils.clamp(sway.x - e.movementX * 0.0004, -0.06, 0.06);
    sway.y = THREE.MathUtils.clamp(sway.y + e.movementY * 0.0003, -0.05, 0.05);
  });
  document.addEventListener('wheel', (e) => {
    if (state.playing && Math.abs(e.deltaY) > 0) cycleWeapon();
  }, { passive: true });
  document.addEventListener('contextmenu', (e) => {
    if (state.playing) e.preventDefault();
  });

  ui.startBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    sfx.init();
    if (state.running) {
      onLock();
      try { controls.lock(); } catch (err) {}
    } else {
      newRun();
    }
  });
  ui.restartBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    newRun();
  });
  ui.submitBtn.addEventListener('click', submitScore);
}

function init() {
  const rand = mulberry32(99);
  scene = new THREE.Scene();
  scene.background = COLORS.fogNormal.clone();
  scene.fog = new THREE.Fog(COLORS.fogNormal.clone(), 18, 92);

  camera = new THREE.PerspectiveCamera(CFG.baseFov, window.innerWidth / window.innerHeight, 0.05, 1000);
  camera.rotation.order = 'YXZ';
  camera.position.set(0, CFG.eye, 0);
  scene.add(camera);

  renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, CFG.maxPixelRatio));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  $('game-container').appendChild(renderer.domElement);

  composer = new EffectComposer(renderer);
  composer.setPixelRatio(Math.min(window.devicePixelRatio, CFG.maxPixelRatio));
  composer.setSize(window.innerWidth, window.innerHeight);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    CFG.bloomStrength, 0.3, CFG.bloomThreshold
  ));
  composer.addPass(new OutputPass());

  controls = new PointerLockControls(camera, renderer.domElement);
  controls.addEventListener('lock', onLock);
  controls.addEventListener('unlock', onUnlock);

  hemi = new THREE.HemisphereLight(COLORS.skyNormal.clone(), 0x1e2e1e, CFG.hemiIntensity);
  scene.add(hemi);

  moonLight = new THREE.DirectionalLight(COLORS.lightNormal.clone(), CFG.moonIntensity);
  moonLight.castShadow = true;
  moonLight.shadow.mapSize.set(1024, 1024);
  moonLight.shadow.camera.left = -45;
  moonLight.shadow.camera.right = 45;
  moonLight.shadow.camera.top = 45;
  moonLight.shadow.camera.bottom = -45;
  moonLight.shadow.camera.near = 1;
  moonLight.shadow.camera.far = 220;
  moonLight.shadow.bias = -0.0005;
  moonLight.shadow.normalBias = 0.05;
  scene.add(moonLight, moonLight.target);

  flashlight = new THREE.SpotLight(0xfff5e4, CFG.flashlightIntensity, 90, 0.68, 0.5, 1.0);
  flashlight.position.set(0.0, 0.0, -0.95);
  flashlight.target.position.set(0, 0, -10);
  flashlight.castShadow = false;
  camera.add(flashlight, flashlight.target);

  playerLight = new THREE.PointLight(0x9ab8ff, 6, 14, 1.4);
  playerLight.position.set(0, 0.4, 0);
  camera.add(playerLight);

  muzzleLight = new THREE.PointLight(0xffaa55, 0, 25, 2);
  muzzleLight.position.set(0.3, -0.1, -1.2);
  camera.add(muzzleLight);

  boomLight = new THREE.PointLight(0xff4a1a, 0, 45, 1.5);
  scene.add(boomLight);

  const groundMat = new THREE.MeshLambertMaterial({ map: createGroundTexture(rand) });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(320, 320), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  buildForest();
  buildSky();
  buildTracers();
  particles = new ParticlePool(250);
  buildWeapons();
  bindInput();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
  });

  refreshBest();
  updateHUD();
  Leaderboard.load();
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  time += dt;

  if (state.playing && !state.gameOver) {
    updatePlayer(dt);
    updateWeaponLogic(dt);
    updateWave(dt);
    updateEnemies(dt);
    if (!state.gameOver) {
      updatePickups(dt);
      updateTimers(dt);
      drawRadar();
    }
  } else if (!state.running) {
    camera.rotation.y += dt * 0.05;
  }

  updateWeaponModel(state.playing ? dt : 0);
  particles.update(dt);
  updateTracers(dt);
  updateEnvironment(dt);
  if (state.postBloom) composer.render();
  else renderer.render(scene, camera);
}

init();
animate();


