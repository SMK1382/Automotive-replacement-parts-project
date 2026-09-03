// ===================================================================
// مولد تصاویر SVG پیش‌فرض برای قطعات، بنرها و مقالات
// -------------------------------------------------------------------
// تصاویر تولیدشده کاملاً ساده و اختصاصی این پروژه هستند (گرادیان +
// ایموجی) و هیچ محتوای دارای حق‌حق نشر را کپی نمی‌کنند.
// اجرا:  node src/scripts/generate-images.mjs
// ===================================================================

import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..', 'public');

// پالت رنگی دو-tone برای هر خانواده قطعه
const palettes = {
  brake: ['#fee2e2', '#fecaca'],
  filter: ['#dbeafe', '#bfdbfe'],
  oil: ['#fef3c7', '#fde68a'],
  engine: ['#e0e7ff', '#c7d2fe'],
  electric: ['#fCE7f9'.toLowerCase(), '#f5d0fe'],
  suspension: ['#dcfce7', '#bbf7d0'],
  light: ['#ffedd5', '#fed7aa'],
  cooling: ['#cffafe', '#a5f3fc'],
  body: ['#f1f5f9', '#e2e8f0'],
  belt: ['#ede9fe', '#ddd6fe'],
  generic: ['#e2e8f0', '#cbd5e1'],
};

// نام فایل -> [ایموجی، پالت]
const parts = {
  'brake-pads': ['🛑', 'brake'],
  'brake-disc': ['💿', 'brake'],
  'brake-caliper': ['🗜️', 'brake'],
  'brake-cylinder': ['🔧', 'brake'],
  'brake-shoe': ['🥾', 'brake'],
  'brake-hose': ['〰️', 'brake'],
  'abs-sensor': ['📡', 'brake'],
  'wheel-bearing': ['⭕', 'brake'],
  'master-cylinder': ['🧯', 'brake'],
  'oil-filter': ['🛢️', 'oil'],
  'air-filter': ['🌀', 'filter'],
  'cabin-filter': ['🌬️', 'filter'],
  'fuel-filter': ['⛽', 'filter'],
  'engine-oil': ['💧', 'oil'],
  'spark-plug': ['⚡', 'electric'],
  'ignition-coil': ['🧲', 'electric'],
  alternator: ['🔋', 'electric'],
  starter: ['🔌', 'electric'],
  battery: ['🔋', 'electric'],
  'shock-absorber': ['🪀', 'suspension'],
  'control-arm': ['🦾', 'suspension'],
  'ball-joint': ['🔩', 'suspension'],
  bushing: ['⭕', 'suspension'],
  spring: ['🌀', 'suspension'],
  headlight: ['💡', 'light'],
  taillight: ['🚨', 'light'],
  'fog-light': ['🌫️', 'light'],
  'clutch-kit': ['⚙️', 'engine'],
  'timing-belt': ['🔗', 'belt'],
  'water-pump': ['🚿', 'cooling'],
  radiator: ['❄️', 'cooling'],
  thermostat: ['🌡️', 'cooling'],
  'coolant-sensor': ['📟', 'cooling'],
  'oxygen-sensor': ['📟', 'electric'],
  wiper: ['🧹', 'body'],
  mirror: ['🪞', 'body'],
  'body-part': ['🚗', 'body'],
  bumper: ['🛡️', 'body'],
  grille: ['ǀ', 'body'],
  'engine-mount': ['🔺', 'engine'],
};

const banners = {
  'hero-1': ['🚗', 'آبی', '#0a2540', '#1e3a8a'],
  'hero-2': ['🔧', 'سبز', '#064e3b', '#047857'],
  'hero-3': ['🛒', 'نارنجی', '#7c2d12', '#c2410c'],
};

const articles = {
  'blog-1': ['🔍', '#ecfeff', '#a5f3fc'],
  'blog-2': ['📅', '#fef9c3', '#fde047'],
  'blog-3': ['⚙️', '#f1f5f9', '#cbd5e1'],
  'blog-4': ['🛢️', '#fef3c7', '#fde68a'],
};

function partSvg(emoji, [c1, c2]) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" role="img">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c1}"/>
      <stop offset="1" stop-color="${c2}"/>
    </linearGradient>
  </defs>
  <rect width="400" height="300" rx="16" fill="url(#g)"/>
  <circle cx="200" cy="150" r="86" fill="rgba(255,255,255,.55)"/>
  <text x="200" y="158" font-size="96" text-anchor="middle" dominant-baseline="middle">${emoji}</text>
</svg>\n`;
}

function bannerSvg(emoji, c1, c2) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 360" role="img" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${c1}"/>
      <stop offset="1" stop-color="${c2}"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="360" fill="url(#g)"/>
  <circle cx="980" cy="180" r="200" fill="rgba(255,255,255,.08)"/>
  <circle cx="1040" cy="120" r="120" fill="rgba(255,255,255,.08)"/>
  <text x="240" y="196" font-size="150" text-anchor="middle" dominant-baseline="middle">${emoji}</text>
</svg>\n`;
}

// ساخت پوشه‌ها و نوشتن فایل‌ها
mkdirSync(join(ROOT, 'images', 'parts'), { recursive: true });
mkdirSync(join(ROOT, 'images', 'banners'), { recursive: true });
mkdirSync(join(ROOT, 'images', 'articles'), { recursive: true });

let n = 0;
for (const [name, [emoji, pal]] of Object.entries(parts)) {
  writeFileSync(join(ROOT, 'images', 'parts', `${name}.svg`), partSvg(emoji, palettes[pal] || palettes.generic));
  n++;
}
for (const [name, [emoji, , c1, c2]] of Object.entries(banners)) {
  writeFileSync(join(ROOT, 'images', 'banners', `${name}.svg`), bannerSvg(emoji, c1, c2));
  n++;
}
for (const [name, [emoji, c1, c2]] of Object.entries(articles)) {
  writeFileSync(join(ROOT, 'images', 'articles', `${name}.svg`), partSvg(emoji, [c1, c2]));
  n++;
}
console.log(`✅ ${n} فایل SVG در ${ROOT}/images ساخته شد`);
