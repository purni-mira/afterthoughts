/* Afterthoughts — My voice (Voice DNA + profile) */
(function (AT) {
  "use strict";
  const U = AT.u, ui = AT.ui;
  AT.views = AT.views || {};

  const QUIZ = [
    { key: "tone", q: "How do you sound?", opts: ["Conversational", "Balanced", "Formal"], def: "Balanced" },
    { key: "length", q: "How long are your posts usually?", opts: ["Short and punchy", "Medium", "Long-form"], def: "Medium" },
    { key: "emoji", q: "Emoji?", opts: ["Never", "Sometimes", "Often"], def: "Never" },
    { key: "hashtags", q: "Hashtags?", opts: ["None", "1 to 3", "More"], def: "None" },
    { key: "opener", q: "How do you like to open?", opts: ["Straight to the point", "A question", "A bold claim", "A personal story"], def: "Straight to the point" },
  ];

  function dnaHTML(samples) {
    const d = AT.insights.voiceDNA(samples);
    if (!d) return '<p class="hint">Paste at least 40 words of your writing to see your Voice DNA.</p>';
    const tile = (v, l) => '<div class="dna"><b>' + v + "</b><small>" + l + "</small></div>";
    return (
      '<div class="dna-grid">' +
      tile(d.avgSentence, "words per sentence") +
      tile(d.formality, "register") +
      tile(d.questionRate + "%", "sentences that ask") +
      tile(d.firstPersonPer100, "I/my per 100 words") +
      tile(d.emojiPer100, "emoji per 100 words") +
      tile(d.variety + "%", "word variety") +
      "</div>" +
      (d.signature.length ? '<div class="label">Words that sound like you</div><div class="chips">' + d.signature.map((w) => '<span class="chip">' + U.esc(w) + "</span>").join("") + "</div>" : "")
    );
  }

  AT.views.voice = {
    title: "My voice",
    render(root) {
      const v = AT.store.data.voice || {};
      const p = AT.store.data.profile || {};
      root.innerHTML =
        '<header class="page-head"><div><div class="eyebrow">My voice</div><h1 class="display">Drafts should sound like you, not like AI.</h1><p class="lede">Afterthoughts copies how you write, never what you wrote. Real samples beat any setting.</p></div></header>' +
        '<div class="grid-2 top">' +
        '<form id="voice-form" class="card stack">' +
        '<div><label for="samples">2 or 3 things you\'ve written</label><textarea id="samples" rows="9" placeholder="Paste past LinkedIn posts, an email you were proud of, a college essay… Separate them with a blank line.">' + U.esc(v.samples || "") + '</textarea><p class="hint">No posts yet? Paste anything in your natural voice, even a long WhatsApp message.</p></div>' +
        QUIZ.map((item) => '<fieldset><legend>' + U.esc(item.q) + '</legend><div class="choices">' + item.opts.map((o, i) => {
          const id = "vq-" + item.key + "-" + i;
          return '<input type="radio" name="' + item.key + '" id="' + id + '" value="' + U.esc(o) + '"' + ((v[item.key] || item.def) === o ? " checked" : "") + '><label for="' + id + '">' + U.esc(o) + "</label>";
        }).join("") + "</div></fieldset>").join("") +
        '<div><label for="avoid">Words you never want in your posts <span class="muted">(optional)</span></label><input type="text" id="avoid" value="' + U.esc(v.avoid || "") + '" placeholder="e.g. synergy, thrilled, leverage"></div>' +
        '<div class="row"><button class="btn primary" type="submit">Save my voice</button>' + (v.updatedAt ? '<span class="hint">Saved ' + U.esc(U.relTime(v.updatedAt)) + "</span>" : "") + "</div></form>" +
        '<div class="stack">' +
        '<div class="card stack"><div class="card-head"><h2>Voice DNA</h2><span class="hint">measured as you type</span></div><div id="dna">' + dnaHTML(v.samples || "") + "</div>" +
        '<div class="label">In words</div><p class="voice-sum" id="vsum">' + (v.summary ? U.esc(v.summary) : '<span class="hint">Not described yet.</span>') + '</p><div class="row"><button class="btn small" id="describe">' + ui.icon("spark") + "Describe my voice</button></div></div>" +
        '<form class="card stack" id="profile-form"><div class="card-head"><h2>You</h2><span class="hint">for previews and quote images</span></div>' +
        '<div><label for="pname">Name</label><input type="text" id="pname" value="' + U.esc(p.name || "") + '" autocomplete="name"></div>' +
        '<div><label for="phead">Headline</label><input type="text" id="phead" value="' + U.esc(p.headline || "") + '" placeholder="e.g. MBA student · building things"></div>' +
        '<div class="row"><button class="btn" type="submit">Save</button></div></form>' +
        "</div></div>";
      const ta = U.$("#samples", root);
      ta.addEventListener("input", U.debounce(() => (U.$("#dna", root).innerHTML = dnaHTML(ta.value)), 200));
      U.$("#voice-form", root).addEventListener("submit", (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const nv = Object.assign({}, AT.store.data.voice || {}, { samples: ta.value.trim(), avoid: U.$("#avoid", root).value.trim(), updatedAt: Date.now() });
        QUIZ.forEach((q) => (nv[q.key] = fd.get(q.key) || q.def));
        AT.store.setVoice(nv);
        U.toast("Voice saved. Your next draft will use it.", "good");
        AT.views.voice.render(root);
      });
      U.$("#describe", root).addEventListener("click", async (e) => {
        const b = e.currentTarget;
        if (U.words(ta.value).length < 40) return U.toast("Paste at least 40 words of your writing first.");
        b.disabled = true;
        U.$("#vsum", root).innerHTML = '<span class="hint shimmer">Listening to how you write…</span>';
        try {
          const nv = Object.assign({}, AT.store.data.voice || {}, { samples: ta.value.trim() });
          nv.summary = await AT.engine.voiceSummary(nv);
          nv.updatedAt = Date.now();
          AT.store.setVoice(nv);
          U.$("#vsum", root).textContent = nv.summary || "Couldn't describe it yet. Add more samples.";
        } catch (err) {
          U.$("#vsum", root).innerHTML = ui.errorBox(err.message, false);
        } finally {
          b.disabled = false;
        }
      });
      U.$("#profile-form", root).addEventListener("submit", (e) => {
        e.preventDefault();
        AT.store.setProfile({ name: U.$("#pname", root).value.trim(), headline: U.$("#phead", root).value.trim() });
        U.toast("Saved.");
        AT.app.renderChrome();
      });
    },
  };
})(window.AT);
