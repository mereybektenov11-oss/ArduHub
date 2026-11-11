// Generates static design-concept mockups for ArduHub Desktop.
// Usage: node gen-design.mjs <repoRoot>
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.argv[2];
const out = join(root, "outputs", "app-design");
const F = "../../../src/fonts/";

const lessons = [
  "Первый огонёк",
  "Мигаем быстрее и медленнее",
  "Свет по кнопке",
  "Два светодиода: светофор",
  "Плавное свечение: PWM",
  "Потенциометр управляет яркостью",
  "Зуммер и первая мелодия",
  "Монитор порта",
  "Цифры на 7-сегментном индикаторе",
  "Сервопривод",
  "Датчик расстояния HC-SR04",
  "Экран LCD",
];

const concepts = {
  workshop: {
    title: "Мастерская изобретателя",
    tagline: "Тёплая мастерская: дерево, бумага, медь и карандашные пометки.",
    fonts: `
@font-face{font-family:Head;src:url(${F}Manrope-Variable.woff2) format("woff2");font-weight:700 800}
@font-face{font-family:Body;src:url(${F}Inter-Variable.woff2) format("woff2");font-weight:400 700}`,
    tokens: {
      "--color-bg": "#F6EFE3",
      "--color-surface": "#FFFBF4",
      "--color-surface-2": "#EFE2CC",
      "--color-text": "#2B2118",
      "--color-muted": "#6B5844",
      "--color-primary": "#B4501A",
      "--color-on-primary": "#FFFFFF",
      "--color-accent": "#2F6B4F",
      "--color-line": "#D8C5A6",
      "--color-locked": "#665645",
      "--color-led": "#E5322D",
      "--color-wood": "#A9744A",
      "--color-wood-dark": "#7A4E2D",
      "--color-metal": "#9AA3A8",
      "--color-board": "#2F6B4F",
      "--color-wall": "#E9D9BD",
      "--color-floor": "#C9A57A",
    },
    css: `
body{background:var(--color-bg) radial-gradient(var(--color-line) 1px,transparent 1px) 0 0/22px 22px}
.card{background:var(--color-surface);border:1.5px dashed var(--color-line);border-radius:18px;box-shadow:0 2px 0 var(--color-line),0 10px 24px rgba(77,52,26,.10)}
.btn{border-radius:12px;box-shadow:0 3px 0 #7d3711}
.btn.secondary{box-shadow:0 3px 0 var(--color-line)}
.chip{border-radius:999px}
h1,h2,h3,.logo{font-family:Head;letter-spacing:-.01em}
.node.done{background:var(--color-accent);color:#fff}
.node.current{background:var(--color-primary);color:#fff;outline:3px dashed var(--color-primary);outline-offset:4px}
.tag{transform:rotate(-2deg)}
`,
    model: "Low-poly с мягким toon-освещением: дерево, медь, ткань, тёплый свет лампы.",
  },
  neon: {
    title: "Ночная лаборатория",
    tagline: "Тёмная лаборатория: светящиеся провода, неон и экраны осциллографов.",
    fonts: `
@font-face{font-family:Head;src:url(${F}Monocraft-Regular.woff2) format("woff2");font-weight:400}
@font-face{font-family:Body;src:url(${F}Inter-Variable.woff2) format("woff2");font-weight:400 700}`,
    tokens: {
      "--color-bg": "#0B1020",
      "--color-surface": "#121A31",
      "--color-surface-2": "#1A2442",
      "--color-text": "#E6EDFF",
      "--color-muted": "#9AA8CC",
      "--color-primary": "#22D3EE",
      "--color-on-primary": "#062029",
      "--color-accent": "#F472B6",
      "--color-line": "#2A3760",
      "--color-locked": "#8F9CC0",
      "--color-led": "#4ADE80",
      "--color-wood": "#1F2A4D",
      "--color-wood-dark": "#151D38",
      "--color-metal": "#5B6A94",
      "--color-board": "#0E7490",
      "--color-wall": "#10172E",
      "--color-floor": "#0A0F1F",
    },
    css: `
body{background:var(--color-bg) linear-gradient(rgba(34,211,238,.06) 1px,transparent 1px) 0 0/100% 28px}
.card{background:linear-gradient(180deg,var(--color-surface),var(--color-bg));border:1px solid var(--color-line);border-radius:10px;box-shadow:0 0 0 1px rgba(34,211,238,.08),0 0 28px rgba(34,211,238,.08)}
.btn{border-radius:8px;box-shadow:0 0 18px rgba(34,211,238,.55)}
.btn.secondary{box-shadow:none;border:1px solid var(--color-primary);color:var(--color-primary)!important;background:transparent!important}
.chip{border-radius:6px}
h1,h2,h3,.logo{font-family:Head;font-weight:400;letter-spacing:.02em}
.node.done{background:transparent;color:var(--color-led);border:2px solid var(--color-led);box-shadow:0 0 14px rgba(74,222,128,.45)}
.node.current{background:var(--color-primary);color:var(--color-on-primary);box-shadow:0 0 22px rgba(34,211,238,.8)}
.glow{filter:drop-shadow(0 0 6px currentColor)}
`,
    model: "Тёмные гладкие поверхности, эмиссивные провода и светодиоды, bloom-свечение.",
  },
  toy: {
    title: "Яркий конструктор",
    tagline: "Сочный конструктор: крупные формы, толстые контуры и игрушечный пластик.",
    fonts: `
@font-face{font-family:Head;src:url(${F}Manrope-Variable.woff2) format("woff2");font-weight:700 800}
@font-face{font-family:Body;src:url(${F}Inter-Variable.woff2) format("woff2");font-weight:400 700}`,
    tokens: {
      "--color-bg": "#E8F3FF",
      "--color-surface": "#FFFFFF",
      "--color-surface-2": "#FFF3C4",
      "--color-text": "#14213D",
      "--color-muted": "#3D4B6B",
      "--color-primary": "#1D4ED8",
      "--color-on-primary": "#FFFFFF",
      "--color-accent": "#C2410C",
      "--color-line": "#14213D",
      "--color-locked": "#5B6785",
      "--color-led": "#EF4444",
      "--color-wood": "#FACC15",
      "--color-wood-dark": "#CA8A04",
      "--color-metal": "#93C5FD",
      "--color-board": "#16A34A",
      "--color-wall": "#BFDBFE",
      "--color-floor": "#FDE68A",
    },
    css: `
body{background:var(--color-bg) radial-gradient(#c9e1ff 3px,transparent 3px) 0 0/34px 34px}
.card{background:var(--color-surface);border:3px solid var(--color-line);border-radius:22px;box-shadow:6px 6px 0 var(--color-line)}
.btn{border:3px solid var(--color-line);border-radius:16px;box-shadow:4px 4px 0 var(--color-line)}
.btn.secondary{background:var(--color-surface-2)!important}
.chip{border:2px solid var(--color-line);border-radius:999px}
h1,h2,h3,.logo{font-family:Head;font-weight:800;letter-spacing:-.02em}
.node{border:3px solid var(--color-line)}
.node.done{background:var(--color-board);color:#fff}
.node.current{background:var(--color-primary);color:#fff;box-shadow:4px 4px 0 var(--color-line)}
`,
    model: "Пластиковый low-poly: скруглённые детали, чистые цвета, контурная обводка (outline-шейдер).",
  },
};

const base = `
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1440px;height:900px;overflow:hidden}
body{font-family:Body,system-ui,sans-serif;color:var(--color-text);font-size:16px;line-height:1.45}
.app{display:flex;flex-direction:column;height:900px;padding:24px 32px 40px;gap:20px}
.top{display:flex;align-items:center;gap:16px}
.logo{font-size:24px;color:var(--color-text)}
.logo b{color:var(--color-primary)}
.spacer{flex:1}
.chip{display:inline-flex;align-items:center;gap:8px;padding:6px 14px;background:var(--color-surface);color:var(--color-text);font-size:14px;font-weight:600;border:1px solid var(--color-line)}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 22px;background:var(--color-primary);color:var(--color-on-primary);font-weight:700;font-size:16px;border:0}
.btn.secondary{background:var(--color-surface);color:var(--color-text)}
.muted{color:var(--color-muted)}
.tag{display:inline-block;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;padding:4px 10px;background:var(--color-surface-2);color:var(--color-text);border-radius:6px}
.mock{position:fixed;right:16px;bottom:12px;font-size:12px;color:var(--color-muted)}
.card{padding:24px}
h1{font-size:44px;line-height:1.1}
h2{font-size:26px;line-height:1.2}
h3{font-size:18px}
.node{width:56px;height:56px;border-radius:50%;display:grid;place-items:center;font-weight:800;font-size:20px;background:var(--color-surface-2);color:var(--color-locked);flex:none}
`;

function page(c, title, body) {
  const tokens = Object.entries(c.tokens).map(([k, v]) => `${k}:${v}`).join(";");
  return `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=1440">
<title>${c.title} — ${title}</title>
<style>${c.fonts}
:root{${tokens}}
${base}
${c.css}
</style></head>
<body><div class="app">
<header class="top"><div class="logo">Ardu<b>Hub</b></div><span class="tag">${c.title}</span><div class="spacer"></div>
<span class="chip">Алия · Free</span><span class="chip">⚙ Настройки</span></header>
${body}
</div><div class="mock">Макет интерфейса ArduHub для ПК · приложение в разработке · данные — пример</div></body></html>`;
}

const menu = (c) =>
  page(c, "Главное меню", `
<main style="display:grid;grid-template-columns:1.1fr 1fr;gap:28px;flex:1">
  <section style="display:flex;flex-direction:column;justify-content:center;gap:18px">
    <span class="tag" style="align-self:flex-start">С возвращением</span>
    <h1>Привет, изобретатель!<br>Что соберём сегодня?</h1>
    <p class="muted" style="font-size:19px;max-width:520px">Учись по урокам, а потом проверяй знания в 3D-лаборатории: бери детали, соединяй провода и запускай свою программу.</p>
    <div style="display:flex;gap:14px"><span class="btn">Продолжить урок 2 →</span><span class="btn secondary">Открыть лабораторию</span></div>
  </section>
  <section style="display:grid;gap:18px;align-content:center">
    <div class="card" style="display:flex;gap:20px;align-items:center">
      <div class="node done" style="width:72px;height:72px;font-size:28px">2D</div>
      <div style="flex:1"><h2>Обучение</h2><p class="muted">Уроки: видео, теория, тест, схема и код</p>
      <div style="margin-top:10px;height:10px;border-radius:99px;background:var(--color-surface-2)"><div style="width:16%;height:100%;border-radius:99px;background:var(--color-accent)"></div></div>
      <p class="muted" style="font-size:13px;margin-top:6px">Пройдено 2 из 12 (пример)</p></div></div>
    <div class="card" style="display:flex;gap:20px;align-items:center">
      <div class="node current" style="width:72px;height:72px;font-size:28px">3D</div>
      <div style="flex:1"><h2>Практика</h2><p class="muted">Лаборатория: собери схему руками и запусти</p></div></div>
    <div class="card" style="display:flex;gap:20px;align-items:center">
      <div class="node" style="width:72px;height:72px;font-size:28px">☺</div>
      <div style="flex:1"><h2>Профиль</h2><p class="muted">Прогресс, тариф и настройки аккаунта</p></div></div>
  </section>
</main>`);

const map = (c) => {
  const items = lessons
    .map((t, i) => {
      const st = i < 2 ? "done" : i === 2 ? "current" : "";
      const label = i < 2 ? "Пройден" : i === 2 ? "Сейчас" : "Закрыт";
      return `<div class="card" style="display:flex;gap:14px;align-items:center;padding:14px 16px">
<div class="node ${st}">${i < 2 ? "✓" : i + 1}</div><div><h3>${t}</h3><p class="muted" style="font-size:13px">Урок ${i + 1} · ${label}</p></div></div>`;
    })
    .join("");
  return page(c, "Карта уроков", `
<div style="display:flex;align-items:flex-end;gap:16px"><div><span class="tag">Обучение · Arduino Uno</span><h1 style="font-size:36px;margin-top:8px">Карта уроков</h1></div>
<div class="spacer"></div><span class="chip">Free: 12 уроков</span></div>
<main style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;flex:1;align-content:start">${items}</main>
<div class="card" style="display:flex;align-items:center;gap:16px;padding:16px 20px;opacity:.9">
<div class="node">🔒</div><div style="flex:1"><h3>Премиум: ESP32 и новые уроки</h3><p class="muted" style="font-size:14px">Планируется. Состав и сроки пока не определены.</p></div><span class="btn secondary">Подробнее о тарифах</span></div>`);
};

const lesson = (c) => {
  const steps = ["Видео", "Теория", "Тест", "Схема", "Код", "Запуск"]
    .map((s, i) => `<span class="chip" style="${i === 3 || i === 4 ? "background:var(--color-primary);color:var(--color-on-primary)" : i < 3 ? "" : "opacity:.7"}">${i < 3 ? "✓ " : ""}${s}</span>`)
    .join("");
  return page(c, "Урок — схема и код", `
<div style="display:flex;align-items:center;gap:12px"><span class="tag">Урок 1</span><h2>Первый огонёк</h2><div class="spacer"></div>${steps}</div>
<main style="display:grid;grid-template-columns:320px 1fr 420px;gap:18px;flex:1;min-height:0">
  <aside class="card" style="display:flex;flex-direction:column;gap:14px">
    <h3>Задание</h3>
    <p>Собери цепь светодиода с резистором на пине 13 и дополни программу мигания.</p>
    <h3>Замкнутая цепь</h3><p class="muted" style="font-size:14px">Ток должен пройти через резистор и светодиод, а затем вернуться к GND.</p>
    <h3>Полярность</h3><p class="muted" style="font-size:14px">Анод A подключают к выходу через резистор. Катод C ведёт к GND.</p>
    <div class="spacer"></div><span class="btn secondary">💡 Подсказка</span>
  </aside>
  <section class="card" style="display:flex;flex-direction:column;gap:10px">
    <div style="display:flex;gap:8px"><span class="chip">Uno</span><span class="chip">Резистор 220 Ом</span><span class="chip">Светодиод</span></div>
    <svg viewBox="0 0 560 360" style="flex:1;width:100%">
      <rect x="30" y="80" width="230" height="200" rx="14" fill="var(--color-board)"/>
      <text x="60" y="190" font-family="Head" font-size="26" fill="#fff">UNO</text>
      ${Array.from({ length: 10 }, (_, i) => `<rect x="${60 + i * 18}" y="92" width="10" height="14" rx="2" fill="#fff" opacity=".85"/>`).join("")}
      <text x="226" y="128" font-size="13" fill="#fff">13</text><text x="150" y="128" font-size="13" fill="#fff">GND</text>
      <path d="M232 100 C 300 40, 340 40, 360 120" stroke="var(--color-primary)" stroke-width="6" fill="none" stroke-linecap="round" class="glow"/>
      <rect x="350" y="118" width="22" height="70" rx="6" fill="var(--color-wood)" stroke="var(--color-line)" stroke-width="2"/>
      <rect x="350" y="138" width="22" height="6" fill="var(--color-wood-dark)"/><rect x="350" y="154" width="22" height="6" fill="var(--color-wood-dark)"/>
      <path d="M361 188 C 361 230, 420 230, 430 200" stroke="var(--color-primary)" stroke-width="6" fill="none" stroke-linecap="round" class="glow"/>
      <circle cx="440" cy="170" r="30" fill="var(--color-led)" class="glow" style="color:var(--color-led)"/>
      <rect x="425" y="196" width="6" height="40" fill="var(--color-metal)"/><rect x="449" y="196" width="6" height="52" fill="var(--color-metal)"/>
      <path d="M452 250 C 430 330, 180 330, 165 108" stroke="var(--color-accent)" stroke-width="6" fill="none" stroke-dasharray="2 12" stroke-linecap="round"/>
      <text x="300" y="345" font-size="14" fill="var(--color-muted)">Провод к GND ещё не подключён</text>
    </svg>
  </section>
  <section class="card" style="display:flex;flex-direction:column;gap:12px">
    <h3>Код</h3>
    <pre style="flex:1;font:15px/1.6 Consolas,monospace;background:var(--color-surface-2);color:var(--color-text);padding:16px;border-radius:10px;white-space:pre">void setup() {
  pinMode(<b style="color:var(--color-primary)">___</b>, OUTPUT);
}

void loop() {
  digitalWrite(13, <b style="color:var(--color-primary)">___</b>);
  delay(<b style="color:var(--color-primary)">___</b>);
  digitalWrite(13, LOW);
  delay(1000);
}</pre>
    <div style="display:flex;gap:10px"><span class="btn" style="flex:1">▶ Запустить</span><span class="btn secondary">Проверить</span></div>
  </section>
</main>`);
};

const lab = (c) =>
  page(c, "3D-практика", `
<main style="position:relative;flex:1;border-radius:18px;overflow:hidden" class="card" >
<svg viewBox="0 0 1376 760" preserveAspectRatio="xMidYMid slice" style="position:absolute;inset:0;width:100%;height:100%">
  <rect width="1376" height="420" fill="var(--color-wall)"/>
  <polygon points="0,420 1376,420 1376,760 0,760" fill="var(--color-floor)"/>
  <polygon points="0,760 300,420 1076,420 1376,760" fill="var(--color-floor)" opacity=".6"/>
  <!-- shelf --><g transform="translate(0,90)">
  <rect x="80" y="150" width="260" height="300" fill="var(--color-wood-dark)"/>
  ${[0, 1, 2].map((r) => `<rect x="90" y="${180 + r * 90}" width="240" height="12" fill="var(--color-wood)"/>`).join("")}
  <rect x="110" y="140" width="70" height="40" rx="6" fill="var(--color-board)"/>
  <circle cx="230" cy="250" r="16" fill="var(--color-led)"/><circle cx="270" cy="250" r="16" fill="var(--color-led)" opacity=".6"/>
  <rect x="120" y="240" width="60" height="18" rx="6" fill="var(--color-wood)" stroke="var(--color-line)" stroke-width="2"/>
  <rect x="120" y="330" width="44" height="34" rx="6" fill="var(--color-metal)"/><rect x="190" y="330" width="44" height="34" rx="6" fill="var(--color-metal)"/>
  </g><!-- bench -->
  <polygon points="430,470 980,470 1060,560 350,560" fill="var(--color-wood)"/>
  <rect x="350" y="560" width="710" height="26" fill="var(--color-wood-dark)"/>
  <rect x="380" y="586" width="26" height="150" fill="var(--color-wood-dark)"/><rect x="1004" y="586" width="26" height="150" fill="var(--color-wood-dark)"/>
  <polygon points="540,488 720,488 740,530 520,530" fill="var(--color-board)"/>
  <path d="M700 500 C 760 470, 800 470, 830 505" stroke="var(--color-primary)" stroke-width="7" fill="none" class="glow"/>
  <rect x="818" y="496" width="40" height="16" rx="5" fill="var(--color-wood-dark)"/>
  <circle cx="900" cy="500" r="18" fill="var(--color-led)" class="glow" style="color:var(--color-led)"/>
  <!-- terminal -->
  <rect x="1110" y="250" width="200" height="140" rx="10" fill="var(--color-wood-dark)"/>
  <rect x="1124" y="264" width="172" height="104" rx="6" fill="var(--color-surface-2)"/>
  ${[0, 1, 2, 3].map((i) => `<rect x="1136" y="${280 + i * 20}" width="${[120, 90, 140, 70][i]}" height="8" rx="4" fill="var(--color-primary)" opacity=".8"/>`).join("")}
  <rect x="1190" y="390" width="40" height="160" fill="var(--color-wood-dark)"/>
  <!-- lever -->
  <rect x="1100" y="610" width="90" height="40" rx="8" fill="var(--color-metal)"/>
  <line x1="1145" y1="615" x2="1175" y2="560" stroke="var(--color-text)" stroke-width="8" stroke-linecap="round"/>
  <circle cx="1175" cy="560" r="12" fill="var(--color-accent)"/>
  <!-- player -->
  <ellipse cx="640" cy="720" rx="60" ry="14" fill="#000" opacity=".18"/>
  <rect x="600" y="600" width="80" height="110" rx="34" fill="var(--color-primary)"/>
  <circle cx="640" cy="580" r="34" fill="var(--color-surface)" stroke="var(--color-line)" stroke-width="3"/>
</svg>
<div class="card" style="position:absolute;left:20px;top:20px;width:420px;padding:16px 18px">
  <span class="tag">Задание 1 · Первый огонёк</span>
  <p style="margin-top:8px;font-weight:600">Собери цепь светодиода с резистором на пине 13 и запусти мигание.</p>
  <p class="muted" style="font-size:14px;margin-top:6px">✓ Плата на верстаке · ✓ Резистор · ○ Провод к GND · ○ Код</p>
</div>
<div class="card" style="position:absolute;right:20px;top:20px;padding:12px 16px;display:flex;gap:10px;align-items:center">
  <span class="chip">В руках: провод</span><span class="chip">Песочница</span>
</div>
<div class="card" style="position:absolute;left:20px;bottom:20px;padding:12px 16px;display:flex;gap:14px;font-size:14px">
  <span><b>WASD</b> — идти</span><span><b>E</b> — взять / положить</span><span><b>ЛКМ</b> — соединить пины</span><span><b>Tab</b> — код</span>
</div>
<span class="btn" style="position:absolute;right:20px;bottom:20px;font-size:18px;padding:14px 26px">⚡ Запуск</span>
</main>`);

const screens = { menu, map, lesson, lab };
const screenNames = { menu: "Главное меню", map: "Карта уроков", lesson: "Урок: схема и код", lab: "3D-практика" };

for (const [id, c] of Object.entries(concepts)) {
  mkdirSync(join(out, id), { recursive: true });
  for (const [s, fn] of Object.entries(screens)) writeFileSync(join(out, id, `${s}.html`), fn(c));
}

const cols = Object.entries(concepts)
  .map(([id, c]) => `<section><h2>${c.title}</h2><p>${c.tagline}</p><p><i>3D:</i> ${c.model}</p>
${Object.keys(screens).map((s) => `<a href="${id}/${s}.html"><img src="${id}/${s}.png" alt="${c.title}: ${screenNames[s]}"><span>${screenNames[s]}</span></a>`).join("")}</section>`)
  .join("");
writeFileSync(join(out, "index.html"), `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>ArduHub Desktop — концепции стиля</title>
<style>body{font-family:system-ui,sans-serif;margin:24px;background:#f4f4f5;color:#18181b}main{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
section{background:#fff;border-radius:14px;padding:18px}a{display:block;margin:12px 0;color:inherit;text-decoration:none}img{width:100%;border-radius:8px;border:1px solid #ddd}span{font-size:13px;color:#52525b}</style></head>
<body><h1>ArduHub Desktop — три концепции игрового стиля</h1><p>Статичные макеты 1440×900 для выбора владельцем. Это не готовое приложение; данные на экранах — пример.</p><main>${cols}</main></body></html>`);

writeFileSync(join(out, "tokens.json"), JSON.stringify(Object.fromEntries(Object.entries(concepts).map(([k, c]) => [k, c.tokens])), null, 2));
console.log("generated", Object.keys(concepts).length * 4, "screens");
