// Услуги и цены — те же, что в боте (nakolesah-bot/bot.js, CATS); совпадение проверяет test/check.mjs.
export const BOT = 'kolesoservis_bot';
export const startLink = (payload) => `https://t.me/${BOT}?start=${payload}`;

export const CATS = [
  { id: 'to', name: 'ТО и масло', icon: 'oil', note: 'Масло, фильтры, жидкости — по регламенту производителя', items: [
    { id: 'oil', name: 'Замена масла в двигателе', price: 900, dur: 1 },
    { id: 'to', name: 'ТО: масло + фильтры', price: 2500, dur: 1 },
    { id: 'brfl', name: 'Замена тормозной жидкости', price: 1200, dur: 1 },
  ] },
  { id: 'tire', name: 'Шиномонтаж', icon: 'tire', note: 'Переобувка, балансировка, ремонт проколов', items: [
    { id: 'tr16', name: 'Сезонная переобувка R13–R16', price: 2400, dur: 1 },
    { id: 'tr20', name: 'Сезонная переобувка R17–R20', price: 3200, dur: 1 },
    { id: 'bal', name: 'Балансировка 4 колёс', price: 1200, dur: 1 },
    { id: 'hole', name: 'Ремонт прокола', price: 600, dur: 1 },
  ] },
  { id: 'diag', name: 'Диагностика', icon: 'scan', note: 'Сканер, ходовая, проверка перед покупкой', items: [
    { id: 'comp', name: 'Компьютерная диагностика', price: 1500, dur: 1 },
    { id: 'susp', name: 'Диагностика ходовой', price: 800, dur: 1 },
    { id: 'buy', name: 'Проверка авто перед покупкой', price: 3000, dur: 2 },
  ] },
  { id: 'fix', name: 'Ремонт', icon: 'wrench', note: 'Тормоза, подвеска, развал-схождение', items: [
    { id: 'pads', name: 'Замена тормозных колодок (ось)', price: 1500, dur: 1 },
    { id: 'shock', name: 'Замена амортизаторов (пара)', price: 3500, dur: 2 },
    { id: 'align', name: 'Развал-схождение', price: 2000, dur: 1 },
  ] },
  { id: 'ac', name: 'Кондиционер', icon: 'snow', note: 'Заправка и чистка — перед жарой и после зимы', items: [
    { id: 'acfill', name: 'Заправка кондиционера', price: 2500, dur: 1 },
    { id: 'acclean', name: 'Антибактериальная обработка', price: 1500, dur: 1 },
  ] },
  { id: 'other', name: 'Другое', icon: 'chat', note: 'Опишите проблему — мастер подскажет', items: [
    { id: 'other', name: 'Ремонт по описанию', price: null, dur: 1 },
  ] },
];

export const rub = (n) => `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} ₽`;
export const priceLabel = (s) => (s.price ? `от ${rub(s.price)}` : 'после диагностики');

// Иконки категорий — контурные, 24×24
export const ICONS = {
  oil: '<path d="M12 3c3 4.2 5 7.2 5 9.6A5 5 0 0 1 7 12.6C7 10.2 9 7.2 12 3Z"/><path d="M10 14.5a2.2 2.2 0 0 0 2 1.6"/>',
  tire: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.5"/><path d="M12 3.5v5M12 15.5v5M3.5 12h5M15.5 12h5"/>',
  scan: '<path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16"/><path d="M7 12h2.5l1.5-3 2 6 1.5-3H17"/>',
  wrench: '<path d="M14.7 6.3a4 4 0 0 0 5 5l-8.9 8.9a2.1 2.1 0 0 1-3-3l8.9-8.9a4 4 0 0 0-2-2Z"/><path d="M14.7 6.3 17 4"/>',
  snow: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/><path d="m9.5 4.5 2.5 2 2.5-2M9.5 19.5l2.5-2 2.5 2"/>',
  chat: '<path d="M5 5h14a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 19 17h-7l-4.5 3.5V17H5a1.5 1.5 0 0 1-1.5-1.5v-9A1.5 1.5 0 0 1 5 5Z"/><path d="M8.5 10.5h7M8.5 13.5h4"/>',
};
