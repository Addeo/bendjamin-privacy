const DEFAULT_LANG = 'en';
const STORAGE_KEY = 'bendgamine-privacy-lang';

let manifest = null;
let supportedLangs = [];
let langByCode = new Map();

async function loadManifest() {
  const url = new URL('locales/manifest.json', window.location.href).href;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to load language manifest');
  }
  manifest = await response.json();
  supportedLangs = manifest.languages.map((l) => l.code);
  langByCode = new Map(manifest.languages.map((l) => [l.code, l]));
}

function detectLang() {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get('lang');
  if (fromUrl && supportedLangs.includes(fromUrl)) {
    return fromUrl;
  }
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && supportedLangs.includes(stored)) {
    return stored;
  }
  const browser = (navigator.language || '').toLowerCase();
  const primary = browser.split('-')[0];
  if (supportedLangs.includes(browser)) {
    return browser;
  }
  if (supportedLangs.includes(primary)) {
    return primary;
  }
  return manifest?.default || DEFAULT_LANG;
}

function localeUrl(lang) {
  return new URL(`locales/${lang}.json`, window.location.href).href;
}

async function loadLocale(lang) {
  const response = await fetch(localeUrl(lang));
  if (!response.ok) {
    throw new Error(`Failed to load locale: ${lang}`);
  }
  return response.json();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderList(items) {
  if (!items?.length) {
    return '';
  }
  const lis = items
    .map((item) => {
      if (typeof item === 'string') {
        return `<li>${escapeHtml(item)}</li>`;
      }
      const sub = item.items ? renderList(item.items) : '';
      return `<li><strong>${escapeHtml(item.label)}</strong>${sub}</li>`;
    })
    .join('');
  return `<ul>${lis}</ul>`;
}

function renderBlock(block) {
  if (block.type === 'p') {
    return `<p>${escapeHtml(block.text)}</p>`;
  }
  if (block.type === 'list') {
    return renderList(block.items);
  }
  if (block.type === 'h3') {
    return `<h3>${escapeHtml(block.text)}</h3>`;
  }
  if (block.type === 'contact') {
    return (block.entries || [])
      .map((entry) => {
        let html = `<p><strong>${escapeHtml(entry.heading)}</strong></p>`;
        if (entry.email) {
          const label = entry.emailLabel ? `${escapeHtml(entry.emailLabel)}: ` : '';
          html += `<p>${label}<a href="mailto:${escapeHtml(entry.email)}">${escapeHtml(entry.email)}</a>`;
          if (entry.note) {
            html += ` (${escapeHtml(entry.note)})`;
          }
          html += '</p>';
        }
        if (entry.text) {
          html += `<p>${escapeHtml(entry.text)}</p>`;
        }
        return html;
      })
      .join('');
  }
  return '';
}

function renderSection(section) {
  const blocks = (section.blocks || []).map(renderBlock).join('');
  const id = section.id ? ` id="${section.id}"` : '';
  return `
    <section class="policy-section"${id}>
      <h2>${escapeHtml(section.title)}</h2>
      ${blocks}
    </section>
  `;
}

function renderToc(sections, tocTitle) {
  const links = sections
    .filter((s) => s.id)
    .map((s) => `<li><a href="#${s.id}">${escapeHtml(s.title)}</a></li>`)
    .join('');
  return `
    <nav class="toc" aria-label="${escapeHtml(tocTitle)}">
      <h2>${escapeHtml(tocTitle)}</h2>
      <ul>${links}</ul>
    </nav>
  `;
}

function renderPage(locale) {
  const { meta, hero, toc, sections, footer } = locale;
  const langInfo = langByCode.get(meta.lang);
  const rtl = langInfo?.rtl === true;

  document.documentElement.lang = meta.lang;
  document.documentElement.dir = rtl ? 'rtl' : 'ltr';
  document.title = meta.title;

  document.getElementById('app').innerHTML = `
    <article class="hero">
      <h1>${escapeHtml(hero.title)}</h1>
      <p class="dates">${escapeHtml(hero.effective)} · ${escapeHtml(hero.updated)}</p>
    </article>
    ${renderToc(sections, toc.title)}
    ${sections.map(renderSection).join('')}
  `;

  document.getElementById('footer-text').textContent = footer;
}

function buildLangSelect(currentLang) {
  const select = document.getElementById('lang-select');
  select.innerHTML = manifest.languages
    .map(
      (l) =>
        `<option value="${l.code}"${l.code === currentLang ? ' selected' : ''}>${escapeHtml(l.native)}</option>`
    )
    .join('');
  select.value = currentLang;
}

function updateUrlLang(lang) {
  const url = new URL(window.location.href);
  url.searchParams.set('lang', lang);
  window.history.replaceState({}, '', url);
}

async function setLanguage(lang) {
  if (!supportedLangs.includes(lang)) {
    lang = manifest.default || DEFAULT_LANG;
  }

  buildLangSelect(lang);
  localStorage.setItem(STORAGE_KEY, lang);
  updateUrlLang(lang);

  try {
    const locale = await loadLocale(lang);
    renderPage(locale);
  } catch (err) {
    if (lang !== DEFAULT_LANG) {
      await setLanguage(manifest.default || DEFAULT_LANG);
      return;
    }
    document.getElementById('app').innerHTML =
      '<p class="loading">Failed to load content. Please refresh the page.</p>';
    console.error(err);
  }
}

function initLangSelect() {
  document.getElementById('lang-select').addEventListener('change', (e) => {
    setLanguage(e.target.value);
  });
}

async function init() {
  try {
    await loadManifest();
    initLangSelect();
    await setLanguage(detectLang());
  } catch (err) {
    document.getElementById('app').innerHTML =
      '<p class="loading">Failed to load content. Please refresh the page.</p>';
    console.error(err);
  }
}

init();
