/* Afterthoughts — AI layer.
 * Providers: demo (offline, no key), Gemini, Claude, OpenAI (bring your own key, called from the browser),
 * and "server" (your own /api/ai proxy, so visitors need no key). Engine functions sit on top. */
(function (AT) {
  "use strict";
  const U = AT.u;

  const PROVIDERS = (AT.PROVIDERS = {
    demo: { name: "Demo mode", sub: "Works offline, no key. Questions come from templates.", live: false },
    gemini: { name: "Google Gemini", sub: "Free tier available. Get a key at aistudio.google.com.", live: true, keyUrl: "https://aistudio.google.com/apikey", images: true },
    anthropic: { name: "Anthropic Claude", sub: "Best thinking partner. Key from console.anthropic.com.", live: true, keyUrl: "https://console.anthropic.com/settings/keys", images: true },
    openai: { name: "OpenAI", sub: "Key from platform.openai.com.", live: true, keyUrl: "https://platform.openai.com/api-keys", images: true },
    server: { name: "My server", sub: "Your own /api/ai endpoint holds the key, so visitors need none.", live: true, images: true },
  });

  class AIError extends Error {
    constructor(message, code) {
      super(message);
      this.code = code || "ai_error";
    }
  }
  AT.AIError = AIError;

  function settings() {
    return AT.store.settings;
  }
  const ai = (AT.ai = {
    provider() {
      return settings().provider || "demo";
    },
    isLive() {
      const p = ai.provider();
      if (p === "demo") return false;
      if (p === "server") return !!settings().endpoint;
      return !!(settings().keys[p] || "").trim();
    },
    canSeeImages() {
      return ai.isLive() && !!PROVIDERS[ai.provider()].images;
    },
    label() {
      const p = ai.provider();
      if (p === "demo" || !ai.isLive()) return "Demo mode";
      return PROVIDERS[p].name;
    },
  });

  async function readError(res) {
    let msg = res.status + " " + res.statusText;
    try {
      const j = await res.json();
      msg = (j.error && (j.error.message || j.error)) || j.message || msg;
    } catch (e) {}
    const code = res.status === 401 || res.status === 403 ? "auth" : res.status === 429 ? "rate" : res.status === 404 ? "model" : "http";
    const friendly = {
      auth: "The API key was rejected. Check it in Settings.",
      rate: "The AI provider says you're sending too many requests or are out of credit. Wait a minute or check your plan.",
      model: "That model name wasn't found. Check the model in Settings.",
    }[code];
    throw new AIError((friendly ? friendly + " " : "") + "(" + String(msg).slice(0, 180) + ")", code);
  }

  async function withTimeout(promise, ms, ctl) {
    let t;
    const timeout = new Promise((_, rej) => {
      t = setTimeout(() => {
        try {
          ctl && ctl.abort();
        } catch (e) {}
        rej(new AIError("The AI took too long to answer. Try again.", "timeout"));
      }, ms);
    });
    try {
      return await Promise.race([promise, timeout]);
    } finally {
      clearTimeout(t);
    }
  }

  /* One call: {system, prompt, json, images:[{mime,data}], big} -> text */
  ai.call = async function ({ system, prompt, json = false, images = [], big = false, signal }) {
    const st = settings();
    const p = ai.provider();
    if (!navigator.onLine) throw new AIError("You're offline. Connect to the internet, or switch to Demo mode in Settings.", "offline");
    const ctl = new AbortController();
    if (signal) signal.addEventListener("abort", () => ctl.abort());
    const sys = system + (json ? "\n\nReply with a single JSON object only. No markdown fences, no commentary." : "");
    let req;
    if (p === "gemini") {
      const model = (st.models.gemini || "gemini-3.6-flash").trim();
      const parts = [{ text: prompt }].concat(images.map((im) => ({ inline_data: { mime_type: im.mime, data: im.data } })));
      const body = { systemInstruction: { parts: [{ text: sys }] }, contents: [{ role: "user", parts }] };
      if (json) body.generationConfig = { responseMimeType: "application/json" };
      req = fetch("https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": st.keys.gemini.trim() },
        body: JSON.stringify(body),
        signal: ctl.signal,
      }).then(async (res) => {
        if (!res.ok) await readError(res);
        const j = await res.json();
        const cand = j.candidates && j.candidates[0];
        const text = cand && cand.content && cand.content.parts ? cand.content.parts.map((x) => x.text || "").join("") : "";
        if (!text) throw new AIError("The AI returned an empty answer" + (cand && cand.finishReason ? " (" + cand.finishReason + ")" : "") + ". Try rephrasing.", "empty");
        return text;
      });
    } else if (p === "anthropic") {
      const model = ((big && st.draftModels.anthropic) || st.models.anthropic || "claude-haiku-5-5").trim();
      const content = images.map((im) => ({ type: "image", source: { type: "base64", media_type: im.mime, data: im.data } })).concat([{ type: "text", text: prompt }]);
      req = fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": st.keys.anthropic.trim(),
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({ model, max_tokens: big ? 2000 : 900, system: sys, messages: [{ role: "user", content }] }),
        signal: ctl.signal,
      }).then(async (res) => {
        if (!res.ok) await readError(res);
        const j = await res.json();
        const text = (j.content || []).filter((c) => c.type === "text").map((c) => c.text).join("");
        if (!text) throw new AIError("The AI returned an empty answer. Try rephrasing.", "empty");
        return text;
      });
    } else if (p === "openai") {
      const model = (st.models.openai || "gpt-5.1").trim();
      const userContent = images.length
        ? [{ type: "text", text: prompt }].concat(images.map((im) => ({ type: "image_url", image_url: { url: "data:" + im.mime + ";base64," + im.data } })))
        : prompt;
      const body = { model, messages: [{ role: "system", content: sys }, { role: "user", content: userContent }] };
      if (json) body.response_format = { type: "json_object" };
      req = fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + st.keys.openai.trim() },
        body: JSON.stringify(body),
        signal: ctl.signal,
      }).then(async (res) => {
        if (!res.ok) await readError(res);
        const j = await res.json();
        const text = j.choices && j.choices[0] && j.choices[0].message ? j.choices[0].message.content || "" : "";
        if (!text) throw new AIError("The AI returned an empty answer. Try rephrasing.", "empty");
        return text;
      });
    } else if (p === "server") {
      req = fetch(st.endpoint || "/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-access-code": st.accessCode || "" },
        body: JSON.stringify({ system: sys, prompt, json, images, big }),
        signal: ctl.signal,
      }).then(async (res) => {
        if (!res.ok) await readError(res);
        const j = await res.json();
        if (!j.text) throw new AIError("The server returned an empty answer.", "empty");
        return j.text;
      });
    } else throw new AIError("No AI provider is set.", "none");
    try {
      return await withTimeout(req, big ? 90000 : 60000, ctl);
    } catch (e) {
      if (e && e.name === "AbortError") throw new AIError("Stopped.", "cancelled");
      if (e instanceof AIError) throw e;
      throw new AIError("Couldn't reach the AI provider. Check your connection" + (p === "server" ? " and that /api/ai is deployed." : " and key.") + " (" + (e && e.message ? e.message : e) + ")", "network");
    }
  };

  ai.parseJSON = function (text) {
    const t = String(text || "").trim();
    const tryParse = (s) => {
      try {
        return JSON.parse(s);
      } catch (e) {
        return undefined;
      }
    };
    let v = tryParse(t);
    if (v !== undefined) return v;
    const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) {
      v = tryParse(fence[1]);
      if (v !== undefined) return v;
    }
    const a = t.indexOf("{"), b = t.lastIndexOf("}");
    if (a >= 0 && b > a) {
      v = tryParse(t.slice(a, b + 1));
      if (v !== undefined) return v;
    }
    throw new AIError("The AI answered in the wrong format. Tap Try again.", "format");
  };
  ai.json = async (o) => ai.parseJSON(await ai.call(Object.assign({}, o, { json: true })));

  ai.test = async function () {
    const r = await ai.json({ system: "You are a connection test.", prompt: 'Reply with {"ok": true, "word": "<one cheerful word>"}' });
    if (!r || r.ok !== true) throw new AIError("Connected, but the reply was unexpected.", "format");
    return r.word || "ok";
  };

  /* ---------- prompts ---------- */
  const THINK_SYSTEM = [
    "You are the Thinking Partner inside Afterthoughts, an app that helps people form their OWN point of view on something they read, then express it.",
    "Hard rules:",
    "- Never give your own opinion. Never summarise at length. Never write content for them.",
    "- Ask ONE question at a time: at most 2 short sentences, specific to the source and to what the user just said. Plain, warm language. No praise like 'Great point'. No emoji.",
    "- Climb this ladder as their answers get richer, without repeating a rung they already answered well:",
    "  React: what stood out or bothered them.",
    "  Evaluate: do they agree; where does the idea hold or break.",
    "  Connect: where they have seen this in their own work, studies or life.",
    "  Challenge: state the strongest counterargument to THEIR emerging view in 1-2 sentences, then ask how they answer it.",
    "  Commit: ask them to say in one sentence what they believe now.",
    "- If their last answer is thin ('idk', 'agree', one word), offer 3 short contrasting positions as options and ask which is closest and why.",
    "- Many users are Indian students and young professionals; examples may use Indian context when natural.",
  ].join("\n");

  function lensRule(s) {
    const L = AT.LENSES[s.lens] || AT.LENSES.balanced;
    return "LENS: " + L.name + ". " + L.rule;
  }
  function transcript(s) {
    return s.messages
      .filter((m) => m.kind !== "persp")
      .map((m) => (m.role === "ai" ? "Partner" + (m.rung ? " [" + m.rung + "]" : "") + ": " : "User: ") + m.text)
      .join("\n");
  }
  AT.userWords = (s) =>
    s.messages
      .filter((m) => m.role === "me")
      .map((m) => m.text)
      .join("\n");

  function voiceBlock() {
    const v = AT.store.data.voice;
    if (!v) return "VOICE: no profile yet. Write plainly in first person, conversational, no emoji, no hashtags.";
    const lines = ["VOICE PROFILE (match it):", "- Tone: " + (v.tone || "Balanced"), "- Typical length: " + (v.length || "Medium"), "- Emoji: " + (v.emoji || "Never"), "- Hashtags: " + (v.hashtags || "None"), "- Likes to open with: " + (v.opener || "Straight to the point")];
    if (v.avoid) lines.push("- Never use these words or phrases: " + v.avoid);
    if (v.summary) lines.push("- Voice summary: " + v.summary);
    const dna = AT.insights.voiceDNA(v.samples || "");
    if (dna) lines.push("- Measured from samples: average sentence " + dna.avgSentence + " words, " + dna.formality + ", signature words: " + dna.signature.slice(0, 6).join(", "));
    if (v.samples && v.samples.trim()) lines.push('WRITING SAMPLES by the user (copy rhythm, sentence length and vocabulary; never reuse their content):\n"""\n' + U.trunc(v.samples, 4000) + '\n"""');
    return lines.join("\n");
  }

  const clean = (r, fallback) => (r && typeof r === "object" ? r : fallback);
  const pickRung = (r, d) => (AT.RUNGS.includes(r) ? r : d);
  const strArr = (a, n) => (Array.isArray(a) ? a.slice(0, n).map((x) => String(x).trim()).filter(Boolean) : []);

  /* ---------- engine: every feature, live AI or offline demo ---------- */
  const E = (AT.engine = {});

  E.readImage = async function (file, signal) {
    if (!ai.canSeeImages()) throw new AIError("Reading screenshots needs an AI provider. Add one in Settings, or paste the text.", "images");
    const data = await U.fileToBase64(file);
    const r = await ai.json({
      system: "You transcribe screenshots of posts and articles accurately.",
      prompt: 'Transcribe the main text in this screenshot of a post or article. Skip interface text like buttons, like counts and timestamps. Return {"text": string, "from": string (author or publication if visible, else "")}.',
      images: [{ mime: file.type || "image/png", data }],
      signal,
    });
    const text = String((r && r.text) || "").trim();
    if (!text) throw new AIError("Couldn't find readable text in that image. Try a clearer screenshot.", "empty");
    return { text, from: String((r && r.from) || "") };
  };

  E.start = async function (s, signal) {
    if (!ai.isLive()) return AT.demo.start(s);
    const reaction = s.messages.find((m) => m.kind === "reaction");
    const r = clean(
      await ai.json({
        system: THINK_SYSTEM,
        prompt:
          lensRule(s) +
          "\n\nSOURCE" + (s.source.url ? " (" + s.source.url + ")" : "") + (s.source.type === "idea" ? " (the user's own passing thought, not an article)" : "") + ':\n"""\n' + U.trunc(s.source.text, 12000) + '\n"""\n\n' +
          (reaction ? "The user's first reaction: " + reaction.text + "\n\n" : "") +
          'Start the session. Return {"title": string (3-6 words naming the topic, for their library), "gist": string (one neutral sentence, max 25 words, on what the piece argues; for a passing thought, restate it neutrally), "tags": string[] (2-3 lowercase topic tags), "question": string (your first question; build on their first reaction if given), "rung": "React" or "Evaluate"}',
        signal,
      }),
      {}
    );
    return {
      title: U.clip(r.title || "Untitled thought", 70),
      gist: String(r.gist || ""),
      tags: strArr(r.tags, 3).map((t) => t.toLowerCase()),
      question: String(r.question || "What stood out to you most?"),
      rung: pickRung(r.rung, "React"),
    };
  };

  E.next = async function (s, mode, signal) {
    if (!ai.isLive()) return AT.demo.next(s, mode);
    const answers = s.messages.filter((m) => m.role === "me").length;
    const target = (AT.DEPTHS[s.depth] || AT.DEPTHS.standard).answers;
    const instr =
      mode === "push"
        ? 'The user tapped PUSH BACK. Argue the strongest honest case against their current view in 2-3 sentences, then ask how they would answer it. rung must be "Challenge".'
        : mode === "unsure"
        ? "The user tapped I'M NOT SURE. Offer exactly 3 contrasting positions (each under 14 words) in options, and ask which is closest to what they think, and why."
        : mode === "deeper"
        ? "The user tapped GO DEEPER. Ask a sharper follow-up on their LAST answer: probe an assumption, ask for a concrete example, or ask what would change their mind."
        : "Ask the next question on the ladder. They aim for about " + target + " answers in total" + (answers >= target - 1 ? "; move to Commit now if they haven't stated a clear view." : ".");
    const r = clean(
      await ai.json({
        system: THINK_SYSTEM,
        prompt:
          lensRule(s) + '\n\nSOURCE:\n"""\n' + U.trunc(s.source.text, 6000) + '\n"""\nGIST: ' + s.gist + "\n\nCONVERSATION SO FAR:\n" + transcript(s) +
          "\n\nThe user has written " + answers + " answer(s). " + instr +
          '\n\nReturn {"question": string, "rung": one of React|Evaluate|Connect|Challenge|Commit, "options": string[] (0-3 items, under 14 words each; empty unless asked for or their last answer was thin), "ready": boolean (true once they have stated a clear view in their own words, or after ' + target + " answers)}",
        signal,
      }),
      {}
    );
    return {
      question: String(r.question || "In one sentence, what do you believe now?"),
      rung: pickRung(r.rung, mode === "push" ? "Challenge" : "Evaluate"),
      options: strArr(r.options, 3),
      ready: !!r.ready || answers >= target,
    };
  };

  E.perspectives = async function (s, signal) {
    if (!ai.isLive()) return AT.demo.perspectives(s);
    const r = clean(
      await ai.json({
        system: THINK_SYSTEM,
        prompt:
          'SOURCE GIST: ' + s.gist + "\n\nCONVERSATION:\n" + transcript(s) +
          '\n\nThe user wants to see the idea through other eyes WITHOUT being told what to think. Pick 3 sharply different people who would care about this (for example an economist, a first-time founder, a skeptical HR head, a parent in a tier-2 city, a 22-year-old fresher). For each, write the ONE question that person would ask the user, under 25 words. Questions only, no opinions. Return {"perspectives": [{"who": string, "question": string}]}',
        signal,
      }),
      {}
    );
    const list = Array.isArray(r.perspectives) ? r.perspectives.slice(0, 3).map((p) => ({ who: String(p.who || "Someone"), question: String(p.question || "") })).filter((p) => p.question) : [];
    if (!list.length) throw new AIError("Couldn't come up with perspectives this time. Try again.", "empty");
    return list;
  };

  E.take = async function (s, signal) {
    if (!ai.isLive()) return AT.demo.take(s);
    const r = clean(
      await ai.json({
        system: "You help a user state their OWN take on something they read, using only what they said in a thinking session. You never add ideas of your own.",
        prompt:
          "SOURCE GIST: " + s.gist + "\n\nSESSION:\n" + transcript(s) +
          '\n\nWrite their take from the USER lines only.\n- stance: one sentence, first person, reusing their own words and phrasing wherever possible.\n- points: 2-3 short supporting points, each grounded in something they actually said (a reason, an example, an experience).\n- Do not add arguments, facts or examples they did not give. If their view is mixed or uncertain, say so honestly.\nReturn {"stance": string, "points": string[]}',
        big: true,
        signal,
      }),
      {}
    );
    return { stance: String(r.stance || "").trim(), points: strArr(r.points, 4) };
  };

  E.clarity = async function (s, signal) {
    const local = AT.insights.clarityLocal(s.take.stance);
    if (!ai.isLive()) return AT.demo.clarity(s, local);
    const r = clean(
      await ai.json({
        system: "You are a sharp, kind thinking coach. You never rewrite the user's view or tell them what to think; you only ask questions and point out where the wording is unclear.",
        prompt:
          "THEIR TAKE: " + s.take.stance + "\nTHEIR POINTS:\n- " + (s.take.points || []).join("\n- ") +
          '\n\nCheck the take for: vagueness, overgeneralisation, a hidden assumption, a possible thinking bias (confirmation bias, survivorship bias, recency, anecdote-as-proof), and whether a reader could disagree with it (a take nobody can disagree with says nothing).\nReturn {"score": integer 1-10 (how clear and arguable it is), "verdict": string (one sentence), "flags": [{"type": string (e.g. "Vague", "Overgeneralisation", "Hidden assumption", "Survivorship bias"), "note": string (one sentence, specific to their words)}] (0-3 items), "sharpen": string[] (2 questions that would make the take sharper)}',
        signal,
      }),
      {}
    );
    return {
      score: U.clamp(parseInt(r.score, 10) || local.score, 1, 10),
      verdict: String(r.verdict || local.verdict),
      flags: Array.isArray(r.flags) ? r.flags.slice(0, 3).map((f) => ({ type: String(f.type || "Note"), note: String(f.note || "") })) : local.flags,
      sharpen: strArr(r.sharpen, 3),
    };
  };

  function formatSpec(fmt, len, tone) {
    const f = AT.FORMATS[fmt] || AT.FORMATS.linkedin;
    const toneLine = { voice: "", bolder: "Make it bolder and more direct than usual, still honest.", gentler: "Make it gentler and more open-minded, inviting other views.", story: "Lead with the user's own experience from the session as a short story, if they gave one." }[tone] || "";
    return "FORMAT: " + f.name + ", " + f[len] + ". " + f.shape + (toneLine ? "\nTONE: " + toneLine : "");
  }

  E.draft = async function (s, opts, signal) {
    if (!ai.isLive()) return AT.demo.draft(s, opts);
    const text = await ai.call({
      system:
        "You are the Editor inside Afterthoughts. You turn a user's own take into publishable writing in THEIR voice. You never invent facts, statistics, quotes or anecdotes. Output only the finished text.",
      prompt:
        "THEIR TAKE: " + s.take.stance + "\nSUPPORTING POINTS:\n- " + (s.take.points || []).join("\n- ") +
        "\n\nTHEIR OWN WORDS FROM THE THINKING SESSION (reuse their phrases wherever they work):\n" + U.trunc(AT.userWords(s), 5000) +
        "\n\nWHAT THEY WERE REACTING TO: " + s.gist + (s.source.from ? " (" + s.source.from + ")" : "") + (s.source.url ? " " + s.source.url : "") +
        (opts.hook ? "\n\nOPEN WITH THIS EXACT FIRST LINE (the user chose it): " + opts.hook : "") +
        "\n\n" + voiceBlock() + "\n\n" + formatSpec(opts.format, opts.length, opts.tone) +
        "\n\nRULES:\n- Use only the take, the points and their own words.\n- Where the piece needs something they never gave (an example, a number, a name), insert a visible placeholder like [add your example].\n- Avoid stock phrases: " + AT.CLICHES.slice(0, 18).join(", ") + ". Avoid em dashes. No emoji unless the voice profile says otherwise.\n- Write as the user, first person. Credit the source naturally if it helps.\n- Output only the finished text. No preamble, no notes.",
      big: true,
      signal,
    });
    return text.replace(/^```[a-z]*\s*|```\s*$/g, "").trim();
  };

  E.hooks = async function (s, opts, signal) {
    if (!ai.isLive()) return AT.demo.hooks(s);
    const r = clean(
      await ai.json({
        system: "You write opening lines for posts, in the user's voice, using only their own take. No clickbait, no stock phrases, no emoji.",
        prompt:
          "THEIR TAKE: " + s.take.stance + "\nPOINTS:\n- " + (s.take.points || []).join("\n- ") + "\nTHEIR WORDS:\n" + U.trunc(AT.userWords(s), 2500) + "\n\n" + voiceBlock() +
          '\n\nWrite 5 different opening lines (each under 20 words) for a ' + (AT.FORMATS[opts.format] || AT.FORMATS.linkedin).name + '. Use five styles: a bold claim, a question, a short personal moment from their answers, a surprising contrast, and a plain direct statement. Return {"hooks": [{"style": string, "line": string}]}',
        signal,
      }),
      {}
    );
    const list = Array.isArray(r.hooks) ? r.hooks.slice(0, 5).map((h) => ({ style: String(h.style || ""), line: String(h.line || "").trim() })).filter((h) => h.line) : [];
    if (!list.length) throw new AIError("Couldn't write hooks this time. Try again.", "empty");
    return list;
  };

  E.voiceSummary = async function (v, signal) {
    if (!ai.isLive()) return AT.demo.voiceSummary(v);
    const text = await ai.call({
      system: "You describe a person's writing voice precisely, in plain words, so another writer could imitate it.",
      prompt: 'WRITING SAMPLES:\n"""\n' + U.trunc(v.samples, 6000) + '\n"""\n\nDescribe this voice in 2-3 sentences: rhythm, vocabulary, how they open and close, what they never do. No praise. Plain text only.',
      signal,
    });
    return text.trim();
  };

  E.digest = async function (sessions, signal) {
    if (!ai.isLive()) return AT.demo.digest(sessions);
    const recent = sessions.slice(0, 12).map((s) => "- " + (s.title || "Untitled") + ": " + (s.take && s.take.stance ? "TAKE: " + s.take.stance : "GIST: " + s.gist)).join("\n");
    const text = await ai.call({
      system: "You write a short, warm, honest weekly reflection for someone about their own thinking. You never invent things they didn't think.",
      prompt:
        "Their recent afterthoughts:\n" + recent +
        "\n\nWrite a 'Your thinking this week' note in 3 short paragraphs: (1) the themes they kept returning to, (2) any tension or contradiction between their takes worth noticing, (3) one question to sit with next week. Second person. Under 150 words. Plain text.",
      signal,
    });
    return text.trim();
  };
})(window.AT);
