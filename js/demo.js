/* Afterthoughts — offline demo engine.
 * Lets anyone try the full flow with no API key. Questions come from a curated bank,
 * takes and drafts are assembled only from the user's own sentences. */
(function (AT) {
  "use strict";
  const U = AT.u;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const pick = (arr, seed) => arr[Math.abs(seed) % arr.length];
  const hash = (t) => {
    let h = 0;
    for (const c of String(t)) h = (h * 31 + c.charCodeAt(0)) | 0;
    return h;
  };
  const fill = (t, s) => t.replace(/\{x\}/g, s.topic || "this idea");

  const BANK = {
    React: [
      "What's the first thing in this that made you pause, nod, or roll your eyes?",
      "Which line about {x} stuck with you, and why that one?",
      "If you had to tell a friend about this in one breath, what would you say bothered or excited you?",
    ],
    Evaluate: [
      "Do you buy the argument about {x}? Where does it hold up, and where does it crack?",
      "What would have to be true for this view on {x} to be right?",
      "Is this true for everyone, or only for a certain kind of person or company?",
    ],
    Connect: [
      "Where have you seen {x} play out in your own work, college or family?",
      "Think of one real moment from your life that supports or breaks this. What happened?",
      "If this were about your own next job or business, would you act on it? Why?",
    ],
    Challenge: [
      "Here's the other side: people who disagree would say your view only works in ideal conditions. How would you answer them?",
      "A smart critic would say you're generalising from your own experience. What would you say back?",
      "What's the strongest reason someone sensible would disagree with you on {x}?",
    ],
    Commit: [
      "In one sentence, what do you now believe about {x}?",
      "If you had to put your name on one line about {x}, what would it say?",
    ],
  };
  const LENS_EXTRA = {
    first: ["Strip it down: what's the one assumption under {x} that everything else rests on? Is it true?"],
    devil: ["Let me push: what if the opposite of your view is actually true? What would that look like?"],
    india: ["How does this look for someone in a tier-2 Indian city, or for a family where the first salary pays the EMI?"],
    second: ["Say {x} becomes normal. What happens next, and what happens after that?"],
    people: ["Who wins and who loses if {x} spreads? Who isn't in the conversation at all?"],
    future: ["Ten years from now, what will people find obvious about {x} that we're arguing over today?"],
  };
  const PUSH = [
    "The strongest case against you: your view assumes people and companies behave sensibly, but incentives often push the other way. If that's true, does your view still stand?",
    "Someone sceptical would say you're judging from a small sample, your own circle. What evidence beyond your experience would change your mind?",
    "The other side would argue the costs land on people who aren't in this conversation. How do you answer that?",
  ];
  const PERSONAS = [
    { who: "An economist", q: "Who pays the cost of {x}, and is it the same person who gets the benefit?" },
    { who: "A first-time founder", q: "If you had ₹10 lakh and six months, would you bet on {x} or against it?" },
    { who: "A sceptical HR head", q: "What would you measure to prove {x} actually works, not just sounds good?" },
    { who: "A parent in a tier-2 city", q: "How would {x} change things for a family that can't afford to get it wrong?" },
    { who: "A 22-year-old fresher", q: "Does {x} make it easier or harder to get your first real break?" },
    { who: "A historian", q: "When has something like {x} happened before, and how did it end?" },
  ];

  function thin(t) {
    const w = U.words(t);
    return w.length < 5 || /^(idk|i don'?t know|not sure|agree|disagree|yes|no|maybe|true|ok)\b/i.test(t.trim());
  }

  const D = (AT.demo = {});

  D.start = async function (s) {
    await wait(450);
    const text = s.source.text || "";
    s.topic = U.keyPhrase(text);
    const first = U.sentences(text)[0] || text;
    const reaction = s.messages.find((m) => m.kind === "reaction");
    const kw = U.keywords(text, 2);
    const phrase = U.keyPhrase(text);
    const raw = s.source.type === "idea" ? first : phrase.includes(" ") ? phrase : kw.length > 1 ? kw[0] + " and " + kw[1] : phrase;
    const title = U.clip(raw.charAt(0).toUpperCase() + raw.slice(1), 60);
    return {
      title: title || "Untitled thought",
      gist: U.clip(first, 160),
      tags: U.keywords(text, 3),
      question: reaction
        ? "You said: \"" + U.clip(reaction.text, 80) + "\". What exactly in the piece made you feel that way?"
        : fill(pick(BANK.React, hash(text)), s),
      rung: "React",
    };
  };

  D.next = async function (s, mode) {
    await wait(350);
    s.topic = s.topic || U.keyPhrase(s.source.text || s.gist || "");
    const mine = s.messages.filter((m) => m.role === "me");
    const last = mine[mine.length - 1];
    const target = (AT.DEPTHS[s.depth] || AT.DEPTHS.standard).answers;
    const asked = s.messages.filter((m) => m.role === "ai").map((m) => m.rung);
    const seed = hash((last && last.text) || "") + mine.length;
    if (mode === "push") return { question: pick(PUSH, seed), rung: "Challenge", options: [], ready: false };
    if (mode === "unsure" || (last && thin(last.text) && mode !== "deeper")) {
      return {
        question: "No problem. Which of these is closest to what you think, and why?",
        rung: "Evaluate",
        options: [fill("{x} is mostly right, people underrate it", s), fill("{x} is overhyped, the reality is messier", s), "It depends on who you are and where you start"],
        ready: false,
      };
    }
    if (mode === "deeper") return { question: "Go one level deeper on what you just said: can you give a concrete example, or what would change your mind?", rung: "Evaluate", options: [], ready: false };
    // pick next rung by progress
    const ratio = mine.length / target;
    let rung = ratio < 0.25 ? "Evaluate" : ratio < 0.5 ? "Connect" : ratio < 0.8 ? "Challenge" : "Commit";
    if (rung === "Challenge" && asked.includes("Challenge")) rung = "Commit";
    if (rung === "Connect" && asked.includes("Connect")) rung = "Challenge";
    let pool = BANK[rung];
    const extra = LENS_EXTRA[s.lens];
    if (extra && (rung === "Evaluate" || rung === "Connect") && !s._lensUsed) {
      s._lensUsed = true;
      pool = extra;
    }
    const used = new Set(s.messages.filter((m) => m.role === "ai").map((m) => m.text));
    let q = fill(pick(pool, seed), s);
    for (let i = 0; used.has(q) && i < pool.length; i++) q = fill(pool[(Math.abs(seed) + i + 1) % pool.length], s);
    return { question: q, rung, options: [], ready: mine.length >= target || rung === "Commit" };
  };

  D.perspectives = async function (s) {
    await wait(300);
    s.topic = s.topic || U.keyPhrase(s.source.text || "");
    const start = Math.abs(hash(s.id)) % PERSONAS.length;
    return [0, 2, 4].map((i) => {
      const p = PERSONAS[(start + i) % PERSONAS.length];
      return { who: p.who, question: fill(p.q, s) };
    });
  };

  function scoreSentence(t) {
    let sc = U.words(t).length;
    if (/\b(i think|i believe|i feel|in my view|for me|i'd argue|my take)\b/i.test(t)) sc += 14;
    if (/\b(because|since|so that|which means)\b/i.test(t)) sc += 6;
    if (/\b(i|my|me|we|our)\b/i.test(t)) sc += 4;
    return sc;
  }
  const cap = (t) => {
    t = String(t || "").trim().replace(/\s+/g, " ");
    if (!t) return t;
    t = t[0].toUpperCase() + t.slice(1);
    return /[.!?]$/.test(t) ? t : t + ".";
  };

  D.take = async function (s) {
    await wait(500);
    const mine = s.messages.filter((m) => m.role === "me" && m.kind !== "reaction");
    const all = mine.concat(s.messages.filter((m) => m.kind === "reaction"));
    const lastCommit = [...s.messages].reverse().findIndex((m) => m.role === "ai" && m.rung === "Commit");
    let stance = "";
    if (lastCommit >= 0) {
      const idx = s.messages.length - 1 - lastCommit;
      const ans = s.messages.slice(idx + 1).find((m) => m.role === "me");
      if (ans) stance = U.sentences(ans.text)[0] || ans.text;
    }
    const sents = [];
    all.forEach((m) => U.sentences(m.text).forEach((t) => sents.push(t)));
    if (!sents.length) all.forEach((m) => sents.push(m.text));
    const ranked = sents.slice().sort((a, b) => scoreSentence(b) - scoreSentence(a));
    // the latest answer is usually the most considered view
    const latest = mine[mine.length - 1];
    if (!stance && latest) {
      const ls = U.sentences(latest.text)[0] || latest.text;
      if (U.words(ls).length >= 6 && !/\?$/.test(ls)) stance = ls;
    }
    if (!stance) stance = ranked[0] || "I'm still working out what I think here.";
    const points = ranked.filter((t) => t !== stance && U.words(t).length >= 4).slice(0, 3).map(cap);
    return { stance: cap(stance), points };
  };

  D.clarity = async function (s, local) {
    await wait(250);
    const sharpen = [
      "Who exactly is this true for, and who is it not true for?",
      "What's one piece of evidence that would prove you wrong?",
      "Can you replace one vague word in your take with a concrete example?",
    ];
    return Object.assign({}, local, { sharpen: sharpen.slice(0, 2) });
  };

  function paras(points) {
    return points.map(cap);
  }

  D.draft = async function (s, opts) {
    await wait(700);
    const stance = cap(s.take.stance);
    const pts = paras((s.take.points || []).filter(Boolean));
    const hook = opts.hook ? cap(opts.hook) : stance;
    const src = s.title ? "I was reading about " + s.title.toLowerCase() + " and kept coming back to it." : "";
    const close = "Where do you land on this?";
    const f = opts.format;
    const long = opts.length === "long";
    if (f === "thread") {
      const posts = [hook].concat(pts, long ? [src, "[add your example]"] : []).concat([close]).filter(Boolean);
      return posts.map((p, i) => i + 1 + "/ " + U.clip(p, 260)).join("\n\n");
    }
    if (f === "note") return U.clip(stance + (long && pts[0] ? " " + pts[0] : ""), long ? 480 : 270);
    if (f === "carousel") {
      const slides = [["Slide 1:", hook], ["Slide 2:", "What I read", s.gist]]
        .concat(pts.map((p, i) => ["Slide " + (i + 3) + ":", "Reason " + (i + 1), p]))
        .concat([["Slide " + (pts.length + 3) + ":", "My take", stance], ["Slide " + (pts.length + 4) + ":", close]]);
      return slides.map((sl) => sl.filter(Boolean).join("\n")).join("\n\n");
    }
    if (f === "outline") {
      const out = ["Working title: " + U.clip(stance, 80), "Thesis: " + stance, "", "1. What I read", "   - " + (s.gist || "[add a one-line summary]")];
      pts.forEach((p, i) => out.push(i + 2 + ". " + U.clip(p, 70), "   - " + p, "   - [add evidence]"));
      out.push(pts.length + 2 + ". What I'm still unsure about", "   - [add your open question]");
      if (long) out.push(pts.length + 3 + ". What this means for people like me", "   - [add your example]");
      return out.join("\n");
    }
    if (f === "newsletter") {
      return ["Subject: " + U.clip(stance, 60), "", "Hi,", "", src, "", stance]
        .concat(pts.length ? ["", "Here's why:", ""].concat(pts) : [])
        .concat(long ? ["", "[add your example]"] : [])
        .concat(["", "I'd love to know: " + close.toLowerCase()])
        .join("\n");
    }
    // linkedin
    const lines = [hook, ""];
    if (opts.hook && hook !== stance) lines.push(stance, "");
    if (src) lines.push(src, "");
    pts.forEach((p) => lines.push(p, ""));
    if (long) lines.push("[add your example]", "");
    lines.push(close);
    return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  };

  D.hooks = async function (s) {
    await wait(300);
    const st = cap(s.take.stance).replace(/\.$/, "");
    const p = (s.take.points || [])[0] || "";
    return [
      { style: "Bold claim", line: st + "." },
      { style: "Question", line: "Is it just me, or " + (/^I\b/.test(st) ? st : st.charAt(0).toLowerCase() + st.slice(1)) + "?" },
      { style: "Personal moment", line: p ? U.clip(cap(p), 110) : "Something I read this week wouldn't leave me alone." },
      { style: "Contrast", line: "Everyone's talking about " + (s.title || "this").toLowerCase() + ". I think we're asking the wrong question." },
      { style: "Plain", line: "Here's where I've landed on " + (s.title || "this").toLowerCase() + "." },
    ];
  };

  D.voiceSummary = async function (v) {
    await wait(200);
    const d = AT.insights.voiceDNA(v.samples || "");
    if (!d) return "";
    return (
      "You write in " + (d.avgSentence < 12 ? "short, punchy" : d.avgSentence < 20 ? "medium-length" : "long, layered") + " sentences with a " + d.formality + " feel. " +
      (d.questionRate > 10 ? "You often ask your reader questions. " : "") +
      (d.signature.length ? "Words that sound like you: " + d.signature.slice(0, 5).join(", ") + "." : "")
    );
  };

  D.digest = async function (sessions) {
    await wait(300);
    const recent = sessions.slice(0, 12);
    if (!recent.length) return "Nothing to reflect on yet. Start an afterthought and come back at the end of the week.";
    const kw = U.keywords(recent.map((s) => (s.title || "") + " " + (s.take ? s.take.stance : s.gist)).join(" "), 5);
    const takes = recent.filter((s) => s.take && s.take.stance);
    return (
      "You kept coming back to " + (kw.slice(0, 3).join(", ") || "a few ideas") + ". " + recent.length + " afterthought" + (recent.length > 1 ? "s" : "") + ", " + takes.length + " with a clear take.\n\n" +
      (takes[0] ? "Your sharpest line: \"" + U.clip(takes[0].take.stance, 140) + "\"\n\n" : "") +
      "A question to sit with: which of these takes would you still defend in a year, and which one are you least sure of?"
    );
  };
})(window.AT);
