// DOM-интерфейс: интро, меню объектов, подписи над планетами, инфо-панель со счётчиками, язык, время.
import { BODIES, ORDER, DECOR, ARTIFACTS } from './planets.js';
import { UI, formatValue } from './i18n.js';

const $ = (id) => document.getElementById(id);
const BY_ID = new Map(BODIES.map((b) => [b.id, b]));
const LANG_KEY = 'cosmos-lang';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
// Тач-подсказки: телефон/планшет. Ноутбук с сенсорным экраном, но с мышью (hover есть) — остаётся «десктопным».
const TOUCH = matchMedia('(pointer: coarse)').matches
  || (navigator.maxTouchPoints > 0 && !matchMedia('(hover: hover)').matches);
// Портретный телефон: панель — шторка снизу (совпадает с медиазапросом в CSS).
const SHEET = matchMedia('(max-width: 759px)');

function loadLang() {
  try {
    return localStorage.getItem(LANG_KEY) === 'en' ? 'en' : 'ru';
  } catch {
    return 'ru';
  }
}

function saveLang(v) {
  try {
    localStorage.setItem(LANG_KEY, v);
  } catch {
    // приватный режим или запрет хранилища — язык просто не запомнится
  }
}

export function createUI(on) {
  let lang = loadLang();
  let current = null;
  let launchReady = false;
  let counterRun = 0;
  let hovered = null;
  const panel = $('panel');
  const nav = $('nav');
  const labelsBox = $('labels');
  const navItems = new Map();
  const labels = new Map();

  for (const b of BODIES) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'nav-item' + (b.parent ? ' sub' : '');
    item.style.setProperty('--c', b.accent);
    item.append(document.createElement('i'), document.createElement('span'));
    item.addEventListener('click', () => on.select(b.id));
    nav.append(item);
    navItems.set(b.id, item);

    // Нажатия по подписям обрабатывает камера (жест может начаться на подписи и стать вращением),
    // а тап по подписи она превращает в выбор планеты по data-id.
    const label = document.createElement('button');
    label.type = 'button';
    label.className = 'label hidden';
    label.tabIndex = -1;
    label.dataset.id = b.id;
    labelsBox.append(label);
    labels.set(b.id, label);
  }
  // Подписи лун, аппаратов и объектов дальнего космоса — только надпись, без нажатия.
  const extras = [...DECOR, ...ARTIFACTS];
  for (const x of extras) {
    const label = document.createElement('span');
    label.className = 'label extra hidden';
    labelsBox.append(label);
    labels.set(x.id, label);
  }

  $('toMap').addEventListener('click', () => on.map());
  $('prev').addEventListener('click', () => on.step(-1));
  $('next').addEventListener('click', () => on.step(1));
  $('launch').addEventListener('click', () => on.launch());
  $('logo').addEventListener('click', (e) => {
    e.preventDefault();
    on.map();
  });
  $('lang').addEventListener('click', () => {
    lang = lang === 'ru' ? 'en' : 'ru';
    saveLang(lang);
    applyLang();
  });
  const speedBtns = [...document.querySelectorAll('[data-speed]')];
  for (const btn of speedBtns) {
    btn.addEventListener('click', () => {
      for (const b of speedBtns) b.classList.toggle('on', b === btn);
      on.speed(Number(btn.dataset.speed));
    });
  }
  // Шторка на телефоне: тап — свернуть/развернуть, свайп вниз — свернуть, вверх — развернуть.
  const sheetBtn = $('sheetToggle');
  let swipeY = null;
  let swiped = false;
  sheetBtn.addEventListener('pointerdown', (e) => {
    swipeY = e.clientY;
    swiped = false;
  });
  sheetBtn.addEventListener('pointerup', (e) => {
    if (swipeY === null) return;
    const dy = e.clientY - swipeY;
    swipeY = null;
    if (Math.abs(dy) > 30) {
      swiped = true;
      setCollapsed(dy > 0);
    }
  });
  sheetBtn.addEventListener('click', () => {
    // после свайпа браузер может прислать ещё и click — его пропускаем
    if (swiped) {
      swiped = false;
      return;
    }
    setCollapsed(!panel.classList.contains('collapsed'));
  });

  function setCollapsed(on) {
    panel.classList.toggle('collapsed', on);
    sheetBtn.setAttribute('aria-expanded', String(!on));
    sheetBtn.setAttribute('aria-label', UI[lang][on ? 'sheetExpand' : 'sheetCollapse']);
  }

  function setHint() {
    const d = UI[lang];
    const focus = document.body.dataset.mode === 'focus';
    $('hint').textContent = TOUCH ? (focus ? d.hintFocusTouch : d.hintMapTouch) : (focus ? d.hintFocus : d.hintMap);
  }

  function applyLang() {
    const d = UI[lang];
    document.documentElement.lang = lang;
    document.title = d.docTitle;
    for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = d[el.dataset.i18n];
    for (const el of document.querySelectorAll('[data-i18n-aria]')) el.setAttribute('aria-label', d[el.dataset.i18nAria]);
    for (const el of document.querySelectorAll('[data-i18n-title]')) el.title = d[el.dataset.i18nTitle];
    $('lang').textContent = lang === 'ru' ? 'EN' : 'RU';
    for (const b of BODIES) {
      navItems.get(b.id).lastChild.textContent = b[lang].name;
      labels.get(b.id).textContent = b[lang].name;
    }
    for (const x of extras) labels.get(x.id).textContent = x[lang];
    sizes.clear();
    $('launchText').textContent = launchReady ? d.launch : d.loading;
    setCollapsed(panel.classList.contains('collapsed'));
    setHint();
    if (current) fill(current);
  }

  function fill(id) {
    const b = BY_ID.get(id);
    const tx = b[lang];
    const d = UI[lang];
    panel.style.setProperty('--accent', b.accent);
    $('pType').textContent = tx.type;

    const name = $('pName');
    name.setAttribute('aria-label', tx.name);
    name.replaceChildren(...[...tx.name].map((ch, i) => {
      const s = document.createElement('span');
      s.textContent = ch;
      s.style.setProperty('--i', i);
      s.setAttribute('aria-hidden', 'true');
      return s;
    }));

    $('pDesc').textContent = tx.desc;

    const stats = $('pStats');
    const counters = [];
    stats.replaceChildren(...b.stats.map((s, i) => {
      const row = document.createElement('div');
      row.className = 'stat reveal';
      row.style.setProperty('--d', `${300 + i * 60}ms`);
      const dt = document.createElement('dt');
      dt.textContent = d.stats[s.k];
      const dd = document.createElement('dd');
      dd.textContent = formatValue(s.v, s.u, lang, reducedMotion ? 1 : 0);
      row.append(dt, dd);
      counters.push([dd, s]);
      return row;
    }));

    $('pFact').textContent = tx.fact;
    const notes = [];
    if (b.stats.some((s) => s.k === 'moons')) notes.push(d.moonsNote);
    notes.push(d.scaleNote);
    $('pNote').textContent = notes.join(' · ');

    const i = ORDER.indexOf(id);
    const n = ORDER.length;
    for (const [btn, dir, key] of [[$('prev'), -1, 'prev'], [$('next'), 1, 'next']]) {
      const label = `${d[key]}: ${BY_ID.get(ORDER[(i + dir + n) % n])[lang].name}`;
      btn.setAttribute('aria-label', label);
      btn.title = label;
    }
    $('pCount').textContent = `${String(i + 1).padStart(2, '0')} / ${String(n).padStart(2, '0')}`;

    // перезапуск CSS-анимаций появления
    panel.classList.remove('anim');
    void panel.offsetWidth;
    panel.classList.add('anim');
    panel.scrollTop = 0;
    if (!reducedMotion) runCounters(counters);
  }

  function runCounters(list) {
    const run = ++counterRun;
    const t0 = performance.now();
    const tick = (now) => {
      if (run !== counterRun) return;
      const k = Math.min(1, (now - t0 - 300) / 1300);
      const e = k <= 0 ? 0 : 1 - Math.pow(2, -10 * k);
      for (const [dd, s] of list) dd.textContent = formatValue(s.v, s.u, lang, k >= 1 ? 1 : e);
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function setMode(mode, id) {
    document.body.dataset.mode = mode;
    for (const [bid, el] of navItems) el.classList.toggle('on', mode === 'focus' && bid === id);
    if (mode === 'focus') {
      current = id;
      fill(id);
      panel.classList.add('open');
      panel.setAttribute('aria-hidden', 'false');
    } else {
      current = null;
      counterRun++;
      panel.classList.remove('open');
      panel.setAttribute('aria-hidden', 'true');
    }
    setHint();
  }

  // items: [{ id, x, y, yBelow, show, dim }]. y — нижний край подписи над планетой, yBelow — верхний край под ней.
  // Если подпись налезает на уже поставленную — пробуем под планетой, иначе прячем.
  // Порядок: наведённая — первая, Солнце — последнее (его и так ни с чем не спутать).
  const sizes = new Map();
  // наведённая → планеты → Солнце → луны/аппараты/дальний космос
  const priority = (id) => {
    if (id === hovered) return -1;
    const i = ORDER.indexOf(id);
    if (i < 0) return ORDER.length + 1;
    return id === 'sun' ? ORDER.length : i;
  };
  function updateLabels(items) {
    const placed = [];
    const free = (box) => !placed.some((p) => box.l < p.r && p.l < box.r && box.t < p.b && p.t < box.b);
    for (const it of [...items].sort((a, b) => priority(a.id) - priority(b.id))) {
      const el = labels.get(it.id);
      let x = it.x;
      let bottom = it.y;
      let place = 'above';
      let show = it.show;
      if (show) {
        let s = sizes.get(it.id);
        if (!s) {
          s = { w: el.offsetWidth, h: el.offsetHeight };
          sizes.set(it.id, s);
        }
        const box = (cx, b) => ({ l: cx - s.w / 2, r: cx + s.w / 2, t: b - s.h, b });
        // места по очереди: над объектом, под ним, справа, слева
        const cy = (it.y + it.yBelow) / 2;
        const side = (it.yBelow - it.y) / 2 + s.w / 2 + 2;
        const spots = [
          ['above', it.x, it.y],
          ['below', it.x, it.yBelow + s.h],
          ['side', it.x + side, cy + s.h / 2],
          ['side', it.x - side, cy + s.h / 2],
        ];
        const spot = spots.find(([, cx, b]) => free(box(cx, b)));
        if (spot) {
          [place, x, bottom] = spot;
          placed.push(box(x, bottom));
        } else {
          show = false;
        }
      }
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${bottom.toFixed(1)}px, 0) translate(-50%, -100%)`;
      el.classList.toggle('hidden', !show);
      el.classList.toggle('below', place === 'below');
      el.classList.toggle('side', place === 'side');
      el.classList.toggle('dim', it.dim);
    }
  }

  function setHover(id) {
    if (id === hovered) return;
    if (hovered) labels.get(hovered).classList.remove('hover');
    hovered = id;
    if (id) labels.get(id).classList.add('hover');
  }

  // Половина места, которое съела панель: справа (ПК, ландшафт) или снизу (шторка на телефоне).
  // По этим числам сдвигается кадр, чтобы планета стояла по центру свободной части экрана.
  function panelInset() {
    // на лендинге камера целится в центр окна-полосы, а не в центр экрана
    if (document.body.dataset.mode === 'intro') {
      const c = portholeCenter();
      return { x: innerWidth / 2 - c.x, y: innerHeight / 2 - c.y };
    }
    if (!panel.classList.contains('open')) return { x: 0, y: 0 };
    if (SHEET.matches) return { x: 0, y: Math.max(innerHeight - panel.offsetTop, 0) / 2 };
    return { x: Math.max(innerWidth - panel.offsetLeft, 0) / 2, y: 0 };
  }

  // Обложка-лендинг: лист с окном-полосой во всю ширину. Окно = пустой блок .porthole в вёрстке,
  // при прокрутке оно едет вместе с текстом — вырез в листе следует за ним.
  const intro = $('intro');
  let opening = false;
  function portholeCenter() {
    const r = $('porthole').getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  function placePorthole() {
    if (opening) return;
    intro.style.setProperty('--hy', `${portholeCenter().y}px`);
  }
  addEventListener('resize', placePorthole);
  intro.addEventListener('scroll', placePorthole, { passive: true });

  // Блоки лендинга всплывают при прокрутке, числа «досчитываются» до своего значения.
  // Класс .rise ставит JS: без него (или без IntersectionObserver) всё сразу видно.
  if ('IntersectionObserver' in window) {
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const countUp = (el) => {
      const to = Number(el.dataset.to);
      const pre = el.dataset.prefix || '';
      if (calm || !to) return;
      const t0 = performance.now();
      const tick = (now) => {
        const k = Math.min((now - t0) / 1100, 1);
        el.textContent = pre + Math.round(to * (1 - Math.pow(1 - k, 3)));
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('seen');
        e.target.querySelectorAll('.num').forEach(countUp);
        io.unobserve(e.target);
      }
    }, { root: intro, threshold: 0.15 });
    for (const group of intro.querySelectorAll('.num-grid, .look-list, .how-cols, .offer .cards')) {
      [...group.children].forEach((el, i) => {
        el.classList.add('rise');
        el.style.transitionDelay = `${i * 70}ms`;
        io.observe(el);
      });
    }
  }

  applyLang();
  document.body.dataset.mode = 'intro';
  placePorthole();

  return {
    get lang() {
      return lang;
    },
    touch: TOUCH,
    setMode,
    updateLabels,
    setHover,
    panelInset,
    // окно-полоса лендинга хоть краем на экране (во время раскрытия — всегда да)
    portholeVisible() {
      if (opening) return true;
      const r = $('porthole').getBoundingClientRect();
      return r.bottom > 0 && r.top < innerHeight;
    },
    ready() {
      launchReady = true;
      $('launch').disabled = false;
      $('launchText').textContent = UI[lang].launch;
      placePorthole();
      intro.classList.add('lit'); // окно «открывает диафрагму» — в нём появляется край Земли
    },
    hideIntro() {
      // кнопка внизу страницы — окно к этому моменту уехало вверх, поэтому раскрываем щель из центра экрана
      opening = true;
      intro.style.setProperty('--hy', `${innerHeight / 2}px`);
      intro.classList.add('reset');
      void intro.offsetWidth;
      intro.classList.remove('reset');
      intro.classList.add('opening');
      setTimeout(() => intro.classList.add('gone'), 1700);
    },
    noWebGL() {
      const el = $('nogl');
      el.textContent = UI[lang].noWebgl;
      el.hidden = false;
    },
    contextLost() {
      const el = $('nogl');
      el.textContent = UI[lang].glLost;
      el.hidden = false;
    },
  };
}
