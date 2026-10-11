// Mini App записи «На колёсах». Открывается кнопкой клавиатуры бота → в конце Telegram.WebApp.sendData(JSON) → бот создаёт запись.
// Свободное время бот передаёт в ссылке (#v=1&t=дата&s1=…&s2=…&car=…&ph=…&at=…). Вне Telegram — превью с демо-расписанием.
import { CATS, priceLabel } from '../js/services.js';

const tg = window.Telegram?.WebApp;
const IN_TG = !!tg && !!tg.platform && tg.platform !== 'unknown';
const SVC = Object.fromEntries(CATS.flatMap((c) => c.items.map((s) => [s.id, { ...s, cat: c.id }])));
const BRANDS = ['Lada', 'Kia', 'Hyundai', 'Toyota', 'Volkswagen', 'Skoda', 'Renault', 'Haval', 'Chery', 'Geely', 'Nissan', 'Другая'];
const OPEN = 9;
const CLOSE = 21;
const POSTS = 3;
const H = 3600e3;
const TZ = 3;
const STEPS = ['Услуга', 'Автомобиль', 'День и время', 'Телефон', 'Проверьте запись'];

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const pad = (n) => String(n).padStart(2, '0');
const now = () => window.__NOW__ ?? Date.now();

// ---- время по Москве (как в боте) ----
function msk(ms) {
  const d = new Date(ms + TZ * H);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), h: d.getUTCHours(), dow: d.getUTCDay() };
}
const dateKey = (ms) => { const p = msk(ms); return `${p.y}-${pad(p.m)}-${pad(p.d)}`; };
function slotMs(date, h) {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d, h - TZ);
}
const addDays = (date, n) => dateKey(slotMs(date, 12) + n * 24 * H);
const DOW = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const dateLabel = (date) => { const p = msk(slotMs(date, 12)); return `${DOW[p.dow]}, ${p.d} ${MONTHS[p.m - 1]}`; };
function dayShort(date, today) {
  if (date === today) return 'Сегодня';
  if (date === addDays(today, 1)) return 'Завтра';
  const p = msk(slotMs(date, 12));
  return `${DOW[p.dow]} ${pad(p.d)}.${pad(p.m)}`;
}

// телефон: +7 999 123-45-67 или null (как в боте)
function normPhone(raw) {
  let d = String(raw || '').replace(/\D/g, '');
  if (d.length === 11 && (d[0] === '7' || d[0] === '8')) d = d.slice(1);
  if (d.length !== 10 || d[0] !== '9') return null;
  return `+7 ${d.slice(0, 3)} ${d.slice(3, 6)}-${d.slice(6, 8)}-${d.slice(8)}`;
}

// ---- свободное время ----
// Демо-расписание для превью — тот же детерминированный шум «записей по телефону», что и в боте.
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function phoneBusy(date, h) {
  const { dow } = msk(slotMs(date, 12));
  const p = 0.22 + (dow === 6 || dow === 0 ? 0.15 : 0) + (h >= 17 ? 0.1 : 0);
  let n = 0;
  for (let post = 0; post < POSTS; post++) if (hash(`${date}|${h}|${post}`) < p) n++;
  return n;
}
function demoHours(date, dur) {
  const res = [];
  for (let h = OPEN; h + dur <= CLOSE; h++) {
    if (slotMs(date, h) < now() + H) continue;
    let ok = true;
    for (let k = h; k < h + dur && ok; k++) ok = phoneBusy(date, k) < POSTS;
    if (ok) res.push(h);
  }
  return res;
}

const params = new URLSearchParams(location.hash.slice(1));
const fromBot = params.get('v') === '1' && /^\d{4}-\d\d-\d\d$/.test(params.get('t') || '') ? {
  today: params.get('t'),
  masks: { 1: decode(params.get('s1')), 2: decode(params.get('s2')) },
  at: Number(params.get('at')) || 0,
} : null;
// 7 дней × 12 часов: 3 hex-символа на день, бит i — свободно ли начало в OPEN + i
function decode(s) {
  return (s || '').match(/[0-9a-f]{3}/gi)?.map((x) => parseInt(x, 16)) || [];
}
function freeHours(date, dur) {
  if (!fromBot) return demoHours(date, dur);
  const i = Math.round((slotMs(date, 12) - slotMs(fromBot.today, 12)) / (24 * H));
  const mask = fromBot.masks[dur > 1 ? 2 : 1][i] || 0;
  const res = [];
  for (let k = 0; k < CLOSE - OPEN; k++) if (mask & (1 << k)) res.push(OPEN + k);
  return res;
}
const today = () => fromBot?.today || dateKey(now());
const days = (dur) => Array.from({ length: 7 }, (_, i) => {
  const date = addDays(today(), i);
  return { date, n: freeHours(date, dur).length };
});

// ---- состояние ----
const savedCar = (params.get('car') || '').slice(0, 60);
const st = {
  step: 0,
  cat: 'tire',
  svc: null,
  note: '',
  useSaved: !!savedCar,
  brand: null,
  model: '',
  date: null,
  h: null,
  phone: normPhone(params.get('ph')) || '',
};
const svc = () => SVC[st.svc];
const carValue = () => (st.useSaved ? savedCar : st.brand === 'Другая' ? st.model.trim() : `${st.brand} ${st.model.trim()}`);

function valid(step = st.step) {
  switch (step) {
    case 0: return !!st.svc && (st.svc !== 'other' || st.note.trim().length >= 3);
    case 1: return st.useSaved ? !!savedCar : !!st.brand && st.model.trim().length >= 2 && st.model.trim().length <= 40;
    case 2: return !!st.date && st.h != null && freeHours(st.date, svc().dur).includes(st.h);
    case 3: return !!normPhone(st.phone);
    default: return true;
  }
}

const haptic = (kind) => {
  try {
    if (!IN_TG) return;
    if (kind === 'select') tg.HapticFeedback?.selectionChanged();
    else tg.HapticFeedback?.notificationOccurred(kind);
  } catch { /* старый клиент */ }
};

// ---- экраны ----
function screenService() {
  const cats = CATS.map((c) => `<button type="button" class="pill" data-cat="${c.id}" aria-pressed="${c.id === st.cat}">${c.name}</button>`).join('');
  const items = CATS.find((c) => c.id === st.cat).items.map((s) => `<button type="button" class="opt" data-svc="${s.id}" aria-pressed="${s.id === st.svc}">
      <b>${s.name}</b><span>${priceLabel(s)}</span><small>${s.dur > 1 ? `≈ ${s.dur} часа` : '≈ 1 час'}</small></button>`).join('');
  const note = st.svc === 'other' ? `<label class="label" for="note">Что случилось с машиной?</label>
      <textarea class="field" id="note" maxlength="300" placeholder="Например: стучит справа на кочках, горит чек">${esc(st.note)}</textarea>` : '';
  return `<h1>Что нужно сделать?</h1><p class="lead">Цены «от» — точную сумму мастер согласует до начала работ.</p>
    <div class="pills">${cats}</div><div class="list">${items}</div>${note}`;
}

function screenCar() {
  const saved = savedCar && st.useSaved ? `<div class="saved"><div><small class="lead">Ваш автомобиль</small><br><b>${esc(savedCar)}</b></div>
      <button type="button" class="link" data-act="other-car">Другой</button></div>` : '';
  const pick = st.useSaved ? '' : `${savedCar ? `<button type="button" class="link" data-act="saved-car">← ${esc(savedCar)}</button>` : ''}
    <span class="label">Марка</span>
    <div class="grid3">${BRANDS.map((b) => `<button type="button" class="pill" data-brand="${b}" aria-pressed="${b === st.brand}">${b}</button>`).join('')}</div>
    <label class="label" for="model">${st.brand === 'Другая' ? 'Марка, модель и год' : 'Модель и год'}</label>
    <input class="field" id="model" maxlength="40" autocomplete="off" value="${esc(st.model)}" placeholder="${st.brand === 'Другая' ? 'Mazda 6 2018' : 'Rio 2019'}" ${st.brand ? '' : 'disabled'}>`;
  return `<h1>Какая у вас машина?</h1><p class="lead">Чтобы мастер подготовил запчасти и время.</p>${saved}${pick}`;
}

function screenTime() {
  const dur = svc().dur;
  const list = days(dur);
  if (!st.date || !list.find((d) => d.date === st.date && d.n)) {
    st.date = list.find((d) => d.n)?.date || null;
    st.h = null;
  }
  if (!st.date) return '<h1>Свободных окон нет</h1><div class="empty">На ближайшую неделю всё занято 😔<br>Напишите мастеру в боте — подберём время.</div>';
  const t = today();
  const pills = list.map((d) => `<button type="button" class="pill" data-date="${d.date}" aria-pressed="${d.date === st.date}" ${d.n ? '' : 'disabled'}>${dayShort(d.date, t)}<small>${d.n || 'нет мест'}</small></button>`).join('');
  const free = freeHours(st.date, dur);
  const times = [];
  for (let h = OPEN; h + dur <= CLOSE; h++) {
    times.push(`<button type="button" class="time" data-h="${h}" aria-pressed="${h === st.h}" ${free.includes(h) ? '' : 'disabled'}>${pad(h)}:00</button>`);
  }
  return `<h1>Когда приедете?</h1><p class="lead">${esc(svc().name)} · ${dur > 1 ? `≈ ${dur} часа` : '≈ 1 час'}</p>
    <div class="pills">${pills}</div>
    <span class="label">${dateLabel(st.date)}</span>
    <div class="times">${times.join('')}</div>
    <p class="legend">Зачёркнуто — занято. Свободных окон: ${free.length}</p>`;
}

function screenPhone() {
  return `<h1>Телефон для связи</h1><p class="lead">Позвоним, только если что-то изменится. Напоминания придут в Telegram.</p>
    <input class="field" id="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+7 999 123-45-67" value="${esc(st.phone)}">
    <div class="err" id="phoneErr"></div>`;
}

function screenSummary() {
  const s = svc();
  const rows = [
    ['🔧', 'Услуга', s.name],
    st.svc === 'other' && ['📝', 'Описание', st.note.trim()],
    ['💰', 'Стоимость', priceLabel(s)],
    ['🚗', 'Автомобиль', carValue()],
    ['📅', 'Когда', `${dateLabel(st.date)}, ${pad(st.h)}:00`],
    ['📱', 'Телефон', normPhone(st.phone)],
    ['📍', 'Адрес', 'ул. Моторная, 12'],
  ].filter(Boolean).map(([i, k, v]) => `<div><span>${i}</span><p style="margin:0"><small>${k}</small><b>${esc(v)}</b></p></div>`).join('');
  return `<h1>Проверьте запись</h1><div class="summary">${rows}</div>
    <p class="fine">После отправки бот пришлёт номер заявки и напомнит о визите за день и за 2 часа.</p>`;
}

const SCREENS = [screenService, screenCar, screenTime, screenPhone, screenSummary];

function render() {
  const el = $('#screen');
  el.innerHTML = SCREENS[st.step]();
  el.classList.remove('screen-in');
  void el.offsetWidth;
  el.classList.add('screen-in');
  $('#stepName').textContent = `Шаг ${st.step + 1} из 5 · ${STEPS[st.step]}`;
  [...$('#progress').children].forEach((li, i) => li.classList.toggle('on', i <= st.step));
  bind();
  updateButtons();
  window.scrollTo(0, 0);
}

function bind() {
  const el = $('#screen');
  el.onclick = (e) => {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    const d = b.dataset;
    if (d.cat) { st.cat = d.cat; haptic('select'); }
    else if (d.svc) {
      st.svc = d.svc;
      st.date = null;
      st.h = null;
      haptic('select');
    } else if (d.brand) { st.brand = d.brand; haptic('select'); }
    else if (d.act === 'other-car') st.useSaved = false;
    else if (d.act === 'saved-car') st.useSaved = true;
    else if (d.date) { st.date = d.date; st.h = null; haptic('select'); }
    else if (d.h) { st.h = Number(d.h); haptic('select'); }
    else return;
    render();
    if (d.brand) $('#model')?.focus();
  };
  const bindInput = (sel, key) => {
    const input = $(sel);
    if (input) input.oninput = () => { st[key] = input.value; updateButtons(); };
  };
  bindInput('#note', 'note');
  bindInput('#model', 'model');
  const phone = $('#phone');
  if (phone) {
    phone.oninput = () => { st.phone = phone.value; phone.classList.remove('bad'); $('#phoneErr').textContent = ''; updateButtons(); };
    phone.onblur = () => {
      const ok = normPhone(phone.value);
      if (phone.value && !ok) { phone.classList.add('bad'); $('#phoneErr').textContent = 'Нужен мобильный номер: +7 9XX XXX-XX-XX'; }
      else if (ok) phone.value = st.phone = ok;
    };
  }
}

// ---- кнопки: в Telegram — MainButton/BackButton, вне — свои ----
function updateButtons() {
  const text = st.step === 4 ? 'Записаться' : 'Далее';
  const ok = valid();
  if (IN_TG) {
    tg.MainButton.setParams({ text, color: ok ? '#ffbe1a' : '#7d7356', text_color: '#171200', is_visible: true });
    if (ok) tg.MainButton.enable(); else tg.MainButton.disable();
    if (st.step > 0) tg.BackButton.show(); else tg.BackButton.hide();
  } else {
    $('#pvNext').textContent = text;
    $('#pvNext').disabled = !ok;
    $('#pvBack').hidden = st.step === 0;
  }
}

function next() {
  if (!valid()) { haptic('error'); return; }
  if (st.step < 4) {
    if (st.step === 3) st.phone = normPhone(st.phone);
    st.step++;
    return render();
  }
  submit();
}
function back() {
  if (st.step > 0) {
    st.step--;
    render();
  }
}

function submit() {
  const payload = { v: 1, svc: st.svc, car: carValue(), date: st.date, h: st.h, phone: normPhone(st.phone), note: st.svc === 'other' ? st.note.trim() : '' };
  const json = JSON.stringify(payload);
  if (IN_TG) {
    haptic('success');
    tg.sendData(json); // Telegram закроет приложение, бот получит web_app_data
  } else {
    $('#payload').textContent = JSON.stringify(payload, null, 2);
    $('#modal').hidden = false;
  }
}

// ---- старт ----
if (IN_TG) {
  tg.ready();
  tg.expand();
  tg.MainButton.onClick(next);
  tg.BackButton.onClick(back);
} else {
  document.querySelector('.app').classList.add('preview');
  $('#previewBar').hidden = false;
  $('#pvNext').onclick = next;
  $('#pvBack').onclick = back;
  $('#modalClose').onclick = () => { $('#modal').hidden = true; };
}
const notice = $('#notice');
if (!IN_TG) {
  notice.hidden = false;
  notice.textContent = 'Превью вне Telegram: расписание демонстрационное. В боте приложение открывается кнопкой «📱 Запись в приложении».';
} else if (fromBot && now() - fromBot.at > 6 * H) {
  notice.hidden = false;
  notice.textContent = 'Расписание могло измениться с момента открытия меню — бот перепроверит время при записи.';
}
render();

// для автотестов
window.__app = { st, valid, freeHours, IN_TG };
