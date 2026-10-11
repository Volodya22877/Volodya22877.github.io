// Процедурные шейдеры: поверхности планет, облака, атмосферы, кольца, корона Солнца, звёзды, пояс астероидов, небо.
// Солнце стоит в начале координат, поэтому направление на свет в любой точке — normalize(-worldPos).
import * as THREE from 'three';

// --- Общие куски GLSL -------------------------------------------------------------------------

// Симплекс-шум 3D: Ian McEwan, Ashima Arts / Stefan Gustavson (MIT).
// Отдельным куском — его можно подключать и в вершинный шейдер (в NOISE есть dFdx, там он не компилируется).
const SNOISE = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
`;

const NOISE = SNOISE + /* glsl */ `
// На телефонах FBM_OCT = 4 (задаётся через defines) — минус пятая часть стоимости самого тяжёлого шума.
#ifndef FBM_OCT
#define FBM_OCT 5
#endif
float fbm(vec3 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < FBM_OCT; i++) { s += a * snoise(p); p = p * 2.02 + vec3(17.1, 3.7, 9.3); a *= 0.5; }
  return s;
}

float fbm3(vec3 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 3; i++) { s += a * snoise(p); p = p * 2.03 + vec3(5.3, 11.9, 2.1); a *= 0.5; }
  return s;
}

vec3 hash33(vec3 p) {
  p = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.xxy + p.yxx) * p.zyx);
}

// Кратеры на клеточном шуме: чаша (отрицательная высота) и вал по краю.
float craters(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  float h = 0.0;
  for (int z = -1; z <= 1; z++)
  for (int y = -1; y <= 1; y++)
  for (int x = -1; x <= 1; x++) {
    vec3 g = vec3(float(x), float(y), float(z));
    vec3 o = hash33(i + g);
    if (o.z < 0.45) continue;
    vec3 d = g + o - f;
    float r = 0.18 + 0.27 * o.x;
    float q = length(d) / r;
    if (q < 1.0) h += (q * q - 1.0) * 0.8;
    h += exp(-pow((q - 1.0) * 4.0, 2.0)) * 0.3;
  }
  return h;
}

// Лучевые кратеры (как Куйпер на Меркурии или Тихо на Луне): редкие молодые кратеры
// с ярким дном и светлыми выбросами-лучами во все стороны.
float rays(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  float s = 0.0;
  for (int z = -1; z <= 1; z++)
  for (int y = -1; y <= 1; y++)
  for (int x = -1; x <= 1; x++) {
    vec3 g = vec3(float(x), float(y), float(z));
    vec3 o = hash33(i + g + 17.0);
    if (o.z < 0.68) continue;
    vec3 d = g + o - f;
    float dist = length(d);
    float streak = smoothstep(0.15, 0.75, snoise(normalize(d) * 9.0 + o * 13.0));
    s += streak * exp(-dist * 1.6) * smoothstep(0.06, 0.16, dist) * 1.3;
    s += (1.0 - smoothstep(0.0, 0.07, dist)) * 0.7;
  }
  return s;
}

// Бамп через производные экрана (метод Mikkelsen, как в bumpmap three.js).
vec3 perturbNormal(vec3 pos, vec3 n, float hgt, float scale) {
  vec3 dpdx = dFdx(pos);
  vec3 dpdy = dFdy(pos);
  float dhdx = dFdx(hgt) * scale;
  float dhdy = dFdy(hgt) * scale;
  vec3 r1 = cross(dpdy, n);
  vec3 r2 = cross(n, dpdx);
  float det = dot(dpdx, r1);
  vec3 grad = sign(det) * (dhdx * r1 + dhdy * r2);
  return normalize(abs(det) * n - grad);
}
`;

// Плотность колец. r — расстояние от центра в радиусах планеты, fw — ширина пикселя по r (антиалиасинг).
const RINGS = /* glsl */ `
float ringLine(float r, float c, float w, float a, float fw) {
  float ww = max(w, fw);
  return exp(-pow((r - c) / ww, 2.0)) * a * (w / ww);
}

// Сатурн: кольцо C, плотное B, деление Кассини, кольцо A со щелью Энке — по реальным радиусам.
float ringDensity(float r, float fw) {
  if (r < 1.24 || r > 2.27) return 0.0;
  float c = smoothstep(1.24, 1.29, r) * (1.0 - smoothstep(1.50, 1.53, r)) * 0.22;
  float b = smoothstep(1.52, 1.57, r) * (1.0 - smoothstep(1.92, 1.95, r)) * 0.92;
  float a = smoothstep(2.025, 2.045, r) * (1.0 - smoothstep(2.24, 2.27, r)) * 0.66;
  float d = c + b + a;
  d *= 1.0 - ringLine(r, 2.216, 0.005, 0.92, fw);
  float fine = snoise(vec3(r * 95.0, 0.5, 0.5)) * 0.5 + 0.5;
  float fine2 = snoise(vec3(r * 310.0, 2.5, 1.5)) * 0.5 + 0.5;
  fine2 = mix(fine2, 0.5, clamp(fw * 310.0, 0.0, 1.0));
  fine = mix(fine, 0.5, clamp(fw * 95.0 - 0.5, 0.0, 1.0));
  d *= 0.55 + 0.3 * fine + 0.15 * fine2;
  return clamp(d, 0.0, 1.0);
}

// Уран: узкие тёмные кольца, самое яркое — эпсилон.
float uranusRings(float r, float fw) {
  float d = 0.0;
  d += ringLine(r, 1.64, 0.006, 0.35, fw);
  d += ringLine(r, 1.67, 0.006, 0.35, fw);
  d += ringLine(r, 1.75, 0.006, 0.45, fw);
  d += ringLine(r, 1.79, 0.006, 0.45, fw);
  d += ringLine(r, 1.85, 0.005, 0.35, fw);
  d += ringLine(r, 1.89, 0.007, 0.5, fw);
  d += ringLine(r, 2.0, 0.014, 0.85, fw);
  return clamp(d, 0.0, 1.0);
}
`;

// --- Поверхности ------------------------------------------------------------------------------

const SURFACE_VARYINGS = /* glsl */ `
varying vec3 vObj;
varying vec3 vNormalW;
varying vec3 vPosW;
varying vec3 vLightObj;
`;

const SURFACE_VERT = /* glsl */ `
${SURFACE_VARYINGS}
void main() {
  vObj = position;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vPosW = wp.xyz;
  mat3 m = mat3(modelMatrix);
  vNormalW = normalize(m * normal);
  vLightObj = transpose(m) * normalize(-wp.xyz);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const SURFACE_FRAG = /* glsl */ `
uniform float uTime;
uniform float uRadius;
uniform vec3 uSeed;
uniform vec3 uColA;
uniform vec3 uColB;
uniform vec3 uColC;
uniform vec3 uColD;
uniform float uMaria;
uniform float uRays;
uniform float uScorch;
uniform float uBump;
uniform vec3 uAtmo;
uniform float uAtmoStrength;
uniform float uBandFreq;
uniform float uTurb;
uniform float uFlow;
uniform float uBandContrast;
uniform vec4 uSpot;
uniform vec3 uSpotCol;
uniform float uSpotStrength;
#ifdef KIND_SUN
// активные области: центры (единичные векторы в системе Солнца) и размеры; вспышка — яркость и номер области
uniform vec3 uAR[6];
uniform float uARSize[6];
uniform float uFlare;
uniform float uFlareIdx;
#endif
${SURFACE_VARYINGS}
${NOISE}
${RINGS}

void main() {
  vec3 p = normalize(vObj);
  vec3 Ng = normalize(vNormalW);
  vec3 L = normalize(-vPosW);
  vec3 V = normalize(cameraPosition - vPosW);
  float ndlG = dot(Ng, L);

  vec3 albedo = vec3(0.5);
  vec3 emissive = vec3(0.0);
  float h = 0.0;
  float spec = 0.0;

#if defined(KIND_SUN)
  float t = uTime * 0.06;
  float mu = max(dot(Ng, V), 0.0);
  // крупные потоки плазмы (супергрануляция)
  float big = fbm(p * 2.0 + vec3(t * 0.6, -t * 0.4, t * 0.3));
  // грануляция: ячейки конвекции — яркие зёрна, тёмные межгранульные прожилки (нули шума),
  // зёрна «кипят» и сносятся крупными потоками; издалека мелочь сглаживаем, чтобы не рябило
  float aa = clamp(1.0 - fwidth(p.x + p.y + p.z) * 45.0, 0.0, 1.0);
  float g1 = smoothstep(0.0, 0.45, abs(snoise(p * 70.0 + vec3(0.0, t * 3.0, 0.0) + big * 0.6)));
  float g2 = smoothstep(0.0, 0.4, abs(snoise(p * 180.0 - vec3(t * 4.0) + big)));
  float gran = mix(0.65, g1 * 0.65 + g2 * 0.35, aa);
  float v = clamp(0.5 + big * 0.35 + (gran - 0.65) * 0.3, 0.0, 1.0);
  vec3 sc = mix(vec3(0.95, 0.36, 0.05), vec3(1.0, 0.7, 0.28), smoothstep(0.15, 0.65, v));
  sc = mix(sc, vec3(1.0, 0.93, 0.72), smoothstep(0.6, 0.95, v));
  // факелы — яркие поля, заметные у края диска
  float fac = smoothstep(0.25, 0.6, fbm3(p * 5.0 + uSeed + vec3(t * 0.2))) * pow(1.0 - mu, 2.0);
  sc += vec3(1.0, 0.85, 0.55) * fac * 0.35;
  // активные области, как на снимках SDO: факельные поля и биполярная пара пятен
  // (ведущее крупнее, хвостовое чуть севернее), у пятен тёмная тень и волокнистая полутень
  vec3 northAx = vec3(0.0, 1.0, 0.0);
  float plage = 0.0;
  float dark = 0.0;
  float flareGlow = 0.0;
  for (int i = 0; i < 6; i++) {
    vec3 c = uAR[i];
    float sz = uARSize[i];
    vec3 east = normalize(cross(northAx, c));
    vec3 nrt = cross(c, east);
    float s = length(p - c);
    // поля факелов мерцают и переливаются
    plage += exp(-pow(s / (0.2 * sz), 2.0)) * (0.55 + 0.45 * snoise(p * 30.0 + float(i) * 7.0 + vec3(0.0, t * 2.5, t * 1.5)));
    for (int k = 0; k < 2; k++) {
      float lead = k == 0 ? 1.0 : 0.0;
      float fi = float(i * 2 + k);
      // пары пятен медленно расходятся и сходятся, а сами пятна «дышат»
      float drift = 1.0 + 0.12 * sin(uTime * 0.11 + fi * 1.3);
      vec3 sc0 = normalize(c + east * 0.08 * sz * drift * (lead * 2.0 - 1.0) + nrt * mix(0.018, -0.01, lead) * sz);
      vec3 dv = p - sc0;
      float ds = length(dv);
      float rs = mix(0.028, 0.04, lead) * sz * (1.0 + 0.1 * sin(uTime * 0.23 + fi * 2.1));
      float a = atan(dot(dv, nrt), dot(dv, east));
      // волокна полутени: течение Эвершеда — рисунок бежит от тени наружу; волокна чуть изгибаются
      float flowR = ds / rs * 6.0 - uTime * 0.6 + fi;
      float fil = sin(a * 46.0 + snoise(vec3(a * 3.0, flowR, fi)) * 2.2) * 0.5 + 0.5;
      fil *= 0.75 + 0.25 * sin(flowR * 3.0 + a * 9.0);
      float pen = smoothstep(rs, rs * 0.55, ds);
      float umb = smoothstep(rs * 0.5, rs * 0.3, ds);
      // светлые точки в тени пятна мигают
      float udots = smoothstep(0.55, 0.9, snoise(dv / rs * 4.0 + vec3(0.0, 0.0, uTime * 0.5 + fi))) * umb * aa;
      dark = max(dark, pen * (0.38 + 0.2 * fil * aa) + umb * (0.5 - udots * 0.18));
    }
    if (abs(float(i) - uFlareIdx) < 0.5) flareGlow = exp(-pow(s / (0.07 * sz), 2.0)) * uFlare;
  }
  sc += vec3(1.0, 0.88, 0.6) * plage * 0.35;
  // тёмные волокна — протуберанцы, видимые на фоне диска
  for (int f = 0; f < 2; f++) {
    vec3 fc = f == 0 ? normalize(vec3(-0.55, 0.35, 0.6)) : normalize(vec3(0.6, -0.28, -0.55));
    float region = exp(-pow(length(p - fc) / 0.2, 2.0));
    float thread = 1.0 - smoothstep(0.0, 0.035, abs(snoise(p * 5.0 + fc * 9.0 + vec3(t * 0.8, 0.0, -t * 0.5))));
    sc *= 1.0 - thread * region * 0.4;
  }
  sc *= 1.0 - dark;
  // вспышка: ослепительное пятно между пятнами активной области
  sc += vec3(1.0, 0.97, 0.9) * flareGlow * 3.5;
  // объём: раскалённый почти белый центр диска, к краю темнеет (закон Эддингтона) и краснеет
  sc = mix(sc, vec3(1.0, 0.95, 0.82), pow(mu, 3.0) * 0.45);
  sc *= 0.3 + 0.7 * pow(mu, 0.55);
  sc = mix(sc * vec3(1.0, 0.45, 0.2), sc, smoothstep(0.0, 0.45, mu));
  gl_FragColor = vec4(sc * 1.32, 1.0);
  return;

#elif defined(KIND_ROCKY)
  float base = fbm(p * 2.5 + uSeed);
  float cr = craters(p * 3.0 + uSeed) * 0.55 + craters(p * 7.0 + uSeed.yzx) * 0.28;
  float crFine = craters(p * 17.0 + uSeed.zxy) * 0.12;
  float maria = smoothstep(0.02, 0.22, fbm3(p * 1.3 + uSeed * 1.7)) * uMaria;
  albedo = mix(uColA, uColB, smoothstep(-0.45, 0.45, base));
  albedo = mix(albedo, uColC, maria);
  albedo *= 0.9 + clamp(cr + crFine, -0.6, 0.4) * 0.3;
#if FBM_OCT > 5
  albedo *= 0.96 + clamp(craters(p * 34.0 + uSeed), -0.5, 0.4) * 0.12; // ещё мельче — только на ПК
#endif
  if (uRays > 0.0) albedo = mix(albedo, uColB * 1.35, clamp(rays(p * 2.8 + uSeed.zxy), 0.0, 1.0) * uRays);
  if (uScorch > 0.0) {
    // красно-обугленная корка: сеть угольных трещин, копоть и пепельные налёты
    float c1 = pow(1.0 - abs(snoise(p * 6.5 + uSeed)), 12.0);
    float c2 = pow(1.0 - abs(snoise(p * 17.0 + uSeed.yzx)), 16.0);
    float cracks = clamp(c1 + c2 * 0.6, 0.0, 1.0);
    float soot = smoothstep(0.05, 0.55, fbm3(p * 3.5 + uSeed.zxy));
    float ash = smoothstep(0.35, 0.7, fbm3(p * 9.0 + uSeed));
    albedo *= (1.0 - cracks * 0.75) * (1.0 - soot * 0.4);
    albedo = mix(albedo, vec3(0.42, 0.38, 0.36), ash * 0.22);
    // под Солнцем камень раскаляется и краснеет, в трещинах тлеет жар; на ночной стороне угли гаснут
    float heat = smoothstep(0.0, 0.9, ndlG);
    albedo *= mix(vec3(1.0), vec3(1.25, 0.82, 0.7), heat);
    float ember = cracks * pow(max(ndlG, 0.0), 3.0);
    emissive += vec3(1.0, 0.22, 0.05) * ember * (0.55 + 0.15 * sin(uTime * 2.0 + c1 * 20.0)) * uScorch;
    h -= cracks * 0.15;
  }
  // рельеф — только из крупного (3 октавы) шума и кратеров: мелкие октавы дают «лесенку» от экранных производных
  h = fbm3(p * 2.5 + uSeed) * 0.25 + cr * (1.0 - maria * 0.6);

#elif defined(KIND_VENUS)
  float t = uTime * 0.02;
  float w = fbm3(p * vec3(2.0, 3.0, 2.0) + vec3(t, 0.0, -t));
  float v = fbm(p * vec3(1.4, 4.0, 1.4) + w * 0.9 + uSeed + vec3(t * 1.5, 0.0, 0.0));
  albedo = mix(uColA, uColB, smoothstep(-0.7, 0.7, v) * 0.7 + 0.3);
  albedo = mix(albedo, uColC, smoothstep(0.25, 0.65, w) * 0.2);

#elif defined(KIND_EARTH)
  vec3 q = p * 1.6 + uSeed;
  float w = fbm3(q * 1.4);
  float n = fbm(q + vec3(w * 0.75));
  float lat = abs(p.y);
  float detail = fbm3(p * 9.0 + uSeed * 2.0);
  float land = smoothstep(0.03, 0.065, n);
  vec3 ocean = mix(vec3(0.005, 0.025, 0.085), vec3(0.015, 0.12, 0.25), smoothstep(-0.3, 0.05, n));
  // бирюзовое мелководье у берегов
  ocean = mix(ocean, vec3(0.04, 0.26, 0.34), smoothstep(-0.02, 0.035, n) * (1.0 - land) * 0.8);
  float dry = exp(-pow((lat - 0.4) / 0.14, 2.0)) * smoothstep(-0.2, 0.3, detail + w * 0.6);
  // приглушённые природные цвета: оливковые леса, охристые степи, песчаные пустыни
  vec3 landCol = mix(vec3(0.06, 0.12, 0.045), vec3(0.2, 0.22, 0.1), smoothstep(-0.4, 0.4, detail));
  landCol = mix(landCol, vec3(0.6, 0.5, 0.34), dry);
  landCol = mix(landCol, vec3(0.30, 0.27, 0.23), smoothstep(0.24, 0.38, n));
  landCol = mix(landCol, vec3(0.28, 0.30, 0.22), smoothstep(0.6, 0.78, lat));
  float ice = smoothstep(0.8, 0.86, lat + detail * 0.06);
  albedo = mix(ocean, landCol, land);
  albedo = mix(albedo, vec3(0.86, 0.9, 0.96), ice);
  h = land * ((n - 0.05) * 0.8 + detail * 0.05);
  spec = (1.0 - land) * (1.0 - ice) * 0.35;
  // огни городов на ночной стороне
  float c1 = snoise(p * 9.0 + uSeed) * 0.5 + 0.5;
  float c2 = snoise(p * 48.0) * 0.5 + 0.5;
  float c3 = snoise(p * 150.0) * 0.5 + 0.5;
  float lights = land * (1.0 - ice) * smoothstep(0.58, 0.85, c1) * smoothstep(0.5, 0.8, c2) * (0.4 + c3);
  emissive = vec3(1.0, 0.62, 0.28) * lights * smoothstep(0.05, -0.2, ndlG) * 1.1;

#elif defined(KIND_MARS)
  float base = fbm(p * 2.2 + uSeed);
  float darkReg = smoothstep(0.0, 0.3, fbm3(p * 1.3 + uSeed.yzx));
  float cr = craters(p * 4.0 + uSeed) * 0.16;
  float crFine = craters(p * 11.0 + uSeed.zxy) * 0.06;
  float lat = abs(p.y);
  float lon = atan(p.z, p.x);
  // каньон вдоль экватора — привет долинам Маринер
  float scar = exp(-pow((p.y + 0.14 + snoise(p * 6.0) * 0.025) / 0.018, 2.0))
             * smoothstep(-0.1, 0.25, lon) * (1.0 - smoothstep(0.9, 1.25, lon));
  albedo = mix(uColA, uColB, smoothstep(-0.4, 0.4, base));
  albedo = mix(albedo, uColC, darkReg * 0.6);
  albedo *= (1.0 - scar * 0.4) * (0.95 + clamp(cr + crFine, -0.4, 0.3) * 0.25);
  float cap = smoothstep(0.93, 0.96, lat + base * 0.04);
  albedo = mix(albedo, vec3(0.93, 0.9, 0.88), cap);
  h = fbm3(p * 2.2 + uSeed) * 0.3 + cr - scar * 0.5;

#elif defined(KIND_GAS)
  float phi = asin(clamp(p.y, -1.0, 1.0));
  // дифференциальное вращение: полосы на разных широтах сдвигаются с разной скоростью
  float shear = sin(phi * uBandFreq * 0.5) * uTime * uFlow;
  float cs = cos(shear), sn = sin(shear);
  vec3 pr = vec3(cs * p.x - sn * p.z, p.y, sn * p.x + cs * p.z);
  float turb = fbm(pr * vec3(2.5, 9.0, 2.5) + uSeed + vec3(0.0, uTime * 0.006, uTime * 0.012));
  float l = phi + turb * uTurb;
  float b = sin(l * uBandFreq) * 0.5 + 0.5;
  float b2 = sin(l * uBandFreq * 2.7 + 1.3) * 0.5 + 0.5;
  vec3 gc = mix(uColA, uColB, smoothstep(0.5 - uBandContrast * 0.5, 0.5 + uBandContrast * 0.5, b));
  gc = mix(gc, uColC, b2 * 0.35 * uBandContrast);
  float fine = fbm3(pr * vec3(5.0, 22.0, 5.0) + uSeed.zxy);
  gc = mix(gc, uColD, smoothstep(0.15, 0.5, fine) * 0.3);
  // тонкие волокна вдоль полос, как на снимках «Юноны» и «Кассини»
  float fib = snoise(pr * vec3(1.5, 60.0, 1.5) + uSeed + vec3(0.0, 0.0, uTime * 0.01)) * 0.5 + 0.5;
  gc *= 0.9 + 0.2 * fib;
  if (uSpotStrength > 0.0) {
    float lon = atan(p.z, p.x);
    float dl = mod(lon - uSpot.y + 3.14159265, 6.2831853) - 3.14159265;
    vec2 d = vec2(dl * cos(uSpot.x) / uSpot.z, (phi - uSpot.x) / uSpot.w);
    float e = length(d);
    float swirl = snoise(vec3(d * 2.5, uTime * 0.02) + uSeed);
    float m = smoothstep(1.0, 0.55, e + swirl * 0.12);
    gc = mix(gc, uSpotCol * (0.85 + 0.25 * swirl), m * uSpotStrength);
  }
  albedo = gc * mix(0.7, 1.0, sqrt(max(dot(Ng, V), 0.0)));
#endif

  vec3 N = Ng;
  // у края диска рельеф гасим: под скользящим углом производные шумят
  if (uBump > 0.0) N = perturbNormal(vPosW, Ng, h, uBump * uRadius * smoothstep(0.05, 0.4, dot(Ng, V)));
  // узкая полутень: ночная сторона честно тёмная, без «размазанного» терминатора
  float lit = clamp(dot(N, L), 0.0, 1.0) * smoothstep(-0.03, 0.08, ndlG);

#ifdef RING_SHADOW
  vec3 Lo = normalize(vLightObj);
  if (abs(Lo.y) > 0.0001) {
    float tr = -p.y / Lo.y;
    if (tr > 0.0) {
      vec3 hp = p + Lo * tr;
      lit *= 1.0 - ringDensity(length(hp.xz), 0.0) * 0.8;
    }
  }
#endif

  vec3 col = albedo * (lit * 1.12 + 0.006) + emissive;
  // сумерки: у планет с атмосферой вдоль терминатора тёплая полоса рассеянного света
  float twilight = exp(-pow((ndlG - 0.02) / 0.09, 2.0));
  col += mix(vec3(1.0, 0.5, 0.25), uAtmo, 0.4) * twilight * uAtmoStrength * 0.18;
  vec3 H = normalize(L + V);
  col += vec3(1.0, 0.95, 0.85) * spec * pow(max(dot(Ng, H), 0.0), 80.0) * smoothstep(0.0, 0.2, ndlG);
  float rim = pow(1.0 - max(dot(Ng, V), 0.0), 2.5);
  col += uAtmo * rim * uAtmoStrength * smoothstep(-0.3, 0.45, ndlG);
  gl_FragColor = vec4(col, 1.0);
}
`;

const CLOUDS_FRAG = /* glsl */ `
uniform float uTime;
uniform vec3 uSeed;
${SURFACE_VARYINGS}
${NOISE}
void main() {
  vec3 p = normalize(vObj);
  vec3 Ng = normalize(vNormalW);
  vec3 L = normalize(-vPosW);
  float t = uTime * 0.02;
  float lat = abs(p.y);
  // зональность как у настоящей Земли: облачный экватор, ясные субтропики, штормовые средние широты
  float cover = 0.4
    + 0.22 * exp(-pow(lat / 0.12, 2.0))
    - 0.2 * exp(-pow((lat - 0.42) / 0.12, 2.0))
    + 0.12 * exp(-pow((lat - 0.75) / 0.15, 2.0));
  // частота по долготе ниже, чем по широте: облака вытянуты вдоль параллелей
  vec3 q = p * vec3(2.0, 4.0, 2.0) + uSeed + vec3(t, 0.0, -t * 0.5);
  float w = fbm3(q * 0.8);
  float c = fbm(q + w * 0.5) * 0.5 + 0.5;
  c += fbm3(p * 16.0 + uSeed.zxy + vec3(t * 2.0)) * 0.12;
  float a = smoothstep(1.0 - cover - 0.08, 1.0 - cover + 0.18, c) * 0.82;
  float lit = smoothstep(-0.12, 0.4, dot(Ng, L));
  gl_FragColor = vec4(vec3((0.9 + 0.1 * a) * lit + 0.02), a);
}
`;

// --- Атмосфера: светящаяся оболочка вокруг диска -----------------------------------------------

const ATMO_VERT = /* glsl */ `
varying vec3 vNW;
varying vec3 vPosW;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vPosW = wp.xyz;
  vNW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const ATMO_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uStrength;
uniform float uEdge;
uniform float uSunset;
varying vec3 vNW;
varying vec3 vPosW;
void main() {
  vec3 N = normalize(vNW);
  vec3 V = normalize(cameraPosition - vPosW);
  vec3 L = normalize(-vPosW);
  // рисуем дальнюю половину оболочки: 0 на внешнем краю, 1 у края планеты
  float x = clamp(-dot(N, V) / uEdge, 0.0, 1.0);
  float glow = pow(x, 2.2);
  float nl = dot(N, L);
  // контровой свет: когда смотришь на планету против Солнца, атмосфера вспыхивает ореолом (рассеяние вперёд)
  float back = pow(max(dot(-V, L), 0.0), 6.0);
  float day = max(smoothstep(-0.35, 0.5, nl), back * 2.5);
  float term = exp(-pow(nl / 0.25, 2.0)) * uSunset;
  vec3 col = mix(uColor, vec3(1.0, 0.5, 0.25), term * 0.6);
  gl_FragColor = vec4(col * glow * day * uStrength, 1.0);
}
`;

// --- Кольца -----------------------------------------------------------------------------------

const RING_VERT = /* glsl */ `
varying vec2 vLocal;
varying vec3 vPosW;
varying vec3 vN;
void main() {
  vLocal = position.xy;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vPosW = wp.xyz;
  vN = normalize(mat3(modelMatrix) * vec3(0.0, 0.0, 1.0));
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const RING_FRAG = /* glsl */ `
uniform vec3 uPlanetPos;
uniform float uPlanetR;
uniform vec3 uColA;
uniform vec3 uColB;
varying vec2 vLocal;
varying vec3 vPosW;
varying vec3 vN;
${NOISE}
${RINGS}
void main() {
  float r = length(vLocal) / uPlanetR;
  float fw = fwidth(r);
#ifdef URANUS_RINGS
  float d = uranusRings(r, fw);
#else
  float d = ringDensity(r, fw);
#endif
  if (d < 0.003) discard;
  vec3 L = normalize(-vPosW);
  vec3 V = normalize(cameraPosition - vPosW);
  float nl = dot(vN, L);
  float nv = dot(vN, V);
  float lit = 0.3 + 0.7 * abs(nl);
  // с неосвещённой стороны плотные участки тёмные, редкие — просвечивают
  if (nl * nv < 0.0) lit *= mix(1.0, 0.25, d);
  // тень планеты на кольцах
  vec3 oc = uPlanetPos - vPosW;
  float tca = dot(oc, L);
  float d2 = dot(oc, oc) - tca * tca;
  float R2 = uPlanetR * uPlanetR;
  if (tca > 0.0) lit *= mix(0.06, 1.0, smoothstep(R2 * 0.94, R2 * 1.02, d2));
  float tone = snoise(vec3(r * 40.0, 3.1, 0.0)) * 0.5 + 0.5;
  vec3 col = mix(uColA, uColB, tone) * lit;
  gl_FragColor = vec4(col, d);
}
`;

// --- Корона Солнца (билборд) ------------------------------------------------------------------

const CORONA_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv * 2.0 - 1.0;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const CORONA_FRAG = /* glsl */ `
uniform float uTime;
uniform float uScale;
uniform float uCme;     // выброс корональной массы: 0 — нет, 0…1 — фаза разлёта
uniform float uCmeAng;  // направление выброса в плоскости экрана
varying vec2 vUv;
${NOISE}
void main() {
  float r = length(vUv) * uScale;
  float x = max(r - 1.0, 0.0);
  float ang = atan(vUv.y, vUv.x);
  // протуберанцы и лучи короны — медленно перетекают
  float rays = snoise(vec3(cos(ang) * 2.5, sin(ang) * 2.5, uTime * 0.07)) * 0.5 + 0.5;
  float flare = snoise(vec3(cos(ang) * 6.0, sin(ang) * 6.0, uTime * 0.15)) * 0.5 + 0.5;
  rays = pow(rays, 3.0) * exp(-x * 0.9) + pow(flare, 6.0) * exp(-x * 3.0) * 1.2;
  // слои ауры: плотная корона, тёплое гало и широкое белое свечение — Солнце «давит» светом
  float breath = 1.0 + 0.05 * sin(uTime * 0.6);
  float glow = (exp(-x * 2.2) * 0.9 + exp(-x * 0.45) * 0.12 + exp(-x * 0.11) * 0.05) * breath + rays * 0.4;
  // анаморфный горизонтальный блик, как у кинообъектива
  float streak = exp(-abs(vUv.y) * uScale * 1.4) * exp(-abs(vUv.x) * 2.2) * 0.22;
  glow *= smoothstep(uScale, uScale * 0.6, r);
  vec3 col = mix(vec3(1.0, 0.6, 0.3), vec3(1.0, 0.96, 0.9), exp(-x * 0.7));
  // протуберанцы: языки плазмы над краем диска, медленно поднимаются и тают
  float tongue = fbm(vec3(cos(ang) * 3.0, sin(ang) * 3.0, x * 4.0 - uTime * 0.12));
  float prom = smoothstep(0.22, 0.6, tongue) * exp(-x * 6.0) * smoothstep(0.0, 0.025, x);
  vec3 promCol = mix(vec3(1.0, 0.28, 0.08), vec3(1.0, 0.62, 0.32), exp(-x * 10.0));
  // CME: светящийся пузырь плазмы уходит от края — яркий фронт, рыхлое заполнение, гаснет по мере разлёта
  vec3 cmeCol = vec3(0.0);
  if (uCme > 0.0) {
    float da = abs(mod(ang - uCmeAng + 3.14159265, 6.2831853) - 3.14159265);
    float front = 1.0 + uCme * 5.0;  // до 6 радиусов Солнца — в кадре видно весь разлёт
    float shell = exp(-pow((r - front) / (0.2 + uCme * 0.9), 2.0));
    float fill = smoothstep(front, 1.0, r) * step(1.0, r) * 0.3;
    float cone = exp(-pow(da / (0.35 + uCme * 0.3), 2.0));
    float tex = snoise(vec3(cos(ang) * 4.0, sin(ang) * 4.0, r * 2.0 - uTime * 0.5)) * 0.5 + 0.5;
    cmeCol = vec3(1.0, 0.8, 0.55) * (shell + fill) * cone * (0.6 + 0.6 * tex) * (1.0 - uCme) * 1.6;
  }
  gl_FragColor = vec4(col * glow + promCol * prom * 1.3 + cmeCol + vec3(0.75, 0.85, 1.0) * streak, 1.0);
}
`;

// --- Звёзды, пояс астероидов, небо ------------------------------------------------------------

const STARS_VERT = /* glsl */ `
attribute float aSize;
attribute vec3 aColor;
attribute float aPhase;
uniform float uTime;
uniform float uPR;
varying vec3 vColor;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float tw = 0.75 + 0.25 * sin(uTime * (0.8 + aPhase * 2.0) + aPhase * 40.0);
  vColor = aColor * tw * 1.6;
  gl_PointSize = aSize * uPR * 1.3;
}
`;

const STARS_FRAG = /* glsl */ `
varying vec3 vColor;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  float core = smoothstep(0.22, 0.0, d);
  gl_FragColor = vec4(vColor * (a * 0.5 + core), 1.0);
}
`;

const BELT_VERT = /* glsl */ `
attribute float aAU;
attribute float aAng;
attribute float aY;
attribute float aSize;
attribute float aShade;
uniform float uDays;
uniform float uPR;
varying float vShade;
void main() {
  // тот же закон Кеплера, что у планет: внутренние камни обгоняют внешние
  float ang = aAng + 6.2831853 * uDays / (365.25 * pow(aAU, 1.5));
  float r = 44.0 + (aAU - 2.1) / 1.2 * 8.0;
  vec3 pos = vec3(cos(ang) * r, aY, -sin(ang) * r);
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(aSize * uPR * 120.0 / -mv.z, 1.0, 4.0 * uPR);
  vShade = aShade;
}
`;

const BELT_FRAG = /* glsl */ `
varying float vShade;
void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  float a = smoothstep(0.5, 0.15, d);
  gl_FragColor = vec4(vec3(0.58, 0.54, 0.5) * vShade, a * 0.85);
}
`;

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const SKY_FRAG = /* glsl */ `
uniform vec3 uBandN;
varying vec3 vDir;
${NOISE}
// цветное облако туманности вокруг направления c
vec3 nebula(vec3 d, vec3 c, vec3 color, float size, float seed) {
  float k = exp(-(1.0 - dot(d, normalize(c))) / size);
  return color * k * (fbm(d * 5.0 + seed) * 0.5 + 0.5);
}
void main() {
  vec3 d = normalize(vDir);
  float b = dot(d, uBandN);
  float band = exp(-b * b / 0.03);
  float n = fbm(d * 3.0) * 0.5 + 0.5;
  float n2 = fbm(d * 8.0 + 4.0) * 0.5 + 0.5;
  float dust = smoothstep(0.45, 0.7, fbm3(d * 6.0 + 9.0) * 0.5 + 0.5);
  // база светлее: космос не «чёрная дыра», а глубокий синий с белёсой дымкой
  vec3 col = vec3(0.018, 0.024, 0.042) + vec3(0.03, 0.035, 0.05) * (n * 0.5 + 0.25);
  col += vec3(0.24, 0.26, 0.33) * band * n * (1.0 - dust * 0.6);
  col += vec3(0.05, 0.03, 0.10) * pow(n2, 3.0) * 0.6;
  col += vec3(0.02, 0.07, 0.10) * pow(n, 4.0) * 0.5;
  // эмиссионные туманности: малиновая, бирюзовая, фиолетовая
  col += nebula(d, vec3(-0.6, -0.6, 0.5), vec3(0.5, 0.12, 0.35), 0.03, 1.0) * 0.5;
  col += nebula(d, vec3(0.7, -0.5, -0.4), vec3(0.1, 0.35, 0.45), 0.04, 7.0) * 0.45;
  col += nebula(d, vec3(-0.2, 0.4, -0.9), vec3(0.35, 0.18, 0.5), 0.05, 3.0) * 0.4;
  // общий подъём на ~20% и белёсая дымка — космос светлее и белее
  col = col * 1.2 + vec3(0.008, 0.009, 0.012);
  gl_FragColor = vec4(col, 1.0);
}
`;

// --- Дальний космос (билборды), пыль -----------------------------------------------------------

// Чёрная дыра: тень, фотонное кольцо, аккреционный диск почти с ребра (передняя часть поверх тени),
// линзированный ореол и доплеровская асимметрия — одна сторона диска ярче.
const BLACKHOLE_FRAG = /* glsl */ `
uniform float uTime;
varying vec2 vUv;
${NOISE}
void main() {
  vec2 p = vUv;
  float r = length(p);
  float shadow = 1.0 - smoothstep(0.21, 0.23, r);
  vec2 q = vec2(p.x, p.y / 0.22);
  float rd = length(q);
  // диск вращается по Кеплеру: внутренние кольца быстрее — рисунок вытягивается в струи
  float ang = atan(q.y, q.x) + uTime * 0.9 / (rd + 0.3);
  float swirl = snoise(vec3(cos(ang) * 2.0, sin(ang) * 2.0, rd * 6.0 - uTime * 0.4)) * 0.5 + 0.5;
  swirl = mix(swirl, snoise(vec3(cos(ang) * 6.0, sin(ang) * 6.0, rd * 14.0)) * 0.5 + 0.5, 0.35);
  float band = smoothstep(0.28, 0.36, rd) * (1.0 - smoothstep(0.6, 0.95, rd));
  float doppler = 0.45 + 0.75 * smoothstep(1.0, -1.0, q.x / max(rd, 0.001));
  vec3 hot = mix(vec3(1.0, 0.42, 0.1), vec3(1.0, 0.92, 0.75), swirl);
  float front = step(p.y, 0.0);
  float disk = band * (0.5 + 0.6 * swirl) * doppler * mix(1.0 - shadow, 1.0, front);
  float ring = exp(-pow((r - 0.235) / 0.012, 2.0)) * 1.3 + exp(-pow((r - 0.29) / 0.05, 2.0)) * 0.6;
  // фотонное кольцо дрожит, по диску бежит горячее пятно (сзади тени его не видно)
  ring *= 0.85 + 0.15 * sin(uTime * 2.2 + atan(p.y, p.x) * 3.0);
  float ha = uTime * 1.3;
  vec2 hs = vec2(cos(ha) * 0.4, sin(ha) * 0.4 * 0.22);
  float spot = exp(-dot(p - hs, p - hs) * 900.0) * 2.0 * mix(1.0 - shadow, 1.0, step(hs.y, 0.0));
  vec3 col = hot * (disk * 1.5 + ring * (1.0 - shadow) * (0.6 + 0.4 * swirl)) + vec3(1.0, 0.95, 0.85) * spot;
  col += vec3(1.0, 0.55, 0.25) * exp(-r * 3.5) * 0.2 * (1.0 - shadow);
  float fade = 1.0 - smoothstep(0.8, 1.0, r);
  float a = max(shadow, clamp(max(col.r, max(col.g, col.b)), 0.0, 1.0)) * fade;
  gl_FragColor = vec4(col * fade, a);
}
`;

const ROT2 = /* glsl */ `
vec2 rot2(vec2 v, float a) { float c = cos(a), s = sin(a); return vec2(c * v.x - s * v.y, s * v.x + c * v.y); }
`;

// Звёздочки в клетках сетки (узлы рукавов, молодые звёзды в туманностях): мерцают каждая в своём ритме.
// Издалека клетки мельче пикселя — гасим, чтобы не рябило.
const SPARKS = /* glsl */ `
float sparks(vec2 cell, float seed, float density, float sharp, out vec3 h) {
  vec2 ci = floor(cell);
  vec2 cd = hash33(vec3(ci, seed)).xy - fract(cell);
  h = hash33(vec3(ci, seed + 7.7));
  float aa = clamp(1.5 - fwidth(cell.x) * 3.0, 0.0, 1.0);
  float tw = 0.55 + 0.45 * sin(uTime * (1.0 + h.x * 2.5) + h.y * 30.0);
  return exp(-dot(cd, cd) * sharp) * step(1.0 - density, h.z) * tw * aa;
}
`;

// Спиральная галактика: логарифмические рукава, пылевые прожилки, жёлтое ядро.
// Диск вращается целиком (рукава не «заматываются» со временем), в рукавах мерцают узлы звездообразования.
const GALAXY_FRAG = /* glsl */ `
uniform float uTime;
uniform float uTilt;
uniform float uSpin;
uniform float uSeed;
uniform vec3 uColor;
uniform vec3 uColor2;
varying vec2 vUv;
${NOISE}
${ROT2}
${SPARKS}
void main() {
  vec2 q0 = vec2(vUv.x, vUv.y / uTilt);
  float r = length(q0);
  vec2 q = rot2(q0, -uTime * uSpin);
  float ang = atan(q.y, q.x);
  float arms = pow(sin(ang * 2.0 - log(r + 0.05) * 5.0) * 0.5 + 0.5, 3.0);
  float n = fbm3(vec3(q * 6.0, uSeed)) * 0.5 + 0.5;
  float disk = exp(-r * 3.2);
  vec3 col = uColor * disk * (0.25 + arms * 0.9) * (0.6 + 0.6 * n);
  vec3 h;
  float knot = sparks(q * 24.0, uSeed, 0.45, 70.0, h) * arms * disk * 3.5;
  col += mix(vec3(0.6, 0.78, 1.0), vec3(1.0, 0.6, 0.85), step(0.85, h.y)) * knot;
  // ядро-балдж мягко дышит
  col += uColor2 * (exp(-r * 14.0) * 1.4 + exp(-r * 6.0) * 0.2) * (0.92 + 0.08 * sin(uTime * 0.7 + uSeed));
  // пылевые прожилки вращаются вместе с диском
  col *= 1.0 - smoothstep(0.55, 0.8, fbm3(vec3(q * 9.0, 4.0 + uSeed)) * 0.5 + 0.5) * 0.5 * disk;
  col *= 1.0 - smoothstep(0.7, 1.0, length(vUv));
  gl_FragColor = vec4(col * 0.9, 1.0);
}
`;

// Туманность: два цвета, клочья газа на фрактальном шуме, светлое ядро.
// Газ течёт: координаты закручивает медленное вихревое поле, свечение переливается, внутри мерцают молодые звёзды.
const NEBULA_FRAG = /* glsl */ `
uniform float uTime;
uniform float uSeed;
uniform vec3 uColor;
uniform vec3 uColor2;
varying vec2 vUv;
${NOISE}
${SPARKS}
void main() {
  vec2 p = vUv;
  float r = length(p);
  float t = uTime * 0.05;
  vec3 q = vec3(p * 1.6, uSeed);
  q.xy += vec2(snoise(vec3(p * 1.1, uSeed + t)), snoise(vec3(p * 1.1 + 7.3, uSeed - t))) * 0.35;
  float n = fbm(q + vec3(t * 0.5, -t * 0.3, t * 0.2));
  float n2 = fbm(q * 2.3 + 5.0 + vec3(-t * 0.8, t * 0.6, 0.0));
  float shape = smoothstep(1.0, 0.15, r + n * 0.35);
  float wisps = pow(clamp(n2 * 0.5 + 0.5, 0.0, 1.0), 2.5);
  float glow = 0.85 + 0.25 * snoise(vec3(p * 0.9, uSeed * 0.3 + uTime * 0.06));
  vec3 col = mix(uColor, uColor2, smoothstep(-0.3, 0.4, n)) * shape * (0.35 + wisps * 1.2) * glow;
  col += vec3(0.9, 0.95, 1.0) * pow(shape, 6.0) * 0.25;
  vec3 h;
  col += vec3(0.85, 0.92, 1.0) * sparks(p * 16.0, uSeed + 3.0, 0.18, 140.0, h) * shape * 2.2;
  gl_FragColor = vec4(col * 0.55, 1.0);
}
`;

// Звёздное скопление: плотный шар бело-голубых звёзд — медленно поворачивается, звёзды мерцают.
const CLUSTER_FRAG = /* glsl */ `
uniform float uTime;
uniform float uSeed;
uniform float uSpin;
varying vec2 vUv;
${NOISE}
${ROT2}
float starLayer(vec2 p, float seed, float sharp) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float s = 0.0;
  for (int y = -1; y <= 1; y++)
  for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(float(x), float(y));
    vec3 h = hash33(vec3(i + g, seed));
    vec2 c = g + h.xy - f;
    s += exp(-dot(c, c) * sharp) * h.z * h.z * (0.55 + 0.45 * sin(uTime * (1.5 + h.y * 3.0) + h.x * 30.0));
  }
  return s;
}
void main() {
  vec2 uv = rot2(vUv, uTime * uSpin * 0.6);
  float s = starLayer(uv * 14.0, uSeed, 80.0) + starLayer(uv * 30.0, uSeed + 5.0, 140.0) * 0.45;
  float r = length(vUv);
  float dens = exp(-r * r * 5.0);
  vec3 col = vec3(0.82, 0.9, 1.0) * s * dens * 2.2 + vec3(0.5, 0.65, 1.0) * dens * 0.1;
  gl_FragColor = vec4(col * (1.0 - smoothstep(0.8, 1.0, r)), 1.0);
}
`;

// Звезда-гигант: яркое ядро, ореол и дифракционные лучи, как на снимках телескопов.
// Звезда пульсирует (переменная), вокруг ядра медленно вращается венец лучей, дифракционные лучи дрожат.
const GIANT_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uTime;
uniform float uSeed;
varying vec2 vUv;
${SNOISE}
void main() {
  vec2 p = vUv;
  float r = length(p);
  float pulse = 1.0 + 0.14 * sin(uTime * (0.5 + fract(uSeed * 0.37) * 0.7) + uSeed);
  float flick = 0.92 + 0.08 * snoise(vec3(uTime * 1.2, uSeed, 0.0));
  float core = exp(-r * 22.0 / pulse) * 2.0 + exp(-r * 7.0 / pulse) * 0.6;
  float halo = exp(-r * 2.6) * 0.18 * pulse;
  float spikes = (exp(-abs(p.x) * 60.0) + exp(-abs(p.y) * 60.0)) * exp(-r * 2.2) * 0.9;
  vec2 d = vec2(p.x + p.y, p.x - p.y) * 0.7071;
  spikes += (exp(-abs(d.x) * 90.0) + exp(-abs(d.y) * 90.0)) * exp(-r * 4.0) * 0.35;
  spikes *= 0.8 + 0.2 * sin(uTime * 2.3 + uSeed * 5.0);
  float ang = atan(p.y, p.x) + uTime * 0.12;
  float crown = pow(snoise(vec3(cos(ang) * 3.0, sin(ang) * 3.0, uTime * 0.15 + uSeed)) * 0.5 + 0.5, 3.0) * exp(-r * 5.0) * 0.6;
  vec3 col = mix(uColor, vec3(1.0), clamp(core * 0.5, 0.0, 1.0)) * (core + halo + spikes + crown) * flick;
  gl_FragColor = vec4(col * (1.0 - smoothstep(0.8, 1.0, r)), 1.0);
}
`;

// Светящаяся космическая пыль: крупные мягкие частицы, медленно дрейфуют.
const DUST_VERT = /* glsl */ `
attribute float aSize;
attribute vec3 aColor;
attribute float aPhase;
uniform float uTime;
uniform float uPR;
varying vec3 vColor;
varying float vFade;
void main() {
  vec3 pos = position + vec3(sin(uTime * 0.05 + aPhase * 6.0), sin(uTime * 0.04 + aPhase * 9.0) * 0.5, cos(uTime * 0.05 + aPhase * 7.0)) * 2.0;
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  float z = -mv.z;
  gl_PointSize = clamp(aSize * uPR * 300.0 / z, 1.0, 64.0 * uPR);
  vFade = smoothstep(2.0, 12.0, z);
  vColor = aColor;
}
`;

const DUST_FRAG = /* glsl */ `
varying vec3 vColor;
varying float vFade;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float a = exp(-d * d * 4.0) * (1.0 - smoothstep(0.8, 1.0, d));
  gl_FragColor = vec4(vColor * a * vFade, 1.0);
}
`;

// Пылевой диск в плоскости эклиптики (зодиакальный свет): тёплый у Солнца, синеет к краю.
const DUSTDISK_FRAG = /* glsl */ `
uniform float uTime;
varying vec2 vLocal;
varying vec3 vPosW;
${NOISE}
void main() {
  float r = length(vLocal);
  float ang = atan(vLocal.y, vLocal.x);
  float n = fbm3(vec3(vLocal * 0.03, uTime * 0.01)) * 0.5 + 0.5;
  float sp = snoise(vec3(cos(ang) * 1.5, sin(ang) * 1.5, r * 0.04 - uTime * 0.02)) * 0.5 + 0.5;
  float glow = exp(-r / 45.0) * (0.5 + 0.8 * n) * (0.7 + 0.5 * sp) * smoothstep(8.0, 20.0, r);
  vec3 col = mix(vec3(0.55, 0.68, 1.0), vec3(1.0, 0.97, 0.92), exp(-r / 30.0));
  // вблизи камеры диск растворяется: иначе при подлёте к планете его плоскость «режет» её полосой
  glow *= smoothstep(12.0, 60.0, distance(cameraPosition, vPosW));
  gl_FragColor = vec4(col * glow * 0.11, 1.0);
}
`;

const DUSTDISK_VERT = /* glsl */ `
varying vec2 vLocal;
varying vec3 vPosW;
void main() {
  vLocal = position.xy;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vPosW = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

// --- Фабрики материалов -----------------------------------------------------------------------

const vec = (a) => new THREE.Vector3(...(a || [0, 0, 0]));

// Общие defines качества: заполняются один раз при старте через setQuality().
let QDEF = {};
export function setQuality(low) {
  QDEF = { FBM_OCT: low ? 4 : 7 };
}

// Чёрная дыра-воронка: поверхность вращения (лейт), по ней спиралью затягивает светящееся вещество.
// uv.x — угол, позиция в локальных координатах даёт радиус (1 — край, 0.12 — горловина).
const FUNNEL_VERT = /* glsl */ `
varying vec2 vUv;
varying float vR;
void main() {
  vUv = uv;
  vR = length(position.xz);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FUNNEL_FRAG = /* glsl */ `
uniform float uTime;
varying vec2 vUv;
varying float vR;
${NOISE}
void main() {
  float ang = vUv.x * 6.2831853;
  float lr = log(vR);
  float spiral = sin(ang * 3.0 + lr * 9.0 + uTime * 1.5) * 0.5 + 0.5;
  float fine = snoise(vec3(cos(ang) * 3.0, sin(ang) * 3.0, lr * 6.0 + uTime * 0.8)) * 0.5 + 0.5;
  // контрастные спирали (тёмные промежутки читают глубину воронки), яркость умеренная — не перебивает систему
  float bands = pow(spiral, 4.0) * 0.8 + pow(fine, 2.0) * 0.35;
  float heat = smoothstep(0.9, 0.15, vR);
  float edge = smoothstep(1.0, 0.65, vR);
  float throat = smoothstep(0.12, 0.22, vR);
  vec3 col = mix(vec3(0.5, 0.65, 1.0), vec3(1.0, 0.9, 0.72), heat) * bands * (0.12 + heat * 1.1) * edge * throat;
  col += vec3(1.0, 0.85, 0.6) * exp(-pow((vR - 0.17) / 0.018, 2.0)) * 1.2;
  gl_FragColor = vec4(col, 1.0);
}
`;

// Хромосфера: тонкая красная оболочка по ободу Солнца, «шевелится» спикулами — даёт Солнцу объём.
const CHROMO_FRAG = /* glsl */ `
uniform float uEdge;
uniform float uTime;
varying vec3 vNW;
varying vec3 vPosW;
${NOISE}
void main() {
  vec3 N = normalize(vNW);
  vec3 V = normalize(cameraPosition - vPosW);
  float x = clamp(-dot(N, V) / uEdge, 0.0, 1.0);
  float spic = snoise(N * 40.0 + vec3(uTime * 0.3)) * 0.5 + 0.5;
  float glow = pow(x, 1.6) * (0.7 + 0.6 * spic);
  gl_FragColor = vec4(vec3(1.0, 0.36, 0.14) * glow * 1.4, 1.0);
}
`;

export function chromosphereMaterial(shared, shell) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: shared.uTime, uEdge: { value: Math.sqrt(1 - 1 / (shell * shell)) } },
    vertexShader: ATMO_VERT,
    fragmentShader: CHROMO_FRAG,
    side: THREE.BackSide,
    ...additive,
  });
}

export function funnelMaterial(shared) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: shared.uTime },
    vertexShader: FUNNEL_VERT,
    fragmentShader: FUNNEL_FRAG,
    side: THREE.DoubleSide,
    ...additive,
  });
}

const additive = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };

const ARTIFACT_FRAG = { blackhole: BLACKHOLE_FRAG, galaxy: GALAXY_FRAG, nebula: NEBULA_FRAG, cluster: CLUSTER_FRAG, star: GIANT_FRAG };
export function artifactMaterial(a, shared, seed = 0) {
  // скорость вращения галактик/скоплений: 0.035…0.075 рад/с (оборот за 1.5–3 минуты), направление — по зерну
  const fr = (x) => x - Math.floor(x);
  const spin = (0.035 + fr(seed * 0.618) * 0.04) * (fr(seed * 1.7) > 0.5 ? 1 : -1);
  const m = new THREE.ShaderMaterial({
    uniforms: {
      uTime: shared.uTime,
      uColor: { value: vec(a.color) },
      uColor2: { value: vec(a.color2) },
      uTilt: { value: a.tilt ?? 0.45 },
      uSeed: { value: seed },
      uSpin: { value: spin },
    },
    vertexShader: CORONA_VERT,
    fragmentShader: ARTIFACT_FRAG[a.type],
    ...additive,
  });
  if (a.type === 'blackhole') {
    // премультиплицированное смешивание: тень дыры реально закрывает звёзды за ней
    m.blending = THREE.CustomBlending;
    m.blendSrc = THREE.OneFactor;
    m.blendDst = THREE.OneMinusSrcAlphaFactor;
  }
  return m;
}

export function dustMaterial(shared) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: shared.uTime, uPR: shared.uPR },
    vertexShader: DUST_VERT,
    fragmentShader: DUST_FRAG,
    ...additive,
  });
}

export function dustDiskMaterial(shared) {
  return new THREE.ShaderMaterial({
    defines: { ...QDEF },
    uniforms: { uTime: shared.uTime },
    vertexShader: DUSTDISK_VERT,
    fragmentShader: DUSTDISK_FRAG,
    side: THREE.DoubleSide,
    ...additive,
  });
}

export function surfaceMaterial(b, shared) {
  const L = b.look;
  const defines = { ...QDEF, ['KIND_' + b.kind.toUpperCase()]: '' };
  if (L.rings?.type === 'saturn') defines.RING_SHADOW = '';
  const g = L.bands || {};
  const s = L.spot;
  return new THREE.ShaderMaterial({
    defines,
    uniforms: {
      uTime: shared.uTime,
      uRadius: { value: b.radius },
      uSeed: { value: vec(L.seed) },
      uColA: { value: vec(L.colA) },
      uColB: { value: vec(L.colB) },
      uColC: { value: vec(L.colC) },
      uColD: { value: vec(L.colD) },
      uMaria: { value: L.maria ?? 0 },
      uRays: { value: L.rays ?? 0 },
      uScorch: { value: L.scorch ?? 0 },
      uBump: { value: L.bump ?? 0 },
      uAtmo: { value: vec(L.atmo?.color) },
      uAtmoStrength: { value: L.atmo?.rim ?? 0 },
      uBandFreq: { value: g.freq ?? 0 },
      uTurb: { value: g.turb ?? 0 },
      uFlow: { value: g.flow ?? 0 },
      uBandContrast: { value: g.contrast ?? 0 },
      uSpot: { value: new THREE.Vector4(...(s ? [s.lat, s.lon, s.w, s.h] : [0, 0, 1, 1])) },
      uSpotCol: { value: vec(s?.color) },
      uSpotStrength: { value: s?.strength ?? 0 },
      // у Солнца — активные области и вспышка (значения заполняет buildSunFX)
      ...(b.kind === 'sun' ? {
        uAR: { value: Array.from({ length: 6 }, () => new THREE.Vector3(1, 0, 0)) },
        uARSize: { value: [1, 1, 1, 1, 1, 1] },
        uFlare: { value: 0 },
        uFlareIdx: { value: -1 },
      } : {}),
    },
    vertexShader: SURFACE_VERT,
    fragmentShader: SURFACE_FRAG,
  });
}

export function cloudMaterial(b, shared) {
  return new THREE.ShaderMaterial({
    defines: { ...QDEF },
    uniforms: { uTime: shared.uTime, uSeed: { value: vec(b.look.seed).multiplyScalar(1.7) } },
    vertexShader: SURFACE_VERT,
    fragmentShader: CLOUDS_FRAG,
    transparent: true,
    depthWrite: false,
  });
}

export function atmosphereMaterial(b) {
  const a = b.look.atmo;
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: vec(a.color) },
      uStrength: { value: a.glow },
      uEdge: { value: Math.sqrt(1 - 1 / (a.shell * a.shell)) },
      uSunset: { value: a.sunset ?? 0 },
    },
    vertexShader: ATMO_VERT,
    fragmentShader: ATMO_FRAG,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

export function ringMaterial(b) {
  const r = b.look.rings;
  return new THREE.ShaderMaterial({
    defines: r.type === 'uranus' ? { ...QDEF, URANUS_RINGS: '' } : { ...QDEF },
    uniforms: {
      uPlanetPos: { value: new THREE.Vector3() },
      uPlanetR: { value: b.radius },
      uColA: { value: vec(r.colA) },
      uColB: { value: vec(r.colB) },
    },
    vertexShader: RING_VERT,
    fragmentShader: RING_FRAG,
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
  });
}

// Корональная петля: светящаяся трубка, по которой бежит плазма. Петля живая, как на роликах SDO:
// раскачивается поперёк своей плоскости (кинк-колебания), медленно поднимается и опадает;
// основания стоят на месте (огибающая sin(π·u)). У протуберанца трубка ещё и колышется.
const LOOP_VERT = /* glsl */ `
uniform float uTime;
uniform float uWobble;
uniform float uSeed;
uniform float uFlare;
uniform vec3 uSway;   // направление и размах качания (поперёк плоскости петли)
uniform vec3 uLift;   // направление и размах «дыхания» (от поверхности)
attribute float aSeed;
varying vec2 vUv;
varying vec3 vNW;
varying vec3 vPosW;
varying float vSeed;
${SNOISE}
void main() {
  vUv = uv;
  vSeed = aSeed;
  float env = sin(3.14159265 * uv.x);
  float ph = aSeed * 6.2831853;
  // основная мода + обертон: петля изгибается, а не просто ходит маятником; во вспышку качает сильнее
  float kink = sin(uTime * 0.9 + ph) * env + 0.35 * sin(uTime * 1.7 + ph * 2.0) * sin(6.2831853 * uv.x);
  float lift = sin(uTime * 0.3 + ph * 1.7) * env;
  vec3 pos = position + uSway * kink * (1.0 + uFlare * 1.5) + uLift * lift;
  pos += normal * snoise(vec3(uv.x * 5.0, uTime * 0.35, uSeed + aSeed * 3.0)) * uWobble;
  vec4 wp = modelMatrix * vec4(pos, 1.0);
  vPosW = wp.xyz;
  vNW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const LOOP_FRAG = /* glsl */ `
uniform float uTime;
uniform float uFlare;
uniform float uBright;
uniform float uFade;
uniform float uSeed;
uniform vec3 uColor;
varying vec2 vUv;
varying vec3 vNW;
varying vec3 vPosW;
varying float vSeed;
void main() {
  vec3 N = normalize(vNW);
  vec3 V = normalize(cameraPosition - vPosW);
  float glow = pow(abs(dot(N, V)), 1.3);  // ярче по оси трубки, мягко гаснет к краям
  float sd = uSeed * 10.0 + vSeed * 17.0;
  float flow = 0.55 + 0.45 * sin(vUv.x * 28.0 - uTime * 2.5 + sd);
  // корональный дождь: сгустки плазмы стекают с вершины к основаниям
  float fromTop = abs(vUv.x - 0.5) * 2.0;
  float rain = pow(0.5 + 0.5 * sin(fromTop * 14.0 - uTime * 1.6 + sd), 12.0) * 0.8;
  // каждая петля сама по себе то разгорается, то тускнеет
  float pulse = 0.6 + 0.4 * sin(uTime * 0.45 + vSeed * 23.0);
  float ends = smoothstep(0.0, 0.06, vUv.x) * smoothstep(1.0, 0.94, vUv.x);
  vec3 col = mix(uColor, vec3(1.0, 0.97, 0.88), flow * 0.15 + rain * 0.3 + uFlare * 0.5);
  gl_FragColor = vec4(col * glow * (flow + rain) * pulse * ends * (uBright + uFlare * 2.0) * uFade, 1.0);
}
`;

export function loopMaterial(shared, { color, bright, wobble, seed, fade, sway, lift }) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: shared.uTime,
      uFlare: { value: 0 },
      uBright: { value: bright },
      uWobble: { value: wobble },
      uSeed: { value: seed },
      uSway: { value: sway || new THREE.Vector3() },
      uLift: { value: lift || new THREE.Vector3() },
      uColor: { value: vec(color) },
      uFade: fade,
    },
    vertexShader: LOOP_VERT,
    fragmentShader: LOOP_FRAG,
    ...additive,
  });
}

export function coronaMaterial(shared, scale) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: shared.uTime, uScale: { value: scale }, uCme: { value: 0 }, uCmeAng: { value: 0 } },
    vertexShader: CORONA_VERT,
    fragmentShader: CORONA_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

export function starsMaterial(shared) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: shared.uTime, uPR: shared.uPR },
    vertexShader: STARS_VERT,
    fragmentShader: STARS_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

export function beltMaterial(shared) {
  return new THREE.ShaderMaterial({
    uniforms: { uDays: shared.uDays, uPR: shared.uPR },
    vertexShader: BELT_VERT,
    fragmentShader: BELT_FRAG,
    transparent: true,
    depthWrite: false,
  });
}

export function skyMaterial(bandNormal) {
  return new THREE.ShaderMaterial({
    defines: { FBM_OCT: 6 }, // небо считается один раз при загрузке — можно не экономить
    uniforms: { uBandN: { value: bandNormal } },
    vertexShader: SKY_VERT,
    fragmentShader: SKY_FRAG,
    side: THREE.BackSide,
    depthWrite: false,
  });
}
