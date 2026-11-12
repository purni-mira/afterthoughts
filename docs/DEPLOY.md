# Deploying Afterthoughts

Afterthoughts is a static site: plain HTML, CSS and JavaScript with no build step. Anything that can serve files can host it. The only optional server part is `api/ai.js`, which lets visitors use the AI without bringing their own key.

| Where | Time | AI for visitors | Best for |
| --- | --- | --- | --- |
| [Vercel](#1-vercel-recommended) | 10 min | Yes, with your key on the server | Sharing a public link |
| [Netlify](#2-netlify) | 10 min | Yes, with your key on the server | Same, if you prefer Netlify |
| [GitHub Pages](#3-github-pages) | 5 min | Demo mode or their own key | Free hosting straight from the repo |
| [Any website / hosting panel](#4-any-website-or-hosting-panel) | 5 min | Demo mode or their own key | Putting it on a site you already have |
| [Inside another site (iframe)](#5-inside-another-site-iframe) | 2 min | Same as where it's hosted | Embedding in a portfolio or college site |

---

## Just for yourself? The simplest setup

If the app is only for you, skip the server entirely:

1. Deploy the static site (Vercel, Netlify or GitHub Pages below, no environment variables).
2. Create a free Gemini key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
3. Open your site → **Settings → Google Gemini**, paste the key, **Save**, **Test connection**.

The key is saved only in your browser and is never stored on the website, so nobody else who finds the link can use it. Repeat step 3 once on your phone.

## Personalise it (`config.js`)

- `owner.name`: the name the dashboard greets on first open
- `gift`: a one-time welcome note (`to`, `from`, `message`). Delete the block to switch it off
- `provider`: the AI new visitors start with (`demo` or `server`)

## 0. Put the code on GitHub (no command line needed)

1. Sign in at [github.com](https://github.com) and click **New repository**. Name it `afterthoughts`. Keep it **Private** if you don't want others to see the code. Don't add a README (this project has one).
2. On the empty repository page, click **uploading an existing file**.
3. Unzip `afterthoughts.zip` on your computer, open the folder, select **everything inside it** (including the `api`, `assets`, `css`, `docs`, `js`, `netlify` and `tools` folders) and drag it into the browser.
4. Write a message like "Afterthoughts v2" and click **Commit changes**.

Using git instead:

```bash
cd afterthoughts
git init && git add . && git commit -m "Afterthoughts v2"
git branch -M main
git remote add origin https://github.com/<your-username>/afterthoughts.git
git push -u origin main
```

---

## 1. Vercel (recommended)

**Static site, everyone in Demo mode or with their own key:**

1. Go to [vercel.com/new](https://vercel.com/new) and sign in with GitHub.
2. Import the `afterthoughts` repository. Framework preset: **Other**. Leave build and output settings empty.
3. Click **Deploy**. You get a link like `afterthoughts-yourname.vercel.app`.

**Give every visitor the real AI (your key, on the server):**

1. Get an API key. Gemini is the cheapest way to start and has a free tier: [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
2. In Vercel: **Project → Settings → Environment Variables**, add:

   | Name | Value |
   | --- | --- |
   | `AI_PROVIDER` | `gemini` (or `anthropic`, `openai`) |
   | `GEMINI_API_KEY` | your key (or `ANTHROPIC_API_KEY` / `OPENAI_API_KEY`) |
   | `ALLOWED_ORIGINS` | your site address, e.g. `https://afterthoughts-yourname.vercel.app` (stops other sites using your key) |
   | `ACCESS_CODE` | **recommended**: a password; visitors enter it once in Settings → My server. Without it anyone who finds the site can spend your credit |
   | `RATE_LIMIT_PER_MIN` | optional, default `30` requests per minute per visitor |
   | `DAILY_LIMIT` | optional, default `300` requests per day per visitor |
   | `AI_MODEL` / `AI_MODEL_BIG` | optional model overrides |

3. In the repo, open `config.js` and change `provider: "demo"` to `provider: "server"`. Commit. Vercel redeploys automatically.
4. Open your site, go to **Settings → Test connection**. It should say "Connected".

The server also powers **Fetch text** on the Link tab: it downloads an article and strips it to readable text.

> Costs: you pay your AI provider for every visitor's sessions. A full session is roughly 15,000 input and 3,000 output tokens. Set a monthly budget limit in your provider's console before sharing the link widely.

## 2. Netlify

1. [app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing project** → pick the GitHub repo.
2. Build command: empty. Publish directory: `.` (the `netlify.toml` file already sets this and wires `/api/ai` to the function).
3. For server AI: **Site configuration → Environment variables**, add the same variables as Vercel above, then set `provider: "server"` in `config.js`.

Drag-and-drop deploys on Netlify work for the static site but don't include functions. Use the GitHub import for server AI.

## 3. GitHub Pages

1. In the repository: **Settings → Pages**.
2. Source: **Deploy from a branch**, branch `main`, folder `/ (root)`. Save.
3. After a minute your site is live at `https://<your-username>.github.io/afterthoughts/`.

GitHub Pages can't run `api/ai.js`, so visitors use Demo mode or paste their own key in Settings.

## 4. Any website or hosting panel

Upload the files with your host's file manager or FTP (Hostinger, GoDaddy, cPanel, a college server…). Put them in a folder such as `public_html/afterthoughts/`, then visit `yoursite.com/afterthoughts/`.

Only need one file? Run `python3 tools/build_standalone.py` and upload `dist/afterthoughts.html`. It contains the entire app. (A ready-built copy is included in the delivery as `afterthoughts.html`.)

## 5. Inside another site (iframe)

```html
<iframe
  src="https://YOUR-AFTERTHOUGHTS-URL/?embed=1"
  style="width:100%;height:900px;border:0;border-radius:16px"
  allow="microphone; clipboard-write"
  title="Afterthoughts"></iframe>
```

- `?embed=1` hides Afterthoughts' own sidebar and tab bar.
- `allow="microphone"` keeps voice answers working; `clipboard-write` keeps the Copy button working.
- Each visitor's data stays in their own browser, scoped to the Afterthoughts address.

## Custom domain

Vercel and Netlify: **Domains → Add**, then add the DNS record they show you at your domain registrar. HTTPS is automatic.

## Releasing an update

1. Change the files and commit.
2. Bump `VERSION` in `sw.js` (for example `afterthoughts-v2.0.1`) so installed copies pick up the new files.
3. Bump `AT.VERSION` in `js/app.js` and add a line to `CHANGELOG.md`.

## Pre-launch checklist

- [ ] Open the site on a phone and a laptop; add it to the home screen
- [ ] Run one full afterthought: capture, 3+ answers, take, clarity check, draft, copy
- [ ] Settings → Test connection says Connected (if using an AI)
- [ ] `ACCESS_CODE` and `ALLOWED_ORIGINS` are set if your server key is live
- [ ] A spending limit is set with your AI provider
- [ ] Privacy note (docs/PRIVACY.md) is linked from wherever you share the app
