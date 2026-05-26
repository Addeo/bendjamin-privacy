# Bendgamine Privacy Policy (GitHub Pages)

Static, multilingual privacy policy site (English + Russian) for linking from the Bendgamine app.

## Local preview

```bash
cd bendjamin-privacy
python3 -m http.server 8080
```

Open [http://localhost:8080](http://localhost:8080). Locale JSON must be served over HTTP (not `file://`).

## Deploy to GitHub Pages

1. Create a repository on GitHub (e.g. `bendjamin-privacy`).
2. Push this folder:

   ```bash
   git init
   git add .
   git commit -m "Add multilingual privacy policy site"
   git branch -M main
   git remote add origin git@github.com:YOUR_USER/bendjamin-privacy.git
   git push -u origin main
   ```

3. In the repo: **Settings → Pages**
   - **Source:** Deploy from a branch
   - **Branch:** `gh-pages` / `/ (root)`
   - Save

   Pushes to `main` also update `gh-pages` via GitHub Actions (`.github/workflows/gh-pages.yml`).

4. After a minute, the site is live at:

   `https://addeo.github.io/bendjamin-privacy/`

## Link from your app

Use the full URL, optionally with language:

| Link | Behavior |
|------|----------|
| `https://addeo.github.io/bendjamin-privacy/` | Browser language or saved preference |
| `...?lang=en` | Force English |
| `...?lang=ru` | Force Russian |

Example (Angular):

```typescript
export const PRIVACY_POLICY_URL =
  'https://addeo.github.io/bendjamin-privacy/?lang=en';
```

## Customize

| What | Where |
|------|--------|
| Dates | `locales/en.json`, `locales/ru.json` → `hero.effective`, `hero.updated` |
| Company address | `contact` section in both locale files |
| Transparency numbers | `transparency` section |
| Add a language | Copy `locales/en.json`, add button in `index.html`, register in `js/app.js` → `SUPPORTED_LANGS` |

## Structure

```
index.html
css/style.css
js/app.js
locales/en.json
locales/ru.json
.nojekyll
```

No build step required.
