/* Afterthoughts — insights computed locally: originality, depth, readability,
 * clarity flags, Voice DNA, dashboard stats, connections between takes. */
(function (AT) {
  "use strict";
  const U = AT.u;
  const I = (AT.insights = {});
  const norm = (w) => String(w).toLowerCase().replace(/[^\p{L}\p{N}']+/gu, "").replace(/^'+|'+$/g, "");

  /* How much of a draft comes from the user's own words (3-word overlaps), with highlight HTML */
  I.originality = function (draft, mine) {
    const myWords = String(mine || "").split(/\s+/).map(norm).filter(Boolean);
    const grams = new Set();
    for (let i = 0; i + 2 < myWords.length; i++) grams.add(myWords[i] + " " + myWords[i + 1] + " " + myWords[i + 2]);
    const tokens = String(draft || "").split(/(\s+)/);
    const idx = [], ws = [];
    tokens.forEach((t, i) => {
      if (!/^\s*$/.test(t)) {
        const n = norm(t);
        if (n) {
          idx.push(i);
          ws.push(n);
        }
      }
    });
    const hit = new Array(ws.length).fill(false);
    for (let i = 0; i + 2 < ws.length; i++) if (grams.has(ws[i] + " " + ws[i + 1] + " " + ws[i + 2])) hit[i] = hit[i + 1] = hit[i + 2] = true;
    const marked = new Set();
    hit.forEach((h, k) => h && marked.add(idx[k]));
    let inPh = false, html = "";
    tokens.forEach((t, i) => {
      if (/^\s*$/.test(t)) return (html += U.esc(t));
      const opens = t.includes("["), closes = t.includes("]");
      let piece = U.esc(t);
      if (inPh || opens) piece = '<span class="ph">' + piece + "</span>";
      else if (marked.has(i)) piece = "<mark>" + piece + "</mark>";
      html += piece;
      if (opens && !closes) inPh = true;
      if (closes) inPh = false;
    });
    const total = ws.length, yours = hit.filter(Boolean).length;
    const pct = total ? Math.round((yours / total) * 100) : 0;
    const low = String(draft || "").toLowerCase();
    return {
      pct,
      html,
      words: total,
      chars: String(draft || "").length,
      cliches: AT.CLICHES.filter((c) => low.includes(c)),
      placeholders: String(draft || "").match(/\[[^\]]{2,80}\]/g) || [],
      emDashes: (String(draft || "").match(/—/g) || []).length,
    };
  };

  /* Flesch reading ease, approximate */
  function syllables(w) {
    w = w.toLowerCase().replace(/[^a-z]/g, "");
    if (!w) return 0;
    if (w.length <= 3) return 1;
    w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "");
    const m = w.match(/[aeiouy]{1,2}/g);
    return Math.max(1, m ? m.length : 1);
  }
  I.readability = function (text) {
    const sents = U.sentences(text).length || 1;
    const words = (String(text).match(/[A-Za-z]+/g) || []);
    if (words.length < 8) return null;
    const syl = words.reduce((a, w) => a + syllables(w), 0);
    const score = Math.round(206.835 - 1.015 * (words.length / sents) - 84.6 * (syl / words.length));
    const s = U.clamp(score, 0, 100);
    const label = s >= 70 ? "Easy to read" : s >= 55 ? "Clear" : s >= 40 ? "A bit dense" : "Hard to read";
    return { score: s, label, avgSentence: Math.round(words.length / sents) };
  };

  /* Depth of a thinking session, 0-100 */
  I.depth = function (s) {
    const mine = s.messages.filter((m) => m.role === "me");
    if (!mine.length) return { score: 0, parts: [] };
    const target = (AT.DEPTHS[s.depth] || AT.DEPTHS.standard).answers;
    const answered = new Set();
    s.messages.forEach((m, i) => {
      if (m.role === "ai" && m.rung) {
        const nxt = s.messages.slice(i + 1).find((x) => x.role === "me" || x.role === "ai");
        if (nxt && nxt.role === "me") answered.add(m.rung);
      }
    });
    const avgWords = mine.reduce((a, m) => a + U.words(m.text).length, 0) / mine.length;
    const personal = mine.filter((m) => /\b(i|my|me|we|our|when i|in my)\b/i.test(m.text)).length / mine.length;
    const examples = mine.filter((m) => /\b(for example|for instance|like when|once|last (year|month|week)|at my|in my|i saw|i remember)\b/i.test(m.text)).length;
    const parts = [
      { k: "Answers", v: Math.min(1, mine.length / target) * 25 },
      { k: "Detail", v: Math.min(1, avgWords / 35) * 20 },
      { k: "Rungs", v: (answered.size / 5) * 25 },
      { k: "Personal", v: personal * 15 },
      { k: "Challenge", v: answered.has("Challenge") ? 10 : 0 },
      { k: "Examples", v: Math.min(1, examples / 2) * 5 },
    ];
    const score = Math.round(parts.reduce((a, p) => a + p.v, 0));
    return { score: U.clamp(score, 0, 100), parts, rungs: Array.from(answered) };
  };

  /* Local clarity check of a stance */
  I.clarityLocal = function (stance) {
    const t = String(stance || "");
    const flags = [];
    const w = U.words(t);
    if (/\b(always|never|everyone|nobody|all|none|every single|no one)\b/i.test(t)) flags.push({ type: "Overgeneralisation", note: "Words like always, never or everyone make it easy to disprove. Who is it really true for?" });
    if (/\b(maybe|perhaps|kind of|sort of|i guess|somewhat|might be)\b/i.test(t)) flags.push({ type: "Hedging", note: "Hedges soften the take. Keep one if you're truly unsure, cut the rest." });
    if (/\bit depends\b/i.test(t) && !/\bon\b/i.test(t.split(/it depends/i)[1] || "")) flags.push({ type: "Vague", note: "'It depends' says little until you say on what." });
    if (w.length > 40) flags.push({ type: "Too long", note: "A take lands best in one breath. Try under 30 words." });
    if (w.length && w.length < 6) flags.push({ type: "Too thin", note: "Add the 'because' so a reader knows why you think it." });
    let score = 8 - flags.length * 1.5;
    if (/\bbecause|but|unless|only if|instead\b/i.test(t)) score += 1;
    score = U.clamp(Math.round(score), 1, 10);
    return { score, verdict: flags.length ? "Clear enough to post, with a few things to tighten." : "Clear and arguable. Someone could disagree, which is good.", flags, sharpen: [] };
  };

  /* Voice DNA from writing samples */
  I.voiceDNA = function (samples) {
    const text = String(samples || "").trim();
    const words = U.words(text);
    if (words.length < 40) return null;
    const sents = U.sentences(text);
    const avgSentence = Math.round(words.length / Math.max(1, sents.length));
    const questions = (text.match(/\?/g) || []).length;
    const excl = (text.match(/!/g) || []).length;
    const emoji = (text.match(/\p{Extended_Pictographic}/gu) || []).length;
    const contractions = (text.match(/\b\w+'(s|re|ve|ll|d|t|m)\b/gi) || []).length;
    const firstPerson = words.filter((w) => ["i", "my", "me", "i'm", "i've"].includes(w)).length;
    const hashtags = (text.match(/#\w+/g) || []).length;
    const paras = text.split(/\n\s*\n/).filter((p) => p.trim());
    const variety = Math.round((new Set(words).size / words.length) * 100);
    const counts = {};
    words.forEach((w) => {
      if (w.length < 4 || U.STOP.has(w)) return;
      counts[w] = (counts[w] || 0) + 1;
    });
    const signature = Object.entries(counts).filter((e) => e[1] >= 2).sort((a, b) => b[1] - a[1]).slice(0, 8).map((e) => e[0]);
    const per100 = (n) => Math.round((n / words.length) * 1000) / 10;
    const contractionRate = per100(contractions);
    return {
      words: words.length,
      avgSentence,
      questionRate: Math.round((questions / Math.max(1, sents.length)) * 100),
      exclaimRate: Math.round((excl / Math.max(1, sents.length)) * 100),
      emojiPer100: per100(emoji),
      firstPersonPer100: per100(firstPerson),
      hashtags,
      avgParagraph: Math.round(words.length / Math.max(1, paras.length)),
      variety,
      formality: contractionRate > 2 ? "conversational" : contractionRate > 0.7 ? "balanced" : "formal",
      signature,
    };
  };

  /* Related takes by keyword overlap */
  function bag(s) {
    return new Set(U.keywords([s.title, s.gist, s.take && s.take.stance, (s.tags || []).join(" ")].join(" "), 14));
  }
  I.related = function (s, all, n = 3) {
    const a = bag(s);
    if (!a.size) return [];
    return all
      .filter((x) => x.id !== s.id)
      .map((x) => {
        const b = bag(x);
        let inter = 0;
        a.forEach((w) => b.has(w) && inter++);
        const tagHit = (s.tags || []).some((t) => (x.tags || []).includes(t)) ? 0.15 : 0;
        return { s: x, score: inter / Math.max(1, Math.min(a.size, b.size)) + tagHit };
      })
      .filter((r) => r.score >= 0.2)
      .sort((p, q) => q.score - p.score)
      .slice(0, n);
  };

  /* Dashboard stats */
  I.stats = function (sessions) {
    const now = Date.now();
    const days = {};
    const bump = (ms) => {
      if (!ms) return;
      const k = U.dayKey(ms);
      days[k] = (days[k] || 0) + 1;
    };
    sessions.forEach((s) => {
      bump(s.createdAt);
      if (s.posted && s.posted.at) bump(s.posted.at);
      (s.activity || []).forEach(bump);
    });
    // streak: consecutive days with activity ending today or yesterday
    let streak = 0;
    const d = new Date();
    if (!days[U.dayKey(d.getTime())]) d.setDate(d.getDate() - 1);
    while (days[U.dayKey(d.getTime())]) {
      streak++;
      d.setDate(d.getDate() - 1);
    }
    let best = 0, run = 0;
    const keys = Object.keys(days).sort();
    let prev = null;
    keys.forEach((k) => {
      const t = new Date(k + "T00:00:00").getTime();
      run = prev && Math.round((t - prev) / 86400000) === 1 ? run + 1 : 1;
      best = Math.max(best, run);
      prev = t;
    });
    const by = (st) => sessions.filter((s) => s.status === st).length;
    const withTake = sessions.filter((s) => s.take && s.take.stance);
    const drafted = sessions.filter((s) => (s.drafts || []).length);
    const posted = sessions.filter((s) => s.status === "posted");
    const origs = drafted.map((s) => s.scores && s.scores.originality).filter((v) => typeof v === "number");
    const depths = sessions.map((s) => (s.scores && typeof s.scores.depth === "number" ? s.scores.depth : null)).filter((v) => v !== null && v > 0);
    const rungs = { React: 0, Evaluate: 0, Connect: 0, Challenge: 0, Commit: 0 };
    sessions.forEach((s) => {
      s.messages.forEach((m, i) => {
        if (m.role === "ai" && rungs[m.rung] !== undefined) {
          const nxt = s.messages.slice(i + 1).find((x) => x.role === "me" || x.role === "ai");
          if (nxt && nxt.role === "me") rungs[m.rung]++;
        }
      });
    });
    const lenses = {};
    sessions.forEach((s) => (lenses[s.lens || "balanced"] = (lenses[s.lens || "balanced"] || 0) + 1));
    const weekAgo = now - 7 * 86400000;
    const thisWeek = sessions.filter((s) => s.createdAt >= weekAgo).length;
    const conf = withTake.map((s) => s.take.confidence).filter((v) => typeof v === "number");
    const words = sessions.reduce((a, s) => a + U.words(AT.userWords(s)).length, 0);
    return {
      total: sessions.length,
      takes: withTake.length,
      drafted: drafted.length,
      posted: posted.length,
      parked: by("parked"),
      thinking: by("thinking"),
      streak,
      bestStreak: best,
      days,
      thisWeek,
      avgOriginality: origs.length ? Math.round(origs.reduce((a, b) => a + b, 0) / origs.length) : null,
      avgDepth: depths.length ? Math.round(depths.reduce((a, b) => a + b, 0) / depths.length) : null,
      rungs,
      lenses,
      avgConfidence: conf.length ? Math.round((conf.reduce((a, b) => a + b, 0) / conf.length) * 10) / 10 : null,
      wordsThought: words,
      themes: U.keywords(sessions.map((s) => [s.title, s.take && s.take.stance, (s.tags || []).join(" ")].join(" ")).join(" "), 12),
      waiting: sessions.filter((s) => s.status === "parked" || s.status === "take" || s.status === "thinking").slice(0, 4),
    };
  };

  I.profileInsight = function (st) {
    const r = st.rungs;
    const tot = Object.values(r).reduce((a, b) => a + b, 0);
    if (tot < 4) return "Answer a few more questions and your thinking profile will appear here.";
    const ch = r.Challenge / tot, co = r.Connect / tot;
    if (ch < 0.1) return "You rarely face the other side. Try Push back on your next afterthought: views that survive a challenge are worth more.";
    if (co < 0.12) return "You reason well in the abstract but seldom bring in your own life. A personal example makes a take hard to argue with.";
    if (st.avgOriginality !== null && st.avgOriginality < 20) return "Your drafts lean on AI phrasing. Edit in one line you actually said before posting.";
    if (st.posted === 0 && st.takes >= 2) return "You form clear takes but haven't posted one yet. Pick your strongest and share it this week.";
    return "Balanced thinker: you react, test, connect and challenge. Keep going deeper on fewer ideas.";
  };
})(window.AT);
