/* Afterthoughts — core: helpers, constants, local-first storage, settings.
 * No build step and no dependencies: every file attaches to window.AT. */
window.AT = window.AT || {};
(function (AT) {
  "use strict";

  /* ---------- helpers ---------- */
  const U = (AT.u = {});
  U.$ = (s, r = document) => r.querySelector(s);
  U.$$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  U.esc = (t) =>
    String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  U.uid = (p = "s") => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  U.clone = (o) => JSON.parse(JSON.stringify(o));
  U.trunc = (t, n) => {
    t = String(t || "");
    return t.length > n ? t.slice(0, n) + "\n[...cut for length]" : t;
  };
  U.clip = (t, n) => {
    t = String(t || "").replace(/\s+/g, " ").trim();
    return t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : t;
  };
  U.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  U.pad = (n) => String(n).padStart(2, "0");
  U.dayKey = (ms) => {
    const d = new Date(ms);
    return d.getFullYear() + "-" + U.pad(d.getMonth() + 1) + "-" + U.pad(d.getDate());
  };
  U.fmtDate = (ms) => {
    try {
      return new Date(ms).toLocaleDateString(undefined, { day: "numeric", month: "short" });
    } catch (e) {
      return "";
    }
  };
  U.relTime = (ms) => {
    const s = (Date.now() - ms) / 1000;
    if (s < 60) return "just now";
    if (s < 3600) return Math.floor(s / 60) + " min ago";
    if (s < 86400) return Math.floor(s / 3600) + " h ago";
    if (s < 86400 * 2) return "yesterday";
    if (s < 86400 * 7) return Math.floor(s / 86400) + " days ago";
    return U.fmtDate(ms);
  };
  U.debounce = (fn, ms) => {
    let t;
    return (...a) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...a), ms);
    };
  };
  // no lookbehind: keeps older iPhones (Safari < 16.4) working
  U.sentences = (text) => {
    const t = String(text || "").replace(/\s+/g, " ").trim();
    if (!t) return [];
    const out = [];
    const re = /[.!?]+["'”’)]?\s+(?=[A-Z0-9"'“‘(])/g;
    let start = 0, m;
    while ((m = re.exec(t))) {
      out.push(t.slice(start, m.index + m[0].length).trim());
      start = m.index + m[0].length;
    }
    out.push(t.slice(start).trim());
    return out.filter((s) => s.length > 1);
  };
  U.safeUrl = (u) => (/^https?:\/\/[^\s"'<>]+$/i.test(String(u || "").trim()) ? String(u).trim() : "");
  U.words = (text) => (String(text || "").toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || []);
  U.STOP = new Set(
    ("a an the and or but if then so of to in on at by for with from as is are was were be been being am do does did done have has had " +
      "i me my mine we us our you your he him his she her it its they them their this that these those there here what which who whom whose " +
      "when where why how all any both each few more most other some such no nor not only own same than too very can will just should could " +
      "would may might must shall also into about over under again further once up down out off above below between through during before after " +
      "while because until against among within without across per via yes yeah okay ok like really think thing things get got make made lot lots " +
      "even still much many one two three new way ways something someone anything every everyone people let lets it's i'm don't doesn't isn't " +
      "can't won't that's there's they're we're you're i've i'd i'll").split(/\s+/)
  );
  U.keywords = (text, n = 8) => {
    const counts = {};
    U.words(text).forEach((w) => {
      if (w.length < 4 || U.STOP.has(w) || /^\d+$/.test(w) || /ly$/.test(w)) return;
      counts[w] = (counts[w] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
      .slice(0, n)
      .map((e) => e[0]);
  };
  U.keyPhrase = (text) => {
    // most frequent meaningful bigram, else top keyword
    const ws = U.words(text);
    const counts = {};
    for (let i = 0; i + 1 < ws.length; i++) {
      const a = ws[i], b = ws[i + 1];
      if (U.STOP.has(a) || U.STOP.has(b) || a.length < 3 || b.length < 3 || /ly$/.test(a)) continue;
      const k = a + " " + b;
      counts[k] = (counts[k] || 0) + 1;
    }
    const best = Object.entries(counts).sort((x, y) => y[1] - x[1])[0];
    if (best && best[1] > 1) return best[0];
    return U.keywords(text, 1)[0] || "this idea";
  };

  let toastTimer;
  U.toast = (msg, kind) => {
    let t = document.getElementById("toast");
    if (!t) return;
    t.textContent = msg;
    t.className = "show" + (kind ? " " + kind : "");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.className = ""), 2800);
  };
  U.copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        ta.remove();
        return ok;
      } catch (e2) {
        return false;
      }
    }
  };
  U.download = (filename, data, mime = "text/plain") => {
    const blob = data instanceof Blob ? data : new Blob([data], { type: mime + ";charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 1500);
  };
  U.fileToBase64 = (file) =>
    new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result).split(",")[1]);
      r.onerror = rej;
      r.readAsDataURL(file);
    });
  U.slug = (t) =>
    String(t || "afterthought")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50) || "afterthought";

  /* ---------- product constants ---------- */
  AT.RUNGS = ["React", "Evaluate", "Connect", "Challenge", "Commit"];
  AT.RUNG_HELP = {
    React: "What stood out or bothered you",
    Evaluate: "Where the idea holds or breaks",
    Connect: "Your own work, studies or life",
    Challenge: "Facing the best counterargument",
    Commit: "What you believe now",
  };
  AT.LENSES = {
    balanced: { name: "Balanced", hint: "The full question ladder", rule: "Use the ladder as written." },
    first: { name: "First principles", hint: "Strip it to basics", rule: "Push them to break claims into basic assumptions and test each one. Ask what must be true for the idea to hold." },
    devil: { name: "Devil's advocate", hint: "More pushback", rule: "Challenge their view early and often. At least every second question should press on a weakness in what they said." },
    india: { name: "India lens", hint: "Indian context", rule: "Ground questions in Indian realities where relevant: tier-2 and tier-3 cities, cost of living, family expectations, UPI and digital public infrastructure, regulation, scale and diversity." },
    second: { name: "Second-order", hint: "Consequences of consequences", rule: "Ask what happens next, and after that. Look for unintended effects, incentives and who adapts how." },
    people: { name: "Stakeholders", hint: "Who wins, who loses", rule: "Ask them to look at the idea from different stakeholders: users, employees, founders, regulators, families, the excluded." },
    future: { name: "10 years out", hint: "Long view", rule: "Ask how this looks in 10 years, what will seem obvious in hindsight, and what they would bet on." },
  };
  AT.DEPTHS = {
    quick: { name: "Quick", answers: 3, hint: "3 questions · ~2 min" },
    standard: { name: "Standard", answers: 5, hint: "5 questions · ~4 min" },
    deep: { name: "Deep", answers: 7, hint: "7 questions · ~7 min" },
  };
  AT.STATUS = {
    thinking: { label: "Thinking", tone: "accent" },
    take: { label: "Take formed", tone: "ink" },
    drafted: { label: "Drafted", tone: "warn" },
    posted: { label: "Posted", tone: "good" },
    parked: { label: "Parked", tone: "muted" },
  };
  AT.FORMATS = {
    linkedin: { name: "LinkedIn post", short: "120-180 words", long: "220-320 words", shape: "Open with one line that states the take or the tension in it (no clickbait). Short paragraphs of 1-3 lines with blank lines between them. End with a clear closing line or one genuine question for readers. Hashtags only if the voice profile allows them, at the very end." },
    thread: { name: "X thread", short: "3-4 posts", long: "6-8 posts", shape: "Number each post like '1/'. Each post must be under 270 characters and stand on its own. Separate posts with a blank line. The first post carries the take." },
    note: { name: "Short note", short: "under 280 characters", long: "2-4 sentences, under 500 characters", shape: "Plain sentences for X, Threads or a WhatsApp status. No numbering, no headings." },
    carousel: { name: "Carousel", short: "5 slides", long: "8 slides", shape: "Write slide text for an Instagram or LinkedIn carousel. Format each slide as 'Slide N:' then a headline line and at most 2 short lines. Slide 1 is a hook, the last slide is the takeaway or a question." },
    outline: { name: "Article outline", short: "4 sections", long: "6 sections", shape: "Format: a 'Working title:' line, a 'Thesis:' line (one sentence), then numbered section headings, each with 1-2 short bullet notes drawn from the user's points. Put [add evidence] or [add your example] where a section needs material the user has not given." },
    newsletter: { name: "Newsletter", short: "200-260 words", long: "400-550 words", shape: "A personal newsletter section: a subject line on the first line as 'Subject:', then a warm opening, the take, the reasons in prose, and a one-line sign-off question." },
  };
  AT.TONES = { voice: "As I write", bolder: "Bolder", gentler: "Gentler", story: "More story" };
  AT.CLICHES = [
    "let that sink in", "here's the thing", "humbled to", "game-changer", "game changer", "in today's fast-paced",
    "unlock your", "buckle up", "read that again", "hot take", "delve", "the truth is", "agree?", "thoughts?",
    "it's not just about", "in a world where", "at the end of the day", "think outside the box", "paradigm shift",
    "synergy", "deep dive", "move the needle", "excited to announce", "thrilled to", "journey of", "game changing",
  ];
  AT.PROVOCATIONS = [
    "Is a four-day work week a reward for productivity, or a test of it?",
    "Will AI make junior jobs disappear, or make juniors more valuable than ever?",
    "Does a degree from a top college still matter if you can ship real work?",
    "Is quick commerce solving a real need, or creating a new habit we didn't ask for?",
    "Should founders build in public, or does it make them perform instead of build?",
    "Is 'hustle culture' finally dying, or just changing its name?",
    "Are internships in India mostly learning or mostly free labour?",
    "Does working from home help or hurt your first two years of career?",
    "Is social media a better CV than a CV now?",
    "Should every MBA learn to code, or learn to manage people who code?",
    "Is UPI the most underrated product built in India in the last decade?",
    "Are 'personal brands' making professionals more honest or more fake?",
    "Is it better to join a startup or a big company for your first job?",
    "Does reading summaries make us smarter, or just feel smarter?",
  ];

  /* ---------- storage (local-first) ---------- */
  const DATA_KEY = "afterthoughts:data:v2";
  const SET_KEY = "afterthoughts:settings:v2";
  let memoryOnly = false;
  const ls = {
    get(k) {
      try {
        return localStorage.getItem(k);
      } catch (e) {
        memoryOnly = true;
        return null;
      }
    },
    set(k, v) {
      try {
        localStorage.setItem(k, v);
        return true;
      } catch (e) {
        memoryOnly = true;
        return false;
      }
    },
    del(k) {
      try {
        localStorage.removeItem(k);
      } catch (e) {}
    },
  };

  const DEFAULT_SETTINGS = {
    provider: "demo",
    keys: { gemini: "", anthropic: "", openai: "" },
    models: { gemini: "gemini-3.6-flash", anthropic: "claude-haiku-5-5", openai: "gpt-5.1" },
    draftModels: { anthropic: "claude-sonnet-5-5" },
    endpoint: "/api/ai",
    accessCode: "",
    theme: "system",
    depth: "standard",
    lens: "balanced",
    speechLang: "en-IN",
  };
  const DEFAULT_DATA = { version: 2, sessions: [], voice: null, profile: { name: "", headline: "" }, meta: { created: Date.now() } };

  const listeners = new Set();
  const S = (AT.store = {
    data: U.clone(DEFAULT_DATA),
    settings: U.clone(DEFAULT_SETTINGS),
    get memoryOnly() {
      return memoryOnly;
    },
    load() {
      try {
        const d = JSON.parse(ls.get(DATA_KEY) || "null");
        if (d && Array.isArray(d.sessions)) S.data = Object.assign(U.clone(DEFAULT_DATA), d);
      } catch (e) {}
      try {
        const st = JSON.parse(ls.get(SET_KEY) || "null");
        if (st) {
          S.settings = Object.assign(U.clone(DEFAULT_SETTINGS), st);
          S.settings.keys = Object.assign({}, DEFAULT_SETTINGS.keys, st.keys || {});
          S.settings.models = Object.assign({}, DEFAULT_SETTINGS.models, st.models || {});
          S.settings.draftModels = Object.assign({}, DEFAULT_SETTINGS.draftModels, st.draftModels || {});
        }
      } catch (e) {}
      // A site owner can preset the provider (e.g. their own /api/ai proxy) in config.js
      const cfg = window.AFTERTHOUGHTS_CONFIG || {};
      // apply the site owner's provider on first visit, and again whenever the owner changes it
      if (cfg.provider && S.settings._cfgProvider !== cfg.provider) {
        S.settings.provider = cfg.provider;
        S.settings._cfgProvider = cfg.provider;
        if (cfg.endpoint) S.settings.endpoint = cfg.endpoint;
        S.saveSettings();
      }
      if (cfg.owner && !S.data.profile.name) S.data.profile = Object.assign({}, S.data.profile, { name: cfg.owner.name || "", headline: S.data.profile.headline || cfg.owner.headline || "" });
      S.sort();
    },
    sort() {
      S.data.sessions.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    },
    persist: U.debounce(() => S.saveNow(), 250),
    saveNow() {
      const ok = ls.set(DATA_KEY, JSON.stringify(S.data));
      if (!ok && !S._warned) {
        S._warned = true;
        U.toast("Storage is full or blocked. Export your data from Settings to keep it.", "warn");
      }
      listeners.forEach((fn) => fn());
    },
    saveSettings() {
      ls.set(SET_KEY, JSON.stringify(S.settings));
    },
    onChange(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    get(id) {
      return S.data.sessions.find((s) => s.id === id) || null;
    },
    upsert(session, touch = true) {
      if (touch) session.updatedAt = Date.now();
      if (session.source && session.source.text && session.source.text.length > 20000) session.source.text = session.source.text.slice(0, 20000);
      const i = S.data.sessions.findIndex((s) => s.id === session.id);
      if (i >= 0) S.data.sessions[i] = session;
      else S.data.sessions.unshift(session);
      S.sort();
      S.persist();
    },
    remove(id) {
      S.data.sessions = S.data.sessions.filter((s) => s.id !== id);
      S.persist();
    },
    setVoice(v) {
      S.data.voice = v;
      S.persist();
    },
    setProfile(p) {
      S.data.profile = Object.assign({}, S.data.profile, p);
      S.persist();
    },
    exportJSON() {
      return JSON.stringify({ app: "afterthoughts", exportedAt: new Date().toISOString(), data: S.data }, null, 2);
    },
    importJSON(text, mode = "merge") {
      const parsed = JSON.parse(text);
      const d = parsed && parsed.data ? parsed.data : parsed;
      if (!d || !Array.isArray(d.sessions)) throw new Error("This file doesn't look like an Afterthoughts export.");
      if (mode === "replace") S.data = Object.assign(U.clone(DEFAULT_DATA), d);
      else {
        const ids = new Set(S.data.sessions.map((s) => s.id));
        d.sessions.forEach((s) => {
          if (!ids.has(s.id)) S.data.sessions.push(s);
        });
        if (d.voice && !S.data.voice) S.data.voice = d.voice;
        if (d.profile && !S.data.profile.name) S.data.profile = d.profile;
      }
      S.sort();
      S.saveNow();
      return d.sessions.length;
    },
    resetAll() {
      S.data = U.clone(DEFAULT_DATA);
      S.saveNow();
    },
    clearSamples() {
      S.data.sessions = S.data.sessions.filter((s) => !s.sample);
      S.saveNow();
    },
  });

  AT.newSession = (source, opts = {}) => ({
    id: U.uid("s"),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    status: "thinking",
    stage: "unpack",
    title: "",
    gist: "",
    tags: [],
    lens: opts.lens || S.settings.lens || "balanced",
    depth: opts.depth || S.settings.depth || "standard",
    source: source,
    messages: [],
    take: null,
    drafts: [],
    posted: null,
    scores: {},
  });
})(window.AT);
