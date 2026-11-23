import * as THREE from 'three';

// ==========================================
// 1. 안전한 리얼 오디오 엔진 (에러 발생해도 게임 안 멈춤)
// ==========================================
let audioListener = null;
let soundBuffers = {};
let activeSounds = {};
let audioLoader = null;
let isAudioReady = false;

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

// dur: 재생 길이(초), offset: 시작 지점(초), overlap: true면 이전 소리를 끊지 않고 겹침(연사용)
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

function playSound(type) {
  if (!audioListener || !soundBuffers[type]) return;
  try {
    const cfg = SOUND_CFG[type] || { dur: 0.2, offset: 0, overlap: false };

    // 겹침 불가 소리만 이전 소리 끊기
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

    // 끝부분 페이드아웃
    const g = sound.gain.gain;
    const t = sound.context.currentTime;
    g.cancelScheduledValues(t);
    g.setValueAtTime(vol, t);
    g.setValueAtTime(vol, t + Math.max(0, cfg.dur - 0.05));
    g.linearRampToValueAtTime(0, t + cfg.dur);

    activeSounds[type] = sound;
  } catch (e) {
    // 소리 재생 실패해도 게임 멈춤 방지
  }
}

// ==========================================
// 2. 씬 & 환경
// ==========================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x6b93a3);
scene.fog = new THREE.Fog(0x6b93a3, 25, 120);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.05, 180);
scene.add(camera);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xbad2e0, 1.4); scene.add(ambientLight);
const sunLight = new THREE.DirectionalLight(0xfff7e6, 2.2); sunLight.position.set(40, 60, 30); scene.add(sunLight);

const colliders = [];

const ground = new THREE.Mesh(new THREE.PlaneGeometry(180, 180), new THREE.MeshStandardMaterial({ color: 0x3d4f36, roughness: 0.9 }));
ground.rotation.x = -Math.PI / 2; scene.add(ground);

const mountainMat = new THREE.MeshStandardMaterial({ color: 0x44413b, roughness: 0.95, flatShading: true });
for (let i = 0; i < 30; i++) {
  const angle = (i / 30) * Math.PI * 2; const dist = 70 + Math.random() * 20;
  const radius = 18 + Math.random() * 12; const height = 35 + Math.random() * 25;
  const mx = Math.cos(angle) * dist; const mz = Math.sin(angle) * dist;
  const mountain = new THREE.Mesh(new THREE.ConeGeometry(radius, height, 6), mountainMat);
  mountain.position.set(mx, height / 2 - 2, mz);
  scene.add(mountain);
  colliders.push({ x: mx, z: mz, radius: radius * 0.7 });
}

const trunkGeo = new THREE.CylinderGeometry(0.3, 0.5, 2.5, 6);
const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3a2312, roughness: 0.9 });
const leavesMat = new THREE.MeshStandardMaterial({ color: 0x1b3b22, roughness: 0.8, flatShading: true });
for (let i = 0; i < 60; i++) {
  const x = (Math.random() - 0.5) * 110; const z = (Math.random() - 0.5) * 110;
  if (Math.hypot(x, z) > 10) {
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(trunkGeo, trunkMat); trunk.position.y = 1.25; tree.add(trunk);
    for (let j = 0; j < 3; j++) {
      const leaves = new THREE.Mesh(new THREE.ConeGeometry(2.0 - j * 0.45, 2.8 - j * 0.4, 6), leavesMat);
      leaves.position.y = 3.2 + j * 1.3; tree.add(leaves);
    }
    tree.position.set(x, 0, z); scene.add(tree);
    colliders.push({ x: x, z: z, radius: 1.0 });
  }
}

function checkCollision(nx, nz) {
  const playerRadius = 0.5;
  for (let c of colliders) {
    const dx = nx - c.x; const dz = nz - c.z;
    if (dx*dx + dz*dz < (c.radius + playerRadius) * (c.radius + playerRadius)) return true;
  }
  return false;
}

// ==========================================
// 3. 무기 및 아이템 모델링
// ==========================================
const WEAPONS_DATA = {
  ak47: { name: 'AK-47', type: 'auto', damage: 40, rate: 0.11, mag: 30, reloadTime: 1.8, recoil: 0.08 },
  m4a1: { name: 'M4A1', type: 'auto', damage: 28, rate: 0.075, mag: 30, reloadTime: 1.6, recoil: 0.045 },
  sniper: { name: 'AWP 스나이퍼', type: 'semi', damage: 180, rate: 1.1, mag: 5, reloadTime: 2.4, recoil: 0.16 },
  laser: { name: '팜 레이저', type: 'auto', damage: 52, rate: 0.12, mag: 35, reloadTime: 1.6, recoil: 0.035 },
  pistol: { name: '권총 (Glock)', type: 'semi', damage: 24, rate: 0.18, mag: 12, reloadTime: 1.2, recoil: 0.04 },
  axe: { name: '전투 도끼', type: 'melee', damage: 95, rate: 0.6, mag: Infinity, reloadTime: 0, recoil: 0 },
  grenade: { name: '수류탄', type: 'throw', damage: 300, rate: 1.0, mag: Infinity, reloadTime: 1.0, recoil: 0.1 }
};

const weaponRig = new THREE.Group(); camera.add(weaponRig);

const steelMat = new THREE.MeshStandardMaterial({ color: 0x1f2428, metalness: 0.85, roughness: 0.25 });
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

const sniperModel = new THREE.Group();
sniperModel.add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.6), camoMat));
const sniperStock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.14, 0.42), camoMat); sniperStock.position.set(0, -0.03, 0.44); sniperModel.add(sniperStock);
const sniperBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.85, 8), steelMat); sniperBarrel.rotation.x = Math.PI / 2; sniperBarrel.position.set(0, 0.02, -0.72); sniperModel.add(sniperBarrel);
const scopeMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.35, 12), steelMat); scopeMesh.rotation.x = Math.PI / 2; scopeMesh.position.set(0, 0.1, -0.05); sniperModel.add(scopeMesh);

const pistolModel = new THREE.Group();
const pSlide = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.24), steelMat); pSlide.position.set(0, 0.03, 0); pistolModel.add(pSlide);
const pGrip = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.15, 0.08), darkPolyMat); pGrip.position.set(0, -0.08, 0.06); pGrip.rotation.x = -Math.PI / 8; pistolModel.add(pGrip);

const axeModel = new THREE.Group();
const axeShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.028, 0.68, 10), woodMat); axeShaft.position.y = 0.05; axeModel.add(axeShaft);
const axeBlade = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.28, 0.22), steelMat); axeBlade.position.set(0, 0.32, -0.16); axeModel.add(axeBlade);
const axeSpike = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.16, 6), steelMat); axeSpike.rotation.x = -Math.PI/2; axeSpike.position.set(0, 0.32, 0.12); axeModel.add(axeSpike);
axeModel.rotation.set(Math.PI / 4, -Math.PI / 8, -Math.PI / 10); axeModel.position.set(0.04, -0.05, 0.08);

const grenadeModel = new THREE.Group();
const gBody = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), new THREE.MeshStandardMaterial({color: 0x2e3d30}));
const gPin = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.04), steelMat); gPin.position.y = 0.06;
grenadeModel.add(gBody); grenadeModel.add(gPin);
grenadeModel.position.set(0, -0.1, -0.2);

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

weaponRig.add(akModel, m4Model, sniperModel, pistolModel, axeModel, grenadeModel, laserHandModel);
const muzzleFlash = new THREE.PointLight(0xffa500, 0, 5); muzzleFlash.position.set(0, 0.02, -0.85); weaponRig.add(muzzleFlash);

const DEFAULT_WEAPON_POS = new THREE.Vector3(0.24, -0.22, -0.48);
weaponRig.position.copy(DEFAULT_WEAPON_POS);
const WEAPON_MODELS = { ak47: akModel, m4a1: m4Model, sniper: sniperModel, laser: laserHandModel, pistol: pistolModel, axe: axeModel, grenade: grenadeModel };

const potionGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.5, 12);
const potionMat = new THREE.MeshStandardMaterial({ color: 0xff3333, emissive: 0xaa0000, emissiveIntensity: 0.8, transparent: true, opacity: 0.9 });
const potions = [];

// ==========================================
// 4. 상태 및 시스템 변수
// ==========================================
let kills = 0, hp = 100, gameOver = false, isLocked = false, isArmoryOpen = false;
let currentSlot = 1; let primaryWeaponId = 'ak47'; let activeWeaponKey = 'ak47';
const ammoState = { ak47: 30, m4a1: 30, sniper: 5, laser: 35, pistol: 12 };

let isReloading = false, reloadTimer = 0, shootCooldown = 0, isMouseDown = false, isScoped = false;
let recoilZ = 0, recoilRotX = 0, axeSwingTimer = 0; const AXE_SWING_DURATION = 0.4;
const playerPos = new THREE.Vector3(0, 1.7, 0); const playerVel = new THREE.Vector3();
let isGrounded = true, jumpCount = 0, cameraYaw = 0, cameraPitch = 0; const keys = {};
let ultCooldown = 0, isUltFalling = false;

let lastWave = 0, spawnInterval = 1.3, maxZombies = 20, hpMultiplier = 1.0, zombiesCanJump = false;

// ==========================================
// 5. 투사체 및 시각 이펙트
// ==========================================
const thrownGrenades = []; const explosions = []; const expParticles = []; const arrows = []; const shockwaves = [];

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
    if (pos.distanceTo(zombies[i].group.position) <= radius + 2) damageZombieRaw(zombies[i], damage);
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
    if (pos.distanceTo(zombies[i].group.position) <= 35) damageZombieRaw(zombies[i], 9999);
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
// 6. 좀비 AI 및 아이템 로직
// ==========================================
const zombies = []; const bloodParticles = [];

function showWaveMessage(waveIdx) {
  const msgs = ["", "⚠️ 30 KILL: 개체수 증가 & 힐 포션 드랍 활성화!", "⚠️ 70 KILL: 돌연변이 발생 (좀비 도약 능력 획득!)", "💀 120 KILL: 헬 모드 (모든 좀비 체력 5배 증가!)"];
  playSound('boom');
  const div = document.createElement('div');
  div.style.position = 'absolute'; div.style.top = '25%'; div.style.width = '100%';
  div.style.textAlign = 'center'; div.style.color = '#ff3333'; div.style.fontSize = '42px';
  div.style.fontWeight = '900'; div.style.textShadow = '0 0 15px black';
  div.style.pointerEvents = 'none'; div.style.zIndex = '100';
  div.textContent = msgs[waveIdx];
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 4000);
}

function checkWave() {
  let currentWave = 0;
  if (kills >= 120) { currentWave = 3; spawnInterval = 0.5; maxZombies = 50; zombiesCanJump = true; hpMultiplier = 5.0; }
  else if (kills >= 70) { currentWave = 2; spawnInterval = 0.6; maxZombies = 45; zombiesCanJump = true; hpMultiplier = 1.0; }
  else if (kills >= 30) { currentWave = 1; spawnInterval = 0.6; maxZombies = 40; zombiesCanJump = false; hpMultiplier = 1.0; }

  if (currentWave > lastWave) {
    lastWave = currentWave; showWaveMessage(currentWave);
  }
}

function spawnZombie() {
  const rand = Math.random();
  let type = 'normal', hp = 70 * hpMultiplier, speed = 2.2, scale = 1.0, color = 0x476342;

  if (rand < 0.2) { type = 'tank'; hp = 350 * hpMultiplier; speed = 1.0; scale = 1.8; color = 0x2d3748; }
  else if (rand < 0.4) { type = 'runner'; hp = 40 * hpMultiplier; speed = 5.5; scale = 0.85; color = 0x8a3a2e; }
  else if (rand < 0.6) { type = 'ghost'; hp = 60 * hpMultiplier; speed = 2.0; scale = 1.0; color = 0xaaaaaa; }
  else if (rand < 0.8) { type = 'archer'; hp = 50 * hpMultiplier; speed = 1.5; scale = 0.9; color = 0x8e44ad; }

  const zombie = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: color, transparent: true, opacity: 1.0 });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.75, 0.3), mat); torso.position.y = 1.15; zombie.add(torso);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), mat); head.position.y = 1.72; zombie.add(head);
  zombie.scale.setScalar(scale);

  const angle = Math.random() * Math.PI * 2; const dist = 40 + Math.random() * 20;
  zombie.position.set(playerPos.x + Math.cos(angle) * dist, 0, playerPos.z + Math.sin(angle) * dist);
  scene.add(zombie);

  zombies.push({
    group: zombie, mat: mat, type: type, hp: hp, speed: speed, walkCycle: Math.random()*10,
    ghostTimer: 0, isGhost: false, shootCooldown: 3.0, velY: 0, isGrounded: true
  });
}

function spawnPotion(pos) {
  const mesh = new THREE.Mesh(potionGeo, potionMat);
  mesh.position.copy(pos); mesh.position.y = 0.5;
  scene.add(mesh); potions.push({ mesh: mesh, startY: 0.5, time: 0 });
}

function damageZombieRaw(z, dmg) {
  z.hp -= dmg;
  createBloodExplosion(z.group.position.clone().add(new THREE.Vector3(0,1,0)));
  const pushDir = z.group.position.clone().sub(playerPos).normalize();
  if(!checkCollision(z.group.position.x + pushDir.x, z.group.position.z)) z.group.position.x += pushDir.x * 0.4;
  if(!checkCollision(z.group.position.x, z.group.position.z + pushDir.z)) z.group.position.z += pushDir.z * 0.4;

  if (z.hp <= 0) {
    const idx = zombies.indexOf(z);
    if(idx > -1) {
      if (kills >= 30 && Math.random() < 0.20) spawnPotion(z.group.position.clone());
      scene.remove(z.group); zombies.splice(idx, 1);
      kills++; document.getElementById('kill-count').textContent = kills; checkWave();
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
// 7. 게임 리셋, UI 및 입력 관리
// ==========================================
function updateHPUI() {
  document.getElementById('hp-text').textContent = hp;
  document.getElementById('hp-bar').style.width = `${hp}%`;
  document.getElementById('hp-bar').style.background = hp > 30 ? '#2ecc71' : '#e74c3c';
}

function takeDamage(dmg) {
  hp = Math.max(0, hp - dmg); updateHPUI();
  if (hp <= 0 && !gameOver) {
    gameOver = true; document.exitPointerLock(); setScope(false);
    document.getElementById('overlay').style.display = 'flex';
    document.getElementById('modal-title').textContent = 'YOU DIED (감염 완료)';
    document.getElementById('modal-desc').textContent = `최종 처치 수: ${kills}마리 · 클릭하여 부활`;
  }
}

function resetGame() {
  for (const z of zombies) scene.remove(z.group); zombies.length = 0;
  for (const b of bloodParticles) scene.remove(b.mesh); bloodParticles.length = 0;
  for (const g of thrownGrenades) scene.remove(g.mesh); thrownGrenades.length = 0;
  for (const e of explosions) scene.remove(e.mesh); explosions.length = 0;
  for (const ep of expParticles) scene.remove(ep.mesh); expParticles.length = 0;
  for (const a of arrows) scene.remove(a.mesh); arrows.length = 0;
  for (const s of shockwaves) scene.remove(s.mesh); shockwaves.length = 0;
  for (const p of potions) scene.remove(p.mesh); potions.length = 0;

  kills = 0; hp = 100; currentSlot = 1; primaryWeaponId = 'ak47'; activeWeaponKey = 'ak47';
  ammoState.ak47 = 30; ammoState.m4a1 = 30; ammoState.sniper = 5; ammoState.laser = 35; ammoState.pistol = 12;
  gameOver = false; isReloading = false; jumpCount = 0; ultCooldown = 0; isUltFalling = false;
  lastWave = 0; spawnInterval = 1.3; maxZombies = 20; hpMultiplier = 1.0; zombiesCanJump = false;

  document.getElementById('kill-count').textContent = kills; updateHPUI();
  document.getElementById('reload-msg').style.display = 'none'; updateUltUI();
  playerPos.set(0, 1.7, 0); playerVel.set(0, 0, 0); cameraYaw = 0; cameraPitch = 0;
  updateWeaponVisuals();
}

function updateWeaponVisuals() {
  if (currentSlot === 1) activeWeaponKey = primaryWeaponId;
  else if (currentSlot === 2) activeWeaponKey = 'pistol';
  else if (currentSlot === 3) activeWeaponKey = 'axe';
  else if (currentSlot === 4) activeWeaponKey = 'grenade';

  setScope(false);
  Object.keys(WEAPON_MODELS).forEach(k => WEAPON_MODELS[k].visible = (k === activeWeaponKey));
  for (let s=1; s<=4; s++) {
    const el = document.getElementById(`slot-${s}`);
    if (s === currentSlot) el.classList.add('active'); else el.classList.remove('active');
  }
  document.getElementById('current-weapon-name').textContent = WEAPONS_DATA[activeWeaponKey].name;
  updateAmmoUI();
}

function updateAmmoUI() {
  const el = document.getElementById('ammo-count');
  if (activeWeaponKey === 'axe' || activeWeaponKey === 'grenade') {
    el.textContent = '∞';
  } else {
    el.textContent = `${ammoState[activeWeaponKey]} / ∞`;
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

function toggleArmory() {
  isArmoryOpen = !isArmoryOpen;
  const armoryMenu = document.getElementById('armory-menu');
  if (isArmoryOpen) {
    document.exitPointerLock(); armoryMenu.style.display = 'flex';
  } else {
    armoryMenu.style.display = 'none'; document.body.requestPointerLock();
  }
}

function setupArmorySelect(btnId, weaponId) {
  document.getElementById(btnId).addEventListener('click', () => {
    primaryWeaponId = weaponId; currentSlot = 1;
    updateWeaponVisuals(); toggleArmory();
  });
}
document.getElementById('close-armory-btn').addEventListener('click', toggleArmory);
setupArmorySelect('select-ak47', 'ak47'); setupArmorySelect('select-m4a1', 'm4a1');
setupArmorySelect('select-sniper', 'sniper'); setupArmorySelect('select-laser', 'laser');

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
  isReloading = true; reloadTimer = WEAPONS_DATA[activeWeaponKey].reloadTime;
  document.getElementById('reload-msg').style.display = 'block';
  playSound('reload'); setScope(false);
}

// ==========================================
// 8. 조작 이벤트
// ==========================================
window.addEventListener('contextmenu', e => e.preventDefault());

window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase(); keys[k] = true;
  if (!isLocked || gameOver) return;

  // 점프: 소리 없음
  if (e.code === 'Space') {
    if (jumpCount < 2) {
      playerVel.y = jumpCount === 0 ? 8.5 : 8.0; jumpCount++; isGrounded = false;
    }
  }

  if (k === 'v' && ultCooldown <= 0 && isGrounded && !isUltFalling) {
    playerVel.y = 28; isGrounded = false; isUltFalling = true; playSound('boom');
  }

  if (['1','2','3','4'].includes(k)) {
    currentSlot = parseInt(k); isReloading = false;
    document.getElementById('reload-msg').style.display = 'none';
    updateWeaponVisuals();
  }

  if (k === 'r' && activeWeaponKey !== 'axe' && activeWeaponKey !== 'grenade' && !isReloading) {
    if (ammoState[activeWeaponKey] < WEAPONS_DATA[activeWeaponKey].mag) startReload();
  }

  if (k === 'n') toggleArmory();
});
window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

window.addEventListener('mousedown', (e) => {
  if (!isLocked || gameOver) return;
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
    axeSwingTimer = AXE_SWING_DURATION; shootCooldown = cur.rate; playSound('axe');
    raycaster.setFromCamera(screenCenter, camera);
    for (let i = zombies.length - 1; i >= 0; i--) {
      if (playerPos.distanceTo(zombies[i].group.position) < 4.5) damageZombieRaw(zombies[i], cur.damage);
    }
    return;
  }

  if (activeWeaponKey !== 'grenade') {
    if (ammoState[activeWeaponKey] <= 0) { startReload(); return; }
    ammoState[activeWeaponKey]--;
  }

  updateAmmoUI();
  shootCooldown = cur.rate;

  if (activeWeaponKey === 'ak47') playSound('ak47');
  else if (activeWeaponKey === 'm4a1') playSound('m4a1');
  else if (activeWeaponKey === 'sniper') playSound('sniper');
  else if (activeWeaponKey === 'laser') playSound('laser');
  else if (activeWeaponKey === 'pistol') playSound('pistol');

  recoilZ = cur.recoil; recoilRotX = cur.recoil * 1.2;

  raycaster.setFromCamera(screenCenter, camera);
  const zMeshes = []; zombies.forEach(z => z.group.traverse(c => { if(c.isMesh) zMeshes.push(c); }));

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

renderer.setAnimationLoop((time) => {
  if (lastTime === null) { lastTime = time; return; }
  const dt = Math.min((time - lastTime) / 1000, 0.05); lastTime = time;

  if (isLocked && !gameOver) {
    if (ultCooldown > 0) { ultCooldown -= dt; updateUltUI(); }

    const euler = new THREE.Euler(0, 0, 0, 'YXZ'); euler.x = cameraPitch; euler.y = cameraYaw; camera.quaternion.setFromEuler(euler);

    const moveDir = new THREE.Vector3();
    if (keys['w']) moveDir.z -= 1; if (keys['s']) moveDir.z += 1;
    if (keys['a']) moveDir.x -= 1; if (keys['d']) moveDir.x += 1;
    moveDir.normalize(); moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraYaw);

    const speed = 7.5;
    const mx = moveDir.x * speed * dt; const mz = moveDir.z * speed * dt;

    if (!checkCollision(playerPos.x + mx, playerPos.z)) playerPos.x += mx;
    if (!checkCollision(playerPos.x, playerPos.z + mz)) playerPos.z += mz;

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

    let axeSwingRotX = 0, axeSwingRotY = 0, axeSwingRotZ = 0, axeSwingPosZ = 0;
    if (axeSwingTimer > 0) {
      axeSwingTimer -= dt;
      const progress = 1 - (axeSwingTimer / AXE_SWING_DURATION);
      if (progress < 0.3) {
        const p = progress / 0.3; axeSwingRotX = -p * 1.0; axeSwingRotY = p * 0.6; axeSwingPosZ = p * 0.3;
      } else {
        const p = (progress - 0.3) / 0.7; axeSwingRotX = -1.0 + p * 2.5; axeSwingRotY = 0.6 - p * 1.2; axeSwingRotZ = -p * 0.8; axeSwingPosZ = 0.3 - p * 1.6;
      }
      if (axeSwingTimer <= 0) axeSwingTimer = 0;
    }

    weaponRig.position.set(DEFAULT_WEAPON_POS.x, DEFAULT_WEAPON_POS.y, DEFAULT_WEAPON_POS.z + recoilZ + axeSwingPosZ);
    weaponRig.rotation.set(recoilRotX + axeSwingRotX, axeSwingRotY, axeSwingRotZ);

    spawnTimer += dt; if (spawnTimer >= spawnInterval && zombies.length < maxZombies) { spawnTimer = 0; spawnZombie(); }

    for (let i = potions.length - 1; i >= 0; i--) {
      const p = potions[i];
      p.time += dt; p.mesh.rotation.y += 2 * dt; p.mesh.position.y = p.startY + Math.sin(p.time * 4) * 0.15;
      if (playerPos.distanceTo(p.mesh.position) < 1.5) {
        hp = Math.min(100, hp + 30); updateHPUI(); playSound('reload');
        scene.remove(p.mesh); potions.splice(i, 1);
      }
    }

    for (let i = zombies.length - 1; i >= 0; i--) {
      const z = zombies[i];
      const dist = playerPos.distanceTo(z.group.position);

      if (z.type === 'ghost') {
        z.ghostTimer += dt;
        if (z.ghostTimer > 5.0) { z.isGhost = !z.isGhost; z.ghostTimer = 0; z.mat.opacity = z.isGhost ? 0.15 : 1.0; }
      }

      if (z.type === 'archer') {
        z.shootCooldown -= dt;
        if (dist < 25 && z.shootCooldown <= 0) {
          z.shootCooldown = 3.0; playSound('reload');
          const arrowMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.8), new THREE.MeshBasicMaterial({color: 0x8e44ad}));
          arrowMesh.position.copy(z.group.position).add(new THREE.Vector3(0,1.5,0));
          arrowMesh.lookAt(playerPos); arrowMesh.rotation.x = Math.PI/2; scene.add(arrowMesh);
          const dir = playerPos.clone().sub(arrowMesh.position).normalize();
          arrows.push({ mesh: arrowMesh, vel: dir.multiplyScalar(20), life: 2.0 });
        }
      }

      let moveSpd = z.speed * dt;
      if (z.type === 'archer' && dist < 15) moveSpd = -moveSpd;
      else if (z.type === 'archer' && dist < 25) moveSpd = 0;

      z.walkCycle += dt * (z.speed * 2.0);
      z.group.lookAt(playerPos.x, z.group.position.y, playerPos.z);

      const dirToPlayer = playerPos.clone().sub(z.group.position).normalize();
      const nx = z.group.position.x + dirToPlayer.x * moveSpd;
      const nz = z.group.position.z + dirToPlayer.z * moveSpd;
      if (!checkCollision(nx, z.group.position.z)) z.group.position.x = nx;
      if (!checkCollision(z.group.position.x, nz)) z.group.position.z = nz;

      if (zombiesCanJump && z.isGrounded && dist > 4 && dist < 18 && Math.random() < 0.012) {
        z.velY = 14; z.isGrounded = false;
      }
      z.velY -= 30 * dt;
      z.group.position.y += z.velY * dt;
      if (z.group.position.y <= 0) {
        z.group.position.y = 0; z.velY = 0; z.isGrounded = true;
      }

      const hitRadius = z.type === 'tank' ? 2.5 : 1.3;
      if (dist < hitRadius && z.group.position.y < playerPos.y + 1 && !isUltFalling) {
        takeDamage(z.type === 'tank' ? 25 : 15);
        z.group.position.x -= dirToPlayer.x * 1.5;
        z.group.position.z -= dirToPlayer.z * 1.5;
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
      const a = arrows[i]; a.life -= dt;
      a.mesh.position.add(a.vel.clone().multiplyScalar(dt));
      if (a.mesh.position.distanceTo(playerPos) < 1.0) { takeDamage(20); a.life = 0; }
      if (a.life <= 0) { scene.remove(a.mesh); arrows.splice(i, 1); }
    }

    for (let i = bloodParticles.length - 1; i >= 0; i--) {
      const b = bloodParticles[i]; b.life -= dt; b.vel.y -= 9.8 * dt; b.mesh.position.add(b.vel.clone().multiplyScalar(dt));
      if (b.life <= 0) { scene.remove(b.mesh); bloodParticles.splice(i, 1); }
    }
  }
  renderer.render(scene, camera);
});

window.addEventListener('mousemove', (e) => {
  if (!isLocked || gameOver) return;
  const sens = isScoped ? 0.0007 : 0.0022;
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
    if (gameOver) resetGame();
    document.body.requestPointerLock();
  });
});

document.addEventListener('pointerlockchange', () => {
  isLocked = document.pointerLockElement === document.body;
  if (!isLocked && !gameOver && !isArmoryOpen) document.getElementById('overlay').style.display = 'flex';
  else if (isLocked && !gameOver) document.getElementById('overlay').style.display = 'none';
});

updateWeaponVisuals();
