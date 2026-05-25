const DEFAULT_LANG = 'en';
const SUPPORTED_LANGS = ['en', 'ru'];
const STORAGE_KEY = 'bendgamine-privacy-lang';

let currentLocale = null;

function detectLang() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && SUPPORTED_LANGS.includes(stored)) {
    return stored;
  }
  const browser = (navigator.language || '').slice(0, 2).toLowerCase();
  if (SUPPORTED_LANGS.includes(browser)) {
    return browser;
  }
  return DEFAULT_LANG;
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

function renderList(items, nested = false) {
  if (!items?.length) {
    return '';
  }
  const tag = nested ? 'ul' : 'ul';
  const lis = items
    .map((item) => {
      if (typeof item === 'string') {
        return `<li>${escapeHtml(item)}</li>`;
      }
      const sub = item.items ? renderList(item.items, true) : '';
      return `<li><strong>${escapeHtml(item.label)}</strong>${sub}</li>`;
    })
    .join('');
  return `<${tag}>${lis}</${tag}>`;
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
    return block.lines
      .map((line) => `<p>${line}</p>`)
      .join('');
  }
  return '';
}

function renderSection(section) {
  const blocks = (section.blocks || []).map(renderBlock).join('');
  const id = section.id ? ` id="${section.id}"` : '';
  const icon = section.icon ? `${section.icon} ` : '';
  return `
    <section class="policy-section"${id}>
      <h2>${icon}${escapeHtml(section.title)}</h2>
      ${blocks}
    </section>
  `;
}

function renderToc(sections, tocTitle) {
  const links = sections
    .filter((s) => s.id)
    .map(
      (s) =>
        `<li><a href="#${s.id}">${escapeHtml(s.title.replace(/^[^\s]+\s/, ''))}</a></li>`
    )
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
  document.documentElement.lang = meta.lang;
  document.title = meta.title;

  const tocHtml = renderToc(sections, toc.title);
  const sectionsHtml = sections.map(renderSection).join('');

  document.getElementById('app').innerHTML = `
    <article class="hero">
      <h1>${escapeHtml(hero.title)}</h1>
      <p class="dates">${escapeHtml(hero.effective)} · ${escapeHtml(hero.updated)}</p>
    </article>
    ${tocHtml}
    ${sectionsHtml}
  `;

  document.getElementById('footer-text').textContent = footer;
}

function setActiveLangButton(lang) {
  document.querySelectorAll('.lang-switch button').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });
}

async function setLanguage(lang) {
  if (!SUPPORTED_LANGS.includes(lang)) {
    return;
  }
  setActiveLangButton(lang);
  localStorage.setItem(STORAGE_KEY, lang);

  try {
    currentLocale = await loadLocale(lang);
    renderPage(currentLocale);
  } catch (err) {
    document.getElementById('app').innerHTML =
      '<p class="loading">Failed to load content. Please refresh the page.</p>';
    console.error(err);
  }
}

function initLangSwitch() {
  document.querySelectorAll('.lang-switch button').forEach((btn) => {
    btn.addEventListener('click', () => setLanguage(btn.dataset.lang));
  });
}

function initHashSync() {
  const lang = new URLSearchParams(window.location.search).get('lang');
  if (lang && SUPPORTED_LANGS.includes(lang)) {
    localStorage.setItem(STORAGE_KEY, lang);
  }
}

initHashSync();
initLangSwitch();
setLanguage(detectLang());
