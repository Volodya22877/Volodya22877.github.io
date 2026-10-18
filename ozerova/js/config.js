// Настройки выкладки. Поменять имя бота везде (и в ссылках HTML): node tools/set-bot.mjs <username>
export const CONFIG = {
  bot: 'ozerova_psy_bot', // @username бота из @BotFather
  // адрес Cloudflare Worker бота, например https://ozerova-bot.<аккаунт>.workers.dev
  // пусто — форма работает в демо-режиме, «ближайшее окно» считается по модели
  api: '',
  site: 'https://volodya22877.github.io/ozerova/',
};
export const tgLink = (payload) => `https://t.me/${CONFIG.bot}?start=${payload}`;
