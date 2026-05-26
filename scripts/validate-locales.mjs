#!/usr/bin/env node
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const en = JSON.parse(readFileSync(join(root, 'locales/en.json'), 'utf8'));
const manifest = JSON.parse(readFileSync(join(root, 'locales/manifest.json'), 'utf8'));

const SKIP_KEYS = new Set(['id', 'type', 'lang', 'icon']);
const ALLOW_SAME =
  /^(Bendgamine|Stripe|SendGrid|OpenAI|AWS|DigitalOcean|TLS|AES|GDPR|CCPA|Franklin|Email$|privacy@|dpo@bendgamine)/i;

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

const enSet = new Set(collectStrings(en));
let failed = false;

for (const { code } of manifest.languages) {
  if (code === 'en') continue;
  const path = join(root, 'locales', `${code}.json`);
  const loc = JSON.parse(readFileSync(path, 'utf8'));
  const locStrings = collectStrings(loc);
  const same = locStrings.filter(
    (s) => enSet.has(s) && s.length > 8 && !ALLOW_SAME.test(s) && !s.includes('@bendgamine.com')
  );
  const pct = ((1 - same.length / enSet.size) * 100).toFixed(1);
  const status = same.length === 0 ? 'OK' : same.length <= 5 ? 'WARN' : 'FAIL';
  if (status === 'FAIL') failed = true;
  console.log(
    `${code.padEnd(3)} ${status.padEnd(4)} translated~${pct}%  untranslated=${same.length}`
  );
  if (same.length > 0 && same.length <= 8) {
    same.forEach((s) => console.log(`      - ${s.slice(0, 72)}${s.length > 72 ? '…' : ''}`));
  }
}

process.exit(failed ? 1 : 0);
