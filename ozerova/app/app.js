// Telegram Mini App записи к Нине Озеровой: формат → день и время → имя → итог → sendData боту.
// Свободные окна бот кладёт в ссылку (?s=…, js/model.js → encodeWindow). Вне Telegram — превью со своими кнопками.
// Для тестов: window.__NOW__ (подмена времени).
import { KIND, KINDS, PRACTICE, decodeWindow, encodeWindow, windowHours, slotMs, mskParts, weekday, fmtTime, fmtDay, zoned,
  WD, MONTHS_SHORT, mskDelta, zoneLabel, fmtPrice } from '../js/model.js';

const $ = (s) => document.querySelector(s);
const now = () => window.__NOW__ ?? Date.now();
const params = new URLSearchParams(location.search);
const deviceTz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Moscow'; } catch { return 'Europe/Moscow'; } })();
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const STEPS = ['Формат', 'День и время', 'Как обращаться', 'Проверка'];

// ---------- Telegram ----------
function loadScript(src, timeout = 4000) {
  return new Promise((ok, fail) => {
    const s = document.createElement('script');
    s.src = src;
    const t = setTimeout(() => { s.remove(); fail(new Error('timeout')); }, timeout);
    s.onload = () => { clearTimeout(t); ok(); };
    s.onerror = () => { clearTimeout(t); s.remove(); fail(new Error('error')); };
    document.head.append(s);
  });
}
// внутри Telegram в адресе есть tgWebAppData/tgWebAppVersion; снаружи скрипт не нужен — сразу превью без внешних запросов
const launchedFromTg = /tgWebApp(Data|Version|Platform)/.test(location.hash) || 'TelegramWebviewProxy' in window;
async function getTelegram() {
  if (!launchedFromTg) return null;
  try { await loadScript('https://telegram.org/js/telegram-web-app.js?59'); } catch {
    try { await loadScript('telegram-web-app.js'); } catch { return null; }
  }
  const tg = window.Telegram?.WebApp;
  return tg && tg.platform && tg.platform !== 'unknown' ? tg : null;
}
const tg = await getTelegram();
const IN_TG = !!tg;
const can = (v) => IN_TG && typeof tg.isVersionAtLeast === 'function' && tg.isVersionAtLeast(v);

// ---------- тема ----------
const darkQuery = matchMedia('(prefers-color-scheme: dark)');
function applyTheme() {
  document.documentElement.dataset.theme = IN_TG ? (tg.colorScheme === 'dark' ? 'dark' : 'light') : darkQuery.matches ? 'dark' : 'light';
  if (IN_TG) {
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
    if (can('6.1')) { tg.setHeaderColor(bg); tg.setBackgroundColor(bg); }
    if (can('7.10')) tg.setBottomBarColor(bg);
  }
  if (st) syncButtons();
}

// ---------- данные ----------
// окна из ссылки бота; нет ссылки (превью, открыли напрямую) — демо-расписание по тем же правилам
const win = decodeWindow(params.get('s')) || decodeWindow(encodeWindow({ now: now(), demo: true }));
const fromBot = !!decodeWindow(params.get('s'));
const presetKind = KIND[params.get('k')] ? params.get('k') : null;
const st = { step: 0, kind: presetKind, date: null, h: null, name: tg?.initDataUnsafe?.user?.first_name?.slice(0, 40) || '', phone: '', consent: false };
const app = { st, IN_TG, fromBot, win, deviceTz, sent: null };
window.__app = app;

const plural = (n, one, few, many) => {
  const a = n % 10, b = n % 100;
  return a === 1 && b !== 11 ? one : a >= 2 && a <= 4 && (b < 12 || b > 14) ? few : many;
};
const tzFor = () => (KIND[st.kind]?.online ? deviceTz : 'Europe/Moscow');
const daysFor = (kind) => Object.keys(win.days).sort().filter((d) => windowHours(win, d, kind).length);
const digits = (s) => s.replace(/\D/g, '');
const phoneOk = (s) => !s.trim() || (/^[+\d\s()-]+$/.test(s.trim()) && digits(s).length >= 10 && digits(s).length <= 15);
const nameOk = (s) => s.trim().length >= 2 && s.trim().length <= 40;

function canNext() {
  if (st.step === 0) return !!st.kind;
  if (st.step === 1) return !!st.date && st.h != null;
  if (st.step === 2) return nameOk(st.name) && phoneOk(st.phone) && st.consent;
  return true;
}

// ---------- экраны ----------
const screen = $('#screen');
function render(focus = false) {
  $('#stepLabel').textContent = `Шаг ${st.step + 1} из 4 · ${STEPS[st.step]}`;
  [...$('#stepDots').children].forEach((li, i) => { li.className = i < st.step ? 'done' : i === st.step ? 'on' : ''; });
  screen.innerHTML = [renderKind, renderTime, renderName, renderSummary][st.step]();
  screen.style.animation = 'none';
  void screen.offsetWidth;
  screen.style.animation = '';
  if (focus) screen.querySelector('h1')?.focus({ preventScroll: true });
  if (st.step === 1) screen.querySelector('.day[aria-pressed="true"]')?.scrollIntoView({ block: 'nearest', inline: 'center' });
  syncButtons();
}

const KIND_IC = { intro: 'i-chat', online: 'i-globe', offline: 'i-cup' };
function renderKind() {
  return `<h1 tabindex="-1">Как удобнее встретиться?</h1>
    <p class="sub">Оплата после встречи. Перенос и отмена бесплатно — не позже чем за сутки.</p>
    <div class="kinds" role="group" aria-label="Формат встречи">${KINDS.map((k) => `
      <button class="kind" type="button" data-kind="${k.id}" aria-pressed="${st.kind === k.id}">
        <svg class="kind-ic" aria-hidden="true"><use href="#${KIND_IC[k.id]}"/></svg>
        <b>${esc(k.title)}</b>
        <span class="kind-tick" aria-hidden="true"><svg class="ic"><use href="#i-check"/></svg></span>
        <span class="kind-meta">${k.dur} мин · ${esc(fmtPrice(k.price))}${k.online ? '' : ' · вт, чт, сб'}</span>
        <span class="kind-about">${esc(k.about)}</span>
      </button>`).join('')}</div>`;
}

function renderTime() {
  const days = daysFor(st.kind);
  if (!days.length) {
    return `<h1 tabindex="-1">Когда?</h1><p class="empty">На ближайшие две недели свободного времени нет. В боте можно встать в лист ожидания — напишем, как только освободится.</p>`;
  }
  if (!days.includes(st.date)) { st.date = days[0]; st.h = null; }
  const tz = tzFor();
  const hours = windowHours(win, st.date, st.kind);
  const dayBtn = (d) => {
    const n = windowHours(win, d, st.kind).length;
    const [, m, dd] = d.split('-').map(Number);
    return `<button class="day" type="button" data-date="${d}" aria-pressed="${d === st.date}" aria-label="${WD[weekday(d)]}, ${dd} ${MONTHS_SHORT[m - 1]}: ${n} ${plural(n, 'окно', 'окна', 'окон')}">
      <small>${WD[weekday(d)]}</small><b>${dd}</b><span>${n} ${plural(n, 'окно', 'окна', 'окон')}</span></button>`;
  };
  const timeBtn = (h) => {
    const ms = slotMs(st.date, h);
    const local = fmtTime(ms, tz);
    const other = tz !== 'Europe/Moscow' && mskDelta(tz, ms) !== 'МСК';
    const nextDay = zoned(ms, tz).d !== mskParts(ms).d;
    return `<button class="time" type="button" data-h="${h}" aria-pressed="${h === st.h}"><b>${local}</b>${other ? `<small>МСК ${fmtTime(ms, 'Europe/Moscow')}${nextDay ? ' · след. день' : ''}</small>` : ''}</button>`;
  };
  const first = slotMs(st.date, hours[0] ?? 12);
  const note = !KIND[st.kind].online ? 'Время московское — встреча в кабинете у м. Чистые пруды.'
    : tz === 'Europe/Moscow' || mskDelta(tz, first) === 'МСК' ? 'Время московское.' : `Время по вашему часовому поясу: ${zoneLabel(tz, first)}.`;
  return `<h1 tabindex="-1">Когда?</h1>
    <p class="sub">${esc(KIND[st.kind].title)}, ${KIND[st.kind].dur} минут.</p>
    <div class="days" role="group" aria-label="День">${days.map(dayBtn).join('')}</div>
    <p class="day-title">${esc(fmtDay(slotMs(st.date, hours[0] ?? 12), 'Europe/Moscow'))}</p>
    <div class="times" role="group" aria-label="Время">${hours.map(timeBtn).join('')}</div>
    <p class="tz-note"><svg class="ic" aria-hidden="true"><use href="#i-clock"/></svg><span>${esc(note)}</span></p>`;
}

function renderName() {
  return `<h1 tabindex="-1">Как к вам обращаться?</h1>
    <p class="sub">Можно псевдоним — настоящее имя не обязательно.</p>
    <div class="field">
      <label for="aName">Имя</label>
      <input id="aName" type="text" maxlength="40" autocomplete="given-name" value="${esc(st.name)}" placeholder="Например, Аня">
    </div>
    <div class="field">
      <label for="aPhone">Телефон <span>(необязательно)</span></label>
      <input id="aPhone" type="tel" maxlength="20" autocomplete="tel" value="${esc(st.phone)}" placeholder="+7 900 000-00-00" aria-describedby="aPhoneHint aPhoneErr">
      <p class="hint" id="aPhoneHint">Если удобнее звонок. Иначе свяжемся в Telegram.</p>
      <p class="err" id="aPhoneErr"></p>
    </div>
    <label class="check"><input id="aConsent" type="checkbox"${st.consent ? ' checked' : ''}>
      <span>Согласен(на) на обработку персональных данных по <a href="../privacy.html" id="aPolicy">политике конфиденциальности</a></span></label>`;
}

function renderSummary() {
  const k = KIND[st.kind];
  const ms = slotMs(st.date, st.h);
  const tz = tzFor();
  const other = tz !== 'Europe/Moscow' && mskDelta(tz, ms) !== 'МСК';
  return `<h1 tabindex="-1">Проверьте</h1>
    <p class="sub">Если всё верно — нажмите «Записаться». Нина подтвердит запись в боте.</p>
    <dl class="summary">
      <div><dt>Формат</dt><dd>${esc(k.title)}<small>${k.online ? 'видеосвязь' : esc(PRACTICE.office)}</small></dd></div>
      <div><dt>Когда</dt><dd>${esc(fmtDay(ms, tz))}, ${fmtTime(ms, tz)}${other ? `<small>по Москве ${fmtTime(ms, 'Europe/Moscow')}</small>` : ''}</dd></div>
      <div><dt>Длительность</dt><dd>${k.dur} минут</dd></div>
      <div><dt>Стоимость</dt><dd>${esc(fmtPrice(k.price))}${k.price ? '<small>оплата после встречи</small>' : ''}</dd></div>
      <div><dt>Имя</dt><dd>${esc(st.name.trim())}</dd></div>
      ${st.phone.trim() ? `<div><dt>Телефон</dt><dd>${esc(st.phone.trim())}</dd></div>` : ''}
    </dl>
    <ul class="after">
      <li><svg class="ic" aria-hidden="true"><use href="#i-check"/></svg>Подтверждение придёт в чат с ботом</li>
      <li><svg class="ic" aria-hidden="true"><use href="#i-bell"/></svg>Напоминания — за сутки и за 2 часа, без лишних слов на экране блокировки</li>
      <li><svg class="ic" aria-hidden="true"><use href="#i-clock"/></svg>Перенести или отменить — в «Моих записях»</li>
    </ul>`;
}

// ---------- события ----------
screen.addEventListener('click', (e) => {
  const kind = e.target.closest('.kind');
  const day = e.target.closest('.day');
  const time = e.target.closest('.time');
  if (kind) {
    if (st.kind !== kind.dataset.kind) { st.kind = kind.dataset.kind; st.date = null; st.h = null; }
    haptic();
    render();
  } else if (day) {
    if (st.date !== day.dataset.date) { st.date = day.dataset.date; st.h = null; }
    haptic();
    render();
  } else if (time) {
    st.h = Number(time.dataset.h);
    haptic();
    for (const b of screen.querySelectorAll('.time')) b.setAttribute('aria-pressed', String(b === time));
    syncButtons();
  } else if (e.target.closest('#aPolicy') && IN_TG) {
    e.preventDefault();
    tg.openLink(new URL('../privacy.html', location.href).href);
  }
});
screen.addEventListener('input', (e) => {
  if (e.target.id === 'aName') st.name = e.target.value;
  if (e.target.id === 'aPhone') {
    st.phone = e.target.value;
    const bad = !phoneOk(st.phone) && digits(st.phone).length >= 10;
    e.target.setAttribute('aria-invalid', String(bad));
    $('#aPhoneErr').textContent = bad ? 'Похоже, в номере лишние символы или цифры.' : '';
  }
  syncButtons();
});
screen.addEventListener('change', (e) => {
  if (e.target.id === 'aConsent') { st.consent = e.target.checked; syncButtons(); }
  if (e.target.id === 'aPhone' && !phoneOk(st.phone)) {
    e.target.setAttribute('aria-invalid', 'true');
    $('#aPhoneErr').textContent = 'Проверьте номер: нужно 10–15 цифр.';
  }
});

function haptic() { if (IN_TG && can('6.1')) tg.HapticFeedback.selectionChanged(); }
function next() {
  if (!canNext()) return;
  if (st.step < 3) { st.step++; render(true); return; }
  submit();
}
function back() {
  if (st.step === 0) return;
  st.step--;
  render(true);
}
function submit() {
  const payload = { v: 1, k: st.kind, t: slotMs(st.date, st.h), n: st.name.trim(), p: st.phone.trim(), tz: tzFor(), c: 1 };
  app.sent = payload;
  if (IN_TG) {
    if (can('6.1')) tg.HapticFeedback.notificationOccurred('success');
    tg.sendData(JSON.stringify(payload)); // Telegram закроет приложение, бот получит web_app_data
  } else {
    $('#payload').textContent = JSON.stringify(payload, null, 2);
    $('#modal').hidden = false;
    $('#modalClose').focus();
  }
}

// ---------- кнопки: Telegram (MainButton/BackButton) или свои в превью ----------
function syncButtons() {
  const text = st.step === 3 ? 'Записаться' : 'Далее';
  const ok = canNext();
  if (IN_TG) {
    const css = getComputedStyle(document.documentElement);
    tg.MainButton.setParams({ text, color: css.getPropertyValue('--brand').trim(), text_color: css.getPropertyValue('--on-brand').trim(), is_visible: true, is_active: ok });
    if (ok) tg.MainButton.enable(); else tg.MainButton.disable();
    if (can('6.1')) { if (st.step > 0) tg.BackButton.show(); else tg.BackButton.hide(); }
  } else {
    $('#pvNext').textContent = text;
    $('#pvNext').disabled = !ok;
    $('#pvBack').hidden = st.step === 0;
  }
}

if (IN_TG) {
  tg.ready();
  tg.expand();
  tg.MainButton.onClick(next);
  if (can('6.1')) tg.BackButton.onClick(back);
  tg.onEvent?.('themeChanged', applyTheme);
} else {
  $('#previewBar').hidden = false;
  $('#pvNav').hidden = false;
  $('#pvNext').addEventListener('click', next);
  $('#pvBack').addEventListener('click', back);
  $('#modalClose').addEventListener('click', () => { $('#modal').hidden = true; });
  darkQuery.addEventListener('change', applyTheme);
}
applyTheme();
render();
