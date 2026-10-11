// Данные объектов. Характеристики — реальные; radius/orbit — условные размеры сцены (не в масштабе).
// periodDays — реальный период обращения: скорости по орбитам честные, по Кеплеру.
// look — параметры процедурных шейдеров (цвета в 0..1).

export const BODIES = [
  {
    id: 'sun', kind: 'sun', accent: '#ffb347',
    radius: 8.5, orbit: 0, periodDays: 0, phase: 0, rotationHours: 609.1, tilt: 7.25,
    look: {
      seed: [1.3, 4.1, 7.7],
      // активные области (как на снимках SDO): широта/долгота в градусах — в «королевских» поясах ±5…35°
      regions: [
        { lat: 18, lon: 20, size: 1.2 },
        { lat: -14, lon: 80, size: 1.0 },
        { lat: 24, lon: 140, size: 1.4 },
        { lat: -26, lon: 200, size: 1.1 },
        { lat: 12, lon: 255, size: 1.3 },
        { lat: -19, lon: 315, size: 1.0 },
      ],
    },
    stats: [
      { k: 'diameter', v: 1392700, u: 'km' },
      { k: 'age', v: 4.6, u: 'bnYears' },
      { k: 'surfaceTemp', v: 5500, u: 'c' },
      { k: 'coreTemp', v: 15, u: 'mlnC' },
      { k: 'rotation', v: 25.4, u: 'days' },
      { k: 'gravity', v: 274, u: 'ms2' },
    ],
    ru: {
      name: 'Солнце',
      type: 'Звезда · жёлтый карлик G2V',
      desc: 'В Солнце сосредоточено 99,86% всей массы Солнечной системы. Каждую секунду его ядро превращает в гелий около 600 миллионов тонн водорода — эта энергия освещает и греет всё вокруг.',
      fact: 'Свет, который ты видишь, ушёл с поверхности Солнца 8 минут 20 секунд назад. А энергия, из которой он родился, выбиралась из ядра наружу десятки тысяч лет.',
    },
    en: {
      name: 'Sun',
      type: 'Star · yellow dwarf G2V',
      desc: 'The Sun holds 99.86% of the Solar System’s mass. Every second its core fuses about 600 million tonnes of hydrogen into helium — and that energy lights and warms everything around it.',
      fact: 'The light you see left the Sun’s surface 8 minutes 20 seconds ago. The energy behind it spent tens of thousands of years crawling out from the core.',
    },
  },
  {
    id: 'mercury', kind: 'rocky', accent: '#b9b2a8',
    radius: 0.75, orbit: 16, periodDays: 87.97, phase: 30, rotationHours: 1407.6, tilt: 0.03,
    look: {
      // серо-бурый, с тёмным «низкоотражающим» веществом и яркими лучевыми кратерами (Куйпер, Хокусай)
      // красно-обугленный: ржаво-бурая корка, угольные провалы и трещины, пепельные налёты;
      // на дневной стороне камень краснеет от жара и в трещинах тлеет, ночью угли гаснут
      seed: [3.1, 7.4, 1.2], colA: [0.24, 0.12, 0.08], colB: [0.5, 0.27, 0.17], colC: [0.07, 0.045, 0.035],
      maria: 0.55, bump: 0.05, rays: 0.15, scorch: 1,
      atmo: { color: [1.0, 0.3, 0.12], shell: 1.05, glow: 0.5, rim: 0.35, sunset: 0 },
    },
    stats: [
      { k: 'diameter', v: 4879, u: 'km' },
      { k: 'distance', v: 57.9, u: 'mkm' },
      { k: 'year', v: 88, u: 'days' },
      { k: 'rotation', v: 58.6, u: 'days' },
      { k: 'temp', v: [-173, 427], u: 'c' },
      { k: 'moons', v: 0, u: 'count' },
      { k: 'gravity', v: 3.7, u: 'ms2' },
    ],
    ru: {
      name: 'Меркурий',
      type: 'Каменистая планета',
      desc: 'Самая маленькая планета и самая близкая к Солнцу. Атмосферы почти нет, тепло не держится: днём камни раскаляются до +427 °C, а ночью остывают до −173 °C.',
      fact: 'Год на Меркурии длится 88 земных суток, а солнечные сутки — 176. Сутки там вдвое длиннее года.',
    },
    en: {
      name: 'Mercury',
      type: 'Rocky planet',
      desc: 'The smallest planet and the closest to the Sun. With almost no atmosphere to hold heat, its rocks bake at +427 °C by day and freeze to −173 °C at night.',
      fact: 'A year on Mercury lasts 88 Earth days, but one solar day lasts 176. A day there is twice as long as a year.',
    },
  },
  {
    id: 'venus', kind: 'venus', accent: '#e8c98a',
    radius: 1.35, orbit: 22, periodDays: 224.7, phase: 140, rotationHours: -5832.5, tilt: 2.6,
    look: {
      seed: [5.2, 1.9, 8.8], colA: [0.80, 0.66, 0.42], colB: [0.97, 0.90, 0.72], colC: [0.72, 0.52, 0.28],
      atmo: { color: [1.0, 0.82, 0.5], shell: 1.09, glow: 1.0, rim: 0.7, sunset: 0 },
    },
    stats: [
      { k: 'diameter', v: 12104, u: 'km' },
      { k: 'distance', v: 108.2, u: 'mkm' },
      { k: 'year', v: 224.7, u: 'days' },
      { k: 'rotation', v: 243, u: 'days' },
      { k: 'temp', v: 464, u: 'c' },
      { k: 'moons', v: 0, u: 'count' },
      { k: 'gravity', v: 8.87, u: 'ms2' },
    ],
    ru: {
      name: 'Венера',
      type: 'Каменистая планета',
      desc: 'Самая горячая планета системы, хотя Меркурий ближе к Солнцу. Плотная углекислая атмосфера и облака серной кислоты держат на поверхности +464 °C и давление в 92 раза выше земного.',
      fact: 'Венера вращается в обратную сторону — Солнце там встаёт на западе. А один оборот вокруг оси (243 суток) у неё длиннее года (225 суток).',
    },
    en: {
      name: 'Venus',
      type: 'Rocky planet',
      desc: 'The hottest planet, even though Mercury is closer to the Sun. A thick CO₂ atmosphere and sulfuric acid clouds trap heat at +464 °C, with surface pressure 92 times Earth’s.',
      fact: 'Venus spins backwards — the Sun rises in the west there. And one turn on its axis (243 days) takes longer than its year (225 days).',
    },
  },
  {
    id: 'earth', kind: 'earth', accent: '#6fb4ff',
    radius: 1.45, orbit: 30, periodDays: 365.25, phase: 220, rotationHours: 23.93, tilt: 23.44,
    look: {
      // без рельефа: под скользящим углом (вид с орбиты на обложке) экранный бамп рисует ступеньки
      seed: [2.7, 9.1, 4.4], bump: 0,
      atmo: { color: [0.35, 0.62, 1.0], shell: 1.08, glow: 1.4, rim: 0.9, sunset: 1 },
    },
    stats: [
      { k: 'diameter', v: 12742, u: 'km' },
      { k: 'distance', v: 149.6, u: 'mkm' },
      { k: 'year', v: 365.25, u: 'days' },
      { k: 'rotation', v: 23.9, u: 'h' },
      { k: 'temp', v: 15, u: 'c' },
      { k: 'moons', v: 1, u: 'count' },
      { k: 'gravity', v: 9.81, u: 'ms2' },
    ],
    ru: {
      name: 'Земля',
      type: 'Каменистая планета',
      desc: 'Единственное известное место во Вселенной, где есть жизнь. Вода покрывает 71% поверхности, а магнитное поле и атмосфера защищают нас от солнечного ветра и радиации.',
      fact: 'Земля несётся вокруг Солнца со скоростью около 30 км/с. Пока ты читаешь эту строку, мы пролетаем примерно сотню километров.',
    },
    en: {
      name: 'Earth',
      type: 'Rocky planet',
      desc: 'The only place in the Universe known to harbour life. Water covers 71% of the surface, while the magnetic field and atmosphere shield us from the solar wind and radiation.',
      fact: 'Earth races around the Sun at about 30 km/s. While you were reading this line, we flew roughly a hundred kilometres.',
    },
  },
  {
    id: 'moon', kind: 'rocky', accent: '#c9c9cf', parent: 'earth', locked: true,
    radius: 0.4, orbit: 3.4, periodDays: 27.32, phase: 0, rotationHours: 655.7, tilt: 6.7,
    look: {
      seed: [8.3, 2.2, 6.1], colA: [0.42, 0.42, 0.43], colB: [0.70, 0.70, 0.70], colC: [0.22, 0.22, 0.24],
      maria: 0.85, bump: 0.03, rays: 0.3,
    },
    stats: [
      { k: 'diameter', v: 3474, u: 'km' },
      { k: 'distanceEarth', v: 384400, u: 'km' },
      { k: 'orbitPeriod', v: 27.3, u: 'days' },
      { k: 'rotation', v: 27.3, u: 'days' },
      { k: 'temp', v: [-173, 127], u: 'c' },
      { k: 'gravity', v: 1.62, u: 'ms2' },
    ],
    ru: {
      name: 'Луна',
      type: 'Естественный спутник Земли',
      desc: 'Скорее всего, Луна родилась после столкновения молодой Земли с телом размером с Марс. Она стабилизирует наклон земной оси и раскачивает океаны приливами.',
      fact: 'Луна всегда повёрнута к нам одной стороной, а ещё каждый год отдаляется от Земли примерно на 3,8 см.',
    },
    en: {
      name: 'Moon',
      type: 'Earth’s natural satellite',
      desc: 'The Moon most likely formed after a Mars-sized body slammed into the young Earth. It steadies the tilt of Earth’s axis and drives the ocean tides.',
      fact: 'The Moon always shows us the same face — and drifts about 3.8 cm farther from Earth every year.',
    },
  },
  {
    id: 'mars', kind: 'mars', accent: '#ff7a4d',
    radius: 1.0, orbit: 38, periodDays: 687, phase: 300, rotationHours: 24.62, tilt: 25.19,
    look: {
      seed: [6.6, 3.3, 2.9], colA: [0.55, 0.24, 0.11], colB: [0.78, 0.47, 0.26], colC: [0.30, 0.14, 0.08],
      bump: 0.02,
      atmo: { color: [0.95, 0.55, 0.35], shell: 1.035, glow: 0.45, rim: 0.35, sunset: 0 },
    },
    stats: [
      { k: 'diameter', v: 6779, u: 'km' },
      { k: 'distance', v: 227.9, u: 'mkm' },
      { k: 'year', v: 687, u: 'days' },
      { k: 'rotation', v: 24.6, u: 'h' },
      { k: 'temp', v: -63, u: 'c' },
      { k: 'moons', v: 2, u: 'count' },
      { k: 'gravity', v: 3.71, u: 'ms2' },
    ],
    ru: {
      name: 'Марс',
      type: 'Каменистая планета',
      desc: 'Красный цвет Марсу дают оксиды железа — по сути, ржавчина. Здесь стоит вулкан Олимп высотой около 22 км, в два с половиной раза выше Эвереста.',
      fact: 'Пылевые бури на Марсе могут накрыть всю планету и бушевать месяцами.',
    },
    en: {
      name: 'Mars',
      type: 'Rocky planet',
      desc: 'Iron oxides — basically rust — give Mars its red colour. It is home to Olympus Mons, a volcano about 22 km high, two and a half times taller than Everest.',
      fact: 'Martian dust storms can wrap the entire planet and rage for months.',
    },
  },
  {
    id: 'jupiter', kind: 'gas', accent: '#e0a875',
    radius: 4.3, orbit: 64, periodDays: 4333, phase: 60, rotationHours: 9.93, tilt: 3.13,
    look: {
      seed: [4.4, 8.8, 1.1],
      colA: [0.86, 0.78, 0.64], colB: [0.60, 0.41, 0.27], colC: [0.80, 0.57, 0.36], colD: [0.97, 0.94, 0.88],
      bands: { freq: 15, turb: 0.07, flow: 0.05, contrast: 0.9 },
      spot: { lat: -0.39, lon: 0.6, w: 0.22, h: 0.1, color: [0.78, 0.34, 0.18], strength: 0.9 },
      atmo: { color: [0.95, 0.82, 0.65], shell: 1.03, glow: 0.45, rim: 0.35, sunset: 0 },
    },
    stats: [
      { k: 'diameter', v: 139820, u: 'km' },
      { k: 'distance', v: 778.5, u: 'mkm' },
      { k: 'year', v: 11.86, u: 'years' },
      { k: 'rotation', v: 9.9, u: 'h' },
      { k: 'temp', v: -110, u: 'c' },
      { k: 'moons', v: 101, u: 'count' },
      { k: 'gravity', v: 24.79, u: 'ms2' },
    ],
    ru: {
      name: 'Юпитер',
      type: 'Газовый гигант',
      desc: 'Юпитер в два с половиной раза массивнее всех остальных планет вместе взятых. Его Большое красное пятно — шторм шире Земли, за которым наблюдают непрерывно с 1830-х годов.',
      fact: 'Юпитер вращается быстрее всех планет: сутки там короче 10 часов, поэтому он заметно сплюснут у полюсов.',
    },
    en: {
      name: 'Jupiter',
      type: 'Gas giant',
      desc: 'Jupiter is two and a half times more massive than all the other planets combined. Its Great Red Spot is a storm wider than Earth, watched continuously since the 1830s.',
      fact: 'Jupiter spins faster than any other planet: a day lasts under 10 hours, which visibly flattens it at the poles.',
    },
  },
  {
    id: 'saturn', kind: 'gas', accent: '#e8d29a',
    radius: 3.6, orbit: 86, periodDays: 10759, phase: 170, rotationHours: 10.66, tilt: 26.73,
    look: {
      seed: [7.7, 2.6, 5.5],
      colA: [0.88, 0.79, 0.58], colB: [0.74, 0.61, 0.40], colC: [0.91, 0.84, 0.65], colD: [0.96, 0.91, 0.78],
      bands: { freq: 18, turb: 0.03, flow: 0.03, contrast: 0.5 },
      rings: { type: 'saturn', inner: 1.24, outer: 2.27, colA: [0.86, 0.78, 0.63], colB: [0.62, 0.55, 0.45] },
      atmo: { color: [0.97, 0.86, 0.62], shell: 1.03, glow: 0.4, rim: 0.3, sunset: 0 },
    },
    stats: [
      { k: 'diameter', v: 116460, u: 'km' },
      { k: 'distance', v: 1433.5, u: 'mkm' },
      { k: 'year', v: 29.46, u: 'years' },
      { k: 'rotation', v: 10.7, u: 'h' },
      { k: 'temp', v: -140, u: 'c' },
      { k: 'moons', v: 285, u: 'count' },
      { k: 'gravity', v: 10.44, u: 'ms2' },
    ],
    ru: {
      name: 'Сатурн',
      type: 'Газовый гигант',
      desc: 'Кольца Сатурна — бесчисленные куски льда и камня, от пылинки до глыбы размером с дом. Основные кольца имеют в поперечнике около 270 000 км, а толщину в основном всего в десятки метров.',
      fact: 'Средняя плотность Сатурна меньше плотности воды — в достаточно большом океане он бы не утонул.',
    },
    en: {
      name: 'Saturn',
      type: 'Gas giant',
      desc: 'Saturn’s rings are countless chunks of ice and rock, from dust grains to house-sized boulders. The main rings span about 270,000 km, yet are mostly only tens of metres thick.',
      fact: 'Saturn’s average density is lower than water’s — in a big enough ocean, it would float.',
    },
  },
  {
    id: 'uranus', kind: 'gas', accent: '#8fe3ec',
    radius: 2.3, orbit: 106, periodDays: 30687, phase: 260, rotationHours: 17.24, tilt: 97.77,
    look: {
      seed: [9.9, 5.5, 3.3],
      colA: [0.62, 0.86, 0.89], colB: [0.53, 0.78, 0.84], colC: [0.70, 0.90, 0.92], colD: [0.82, 0.96, 0.97],
      bands: { freq: 8, turb: 0.02, flow: 0.02, contrast: 0.25 },
      rings: { type: 'uranus', inner: 1.6, outer: 2.05, colA: [0.42, 0.43, 0.46], colB: [0.56, 0.56, 0.58] },
      atmo: { color: [0.6, 0.92, 1.0], shell: 1.05, glow: 0.7, rim: 0.6, sunset: 0 },
    },
    stats: [
      { k: 'diameter', v: 50724, u: 'km' },
      { k: 'distance', v: 2871, u: 'mkm' },
      { k: 'year', v: 84, u: 'years' },
      { k: 'rotation', v: 17.2, u: 'h' },
      { k: 'temp', v: -195, u: 'c' },
      { k: 'moons', v: 29, u: 'count' },
      { k: 'gravity', v: 8.69, u: 'ms2' },
    ],
    ru: {
      name: 'Уран',
      type: 'Ледяной гигант',
      desc: 'Уран лежит на боку: его ось наклонена на 98°, вероятно после древнего столкновения. Поэтому каждый полюс 42 года освещён Солнцем, а следующие 42 года проводит во тьме.',
      fact: 'Уран — первая планета, открытая с помощью телескопа: его нашёл Уильям Гершель в 1781 году.',
    },
    en: {
      name: 'Uranus',
      type: 'Ice giant',
      desc: 'Uranus rolls on its side: its axis is tilted 98°, probably after an ancient collision. Each pole gets 42 years of sunlight, then 42 years of darkness.',
      fact: 'Uranus was the first planet discovered with a telescope — William Herschel found it in 1781.',
    },
  },
  {
    id: 'neptune', kind: 'gas', accent: '#5b8bff',
    radius: 2.2, orbit: 124, periodDays: 60190, phase: 335, rotationHours: 16.11, tilt: 28.32,
    look: {
      seed: [1.7, 6.2, 9.4],
      colA: [0.18, 0.33, 0.80], colB: [0.11, 0.22, 0.64], colC: [0.30, 0.48, 0.90], colD: [0.86, 0.91, 1.0],
      bands: { freq: 10, turb: 0.05, flow: 0.05, contrast: 0.55 },
      spot: { lat: -0.35, lon: -1.0, w: 0.16, h: 0.07, color: [0.06, 0.11, 0.36], strength: 0.8 },
      atmo: { color: [0.4, 0.6, 1.0], shell: 1.05, glow: 0.8, rim: 0.7, sunset: 0 },
    },
    stats: [
      { k: 'diameter', v: 49244, u: 'km' },
      { k: 'distance', v: 4498, u: 'mkm' },
      { k: 'year', v: 164.8, u: 'years' },
      { k: 'rotation', v: 16.1, u: 'h' },
      { k: 'temp', v: -200, u: 'c' },
      { k: 'moons', v: 16, u: 'count' },
      { k: 'gravity', v: 11.15, u: 'ms2' },
    ],
    ru: {
      name: 'Нептун',
      type: 'Ледяной гигант',
      desc: 'Самая далёкая планета системы и самая ветреная: ветер там разгоняется до 2000 км/ч. Насыщенный синий цвет ей помогает создавать метан в атмосфере.',
      fact: 'Нептун открыли «на кончике пера» в 1846 году: сначала вычислили, потом нашли в телескоп. Первый полный оборот вокруг Солнца с момента открытия он завершил только в 2011 году.',
    },
    en: {
      name: 'Neptune',
      type: 'Ice giant',
      desc: 'The most distant planet and the windiest: gusts there reach 2,000 km/h. Methane in its atmosphere helps give it that deep blue colour.',
      fact: 'Neptune was found “with a pen” in 1846: first calculated, then spotted through a telescope. It completed its first full orbit since discovery only in 2011.',
    },
  },
];

export const ORDER = BODIES.map((b) => b.id);

// Спутники планет и аппараты у Земли — без инфо-панели: подпись видна, когда выбрана их планета.
// orbit — в сцене (условно), periodDays — реальный (отрицательный — обратное движение, как у Тритона);
// на экране периоды замедлены, иначе Фобос мелькал бы. incl — наклон плоскости орбиты к эклиптике (°).
const ROCK = (a, b, c) => ({ colA: a, colB: b, colC: c, maria: 0.5, bump: 0.03 });
export const DECOR = [
  { id: 'iss', parent: 'earth', craft: 'iss', size: 0.16, orbit: 1.75, seconds: 12, incl: 51.6, ru: 'МКС', en: 'ISS' },
  { id: 'hubble', parent: 'earth', craft: 'hubble', size: 0.12, orbit: 2.05, seconds: 16, incl: 28.5, ru: 'Хаббл', en: 'Hubble' },
  { id: 'phobos', parent: 'mars', radius: 0.13, orbit: 1.7, periodDays: 0.32, look: ROCK([0.35, 0.31, 0.28], [0.5, 0.45, 0.4], [0.25, 0.22, 0.2]), ru: 'Фобос', en: 'Phobos' },
  { id: 'deimos', parent: 'mars', radius: 0.09, orbit: 2.4, periodDays: 1.26, look: ROCK([0.42, 0.38, 0.33], [0.58, 0.53, 0.46], [0.3, 0.27, 0.24]), ru: 'Деймос', en: 'Deimos' },
  { id: 'io', parent: 'jupiter', radius: 0.36, orbit: 6.4, periodDays: 1.77, look: { ...ROCK([0.86, 0.72, 0.26], [0.96, 0.9, 0.55], [0.55, 0.24, 0.07]), maria: 0.7 }, ru: 'Ио', en: 'Io' },
  { id: 'europa', parent: 'jupiter', radius: 0.31, orbit: 7.8, periodDays: 3.55, look: { ...ROCK([0.78, 0.72, 0.62], [0.94, 0.91, 0.85], [0.6, 0.45, 0.32]), bump: 0.01 }, ru: 'Европа', en: 'Europa' },
  { id: 'ganymede', parent: 'jupiter', radius: 0.5, orbit: 9.6, periodDays: 7.15, look: ROCK([0.45, 0.42, 0.38], [0.68, 0.65, 0.6], [0.32, 0.3, 0.27]), ru: 'Ганимед', en: 'Ganymede' },
  { id: 'callisto', parent: 'jupiter', radius: 0.46, orbit: 12, periodDays: 16.7, look: ROCK([0.3, 0.28, 0.25], [0.48, 0.45, 0.4], [0.2, 0.19, 0.17]), ru: 'Каллисто', en: 'Callisto' },
  { id: 'enceladus', parent: 'saturn', radius: 0.14, orbit: 9.4, periodDays: 1.37, look: { ...ROCK([0.88, 0.9, 0.92], [0.98, 0.99, 1.0], [0.75, 0.8, 0.85]), bump: 0.01 }, ru: 'Энцелад', en: 'Enceladus' },
  { id: 'rhea', parent: 'saturn', radius: 0.2, orbit: 11, periodDays: 4.52, look: ROCK([0.6, 0.58, 0.55], [0.8, 0.78, 0.75], [0.45, 0.43, 0.4]), ru: 'Рея', en: 'Rhea' },
  { id: 'titan', parent: 'saturn', kind: 'venus', radius: 0.5, orbit: 14, periodDays: 15.95, look: { colA: [0.78, 0.5, 0.18], colB: [0.9, 0.66, 0.3], colC: [0.6, 0.36, 0.12], atmo: { color: [1.0, 0.65, 0.3], shell: 1.12, glow: 0.9, rim: 0.6, sunset: 0 } }, ru: 'Титан', en: 'Titan' },
  { id: 'miranda', parent: 'uranus', radius: 0.12, orbit: 4.2, periodDays: 1.41, look: ROCK([0.5, 0.5, 0.5], [0.7, 0.7, 0.7], [0.35, 0.35, 0.36]), ru: 'Миранда', en: 'Miranda' },
  { id: 'titania', parent: 'uranus', radius: 0.22, orbit: 5.6, periodDays: 8.71, look: ROCK([0.52, 0.5, 0.48], [0.7, 0.68, 0.66], [0.38, 0.37, 0.36]), ru: 'Титания', en: 'Titania' },
  { id: 'oberon', parent: 'uranus', radius: 0.21, orbit: 7, periodDays: 13.46, look: ROCK([0.45, 0.42, 0.4], [0.62, 0.58, 0.55], [0.32, 0.3, 0.28]), ru: 'Оберон', en: 'Oberon' },
  { id: 'triton', parent: 'neptune', radius: 0.3, orbit: 5, periodDays: -5.88, incl: 157, look: { ...ROCK([0.78, 0.68, 0.64], [0.92, 0.86, 0.82], [0.6, 0.5, 0.48]), bump: 0.015 }, ru: 'Тритон', en: 'Triton' },
];

// Палитра светящейся пыли — бело-голубая, без красных тонов: пыль светится отражённым звёздным светом.
export const DUST_TINTS = [[0.85, 0.9, 1.0], [0.7, 0.82, 1.0], [1.0, 1.0, 1.0], [0.6, 0.75, 1.0]];

// Объекты дальнего космоса на небе — художественные, не в масштабе. az/el — направление (°), dist — расстояние.
export const ARTIFACTS = [
  { id: 'blackhole', type: 'blackhole', funnel: true, az: 30, el: -48, dist: 2500, size: 520, ru: 'Чёрная дыра', en: 'Black hole' },
  { id: 'galaxy', type: 'galaxy', az: 175, el: -42, dist: 2700, size: 520, tilt: 0.45, color: [0.55, 0.65, 1.0], color2: [1.0, 0.85, 0.6], ru: 'Галактика', en: 'Galaxy' },
  { id: 'galaxy2', type: 'galaxy', az: 62, el: -20, dist: 2900, size: 360, tilt: 0.8, color: [0.85, 0.7, 1.0], color2: [1.0, 0.95, 0.85], ru: 'Галактика', en: 'Galaxy' },
  { id: 'galaxy3', type: 'galaxy', az: 290, el: -30, dist: 2900, size: 300, tilt: 0.25, color: [0.6, 0.85, 1.0], color2: [1.0, 0.9, 0.75], ru: 'Галактика', en: 'Galaxy' },
  { id: 'nebula-blue', type: 'nebula', az: 140, el: -62, dist: 2600, size: 900, color: [0.15, 0.45, 1.0], color2: [0.6, 0.9, 1.0], ru: 'Голубая туманность', en: 'Blue nebula' },
  { id: 'nebula-pink', type: 'nebula', az: 220, el: -35, dist: 2600, size: 800, color: [0.9, 0.25, 0.6], color2: [0.45, 0.4, 1.0], ru: 'Розовая туманность', en: 'Pink nebula' },
  { id: 'nebula-teal', type: 'nebula', az: 345, el: -58, dist: 2600, size: 760, color: [0.1, 0.7, 0.7], color2: [0.5, 0.6, 1.0], ru: 'Бирюзовая туманность', en: 'Teal nebula' },
  { id: 'dust-white', type: 'nebula', az: 85, el: -70, dist: 2500, size: 950, color: [0.75, 0.82, 1.0], color2: [1.0, 1.0, 1.0], ru: 'Пылевое облако', en: 'Dust cloud' },
  { id: 'dust-white2', type: 'nebula', az: 250, el: 5, dist: 2500, size: 850, color: [0.7, 0.8, 1.0], color2: [0.95, 0.97, 1.0], ru: 'Пылевое облако', en: 'Dust cloud' },
  { id: 'cluster', type: 'cluster', az: 10, el: -25, dist: 2500, size: 220, ru: 'Звёздное скопление', en: 'Star cluster' },
  { id: 'cluster2', type: 'cluster', az: 200, el: -12, dist: 2500, size: 180, ru: 'Звёздное скопление', en: 'Star cluster' },
  // верхняя полусфера — чтобы космос был насыщенным со всех сторон
  { id: 'galaxy4', type: 'galaxy', az: 120, el: 45, dist: 2900, size: 600, tilt: 0.6, color: [0.7, 0.65, 1.0], color2: [1.0, 0.97, 0.9], ru: 'Галактика', en: 'Galaxy' },
  { id: 'galaxy5', type: 'galaxy', az: 340, el: 15, dist: 2900, size: 450, tilt: 0.35, color: [0.6, 0.8, 1.0], color2: [1.0, 0.95, 0.85], ru: 'Галактика', en: 'Galaxy' },
  { id: 'nebula-violet', type: 'nebula', az: 30, el: 35, dist: 2600, size: 1100, color: [0.45, 0.3, 1.0], color2: [0.9, 0.88, 1.0], ru: 'Фиолетовая туманность', en: 'Violet nebula' },
  { id: 'nebula-gold', type: 'nebula', az: 260, el: 50, dist: 2600, size: 1000, color: [0.95, 0.82, 0.55], color2: [1.0, 0.97, 0.9], ru: 'Золотистая туманность', en: 'Golden nebula' },
  { id: 'dust-white3', type: 'nebula', az: 180, el: 65, dist: 2500, size: 1300, color: [0.78, 0.85, 1.0], color2: [1.0, 1.0, 1.0], ru: 'Пылевое облако', en: 'Dust cloud' },
  { id: 'cluster3', type: 'cluster', az: 300, el: 30, dist: 2500, size: 260, ru: 'Звёздное скопление', en: 'Star cluster' },
  { id: 'bluegiant2', type: 'star', color: [0.6, 0.75, 1.0], az: 75, el: 25, dist: 2400, size: 180, ru: 'Голубой гигант', en: 'Blue giant' },
  { id: 'blackhole2', type: 'blackhole', az: 220, el: 28, dist: 2600, size: 380, ru: 'Чёрная дыра', en: 'Black hole' },
  { id: 'redgiant', type: 'star', color: [1.0, 0.45, 0.25], az: 102, el: -56, dist: 2400, size: 170, ru: 'Красный сверхгигант', en: 'Red supergiant' },
  { id: 'bluegiant', type: 'star', color: [0.55, 0.7, 1.0], az: 255, el: -50, dist: 2400, size: 150, ru: 'Голубой гигант', en: 'Blue giant' },
  { id: 'yellowgiant', type: 'star', color: [1.0, 0.85, 0.55], az: 320, el: 8, dist: 2400, size: 130, ru: 'Жёлтый гигант', en: 'Yellow giant' },
];
