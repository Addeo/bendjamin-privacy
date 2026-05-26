#!/usr/bin/env node
/**
 * Generates scripts/maps/{lang}.json from en.json via google-translate-api-x.
 * Run: node scripts/generate-maps.mjs [lang...]
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import translate from 'google-translate-api-x';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const mapsDir = join(__dirname, 'maps');
mkdirSync(mapsDir, { recursive: true });

const en = JSON.parse(readFileSync(join(root, 'locales/en.json'), 'utf8'));

const LANG_API = {
  es: 'es',
  zh: 'zh-CN',
  hi: 'hi',
  ar: 'ar',
  pt: 'pt',
  bn: 'bn',
  ru: 'ru',
  ja: 'ja',
  fr: 'fr',
  de: 'de',
  ko: 'ko',
  it: 'it',
  tr: 'tr',
  vi: 'vi',
  pl: 'pl',
  nl: 'nl',
  id: 'id',
  uk: 'uk',
  th: 'th',
};

const SKIP_KEYS = new Set(['id', 'type', 'lang', 'icon', 'email']);

function shouldTranslateString(node, key) {
  if (SKIP_KEYS.has(key) || !node.trim()) return false;
  if (node.includes('mailto:') || node.includes('<a ') || node.includes('<strong>')) {
    return false;
  }
  return true;
}

function collectStrings(node, key = '', out = []) {
  if (typeof node === 'string') {
    if (shouldTranslateString(node, key)) out.push(node);
    return out;
  }
  if (Array.isArray(node)) {
    node.forEach((v) => collectStrings(v, key, out));
    return out;
  }
  if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      collectStrings(v, k, out);
    }
  }
  return out;
}

function buildMapFromLocales(enObj, targetObj, map = {}) {
  if (typeof enObj === 'string' && typeof targetObj === 'string') {
    if (enObj !== targetObj) map[enObj] = targetObj;
    return map;
  }
  if (Array.isArray(enObj) && Array.isArray(targetObj)) {
    enObj.forEach((v, i) => buildMapFromLocales(v, targetObj[i], map));
    return map;
  }
  if (enObj && targetObj && typeof enObj === 'object') {
    for (const k of Object.keys(enObj)) {
      buildMapFromLocales(enObj[k], targetObj[k], map);
    }
  }
  return map;
}

const cache = new Map();

async function translateText(text, target) {
  const key = `${target}::${text}`;
  if (cache.has(key)) return cache.get(key);
  try {
    const res = await translate(text, { from: 'en', to: target });
    const out = res.text || text;
    cache.set(key, out);
    await new Promise((r) => setTimeout(r, 120));
    return out;
  } catch (err) {
    console.warn(`  translate failed: ${text.slice(0, 40)}...`, err.message);
    return text;
  }
}

async function generateMap(code, force = true) {
  const mapPath = join(mapsDir, `${code}.json`);
  if (!force && existsSync(mapPath)) {
    console.log(`Skip ${code} (map exists)`);
    return;
  }

  if (code === 'ru' && existsSync(join(root, 'locales/ru.json'))) {
    const ru = JSON.parse(readFileSync(join(root, 'locales/ru.json'), 'utf8'));
    const map = buildMapFromLocales(en, ru);
    writeFileSync(mapPath, JSON.stringify(map, null, 2) + '\n');
    console.log(`Built ${code} from ru.json (${Object.keys(map).length} entries)`);
    return;
  }

  const apiLang = LANG_API[code];
  if (!apiLang) {
    console.warn(`Unknown lang: ${code}`);
    return;
  }

  const strings = [...new Set(collectStrings(en))];
  const map = {};
  console.log(`Translating ${code}: ${strings.length} strings...`);

  for (let i = 0; i < strings.length; i++) {
    const s = strings[i];
    map[s] = await translateText(s, apiLang);
    if ((i + 1) % 25 === 0 || i === strings.length - 1) {
      console.log(`  ${code}: ${i + 1}/${strings.length}`);
    }
  }

  writeFileSync(mapPath, JSON.stringify(map, null, 2) + '\n');
  console.log(`Wrote ${mapPath}`);
}

const args = process.argv.slice(2);
const langs = args.length ? args : Object.keys(LANG_API);

for (const code of langs) {
  await generateMap(code);
}

console.log('Maps generation complete.');
