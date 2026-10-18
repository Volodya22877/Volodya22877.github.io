// Общая модель практики «Нина Озерова»: форматы, цены, расписание, правила свободного времени, часовые пояса.
// Один файл на всех: сайт и Mini App подключают его как модуль, бот (../ozerova-bot) импортирует его же.
// Время психолога — московское (UTC+3, без перехода на летнее время); всё хранится в UTC-миллисекундах.

export const H = 3600e3;
export const DAY = 24 * H;
export const MSK_OFFSET = 3 * H;

export const PRACTICE = {
  name: 'Нина Озерова',
  nameShort: 'Нина',
  role: 'психолог, КПТ-терапевт',
  office: 'Москва, 5 минут пешком от м. Чистые пруды',
  officeShort: 'м. Чистые пруды',
  officeDays: [2, 4, 6], // вт, чт, сб — очные встречи только в эти дни
};

// Форматы встреч. Цены и длительности — только здесь.
export const KINDS = [
  { id: 'intro', title: 'Знакомство', dur: 20, price: 0, online: true,
    short: 'Знакомство · 20 мин · бесплатно',
    about: 'Обсудим запрос и решим, подходим ли друг другу. Ни к чему не обязывает.' },
  { id: 'online', title: 'Онлайн-встреча', dur: 50, price: 5000, online: true,
    short: 'Онлайн · 50 мин · 5 000 ₽',
    about: 'Видеосвязь из любой точки мира. Нужны наушники и 50 минут, когда вас никто не слышит.' },
  { id: 'offline', title: 'Очная встреча', dur: 50, price: 5500, online: false,
    short: 'Очно · 50 мин · 5 500 ₽',
    about: 'Тихий кабинет у м. Чистые пруды. Вторник, четверг и суббота.' },
];
export const KIND = Object.fromEntries(KINDS.map((k) => [k.id, k]));

// Начало встреч по дням недели (0 — воскресенье). 13:00 — перерыв.
export const HOURS = {
  0: [],
  1: [10, 11, 12, 14, 15, 16, 17, 18, 19],
  2: [10, 11, 12, 14, 15, 16, 17, 18, 19],
  3: [10, 11, 12, 14, 15, 16, 17, 18, 19],
  4: [10, 11, 12, 14, 15, 16, 17, 18, 19],
  5: [10, 11, 12, 14, 15, 16, 17],
  6: [11, 12, 13, 14],
};
export const ALL_HOURS = [...new Set(Object.values(HOURS).flat())].sort((a, b) => a - b);
export const RULES = {
  horizonDays: 14, // запись на 2 недели вперёд
  leadMinutes: 180, // не раньше чем через 3 часа
  freeCancelHours: 24, // бесплатная отмена и перенос — не позднее чем за сутки
};

// Ссылки с сайта в бота: t.me/<бот>?start=<payload>
export const PAYLOADS = ['book', 'intro', 'online', 'offline', 'help'];

// ---------- даты по Москве ----------
const pad = (n) => String(n).padStart(2, '0');
export function mskParts(ms) {
  const d = new Date(ms + MSK_OFFSET);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), wd: d.getUTCDay(), h: d.getUTCHours(), mi: d.getUTCMinutes(),
    date: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}` };
}
export const mskDate = (ms) => mskParts(ms).date;
export function slotMs(date, hour) {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d, hour) - MSK_OFFSET;
}
export function addDays(date, n) {
  const [y, m, d] = date.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}
export function weekday(date) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

// ---------- демо-занятость ----------
// В демо часть часов «уже занята другими клиентами» — детерминированно, чтобы сайт, Mini App и бот видели одно и то же.
export function hash32(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}
export function demoBusy(date, hour) {
  const wd = weekday(date);
  const p = wd === 6 ? 50 : hour >= 18 ? 60 : hour <= 12 ? 30 : 40; // вечера и суббота разбирают быстрее
  return hash32(`${date}:${hour}`) % 100 < p;
}

// ---------- свободное время ----------
// opts: now (мс), taken — занятые начала встреч (мс, Set или массив), daysOff — выходные психолога ('YYYY-MM-DD'), demo — учитывать демо-занятость
export function freeHours(date, kindId, { now, taken = [], daysOff = [], demo = true } = {}) {
  const kind = KIND[kindId];
  if (!kind || daysOff.includes(date)) return [];
  const today = mskDate(now);
  if (date < today || date > addDays(today, RULES.horizonDays - 1)) return [];
  const wd = weekday(date);
  if (!kind.online && !PRACTICE.officeDays.includes(wd)) return [];
  const busy = taken instanceof Set ? taken : new Set(taken);
  const earliest = now + RULES.leadMinutes * 60e3;
  return HOURS[wd].filter((h) => {
    const t = slotMs(date, h);
    return t >= earliest && !busy.has(t) && !(demo && demoBusy(date, h));
  });
}
export function freeDays(kindId, opts) {
  const today = mskDate(opts.now);
  const out = [];
  for (let i = 0; i < RULES.horizonDays; i++) {
    const date = addDays(today, i);
    const hours = freeHours(date, kindId, opts);
    if (hours.length) out.push({ date, hours });
  }
  return out;
}
export function nearestSlot(kindId, opts) {
  const d = freeDays(kindId, opts)[0];
  return d ? slotMs(d.date, d.hours[0]) : null;
}

// ---------- окна для Mini App ----------
// Бот кладёт свободные часы в ссылку: s=<первый день>~<маска дня 0>.<маска дня 1>… (бит h — свободен час h, base36).
// Онлайн и очно — один календарь, очные дни Mini App знает сама (PRACTICE.officeDays).
export function encodeWindow(opts) {
  const today = mskDate(opts.now);
  const masks = [];
  for (let i = 0; i < RULES.horizonDays; i++) {
    const date = addDays(today, i);
    masks.push(freeHours(date, 'online', opts).reduce((m, h) => m | (1 << h), 0).toString(36));
  }
  while (masks.length && masks[masks.length - 1] === '0') masks.pop();
  return `${today}~${masks.join('.')}`;
}
export function decodeWindow(s) {
  const m = /^(\d{4}-\d{2}-\d{2})~([0-9a-z.]*)$/.exec(s || '');
  if (!m) return null;
  const days = {};
  m[2].split('.').forEach((v, i) => {
    const mask = parseInt(v || '0', 36);
    const hours = ALL_HOURS.filter((h) => mask & (1 << h));
    if (hours.length) days[addDays(m[1], i)] = hours;
  });
  return { start: m[1], days };
}
// часы для формата из расшифрованного окна (очно — только в очные дни)
export function windowHours(win, date, kindId) {
  const hours = win?.days[date] || [];
  if (!KIND[kindId]?.online && !PRACTICE.officeDays.includes(weekday(date))) return [];
  return hours;
}

// ---------- часовые пояса ----------
export const ZONES_RU = [
  ['Europe/Kaliningrad', 'Калининград'], ['Europe/Moscow', 'Москва'], ['Europe/Samara', 'Самара'],
  ['Asia/Yekaterinburg', 'Екатеринбург'], ['Asia/Omsk', 'Омск'], ['Asia/Novosibirsk', 'Новосибирск'],
  ['Asia/Irkutsk', 'Иркутск'], ['Asia/Yakutsk', 'Якутск'], ['Asia/Vladivostok', 'Владивосток'],
  ['Asia/Magadan', 'Магадан'], ['Asia/Kamchatka', 'Камчатка'],
];
export const ZONES_WORLD = [
  ['Europe/Minsk', 'Минск'], ['Asia/Tbilisi', 'Тбилиси'], ['Asia/Yerevan', 'Ереван'], ['Asia/Almaty', 'Алматы'],
  ['Asia/Tashkent', 'Ташкент'], ['Europe/Istanbul', 'Стамбул'], ['Europe/Belgrade', 'Белград'], ['Europe/Berlin', 'Берлин'],
  ['Europe/London', 'Лондон'], ['Asia/Dubai', 'Дубай'], ['Asia/Bangkok', 'Бангкок'], ['America/New_York', 'Нью-Йорк'],
];
const ZONE_NAMES = Object.fromEntries([...ZONES_RU, ...ZONES_WORLD]);

// Intl.DateTimeFormat создавать дорого (а у бота на Cloudflare 10 мс процессора на запрос) — держим по одному на пояс
const DTF = new Map();
function dtf(tz) {
  let f = DTF.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    DTF.set(tz, f);
  }
  return f;
}
export function validZone(tz) {
  if (typeof tz !== 'string' || !tz || tz.length > 64) return false;
  try {
    dtf(tz);
    return true;
  } catch {
    return false;
  }
}
// смещение пояса от UTC в минутах на момент ms (с учётом летнего времени)
export function tzOffset(tz, ms) {
  if (tz === 'Europe/Moscow') return 180;
  const p = {};
  for (const x of dtf(tz).formatToParts(ms)) p[x.type] = x.value;
  const local = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute);
  return Math.round((local - Math.floor(ms / 60e3) * 60e3) / 60e3);
}
// «МСК», «МСК+2», «МСК−1», «МСК+5:30»
export function mskDelta(tz, ms) {
  const d = tzOffset(tz, ms) - 180;
  if (!d) return 'МСК';
  const a = Math.abs(d);
  return `МСК${d > 0 ? '+' : '−'}${Math.floor(a / 60)}${a % 60 ? ':' + pad(a % 60) : ''}`;
}
export const zoneName = (tz) => ZONE_NAMES[tz] || tz.split('/').pop().replace(/_/g, ' ');
export const zoneLabel = (tz, ms) => `${zoneName(tz)} (${mskDelta(tz, ms)})`;

// ---------- форматирование ----------
export const WD = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
export const WD_FULL = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
export const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
export const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

// части даты и времени в нужном поясе (по умолчанию — Москва)
export function zoned(ms, tz = 'Europe/Moscow') {
  const t = new Date(ms + tzOffset(tz, ms) * 60e3);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), wd: t.getUTCDay(), h: t.getUTCHours(), mi: t.getUTCMinutes() };
}
export const fmtTime = (ms, tz) => { const z = zoned(ms, tz); return `${pad(z.h)}:${pad(z.mi)}`; };
export const fmtDay = (ms, tz) => { const z = zoned(ms, tz); return `${WD[z.wd]}, ${z.d} ${MONTHS[z.m - 1]}`; };
export const fmtDayShort = (ms, tz) => { const z = zoned(ms, tz); return `${WD[z.wd]}, ${z.d} ${MONTHS_SHORT[z.m - 1]}`; };
// «сегодня» / «завтра» / «чт, 17 октября» — относительно now в том же поясе
export function fmtDayRel(ms, now, tz) {
  const a = zoned(ms, tz), b = zoned(now, tz);
  const diff = Math.round((Date.UTC(a.y, a.m - 1, a.d) - Date.UTC(b.y, b.m - 1, b.d)) / DAY);
  return diff === 0 ? 'сегодня' : diff === 1 ? 'завтра' : fmtDay(ms, tz);
}
export const fmtPrice = (n) => (n ? `${n.toLocaleString('ru-RU')} ₽` : 'бесплатно');
