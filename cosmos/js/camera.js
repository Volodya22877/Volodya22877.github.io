// Камера «как в космосе»: орбита вокруг цели с инерцией, упругие границы зума
// и кинематографичные пролёты (на середине пути камера отходит назад, потом подлетает).
import * as THREE from 'three';

const clamp = THREE.MathUtils.clamp;
export const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const val = (x) => (typeof x === 'function' ? x() : x);
const PITCH_MIN = -1.4;
const PITCH_MAX = 1.45;

export class CameraRig {
  // dom — канвас; extra — элементы поверх него (подписи планет), с которых жест тоже должен начинаться.
  constructor(camera, dom, extra = []) {
    this.camera = camera;
    this.target = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0.3;
    this.dist = 100;
    this.roll = 0;
    this.vYaw = 0;
    this.vPitch = 0;
    this.vZoom = 0;
    this.minDist = 1;
    this.maxDist = 1e4;
    this.follow = null;
    this.flight = null;
    this.input = false;
    this.autoSpin = false;
    this.idle = 0;
    this.dragging = false;
    this.onClick = null;
    this._bind(dom, extra);
  }

  get flying() {
    return this.flight !== null;
  }

  set({ yaw, pitch, dist }) {
    this.yaw = yaw;
    this.pitch = pitch;
    this.dist = dist;
  }

  // pose: { target: () => Vector3, yaw: число | () => число, pitch, dist, min, max, duration? }
  // Пролёт: цель идёт по плавной кривой Безье, изогнутой к случайной точке в стороне,
  // с лёгкой спиральной закруткой, плавным креном и уводом по рысканию. Без тряски и изломов.
  flyTo(pose) {
    const from = { target: this.target.clone(), yaw: this.yaw, pitch: this.pitch, dist: this.dist };
    const end = pose.target();
    const gap = from.target.distanceTo(end);
    const bump = Math.log(1 + gap / Math.max(from.dist, pose.dist)) * 0.8;
    const duration = pose.duration ?? clamp(
      1.5 + Math.sqrt(gap) * 0.12 + Math.abs(Math.log(pose.dist / from.dist)) * 0.18, 1.6, 4,
    );
    const rnd = (a, b) => a + Math.random() * (b - a);
    const sgn = () => (Math.random() < 0.5 ? -1 : 1);
    const dir = end.clone().sub(from.target);
    const side = new THREE.Vector3(-dir.z, 0, dir.x);
    if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
    side.normalize();
    // контрольная точка Безье: кривая проходит примерно на полпути к ней
    const wp = from.target.clone().lerp(end, rnd(0.35, 0.65))
      .addScaledVector(side, gap * rnd(0.3, 0.5) * sgn())
      .add(new THREE.Vector3(0, gap * rnd(0.08, 0.25), 0));
    this.flight = {
      from, pose, bump, t: 0, duration, wp,
      side, twist: gap * rnd(0.05, 0.09), twistDir: sgn(),
      yawKick: rnd(0.25, 0.6) * sgn(),
      roll: rnd(0.12, 0.3) * sgn(),
      seed: Math.random() * 100,
    };
    this.vYaw = this.vPitch = this.vZoom = 0;
  }

  update(dt) {
    const f = this.flight;
    this.roll = 0;
    if (f) {
      f.t = Math.min(1, f.t + dt / f.duration);
      const t = f.t;
      const e = ease(t);
      const arc = Math.sin(Math.PI * t);
      // плавная кривая Безье через точку в стороне: никаких изломов и рывков, скорость непрерывна
      const b = f.pose.target();
      const k0 = (1 - e) * (1 - e);
      const k1 = 2 * (1 - e) * e;
      const k2 = e * e;
      this.target.set(
        f.from.target.x * k0 + f.wp.x * k1 + b.x * k2,
        f.from.target.y * k0 + f.wp.y * k1 + b.y * k2,
        f.from.target.z * k0 + f.wp.z * k1 + b.z * k2,
      );
      // лёгкая закрутка: цель описывает виток вокруг линии полёта, крен идёт следом
      const spin = f.twistDir * t * Math.PI * 1.6 + f.seed;
      this.target.addScaledVector(f.side, Math.cos(spin) * f.twist * arc);
      this.target.y += Math.sin(spin) * f.twist * arc;
      this.yaw = f.from.yaw + wrapAngle(val(f.pose.yaw) - f.from.yaw) * e + f.yawKick * arc * arc;
      this.pitch = f.from.pitch + (f.pose.pitch - f.from.pitch) * e;
      const l0 = Math.log(f.from.dist);
      const l1 = Math.log(f.pose.dist);
      this.dist = Math.exp(l0 + (l1 - l0) * e + f.bump * arc);
      this.roll = f.roll * arc + 0.1 * Math.sin(spin) * arc;
      if (f.t >= 1) {
        this.roll = 0;
        this.flight = null;
        this.follow = f.pose.target;
        this.minDist = f.pose.min;
        this.maxDist = f.pose.max;
        this.idle = 0;
      }
    } else {
      if (this.follow) this.target.copy(this.follow());
      this.idle += dt;
      if (this.autoSpin) this.yaw += dt * 0.02 * THREE.MathUtils.smoothstep(this.idle, 6, 10);
      this.yaw += this.vYaw * dt;
      this.pitch = clamp(this.pitch + this.vPitch * dt, PITCH_MIN, PITCH_MAX);
      this.dist *= Math.exp(this.vZoom * dt);
      const k = Math.exp(-dt * 3);
      this.vYaw *= k;
      this.vPitch *= k;
      this.vZoom *= Math.exp(-dt * 4.5);
      // упругие границы: можно чуть перелететь, потом пружиной возвращает
      if (this.dist < this.minDist) {
        this.dist += (this.minDist - this.dist) * (1 - Math.exp(-dt * 10));
        this.dist = Math.max(this.dist, this.minDist * 0.85);
      }
      if (this.dist > this.maxDist) this.dist += (this.maxDist - this.dist) * (1 - Math.exp(-dt * 6));
    }
    const cp = Math.cos(this.pitch);
    this.camera.position.set(
      this.target.x + this.dist * cp * Math.sin(this.yaw),
      this.target.y + this.dist * Math.sin(this.pitch),
      this.target.z + this.dist * cp * Math.cos(this.yaw),
    );
    this.camera.lookAt(this.target);
    if (this.roll) this.camera.rotateZ(this.roll);
  }

  // Мышь и тач через pointer events: один указатель — вращение, два пальца — щипок (зум).
  // Клик/тап — короткое касание почти без сдвига и без второго пальца.
  // Жест может начаться на подписи планеты: указатель всё равно захватывается канвасом,
  // а тап по подписи сообщает id планеты (data-id).
  _bind(dom, extra) {
    const ptrs = new Map();
    let gesture = null; // { t, moved, multi, label } — от первого касания до отпускания последнего
    let lastSpan = 0;
    let lastPinchT = 0;
    const span = () => {
      const [a, b] = [...ptrs.values()];
      return Math.hypot(a.x - b.x, a.y - b.y);
    };

    const down = (e) => {
      if (!this.input || (e.pointerType === 'mouse' && e.button !== 0) || ptrs.size >= 2) return;
      try {
        dom.setPointerCapture(e.pointerId);
      } catch {
        return; // указатель уже неактивен — жеста не будет
      }
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 1) {
        const label = e.target.closest?.('[data-id]')?.dataset.id ?? null;
        gesture = { t: performance.now(), moved: 0, multi: false, label };
      }
      if (ptrs.size === 2) {
        gesture.multi = true;
        lastSpan = span();
        lastPinchT = performance.now();
      }
      this.dragging = true;
      this.idle = 0;
    };
    for (const el of [dom, ...extra]) {
      el.addEventListener('pointerdown', down);
      // «Призрачный клик»: после тапа браузер шлёт click в ту же точку, а там уже открылась шторка —
      // клик попал бы в её кнопки. Канвасу и подписям синтетический click не нужен — гасим.
      el.addEventListener('touchend', (e) => {
        if (e.cancelable) e.preventDefault();
      }, { passive: false });
    }

    dom.addEventListener('pointermove', (e) => {
      const p = ptrs.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      p.x = e.clientX;
      p.y = e.clientY;
      if (gesture) gesture.moved += Math.abs(dx) + Math.abs(dy);
      this.idle = 0;
      if (this.flight) return;
      if (ptrs.size === 2) {
        const s = span();
        const now = performance.now();
        if (lastSpan > 0 && s > 0) {
          const k = Math.log(lastSpan / s);
          this.dist *= Math.exp(k);
          // немного инерции после щипка
          this.vZoom = clamp(k / Math.max((now - lastPinchT) / 1000, 0.008), -4, 4) * 0.25;
        }
        lastSpan = s;
        lastPinchT = now;
        return;
      }
      // часть движения — сразу, часть — импульсом, который потом гасится: так ощущается масса
      this.yaw -= dx * 0.004;
      this.pitch = clamp(this.pitch + dy * 0.004, PITCH_MIN, PITCH_MAX);
      this.vYaw -= dx * 0.008;
      this.vPitch += dy * 0.008;
    });

    const end = (e) => {
      if (!ptrs.has(e.pointerId)) return;
      ptrs.delete(e.pointerId);
      if (ptrs.size > 0) return;
      this.dragging = false;
      const g = gesture;
      gesture = null;
      const slop = e.pointerType === 'mouse' ? 6 : 12; // палец дрожит сильнее мыши
      if (g && e.type === 'pointerup' && !g.multi && g.moved < slop && performance.now() - g.t < 500) {
        this.vYaw = 0;
        this.vPitch = 0;
        this.onClick?.(e.clientX, e.clientY, g.label, e.pointerType);
      }
    };
    dom.addEventListener('pointerup', end);
    dom.addEventListener('pointercancel', end);

    const wheel = (e) => {
      if (!this.input) return;
      e.preventDefault();
      const dy = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY;
      if (!this.flight) this.vZoom += Math.sign(dy) * Math.min(Math.abs(dy) / 100, 2.5) * 1.3;
      this.idle = 0;
    };
    for (const el of [dom, ...extra]) el.addEventListener('wheel', wheel, { passive: false });
  }
}
