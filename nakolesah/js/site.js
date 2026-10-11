// Лендинг «На колёсах»: услуги из общего списка, ссылки в бота, статус по Москве, калькулятор, колесо, анимации.
import { CATS, ICONS, startLink, priceLabel, rub } from './services.js';

document.documentElement.classList.add('js');
const $ = (s, el = document) => el.querySelector(s);
const OPEN = 9;
const CLOSE = 21;

// Время по Москве (UTC+3) независимо от часового пояса посетителя; для тестов можно подменить window.__NOW__
function mskNow() {
  const d = new Date((window.__NOW__ ?? Date.now()) + 3 * 3600e3);
  return { h: d.getUTCHours(), m: d.getUTCMonth() + 1 };
}

// ---- услуги ----
function renderServices() {
  const grid = $('#svcGrid');
  grid.innerHTML = CATS.map((c) => {
    const icon = `<span class="card-icon"><svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[c.icon]}</svg></span>`;
    if (c.id === 'other') {
      return `<article class="card card-other reveal">
        <div>${icon}<h3>Не нашли свою услугу?</h3><p class="card-note">Стучит, горит лампа, не заводится — опишите своими словами, мастер подскажет и запишет.</p></div>
        <a class="btn btn-ghost" data-start="svc_other" href="#">Описать проблему</a>
      </article>`;
    }
    const rows = c.items.map((s) => `<li><a class="svc" data-start="svc_${s.id}" href="#" title="Записаться: ${s.name}">
      <span>${s.name.replace(/R\d+–R\d+/, '<span class="nw">$&</span>')}</span><b>${priceLabel(s)}</b><i aria-hidden="true">→</i></a></li>`).join('');
    return `<article class="card reveal">${icon}<h3>${c.name}</h3><p class="card-note">${c.note}</p><ul class="svc-list">${rows}</ul></article>`;
  }).join('');
}

// ---- ссылки в бота: data-start="svc_tr16" → https://t.me/<бот>?start=svc_tr16 ----
function wireLinks(root = document) {
  for (const a of root.querySelectorAll('[data-start]')) {
    a.href = startLink(a.dataset.start);
    a.target = '_blank';
    a.rel = 'noopener';
  }
}

// ---- статус «открыто / закрыто» и сезонная лента ----
function updateStatus() {
  const { h, m } = mskNow();
  const open = h >= OPEN && h < CLOSE;
  for (const el of document.querySelectorAll('#status, [data-status]')) {
    el.classList.toggle('closed', !open);
    $('b', el).textContent = open ? 'Открыто' : 'Закрыто';
    $('span', el).textContent = open ? `· до ${CLOSE}:00` : `· откроемся ${h >= CLOSE ? 'завтра ' : ''}в ${OPEN}:00`;
  }
  const ribbon = $('#season');
  const autumn = m === 10 || m === 11;
  const spring = m === 3 || m === 4;
  ribbon.hidden = !(autumn || spring);
  $('.ribbon-text', ribbon).textContent = autumn
    ? '🍂 Сезон переобувки на зиму: окна на выходные разбирают первыми — запишитесь заранее'
    : '🌱 Сезон переобувки на лето: окна на выходные разбирают первыми — запишитесь заранее';
}

// ---- калькулятор переобувки ----
const PRICE = { small: CATS[1].items[0].price, big: CATS[1].items[1].price };
const EXTRA = { bal: 1200, hole: 600, store: 3000 };
const EXTRA_NAME = { bal: 'балансировка', hole: 'прокол', store: 'хранение' };
let radius = 16;
function renderCalc() {
  const seg = $('#radius');
  seg.innerHTML = [13, 14, 15, 16, 17, 18, 19, 20].map((r) => `<button type="button" role="radio" aria-checked="${r === radius}" data-r="${r}">R${r}</button>`).join('');
  seg.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    radius = Number(b.dataset.r);
    for (const x of seg.children) x.setAttribute('aria-checked', String(x === b));
    calc();
  });
  $('#calcForm').addEventListener('change', calc);
  calc();
}
function calc() {
  const form = $('#calcForm');
  const big = radius >= 17;
  let sum = big ? PRICE.big : PRICE.small;
  const parts = [`переобувка R${radius} — ${rub(sum)}`];
  for (const k of Object.keys(EXTRA)) {
    if (form.elements[k].checked) {
      sum += EXTRA[k];
      parts.push(`${EXTRA_NAME[k]} — ${rub(EXTRA[k])}`);
    }
  }
  $('#calcSum').textContent = `≈ ${rub(sum)}`;
  $('#calcDetail').textContent = parts.join(' · ');
  const btn = $('#calcBtn');
  btn.dataset.start = big ? 'svc_tr20' : 'svc_tr16';
  btn.href = startLink(btn.dataset.start);
  btn.textContent = `Записаться на переобувку R${radius}`;
}

// ---- колесо: протектор, перфорация диска, спицы, болты ----
function buildWheel() {
  const ns = 'http://www.w3.org/2000/svg';
  const add = (parent, tag, attrs) => {
    const el = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    $(parent).appendChild(el);
  };
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * 360;
    add('#tread', 'rect', { x: 196, y: 6, width: 9, height: 22, rx: 2, fill: i % 2 ? '#24282e' : '#1d2025', transform: `rotate(${a} 200 200)` });
  }
  for (let i = 0; i < 30; i++) {
    const a = (i / 30) * Math.PI * 2;
    const r = i % 2 ? 72 : 88;
    add('#holes', 'circle', { cx: 200 + Math.cos(a) * r, cy: 200 + Math.sin(a) * r, r: 3.4 });
  }
  for (let i = 0; i < 5; i++) {
    add('#spokes', 'path', { d: 'M192 172 L186 76 Q200 68 214 76 L208 172 Z', transform: `rotate(${i * 72} 200 200)` });
  }
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + Math.PI / 5;
    add('#bolts', 'circle', { cx: 200 + Math.cos(a) * 17, cy: 200 + Math.sin(a) * 17, r: 3.6 });
  }
}

// ---- меню на телефоне ----
function wireMenu() {
  const burger = $('#burger');
  const nav = $('#nav');
  burger.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    burger.setAttribute('aria-expanded', String(open));
  });
  nav.addEventListener('click', (e) => {
    if (e.target.closest('a')) {
      nav.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
    }
  });
}

// ---- появление блоков при прокрутке ----
function wireReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) return els.forEach((el) => el.classList.add('in'));
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('in');
      io.unobserve(e.target);
    }
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  els.forEach((el, i) => {
    el.style.transitionDelay = `${(i % 3) * 80}ms`;
    io.observe(el);
  });
}

renderServices();
renderCalc();
buildWheel();
wireLinks();
updateStatus();
setInterval(updateStatus, 60e3);
wireMenu();
wireReveal();
$('#year').textContent = new Date().getFullYear();
