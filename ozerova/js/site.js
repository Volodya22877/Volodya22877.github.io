// Лендинг «Нина Озерова»: тема, меню, появление блоков, ближайшее окно, дыхательная пауза, мини-тест, форма заявки.
// Для тестов: window.__NOW__ (подмена времени), window.__API__ (адрес API), window.__BREATH_SPEED__ (ускорение дыхания).
import { KIND, nearestSlot, fmtDayRel, fmtTime } from './model.js';
import { CONFIG, tgLink } from './config.js';

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const now = () => window.__NOW__ ?? Date.now();
const API = (window.__API__ ?? CONFIG.api).replace(/\/+$/, '');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const deviceTz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Moscow'; } catch { return 'Europe/Moscow'; } })();
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* приватный режим — не запоминаем */ } },
};

// ---------- ссылки в бота ----------
for (const a of $$('[data-start]')) a.href = tgLink(a.dataset.start);

// ---------- тема ----------
const themeBtn = $('#theme');
const darkQuery = matchMedia('(prefers-color-scheme: dark)');
const currentTheme = () => document.documentElement.dataset.theme || (darkQuery.matches ? 'dark' : 'light');
// цвет панели браузера — константами (getComputedStyle при старте заставлял пересчитывать стили до первой отрисовки)
const BG = { light: '#f6f1e9', dark: '#111a16' };
function syncTheme() {
  const theme = currentTheme();
  themeBtn.setAttribute('aria-pressed', String(theme === 'dark'));
  themeBtn.setAttribute('aria-label', theme === 'dark' ? 'Светлая тема' : 'Тёмная тема');
  for (const m of $$('meta[name="theme-color"]')) m.content = BG[theme];
}
themeBtn.addEventListener('click', () => {
  const next = currentTheme() === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  store.set('theme', next);
  syncTheme();
});
darkQuery.addEventListener('change', syncTheme);
syncTheme();

// ---------- шапка, меню, активный раздел ----------
const top = $('#top');
const nav = $('#nav');
const burger = $('#burger');
let ticking = false;
function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    top.classList.toggle('scrolled', scrollY > 8);
    ticking = false;
  });
}
addEventListener('scroll', onScroll, { passive: true });
onScroll();

function setMenu(open) {
  burger.setAttribute('aria-expanded', String(open));
  burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  if (open) nav.style.setProperty('--nav-top', `${Math.round(top.getBoundingClientRect().bottom)}px`);
  nav.classList.toggle('open', open);
  top.classList.toggle('menu-open', open);
  document.documentElement.classList.toggle('menu-lock', open);
}
burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && nav.classList.contains('open')) { setMenu(false); burger.focus(); }
});
matchMedia('(min-width: 1024px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

const sections = $$('main section[id]');
const links = new Map($$('#nav a').map((a) => [a.getAttribute('href').slice(1), a]));
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      for (const a of links.values()) a.classList.remove('on');
      links.get(e.target.id)?.classList.add('on');
    }
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach((s) => io.observe(s));
}

// ---------- появление при прокрутке ----------
const reveals = $$('.reveal');
if (!('IntersectionObserver' in window) || reduceMotion.matches) {
  reveals.forEach((el) => el.classList.add('in'));
} else {
  // лёгкая лесенка для соседних элементов
  for (const el of reveals) {
    const sibs = [...el.parentElement.children].filter((c) => c.classList.contains('reveal'));
    const i = sibs.indexOf(el);
    if (i > 0) el.style.setProperty('--d', `${Math.min(i, 5) * 70}ms`);
  }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  reveals.forEach((el) => io.observe(el));
}

// ---------- ближайшее окно ----------
const nearestText = $('#nearestText');
function showNearest(ms) {
  if (!ms) { nearestText.textContent = 'смотрите в боте'; return; }
  nearestText.textContent = `${fmtDayRel(ms, now(), deviceTz)}, ${fmtTime(ms, deviceTz)}`;
  nearestText.title = deviceTz === 'Europe/Moscow' ? 'по Москве' : 'по вашему времени';
}
const fromModel = () => nearestSlot('online', { now: now(), demo: true });
showNearest(fromModel());
const nearestSource = { from: 'model' };
if (API) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 3000);
  fetch(`${API}/api/slots?kind=online`, { signal: ctl.signal })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status))))
    .then((j) => { if (Number.isFinite(j.nearest)) { showNearest(j.nearest); nearestSource.from = 'api'; } })
    .catch(() => { nearestSource.from = 'model-fallback'; })
    .finally(() => clearTimeout(timer));
}

// ---------- дыхательная пауза: вдох 4 · пауза 2 · выдох 6, 5 кругов = 60 с ----------
const PHASES = [['Вдох', 4, 1], ['Пауза', 2, 1], ['Выдох', 6, 0.66]];
const CYCLES = 5;
const TOTAL = CYCLES * PHASES.reduce((s, p) => s + p[1], 0);
const breath = { running: false, done: false, phase: '', cycle: 0, elapsed: 0 };
const bBtn = $('#breathBtn'), bCircle = $('#breathCircle'), bPhase = $('#breathPhase'), bCount = $('#breathCount');
const bStatus = $('#breathStatus'), bProg = $('#breathProgress');
const RING = 2 * Math.PI * 94;
let bRaf = 0, bStart = 0;
function breathFrame(t) {
  const speed = window.__BREATH_SPEED__ || 1;
  const sec = ((t - bStart) / 1000) * speed;
  breath.elapsed = Math.min(sec, TOTAL);
  bProg.style.strokeDashoffset = String(RING * (1 - breath.elapsed / TOTAL));
  if (sec >= TOTAL) return finishBreath();
  const inCycle = sec % (TOTAL / CYCLES);
  breath.cycle = Math.floor(sec / (TOTAL / CYCLES)) + 1;
  let acc = 0;
  for (const [name, dur, scale] of PHASES) {
    if (inCycle < acc + dur) {
      if (breath.phase !== name) {
        breath.phase = name;
        bPhase.textContent = name;
        bCircle.style.transitionDuration = `${dur / speed}s`;
        bCircle.style.transform = `scale(${scale})`;
      }
      bCount.textContent = `${Math.ceil(acc + dur - inCycle)} · круг ${breath.cycle} из ${CYCLES}`;
      break;
    }
    acc += dur;
  }
  bRaf = requestAnimationFrame(breathFrame);
}
function startBreath() {
  Object.assign(breath, { running: true, done: false, phase: '', cycle: 1, elapsed: 0 });
  bBtn.textContent = 'Остановить';
  bStatus.textContent = 'Дышите вслед за кругом. Можно закрыть глаза.';
  bStart = performance.now();
  bRaf = requestAnimationFrame(breathFrame);
}
function stopBreath(text = 'Пауза остановлена. Вернуться можно в любой момент.') {
  cancelAnimationFrame(bRaf);
  breath.running = false;
  breath.phase = '';
  bBtn.textContent = 'Начать';
  bPhase.textContent = 'Готовы?';
  bCount.textContent = '';
  bCircle.style.transitionDuration = '.8s';
  bCircle.style.transform = '';
  bProg.style.strokeDashoffset = String(RING);
  bStatus.textContent = text;
}
function finishBreath() {
  cancelAnimationFrame(bRaf);
  Object.assign(breath, { running: false, done: true, phase: '', elapsed: TOTAL });
  bPhase.textContent = 'Готово';
  bCount.textContent = '';
  bCircle.style.transitionDuration = '1.2s';
  bCircle.style.transform = 'scale(.8)';
  bBtn.textContent = 'Ещё раз';
  bStatus.textContent = 'Заметили разницу? Так в КПТ учатся управлять телом, а не только мыслями.';
}
bBtn.addEventListener('click', () => (breath.running ? stopBreath() : startBreath()));
document.addEventListener('visibilitychange', () => { if (document.hidden && breath.running) stopBreath(); });

// ---------- мини-тест «С чего начать?» ----------
const QUIZ = [
  { q: 'Что беспокоит сильнее всего?', key: 'topic', opts: [['anxiety', 'Тревога, паника'], ['burnout', 'Нет сил, выгорание'], ['relations', 'Отношения с собой или другими'], ['unsure', 'Сложно сформулировать']] },
  { q: 'Как давно это длится?', key: 'since', opts: [['weeks', 'Пару недель'], ['months', 'Несколько месяцев'], ['years', 'Больше года']] },
  { q: 'Как вам удобнее встречаться?', key: 'where', opts: [['online', 'Онлайн'], ['offline', 'Очно в Москве'], ['unsure', 'Пока не знаю']] },
];
const quiz = { step: 0, answers: {}, result: null };
const qBody = $('#quizBody'), qBar = $('#quizBar');
const TOPIC = {
  anxiety: 'С тревогой и паникой КПТ работает особенно хорошо: начнём с того, как устроены ваши приступы.',
  burnout: 'Начнём с восстановления сил и границ — без этого любые техники работают хуже.',
  relations: 'Разберём повторяющиеся сценарии и то, что их запускает.',
  unsure: 'Сформулировать запрос — уже половина работы. Сделаем это вместе.',
};
const SINCE = {
  weeks: 'Если состояние держится недолго, иногда хватает 3–5 встреч.',
  months: 'На такой запрос обычно уходит 8–12 встреч.',
  years: 'Давние трудности требуют времени — чаще 12–20 встреч. Это нормально.',
};
export function quizResult(a) {
  const kind = a.topic === 'unsure' || a.where === 'unsure' ? 'intro' : a.where === 'offline' ? 'offline' : 'online';
  const title = kind === 'intro' ? 'Начните со знакомства' : kind === 'offline' ? 'Очная встреча' : 'Онлайн-встреча';
  const lead = kind === 'intro' ? '20 бесплатных минут: вместе сформулируем запрос и поймём, чем я могу помочь.'
    : `${KIND[kind].dur} минут, ${KIND[kind].price.toLocaleString('ru-RU')} ₽. ${TOPIC[a.topic]}`;
  return { kind, title, lead, note: SINCE[a.since] };
}
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function renderQuiz(focus = false) {
  qBar.style.width = `${(Math.min(quiz.step, QUIZ.length) / QUIZ.length) * 100}%`;
  if (quiz.step < QUIZ.length) {
    const s = QUIZ[quiz.step];
    qBody.innerHTML = `<p class="quiz-step-label">Вопрос ${quiz.step + 1} из ${QUIZ.length}</p>
      <p class="quiz-q" id="quizQ" tabindex="-1">${esc(s.q)}</p>
      <div class="quiz-opts" role="group" aria-labelledby="quizQ">${s.opts.map(([v, label]) =>
        `<button class="quiz-opt" type="button" data-v="${v}">${esc(label)}<svg class="ic" aria-hidden="true"><use href="#i-arrow"/></svg></button>`).join('')}</div>`;
  } else {
    const r = (quiz.result = quizResult(quiz.answers));
    qBody.innerHTML = `<div class="quiz-result">
      <span class="tag">Подсказка</span>
      <h4 id="quizQ" tabindex="-1">${esc(r.title)}</h4>
      <p>${esc(r.lead)}</p>
      <p>${esc(r.note)}</p>
      <div class="quiz-actions">
        <a class="btn btn-primary" data-start="${r.kind}" href="${tgLink(r.kind)}"><svg class="ic" aria-hidden="true"><use href="#i-tg"/></svg>Записаться</a>
        <button class="quiz-again" type="button" id="quizAgain">Пройти заново</button>
      </div>
      <p class="quiz-help">Если очень плохо прямо сейчас — <a href="#help">телефоны экстренной помощи</a>.</p>
    </div>`;
  }
  if (focus) $('#quizQ', qBody)?.focus({ preventScroll: true });
}
qBody.addEventListener('click', (e) => {
  const opt = e.target.closest('.quiz-opt');
  if (opt) {
    quiz.answers[QUIZ[quiz.step].key] = opt.dataset.v;
    quiz.step++;
    renderQuiz(true);
  } else if (e.target.closest('#quizAgain')) {
    Object.assign(quiz, { step: 0, answers: {}, result: null });
    renderQuiz(true);
  }
});
renderQuiz();

// ---------- форма заявки (запасной вход без Telegram) ----------
const form = $('#leadForm');
const status = $('#formStatus');
const F = { name: $('#fName'), contact: $('#fContact'), kind: $('#fKind'), when: $('#fWhen'), consent: $('#fConsent'), hp: $('#fSite') };
export function contactType(v) {
  const s = v.trim();
  if (/^@[a-zA-Z][a-zA-Z0-9_]{3,31}$/.test(s)) return 'telegram';
  if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)) return 'email';
  const digits = s.replace(/\D/g, '');
  if (/^[+\d\s()-]+$/.test(s) && digits.length >= 10 && digits.length <= 15) return 'phone';
  return null;
}
function setErr(input, errEl, msg) {
  input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  $(errEl).textContent = msg || '';
}
function validate() {
  const errs = [];
  const name = F.name.value.trim();
  const nameErr = name.length < 2 ? 'Напишите, как к вам обращаться — можно псевдоним.' : '';
  setErr(F.name, '#fNameErr', nameErr);
  if (nameErr) errs.push(F.name);
  const cErr = !F.contact.value.trim() ? 'Оставьте телефон, @ник в Telegram или почту.'
    : !contactType(F.contact.value) ? 'Не похоже на телефон, @ник или почту — проверьте, пожалуйста.' : '';
  setErr(F.contact, '#fContactErr', cErr);
  if (cErr) errs.push(F.contact);
  const kErr = F.consent.checked ? '' : 'Без согласия я не смогу обработать заявку.';
  setErr(F.consent, '#fConsentErr', kErr);
  if (kErr) errs.push(F.consent);
  return errs;
}
function say(kind, text) {
  status.className = `form-status ${kind}`;
  status.textContent = text;
}
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const errs = validate();
  if (errs.length) { errs[0].focus(); say('', ''); return; }
  const body = { name: F.name.value.trim(), contact: F.contact.value.trim(), kind: F.kind.value, when: F.when.value.trim(), consent: true, hp: F.hp.value };
  if (body.hp) { say('ok', 'Заявка отправлена. Я свяжусь с вами в течение дня.'); return; } // ловушка для ботов: делаем вид, что всё хорошо
  if (!API) {
    say('demo', 'Это демо-проект: заявка никуда не ушла. В рабочей версии она сразу приходит психологу в Telegram.');
    return;
  }
  form.classList.add('sending');
  F.submit = F.submit || $('#fSubmit');
  F.submit.textContent = 'Отправляю…';
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 8000);
  try {
    const r = await fetch(`${API}/api/lead`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctl.signal });
    const j = await r.json().catch(() => ({}));
    if (r.ok && j.ok && j.demo) {
      say('demo', 'Демо: заявка дошла до бота и сохранена, но психолог вымышленный — вам никто не позвонит. В рабочей версии она сразу приходит психологу в Telegram.');
      form.reset();
    } else if (r.ok && j.ok) {
      say('ok', 'Заявка отправлена. Я свяжусь с вами в течение дня.');
      form.reset();
    } else if (r.status === 429) {
      say('bad', 'Слишком много заявок подряд. Попробуйте через час или запишитесь через Telegram.');
    } else {
      say('bad', 'Не получилось отправить. Попробуйте ещё раз или запишитесь через Telegram.');
    }
  } catch (err) {
    say('bad', err.name === 'AbortError'
      ? 'Сервер не ответил за 8 секунд. Попробуйте ещё раз или запишитесь через Telegram.'
      : 'Не получилось отправить. Проверьте интернет или запишитесь через Telegram.');
  } finally {
    clearTimeout(timer);
    form.classList.remove('sending');
    F.submit.textContent = 'Отправить заявку';
  }
});
for (const [input, err] of [[F.name, '#fNameErr'], [F.contact, '#fContactErr']]) {
  input.addEventListener('input', () => { if (input.getAttribute('aria-invalid') === 'true') setErr(input, err, ''); });
}
F.consent.addEventListener('change', () => { if (F.consent.checked) setErr(F.consent, '#fConsentErr', ''); });

// ---------- липкая кнопка записи на телефоне ----------
const sticky = $('#stickyCta');
if ('IntersectionObserver' in window) {
  const seen = { hero: true, book: false, foot: false };
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) seen[e.target.dataset.watch] = e.isIntersecting;
    sticky.classList.toggle('show', !seen.hero && !seen.book && !seen.foot);
  });
  for (const [sel, key] of [['.hero', 'hero'], ['#book', 'book'], ['.foot', 'foot']]) {
    const el = $(sel);
    el.dataset.watch = key;
    io.observe(el);
  }
}

// для проверок
window.__site = { quiz, breath, nearestSource, quizResult, contactType, TOTAL };
