// Тексты интерфейса и форматирование чисел/единиц для RU и EN.

export const UI = {
  ru: {
    docTitle: 'PROJEKT COSMOS — Солнечная система в браузере',
    kicker: 'Интерактивная модель',
    demoBadge: 'Демонстрационный проект',
    scrollHint: 'Листай ниже — о проекте и переход к модели',
    aboutTitle: 'О проекте',
    aboutText: 'PROJEKT COSMOS — демонстрационный проект: интерактивная модель Солнечной системы, которая работает прямо в браузере. Без установки, без плагинов и без единой картинки — всё, что ты видишь, рисует код в реальном времени.',
    card1t: '3D в браузере',
    card1: 'WebGL 2 и Three.js: живая сцена с пролётами камеры, инерцией и физикой орбит.',
    card2t: 'Ни одной текстуры',
    card2: 'Поверхности планет, облака, кольца, туманности и чёрные дыры — процедурные шейдеры на GLSL.',
    card3t: 'Реальные данные',
    card3: 'Орбиты по законам Кеплера, настоящие характеристики планет, их спутники, МКС и Хаббл.',
    card4t: 'ПК и телефон',
    card4: 'Адаптивный интерфейс, тач-жесты и облегчённый режим рендера для мобильных.',
    numTitle: 'В цифрах',
    num1: 'планет на орбитах по законам Кеплера',
    num2: 'спутников и аппаратов — от МКС до Тритона',
    num3: 'объекта дальнего космоса с подписями: галактики, туманности, чёрные дыры',
    num4: 'картинок-текстур — всё рисуют шейдеры',
    num5: 'КБ собственного кода (Three.js — отдельно)',
    num6: 'минуты длится земной год при скорости 1×',
    lookTitle: 'На что посмотреть',
    look1t: 'Солнце вблизи',
    look1: 'Пятна с полутенью, качающиеся корональные петли, протуберанец; раз в 8–20 секунд — вспышка и выброс плазмы.',
    look2t: 'Сатурн',
    look2: 'Деление Кассини и щель Энке в кольцах, тень планеты на кольцах и колец на планете.',
    look3t: 'Земля',
    look3: 'Облака, сумеречная полоса на границе дня и ночи, рядом летают МКС и Хаббл.',
    look4t: 'Юпитер',
    look4: 'Полосы и вихри, Большое красное пятно и четыре галилеевых спутника.',
    look5t: 'Чёрная дыра',
    look5: '3D-воронка, в которую спиралью затягивает вещество. Покрути камеру вниз — она под плоскостью системы.',
    look6t: 'Ускорение 100×',
    look6: 'Планеты бегут по орбитам, поверхности кипят, галактики и туманности оживают быстрее.',
    howTitle: 'Как управлять',
    howPc: 'Мышь и клавиатура',
    howTouch: 'Телефон и планшет',
    kClick: 'Клик',
    dClick: 'по планете — пролёт к ней и карточка с данными',
    kDrag: 'Перетаскивание',
    dDrag: 'вращать камеру вокруг цели',
    kWheel: 'Колесо',
    dWheel: 'приблизить или отдалить',
    dArrows: 'соседняя планета',
    dEsc: 'назад на карту',
    dSpeed: 'скорость времени, есть пауза',
    kTap: 'Тап',
    dTap: 'по планете или подписи — выбрать',
    kSwipe: 'Свайп',
    dSwipe: 'вращать камеру',
    kPinch: 'Щипок',
    dPinch: 'приблизить или отдалить',
    kSheet: 'Шторка',
    dSheet: 'смахни вниз — свернуть, вверх — развернуть',
    offerTitle: 'Что это значит для вашего проекта',
    offerText: 'Этот сайт — демонстрация подхода. Тем же способом можно сделать страницу, которую запоминают.',
    offer1t: 'Промо с вау-эффектом',
    offer1: '3D-сцена вместо статичной картинки: товар, бренд или идея, которую хочется покрутить.',
    offer2t: 'Интерактивная подача',
    offer2: 'Модели, схемы и карты, где клиент сам кликает и разбирается, — вместо скучных слайдов.',
    offer3t: 'Лёгкость и скорость',
    offer3: 'Графика рисуется кодом, а не тяжёлыми файлами; качество подстраивается под ПК и телефон.',
    techTitle: 'Как сделано',
    tech1: 'Three.js r160 · WebGL 2 · ES-модули без сборщика',
    tech2: 'GLSL: симплекс-шум, фрактальный шум, клеточные кратеры, полосы газовых гигантов',
    tech3: 'Камера с инерцией, кривыми Безье и упругими границами зума',
    tech4: 'Автоподстройка качества рендера под мощность устройства',
    tech5: 'Интерфейс на русском и английском',
    ctaTitle: 'Готов к полёту?',
    ctaText: 'Окно раскроется — и ты окажешься в космосе. Кликай по планетам, крути камеру, ускоряй время.',
    demoSign: 'Демо для портфолио · WebGL / Three.js · 2026',
    tagline: 'Солнечная система прямо во вкладке браузера. Каждая планета нарисована кодом — ни одной картинки.',
    launch: 'Перейти к модели',
    loading: 'Собираем Вселенную…',
    hintMap: 'Кликни по планете · тяни — вращать · колесо — масштаб',
    hintFocus: 'Тяни — облететь · колесо — масштаб · ← → — соседи · Esc — карта',
    hintMapTouch: 'Тапни по планете · веди пальцем — вращать · щипок — масштаб',
    hintFocusTouch: 'Веди пальцем — облететь · щипок — масштаб',
    sheetCollapse: 'Свернуть описание',
    sheetExpand: 'Развернуть описание',
    toMap: 'Карта',
    fact: 'Факт',
    time: 'Время',
    pause: 'Пауза',
    scaleNote: 'Размеры и расстояния не в масштабе',
    moonsNote: 'Число спутников — по данным на март 2026 года',
    credit: 'Three.js · процедурные шейдеры · ни одной текстуры',
    navLabel: 'Объекты Солнечной системы',
    langLabel: 'Switch to English',
    prev: 'Предыдущий объект',
    next: 'Следующий объект',
    noWebgl: 'Браузер не поддерживает WebGL 2 — без него космос не взлетит. Открой сайт в свежем Chrome, Edge, Firefox или Safari.',
    glLost: 'Видеокарта сбросила 3D-сцену (так бывает при переключении GPU или сбое драйвера). Обнови страницу — полёт начнётся заново.',
    stats: {
      diameter: 'Диаметр',
      distance: 'От Солнца',
      distanceEarth: 'От Земли',
      year: 'Год',
      orbitPeriod: 'Оборот вокруг Земли',
      rotation: 'Оборот вокруг оси',
      temp: 'Температура',
      surfaceTemp: 'Поверхность',
      coreTemp: 'Ядро',
      age: 'Возраст',
      moons: 'Спутники',
      gravity: 'Гравитация',
    },
  },
  en: {
    docTitle: 'PROJEKT COSMOS — the Solar System in your browser',
    kicker: 'Interactive model',
    demoBadge: 'Demo project',
    scrollHint: 'Scroll down — about the project and the way into the model',
    aboutTitle: 'About',
    aboutText: 'PROJEKT COSMOS is a demo project: an interactive model of the Solar System that runs right in the browser. No install, no plugins and not a single image — everything you see is drawn by code in real time.',
    card1t: '3D in the browser',
    card1: 'WebGL 2 and Three.js: a living scene with camera flights, inertia and orbital physics.',
    card2t: 'Zero textures',
    card2: 'Planet surfaces, clouds, rings, nebulae and black holes are procedural GLSL shaders.',
    card3t: 'Real data',
    card3: 'Kepler orbits, real planetary figures, their moons, the ISS and Hubble.',
    card4t: 'Desktop and mobile',
    card4: 'Responsive interface, touch gestures and a lighter rendering mode for phones.',
    numTitle: 'By the numbers',
    num1: 'planets on Kepler orbits',
    num2: 'moons and spacecraft — from the ISS to Triton',
    num3: 'labelled deep-space objects: galaxies, nebulae, black holes',
    num4: 'texture images — shaders draw everything',
    num5: 'KB of own code (Three.js not counted)',
    num6: 'minutes for one Earth year at 1× speed',
    lookTitle: 'What to look at',
    look1t: 'The Sun up close',
    look1: 'Sunspots with penumbrae, swaying coronal loops, a prominence; every 8–20 seconds a flare and a plasma ejection.',
    look2t: 'Saturn',
    look2: 'The Cassini Division and the Encke Gap, the planet’s shadow on the rings and the rings’ shadow on the planet.',
    look3t: 'Earth',
    look3: 'Clouds, the twilight band between day and night, the ISS and Hubble flying nearby.',
    look4t: 'Jupiter',
    look4: 'Belts and storms, the Great Red Spot and the four Galilean moons.',
    look5t: 'Black hole',
    look5: 'A 3D funnel swallowing matter in a spiral. Tilt the camera down — it lies below the plane of the system.',
    look6t: '100× speed',
    look6: 'Planets race along their orbits, surfaces boil, galaxies and nebulae come alive faster.',
    howTitle: 'Controls',
    howPc: 'Mouse and keyboard',
    howTouch: 'Phone and tablet',
    kClick: 'Click',
    dClick: 'a planet — fly to it and open its card',
    kDrag: 'Drag',
    dDrag: 'orbit the camera around the target',
    kWheel: 'Wheel',
    dWheel: 'zoom in or out',
    dArrows: 'next / previous planet',
    dEsc: 'back to the map',
    dSpeed: 'time speed, with pause',
    kTap: 'Tap',
    dTap: 'a planet or its label — select',
    kSwipe: 'Swipe',
    dSwipe: 'orbit the camera',
    kPinch: 'Pinch',
    dPinch: 'zoom in or out',
    kSheet: 'Sheet',
    dSheet: 'swipe down to collapse, up to expand',
    offerTitle: 'What it means for your project',
    offerText: 'This site demonstrates an approach. The same way you can get a page people remember.',
    offer1t: 'Promo with a wow effect',
    offer1: 'A 3D scene instead of a static picture: a product, brand or idea people want to spin around.',
    offer2t: 'Interactive storytelling',
    offer2: 'Models, diagrams and maps the client explores by clicking — instead of dull slides.',
    offer3t: 'Light and fast',
    offer3: 'Graphics are drawn by code, not heavy files; quality adapts to desktop and phone.',
    techTitle: 'How it is made',
    tech1: 'Three.js r160 · WebGL 2 · ES modules, no bundler',
    tech2: 'GLSL: simplex noise, fractal noise, cellular craters, gas giant bands',
    tech3: 'Camera with inertia, Bézier curves and elastic zoom limits',
    tech4: 'Render quality adapts to the device',
    tech5: 'Interface in Russian and English',
    ctaTitle: 'Ready for take-off?',
    ctaText: 'The window opens up and you are in space. Click planets, spin the camera, speed up time.',
    demoSign: 'Portfolio demo · WebGL / Three.js · 2026',
    tagline: 'The Solar System right in a browser tab. Every planet is drawn with code — not a single image.',
    launch: 'Open the model',
    loading: 'Assembling the Universe…',
    hintMap: 'Click a planet · drag to rotate · scroll to zoom',
    hintFocus: 'Drag to orbit · scroll to zoom · ← → neighbours · Esc — map',
    hintMapTouch: 'Tap a planet · drag to rotate · pinch to zoom',
    hintFocusTouch: 'Drag to orbit · pinch to zoom',
    sheetCollapse: 'Collapse details',
    sheetExpand: 'Expand details',
    toMap: 'Map',
    fact: 'Fact',
    time: 'Time',
    pause: 'Pause',
    scaleNote: 'Sizes and distances are not to scale',
    moonsNote: 'Moon counts as of March 2026',
    credit: 'Three.js · procedural shaders · zero textures',
    navLabel: 'Solar System objects',
    langLabel: 'Переключить на русский',
    prev: 'Previous object',
    next: 'Next object',
    noWebgl: 'Your browser does not support WebGL 2, and space can’t launch without it. Try a recent Chrome, Edge, Firefox or Safari.',
    glLost: 'The graphics card dropped the 3D scene (this happens when switching GPUs or after a driver hiccup). Reload the page to launch again.',
    stats: {
      diameter: 'Diameter',
      distance: 'From the Sun',
      distanceEarth: 'From Earth',
      year: 'Year',
      orbitPeriod: 'Orbit around Earth',
      rotation: 'Spin period',
      temp: 'Temperature',
      surfaceTemp: 'Surface',
      coreTemp: 'Core',
      age: 'Age',
      moons: 'Moons',
      gravity: 'Gravity',
    },
  },
};

export const UNITS = {
  ru: {
    km: 'км', mkm: 'млн км', h: 'ч', c: '°C', mlnC: 'млн °C', ms2: 'м/с²', bnYears: 'млрд лет', count: '',
    days: ['сутки', 'суток', 'суток'], years: ['год', 'года', 'лет'],
  },
  en: {
    km: 'km', mkm: 'mln km', h: 'h', c: '°C', mlnC: 'mln °C', ms2: 'm/s²', bnYears: 'bn years', count: '',
    days: ['day', 'days'], years: ['year', 'years'],
  },
};

export function decimalsOf(v) {
  const s = String(v);
  const i = s.indexOf('.');
  return i < 0 ? 0 : s.length - i - 1;
}

export function formatNumber(v, lang, decimals) {
  const s = v.toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return s.replace('-', '−');
}

// Дробное число в русском требует родительного падежа единственного числа: «11,86 года», «58,6 суток».
function pluralRu(n, forms) {
  if (!Number.isInteger(n)) return forms[1];
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return forms[2];
  if (b === 1) return forms[0];
  if (b >= 2 && b <= 4) return forms[1];
  return forms[2];
}

export function unitText(unit, v, lang) {
  const u = UNITS[lang][unit];
  if (!Array.isArray(u)) return u;
  if (lang === 'ru') return pluralRu(v, u);
  return v === 1 ? u[0] : u[1];
}

// t от 0 до 1 — для анимации счётчика (значение набегает от нуля).
export function formatValue(v, unit, lang, t = 1) {
  const one = (x) => {
    const d = decimalsOf(x);
    const k = 10 ** d;
    const val = t >= 1 ? x : Math.round(x * t * k) / k;
    return formatNumber(val, lang, d);
  };
  let num;
  if (Array.isArray(v)) {
    const hi = one(v[1]);
    num = `${one(v[0])}…${v[0] < 0 && v[1] > 0 ? '+' : ''}${hi}`;
  } else {
    num = one(v);
  }
  const u = unitText(unit, Array.isArray(v) ? v[1] : v, lang);
  return u ? `${num} ${u}` : num;
}
