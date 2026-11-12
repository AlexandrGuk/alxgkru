# AGENTS.md — руководство для AI-агентов

Документ для AI-ассистентов, которые помогают развивать и поддерживать alxgk.site.

## Общая информация

**Проект:** alxgk.site — небольшие онлайн-инструменты и одна игра
**Адрес:** https://alxgk.site/
**Стек:** HTML, CSS, vanilla JavaScript, PHP (Apache)
**Стиль:** меню 16-битной RPG — синие окна с пиксельной рамкой, оранжевый курсор

## Дизайн-система

Общие токены и компоненты лежат в `assets/retro.css`. Каждая страница, кроме Game Forest, подключает этот файл и шрифты Google Fonts. Свои стили страница описывает только для того, чего нет в общем файле.

### Токены

```css
--bg-primary: #0a0e27      /* фон страницы */
--window: #121a52          /* плоский фон окна */
--window-bg                /* фон окна: пять ступеней синего сверху вниз */
--window-frame             /* рамка окна: светлая линия 4px и тёмный контур, через box-shadow */
--frame: #e6e9ff           /* светлая линия рамки и обводка кнопок */
--ink: #05071a             /* тёмный контур, фон навигации и кнопок */
--field: #080b22           /* поля ввода и области вывода */
--accent-orange: #ff8c00   /* курсор, главная кнопка, фокус */
--accent-blue: #667eea
--text-primary: #ffffff
--text-secondary: rgba(255, 255, 255, 0.78)
--text-muted: rgba(255, 255, 255, 0.55)
--nav-height: 52px
--font-pixel               /* Press Start 2P */
--font-body                /* Inter */
--font-code                /* JetBrains Mono */
```

### Шрифты

- **Press Start 2P** — только заголовки страниц, названия пунктов меню и навигация. Размер кратен 8px (8, 16, 24, 48), иначе пиксели плывут. Длинный текст им не набирать.
- **Inter** — весь остальной текст и подписи кнопок.
- **JetBrains Mono** — код, поля с кодом и ссылками.

### Компоненты

- `.window` — окно с рамкой и отступами. Чтобы оформить окном существующий блок, достаточно трёх свойств:
  ```css
  background-color: var(--window);
  background-image: var(--window-bg);
  box-shadow: var(--window-frame);
  ```
  Рамка рисуется тенью и выступает на 8px за блок: между соседними окнами и до края экрана оставлять не меньше 12px.
- `.window-title` — подпись окна пиксельным шрифтом.
- `.page-title` — заголовок H1 страницы инструмента.
- `.nav`, `.nav-home` — фиксированная навигация, стрелку перед `alxgk.site` рисует CSS.
- `.btn` — кнопка, `.btn-primary` — главное действие в блоке (одна на блок).

### Правила оформления

- Скруглений, размытия (`backdrop-filter`), полупрозрачных карточек и плавных градиентов нет. Углы прямые, границы 2px или 4px.
- Поля ввода и области вывода: фон `var(--field)`, граница `2px solid var(--ink)`, при фокусе граница `var(--accent-orange)`.
- Таблицы с закреплёнными ячейками кладут на плоский `var(--window)`, а не на `--window-bg`, иначе закреплённые ячейки не совпадут с фоном.
- Анимации — только шагами (`steps()`), с учётом `prefers-reduced-motion`.

### Спрайты

Иконки сервисов — пиксельные SVG 16×16 в `assets/sprites/`, с `shape-rendering="crispEdges"`. Показывать в размере, кратном 16px. Палитра: `#05071a`, `#ffffff`, `#b9c0ee`, `#667eea`, `#3a47b8`, `#ff8c00`, `#ffd24a`, `#46d17a`, `#1f8f55`, `#ff5470`.

`assets/favicon.png` — иконка сайта, `assets/og.png` — картинка для превью ссылок (1200×630).

## Структура проекта

| Путь | Что это |
| --- | --- |
| `index.html` | Главная: меню сервисов |
| `gpu/` | Сравнение видеокарт (`index.html`, `app.js`, `gpus.js`) |
| `json-parser/index.html` | JSON-парсер |
| `html-minifier/index.html` | Минификатор HTML |
| `user-agent/index.html` | Разбор User Agent |
| `uploader/` | Загрузка картинок (`index.php`, `upload.php`, `upload.js`, `index.css`) |
| `cloud/index.php` | Общий текст, хранится в `shared_text.txt` |
| `vin-code/index.html` | Инженерный код электромобиля Q05 Max по VIN |
| `game-forest/index.html` | Black Forest, 3D-шутер на Three.js |
| `assets/` | `retro.css`, спрайты, иконка, картинка превью |
| `robots.txt`, `sitemap.xml`, `.htaccess` | Индексация, редирект с www, кеширование |

## Новая страница

1. Подключить шрифты и общий CSS:
   ```html
   <link rel="preconnect" href="https://fonts.googleapis.com">
   <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
   <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=Press+Start+2P&display=swap" rel="stylesheet">
   <link rel="stylesheet" href="../assets/retro.css">
   ```
2. Добавить навигацию и отступ сверху не меньше `var(--nav-height)`:
   ```html
   <nav class="nav">
       <a href="../" class="nav-home">alxgk.site</a>
       <a href="../">Главная</a>
   </nav>
   ```
3. Один H1 с классом `page-title`.
4. В `<head>`: уникальные `title` и `description`, `canonical`, теги `og:type`, `og:site_name`, `og:title`, `og:description`, `og:url`, `og:image`, `twitter:card`, иконка `../assets/favicon.png`.
5. Добавить пункт в меню на главной (спрайт, название, описание в одну-две фразы) и адрес в `sitemap.xml`.

Страницы, которые не должны попадать в поиск (как `cloud/`), получают `<meta name="robots" content="noindex">` и в `sitemap.xml` не входят.

## Правила кода

- Комментарии минимальные, только на английском и только для неочевидной логики.
- JavaScript: ES6+, vanilla, без лишних зависимостей.
- CSS: переменные из `retro.css`, мобильная вёрстка обязательна (проверять на 375px).
- PHP: обработка ошибок, валидация ввода, безопасная работа с файлами.
- Тексты интерфейса — на русском, простыми словами, без рекламных оборотов.

## Особенности сервисов

- **JSON-парсер:** «Очистить до JSON» проверяет до 1000 символов; разбор при вводе с задержкой 300 мс.
- **Загрузка картинок:** до 5 МБ; jpg, jpeg, png, gif; файлы лежат в `uploader/img/`. `upload.js` находит элементы по классам (`input-url`, `prev-url`, `bb-url`, `create-preview`, `copybutton`, `filename-url`, `width`, `height`, `preview`) — не переименовывать.
- **Общий текст:** один текст на всех, размер ограничен `post_max_size`, URL превращаются в ссылки.
- **Сравнение видеокарт:** `app.js` генерирует разметку с классами из `gpu/index.html`; шапка таблицы закреплена под навигацией на `var(--nav-height)`.

## Деплой

Пуш в `main` — сервер сам забирает изменения в течение минуты. PNG, JPG и ICO кешируются у посетителей на год: новую версию картинки класть под новым именем. CSS, JS, HTML и SVG не кешируются.

## Важно

- **Не удалять** существующие файлы без явного запроса.
- **Не менять** дизайн Game Forest: у игры свой стиль.
- **Сохранять** тёмную тему и общий стиль на всех страницах.
- **Добавлять** навигацию на все новые страницы.
