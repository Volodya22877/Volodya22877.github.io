// PROJEKT COSMOS — точка входа: рендерер, сцена, игровой цикл, выбор планет.
import * as THREE from 'three';
import { ORDER } from './planets.js';
import {
  buildSystem, buildBelt, buildStars, bakeSky, buildDecor, buildArtifacts, buildDust, buildNearStars, buildSunFX,
} from './bodies.js';
import { CameraRig, wrapAngle } from './camera.js';
import { setQuality } from './shaders.js';
import { createUI } from './ui.js';

const DAYS_PER_SEC = 2; // при скорости 1× земной год проходит примерно за 3 минуты
// демо-обзор: камера невысоко и ближе, система видна под углом, а не сверху
const MAP_PITCH = 0.55;
const MAP_PITCH_PORTRAIT = 0.8;
const HOVER_SPIN = 0.7; // рад/с к вращению планеты на пике разгона при наведении
const ORIGIN = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
// Скорость анимации поверхностей от скорости времени: 1× → 1, 10× → 2.5, 100× → 4 (на ускорении всё «кипит»)
const animRate = (s) => (s < 1 ? s : 1 + Math.log10(s) * 1.5);
// Облегчённый режим: телефоны и планшеты — основной указатель палец, либо тач + маленький экран устройства.
// Только по размеру экрана судить нельзя: маленькое окно или headless-браузер на ПК — это не телефон.
const LOW = matchMedia('(pointer: coarse)').matches
  || (navigator.maxTouchPoints > 0 && Math.min(screen.width, screen.height) < 760);

let mode = 'intro';
let focusId = null;
let speed = 1;
let speedCur = 1;
let simDays = 0;
let animTime = 0;
let lastSunAngle = null;
let shiftX = 0;
let shiftY = 0;
let frames = 0;
let renders = 0;
let ready = false;

const ui = createUI({ select, map: toMap, speed: (v) => { speed = v; }, launch, step });

const canvas = document.getElementById('scene');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  if (!renderer.capabilities.isWebGL2) throw new Error('WebGL 2 недоступен');
} catch (err) {
  ui.noWebGL();
  throw err;
}
// Шейдеры пишут цвет сразу в экранном пространстве — без пересчёта цветовых пространств.
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
// На телефоне с DPR 3 рендер в полном разрешении — это в 4 раза больше пикселей, чем при 1.5, а разницы почти не видно.
// На ПК — не меньше 1.25× даже на обычном мониторе: лёгкий суперсэмплинг сглаживает мелкие детали шейдеров.
const PR_BASE = LOW ? Math.min(devicePixelRatio, 1.5) : Math.min(Math.max(devicePixelRatio, 1.25), 2);
// На обложке на ПК — суперсэмплинг ×1.5: в окне только Земля, кадр простой, а картинка должна быть идеально чёткой.
const PR_INTRO = LOW ? PR_BASE : Math.min(PR_BASE * 1.5, 3);
renderer.setPixelRatio(PR_INTRO);
setQuality(LOW);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 20000);
const shared = {
  uTime: { value: 0 },
  uDays: { value: 0 },
  uPR: { value: renderer.getPixelRatio() },
};

const SKY_SIZE = LOW ? 512 : 2048;
const STARS = LOW ? 4000 : 12000;
const sys = buildSystem(scene, shared, LOW);
const sunFX = buildSunFX(sys.bodies.get('sun'), shared, LOW);
const decor = buildDecor(scene, sys, shared, LOW);
const artifacts = buildArtifacts(scene, shared, LOW);
const dust = buildDust(scene, shared, LOW);
buildBelt(scene, shared, LOW ? 1800 : 3500);
buildStars(scene, shared, STARS);
const NEAR_STARS = buildNearStars(scene, shared, LOW ? 600 : 1500);
scene.background = bakeSky(renderer, SKY_SIZE);

const rig = new CameraRig(camera, canvas, [document.getElementById('labels')]);
rig.autoSpin = true;
// тап по подписи — сразу её планета; по канвасу — ближайшая планета на экране
rig.onClick = (x, y, labelId, pointerType) => {
  const id = labelId || pick(x, y, pointerType === 'touch' ? 30 : 20);
  if (id) select(id);
};

// Угол обзора по режимам: на карте объектив шире (драматичная перспектива, камера ближе),
// у планеты — уже (без искажений шара). В портрете шире, иначе по горизонтали видна узкая щель.
// Камера не «прыгает»: fov плавно доезжает до цели в цикле.
const fovFor = (m) => {
  const portraitNow = innerWidth < innerHeight;
  if (m === 'map') return portraitNow ? 68 : 58;
  return portraitNow ? 55 : 45;
};
let fovGoal = fovFor('intro');
camera.fov = fovGoal;

let portrait = innerWidth < innerHeight;
function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  fovGoal = fovFor(mode);
  camera.updateProjectionMatrix();
  // Телефон повернули — переподгоняем кадр под новую ориентацию. Простое изменение высоты
  // (на мобильных прячется адресная строка) ориентацию не меняет и полёт не запускает.
  const nowPortrait = camera.aspect < 1;
  if (nowPortrait !== portrait && ready && !rig.flying) {
    if (mode === 'map') rig.flyTo({ ...mapPose(rig.yaw), duration: 1.2 });
    else if (mode === 'focus') rig.flyTo({ ...focusPose(sys.bodies.get(focusId)), duration: 1.2 });
  }
  portrait = nowPortrait;
}

// Демо-обзор: камера близко, широкий объектив — по ширине влезают орбиты до Нептуна (в портрете — до Сатурна),
// крайние планеты могут уходить за край кадра. В портрете камера смотрит чуть круче — орбиты занимают высоту.
function mapPose(yaw) {
  const fov = fovFor('map');
  const fitR = camera.aspect < 1 ? 110 : 140;
  const dist = Math.max(155, fitR / (Math.tan((fov * Math.PI) / 360) * camera.aspect));
  const pitch = camera.aspect < 1 ? MAP_PITCH_PORTRAIT : MAP_PITCH;
  return { target: () => ORIGIN, yaw, pitch, dist, min: 40, max: Math.max(900, dist * 2) };
}
addEventListener('resize', resize);
resize();

// --- Экранные координаты и выбор планеты кликом ------------------------------------------------

const tmp = new THREE.Vector3();
function screenOf(o) {
  return screenAt(o.root.position, o.radius);
}
function screenAt(pos, radius) {
  tmp.copy(pos).project(camera);
  const d = camera.position.distanceTo(pos);
  const r = (radius / (d * Math.tan((camera.fov * Math.PI) / 360))) * (innerHeight / 2);
  return {
    x: (tmp.x * 0.5 + 0.5) * innerWidth,
    y: (-tmp.y * 0.5 + 0.5) * innerHeight,
    r,
    behind: tmp.z > 1,
  };
}

// Выбор по экранному расстоянию, а не лучом: мелкие планеты на карте — пара пикселей,
// поэтому у каждой есть «зона захвата» не меньше minR px (мышь 20, палец 30).
function pick(x, y, minR = 20) {
  const earth = screenOf(sys.bodies.get('earth'));
  let best = null;
  let bestScore = 1;
  for (const o of sys.bodies.values()) {
    const s = screenOf(o);
    if (s.behind) continue;
    if (o.data.id === 'moon' && Math.hypot(s.x - earth.x, s.y - earth.y) < 28) continue;
    const score = Math.hypot(s.x - x, s.y - y) / Math.max(s.r * 1.15, minR);
    if (score < bestScore) {
      bestScore = score;
      best = o.data.id;
    }
  }
  return best;
}

canvas.addEventListener('pointermove', (e) => {
  if (rig.dragging || mode === 'intro') return;
  const id = pick(e.clientX, e.clientY);
  if (id !== hoverId) {
    hoverId = id;
    if (id) kick(id);
  }
  ui.setHover(id);
  canvas.style.cursor = id ? 'pointer' : '';
});
canvas.addEventListener('pointerleave', () => {
  hoverId = null;
  ui.setHover(null);
  canvas.style.cursor = '';
});

// Видеокарта может сбросить контекст (переключение GPU на ноутбуке, драйвер) — честно говорим, что делать.
canvas.addEventListener('webglcontextlost', () => ui.contextLost());

// --- Режимы: интро → карта ⇄ планета ------------------------------------------------------------

const sunAngle = (o) => Math.atan2(-o.root.position.x, -o.root.position.z);

// Лендинг: камера у верхнего края Земли — в окне-полосе виден изгиб планеты с атмосферой и космос над ней.
const earthBody = sys.bodies.get('earth');
const introAim = new THREE.Vector3();
sys.update(0, 0);
sys.showOrbits(false); // линии орбит в окне обложки только мусорят — включаются после старта
rig.follow = () => introAim.copy(earthBody.root.position).addScaledVector(UP, earthBody.radius * 1.02);
// близко и сверху под углом: в окне изгиб горизонта с атмосферой, а не весь шар издалека.
// Ракурс чуть смещён к дневной стороне и приподнят: больше освещённого шара, терминатор уходит к краю.
const INTRO_YAW = 0.9;
const INTRO_PITCH = 0.38;
rig.set({ yaw: sunAngle(earthBody) + INTRO_YAW, pitch: INTRO_PITCH, dist: earthBody.radius * 2.2 });

// Наведение (или выбор) «будит» планету: разгон вращения и вдох масштаба, потом затухание.
// «Массивно»: толчок задаёт цель, а сама скорость доходит до неё с инерцией и гаснет долго.
let hoverId = null;
function kick(id) {
  const o = sys.bodies.get(id);
  if (o) o.boostGoal = 1;
}
document.getElementById('labels').addEventListener('pointerover', (e) => {
  const id = e.target.closest?.('[data-id]')?.dataset.id;
  if (id && id !== hoverId) {
    hoverId = id;
    kick(id);
  }
});

// Дистанция подбирается под свободную часть экрана (без панели/шторки):
// радиус планеты на экране ≈ 34% меньшей стороны этой области (с кольцами — 38%).
function focusPose(o) {
  const isSun = o.data.id === 'sun';
  const startYaw = rig.yaw;
  const inset = ui.panelInset();
  const free = Math.min(innerWidth - inset.x * 2, innerHeight - inset.y * 2);
  const share = o.extent > o.radius ? 0.38 : 0.34;
  const extent = isSun ? o.radius * 1.1 : o.extent;
  const dist = (extent * innerHeight) / (2 * Math.tan((fovFor('focus') * Math.PI) / 360) * share * free);
  return {
    target: () => o.root.position,
    // камера чуть в стороне от линии «Солнце — планета»: видно и день, и терминатор
    yaw: isSun ? () => startYaw : () => sunAngle(o) + 0.8,
    pitch: isSun ? 0.18 : 0.2,
    dist,
    min: o.radius * 1.35,
    max: Math.max(o.extent * 40, 60, dist * 3),
  };
}

function select(id) {
  if (mode === 'intro' || !sys.bodies.has(id)) return;
  if (mode === 'focus' && id === focusId) return;
  mode = 'focus';
  focusId = id;
  lastSunAngle = null;
  fovGoal = fovFor('focus');
  kick(id);
  sys.setFocus(id);
  ui.setMode('focus', id);
  rig.flyTo(focusPose(sys.bodies.get(id)));
}

function toMap() {
  if (mode !== 'focus') return;
  mode = 'map';
  focusId = null;
  sys.setFocus(null);
  ui.setMode('map');
  fovGoal = fovFor('map');
  rig.flyTo(mapPose(rig.yaw));
}

function step(dir) {
  if (mode !== 'focus') return;
  const i = ORDER.indexOf(focusId);
  select(ORDER[(i + dir + ORDER.length) % ORDER.length]);
}

function launch() {
  if (mode !== 'intro' || !ready) return;
  mode = 'map';
  ui.hideIntro();
  ui.setMode('map');
  sys.showOrbits(true);
  fovGoal = fovFor('map');
  renderer.setPixelRatio(Math.min(PR_BASE, renderer.getPixelRatio()));
  shared.uPR.value = renderer.getPixelRatio();
  rig.input = true;
  rig.flyTo({ ...mapPose(0.55), duration: 5 });
}

addEventListener('keydown', (e) => {
  if (e.key === 'Escape') toMap();
  else if (e.key === 'ArrowRight') step(1);
  else if (e.key === 'ArrowLeft') step(-1);
});

// --- Цикл ---------------------------------------------------------------------------------------

function updateViewOffset(dt) {
  // панель справа (ПК) или шторка снизу (телефон): смещаем проекцию,
  // чтобы планета встала по центру свободной части экрана
  const goal = ui.panelInset();
  const k = 1 - Math.exp(-dt * 3);
  shiftX += (goal.x - shiftX) * k;
  shiftY += (goal.y - shiftY) * k;
  if (Math.abs(shiftX) < 0.5 && Math.abs(shiftY) < 0.5) {
    if (camera.view?.enabled) camera.clearViewOffset();
  } else {
    camera.setViewOffset(innerWidth, innerHeight, shiftX, shiftY, innerWidth, innerHeight);
  }
}

// Издалека планеты — пара пикселей. Подтягиваем их до минимального экранного радиуса,
// вблизи масштаб 1. Предел 2.2 — чтобы раздутая Земля не проглотила орбиту Луны.
const MIN_PX = 5;
function updateMinSize() {
  for (const o of sys.bodies.values()) {
    if (o.data.id === 'sun') continue;
    const r = screenOf(o).r;
    const k = THREE.MathUtils.clamp(MIN_PX / Math.max(r, 0.01), 1, 2.2);
    o.tilt.scale.setScalar(k * (1 + 0.12 * o.boost));
  }
}

function updateLabels() {
  const earth = screenOf(sys.bodies.get('earth'));
  const focus = focusId ? screenOf(sys.bodies.get(focusId)) : null;
  const items = [];
  for (const o of sys.bodies.values()) {
    const id = o.data.id;
    const s = screenOf(o);
    const r = Math.max(s.r * o.tilt.scale.x, 3);
    let show = mode !== 'intro' && !s.behind && id !== focusId
      && s.x > -60 && s.x < innerWidth + 60 && s.y > -60 && s.y < innerHeight + 60;
    if (id === 'moon' && focusId !== 'earth') show &&= Math.hypot(s.x - earth.x, s.y - earth.y) > 28;
    // подписи, которые попадают на диск выбранной планеты, не показываем — они «за» ней
    if (focus && !focus.behind) show &&= Math.hypot(s.x - focus.x, s.y - focus.y) > focus.r * 1.15;
    items.push({ id, x: s.x, y: s.y - r - 6, yBelow: s.y + r + 6, show, dim: mode === 'focus' });
  }
  const onScreen = (s) => !s.behind && s.x > 0 && s.x < innerWidth && s.y > 0 && s.y < innerHeight;
  // луны и аппараты — когда выбрана их планета; дальний космос — только на карте
  for (const it of decor.items) {
    const s = screenAt(it.world, it.radius);
    const show = mode === 'focus' && !rig.flying && focusId === it.data.parent && onScreen(s);
    items.push({ id: it.data.id, x: s.x, y: s.y - Math.max(s.r, 3) - 4, yBelow: s.y + Math.max(s.r, 3) + 4, show, dim: false });
  }
  for (const it of artifacts.items) {
    const s = screenAt(it.world, it.radius);
    items.push({ id: it.data.id, x: s.x, y: s.y - s.r - 4, yBelow: s.y + s.r + 4, show: mode === 'map' && onScreen(s), dim: true });
  }
  ui.updateLabels(items);
}

// Если кадры тяжёлые (4K-экран, слабая видеокарта) — ступенями снижаем разрешение рендера, но не ниже 1.
// Обратно не повышаем, чтобы не качаться туда-сюда. Первые секунды не считаем: там компиляция и прогрев.
let frameEma = 1 / 60;
let perfTimer = -3;
function adaptQuality(raw, dt) {
  if (raw < 0.25) frameEma += (raw - frameEma) * 0.05;
  perfTimer += dt;
  if (perfTimer < 2) return;
  perfTimer = 0;
  const pr = renderer.getPixelRatio();
  if (frameEma > 1 / 40 && pr > 1) {
    renderer.setPixelRatio(Math.max(1, pr - 0.25));
    shared.uPR.value = renderer.getPixelRatio();
  }
}

let last = performance.now();
function frame(now) {
  const raw = Math.max((now - last) / 1000, 0);
  const dt = Math.min(raw, 0.1);
  last = now;
  adaptQuality(raw, dt);

  // скорость времени набирается и сбрасывается тяжело — как раскрутка махины, без рывка
  speedCur += (speed - speedCur) * (1 - Math.exp(-dt * 0.9));
  if (Math.abs(speed - speedCur) < 1e-3) speedCur = speed;
  simDays += dt * DAYS_PER_SEC * speedCur;
  animTime += dt * animRate(speedCur);
  shared.uTime.value = animTime;
  shared.uDays.value = simDays;

  for (const o of sys.bodies.values()) {
    o.boostGoal = (o.boostGoal ?? 0) * Math.exp(-dt * 0.7);
    o.boost += (o.boostGoal - o.boost) * (1 - Math.exp(-dt * 1.8));
    if (o.boost < 0.002 && o.boostGoal < 0.002) {
      o.boost = 0;
      o.boostGoal = 0;
      continue;
    }
    // добавка на пике — 0.7 рад/с: планета заметно «просыпается», но не превращается в волчок
    if (!o.data.locked) o.spinExtra += dt * o.boost * HOVER_SPIN * (Math.sign(o.spinRate) || 1);
  }

  sys.update(simDays, animTime);
  decor.update(simDays, animTime);
  artifacts.update(animTime);

  // в режиме планеты камера летит вместе с ней и поворачивается вслед за Солнцем — освещение не «уплывает»
  if (mode === 'focus' && !rig.flying && focusId !== 'sun') {
    const a = sunAngle(sys.bodies.get(focusId));
    if (lastSunAngle !== null) rig.yaw += wrapAngle(a - lastSunAngle);
    lastSunAngle = a;
  } else {
    lastSunAngle = null;
  }

  rig.autoSpin = mode !== 'focus';
  rig.update(dt);
  // угол обзора плавно доезжает до цели режима (смена объектива без рывка)
  if (Math.abs(fovGoal - camera.fov) > 0.01) {
    camera.fov += (fovGoal - camera.fov) * (1 - Math.exp(-dt * 2.2));
    camera.updateProjectionMatrix();
  }
  updateViewOffset(dt);
  camera.updateMatrixWorld();
  updateMinSize();
  sys.faceCamera(camera);
  artifacts.faceCamera(camera);
  sunFX.update(animTime, camera);
  updateLabels();
  // лендинг прокручен к тексту, окна с Землёй не видно — видеокарта отдыхает (мир продолжает жить)
  if (mode !== 'intro' || ui.portholeVisible()) {
    renderer.render(scene, camera);
    renders++;
  }
  frames++;
  requestAnimationFrame(frame);
}

// Компиляция шейдеров блокирует поток — делаем её, когда интро уже нарисовано.
requestAnimationFrame(() => setTimeout(() => {
  sys.update(0, 0);
  decor.update(0, 0);
  rig.update(0);
  sys.faceCamera(camera);
  artifacts.faceCamera(camera);
  renderer.compile(scene, camera);
  ready = true;
  ui.ready();
  last = performance.now();
  requestAnimationFrame(frame);
}, 30));

// --- Отладочный API (им пользуются автотесты, а любопытные могут поиграть из консоли) -------------

window.cosmos = {
  get ready() {
    return ready;
  },
  frames: () => frames,
  renders: () => renders,
  state() {
    const bodies = {};
    for (const [id, o] of sys.bodies) bodies[id] = { angle: o.angle, spin: o.spin, boost: o.boost, spinExtra: o.spinExtra };
    const cam = { yaw: rig.yaw, pitch: rig.pitch, dist: rig.dist, roll: rig.roll, fov: camera.fov, target: rig.target.toArray() };
    for (const it of decor.items) bodies[it.data.id] = { angle: it.angle, parent: it.data.parent };
    return { mode, focusId, flying: rig.flying, lang: ui.lang, speed, simDays, animTime, cam, bodies, sun: sunFX.state() };
  },
  screenOf(id) {
    const s = screenOf(sys.bodies.get(id));
    return { x: s.x, y: s.y, r: s.r, behind: s.behind };
  },
  focus: select,
  toMap,
  launch,
  // вспышка на Солнце прямо сейчас (иначе — по таймеру раз в 8–20 с); cme = true — обязательно с выбросом
  sunFlare: (cme = false) => sunFX.trigger(animTime, cme),
  // ручная поза камеры на карте (для скриншотов и любопытных): углы в радианах
  view(yaw, pitch, dist) {
    if (mode !== 'map') return;
    rig.flyTo({ target: () => ORIGIN, yaw, pitch, dist, min: 40, max: 4000, duration: 0.8 });
  },
  info() {
    const gl = renderer.getContext();
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return {
      webgl2: renderer.capabilities.isWebGL2,
      renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
      pixelRatio: renderer.getPixelRatio(),
      pixelRatioBase: PR_BASE,
      quality: LOW ? 'low' : 'full',
      touch: ui.touch,
      spheres: sys.bodies.get('jupiter').mesh.geometry.parameters.widthSegments,
      octaves: LOW ? 4 : 7,
      scatter: artifacts.scatter,
      nebulaLayers: artifacts.layers,
      sunRadius: sys.bodies.get('sun').radius,
      sunLoops: sunFX.loops,
      hoverSpin: HOVER_SPIN,
      activeRegions: sunFX.regions,
      chromosphere: !!sys.bodies.get('sun').chromosphere,
      introCamDist: rig.dist / earthBody.radius,
      introYaw: INTRO_YAW,
      introPitch: INTRO_PITCH,
      depthSpread: artifacts.depthSpread,
      funnel: !!artifacts.items.find((it) => it.data.funnel),
      sky: SKY_SIZE,
      stars: STARS,
      decor: decor.items.map((it) => it.data.id),
      artifacts: artifacts.items.map((it) => it.data.id),
      dust: dust.count,
      nearStars: NEAR_STARS,
      animRate100: animRate(100),
    };
  },
  // Проверка «артефакты не статичны»: каждый образец рендерится отдельно (крупно, на чёрном) в момент t и t + dt;
  // diff — средняя разница кадров относительно яркости, shape — доля пикселей, где сменилась сама форма (есть/нет свечения).
  animProbe(dt = 3) {
    const N = 128;
    const rt = new THREE.WebGLRenderTarget(N, N);
    const cam = new THREE.PerspectiveCamera(40, 1, 0.01, 50000);
    const px = new Uint8Array(N * N * 4);
    const t0 = shared.uTime.value;
    const fade0 = sunFX.fade.value;
    sunFX.fade.value = 1;
    const shot = (obj, t) => {
      shared.uTime.value = t;
      renderer.setRenderTarget(rt);
      renderer.render(obj, cam);
      renderer.readRenderTargetPixels(rt, 0, 0, N, N, px);
      const l = new Float32Array(N * N);
      for (let i = 0; i < N * N; i++) l[i] = px[i * 4] * 0.2126 + px[i * 4 + 1] * 0.7152 + px[i * 4 + 2] * 0.0722;
      return l;
    };
    const out = {};
    const all = { ...artifacts.samples, ...sunFX.samples };
    for (const [kind, obj] of Object.entries(all)) {
      const vis = obj.visible;
      obj.visible = true; // погашенные петли спрятаны — для пробы показываем
      obj.updateMatrixWorld(true);
      const sphere = new THREE.Box3().setFromObject(obj).getBoundingSphere(new THREE.Sphere());
      if (obj.isMesh && obj.geometry.type === 'PlaneGeometry') {
        // билборд: смотрим как основная камера, в упор
        cam.quaternion.copy(camera.quaternion);
        cam.position.copy(obj.position).addScaledVector(new THREE.Vector3(0, 0, 1).applyQuaternion(camera.quaternion), obj.scale.x * 2.9);
      } else {
        // петли — сверху над их областью Солнца, воронка — сбоку от её оси
        const dir = sphere.center.clone().sub(sys.bodies.get('sun').root.position).normalize();
        if (kind === 'funnel') dir.set(1, 0.6, 0.3).normalize();
        cam.position.copy(sphere.center).addScaledVector(dir, sphere.radius * 3);
        cam.lookAt(sphere.center);
      }
      cam.updateMatrixWorld();
      const a = shot(obj, t0);
      const b = shot(obj, t0 + dt);
      let sum = 0;
      let diff = 0;
      let lit = 0;
      let flip = 0;
      for (let i = 0; i < N * N; i++) {
        sum += a[i];
        diff += Math.abs(a[i] - b[i]);
        const la = a[i] > 6;
        const lb = b[i] > 6;
        if (la || lb) lit++;
        if (la !== lb) flip++;
      }
      obj.visible = vis;
      out[kind] = { mean: sum / (N * N), diff: diff / Math.max(sum, 1), shape: flip / Math.max(lit, 1) };
    }
    renderer.setRenderTarget(null);
    rt.dispose();
    shared.uTime.value = t0;
    sunFX.fade.value = fade0;
    return out;
  },
  // Яркость кадра по сетке точек: пустой/чёрный кадр даёт нулевой разброс.
  probe() {
    renderer.render(scene, camera);
    const gl = renderer.getContext();
    const w = gl.drawingBufferWidth;
    const h = gl.drawingBufferHeight;
    const px = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    let sum = 0;
    let sum2 = 0;
    let max = 0;
    let bright = 0;
    let n = 0;
    for (let j = 0; j < h; j += 4) {
      for (let i = 0; i < w; i += 4) {
        const k = (j * w + i) * 4;
        const l = px[k] * 0.2126 + px[k + 1] * 0.7152 + px[k + 2] * 0.0722;
        sum += l;
        sum2 += l * l;
        if (l > max) max = l;
        if (l > 60) bright++;
        n++;
      }
    }
    const mean = sum / n;
    return { mean, std: Math.sqrt(Math.max(sum2 / n - mean * mean, 0)), max, brightShare: bright / n };
  },
};
