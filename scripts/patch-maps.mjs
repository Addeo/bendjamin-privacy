#!/usr/bin/env node
/**
 * Re-translate missing or failed entries in scripts/maps/*.json
 * Run: node scripts/patch-maps.mjs [lang...]
 */
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import translate from 'google-translate-api-x';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const mapsDir = join(__dirname, 'maps');
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

function collectStrings(node, key = '', out = []) {
  if (typeof node === 'string') {
    if (!SKIP_KEYS.has(key) && node.trim()) out.push(node);
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

const enStrings = [...new Set(collectStrings(en))];

async function translateText(text, target) {
  const res = await translate(text, { from: 'en', to: target, rejectOnPartialFail: false });
  await new Promise((r) => setTimeout(r, 150));
  return res.text || text;
}

async function patchLang(code) {
  if (code === 'ru') {
    const ru = JSON.parse(readFileSync(join(root, 'locales/ru.json'), 'utf8'));
    const map = {};
    function diff(enNode, ruNode) {
      if (typeof enNode === 'string' && typeof ruNode === 'string' && enNode !== ruNode) {
        map[enNode] = ruNode;
        return;
      }
      if (Array.isArray(enNode) && Array.isArray(ruNode)) {
        enNode.forEach((v, i) => diff(v, ruNode[i]));
        return;
      }
      if (enNode && ruNode && typeof enNode === 'object') {
        for (const k of Object.keys(enNode)) diff(enNode[k], ruNode[k]);
      }
    }
    diff(en, ru);
    writeFileSync(join(mapsDir, 'ru.json'), JSON.stringify(map, null, 2) + '\n');
    console.log(`ru: rebuilt map (${Object.keys(map).length} entries)`);
    return;
  }

  const apiLang = LANG_API[code];
  if (!apiLang) return;

  const mapPath = join(mapsDir, `${code}.json`);
  const map = JSON.parse(readFileSync(mapPath, 'utf8'));
  let patched = 0;

  for (const s of enStrings) {
    const needs = !(s in map) || map[s] === s || map[s] === s.trim();
    if (!needs) continue;
    map[s] = await translateText(s, apiLang);
    patched++;
    console.log(`  ${code}: patched "${s.slice(0, 50)}..."`);
  }

  writeFileSync(mapPath, JSON.stringify(map, null, 2) + '\n');
  console.log(`${code}: ${patched} entries patched`);
}

const args = process.argv.slice(2);
const langs = args.length ? args : readdirSync(mapsDir).map((f) => f.replace('.json', ''));

for (const code of langs) {
  await patchLang(code);
}

console.log('Patch complete.');
