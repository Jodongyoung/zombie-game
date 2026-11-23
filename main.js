import * as THREE from 'three';

// ==========================================
// 1. 안전한 리얼 오디오 엔진 + 무기별 합성 사운드
// ==========================================
let audioListener = null;
let soundBuffers = {};
let activeSounds = {};
let audioLoader = null;
let isAudioReady = false;
let isSoundOn = true;

const soundFiles = {
  ak47: './sound/ak47.mp3',
  m4a1: './sound/m4a1.mp3',
  sniper: './sound/sniper.mp3',
  laser: './sound/laser.mp3',
  pistol: './sound/pistol.mp3',
  axe: './sound/axe.mp3',
  boom: './sound/boom.mp3',
  reload: './sound/reload.mp3'
};

const SOUND_CFG = {
  ak47:   { dur: 0.35, offset: 0, overlap: true },
  m4a1:   { dur: 0.30, offset: 0, overlap: true },
  sniper: { dur: 0.90, offset: 0, overlap: false },
  laser:  { dur: 0.35, offset: 0, overlap: true },
  pistol: { dur: 0.50, offset: 0, overlap: true },
  axe:    { dur: 0.40, offset: 0, overlap: false },
  boom:   { dur: 1.00, offset: 0, overlap: false },
  reload: { dur: 0.40, offset: 0, overlap: false }
};

function initAudio(callback) {
  if (isAudioReady) {
    if (callback) callback();
    return;
  }
  try {
    audioListener = new THREE.AudioListener();
    camera.add(audioListener);
    audioLoader = new THREE.AudioLoader();

    for (const [key, path] of Object.entries(soundFiles)) {
      audioLoader.load(path, (buffer) => {
        soundBuffers[key] = buffer;
      }, undefined, (err) => {
        console.warn(`[무시 가능] 오디오 파일 로드 실패 (${key}):`, err);
      });
    }
  } catch (e) {
    console.warn("오디오 초기화 중 예외 발생:", e);
  }
  isAudioReady = true;
  if (callback) callback();
}

function playBowSound() {
  if (!isSoundOn || !audioListener) return;
  try {
    const ctx = audioListener.context;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(250, now);
    osc.frequency.exponentialRampToValueAtTime(72, now + 0.16);
    oscGain.gain.setValueAtTime(0.36, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(oscGain); oscGain.connect(ctx.destination);
    osc.start(now); osc.stop(now + 0.19);

    const bufferSize = Math.floor(ctx.sampleRate * 0.22);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1450, now);
    filter.frequency.exponentialRampToValueAtTime(420, now + 0.22);
    filter.Q.value = 3.0;

    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.28, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    noise.connect(filter); filter.connect(nGain); nGain.connect(ctx.destination);
    noise.start(now);
  } catch (e) {}
}

function playBladeSound(isKatana = false, pitchMult = 1.0) {
  if (!isSoundOn || !audioListener) return;
  try {
    const ctx = audioListener.context;
    const now = ctx.currentTime;

    const dur = isKatana ? 0.21 : 0.28;
    const bufferSize = Math.floor(ctx.sampleRate * dur);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime((isKatana ? 950 : 600) * pitchMult, now);
    filter.frequency.exponentialRampToValueAtTime((isKatana ? 3600 : 2500) * pitchMult, now + 0.07);
    filter.frequency.exponentialRampToValueAtTime(750 * pitchMult, now + dur);
    filter.Q.value = isKatana ? 3.4 : 2.2;

    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.05, now);
    nGain.gain.linearRampToValueAtTime(0.46, now + 0.06);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    noise.connect(filter); filter.connect(nGain); nGain.connect(ctx.destination);
    noise.start(now);

    const ringOsc = ctx.createOscillator();
    const ringGain = ctx.createGain();
    ringOsc.type = 'sine';
    ringOsc.frequency.setValueAtTime((isKatana ? 2750 : 1800) * pitchMult, now + 0.02);
    ringOsc.frequency.exponentialRampToValueAtTime((isKatana ? 1980 : 1280) * pitchMult, now + dur);
    ringGain.gain.setValueAtTime(isKatana ? 0.12 : 0.08, now + 0.02);
    ringGain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    ringOsc.connect(ringGain); ringGain.connect(ctx.destination);
    ringOsc.start(now + 0.02); ringOsc.stop(now + dur + 0.01);
  } catch (e) {}
}

function playBazookaLaunchSound() {
  if (!isSoundOn || !audioListener) return;
  try {
    const ctx = audioListener.context;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.45);
    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(now); osc.stop(now + 0.5);

    const bufferSize = Math.floor(ctx.sampleRate * 0.45);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, now);
    filter.frequency.exponentialRampToValueAtTime(220, now + 0.45);

    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.45, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    noise.connect(filter); filter.connect(nGain); nGain.connect(ctx.destination);
    noise.start(now);
  } catch (e) {}
}

function playSound(type) {
  if (!isSoundOn) return;
  if (type === 'bow') { playBowSound(); return; }
  if (type === 'machete') { playBladeSound(false, 1.0); return; }
  if (type === 'katana') { playBladeSound(true, 1.0); return; }
  if (type === 'katana2') { playBladeSound(true, 1.18); return; }
  if (type === 'bazooka') { playBazookaLaunchSound(); return; }

  if (!audioListener || !soundBuffers[type]) return;
  try {
    const cfg = SOUND_CFG[type] || { dur: 0.2, offset: 0, overlap: false };

    if (!cfg.overlap && activeSounds[type]) {
      try { activeSounds[type].stop(); } catch (e) {}
    }

    const vol = type === 'boom' ? 0.8 : 0.4;

    const sound = new THREE.Audio(audioListener);
    sound.setBuffer(soundBuffers[type]);
    sound.offset = cfg.offset;
    sound.duration = cfg.dur;
    sound.setVolume(vol);
    sound.play();

    const g = sound.gain.gain;
    const t = sound.context.currentTime;
    g.cancelScheduledValues(t);
    g.setValueAtTime(vol, t);
    g.setValueAtTime(vol, t + Math.max(0, cfg.dur - 0.05));
    g.linearRampToValueAtTime(0, t + cfg.dur);

    activeSounds[type] = sound;
  } catch (e) {}
}

// ==========================================
// 2. URL 파라미터(맵 & 난이도 20/30/40R) 파싱 및 3종 맵 생성
// ==========================================
const urlParams = new URLSearchParams(window.location.search);
const requestedMap = urlParams.get('map');
const requestedDiff = urlParams.get('diff');

const MAP_CONFIGS = {
  mountain: { name: '좀비 산장', bg: 0x6b93a3, fogNear: 25, fogFar: 120, ambColor: 0xbad2e0, ambInt: 1.4, sunColor: 0xfff7e6, sunInt: 2.2 },
  city:     { name: '유령 도시', bg: 0x161224, fogNear: 12, fogFar: 88,  ambColor: 0x6b5b95, ambInt: 1.15, sunColor: 0x93c5fd, sunInt: 1.05 },
  desert:   { name: '사막 유적', bg: 0xd97742, fogNear: 28, fogFar: 130, ambColor: 0xfde68a, ambInt: 1.45, sunColor: 0xffedd5, sunInt: 2.5 }
};
const currentMap = MAP_CONFIGS[requestedMap] ? requestedMap : 'mountain';
const mapCfg = MAP_CONFIGS[currentMap];

const DIFFICULTY_CFG = {
  easy: {
    name: '쉬움',
    maxRounds: 20,
    zHpMult: 0.72,
    zBaseSpeed: 2.2,
    zRoundSpeedStep: 0.04,
    zSpeedMult: 0.85,
    dmgTaken: 0.65,
    hasBoss: false,
    bossScaleWithRound: false,
    archerChance: 0.08,
    archerBaseCd: 3.1,
    archerMinCd: 2.0
  },
  normal: {
    name: '보통',
    maxRounds: 30,
    zHpMult: 1.0,
    zBaseSpeed: 2.5,
    zRoundSpeedStep: 0.085,
    zSpeedMult: 1.05,
    dmgTaken: 1.0,
    hasBoss: true,
    bossScaleWithRound: false,
    archerChance: 0.14,
    archerBaseCd: 2.6,
    archerMinCd: 1.45
  },
  hard: {
    name: '어려움',
    maxRounds: 40,
    zHpMult: 1.25,
    zBaseSpeed: 2.9,
    zRoundSpeedStep: 0.125,
    zSpeedMult: 1.22,
    dmgTaken: 1.35,
    hasBoss: true,
    bossScaleWithRound: true,
    archerChance: 0.22,
    archerBaseCd: 2.2,
    archerMinCd: 1.15
  }
};
const currentDiff = DIFFICULTY_CFG[requestedDiff] ? requestedDiff : 'normal';
const diffCfg = DIFFICULTY_CFG[currentDiff];

document.getElementById('hud-diff').textContent = `${mapCfg.name} · ${diffCfg.name} (최대 ${diffCfg.maxRounds}R)`;
document.getElementById('modal-title').textContent = `ZOMBIE SURVIVAL : ${mapCfg.name}`;

const scene = new THREE.Scene();
scene.background = new THREE.Color(mapCfg.bg);
scene.fog = new THREE.Fog(mapCfg.bg, mapCfg.fogNear, mapCfg.fogFar);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.05, 180);
scene.add(camera);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(mapCfg.ambColor, mapCfg.ambInt);
scene.add(ambientLight);
const sunLight = new THREE.DirectionalLight(mapCfg.sunColor, mapCfg.sunInt);
sunLight.position.set(40, 60, 30);
scene.add(sunLight);

const colliders = [];
const flickeringLights = [];

function addCircleCollider(x, z, radius) {
  colliders.push({ shape: 'circle', x, z, radius });
}
function addBoxCollider(x, z, halfW, halfD) {
  colliders.push({ shape: 'box', x, z, halfW, halfD });
}

function checkCollision(nx, nz, entityRadius = 0.5) {
  if (Math.abs(nx) > 84 || Math.abs(nz) > 84) return true;

  for (let c of colliders) {
    if (c.shape === 'circle') {
      const dx = nx - c.x;
      const dz = nz - c.z;
      if (dx * dx + dz * dz < (c.radius + entityRadius) * (c.radius + entityRadius)) return true;
    } else if (c.shape === 'box') {
      if (Math.abs(nx - c.x) < c.halfW + entityRadius && Math.abs(nz - c.z) < c.halfD + entityRadius) return true;
    }
  }
  return false;
}

function moveEntityTowardTarget(posObj, dirX, dirZ, moveSpeed, entityRadius, steerSign = 1) {
  const stepX = dirX * moveSpeed;
  const stepZ = dirZ * moveSpeed;

  if (!checkCollision(posObj.x + stepX, posObj.z + stepZ, entityRadius)) {
    posObj.x += stepX;
    posObj.z += stepZ;
    return;
  }

  const canX = !checkCollision(posObj.x + stepX, posObj.z, entityRadius);
  const canZ = !checkCollision(posObj.x, posObj.z + stepZ, entityRadius);
  if (canX || canZ) {
    if (canX) posObj.x += stepX;
    if (canZ) posObj.z += stepZ;
    return;
  }

  const angles = [0.65 * steerSign, -0.65 * steerSign, 1.2 * steerSign, -1.2 * steerSign];
  for (const ang of angles) {
    const cos = Math.cos(ang);
    const sin = Math.sin(ang);
    const rx = dirX * cos - dirZ * sin;
    const rz = dirX * sin + dirZ * cos;
    const tx = posObj.x + rx * moveSpeed;
    const tz = posObj.z + rz * moveSpeed;
    if (!checkCollision(tx, tz, entityRadius)) {
      posObj.x = tx;
      posObj.z = tz;
      return;
    }
  }
}

function buildMountainMap() {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(180, 180),
    new THREE.MeshStandardMaterial({ color: 0x3d4f36, roughness: 0.9 })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const mountainMat = new THREE.MeshStandardMaterial({ color: 0x44413b, roughness: 0.95, flatShading: true });
  for (let i = 0; i < 30; i++) {
    const angle = (i / 30) * Math.PI * 2;
    const dist = 70 + Math.random() * 20;
    const radius = 18 + Math.random() * 12;
    const height = 35 + Math.random() * 25;
    const mx = Math.cos(angle) * dist;
    const mz = Math.sin(angle) * dist;
    const mountain = new THREE.Mesh(new THREE.ConeGeometry(radius, height, 6), mountainMat);
    mountain.position.set(mx, height / 2 - 2, mz);
    scene.add(mountain);
    addCircleCollider(mx, mz, radius * 0.7);
  }

  const trunkGeo = new THREE.CylinderGeometry(0.3, 0.5, 2.5, 6);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3a2312, roughness: 0.9 });
  const leavesMat = new THREE.MeshStandardMaterial({ color: 0x1b3b22, roughness: 0.8, flatShading: true });
  for (let i = 0; i < 60; i++) {
    const x = (Math.random() - 0.5) * 110;
    const z = (Math.random() - 0.5) * 110;
    if (Math.hypot(x, z) > 10) {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 1.25;
      tree.add(trunk);
      for (let j = 0; j < 3; j++) {
        const leaves = new THREE.Mesh(new THREE.ConeGeometry(2.0 - j * 0.45, 2.8 - j * 0.4, 6), leavesMat);
        leaves.position.y = 3.2 + j * 1.3;
        tree.add(leaves);
      }
      tree.position.set(x, 0, z);
      scene.add(tree);
      addCircleCollider(x, z, 1.0);
    }
  }
}

function buildGhostCityMap() {
  const asphalt = new THREE.Mesh(
    new THREE.PlaneGeometry(180, 180),
    new THREE.MeshStandardMaterial({ color: 0x1c1f26, roughness: 0.75, metalness: 0.15 })
  );
  asphalt.rotation.x = -Math.PI / 2;
  scene.add(asphalt);

  const roadMat = new THREE.MeshStandardMaterial({ color: 0x13151a, roughness: 0.85 });
  const roadNS = new THREE.Mesh(new THREE.PlaneGeometry(14, 170), roadMat);
  roadNS.rotation.x = -Math.PI / 2; roadNS.position.y = 0.01;
  const roadEW = new THREE.Mesh(new THREE.PlaneGeometry(170, 14), roadMat);
  roadEW.rotation.x = -Math.PI / 2; roadEW.position.y = 0.01;
  scene.add(roadNS, roadEW);

  const yellowLineMat = new THREE.MeshBasicMaterial({ color: 0xd97706 });
  const whiteStripeMat = new THREE.MeshBasicMaterial({ color: 0x9ca3af });
  for (let d = -75; d <= 75; d += 8) {
    if (Math.abs(d) < 9) continue;
    const dash1 = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 3.5), yellowLineMat);
    dash1.rotation.x = -Math.PI / 2; dash1.position.set(0, 0.02, d);
    const dash2 = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 0.25), yellowLineMat);
    dash2.rotation.x = -Math.PI / 2; dash2.position.set(d, 0.02, 0);
    scene.add(dash1, dash2);
  }
  for (let s = -5; s <= 5; s += 2) {
    const cw1 = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 3.2), whiteStripeMat);
    cw1.rotation.x = -Math.PI / 2; cw1.position.set(s, 0.02, 9.5);
    const cw2 = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 3.2), whiteStripeMat);
    cw2.rotation.x = -Math.PI / 2; cw2.position.set(s, 0.02, -9.5);
    scene.add(cw1, cw2);
  }

  const buildingPalette = [0x222630, 0x2a2736, 0x1e252b, 0x2e2a33];
  const litWindowMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
  const eerieWindowMat = new THREE.MeshBasicMaterial({ color: 0xa855f7 });
  const darkWindowMat = new THREE.MeshBasicMaterial({ color: 0x090b10 });

  const blockCoords = [-52, -32, -16, 16, 32, 52];
  for (let bx of blockCoords) {
    for (let bz of blockCoords) {
      const w = 8 + Math.random() * 4;
      const d = 8 + Math.random() * 4;
      const h = 16 + Math.random() * 28;
      const bMat = new THREE.MeshStandardMaterial({
        color: buildingPalette[Math.floor(Math.random() * buildingPalette.length)],
        roughness: 0.9
      });

      const bGroup = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bMat);
      body.position.y = h / 2;
      bGroup.add(body);

      const floors = Math.floor(h / 4);
      for (let f = 1; f < floors; f++) {
        if (Math.random() < 0.45) continue;
        const winMat = Math.random() < 0.14 ? (Math.random() < 0.5 ? litWindowMat : eerieWindowMat) : darkWindowMat;
        const winFront = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.65, 1.1), winMat);
        winFront.position.set(0, f * 3.8, d / 2 + 0.03);
        const winSide = new THREE.Mesh(new THREE.PlaneGeometry(d * 0.65, 1.1), winMat);
        winSide.rotation.y = Math.PI / 2;
        winSide.position.set(w / 2 + 0.03, f * 3.8, 0);
        bGroup.add(winFront, winSide);
      }

      bGroup.position.set(bx, 0, bz);
      scene.add(bGroup);
      addBoxCollider(bx, bz, w / 2, d / 2);
    }
  }

  const poleMat = new THREE.MeshStandardMaterial({ color: 0x374151, metalness: 0.8, roughness: 0.3 });
  const lampSpots = [
    { x: -7.5, z: -18, color: 0xffb703 },
    { x: 7.5,  z: 18,  color: 0xffb703 },
    { x: -18,  z: 7.5, color: 0xef4444 },
    { x: 18,   z: -7.5,color: 0xc084fc },
    { x: -7.5, z: 38,  color: 0xffb703 },
    { x: 7.5,  z: -38, color: 0xef4444 }
  ];

  lampSpots.forEach((spot, idx) => {
    const lampGroup = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 6.5, 8), poleMat);
    pole.position.y = 3.25;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 0.12), poleMat);
    arm.position.set(spot.x < 0 ? 0.6 : -0.6, 6.4, 0);

    const bulbMat = new THREE.MeshBasicMaterial({ color: spot.color });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), bulbMat);
    bulb.position.set(spot.x < 0 ? 1.2 : -1.2, 6.25, 0);

    const pointLight = new THREE.PointLight(spot.color, 14, 24);
    pointLight.position.copy(bulb.position).add(new THREE.Vector3(0, -0.4, 0));

    lampGroup.add(pole, arm, bulb, pointLight);
    lampGroup.position.set(spot.x, 0, spot.z);
    scene.add(lampGroup);
    addCircleCollider(spot.x, spot.z, 0.45);

    flickeringLights.push({
      light: pointLight,
      bulbMat: bulbMat,
      baseIntensity: 14,
      phase: idx * 1.7
    });
  });

  const wreckColors = [0x7f1d1d, 0x1e3a8a, 0x374151, 0x713f12];
  const wrecks = [
    { x: -3.2, z: -24, rot: 0.35 },
    { x: 3.4,  z: 26,  rot: -0.4 },
    { x: -25,  z: -2.8,rot: 1.3 },
    { x: 27,   z: 3.1, rot: 1.8 }
  ];
  wrecks.forEach((wk, i) => {
    const car = new THREE.Group();
    const cMat = new THREE.MeshStandardMaterial({ color: wreckColors[i % wreckColors.length], roughness: 0.8 });
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.85, 4.2), cMat);
    chassis.position.y = 0.55;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.7, 2.2), cMat);
    cabin.position.set(0, 1.25, -0.2);
    car.add(chassis, cabin);
    car.position.set(wk.x, 0, wk.z);
    car.rotation.y = wk.rot;
    scene.add(car);
    addCircleCollider(wk.x, wk.z, 1.8);
  });
}

function buildDesertMap() {
  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(180, 180),
    new THREE.MeshStandardMaterial({ color: 0xc2854c, roughness: 0.95 })
  );
  sand.rotation.x = -Math.PI / 2;
  scene.add(sand);

  const pyramidMat = new THREE.MeshStandardMaterial({ color: 0xa1622f, roughness: 0.9, flatShading: true });
  const pyramids = [
    { x: -58, z: -58, r: 22, h: 32 },
    { x: 60,  z: -54, r: 26, h: 38 },
    { x: -55, z: 60,  r: 24, h: 35 },
    { x: 62,  z: 58,  r: 20, h: 30 }
  ];
  pyramids.forEach(p => {
    const pyr = new THREE.Mesh(new THREE.ConeGeometry(p.r, p.h, 4), pyramidMat);
    pyr.position.set(p.x, p.h / 2 - 1, p.z);
    pyr.rotation.y = Math.PI / 4;
    scene.add(pyr);
    addCircleCollider(p.x, p.z, p.r * 0.72);
  });

  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x9a5b2c, roughness: 0.85 });
  const runeMat = new THREE.MeshBasicMaterial({ color: 0xff5500 });
  for (let i = 0; i < 24; i++) {
    const angle = (i / 24) * Math.PI * 2;
    const dist = i % 2 === 0 ? 22 : 42;
    const px = Math.cos(angle) * dist;
    const pz = Math.sin(angle) * dist;
    const h = 5 + Math.random() * 6;

    const pillar = new THREE.Group();
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.9, h, 8), pillarMat);
    col.position.y = h / 2;
    pillar.add(col);

    if (i % 4 === 0) {
      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.55), runeMat);
      crystal.position.y = h + 1.0;
      pillar.add(crystal);
    }

    pillar.position.set(px, 0, pz);
    scene.add(pillar);
    addCircleCollider(px, pz, 1.05);
  }

  const cactusMat = new THREE.MeshStandardMaterial({ color: 0x2f6f3e, roughness: 0.8 });
  for (let i = 0; i < 35; i++) {
    const x = (Math.random() - 0.5) * 115;
    const z = (Math.random() - 0.5) * 115;
    if (Math.hypot(x, z) > 10) {
      const cactus = new THREE.Group();
      const mainStem = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 2.8, 8), cactusMat);
      mainStem.position.y = 1.4;
      const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 1.1, 8), cactusMat);
      armL.position.set(-0.42, 1.7, 0); armL.rotation.z = 0.5;
      const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 1.0, 8), cactusMat);
      armR.position.set(0.42, 1.4, 0); armR.rotation.z = -0.5;
      cactus.add(mainStem, armL, armR);
      cactus.position.set(x, 0, z);
      scene.add(cactus);
      addCircleCollider(x, z, 0.7);
    }
  }
}

if (currentMap === 'city') buildGhostCityMap();
else if (currentMap === 'desert') buildDesertMap();
else buildMountainMap();

// ==========================================
// 3. 전 무기 3D 모델링
// ==========================================
const WEAPONS_DATA = {
  ak47:     { slot: 1, name: 'AK-47',         type: 'auto',    damage: 40,  rate: 0.11,  mag: 30,       reloadTime: 1.8, recoil: 0.08 },
  m4a1:     { slot: 1, name: 'M4A1',          type: 'auto',    damage: 28,  rate: 0.075, mag: 30,       reloadTime: 1.6, recoil: 0.045 },
  shotgun:  { slot: 1, name: 'SPAS-12 샷건',  type: 'shotgun', damage: 24,  rate: 0.75,  mag: 8,        reloadTime: 2.0, recoil: 0.14, pellets: 8, spread: 0.14 },
  sniper:   { slot: 1, name: 'AWP 스나이퍼',  type: 'semi',    damage: 180, rate: 1.1,   mag: 5,        reloadTime: 2.4, recoil: 0.16 },
  laser:    { slot: 1, name: '팜 레이저',     type: 'auto',    damage: 52,  rate: 0.12,  mag: 35,       reloadTime: 1.6, recoil: 0.035 },
  bow:      { slot: 1, name: '컴파운드 활',   type: 'bow',     damage: 155, rate: 0.62,  mag: Infinity, reloadTime: 0,   recoil: 0.05 },

  pistol:   { slot: 2, name: 'Glock 권총',    type: 'semi',    damage: 26,  rate: 0.16,  mag: 15,       reloadTime: 1.1, recoil: 0.04 },
  deagle:   { slot: 2, name: '데저트 이글',   type: 'semi',    damage: 68,  rate: 0.34,  mag: 7,        reloadTime: 1.4, recoil: 0.11 },
  sawedoff: { slot: 2, name: '샷건 권총',     type: 'shotgun', damage: 22,  rate: 0.48,  mag: 4,        reloadTime: 1.5, recoil: 0.13, pellets: 6, spread: 0.18 },
  uzi:      { slot: 2, name: '기관권총 (UZI)',type: 'auto',    damage: 19,  rate: 0.065, mag: 25,       reloadTime: 1.3, recoil: 0.045 },

  axe:      { slot: 3, name: '전투 도끼',     type: 'melee',   damage: 95,  rate: 0.60,  mag: Infinity, reloadTime: 0,   recoil: 0 },
  machete:  { slot: 3, name: '긴 마체테',     type: 'machete', damage: 125, rate: 0.54,  mag: Infinity, reloadTime: 0,   recoil: 0 },
  katana:   { slot: 3, name: '카타나',        type: 'katana',  damage: 90,  rate: 0.68,  mag: Infinity, reloadTime: 0,   recoil: 0 },

  grenade:  { slot: 4, name: '수류탄',        type: 'throw',   damage: 300, rate: 1.0,   mag: Infinity, reloadTime: 0,   recoil: 0.1 },
  bazooka:  { slot: 4, name: '바주카포 (RPG)',type: 'bazooka', damage: 500, rate: 1.1,   mag: 10,       reloadTime: 0,   recoil: 0.18 }
};

const weaponRig = new THREE.Group(); camera.add(weaponRig);

const steelMat = new THREE.MeshStandardMaterial({ color: 0x1f2428, metalness: 0.85, roughness: 0.25 });
const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd0d7de, metalness: 0.92, roughness: 0.15 });
const silverBladeMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.96, roughness: 0.10 });
const darkSpineMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.88, roughness: 0.22 });
const goldMat = new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.88, roughness: 0.20 });
const woodMat = new THREE.MeshStandardMaterial({ color: 0x5a2d16, roughness: 0.7 });
const camoMat = new THREE.MeshStandardMaterial({ color: 0x2e3d30, metalness: 0.6, roughness: 0.4 });
const darkPolyMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4 });

const akModel = new THREE.Group();
akModel.add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.11, 0.45), steelMat));
const akStock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.13, 0.38), woodMat); akStock.position.set(0, -0.04, 0.38); akModel.add(akStock);
const akGrip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 0.08), woodMat); akGrip.position.set(0, -0.14, 0.14); akGrip.rotation.x = -Math.PI / 6; akModel.add(akGrip);
const akHand = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.09, 0.32), woodMat); akHand.position.set(0, 0.01, -0.34); akModel.add(akHand);
const akBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.55, 8), steelMat); akBarrel.rotation.x = Math.PI / 2; akBarrel.position.set(0, 0.02, -0.55); akModel.add(akBarrel);
const akMag = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.28, 0.12), steelMat); akMag.position.set(0, -0.17, -0.08); akMag.rotation.x = Math.PI / 7; akModel.add(akMag);

const m4Model = new THREE.Group();
m4Model.add(new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.11, 0.44), camoMat));
const m4Stock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.34), darkPolyMat); m4Stock.position.set(0, -0.03, 0.36); m4Model.add(m4Stock);
const m4Handle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 0.16), darkPolyMat); m4Handle.position.set(0, 0.08, 0.02); m4Model.add(m4Handle);
const m4Barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.5, 8), darkPolyMat); m4Barrel.rotation.x = Math.PI / 2; m4Barrel.position.set(0, 0.02, -0.52); m4Model.add(m4Barrel);
const m4Silencer = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.25, 8), darkPolyMat); m4Silencer.rotation.x = Math.PI / 2; m4Silencer.position.set(0, 0.02, -0.8); m4Model.add(m4Silencer);
const m4Mag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.24, 0.09), darkPolyMat); m4Mag.position.set(0, -0.16, -0.06); m4Model.add(m4Mag);

const shotgunModel = new THREE.Group();
shotgunModel.add(new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, 0.52), steelMat));
const sgStock = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.14, 0.36), darkPolyMat); sgStock.position.set(0, -0.04, 0.4); shotgunModel.add(sgStock);
const sgBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.62, 10), steelMat); sgBarrel.rotation.x = Math.PI / 2; sgBarrel.position.set(0, 0.03, -0.52); shotgunModel.add(sgBarrel);
const sgTube = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.56, 10), darkPolyMat); sgTube.rotation.x = Math.PI / 2; sgTube.position.set(0, -0.015, -0.49); shotgunModel.add(sgTube);
const sgPump = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.08, 0.24), darkPolyMat); sgPump.position.set(0, -0.02, -0.36); shotgunModel.add(sgPump);

const sniperModel = new THREE.Group();
sniperModel.add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.6), camoMat));
const sniperStock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.14, 0.42), camoMat); sniperStock.position.set(0, -0.03, 0.44); sniperModel.add(sniperStock);
const sniperBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.85, 8), steelMat); sniperBarrel.rotation.x = Math.PI / 2; sniperBarrel.position.set(0, 0.02, -0.72); sniperModel.add(sniperBarrel);
const scopeMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.35, 12), steelMat); scopeMesh.rotation.x = Math.PI / 2; scopeMesh.position.set(0, 0.1, -0.05); sniperModel.add(scopeMesh);

const laserHandModel = new THREE.Group();
const cyberArmorMat = new THREE.MeshStandardMaterial({ color: 0x2a3b4c, metalness: 0.8, roughness: 0.3 });
const foreArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.38), cyberArmorMat); foreArm.position.set(0, -0.06, 0.16); laserHandModel.add(foreArm);
const palmPlate = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.14, 0.05), steelMat); palmPlate.position.set(0, 0, -0.06); laserHandModel.add(palmPlate);
const repulsorCore = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.02, 16), new THREE.MeshBasicMaterial({ color: 0x00f0ff }));
repulsorCore.rotation.x = Math.PI / 2; repulsorCore.position.set(0, 0, -0.086); laserHandModel.add(repulsorCore);
const fingerMat = new THREE.MeshStandardMaterial({ color: 0x334455, metalness: 0.9, roughness: 0.2 });
const thumb = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.1, 8), fingerMat); thumb.rotation.z = Math.PI / 3; thumb.position.set(-0.085, -0.02, -0.08); laserHandModel.add(thumb);
for (let f = 0; f < 4; f++) {
  const finger = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.1, 8), fingerMat);
  finger.position.set(-0.045 + f * 0.03, 0.11, -0.08); finger.rotation.z = (f - 1.5) * 0.08; laserHandModel.add(finger);
}
laserHandModel.position.set(0.04, -0.04, 0.05);

const bowModel = new THREE.Group();
const bowArcGeo = new THREE.TorusGeometry(0.42, 0.016, 10, 28, Math.PI * 0.84);
const bowArc = new THREE.Mesh(bowArcGeo, camoMat);
bowArc.rotation.y = Math.PI / 2;
bowArc.rotation.z = -Math.PI * 0.42;
bowArc.position.set(0, 0, 0.18);
bowModel.add(bowArc);

const bowRiser = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.22, 10), darkPolyMat);
bowRiser.position.set(0, 0, -0.24);
bowModel.add(bowRiser);

const camGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.016, 14);
camGeo.rotateZ(Math.PI / 2);
const topCam = new THREE.Mesh(camGeo, steelMat);
topCam.position.set(0, 0.405, 0.07);
const botCam = new THREE.Mesh(camGeo, steelMat);
botCam.position.set(0, -0.405, 0.07);
bowModel.add(topCam, botCam);

const bowString = new THREE.Mesh(new THREE.CylinderGeometry(0.0028, 0.0028, 0.81, 6), new THREE.MeshBasicMaterial({ color: 0xfacc15 }));
bowString.position.set(0, 0, 0.07);
bowModel.add(bowString);

const nockedArrowGroup = new THREE.Group();
const arrowShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.68, 8), darkPolyMat);
arrowShaft.rotation.x = Math.PI / 2;
arrowShaft.position.set(0, 0, -0.26);
const arrowTip = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.065, 4), silverBladeMat);
arrowTip.rotation.x = -Math.PI / 2;
arrowTip.position.set(0, 0, -0.62);
const fletch1 = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.003, 0.11), new THREE.MeshBasicMaterial({ color: 0x2ecc71 }));
fletch1.position.set(0, 0, 0.02);
const fletch2 = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.045, 0.11), new THREE.MeshBasicMaterial({ color: 0x2ecc71 }));
fletch2.position.set(0, 0, 0.02);
nockedArrowGroup.add(arrowShaft, arrowTip, fletch1, fletch2);
nockedArrowGroup.position.set(-0.025, 0.02, 0);
bowModel.add(nockedArrowGroup);

bowModel.rotation.set(0.05, 0.12, 0.42);
bowModel.position.set(-0.04, 0.02, -0.05);

const pistolModel = new THREE.Group();
const pSlide = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.24), steelMat); pSlide.position.set(0, 0.03, 0); pistolModel.add(pSlide);
const pGrip = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.15, 0.08), darkPolyMat); pGrip.position.set(0, -0.08, 0.06); pGrip.rotation.x = -Math.PI / 8; pistolModel.add(pGrip);

const deagleModel = new THREE.Group();
const dSlide = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.09, 0.34), chromeMat); dSlide.position.set(0, 0.04, -0.04); deagleModel.add(dSlide);
const dBarrel = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.06, 0.14), steelMat); dBarrel.position.set(0, 0.045, -0.24); deagleModel.add(dBarrel);
const dGrip = new THREE.Mesh(new THREE.BoxGeometry(0.064, 0.17, 0.095), darkPolyMat); dGrip.position.set(0, -0.08, 0.08); dGrip.rotation.x = -Math.PI / 7; deagleModel.add(dGrip);

const sawedoffModel = new THREE.Group();
const soLeftBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.36, 10), steelMat);
soLeftBarrel.rotation.x = Math.PI / 2; soLeftBarrel.position.set(-0.025, 0.04, -0.14);
const soRightBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.36, 10), steelMat);
soRightBarrel.rotation.x = Math.PI / 2; soRightBarrel.position.set(0.025, 0.04, -0.14);
const soReceiver = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.075, 0.14), steelMat);
soReceiver.position.set(0, 0.03, 0.08);
const soGrip = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.16, 0.09), woodMat);
soGrip.position.set(0, -0.07, 0.15); soGrip.rotation.x = -Math.PI / 4;
sawedoffModel.add(soLeftBarrel, soRightBarrel, soReceiver, soGrip);

const uziModel = new THREE.Group();
const uziBody = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.11, 0.28), steelMat); uziBody.position.set(0, 0.02, 0); uziModel.add(uziBody);
const uziBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.18, 8), darkPolyMat); uziBarrel.rotation.x = Math.PI / 2; uziBarrel.position.set(0, 0.03, -0.2); uziModel.add(uziBarrel);
const uziGrip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.15, 0.075), darkPolyMat); uziGrip.position.set(0, -0.08, 0.01); uziModel.add(uziGrip);
const uziMag = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.24, 0.055), steelMat); uziMag.position.set(0, -0.16, 0.01); uziModel.add(uziMag);

const axeModel = new THREE.Group();
const axeShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.028, 0.72, 10), woodMat); axeShaft.position.y = 0.06; axeModel.add(axeShaft);
const axeHead = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.14, 0.12), steelMat); axeHead.position.set(0, 0.34, -0.02); axeModel.add(axeHead);
const axeBlade = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.30, 0.22), silverBladeMat); axeBlade.position.set(0, 0.34, -0.16); axeModel.add(axeBlade);
const axeSpike = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.14, 6), steelMat); axeSpike.rotation.x = Math.PI / 2; axeSpike.position.set(0, 0.34, 0.12); axeModel.add(axeSpike);
axeModel.rotation.set(-0.22, 0, -0.08);
axeModel.position.set(0.03, -0.06, 0.05);

const macheteModel = new THREE.Group();
const mHilt = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.24, 0.055), darkPolyMat);
mHilt.position.set(0, -0.08, 0); macheteModel.add(mHilt);
for (let r = -1; r <= 1; r++) {
  const rivet = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.042, 8), chromeMat);
  rivet.rotation.z = Math.PI / 2;
  rivet.position.set(0, -0.08 + r * 0.06, 0);
  macheteModel.add(rivet);
}
const mGuard = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.026, 0.10), steelMat);
mGuard.position.set(0, 0.045, -0.01); macheteModel.add(mGuard);
const mBladeBase = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.50, 0.068), silverBladeMat);
mBladeBase.position.set(0, 0.30, -0.012); macheteModel.add(mBladeBase);
const mFuller = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.44, 0.016), darkSpineMat);
mFuller.position.set(0, 0.30, 0.006); macheteModel.add(mFuller);
const mBladeBelly = new THREE.Mesh(new THREE.BoxGeometry(0.010, 0.44, 0.092), silverBladeMat);
mBladeBelly.position.set(0, 0.75, -0.022); mBladeBelly.rotation.x = -0.03; macheteModel.add(mBladeBelly);
const mTip = new THREE.Mesh(new THREE.ConeGeometry(0.046, 0.15, 4), silverBladeMat);
mTip.position.set(0, 1.03, -0.028); mTip.rotation.x = -0.18; mTip.scale.set(0.24, 1, 1); macheteModel.add(mTip);
macheteModel.rotation.set(-0.25, -0.12, -0.14);
macheteModel.position.set(0.03, -0.06, 0.05);

const katanaModel = new THREE.Group();
const kTsuka = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.32, 0.044), darkPolyMat);
kTsuka.position.set(0, -0.12, 0); katanaModel.add(kTsuka);
const kKashira = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.03, 0.048), goldMat);
kKashira.position.set(0, -0.285, 0); katanaModel.add(kKashira);
for (let w = 0; w < 6; w++) {
  const wrap = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.018, 0.047), steelMat);
  wrap.position.set(0, -0.24 + w * 0.045, 0);
  wrap.rotation.y = 0.25;
  katanaModel.add(wrap);
}
const kTsuba = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.014, 24), goldMat);
kTsuba.position.set(0, 0.045, 0); katanaModel.add(kTsuba);
const kHabaki = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.045, 0.042), goldMat);
kHabaki.position.set(0, 0.072, 0); katanaModel.add(kHabaki);

const bladeSegments = 5;
const segLen = 0.22;
let curY = 0.095;
let curZ = 0;
let curAngle = 0;
for (let s = 0; s < bladeSegments; s++) {
  const widthScale = 1 - s * 0.07;
  const edge = new THREE.Mesh(new THREE.BoxGeometry(0.008, segLen + 0.01, 0.036 * widthScale), silverBladeMat);
  const spine = new THREE.Mesh(new THREE.BoxGeometry(0.010, segLen + 0.01, 0.012 * widthScale), darkSpineMat);
  spine.position.z = 0.014 * widthScale;

  const segGroup = new THREE.Group();
  segGroup.add(edge, spine);
  segGroup.position.set(0, curY + segLen * 0.5, curZ);
  segGroup.rotation.x = curAngle;
  katanaModel.add(segGroup);

  curY += Math.cos(curAngle) * segLen;
  curZ += Math.sin(curAngle) * segLen;
  curAngle += 0.038;
}
const kKissaki = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.13, 4), silverBladeMat);
kKissaki.position.set(0, curY + 0.055, curZ + 0.012);
kKissaki.rotation.x = curAngle + 0.05;
kKissaki.scale.set(0.26, 1, 1);
katanaModel.add(kKissaki);

katanaModel.rotation.set(-0.28, -0.15, -0.22);
katanaModel.position.set(0.02, -0.06, 0.04);

const grenadeModel = new THREE.Group();
const gBody = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), new THREE.MeshStandardMaterial({color: 0x2e3d30}));
const gPin = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.04), steelMat); gPin.position.y = 0.06;
grenadeModel.add(gBody); grenadeModel.add(gPin);
grenadeModel.position.set(0, -0.1, -0.2);

const bazookaModel = new THREE.Group();
const bazTube = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 1.15, 14), camoMat);
bazTube.rotation.x = Math.PI / 2; bazTube.position.set(0, 0.06, -0.15); bazookaModel.add(bazTube);
const bazExhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.068, 0.18, 14), steelMat);
bazExhaust.rotation.x = Math.PI / 2; bazExhaust.position.set(0, 0.06, 0.48); bazookaModel.add(bazExhaust);
const bazGrip = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.18, 0.08), darkPolyMat);
bazGrip.position.set(0, -0.06, -0.25); bazookaModel.add(bazGrip);
const bazWarhead = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.26, 12), new THREE.MeshStandardMaterial({ color: 0x8b1e1e, roughness: 0.4 }));
bazWarhead.rotation.x = -Math.PI / 2; bazWarhead.position.set(0, 0.06, -0.82); bazookaModel.add(bazWarhead);
bazookaModel.position.set(0.05, 0.02, 0.05);

weaponRig.add(
  akModel, m4Model, shotgunModel, sniperModel, laserHandModel, bowModel,
  pistolModel, deagleModel, sawedoffModel, uziModel,
  axeModel, macheteModel, katanaModel,
  grenadeModel, bazookaModel
);

const muzzleFlash = new THREE.PointLight(0xffa500, 0, 5); muzzleFlash.position.set(0, 0.02, -0.85); weaponRig.add(muzzleFlash);

const DEFAULT_WEAPON_POS = new THREE.Vector3(0.24, -0.22, -0.48);
weaponRig.position.copy(DEFAULT_WEAPON_POS);

const WEAPON_MODELS = {
  ak47: akModel,
  m4a1: m4Model,
  shotgun: shotgunModel,
  sniper: sniperModel,
  laser: laserHandModel,
  bow: bowModel,
  pistol: pistolModel,
  deagle: deagleModel,
  sawedoff: sawedoffModel,
  uzi: uziModel,
  axe: axeModel,
  machete: macheteModel,
  katana: katanaModel,
  grenade: grenadeModel,
  bazooka: bazookaModel
};

const potionGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.5, 12);
const potionMat = new THREE.MeshStandardMaterial({ color: 0xff3333, emissive: 0xaa0000, emissiveIntensity: 0.8, transparent: true, opacity: 0.9 });
const potions = [];

// ==========================================
// 4. 라운드 진행 상태 & 4슬롯 장비 변수
// ==========================================
let kills = 0, hp = 100, gameOver = false, hasStarted = false, isLocked = false, isArmoryOpen = false, isSettingsOpen = false;
let currentSlot = 1;

let currentRound = 1;
const maxRounds = diffCfg.maxRounds;
let roundToSpawn = 0;
let roundRemaining = 0;
let roundSpawnInterval = 0.85;
let roundMaxAlive = 22;
let roundClearTimer = 0;
let isRoundTransition = false;
let activeBoss = null;

const equippedBySlot = {
  1: 'ak47',
  2: 'pistol',
  3: 'axe',
  4: 'grenade'
};
let activeWeaponKey = 'ak47';

const ammoState = {
  ak47: 30,
  m4a1: 30,
  shotgun: 8,
  sniper: 5,
  laser: 35,
  pistol: 15,
  deagle: 7,
  sawedoff: 4,
  uzi: 25,
  bazooka: 10
};

let isReloading = false, reloadTimer = 0, shootCooldown = 0, isMouseDown = false, isScoped = false;
let recoilZ = 0, recoilRotX = 0;

let meleeSwingTimer = 0;
let meleeSwingDuration = 0.5;
let activeMeleeStyle = 'axe';
let katanaSecondHitDone = false;
let katanaSecondDamage = 90;

const playerPos = new THREE.Vector3(0, 1.7, 0); const playerVel = new THREE.Vector3();
let isGrounded = true, jumpCount = 0, cameraYaw = 0, cameraPitch = 0; const keys = {};
let ultCooldown = 0, isUltFalling = false;
let mouseSensMult = 1.0;

// ==========================================
// 5. 투사체 & 이펙트
// ==========================================
const thrownGrenades = [];
const explosions = [];
const expParticles = [];
const arrows = [];
const playerArrows = [];
const bazookaRockets = [];
const slashWaves = [];
const shockwaves = [];

function spawnSlashWave(isKatana, tiltAngle = 0) {
  const innerR = isKatana ? 1.15 : 0.95;
  const outerR = isKatana ? 1.95 : 1.50;
  const arcAngle = isKatana ? Math.PI * 0.88 : Math.PI * 0.75;
  const color = isKatana ? 0x38bdf8 : 0xe2e8f0;

  const arcGeo = new THREE.RingGeometry(innerR, outerR, 32, 1, -arcAngle * 0.5, arcAngle);
  const arcMat = new THREE.MeshBasicMaterial({
    color: color,
    transparent: true,
    opacity: 0.92,
    side: THREE.DoubleSide
  });
  const arc = new THREE.Mesh(arcGeo, arcMat);

  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
  arc.position.copy(playerPos).add(forward.clone().multiplyScalar(1.3)).add(new THREE.Vector3(0, -0.05, 0));
  arc.quaternion.copy(camera.quaternion);
  arc.rotateX(Math.PI / 2);

  if (tiltAngle !== 0) {
    arc.rotateY(tiltAngle);
  }

  scene.add(arc);

  slashWaves.push({
    mesh: arc,
    vel: forward.multiplyScalar(isKatana ? 16 : 10),
    life: isKatana ? 0.28 : 0.22,
    maxLife: isKatana ? 0.28 : 0.22
  });
}

function hitZombiesInCone(range, minDot, damage) {
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  forward.y = 0; forward.normalize();
  for (let i = zombies.length - 1; i >= 0; i--) {
    const z = zombies[i];
    const toZombie = z.group.position.clone().sub(playerPos);
    toZombie.y = 0;
    const dist = toZombie.length();
    const extraReach = z.type === 'boss' ? 3.2 : 0;
    if (dist < range + extraReach) {
      toZombie.normalize();
      if (forward.dot(toZombie) > minDot || dist < 2.6 + extraReach) {
        damageZombieRaw(z, damage);
      }
    }
  }
}

function shootPlayerArrow(damage) {
  const arrowGroup = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.95, 6), woodMat);
  shaft.rotation.x = Math.PI / 2;
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12, 4), silverBladeMat);
  head.rotation.x = -Math.PI / 2;
  head.position.z = -0.5;
  const fletch = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.005, 0.14), new THREE.MeshBasicMaterial({ color: 0x2ecc71 }));
  fletch.position.z = 0.4;
  arrowGroup.add(shaft, head, fletch);

  const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
  const startPos = playerPos.clone().add(dir.clone().multiplyScalar(0.8));
  arrowGroup.position.copy(startPos);
  arrowGroup.lookAt(startPos.clone().add(dir));
  scene.add(arrowGroup);

  playerArrows.push({ mesh: arrowGroup, vel: dir.multiplyScalar(58), damage: damage, life: 2.2 });
}

function shootBazookaRocket(damage) {
  const rocketGroup = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.85, 10), steelMat);
  body.rotation.x = Math.PI / 2;
  const warhead = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.28, 10), new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0x660000 }));
  warhead.rotation.x = -Math.PI / 2;
  warhead.position.z = -0.55;
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.35, 8), new THREE.MeshBasicMaterial({ color: 0xffaa00 }));
  flame.rotation.x = Math.PI / 2;
  flame.position.z = 0.58;
  rocketGroup.add(body, warhead, flame);

  const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
  const startPos = playerPos.clone().add(dir.clone().multiplyScalar(1.1));
  rocketGroup.position.copy(startPos);
  rocketGroup.lookAt(startPos.clone().add(dir));
  scene.add(rocketGroup);

  bazookaRockets.push({
    mesh: rocketGroup,
    vel: dir.multiplyScalar(42),
    damage: damage,
    life: 3.0
  });
}

function throwGrenade() {
  shootCooldown = 1.0;
  playSound('boom');
  const g = grenadeModel.clone(); scene.add(g);
  const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
  const startPos = playerPos.clone().add(new THREE.Vector3(0, 0.5, 0));
  const vel = dir.multiplyScalar(18).add(new THREE.Vector3(0, 5, 0));
  thrownGrenades.push({ mesh: g, pos: startPos, vel: vel, timer: 2.5 });
}

function createExplosion(pos, radius, damage) {
  playSound('boom');
  const flash = new THREE.PointLight(0xffaa00, 30, radius * 3);
  flash.position.copy(pos); flash.position.y += 1; scene.add(flash);
  setTimeout(() => scene.remove(flash), 150);

  const expMesh = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.4, 16, 16), new THREE.MeshBasicMaterial({ color: 0xff4500, transparent: true, opacity: 0.8 }));
  expMesh.position.copy(pos); scene.add(expMesh); explosions.push({ mesh: expMesh, life: 0.4, maxLife: 0.4 });

  for (let i = 0; i < 40; i++) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), new THREE.MeshBasicMaterial({ color: Math.random() > 0.5 ? 0xff4500 : 0xffaa00 }));
    p.position.copy(pos); scene.add(p);
    const vel = new THREE.Vector3((Math.random()-0.5)*35, Math.random()*20+5, (Math.random()-0.5)*35);
    expParticles.push({ mesh: p, vel: vel, life: 0.6 });
  }

  for (let i = zombies.length - 1; i >= 0; i--) {
    const extraR = zombies[i].type === 'boss' ? 4.0 : 0;
    if (pos.distanceTo(zombies[i].group.position) <= radius + 2 + extraR) damageZombieRaw(zombies[i], damage);
  }
}

function createShockwave(pos) {
  playSound('boom');
  const ringGeo = new THREE.RingGeometry(0.1, 2, 32);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 1.0, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2; ring.position.copy(pos); ring.position.y = 0.1; scene.add(ring);
  shockwaves.push({ mesh: ring, scale: 1, life: 0.8, maxLife: 0.8 });
  cameraPitch -= 0.1;
  for (let i = zombies.length - 1; i >= 0; i--) {
    if (pos.distanceTo(zombies[i].group.position) <= 35) {
      const dmg = zombies[i].type === 'boss' ? 1800 : 9999;
      damageZombieRaw(zombies[i], dmg);
    }
  }
}

function createLaserBeam(targetPos) {
  const muzzlePos = new THREE.Vector3(); repulsorCore.getWorldPosition(muzzlePos);
  const geo = new THREE.BufferGeometry().setFromPoints([muzzlePos, targetPos]);
  const mat = new THREE.LineBasicMaterial({ color: 0x00f0ff, linewidth: 3 });
  const line = new THREE.Line(geo, mat); scene.add(line);
  setTimeout(() => scene.remove(line), 60);
}

function createBulletTracer(targetPos) {
  if (isScoped) return;
  const muzzlePos = new THREE.Vector3(); muzzleFlash.getWorldPosition(muzzlePos);
  const geo = new THREE.BufferGeometry().setFromPoints([muzzlePos, targetPos]);
  const mat = new THREE.LineBasicMaterial({ color: 0xffcc33 });
  const line = new THREE.Line(geo, mat); scene.add(line);
  setTimeout(() => scene.remove(line), 40);
}

// ==========================================
// 6. 좀비 & 압도적 초대형 보스 + 단일 배너(겹침 방지)
// ==========================================
const zombies = []; const bloodParticles = [];
let activeBannerEl = null;
let activeBannerTimer = null;

function clearBannerMessage() {
  if (activeBannerTimer) {
    clearTimeout(activeBannerTimer);
    activeBannerTimer = null;
  }
  if (activeBannerEl) {
    activeBannerEl.remove();
    activeBannerEl = null;
  }
}

function showBannerMessage(text, color = '#ff3333', subText = '', durationMs = 2200) {
  clearBannerMessage();

  const wrap = document.createElement('div');
  wrap.style.position = 'absolute';
  wrap.style.top = '22%';
  wrap.style.width = '100%';
  wrap.style.textAlign = 'center';
  wrap.style.pointerEvents = 'none';
  wrap.style.zIndex = '100';

  const mainDiv = document.createElement('div');
  mainDiv.style.color = color;
  mainDiv.style.fontSize = '38px';
  mainDiv.style.fontWeight = '900';
  mainDiv.style.textShadow = '0 0 18px rgba(0,0,0,0.95)';
  mainDiv.textContent = text;
  wrap.appendChild(mainDiv);

  if (subText) {
    const subDiv = document.createElement('div');
    subDiv.style.color = '#facc15';
    subDiv.style.fontSize = '20px';
    subDiv.style.fontWeight = 'bold';
    subDiv.style.marginTop = '6px';
    subDiv.style.textShadow = '0 2px 8px black';
    subDiv.textContent = subText;
    wrap.appendChild(subDiv);
  }

  document.body.appendChild(wrap);
  activeBannerEl = wrap;

  activeBannerTimer = setTimeout(() => {
    clearBannerMessage();
  }, durationMs);
}

function createZombieMesh(type, skinColor, scale) {
  const group = new THREE.Group();
  const isGhost = type === 'ghost';
  const isBoss = type === 'boss';

  const skinMat = new THREE.MeshStandardMaterial({
    color: skinColor,
    roughness: 0.85,
    transparent: isGhost,
    opacity: 1.0
  });

  let shirtColor = 0x2b303a;
  let pantsColor = 0x1e2229;
  let eyeColor = 0xff2a2a;

  if (type === 'runner') {
    shirtColor = 0x5c1d1d; eyeColor = 0xfacc15;
  } else if (type === 'tank') {
    shirtColor = 0x1a202c; pantsColor = 0x111827; eyeColor = 0xff5500;
  } else if (type === 'archer') {
    shirtColor = 0x4c1d95; pantsColor = 0x2e1065; eyeColor = 0xd8b4fe;
  } else if (type === 'ghost') {
    shirtColor = 0x64748b; pantsColor = 0x475569; eyeColor = 0x38bdf8;
  } else if (isBoss) {
    shirtColor = 0x3b0707; pantsColor = 0x141418; eyeColor = 0xff0000;
  }

  const shirtMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.9, transparent: isGhost, opacity: 1.0 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.95, transparent: isGhost, opacity: 1.0 });
  const eyeMat = new THREE.MeshBasicMaterial({ color: eyeColor, transparent: isGhost, opacity: 1.0 });

  const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.74, 0.22), pantsMat);
  leftLeg.position.set(-0.15, 0.37, 0);
  const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.74, 0.22), pantsMat);
  rightLeg.position.set(0.15, 0.37, 0);
  group.add(leftLeg, rightLeg);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.76, 0.32), shirtMat);
  torso.position.set(0, 1.08, 0.04);
  torso.rotation.x = 0.14;
  group.add(torso);

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.65, 0.10);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.38, 0.38), skinMat);
  headGroup.add(head);

  const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.05, 0.035), eyeMat);
  eyeL.position.set(-0.085, 0.04, 0.19);
  const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.05, 0.035), eyeMat);
  eyeR.position.set(0.085, 0.04, 0.19);
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.07, 0.035), new THREE.MeshBasicMaterial({ color: 0x120202 }));
  mouth.position.set(0, -0.095, 0.19);
  headGroup.add(eyeL, eyeR, mouth);

  let bossCoreMat = null;
  if (isBoss) {
    const armorMat = new THREE.MeshStandardMaterial({ color: 0x18181b, metalness: 0.85, roughness: 0.25 });
    const hornMat = new THREE.MeshStandardMaterial({ color: 0x09090b, metalness: 0.6, roughness: 0.3 });
    bossCoreMat = new THREE.MeshBasicMaterial({ color: 0xff1e1e });

    const hornL = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.44, 6), hornMat);
    hornL.position.set(-0.20, 0.32, 0.04); hornL.rotation.z = 0.42; hornL.rotation.x = 0.25;
    const hornR = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.44, 6), hornMat);
    hornR.position.set(0.20, 0.32, 0.04); hornR.rotation.z = -0.42; hornR.rotation.x = 0.25;
    const crownMid = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.34, 6), bossCoreMat);
    crownMid.position.set(0, 0.34, 0.05);
    headGroup.add(hornL, hornR, crownMid);

    const pauldronL = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.28, 0.42), armorMat);
    pauldronL.position.set(-0.46, 1.42, 0.04); pauldronL.rotation.z = 0.25;
    const pauldronR = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.28, 0.42), armorMat);
    pauldronR.position.set(0.46, 1.42, 0.04); pauldronR.rotation.z = -0.25;

    const chestCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.16), bossCoreMat);
    chestCore.position.set(0, 1.14, 0.22);

    const backReactor = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.56, 12), armorMat);
    backReactor.position.set(0, 1.18, -0.22);

    const auraRing = new THREE.Mesh(
      new THREE.RingGeometry(0.75, 0.92, 32),
      new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.75, side: THREE.DoubleSide })
    );
    auraRing.rotation.x = -Math.PI / 2;
    auraRing.position.y = 0.03;

    group.add(pauldronL, pauldronR, chestCore, backReactor, auraRing);
  }

  group.add(headGroup);

  const armLen = isBoss ? 0.78 : 0.64;
  const armThick = isBoss ? 0.22 : 0.15;

  const armPivotL = new THREE.Group();
  armPivotL.position.set(-0.38, 1.36, 0.06);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(armThick, armThick, armLen), skinMat);
  armL.position.set(0, -0.04, armLen * 0.45);
  armPivotL.add(armL);

  const armPivotR = new THREE.Group();
  armPivotR.position.set(0.38, 1.36, 0.06);
  const armR = new THREE.Mesh(new THREE.BoxGeometry(armThick, armThick, armLen), skinMat);
  armR.position.set(0, -0.04, armLen * 0.45);
  armPivotR.add(armR);

  if (type === 'archer') {
    const zBow = new THREE.Mesh(
      new THREE.TorusGeometry(0.32, 0.02, 6, 16, Math.PI),
      new THREE.MeshBasicMaterial({ color: 0xc084fc })
    );
    zBow.rotation.y = Math.PI / 2;
    zBow.position.set(0, -0.04, 0.58);
    armPivotR.add(zBow);
  }

  group.add(armPivotL, armPivotR);
  group.scale.setScalar(scale);

  return {
    group,
    mats: [skinMat, shirtMat, pantsMat, eyeMat],
    bossCoreMat,
    leftLeg,
    rightLeg,
    armPivotL,
    armPivotR
  };
}

function findSafeSpawnPoint(minDist = 42, maxDist = 66) {
  for (let attempt = 0; attempt < 60; attempt++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = minDist + Math.random() * (maxDist - minDist);
    const tx = THREE.MathUtils.clamp(playerPos.x + Math.cos(angle) * dist, -80, 80);
    const tz = THREE.MathUtils.clamp(playerPos.z + Math.sin(angle) * dist, -80, 80);

    const dPlayer = Math.hypot(tx - playerPos.x, tz - playerPos.z);
    if (dPlayer < minDist) continue;
    if (checkCollision(tx, tz, 1.1)) continue;

    let tooCloseZombie = false;
    for (const z of zombies) {
      if (Math.hypot(tx - z.group.position.x, tz - z.group.position.z) < 3.2) {
        tooCloseZombie = true;
        break;
      }
    }
    if (!tooCloseZombie) return { x: tx, z: tz };
  }

  const fallbackAngle = cameraYaw + Math.PI + (Math.random() - 0.5) * 1.4;
  const fx = THREE.MathUtils.clamp(playerPos.x + Math.cos(fallbackAngle) * 44, -80, 80);
  const fz = THREE.MathUtils.clamp(playerPos.z + Math.sin(fallbackAngle) * 44, -80, 80);
  return { x: fx, z: fz };
}

function getBaseNormalZombieHp(roundNum) {
  return Math.round((65 + (roundNum - 1) * 5) * diffCfg.zHpMult);
}

function getRoundZombieSpeed(roundNum) {
  const linearSpd = diffCfg.zBaseSpeed + (roundNum - 1) * diffCfg.zRoundSpeedStep;
  return linearSpd * diffCfg.zSpeedMult;
}

function getRoundArcherCooldown(roundNum) {
  const progress = Math.min(1, (roundNum - 1) / Math.max(1, maxRounds - 1));
  const cd = diffCfg.archerBaseCd - (diffCfg.archerBaseCd - diffCfg.archerMinCd) * progress;
  return Math.max(diffCfg.archerMinCd, cd);
}

function getRoundProjectileSpeed(roundNum) {
  const baseProj = currentDiff === 'hard' ? 18.5 : (currentDiff === 'normal' ? 16.5 : 14.5);
  return baseProj + (roundNum - 1) * (currentDiff === 'hard' ? 0.22 : 0.16);
}

function updateBossHUD() {
  const bossHud = document.getElementById('boss-hud');
  if (!activeBoss || activeBoss.hp <= 0) {
    bossHud.style.display = 'none';
    return;
  }
  bossHud.style.display = 'block';
  const curHp = Math.max(0, Math.ceil(activeBoss.hp));
  const maxHp = Math.ceil(activeBoss.maxHp);
  document.getElementById('boss-name').textContent = `💀 ROUND ${currentRound} 초대형 보스 (HP: ${curHp} / ${maxHp})`;
  document.getElementById('boss-bar').style.width = `${(curHp / maxHp) * 100}%`;
}

function updateRoundHUD() {
  document.getElementById('round-text').textContent = `${currentRound} / ${maxRounds}`;
  document.getElementById('remain-count').textContent = Math.max(0, roundRemaining);
  document.getElementById('kill-count').textContent = kills;
}

function startRound(roundNum) {
  currentRound = roundNum;
  isRoundTransition = false;

  const isFifthRound = (roundNum % 5 === 0);
  const baseCount = 6 + Math.floor(roundNum * 1.1);
  const rushBonus = isFifthRound ? (12 + Math.floor(roundNum * 0.6)) : 0;
  const bossCount = (isFifthRound && diffCfg.hasBoss) ? 1 : 0;

  roundToSpawn = baseCount + rushBonus;
  roundRemaining = roundToSpawn + bossCount;

  roundSpawnInterval = isFifthRound
    ? Math.max(0.24, 0.55 - roundNum * 0.006)
    : Math.max(0.35, 0.90 - roundNum * 0.012);

  roundMaxAlive = isFifthRound ? 45 : Math.min(34, 18 + Math.floor(roundNum * 0.4));

  updateRoundHUD();

  if (isFifthRound) {
    playSound('boom');
    if (currentDiff === 'easy') {
      showBannerMessage(
        `⚠️ WARNING! ROUND ${roundNum} 대량 러시!`,
        '#ff3b3b',
        `좀비 대군이 몰려옵니다! (총 ${roundRemaining}마리)`,
        2400
      );
    } else if (currentDiff === 'normal') {
      showBannerMessage(
        `🚨 BOSS & RUSH! ROUND ${roundNum} 경고!`,
        '#ff2a2a',
        `대량 러시 + 체력 10배 초대형 보스 출현!`,
        2400
      );
      spawnBossZombie(roundNum);
    } else if (currentDiff === 'hard') {
      const bossMult = 10 + (Math.floor(roundNum / 5) - 1) * 3;
      showBannerMessage(
        `💀 HELL BOSS! ROUND ${roundNum} 경고!`,
        '#ff1e56',
        `초대형 보스(체력 ${bossMult}배) + 대량 러시!`,
        2400
      );
      spawnBossZombie(roundNum);
    }
  } else {
    showBannerMessage(
      `ROUND ${roundNum} / ${maxRounds}`,
      '#facc15',
      `목표 처치: ${roundRemaining}마리`,
      1800
    );
  }
}

function spawnBossZombie(roundNum) {
  const normalHp = getBaseNormalZombieHp(roundNum);
  const tier = Math.floor(roundNum / 5);
  const hpMult = diffCfg.bossScaleWithRound ? (10 + (tier - 1) * 3) : 10;
  const bossHp = normalHp * hpMult;
  const bossSpeed = Math.max(2.3, getRoundZombieSpeed(roundNum) * 0.9);

  const built = createZombieMesh('boss', 0x5c1414, 4.2);
  const spawnPt = findSafeSpawnPoint(44, 64);
  built.group.position.set(spawnPt.x, 0, spawnPt.z);
  scene.add(built.group);

  const bossObj = {
    group: built.group,
    mats: built.mats,
    bossCoreMat: built.bossCoreMat,
    leftLeg: built.leftLeg,
    rightLeg: built.rightLeg,
    armPivotL: built.armPivotL,
    armPivotR: built.armPivotR,
    type: 'boss',
    hp: bossHp,
    maxHp: bossHp,
    speed: bossSpeed,
    walkCycle: 0,
    ghostTimer: 0,
    isGhost: false,
    shootCooldown: 2.2,
    velY: 0,
    isGrounded: true,
    steerSign: Math.random() < 0.5 ? 1 : -1
  };

  zombies.push(bossObj);
  activeBoss = bossObj;
  updateBossHUD();
}

function spawnZombie() {
  if (roundToSpawn <= 0) return;
  roundToSpawn--;

  const baseHp = getBaseNormalZombieHp(currentRound);
  const baseSpd = getRoundZombieSpeed(currentRound);

  const rand = Math.random();
  const archerThreshold = diffCfg.archerChance;
  const runnerThreshold = archerThreshold + 0.24;
  const tankThreshold = runnerThreshold + 0.16;
  const ghostThreshold = tankThreshold + 0.15;

  let type = 'normal', zHp = baseHp, speed = baseSpd, scale = 1.0, skinColor = 0x587a50;

  if (rand < archerThreshold) {
    type = 'archer';
    zHp = Math.round(baseHp * 0.82);
    speed = baseSpd * 0.92;
    scale = 0.96;
    skinColor = 0x7e5bef;
  } else if (rand < runnerThreshold) {
    type = 'runner';
    zHp = Math.round(baseHp * 0.65);
    speed = baseSpd * 2.05;
    scale = 0.90;
    skinColor = 0x9e473b;
  } else if (rand < tankThreshold) {
    type = 'tank';
    zHp = Math.round(baseHp * 3.0);
    speed = baseSpd * 0.65;
    scale = 1.55;
    skinColor = 0x3b4859;
  } else if (rand < ghostThreshold) {
    type = 'ghost';
    zHp = Math.round(baseHp * 0.88);
    speed = baseSpd * 1.05;
    scale = 1.0;
    skinColor = 0x94a3b8;
  }

  const built = createZombieMesh(type, skinColor, scale);
  const spawnPt = findSafeSpawnPoint(42, 66);
  built.group.position.set(spawnPt.x, 0, spawnPt.z);
  scene.add(built.group);

  const baseCd = getRoundArcherCooldown(currentRound);
  const initShootCd = Math.max(0.8, baseCd * (0.65 + Math.random() * 0.45));

  zombies.push({
    group: built.group,
    mats: built.mats,
    bossCoreMat: built.bossCoreMat,
    leftLeg: built.leftLeg,
    rightLeg: built.rightLeg,
    armPivotL: built.armPivotL,
    armPivotR: built.armPivotR,
    type: type,
    hp: zHp,
    maxHp: zHp,
    speed: speed,
    walkCycle: Math.random() * 10,
    ghostTimer: 0,
    isGhost: false,
    shootCooldown: initShootCd,
    velY: 0,
    isGrounded: true,
    steerSign: Math.random() < 0.5 ? 1 : -1
  });
}

function spawnPotion(pos) {
  const mesh = new THREE.Mesh(potionGeo, potionMat);
  mesh.position.copy(pos); mesh.position.y = 0.5;
  scene.add(mesh); potions.push({ mesh: mesh, startY: 0.5, time: 0 });
}

function damageZombieRaw(z, dmg) {
  z.hp -= dmg;
  createBloodExplosion(z.group.position.clone().add(new THREE.Vector3(0, z.type === 'boss' ? 3.8 : 1.1, 0)));

  if (z.type === 'boss') {
    updateBossHUD();
  } else {
    const pushDir = z.group.position.clone().sub(playerPos);
    pushDir.y = 0;
    if (pushDir.lengthSq() > 0.0001) {
      pushDir.normalize();
      moveEntityTowardTarget(z.group.position, pushDir.x, pushDir.z, 0.35, 0.65, z.steerSign);
    }
  }

  if (z.hp <= 0) {
    const idx = zombies.indexOf(z);
    if (idx > -1) {
      if (z.type === 'boss') {
        activeBoss = null;
        updateBossHUD();
        spawnPotion(z.group.position.clone().add(new THREE.Vector3(-1.5, 0, 0)));
        spawnPotion(z.group.position.clone().add(new THREE.Vector3(1.5, 0, 0)));
        spawnPotion(z.group.position.clone().add(new THREE.Vector3(0, 0, 1.5)));
        showBannerMessage(`🔥 ROUND ${currentRound} 초대형 보스 격파!`, '#2ecc71', '보급 힐 포션이 드랍되었습니다!', 2200);
      } else if (Math.random() < 0.16) {
        spawnPotion(z.group.position.clone());
      }

      scene.remove(z.group);
      zombies.splice(idx, 1);
      kills++;
      roundRemaining--;
      updateRoundHUD();

      if (roundRemaining <= 0 && !isRoundTransition) {
        if (currentRound >= maxRounds) {
          clearBannerMessage();
          gameOver = true;
          if (document.pointerLockElement) document.exitPointerLock();
          setScope(false);
          document.getElementById('overlay').style.display = 'flex';
          document.getElementById('modal-title').style.color = '#2ecc71';
          document.getElementById('modal-title').textContent = `VICTORY! (${diffCfg.name} ${maxRounds}R 클리어)`;
          document.getElementById('modal-desc').textContent = `총 처치 수: ${kills}마리 · 클릭하여 1라운드부터 다시 도전`;
        } else {
          isRoundTransition = true;
          roundClearTimer = 1.5;
          playSound('reload');
          showBannerMessage(`✅ ROUND ${currentRound} CLEAR!`, '#2ecc71', '다음 라운드 돌입 중...', 1450);
        }
      }
    }
  }
}

function createBloodExplosion(pos) {
  for (let i = 0; i < 10; i++) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), new THREE.MeshBasicMaterial({ color: 0x8a0303 }));
    p.position.copy(pos); scene.add(p);
    bloodParticles.push({ mesh: p, vel: new THREE.Vector3((Math.random()-0.5)*6, Math.random()*4+1, (Math.random()-0.5)*6), life: 0.3 });
  }
}

// ==========================================
// 7. 게임 리셋, UI 및 카테고리별 무기고·설정창 관리
// ==========================================
function updateHPUI() {
  document.getElementById('hp-text').textContent = Math.ceil(hp);
  document.getElementById('hp-bar').style.width = `${hp}%`;
  document.getElementById('hp-bar').style.background = hp > 30 ? '#2ecc71' : '#e74c3c';
}

function takeDamage(dmg) {
  const realDmg = Math.round(dmg * diffCfg.dmgTaken);
  hp = Math.max(0, hp - realDmg); updateHPUI();
  if (hp <= 0 && !gameOver) {
    clearBannerMessage();
    gameOver = true;
    if (document.pointerLockElement) document.exitPointerLock();
    setScope(false);
    document.getElementById('overlay').style.display = 'flex';
    document.getElementById('modal-title').style.color = '#ff4d4d';
    document.getElementById('modal-title').textContent = `YOU DIED (ROUND ${currentRound} 전사)`;
    document.getElementById('modal-desc').textContent = `최종 처치 수: ${kills}마리 · 클릭하여 부활`;
  }
}

function resetGame() {
  clearBannerMessage();
  for (const z of zombies) scene.remove(z.group); zombies.length = 0;
  for (const b of bloodParticles) scene.remove(b.mesh); bloodParticles.length = 0;
  for (const g of thrownGrenades) scene.remove(g.mesh); thrownGrenades.length = 0;
  for (const e of explosions) scene.remove(e.mesh); explosions.length = 0;
  for (const ep of expParticles) scene.remove(ep.mesh); expParticles.length = 0;
  for (const a of arrows) scene.remove(a.mesh); arrows.length = 0;
  for (const pa of playerArrows) scene.remove(pa.mesh); playerArrows.length = 0;
  for (const br of bazookaRockets) scene.remove(br.mesh); bazookaRockets.length = 0;
  for (const sw of slashWaves) scene.remove(sw.mesh); slashWaves.length = 0;
  for (const s of shockwaves) scene.remove(s.mesh); shockwaves.length = 0;
  for (const p of potions) scene.remove(p.mesh); potions.length = 0;

  kills = 0; hp = 100; currentSlot = 1;
  activeBoss = null;
  updateBossHUD();

  equippedBySlot[1] = 'ak47';
  equippedBySlot[2] = 'pistol';
  equippedBySlot[3] = 'axe';
  equippedBySlot[4] = 'grenade';
  activeWeaponKey = 'ak47';

  ammoState.ak47 = 30; ammoState.m4a1 = 30; ammoState.shotgun = 8; ammoState.sniper = 5; ammoState.laser = 35;
  ammoState.pistol = 15; ammoState.deagle = 7; ammoState.sawedoff = 4; ammoState.uzi = 25;
  ammoState.bazooka = 10;

  gameOver = false; isReloading = false; jumpCount = 0; ultCooldown = 0; isUltFalling = false;

  updateHPUI();
  document.getElementById('reload-msg').style.display = 'none'; updateUltUI();
  playerPos.set(0, 1.7, 0); playerVel.set(0, 0, 0); cameraYaw = 0; cameraPitch = 0;
  updateWeaponVisuals();
  startRound(1);
}

function updateWeaponVisuals() {
  activeWeaponKey = equippedBySlot[currentSlot];
  setScope(false);

  Object.keys(WEAPON_MODELS).forEach(k => WEAPON_MODELS[k].visible = (k === activeWeaponKey));

  for (let s = 1; s <= 4; s++) {
    const el = document.getElementById(`slot-${s}`);
    const wId = equippedBySlot[s];
    el.textContent = `[${s}] ${WEAPONS_DATA[wId].name}`;
    if (s === currentSlot) el.classList.add('active');
    else el.classList.remove('active');
  }

  document.getElementById('current-weapon-name').textContent = WEAPONS_DATA[activeWeaponKey].name;
  updateAmmoUI();
}

function updateAmmoUI() {
  const el = document.getElementById('ammo-count');
  if (activeWeaponKey === 'bazooka') {
    el.textContent = `${ammoState.bazooka} / 10`;
    el.style.color = ammoState.bazooka > 0 ? '#f1c40f' : '#e74c3c';
  } else if (WEAPONS_DATA[activeWeaponKey].mag === Infinity) {
    el.textContent = '∞';
    el.style.color = '#f1c40f';
  } else {
    el.textContent = `${ammoState[activeWeaponKey]} / ∞`;
    el.style.color = '#f1c40f';
  }
}

function updateUltUI() {
  const ultUI = document.getElementById('ult-ui');
  if(ultCooldown <= 0) {
    ultUI.textContent = '⚡ [V] 궁극기: READY!'; ultUI.classList.remove('ult-cd');
  } else {
    ultUI.textContent = `[V] 궁극기 쿨타임: ${Math.ceil(ultCooldown)}초`; ultUI.classList.add('ult-cd');
  }
}

const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    tabBtns.forEach(b => b.classList.remove('active'));
    tabPanels.forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});

function refreshArmoryCards() {
  document.querySelectorAll('.weapon-card').forEach(card => {
    const slotNum = parseInt(card.dataset.slot);
    const wId = card.dataset.weapon;
    if (equippedBySlot[slotNum] === wId) card.classList.add('equipped');
    else card.classList.remove('equipped');
  });
}

document.querySelectorAll('.weapon-card').forEach(card => {
  card.addEventListener('click', () => {
    const slotNum = parseInt(card.dataset.slot);
    const wId = card.dataset.weapon;

    equippedBySlot[slotNum] = wId;
    currentSlot = slotNum;

    if (wId === 'bazooka') {
      ammoState.bazooka = 10;
      bazWarhead.visible = true;
    }

    isReloading = false;
    meleeSwingTimer = 0;
    document.getElementById('reload-msg').style.display = 'none';
    updateWeaponVisuals();
    refreshArmoryCards();
    toggleArmory();
  });
});

function toggleArmory() {
  if (isSettingsOpen) return;
  isArmoryOpen = !isArmoryOpen;
  const armoryMenu = document.getElementById('armory-menu');
  if (isArmoryOpen) {
    if (document.pointerLockElement) document.exitPointerLock();
    refreshArmoryCards();
    armoryMenu.style.display = 'flex';
  } else {
    armoryMenu.style.display = 'none';
    document.body.requestPointerLock();
  }
}
document.getElementById('close-armory-btn').addEventListener('click', toggleArmory);

function openSettings() {
  if (gameOver || isArmoryOpen) return;
  isSettingsOpen = true;
  isMouseDown = false;
  setScope(false);
  document.getElementById('settings-menu').style.display = 'flex';
  document.getElementById('overlay').style.display = 'none';
}

function closeSettings() {
  isSettingsOpen = false;
  document.getElementById('settings-menu').style.display = 'none';
  document.body.requestPointerLock();
}

const toggleSoundBtn = document.getElementById('toggle-sound-btn');
toggleSoundBtn.addEventListener('click', () => {
  isSoundOn = !isSoundOn;
  if (isSoundOn) {
    toggleSoundBtn.textContent = '🔊 소리 켜짐 (ON)';
    toggleSoundBtn.classList.remove('muted');
  } else {
    toggleSoundBtn.textContent = '🔇 소리 꺼짐 (OFF)';
    toggleSoundBtn.classList.add('muted');
    Object.values(activeSounds).forEach(s => { try { s.stop(); } catch (e) {} });
  }
});

const sensSlider = document.getElementById('sens-slider');
const sensVal = document.getElementById('sens-val');
sensSlider.addEventListener('input', (e) => {
  mouseSensMult = parseFloat(e.target.value);
  sensVal.textContent = `${mouseSensMult.toFixed(1)}x`;
});

document.getElementById('resume-btn').addEventListener('click', closeSettings);
document.getElementById('go-home-btn').addEventListener('click', () => {
  window.location.href = './home.html';
});

function setScope(active) {
  const sniperScopeEl = document.getElementById('sniper-scope');
  const crosshairEl = document.getElementById('crosshair');
  if (active && activeWeaponKey === 'sniper') {
    isScoped = true; camera.fov = 18; camera.updateProjectionMatrix();
    sniperScopeEl.style.display = 'block'; crosshairEl.style.display = 'none';
    WEAPON_MODELS.sniper.visible = false;
  } else {
    isScoped = false; camera.fov = 75; camera.updateProjectionMatrix();
    sniperScopeEl.style.display = 'none'; crosshairEl.style.display = 'block';
    if (activeWeaponKey === 'sniper') WEAPON_MODELS.sniper.visible = true;
  }
}

function startReload() {
  if (activeWeaponKey === 'bazooka') return;
  isReloading = true; reloadTimer = WEAPONS_DATA[activeWeaponKey].reloadTime;
  document.getElementById('reload-msg').textContent = 'RELOADING...';
  document.getElementById('reload-msg').style.display = 'block';
  playSound('reload'); setScope(false);
}

// ==========================================
// 8. 조작 이벤트
// ==========================================
window.addEventListener('contextmenu', e => e.preventDefault());

window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase(); keys[k] = true;

  if (e.key === 'Escape' && hasStarted && !gameOver && !isArmoryOpen) {
    if (isSettingsOpen) closeSettings();
    else openSettings();
    return;
  }

  if (!isLocked || gameOver || isSettingsOpen) return;

  if (e.code === 'Space') {
    if (jumpCount < 2) {
      playerVel.y = jumpCount === 0 ? 8.5 : 8.0; jumpCount++; isGrounded = false;
    }
  }

  if (k === 'v' && ultCooldown <= 0 && isGrounded && !isUltFalling) {
    playerVel.y = 28; isGrounded = false; isUltFalling = true; playSound('boom');
  }

  if (['1','2','3','4'].includes(k)) {
    currentSlot = parseInt(k); isReloading = false; meleeSwingTimer = 0;
    document.getElementById('reload-msg').style.display = 'none';
    updateWeaponVisuals();
  }

  if (k === 'r' && activeWeaponKey !== 'bazooka' && WEAPONS_DATA[activeWeaponKey].mag !== Infinity && !isReloading) {
    if (ammoState[activeWeaponKey] < WEAPONS_DATA[activeWeaponKey].mag) startReload();
  }

  if (k === 'n') toggleArmory();
});
window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

window.addEventListener('mousedown', (e) => {
  if (!isLocked || gameOver || isSettingsOpen) return;
  if (e.button === 0) {
    isMouseDown = true;
    if (activeWeaponKey === 'grenade') throwGrenade();
    else if (WEAPONS_DATA[activeWeaponKey].type !== 'auto') tryAttack();
  }
  if (e.button === 2 && activeWeaponKey === 'sniper') setScope(true);
});
window.addEventListener('mouseup', (e) => {
  if (e.button === 0) isMouseDown = false;
  if (e.button === 2 && activeWeaponKey === 'sniper') setScope(false);
});

const raycaster = new THREE.Raycaster(); const screenCenter = new THREE.Vector2(0, 0);

function tryAttack() {
  if (isReloading || shootCooldown > 0) return;
  const cur = WEAPONS_DATA[activeWeaponKey];

  if (cur.type === 'melee') {
    activeMeleeStyle = 'axe';
    meleeSwingDuration = 0.56;
    meleeSwingTimer = meleeSwingDuration;
    shootCooldown = cur.rate;
    playSound('axe');
    for (let i = zombies.length - 1; i >= 0; i--) {
      const extraR = zombies[i].type === 'boss' ? 3.2 : 0;
      if (playerPos.distanceTo(zombies[i].group.position) < 4.5 + extraR) damageZombieRaw(zombies[i], cur.damage);
    }
    return;
  }

  if (cur.type === 'machete') {
    activeMeleeStyle = 'machete';
    meleeSwingDuration = 0.50;
    meleeSwingTimer = meleeSwingDuration;
    shootCooldown = cur.rate;
    playSound('machete');
    spawnSlashWave(false, 0);
    hitZombiesInCone(5.6, 0.20, cur.damage);
    return;
  }

  if (cur.type === 'katana') {
    activeMeleeStyle = 'katana';
    meleeSwingDuration = 0.64;
    meleeSwingTimer = meleeSwingDuration;
    shootCooldown = cur.rate;
    katanaSecondHitDone = false;
    katanaSecondDamage = cur.damage;

    playSound('katana');
    spawnSlashWave(true, Math.PI / 4);
    hitZombiesInCone(6.4, 0.18, cur.damage);
    return;
  }

  if (cur.type === 'bow') {
    shootCooldown = cur.rate;
    playSound('bow');
    recoilZ = cur.recoil; recoilRotX = cur.recoil;
    nockedArrowGroup.visible = false;
    setTimeout(() => { nockedArrowGroup.visible = true; }, 340);
    shootPlayerArrow(cur.damage);
    return;
  }

  if (cur.type === 'bazooka') {
    if (ammoState.bazooka <= 0) {
      const msg = document.getElementById('reload-msg');
      msg.textContent = '탄약 소진! [N] 무기고에서 재교체 리필';
      msg.style.display = 'block';
      setTimeout(() => { if (!isReloading) msg.style.display = 'none'; }, 1500);
      return;
    }
    ammoState.bazooka--;
    updateAmmoUI();
    shootCooldown = cur.rate;
    recoilZ = cur.recoil; recoilRotX = cur.recoil * 1.3;
    playSound('bazooka');
    bazWarhead.visible = ammoState.bazooka > 0;
    shootBazookaRocket(cur.damage);
    return;
  }

  if (cur.mag !== Infinity) {
    if (ammoState[activeWeaponKey] <= 0) { startReload(); return; }
    ammoState[activeWeaponKey]--;
  }

  updateAmmoUI();
  shootCooldown = cur.rate;

  if (activeWeaponKey === 'ak47' || activeWeaponKey === 'uzi') playSound('ak47');
  else if (activeWeaponKey === 'm4a1') playSound('m4a1');
  else if (cur.type === 'shotgun') { playSound('boom'); playSound('ak47'); }
  else if (activeWeaponKey === 'sniper' || activeWeaponKey === 'deagle') playSound('sniper');
  else if (activeWeaponKey === 'laser') playSound('laser');
  else if (activeWeaponKey === 'pistol') playSound('pistol');

  recoilZ = cur.recoil; recoilRotX = cur.recoil * 1.2;

  raycaster.setFromCamera(screenCenter, camera);
  const zMeshes = []; zombies.forEach(z => z.group.traverse(c => { if(c.isMesh) zMeshes.push(c); }));

  if (cur.type === 'shotgun') {
    muzzleFlash.intensity = 10;
    setTimeout(() => { muzzleFlash.intensity = 0; }, 50);
    const pelletCount = cur.pellets || 8;
    const spreadAmt = cur.spread || 0.14;
    for (let p = 0; p < pelletCount; p++) {
      const spread = new THREE.Vector2((Math.random() - 0.5) * spreadAmt, (Math.random() - 0.5) * spreadAmt);
      raycaster.setFromCamera(spread, camera);
      const intersects = raycaster.intersectObjects(zMeshes, false);
      let hitPoint = null;
      if (intersects.length > 0) {
        hitPoint = intersects[0].point;
        const hitMesh = intersects[0].object;
        createBloodExplosion(hitPoint);
        const zIndex = zombies.findIndex(z => { let f=false; z.group.traverse(c=>{if(c===hitMesh)f=true;}); return f; });
        if (zIndex !== -1) damageZombieRaw(zombies[zIndex], cur.damage);
      } else {
        hitPoint = raycaster.ray.origin.clone().add(raycaster.ray.direction.clone().multiplyScalar(32));
      }
      createBulletTracer(hitPoint);
    }
    return;
  }

  if (activeWeaponKey === 'laser') {
    const intersects = raycaster.intersectObjects(zMeshes, false);
    const hitSet = new Set();
    intersects.forEach(hit => {
      const zIdx = zombies.findIndex(z => { let f=false; z.group.traverse(c=>{if(c===hit.object)f=true;}); return f; });
      if (zIdx !== -1 && !hitSet.has(zIdx)) { hitSet.add(zIdx); damageZombieRaw(zombies[zIdx], cur.damage); }
    });
    const maxBeamPos = raycaster.ray.origin.clone().add(raycaster.ray.direction.clone().multiplyScalar(80));
    createLaserBeam(maxBeamPos);
  } else {
    muzzleFlash.intensity = 8;
    setTimeout(() => { muzzleFlash.intensity = 0; }, 40);

    const intersects = raycaster.intersectObjects(zMeshes, false);
    let hitPoint = null;

    if (intersects.length > 0) {
      hitPoint = intersects[0].point;
      const hitMesh = intersects[0].object;
      createBloodExplosion(hitPoint);
      const zIndex = zombies.findIndex(z => { let f=false; z.group.traverse(c=>{if(c===hitMesh)f=true;}); return f; });
      if (zIndex !== -1) damageZombieRaw(zombies[zIndex], cur.damage);
    } else {
      hitPoint = raycaster.ray.origin.clone().add(raycaster.ray.direction.clone().multiplyScalar(70));
    }
    createBulletTracer(hitPoint);
  }
}

// ==========================================
// 9. 메인 렌더 루프
// ==========================================
let lastTime = null; let spawnTimer = 0;

function smoothStep(t) {
  return t * t * (3 - 2 * t);
}

renderer.setAnimationLoop((time) => {
  if (lastTime === null) { lastTime = time; return; }
  const dt = Math.min((time - lastTime) / 1000, 0.05); lastTime = time;

  if (flickeringLights.length > 0) {
    const sec = time * 0.001;
    for (const fl of flickeringLights) {
      const wave = Math.sin(sec * 11 + fl.phase) * Math.cos(sec * 23 + fl.phase);
      const isOff = wave > 0.72;
      fl.light.intensity = isOff ? 1.5 : fl.baseIntensity;
      fl.bulbMat.color.setHex(isOff ? 0x222222 : fl.light.color.getHex());
    }
  }

  if (isLocked && !gameOver && !isSettingsOpen) {
    if (ultCooldown > 0) { ultCooldown -= dt; updateUltUI(); }

    if (isRoundTransition) {
      roundClearTimer -= dt;
      if (roundClearTimer <= 0) {
        startRound(currentRound + 1);
      }
    }

    const euler = new THREE.Euler(0, 0, 0, 'YXZ'); euler.x = cameraPitch; euler.y = cameraYaw; camera.quaternion.setFromEuler(euler);

    const moveDir = new THREE.Vector3();
    if (keys['w']) moveDir.z -= 1; if (keys['s']) moveDir.z += 1;
    if (keys['a']) moveDir.x -= 1; if (keys['d']) moveDir.x += 1;
    moveDir.normalize(); moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraYaw);

    const speed = 7.5;
    const mx = moveDir.x * speed * dt; const mz = moveDir.z * speed * dt;

    if (!checkCollision(playerPos.x + mx, playerPos.z, 0.5)) playerPos.x += mx;
    if (!checkCollision(playerPos.x, playerPos.z + mz, 0.5)) playerPos.z += mz;

    playerVel.y -= 25 * dt; playerPos.y += playerVel.y * dt;
    if (playerPos.y <= 1.7) {
      playerPos.y = 1.7; playerVel.y = 0;
      isGrounded = true; jumpCount = 0;

      if (isUltFalling) {
        isUltFalling = false; ultCooldown = 30; updateUltUI();
        createShockwave(playerPos);
      }
    }
    camera.position.copy(playerPos);

    if (isReloading) {
      reloadTimer -= dt; weaponRig.position.y = THREE.MathUtils.lerp(weaponRig.position.y, DEFAULT_WEAPON_POS.y - 0.2, 12 * dt);
      if (reloadTimer <= 0) {
        isReloading = false;
        ammoState[activeWeaponKey] = WEAPONS_DATA[activeWeaponKey].mag;
        updateAmmoUI();
        document.getElementById('reload-msg').style.display = 'none';
      }
    }

    shootCooldown -= dt;
    if (isMouseDown && WEAPONS_DATA[activeWeaponKey].type === 'auto' && shootCooldown <= 0) tryAttack();

    recoilZ = THREE.MathUtils.lerp(recoilZ, 0, 16 * dt); recoilRotX = THREE.MathUtils.lerp(recoilRotX, 0, 16 * dt);

    let swingPosX = 0, swingPosY = 0, swingPosZ = 0;
    let swingRotX = 0, swingRotY = 0, swingRotZ = 0;

    if (meleeSwingTimer > 0) {
      meleeSwingTimer -= dt;
      const t = Math.max(0, Math.min(1, 1 - (meleeSwingTimer / meleeSwingDuration)));

      if (activeMeleeStyle === 'axe') {
        if (t < 0.25) {
          const p = smoothStep(t / 0.25);
          swingPosX = -p * 0.08; swingPosY = p * 0.22; swingPosZ = p * 0.16;
          swingRotX = p * 0.65;
        } else if (t < 0.58) {
          const p = smoothStep((t - 0.25) / 0.33);
          swingPosX = -0.08; swingPosY = 0.22 - p * 0.38; swingPosZ = 0.16 - p * 0.62;
          swingRotX = 0.65 - p * 2.15;
        } else {
          const p = smoothStep((t - 0.58) / 0.42);
          swingPosX = -0.08 * (1 - p); swingPosY = -0.16 * (1 - p); swingPosZ = -0.46 * (1 - p);
          swingRotX = -1.50 * (1 - p);
        }
      } else if (activeMeleeStyle === 'machete') {
        if (t < 0.24) {
          const p = smoothStep(t / 0.24);
          swingPosX = p * 0.24; swingPosY = p * 0.04; swingPosZ = p * 0.12;
          swingRotX = -p * 0.35;
          swingRotY = -p * 0.70;
          swingRotZ = -p * 1.42;
        } else if (t < 0.60) {
          const p = smoothStep((t - 0.24) / 0.36);
          swingPosX = 0.24 - p * 0.88; swingPosY = 0.04; swingPosZ = 0.12 - p * 0.52;
          swingRotX = -0.35 - p * 0.45;
          swingRotY = -0.70 + p * 2.40;
          swingRotZ = -1.42;
        } else {
          const p = smoothStep((t - 0.60) / 0.40);
          swingPosX = -0.64 * (1 - p); swingPosY = 0.04 * (1 - p); swingPosZ = -0.40 * (1 - p);
          swingRotX = -0.80 * (1 - p);
          swingRotY = 1.70 * (1 - p);
          swingRotZ = -1.42 * (1 - p);
        }
      } else if (activeMeleeStyle === 'katana') {
        if (t < 0.14) {
          const p = smoothStep(t / 0.14);
          swingPosX = p * 0.24; swingPosY = p * 0.24; swingPosZ = p * 0.14;
          swingRotX = p * 0.45;
          swingRotY = -p * 0.45;
          swingRotZ = -p * 0.78;
        } else if (t < 0.44) {
          const p = smoothStep((t - 0.14) / 0.30);
          swingPosX = 0.24 - p * 0.84; swingPosY = 0.24 - p * 0.48; swingPosZ = 0.14 - p * 0.54;
          swingRotX = 0.45 - p * 1.60;
          swingRotY = -0.45 + p * 1.65;
          swingRotZ = -0.78 + p * 1.65;
        } else if (t < 0.76) {
          if (!katanaSecondHitDone) {
            katanaSecondHitDone = true;
            playSound('katana2');
            spawnSlashWave(true, -Math.PI / 4);
            hitZombiesInCone(6.4, 0.18, katanaSecondDamage);
          }
          const p = smoothStep((t - 0.44) / 0.32);
          swingPosX = -0.60 + p * 0.86; swingPosY = -0.24 + p * 0.44; swingPosZ = -0.40 + p * 0.10;
          swingRotX = -1.15 + p * 0.45;
          swingRotY = 1.20 - p * 1.95;
          swingRotZ = 0.87 - p * 1.95;
        } else {
          const p = smoothStep((t - 0.76) / 0.24);
          swingPosX = 0.26 * (1 - p); swingPosY = 0.20 * (1 - p); swingPosZ = -0.30 * (1 - p);
          swingRotX = -0.70 * (1 - p);
          swingRotY = -0.75 * (1 - p);
          swingRotZ = -1.08 * (1 - p);
        }
      }

      if (meleeSwingTimer <= 0) meleeSwingTimer = 0;
    }

    weaponRig.position.set(
      DEFAULT_WEAPON_POS.x + swingPosX,
      DEFAULT_WEAPON_POS.y + swingPosY,
      DEFAULT_WEAPON_POS.z + recoilZ + swingPosZ
    );
    weaponRig.rotation.set(
      recoilRotX + swingRotX,
      swingRotY,
      swingRotZ
    );

    spawnTimer += dt;
    if (!isRoundTransition && roundToSpawn > 0 && spawnTimer >= roundSpawnInterval && zombies.length < roundMaxAlive) {
      spawnTimer = 0;
      spawnZombie();
    }

    for (let i = slashWaves.length - 1; i >= 0; i--) {
      const sw = slashWaves[i];
      sw.life -= dt;
      sw.mesh.position.add(sw.vel.clone().multiplyScalar(dt));
      const ratio = Math.max(0, sw.life / sw.maxLife);
      sw.mesh.scale.setScalar(1 + (1 - ratio) * 0.45);
      sw.mesh.material.opacity = ratio * 0.92;
      if (sw.life <= 0) {
        scene.remove(sw.mesh);
        slashWaves.splice(i, 1);
      }
    }

    for (let i = playerArrows.length - 1; i >= 0; i--) {
      const pa = playerArrows[i];
      pa.life -= dt;
      pa.vel.y -= 9.8 * dt;
      pa.mesh.position.add(pa.vel.clone().multiplyScalar(dt));
      pa.mesh.lookAt(pa.mesh.position.clone().add(pa.vel));

      let hit = false;
      for (let j = zombies.length - 1; j >= 0; j--) {
        const z = zombies[j];
        const hitDist = z.type === 'boss' ? 3.5 : (z.type === 'tank' ? 1.7 : 1.15);
        const zCenter = z.group.position.clone().add(new THREE.Vector3(0, z.type === 'boss' ? 3.8 : 1.1, 0));
        if (pa.mesh.position.distanceTo(zCenter) < hitDist) {
          damageZombieRaw(z, pa.damage);
          hit = true;
          break;
        }
      }
      if (hit || pa.mesh.position.y <= 0 || pa.life <= 0) {
        scene.remove(pa.mesh);
        playerArrows.splice(i, 1);
      }
    }

    for (let i = bazookaRockets.length - 1; i >= 0; i--) {
      const br = bazookaRockets[i];
      br.life -= dt;
      br.vel.y -= 2.5 * dt;
      br.mesh.position.add(br.vel.clone().multiplyScalar(dt));
      br.mesh.lookAt(br.mesh.position.clone().add(br.vel));

      let exploded = false;
      for (let j = zombies.length - 1; j >= 0; j--) {
        const z = zombies[j];
        const hitDist = z.type === 'boss' ? 4.0 : 1.8;
        const zCenter = z.group.position.clone().add(new THREE.Vector3(0, z.type === 'boss' ? 3.6 : 1.1, 0));
        if (br.mesh.position.distanceTo(zCenter) < hitDist) {
          exploded = true;
          break;
        }
      }
      if (!exploded && (br.mesh.position.y <= 0.3 || checkCollision(br.mesh.position.x, br.mesh.position.z, 0.3) || br.life <= 0)) {
        exploded = true;
      }

      if (exploded) {
        createExplosion(br.mesh.position.clone(), 14, br.damage);
        scene.remove(br.mesh);
        bazookaRockets.splice(i, 1);
      }
    }

    for (let i = potions.length - 1; i >= 0; i--) {
      const p = potions[i];
      p.time += dt; p.mesh.rotation.y += 2 * dt; p.mesh.position.y = p.startY + Math.sin(p.time * 4) * 0.15;
      if (playerPos.distanceTo(p.mesh.position) < 1.5) {
        hp = Math.min(100, hp + 30); updateHPUI(); playSound('reload');
        scene.remove(p.mesh); potions.splice(i, 1);
      }
    }

    const canZombiesJump = currentRound >= 10;

    for (let i = zombies.length - 1; i >= 0; i--) {
      const z = zombies[i];
      const dxToP = playerPos.x - z.group.position.x;
      const dzToP = playerPos.z - z.group.position.z;
      const dist = Math.hypot(dxToP, dzToP);

      if (z.type === 'ghost') {
        z.ghostTimer += dt;
        if (z.ghostTimer > 5.0) {
          z.isGhost = !z.isGhost;
          z.ghostTimer = 0;
          for (const m of z.mats) m.opacity = z.isGhost ? 0.18 : 1.0;
        }
      }

      if (z.type === 'boss' && z.bossCoreMat) {
        const pulseVal = Math.sin(time * 0.012) > 0;
        z.bossCoreMat.color.setHex(pulseVal ? 0xff2a2a : 0xff9900);
      }

      if (z.type === 'archer') {
        z.shootCooldown -= dt;
        const archerRange = currentDiff === 'hard' ? 38 : (currentDiff === 'normal' ? 33 : 28);
        if (dist < archerRange && z.shootCooldown <= 0) {
          z.shootCooldown = getRoundArcherCooldown(currentRound);
          const arrowMesh = new THREE.Mesh(
            new THREE.CylinderGeometry(0.06, 0.06, 0.95),
            new THREE.MeshBasicMaterial({ color: 0xc084fc })
          );
          const originPos = z.group.position.clone().add(new THREE.Vector3(0, 1.45, 0));
          const targetAim = playerPos.clone().add(new THREE.Vector3(0, -0.15, 0));
          arrowMesh.position.copy(originPos);
          arrowMesh.lookAt(targetAim);
          arrowMesh.rotation.x = Math.PI / 2;
          scene.add(arrowMesh);

          const dir = targetAim.sub(originPos).normalize();
          const projSpd = getRoundProjectileSpeed(currentRound);
          arrows.push({ mesh: arrowMesh, vel: dir.multiplyScalar(projSpd), life: 2.6 });
        }
      }

      const moveSpd = z.speed * dt;
      const entityRadius = z.type === 'boss' ? 2.4 : (z.type === 'tank' ? 1.1 : 0.65);
      const minKeepDist = z.type === 'boss' ? 4.4 : (z.type === 'tank' ? 2.6 : 1.75);

      z.walkCycle += dt * (z.speed * 3.4);
      const swing = Math.sin(z.walkCycle);
      z.leftLeg.rotation.x = swing * 0.55;
      z.rightLeg.rotation.x = -swing * 0.55;
      z.armPivotL.rotation.x = -0.15 + swing * 0.18;
      z.armPivotR.rotation.x = -0.15 - swing * 0.18;
      z.group.rotation.z = Math.cos(z.walkCycle) * 0.05;

      z.group.lookAt(playerPos.x, z.group.position.y, playerPos.z);

      if (dist > 0.001) {
        const dirX = dxToP / dist;
        const dirZ = dzToP / dist;

        if (dist > minKeepDist * 0.85) {
          moveEntityTowardTarget(z.group.position, dirX, dirZ, moveSpd, entityRadius, z.steerSign);
        }

        const afterDx = z.group.position.x - playerPos.x;
        const afterDz = z.group.position.z - playerPos.z;
        const afterDist = Math.hypot(afterDx, afterDz);
        if (afterDist < minKeepDist) {
          const pushX = afterDist > 0.001 ? afterDx / afterDist : -dirX;
          const pushZ = afterDist > 0.001 ? afterDz / afterDist : -dirZ;
          const targetX = playerPos.x + pushX * minKeepDist;
          const targetZ = playerPos.z + pushZ * minKeepDist;
          if (!checkCollision(targetX, targetZ, entityRadius)) {
            z.group.position.x = targetX;
            z.group.position.z = targetZ;
          }
        }

        if (canZombiesJump && z.type !== 'boss' && z.isGrounded && dist > 5 && dist < 18 && Math.random() < 0.012) {
          z.velY = 14; z.isGrounded = false;
        }
        z.velY -= 30 * dt;
        z.group.position.y += z.velY * dt;
        if (z.group.position.y <= 0) {
          z.group.position.y = 0; z.velY = 0; z.isGrounded = true;
        }

        if (dist <= minKeepDist + 0.45 && z.group.position.y < playerPos.y + 1.5 && !isUltFalling) {
          const rawDmg = z.type === 'boss' ? 35 : (z.type === 'tank' ? 24 : 15);
          takeDamage(rawDmg);
        }
      }
    }

    for (let i = thrownGrenades.length - 1; i >= 0; i--) {
      const g = thrownGrenades[i];
      g.timer -= dt; g.vel.y -= 20 * dt;
      g.pos.add(g.vel.clone().multiplyScalar(dt));
      if (g.pos.y < 0.2) { g.pos.y = 0.2; g.vel.y *= -0.5; g.vel.x *= 0.8; g.vel.z *= 0.8; }
      g.mesh.position.copy(g.pos);
      g.mesh.rotation.x += g.vel.z * 0.1; g.mesh.rotation.z -= g.vel.x * 0.1;

      if (g.timer <= 0) {
        scene.remove(g.mesh); thrownGrenades.splice(i, 1);
        createExplosion(g.pos, 10, 300);
      }
    }

    for (let i = explosions.length - 1; i >= 0; i--) {
      const e = explosions[i]; e.life -= dt;
      const scale = 1 + (e.maxLife - e.life) * 10; e.mesh.scale.setScalar(scale);
      e.mesh.material.opacity = (e.life / e.maxLife) * 0.8;
      if (e.life <= 0) { scene.remove(e.mesh); explosions.splice(i, 1); }
    }

    for (let i = expParticles.length - 1; i >= 0; i--) {
      const p = expParticles[i]; p.life -= dt;
      p.vel.y -= 30 * dt;
      p.mesh.position.add(p.vel.clone().multiplyScalar(dt));
      if (p.life <= 0) { scene.remove(p.mesh); expParticles.splice(i, 1); }
    }

    for (let i = shockwaves.length - 1; i >= 0; i--) {
      const s = shockwaves[i]; s.life -= dt;
      s.scale += dt * 50; s.mesh.scale.setScalar(s.scale);
      s.mesh.material.opacity = (s.life / s.maxLife);
      if (s.life <= 0) { scene.remove(s.mesh); shockwaves.splice(i, 1); }
    }

    for (let i = arrows.length - 1; i >= 0; i--) {
      const a = arrows[i];
      a.life -= dt;
      a.mesh.position.add(a.vel.clone().multiplyScalar(dt));
      if (a.mesh.position.distanceTo(playerPos) < 1.15) {
        takeDamage(18);
        a.life = 0;
      }
      if (a.life <= 0) {
        scene.remove(a.mesh);
        arrows.splice(i, 1);
      }
    }

    for (let i = bloodParticles.length - 1; i >= 0; i--) {
      const b = bloodParticles[i]; b.life -= dt; b.vel.y -= 9.8 * dt; b.mesh.position.add(b.vel.clone().multiplyScalar(dt));
      if (b.life <= 0) { scene.remove(b.mesh); bloodParticles.splice(i, 1); }
    }
  }
  renderer.render(scene, camera);
});

window.addEventListener('mousemove', (e) => {
  if (!isLocked || gameOver || isSettingsOpen) return;
  const baseSens = isScoped ? 0.0007 : 0.0022;
  const sens = baseSens * mouseSensMult;
  cameraYaw -= e.movementX * sens; cameraPitch -= e.movementY * sens;
  cameraPitch = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, cameraPitch));
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

document.getElementById('overlay').addEventListener('click', () => {
  initAudio(() => {
    if (!hasStarted || gameOver) {
      hasStarted = true;
      resetGame();
    }
    document.body.requestPointerLock();
  });
});

document.addEventListener('pointerlockchange', () => {
  isLocked = document.pointerLockElement === document.body;
  if (!isLocked && hasStarted && !gameOver && !isArmoryOpen) {
    openSettings();
  } else if (isLocked && !gameOver) {
    isSettingsOpen = false;
    document.getElementById('settings-menu').style.display = 'none';
    document.getElementById('overlay').style.display = 'none';
  }
});

updateWeaponVisuals();
updateRoundHUD();