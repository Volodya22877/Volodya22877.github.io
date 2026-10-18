// Простые страницы (политика, 404): переключатель темы и ссылки в бота.
import { tgLink } from './config.js';

for (const a of document.querySelectorAll('[data-start]')) a.href = tgLink(a.dataset.start);

const btn = document.getElementById('theme');
const dark = matchMedia('(prefers-color-scheme: dark)');
const current = () => document.documentElement.dataset.theme || (dark.matches ? 'dark' : 'light');
function sync() {
  const isDark = current() === 'dark';
  btn.setAttribute('aria-pressed', String(isDark));
  btn.setAttribute('aria-label', isDark ? 'Светлая тема' : 'Тёмная тема');
}
btn.addEventListener('click', () => {
  const next = current() === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('theme', next); } catch { /* приватный режим */ }
  sync();
});
dark.addEventListener('change', sync);
sync();
