# Astrum — сайт сервера

Статичный сайт (HTML, CSS, JS без сборки). Открывается из папки `index.html` или выкладывается на GitHub Pages как есть.

## Структура
- `index.html`, `shop.html`, `rules.html`, `wiki.html`, `navigation.html`, `more.html` — страницы
- `assets/css/style.css` — основные стили, `extra.css` — дополнения, `light.css` — светлая тема
- `assets/js/main.js` — меню, тема, вопросы, правила, магазин; `galaxy.js` — пиксельная карта на главной
- `assets/images/` — логотипы (`astrum-logo-dark.png` / `astrum-logo-light.png` для тёмной и светлой темы), фон, слайды, товары

## Что где менять
- **Ссылка кнопки «Начать играть»** и соцсети — в шапке и подвале каждой страницы.
- **Тема** запоминается в `localStorage` (`astrum-theme`), по умолчанию тёмная.
- **Вопросы на главной** — блок `.fx` в `index.html` (две вкладки), стили `.fx*` в `extra.css`.
- **Правила** — `rules.html`; плашки наказаний сверху работают как фильтр, поиск и содержание слева.
- **Магазин** — карточки в `shop.html`, картинки в `assets/images/shop/`.
