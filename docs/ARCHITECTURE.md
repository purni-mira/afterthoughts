# Architecture

## Principles

- **No build step, no dependencies.** Plain ES2020 scripts loaded in order. Anyone can open a file, change it and refresh.
- **Local-first.** All user data lives in `localStorage`. No accounts, no database, no tracking.
- **Provider-agnostic AI.** Every AI feature goes through one function (`AT.ai.call`). Swapping Gemini for Claude or OpenAI is a setting, not a code change.
- **Works with zero setup.** Demo mode runs every feature offline, so a shared link always works.

## Modules

All files attach to one global namespace, `window.AT`.

| File | Responsibility |
| --- | --- |
| `core.js` | Helpers (`AT.u`), product constants (rungs, lenses, depths, formats, clichés, provocations), `AT.store` (data + settings in localStorage, import/export), `AT.newSession` |
| `ai.js` | `AT.PROVIDERS`, `AT.ai.call` / `AT.ai.json` (Gemini, Anthropic, OpenAI, server), tolerant JSON parsing, timeouts, friendly errors; `AT.engine.*`: every AI feature with its prompt, falling back to `AT.demo` when no AI is connected |
| `demo.js` | Offline engine: question bank by rung and lens, perspectives, takes and drafts assembled only from the user's sentences |
| `insights.js` | Pure functions: originality (3-word overlap with the user's answers), depth score, Flesch readability, local clarity flags, Voice DNA, related takes, dashboard stats, profile insight |
| `charts.js` | SVG string builders: heatmap, radar, funnel, ring, bars, sparkline. Colours come from CSS variables, so charts follow the theme |
| `samples.js` | Sample sessions (marked `sample: true`) |
| `ui.js` | Modal and confirm, session cards, pills, icons, speech input (Web Speech API), quote-card image (canvas), Markdown export |
| `view-*.js` | One object per screen with `render(root, route)` |
| `app.js` | Hash router, theme, chrome (nav state, AI chip, streak), PWA registration, keyboard shortcuts, embed mode |

## Routes

| Hash | View |
| --- | --- |
| `#/` | Dashboard |
| `#/new` (`?p=<n>` starts from provocation n) | Capture |
| `#/s/<id>` | Session (stage from the session: unpack, take, express) |
| `#/library` (`?q=` search) | Library |
| `#/voice` | My voice |
| `#/settings` | Settings |

## Data model

```js
// localStorage "afterthoughts:data:v2"
{
  version: 2,
  profile: { name, headline },
  voice: { samples, tone, length, emoji, hashtags, opener, avoid, summary, updatedAt },
  meta: { digest: { at, text } },
  sessions: [{
    id, createdAt, updatedAt, sample?,
    status: "thinking" | "take" | "drafted" | "posted" | "parked",
    stage: "unpack" | "take" | "express",
    title, gist, tags: [], lens, depth,
    source: { type: "text" | "link" | "shot" | "idea", text, url?, from? },
    messages: [{ role: "ai" | "me", kind?: "q" | "push" | "persp" | "reaction", text, rung?, options?, items?, from?, at }],
    take: { stance, points: [], confidence: 1-5 },
    drafts: [{ id, format, length, tone, hook?, body, at }],   // newest first, max 8
    posted: { at, url } | null,
    scores: { depth, originality },
    activity: [timestamps]                                      // for the heatmap and streaks
  }]
}
// localStorage "afterthoughts:settings:v2"
{ provider, keys: { gemini, anthropic, openai }, models: {...}, draftModels: {...}, endpoint, theme, depth, lens, speechLang }
```

## AI calls

| Feature | Engine function | Output | Model size |
| --- | --- | --- | --- |
| Read screenshot | `readImage` | `{text, from}` | quick |
| Start session | `start` | `{title, gist, tags, question, rung}` | quick |
| Next question / push back / go deeper / not sure | `next` | `{question, rung, options, ready}` | quick |
| Other perspectives | `perspectives` | `[{who, question}]` | quick |
| Form take | `take` | `{stance, points}` | big |
| Clarity check | `clarity` | `{score, verdict, flags, sharpen}` | quick |
| Hooks | `hooks` | `[{style, line}]` | quick |
| Draft | `draft` | text | big |
| Voice description | `voiceSummary` | text | quick |
| Weekly reflection | `digest` | text | quick |

Prompts live next to each function in `ai.js`. Guardrails written into them: never give an opinion during Unpack, never add facts or anecdotes the user didn't give, put `[placeholders]` where the user must add material, avoid stock phrases and em dashes, match the voice profile.

## Server proxy (`api/ai.js`)

- `POST {system, prompt, json, images, big}` → `{text}`
- `POST {action: "fetch", url}` → `{text}` (article extraction; blocks private addresses)
- CORS limited by `ALLOWED_ORIGINS`, best-effort per-IP rate limit, 6 MB body cap, key only in environment variables
- Netlify uses the same handler through `netlify/functions/ai.js`

## Offline

`sw.js` caches the app shell (network-first for app files so deploys show up immediately, cache-first for fonts). AI requests and `/api/` are never cached.

## Extending

- **New lens:** add to `AT.LENSES` in `core.js` (and optionally `LENS_EXTRA` in `demo.js`).
- **New format:** add to `AT.FORMATS` in `core.js`; the demo engine falls back to the LinkedIn shape.
- **New provider:** add a branch in `AT.ai.call` and an entry in `AT.PROVIDERS`.
- **Accounts and sync:** wrap `AT.store.saveNow` / `load` with a Supabase table per user; the session object is already self-contained JSON.
