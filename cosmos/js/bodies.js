// Сборка сцены: Солнце, планеты, Луна, кольца, атмосферы, орбиты, пояс астероидов, звёзды, небо.
import * as THREE from 'three';
import { BODIES, DECOR, ARTIFACTS, DUST_TINTS } from './planets.js';
import * as S from './shaders.js';

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
// Плоскость Млечного Пути на небе — общая для звёзд и фона.
const GALAXY_N = new THREE.Vector3(0.3, 0.8, 0.5).normalize();

// Видимая скорость вращения вокруг оси: реальные периоды отличаются в сотни раз,
// поэтому сжимаем их степенью, сохраняя порядок и направление (Венера крутится назад).
function spinRate(hours) {
  return Math.sign(hours) * 0.18 * Math.pow(24 / Math.abs(hours), 0.35);
}

function orbitLine(r) {
  const pts = [];
  for (let i = 0; i <= 256; i++) {
    const a = (i / 256) * TAU;
    pts.push(Math.cos(a) * r, 0, Math.sin(a) * r);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const m = new THREE.LineBasicMaterial({ color: 0x9fb4ff, transparent: true, opacity: 0.12, depthWrite: false });
  return new THREE.Line(g, m);
}

// low — облегчённый режим для телефонов: меньше полигонов у сфер и колец.
export function buildSystem(scene, shared, low = false) {
  const bodies = new Map();
  const atmoSeg = low ? 48 : 64;

  for (const b of BODIES) {
    const root = new THREE.Group();
    root.name = b.id;
    scene.add(root);
    const tilt = new THREE.Group();
    tilt.rotation.z = b.tilt * DEG;
    root.add(tilt);

    const seg = low ? (b.radius > 3 ? 80 : 56) : (b.radius > 3 ? 192 : 128);
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(b.radius, seg, seg / 2), S.surfaceMaterial(b, shared));
    tilt.add(mesh);

    const o = {
      data: b, root, tilt, mesh,
      radius: b.radius, extent: b.radius,
      angle: 0, spin: 0, spinRate: spinRate(b.rotationHours),
      spinExtra: 0, boost: 0, // разгон вращения при наведении: boost 1 → 0, spinExtra копит доп. поворот
      ring: null, clouds: null, corona: null, orbitLine: null,
    };

    const atmo = b.look.atmo;
    if (atmo) tilt.add(new THREE.Mesh(new THREE.SphereGeometry(b.radius * atmo.shell, atmoSeg, atmoSeg / 2), S.atmosphereMaterial(b)));

    if (b.kind === 'earth') {
      o.clouds = new THREE.Mesh(new THREE.SphereGeometry(b.radius * 1.012, seg, seg / 2), S.cloudMaterial(b, shared));
      tilt.add(o.clouds);
    }

    const rings = b.look.rings;
    if (rings) {
      const geo = new THREE.RingGeometry(b.radius * rings.inner, b.radius * rings.outer, low ? 160 : 256, 4);
      o.ring = new THREE.Mesh(geo, S.ringMaterial(b));
      o.ring.rotation.x = -Math.PI / 2;
      tilt.add(o.ring);
      if (rings.type === 'saturn') o.extent = b.radius * rings.outer;
    }

    if (b.kind === 'sun') {
      // хромосфера — тонкая красная оболочка по ободу
      o.chromosphere = new THREE.Mesh(new THREE.SphereGeometry(b.radius * 1.04, 96, 48), S.chromosphereMaterial(shared, 1.04));
      tilt.add(o.chromosphere);
      const scale = 18; // широкая аура: свет Солнца заливает центр системы
      o.corona = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), S.coronaMaterial(shared, scale));
      o.corona.scale.setScalar(b.radius * scale);
      root.add(o.corona);
    }

    if (b.orbit > 0) {
      o.orbitLine = orbitLine(b.orbit);
      (b.parent ? bodies.get(b.parent).root : scene).add(o.orbitLine);
    }

    bodies.set(b.id, o);
  }

  function update(simDays, animTime) {
    for (const o of bodies.values()) {
      const b = o.data;
      if (b.orbit > 0) {
        o.angle = b.phase * DEG + (TAU * simDays) / b.periodDays;
        const x = Math.cos(o.angle) * b.orbit;
        const z = -Math.sin(o.angle) * b.orbit;
        if (b.parent) {
          const p = bodies.get(b.parent).root.position;
          o.root.position.set(p.x + x, p.y, p.z + z);
        } else {
          o.root.position.set(x, 0, z);
        }
      }
      // Луна приливно захвачена: всегда смотрит на Землю одной стороной
      o.spin = (b.locked ? o.angle + Math.PI : o.spinRate * animTime) + o.spinExtra;
      o.mesh.rotation.y = o.spin;
      if (o.clouds) o.clouds.rotation.y = o.spin * 1.15;
      if (o.ring) o.ring.material.uniforms.uPlanetPos.value.copy(o.root.position);
    }
  }

  function faceCamera(camera) {
    for (const o of bodies.values()) if (o.corona) o.corona.quaternion.copy(camera.quaternion);
  }

  function setFocus(id) {
    for (const [bid, o] of bodies) {
      if (!o.orbitLine) continue;
      const on = bid === id;
      o.orbitLine.material.opacity = on ? 0.4 : 0.12;
      o.orbitLine.material.color.set(on ? o.data.accent : 0x9fb4ff);
    }
  }

  function showOrbits(on) {
    for (const o of bodies.values()) if (o.orbitLine) o.orbitLine.visible = on;
  }

  return { bodies, update, faceCamera, setFocus, showOrbits };
}

// --- Солнце «как на снимках NASA SDO» --------------------------------------------------------

// Направление на точку поверхности по широте/долготе — в системе координат самого Солнца (крутится вместе с ним).
const latLon = (lat, lon) => new THREE.Vector3(
  Math.cos(lat * DEG) * Math.cos(lon * DEG), Math.sin(lat * DEG), -Math.cos(lat * DEG) * Math.sin(lon * DEG),
);

// Дуга петли: хорда между подножиями прижимается к сфере и приподнимается синусом; lean — наклон аркады.
function arcCurve(R, A, B, h, lean, nrt) {
  const pts = [];
  for (let k = 0; k <= 24; k++) {
    const t = k / 24;
    const lift = Math.sin(Math.PI * t);
    pts.push(A.clone().lerp(B, t).normalize().multiplyScalar(R * 0.995 + h * lift).addScaledVector(nrt, lean * lift));
  }
  return new THREE.CatmullRomCurve3(pts);
}

// Корональные петли над активными областями, эруптивный протуберанец, вспышки и выбросы (CME) по таймеру.
export function buildSunFX(sun, shared, low = false) {
  const R = sun.radius;
  const rand = rng(1971);
  const su = sun.mesh.material.uniforms;
  const regions = sun.data.look.regions.map((r) => ({ c: latLon(r.lat, r.lon), size: r.size }));
  regions.forEach((r, i) => {
    su.uAR.value[i].copy(r.c);
    su.uARSize.value[i] = r.size;
  });

  const fade = { value: 1 }; // издалека тонкие петли рябят — гасим их, когда Солнце маленькое
  const groups = [];
  let loops = 0;
  let sampleLoop = null;
  const tubeSeg = low ? 32 : 96;
  const tubeRad = low ? 6 : 10;
  // у каждой петли своя фаза качания и мерцания (атрибут aSeed — материал на область общий)
  const seeded = (geo) => {
    const s = rand();
    geo.setAttribute('aSeed', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count).fill(s), 1));
    return geo;
  };
  regions.forEach((r, i) => {
    const east = new THREE.Vector3(0, 1, 0).cross(r.c).normalize();
    const nrt = r.c.clone().cross(east);
    const mat = S.loopMaterial(shared, {
      color: [1.0, 0.66, 0.25], bright: 0.55, wobble: 0, seed: i * 1.7, fade,
      sway: nrt.clone().multiplyScalar(R * 0.02 * r.size), lift: r.c.clone().multiplyScalar(R * 0.025 * r.size),
    });
    const n = low ? 5 : 10;
    // аркада: тонкие полупрозрачные петли разной высоты рядком поперёк линии между пятнами
    for (let j = 0; j < n; j++) {
      const off = (j - (n - 1) / 2) * 0.025 * r.size;
      const span = (0.06 + rand() * 0.05) * r.size;
      const A = r.c.clone().addScaledVector(east, span).addScaledVector(nrt, off).normalize();
      const B = r.c.clone().addScaledVector(east, -span).addScaledVector(nrt, off + (rand() - 0.5) * 0.04).normalize();
      const curve = arcCurve(R, A, B, R * (0.1 + rand() * 0.2) * r.size, R * 0.05 * (rand() - 0.5), nrt);
      const tube = new THREE.Mesh(seeded(new THREE.TubeGeometry(curve, tubeSeg, R * (0.006 + rand() * 0.004) * r.size, tubeRad, false)), mat);
      sun.mesh.add(tube);
      sampleLoop ??= tube;
      loops++;
    }
    groups.push(mat);
  });

  // эруптивный протуберанец: большая красная арка, колышется
  const pc = latLon(32, 150);
  const pEast = new THREE.Vector3(0, 1, 0).cross(pc).normalize();
  const pNrt = pc.clone().cross(pEast);
  // протуберанец ещё и медленно вздымается и опадает, раскачиваясь поперёк арки
  const prom = new THREE.Mesh(
    seeded(new THREE.TubeGeometry(arcCurve(R, pc.clone().addScaledVector(pEast, 0.2).normalize(), pc.clone().addScaledVector(pEast, -0.2).normalize(), R * 0.75, R * 0.12, pNrt), tubeSeg, R * 0.035, tubeRad + 2, false)),
    S.loopMaterial(shared, {
      color: [1.0, 0.38, 0.14], bright: 1.1, wobble: R * 0.025, seed: 9.3, fade,
      sway: pNrt.clone().multiplyScalar(R * 0.05), lift: pc.clone().multiplyScalar(R * 0.08),
    }),
  );
  sun.mesh.add(prom);
  const fxMeshes = sun.mesh.children.filter((c) => c.material?.uniforms?.uSway);
  let loopsDrawn = true;

  // события: вспышка (резкий рост ~0.4 с, спад ~5 с), в 60% случаев — выброс корональной массы
  const corona = sun.corona.material.uniforms;
  const ev = { t: -1, idx: 0, cme: -1, next: 5 };
  const tmpV = new THREE.Vector3();
  const invQ = new THREE.Quaternion();
  let cam = null;
  // вспышка — над областью, повёрнутой к зрителю (иначе её закроет само Солнце)
  function trigger(animTime, forceCme = false) {
    const facing = [];
    if (cam) {
      const toCam = cam.position.clone().sub(sun.root.position).normalize();
      regions.forEach((r, i) => {
        const n = sun.mesh.localToWorld(tmpV.copy(r.c)).sub(sun.mesh.getWorldPosition(new THREE.Vector3())).normalize();
        if (n.dot(toCam) > 0.25) facing.push(i);
      });
    }
    ev.idx = facing.length ? facing[Math.floor(rand() * facing.length)] : Math.floor(rand() * regions.length);
    ev.t = animTime;
    ev.cme = forceCme || rand() < 0.6 ? animTime : -1;
  }
  function update(animTime, camera) {
    cam = camera;
    if (ev.t < 0 && animTime > ev.next) trigger(animTime);
    let f = 0;
    if (ev.t >= 0) {
      const a = animTime - ev.t;
      f = a < 0.4 ? a / 0.4 : Math.exp(-(a - 0.4) * 0.8);
      if (a > 6) {
        ev.t = -1;
        ev.next = animTime + 8 + rand() * 12;
        f = 0;
      }
    }
    su.uFlare.value = f;
    su.uFlareIdx.value = ev.t >= 0 ? ev.idx : -1;
    groups.forEach((m, i) => { m.uniforms.uFlare.value = i === ev.idx ? f : 0; });

    // CME уходит от края в сторону вспыхнувшей области (направление — в плоскости экрана, как у короны)
    let cme = 0;
    if (ev.cme >= 0) {
      cme = (animTime - ev.cme) / 7;
      if (cme >= 1) {
        ev.cme = -1;
        cme = 0;
      }
    }
    corona.uCme.value = cme;
    if (cme > 0) {
      sun.mesh.localToWorld(tmpV.copy(regions[ev.idx].c).multiplyScalar(R)).sub(sun.root.position);
      tmpV.applyQuaternion(invQ.copy(camera.quaternion).invert());
      corona.uCmeAng.value = Math.atan2(tmpV.y, tmpV.x);
    }

    // экранный радиус Солнца: петли видны вблизи, издалека плавно гаснут
    const d = camera.position.distanceTo(sun.root.position);
    const px = (R / (d * Math.tan((camera.fov * Math.PI) / 360))) * (innerHeight / 2);
    fade.value = THREE.MathUtils.smoothstep(px, 50, 120);
    // погашенные петли не рисуем вовсе — минус 60 вызовов отрисовки на карте
    const drawn = fade.value > 0;
    if (drawn !== loopsDrawn) {
      loopsDrawn = drawn;
      for (const m of fxMeshes) m.visible = drawn;
    }
  }

  return {
    loops,
    regions: regions.length,
    samples: { loop: sampleLoop, prominence: prom },
    fade,
    update,
    trigger,
    state: () => ({ flare: su.uFlare.value, cme: corona.uCme.value, loopsDrawn }),
  };
}

// --- Спутники и аппараты ---------------------------------------------------------------------

// Маленькие модели из примитивов: МКС (ферма + модули + 8 солнечных крыльев) и Хаббл (труба + 2 панели).
function craftModel(type, size) {
  const g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0xd8dde6, metalness: 0.6, roughness: 0.35 });
  const panel = new THREE.MeshStandardMaterial({ color: 0x2a3a6e, metalness: 0.3, roughness: 0.4, emissive: 0x0a1230 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xd9a441, metalness: 0.8, roughness: 0.3 });
  if (type === 'iss') {
    g.add(new THREE.Mesh(new THREE.BoxGeometry(1, 0.035, 0.035), metal));
    const mod = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.45, 12), metal);
    mod.rotation.x = Math.PI / 2;
    g.add(mod);
    for (const x of [-0.42, -0.3, 0.3, 0.42]) {
      for (const z of [-1, 1]) {
        const p = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.006, 0.3), panel);
        p.position.set(x, 0, z * 0.18);
        g.add(p);
      }
    }
  } else {
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.5, 16), metal);
    tube.rotation.z = Math.PI / 2;
    g.add(tube);
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.125, 0.08, 16), gold);
    ring.rotation.z = Math.PI / 2;
    ring.position.x = -0.15;
    g.add(ring);
    for (const z of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.008, 0.16), panel);
      p.position.set(0, 0, z * 0.25);
      g.add(p);
    }
  }
  g.scale.setScalar(size);
  return g;
}

// Луны и аппараты. Каждый висит на своём «шарнире» в центре планеты, наклонённом как плоскость орбиты.
export function buildDecor(scene, sys, shared, low = false) {
  // Свет только для моделей аппаратов (стандартные материалы), шейдеры планет считают свет сами.
  scene.add(new THREE.PointLight(0xffffff, 3, 0, 0));
  scene.add(new THREE.AmbientLight(0xffffff, 0.12));
  const items = DECOR.map((d, i) => {
    const parent = sys.bodies.get(d.parent);
    const pivot = new THREE.Group();
    pivot.rotation.z = (d.incl ?? parent.data.tilt) * DEG;
    parent.root.add(pivot);
    let mesh;
    if (d.craft) {
      mesh = craftModel(d.craft, d.size);
    } else {
      const b = { kind: d.kind || 'rocky', radius: d.radius, look: { seed: [i * 1.7 + 0.3, i * 0.9 + 2.1, i * 2.3 + 1.1], ...d.look } };
      const seg = low ? 32 : 48;
      mesh = new THREE.Mesh(new THREE.SphereGeometry(d.radius, seg, seg / 2), S.surfaceMaterial(b, shared));
      if (b.look.atmo) mesh.add(new THREE.Mesh(new THREE.SphereGeometry(d.radius * b.look.atmo.shell, 32, 16), S.atmosphereMaterial(b)));
    }
    pivot.add(mesh);
    return { data: d, pivot, mesh, phase: i * 2.399, angle: 0, world: new THREE.Vector3(), radius: d.radius ?? d.size };
  });

  function update(simDays, animTime) {
    for (const it of items) {
      const d = it.data;
      // на экране периоды замедлены (×6, но не быстрее 4 с на оборот при 1×), направление сохранено
      it.angle = it.phase + (d.craft
        ? (TAU * animTime) / d.seconds
        : (Math.sign(d.periodDays) * TAU * simDays) / Math.max(Math.abs(d.periodDays) * 6, 8));
      it.mesh.position.set(Math.cos(it.angle) * d.orbit, 0, -Math.sin(it.angle) * d.orbit);
      if (d.craft) it.mesh.rotation.y = it.angle;
      else it.mesh.rotation.y = it.angle + Math.PI; // луны приливно захвачены
      it.mesh.getWorldPosition(it.world);
    }
  }
  return { items, update };
}

// --- Дальний космос и пыль -------------------------------------------------------------------

// Звёзды внутри системы: бело-голубые, между орбитами и за Нептуном — дают глубину и параллакс.
export function buildNearStars(scene, shared, count = 1500) {
  const rand = rng(31);
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const phase = new Float32Array(count);
  const palette = [[0.75, 0.88, 1.0], [0.6, 0.8, 1.0], [0.85, 0.95, 1.0], [1.0, 1.0, 1.0], [0.55, 0.9, 1.0]];
  const d = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    d.set(gauss(rand), gauss(rand) * 0.6, gauss(rand)).normalize().multiplyScalar(170 + Math.pow(rand(), 0.6) * 730);
    pos.set([d.x, d.y, d.z], i * 3);
    const c = palette[Math.floor(rand() * palette.length)];
    const k = 0.6 + rand() * 0.5;
    col.set([c[0] * k, c[1] * k, c[2] * k], i * 3);
    size[i] = 1.0 + Math.pow(rand(), 4) * 2.4;
    phase[i] = rand();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  g.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
  const points = new THREE.Points(g, S.starsMaterial(shared));
  points.frustumCulled = false;
  points.renderOrder = -3;
  scene.add(points);
  return count;
}

// Воронка чёрной дыры: профиль y = −0.06·(1/r − 1) вращаем вокруг оси; раструб смотрит на систему под углом.
function funnel(shared, size, pos) {
  const pts = [];
  for (let j = 0; j <= 64; j++) {
    const r = 1 - 0.88 * Math.pow(j / 64, 0.7);
    pts.push(new THREE.Vector2(r, -0.06 * (1 / r - 1)));
  }
  const g = new THREE.Group();
  const surf = new THREE.Mesh(new THREE.LatheGeometry(pts, 256), S.funnelMaterial(shared));
  surf.renderOrder = -2;
  g.add(surf);
  // горловина — непрозрачная тьма: закрывает звёзды и туманности за ней
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.125, 64), new THREE.MeshBasicMaterial({ color: 0x000000 }));
  hole.rotation.x = -Math.PI / 2;
  hole.position.y = -0.06 * (1 / 0.12 - 1) + 0.01;
  g.add(hole);
  g.scale.setScalar(size);
  g.position.copy(pos);
  const toSys = pos.clone().negate().normalize();
  const side = new THREE.Vector3().crossVectors(toSys, new THREE.Vector3(0, 1, 0)).normalize();
  const axis = toSys.multiplyScalar(Math.cos(0.9)).addScaledVector(side, Math.sin(0.9)).normalize();
  g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis);
  return g;
}

const dirOf = (az, el) => new THREE.Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));

export function buildArtifacts(scene, shared, low = false) {
  const billboards = [];
  let layers = 0;
  const plane = new THREE.PlaneGeometry(2, 2);
  function billboard(a, pos, size, seed) {
    const m = new THREE.Mesh(plane, S.artifactMaterial(a, shared, seed));
    m.position.copy(pos);
    m.scale.setScalar(size / 2);
    m.renderOrder = -2; // после звёзд (тень дыры их закрывает), до орбит и колец
    m.userData.kind = a.type;
    scene.add(m);
    billboards.push(m);
    return m;
  }
  // Туманность — 3 слоя на разной глубине со сдвигом: при движении камеры слои расходятся, видно объём.
  function placeObject(a, pos, size, seed, rand) {
    if (a.type !== 'nebula') return billboard(a, pos, size, seed);
    const first = billboard(a, pos, size, seed);
    const rnd = rand || Math.random;
    for (let k = 1; k < 3; k++) {
      const off = new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).multiplyScalar(size * 0.55);
      billboard(a, pos.clone().add(off), size * (0.6 + rnd() * 0.4), seed + k * 11.3);
      layers++;
    }
    return first;
  }

  const items = ARTIFACTS.map((a, i) => {
    const pos = dirOf(a.az * DEG, a.el * DEG).multiplyScalar(a.dist);
    let mesh;
    if (a.funnel) {
      mesh = funnel(shared, a.size * 1.4 * 0.5, pos);
      mesh.frustumCulled = false;
      scene.add(mesh);
    } else {
      mesh = placeObject(a, pos, a.size * 1.4, i * 3.7 + 1.3); // крупнее — объекты должны ощущаться массивными
    }
    return { data: a, mesh, world: mesh.position, radius: a.size * 0.17 };
  });

  // Россыпь безымянных объектов по всей сфере — космос плотный со всех сторон (без подписей).
  const rand = rng(2024);
  const palettes = [
    [[0.6, 0.75, 1.0], [1.0, 0.97, 0.9]], [[0.75, 0.6, 1.0], [0.95, 0.92, 1.0]], [[0.9, 0.45, 0.75], [0.6, 0.6, 1.0]],
    [[0.3, 0.8, 0.85], [0.8, 0.95, 1.0]], [[0.95, 0.85, 0.6], [1.0, 1.0, 0.95]], [[0.8, 0.85, 1.0], [1.0, 1.0, 1.0]],
  ];
  const types = ['galaxy', 'galaxy', 'nebula', 'nebula', 'cluster', 'star', 'star', 'star'];
  // по всем 360° и на разной глубине (1200…4500): ближние крупнее и сильнее смещаются при движении камеры
  const scatter = low ? 25 : 70;
  let dMin = Infinity;
  let dMax = 0;
  for (let i = 0; i < scatter; i++) {
    const type = types[Math.floor(rand() * types.length)];
    const [c1, c2] = palettes[Math.floor(rand() * palettes.length)];
    const a = {
      type, color: c1, color2: c2, tilt: 0.25 + rand() * 0.7,
      size: type === 'nebula' ? 300 + rand() * 500 : type === 'star' ? 40 + rand() * 90 : 90 + rand() * 260,
    };
    const dist = 1200 + Math.pow(rand(), 0.8) * 3300;
    dMin = Math.min(dMin, dist);
    dMax = Math.max(dMax, dist);
    const dir = new THREE.Vector3(gauss(rand), gauss(rand), gauss(rand)).normalize();
    placeObject(a, dir.multiplyScalar(dist), a.size * (dist / 2700) * 1.15, 50 + i * 2.9, rand);
  }

  // воронка медленно прецессирует (ось описывает конус) — дыра «живая», а не приклеенная к небу
  const funnelMesh = items.find((it) => it.data.funnel)?.mesh;
  const funnelQ = funnelMesh?.quaternion.clone();
  const wob = new THREE.Quaternion();
  const wobE = new THREE.Euler();

  // по одному образцу каждого типа — для автотеста анимации (cosmos.animProbe)
  const samples = {};
  for (const m of billboards) samples[m.userData.kind] ??= m;
  if (funnelMesh) samples.funnel = funnelMesh;

  return {
    items,
    scatter,
    layers,
    samples,
    depthSpread: dMax / dMin,
    update(animTime) {
      if (!funnelMesh) return;
      wobE.set(Math.sin(animTime * 0.25) * 0.12, 0, Math.cos(animTime * 0.25) * 0.12);
      funnelMesh.quaternion.copy(funnelQ).multiply(wob.setFromEuler(wobE));
    },
    faceCamera(camera) {
      for (const m of billboards) m.quaternion.copy(camera.quaternion);
    },
  };
}

export function buildDust(scene, shared, low = false) {
  const count = low ? 1300 : 5000;
  const rand = rng(99);
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const phase = new Float32Array(count);
  const tints = DUST_TINTS;
  for (let i = 0; i < count; i++) {
    const r = 12 + Math.pow(rand(), 0.7) * 170;
    const a = rand() * TAU;
    pos.set([Math.cos(a) * r, gauss(rand) * (4 + r * 0.12), Math.sin(a) * r], i * 3);
    const t = tints[Math.floor(rand() * tints.length)];
    const k = 0.04 + rand() * 0.07;
    col.set([t[0] * k, t[1] * k, t[2] * k], i * 3);
    size[i] = 1.5 + rand() * 5;
    phase[i] = rand();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  g.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
  const points = new THREE.Points(g, S.dustMaterial(shared));
  points.frustumCulled = false;
  scene.add(points);

  const disk = new THREE.Mesh(new THREE.RingGeometry(8, 180, 128, 8), S.dustDiskMaterial(shared));
  disk.rotation.x = -Math.PI / 2;
  scene.add(disk);
  return { count, disk };
}

// Детерминированный генератор, чтобы небо и пояс были одинаковыми при каждой загрузке.
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(rand) {
  return Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(TAU * rand());
}

export function buildBelt(scene, shared, count = 3500) {
  const rand = rng(42);
  const au = new Float32Array(count);
  const ang = new Float32Array(count);
  const y = new Float32Array(count);
  const size = new Float32Array(count);
  const shade = new Float32Array(count);
  // Люки Кирквуда — пустые полосы, которые расчищает резонанс с Юпитером
  const gaps = [2.5, 2.82, 2.95];
  for (let i = 0; i < count; i++) {
    let a;
    do a = 2.1 + rand() * 1.2;
    while (gaps.some((g) => Math.abs(a - g) < 0.025));
    au[i] = a;
    ang[i] = rand() * TAU;
    y[i] = gauss(rand) * 0.6;
    size[i] = 0.6 + Math.pow(rand(), 3) * 2.2;
    shade[i] = 0.45 + rand() * 0.55;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  g.setAttribute('aAU', new THREE.BufferAttribute(au, 1));
  g.setAttribute('aAng', new THREE.BufferAttribute(ang, 1));
  g.setAttribute('aY', new THREE.BufferAttribute(y, 1));
  g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  g.setAttribute('aShade', new THREE.BufferAttribute(shade, 1));
  const points = new THREE.Points(g, S.beltMaterial(shared));
  points.frustumCulled = false;
  scene.add(points);
  return points;
}

export function buildStars(scene, shared, count = 7000) {
  const rand = rng(7);
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const phase = new Float32Array(count);
  const u = new THREE.Vector3(1, 0, 0).cross(GALAXY_N).normalize();
  const v = GALAXY_N.clone().cross(u).normalize();
  const d = new THREE.Vector3();
  const palette = [
    [0.72, 0.82, 1.0], [0.85, 0.9, 1.0], [1.0, 1.0, 1.0], [1.0, 0.94, 0.82], [1.0, 0.82, 0.64],
  ];
  for (let i = 0; i < count; i++) {
    if (rand() < 0.4) {
      // звёзды Млечного Пути — прижаты к плоскости галактики
      const a = rand() * TAU;
      d.copy(u).multiplyScalar(Math.cos(a)).addScaledVector(v, Math.sin(a)).addScaledVector(GALAXY_N, gauss(rand) * 0.12);
    } else {
      d.set(gauss(rand), gauss(rand), gauss(rand));
    }
    d.normalize().multiplyScalar(2600 + rand() * 1600);
    pos.set([d.x, d.y, d.z], i * 3);
    const c = palette[Math.floor(rand() * palette.length)];
    const k = 0.45 + rand() * 0.55;
    col.set([c[0] * k, c[1] * k, c[2] * k], i * 3);
    size[i] = 1.0 + Math.pow(rand(), 6) * 3.5;
    phase[i] = rand();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  g.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
  const points = new THREE.Points(g, S.starsMaterial(shared));
  points.frustumCulled = false;
  points.renderOrder = -3;
  scene.add(points);
  return points;
}

// Небо (туманности + полоса Млечного Пути) запекается один раз в кубическую карту:
// тяжёлый шум считается при загрузке, а не на каждом кадре.
export function bakeSky(renderer, size = 1024) {
  const rt = new THREE.WebGLCubeRenderTarget(size);
  const cam = new THREE.CubeCamera(1, 100, rt);
  const sky = new THREE.Scene();
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(50, 64, 32), S.skyMaterial(GALAXY_N));
  sky.add(mesh);
  cam.update(renderer, sky);
  mesh.geometry.dispose();
  mesh.material.dispose();
  return rt.texture;
}
