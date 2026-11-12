# Changelog

## 2.1.0 — 12 November 2026

Made for Purnisha Tomar.

- One-time welcome note and her name preset on the dashboard (both set in `config.js`)
- Fix: blank screen on older iPhones (iOS below 16.4)
- Fix: only http(s) links can be opened from a session, so a shared backup can't run code
- Fix: forming a take again now asks first and keeps the previous version
- Fix: an error in one afterthought no longer shows in another; a second session waits its turn instead of silently not starting
- Fix: a posted item without a date no longer breaks the Express screen; clarity results are saved; the weekly reflection covers the last 7 days
- Fix: when the site owner changes the AI provider in `config.js`, returning visitors get the change
- Server proxy: optional `ACCESS_CODE` and a per-visitor daily limit (`DAILY_LIMIT`) to protect the owner's AI credit
- Fallback colours for browsers without `color-mix`

## 2.0.0 — 10 November 2026

A full product rebuild: standalone, hostable anywhere, with a dashboard.

- Dashboard: KPIs, activity heatmap, thinking streak, reading-to-posting funnel, thinking-profile radar with insight, lenses, themes, ideas waiting, recent takes, weekly AI reflection
- Thinking flow: 7 lenses, 3 depths, push back, go deeper, contrasting options, other perspectives, voice answers, live depth score
- Take: clarity check with bias flags and sharpening questions, confidence, tags, park, quote-card image
- Express: 6 formats, 4 tones, hook lab, originality and readability, cliché and gap checks, LinkedIn/thread/slide previews, versions, Markdown export, "I posted it"
- Library with full-text search, filters, sorting and export
- My voice: Voice DNA from writing samples and an AI voice description
- AI providers: Demo (offline), Gemini, Claude, OpenAI, own server proxy (Vercel and Netlify), with link fetching
- Local-first storage, backup and import, sample data
- Installable offline app (PWA), light and dark themes, embed mode, keyboard shortcuts, single-file build

## 1.0.0 — 10 November 2026

- First prototype: capture, unpack, take, express, originality meter, library, voice profile
