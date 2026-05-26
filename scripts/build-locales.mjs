#!/usr/bin/env node
/**
 * Builds locale JSON files from en.json + per-language string maps.
 * Run: node scripts/build-locales.mjs
 */
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const en = JSON.parse(readFileSync(join(root, 'locales/en.json'), 'utf8'));
const mapsDir = join(__dirname, 'maps');

const LANG_TARGETS = {
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

function collectStrings(node, key = '', out = []) {
  if (typeof node === 'string') {
    if (!SKIP_KEYS.has(key) && node.trim()) {
      out.push(node);
    }
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

function applyMap(node, map) {
  if (typeof node === 'string') {
    return map[node] ?? node;
  }
  if (Array.isArray(node)) {
    return node.map((v) => applyMap(v, map));
  }
  if (node && typeof node === 'object') {
    const next = {};
    for (const [k, v] of Object.entries(node)) {
      next[k] = applyMap(v, map);
    }
    return next;
  }
  return node;
}

function buildLocale(code, map) {
  const locale = applyMap(structuredClone(en), map);
  locale.meta.lang = code;
  return locale;
}

const enStrings = [...new Set(collectStrings(en))];
console.log(`English source strings: ${enStrings.length}`);

const mapFiles = readdirSync(mapsDir).filter((f) => f.endsWith('.json'));
for (const file of mapFiles) {
  const code = file.replace('.json', '');
  const map = JSON.parse(readFileSync(join(mapsDir, file), 'utf8'));
  const locale = buildLocale(code, map);
  const outPath = join(root, 'locales', `${code}.json`);
  writeFileSync(outPath, JSON.stringify(locale, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${outPath}`);
}

console.log('Done.');
