/* Afterthoughts — the thinking flow: Capture -> Unpack -> Take -> Express */
(function (AT) {
  "use strict";
  const U = AT.u, ui = AT.ui, C = AT.charts;
  AT.views = AT.views || {};

  /* transient UI state (not saved) */
  const T = {
    busy: null, // session id while an AI call runs
    busyLabel: "",
    err: null,
    errFor: null, // which session the error belongs to
    retry: null,
    ctl: null,
    compose: {}, // unsent answer text per session
    images: {}, // screenshots waiting to be read, per session
    clarity: {},
    hooks: {},
    opt: {}, // express options per session
    cap: { tab: "text", image: null, lens: null, depth: null },
  };

  function track(s) {
    const today = U.dayKey(Date.now());
    s.activity = (s.activity || []).filter((t) => U.dayKey(t) !== today).concat([Date.now()]).slice(-60);
  }
  function viewing(id) {
    return AT.app.route.name === "session" && AT.app.route.id === id;
  }
  const errOf = (s) => (T.errFor === s.id ? T.err : null);
  async function run(s, label, fn) {
    if (T.busy) {
      if (T.busy !== s.id) U.toast("Another afterthought is still thinking. This one will start when it finishes.");
      return;
    }
    T.busy = s.id;
    T.busyLabel = label;
    T.err = null;
    T.errFor = s.id;
    T.retry = () => run(s, label, fn);
    T.ctl = new AbortController();
    if (viewing(s.id)) AT.app.render();
    try {
      await fn(T.ctl.signal);
      T.retry = null;
    } catch (e) {
      if (!(e && e.code === "cancelled")) T.err = (e && e.message) || "Something went wrong. Try again.";
      else T.retry = null;
    } finally {
      T.busy = null;
      T.ctl = null;
      if (AT.app.route.name === "session") {
        AT.app.render();
        const th = U.$("#thread-end");
        if (th && s.stage === "unpack") th.scrollIntoView({ block: "end", behavior: "smooth" });
      }
    }
  }

  /* ============ CAPTURE ============ */
  AT.views.capture = {
    title: "New afterthought",
    render(root, params) {
      const cap = T.cap;
      const st = AT.store.settings;
      if (!cap.lens) cap.lens = st.lens || "balanced";
      if (!cap.depth) cap.depth = st.depth || "standard";
      const prov = params && params.p != null && AT.PROVOCATIONS[+params.p] ? AT.PROVOCATIONS[+params.p] : null;
      if (prov && !cap._prov) {
        cap.tab = "idea";
        cap._prov = prov;
      }
      const t = cap.tab;
      const live = AT.ai.isLive();
      const tab = (k, n) => '<button type="button" role="tab" data-tab="' + k + '" aria-selected="' + (t === k) + '">' + n + "</button>";
      root.innerHTML =
        '<header class="page-head"><div><div class="eyebrow">New afterthought</div><h1 class="display">What\'s still on your mind?</h1>' +
        "<p class=\"lede\">Bring in what you read. You'll answer a few questions, land on your own take, then turn it into something worth posting.</p></div></header>" +
        '<form id="capture" class="card stack capture" novalidate>' +
        '<div class="seg" role="tablist" aria-label="What are you bringing in?">' + tab("text", "Paste text") + tab("link", "Link") + tab("shot", "Screenshot") + tab("idea", "Just a thought") + "</div>" +
        (t === "link"
          ? '<div><label for="cap-url">Link</label><div class="row nowrap"><input id="cap-url" type="url" inputmode="url" placeholder="https://" autocomplete="off">' +
            (AT.store.settings.provider === "server" ? '<button type="button" class="btn" id="fetch-url">Fetch text</button>' : "") +
            "</div><p class=\"hint\">" + (AT.store.settings.provider === "server" ? "Fetch pulls the article text through your server. Paywalled pages may not work." : "Browsers can't open other sites' pages directly, so paste the part that caught your eye below.") + "</p></div>"
          : "") +
        (t === "shot"
          ? '<div><label for="cap-file">Screenshot of a post or article</label>' +
            (AT.ai.canSeeImages()
              ? '<div class="drop" id="drop" tabindex="0" role="button" aria-label="Choose a screenshot">' + (cap.image ? '<img id="shot-img" alt="Your screenshot">Tap to change' : ui.icon("img") + "<span>Tap to choose a screenshot, or drop it here</span>") + '</div><input id="cap-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden>'
              : '<div class="note">Reading screenshots needs an AI provider. <a href="#/settings">Add one in Settings</a> (Gemini has a free tier), or paste the text instead.</div>') +
            "</div>"
          : "") +
        (t !== "shot"
          ? '<div><label for="cap-text">' + (t === "link" ? "The part that caught your eye" : t === "idea" ? "Your thought, in a sentence or two" : "Paste the article, post or notes") + "</label>" +
            '<textarea id="cap-text" class="' + (t === "idea" ? "short" : "") + '" placeholder="' + (t === "idea" ? "e.g. I keep thinking internships are more about connections than learning." : "Paste anything: a LinkedIn post, a news story, a paragraph from a book, notes from a podcast…") + '">' + U.esc(cap._prov && t === "idea" ? cap._prov : "") + "</textarea></div>"
          : "") +
        '<div><label for="cap-reaction">Your first reaction, in a few words <span class="muted">(optional)</span></label><input id="cap-reaction" type="text" autocomplete="off" placeholder="e.g. True for startups, not for big companies"></div>' +
        '<fieldset><legend>Thinking lens</legend><div class="lens-grid">' +
        Object.entries(AT.LENSES).map(([k, L]) => '<label class="lens"><input type="radio" name="lens" value="' + k + '"' + (cap.lens === k ? " checked" : "") + "><span><b>" + U.esc(L.name) + "</b><small>" + U.esc(L.hint) + "</small></span></label>").join("") +
        "</div></fieldset>" +
        '<fieldset><legend>How deep?</legend><div class="seg">' +
        Object.entries(AT.DEPTHS).map(([k, d]) => '<button type="button" data-depth="' + k + '" aria-pressed="' + (cap.depth === k) + '">' + d.name + " <small>" + d.hint + "</small></button>").join("") +
        "</div></fieldset>" +
        '<div class="row"><button type="submit" class="btn primary lg">Start thinking ' + ui.icon("arrow") + '</button><span class="hint">' + (live ? "Thinking partner: " + U.esc(AT.ai.label()) + "." : 'Demo mode: questions come from templates. <a href="#/settings">Connect an AI</a> for a real thinking partner.') + "</span></div>" +
        '<p class="err" id="cap-err" role="alert" hidden></p></form>';
      bindCapture(root);
    },
  };

  function bindCapture(root) {
    const cap = T.cap;
    const keep = () => {
      const tx = U.$("#cap-text"), r = U.$("#cap-reaction"), u = U.$("#cap-url");
      return { tx: tx && tx.value, r: r && r.value, u: u && u.value };
    };
    const restore = (k) => {
      const tx = U.$("#cap-text"), r = U.$("#cap-reaction"), u = U.$("#cap-url");
      if (tx && k.tx) tx.value = k.tx;
      if (r && k.r) r.value = k.r;
      if (u && k.u) u.value = k.u;
    };
    U.$$("[data-tab]", root).forEach((b) => b.addEventListener("click", () => {
      const k = keep();
      cap.tab = b.dataset.tab;
      AT.views.capture.render(root, {});
      restore(k);
    }));
    U.$$("[data-depth]", root).forEach((b) => b.addEventListener("click", () => {
      cap.depth = b.dataset.depth;
      U.$$("[data-depth]", root).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    }));
    U.$$('input[name="lens"]', root).forEach((r) => r.addEventListener("change", () => (cap.lens = r.value)));
    const drop = U.$("#drop", root), file = U.$("#cap-file", root);
    if (drop && file) {
      if (cap.image) {
        try {
          U.$("#shot-img").src = URL.createObjectURL(cap.image);
        } catch (e) {}
      }
      const pickF = (f) => {
        if (f && /^image\//.test(f.type)) {
          const k = keep();
          cap.image = f;
          AT.views.capture.render(root, {});
          restore(k);
        }
      };
      drop.addEventListener("click", () => file.click());
      drop.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          file.click();
        }
      });
      file.addEventListener("change", () => pickF(file.files[0]));
      drop.addEventListener("dragover", (e) => {
        e.preventDefault();
        drop.classList.add("over");
      });
      drop.addEventListener("dragleave", () => drop.classList.remove("over"));
      drop.addEventListener("drop", (e) => {
        e.preventDefault();
        drop.classList.remove("over");
        pickF(e.dataTransfer.files[0]);
      });
    }
    const fetchBtn = U.$("#fetch-url", root);
    if (fetchBtn)
      fetchBtn.addEventListener("click", async () => {
        const url = U.$("#cap-url").value.trim();
        if (!/^https?:\/\//i.test(url)) return U.toast("Enter a full link starting with https://");
        fetchBtn.disabled = true;
        fetchBtn.textContent = "Fetching…";
        try {
          const res = await fetch(AT.store.settings.endpoint || "/api/ai", { method: "POST", headers: { "Content-Type": "application/json", "x-access-code": AT.store.settings.accessCode || "" }, body: JSON.stringify({ action: "fetch", url }) });
          const j = await res.json();
          if (!res.ok || !j.text) throw new Error(j.error || "Couldn't read that page.");
          U.$("#cap-text").value = j.text.slice(0, 15000);
          U.toast("Got the article text.");
        } catch (e) {
          U.toast(e.message || "Couldn't read that page. Paste the text instead.");
        } finally {
          fetchBtn.disabled = false;
          fetchBtn.textContent = "Fetch text";
        }
      });
    U.$("#capture", root).addEventListener("submit", (e) => {
      e.preventDefault();
      const err = U.$("#cap-err");
      const showErr = (m) => {
        err.hidden = false;
        err.textContent = m;
      };
      const text = ((U.$("#cap-text") || {}).value || "").trim();
      const url = ((U.$("#cap-url") || {}).value || "").trim();
      const reaction = ((U.$("#cap-reaction") || {}).value || "").trim();
      let source;
      if (cap.tab === "shot") {
        if (!AT.ai.canSeeImages()) return showErr("Add an AI provider in Settings to read screenshots, or paste the text.");
        if (!cap.image) return showErr("Choose a screenshot first.");
        source = { type: "shot", text: "" };
      } else if (cap.tab === "idea") {
        if (text.length < 12) return showErr("Write your thought in at least a sentence.");
        source = { type: "idea", text };
      } else {
        if (text.length < 40) return showErr(cap.tab === "link" ? "Paste at least a few sentences from the link so there's something to think about." : "Paste at least a few sentences so there's something to think about.");
        source = { type: cap.tab, text, url: cap.tab === "link" ? U.safeUrl(url) : "" };
      }
      const s = AT.newSession(source, { lens: cap.lens, depth: cap.depth });
      if (reaction) s.messages.push({ role: "me", text: reaction, kind: "reaction", at: Date.now() });
      track(s);
      if (cap.tab === "shot") T.images[s.id] = cap.image;
      cap.image = null;
      cap._prov = null;
      cap.tab = "text";
      AT.store.upsert(s);
      location.hash = "#/s/" + s.id;
      startSession(s);
    });
  }

  function startSession(s) {
    run(s, s.source.type === "shot" ? "Reading your screenshot" : "Reading it", async (signal) => {
      if (s.source.type === "shot" && !s.source.text) {
        const img = T.images[s.id];
        if (!img) throw new Error("The screenshot was lost when the page reloaded. Start again, or paste the text.");
        const got = await AT.engine.readImage(img, signal);
        s.source.text = got.text;
        if (got.from) s.source.from = got.from;
        delete T.images[s.id];
        AT.store.upsert(s);
      }
      const r = await AT.engine.start(s, signal);
      s.title = r.title;
      s.gist = r.gist;
      s.tags = r.tags || [];
      s.messages.push({ role: "ai", kind: "q", text: r.question, rung: r.rung, at: Date.now() });
      AT.store.upsert(s);
    });
  }

  function ask(s, mode) {
    const label = { push: "Building the other side", unsure: "Finding positions", deeper: "Going deeper" }[mode] || "Thinking";
    run(s, label, async (signal) => {
      const r = await AT.engine.next(s, mode, signal);
      s.messages.forEach((m) => (m.options = m.role === "ai" ? [] : m.options));
      s.messages.push({ role: "ai", kind: mode === "push" ? "push" : "q", text: r.question, rung: r.rung, options: r.options, at: Date.now() });
      s.ready = r.ready;
      AT.store.upsert(s);
    });
  }

  /* ============ SESSION ============ */
  AT.views.session = {
    title: "Afterthought",
    render(root, params) {
      const s = AT.store.get(params.id);
      if (!s) {
        root.innerHTML = '<div class="empty card">That afterthought doesn\'t exist on this device. <a href="#/library">Open your library</a>.</div>';
        return;
      }
      if (s.stage === "take" && !s.take) s.stage = "unpack";
      if (s.stage === "express" && !(s.take && s.take.stance)) s.stage = s.take ? "take" : "unpack";
      const main = s.stage === "take" ? takeHTML(s) : s.stage === "express" ? expressHTML(s) : unpackHTML(s);
      root.innerHTML =
        '<div class="session">' +
        '<div class="sess-main">' + headHTML(s) + main + "</div>" +
        '<aside class="sess-side">' + sideHTML(s) + "</aside></div>";
      bindCommon(root, s);
      if (s.stage === "take") bindTake(root, s);
      else if (s.stage === "express") bindExpress(root, s);
      else bindUnpack(root, s);
      // resume an interrupted start
      if (!s.messages.some((m) => m.role === "ai") && !T.busy && !errOf(s) && (s.source.text || T.images[s.id])) startSession(s);
    },
  };

  function headHTML(s) {
    const order = ["capture", "unpack", "take", "express"];
    const names = { capture: "Capture", unpack: "Unpack", take: "Take", express: "Express" };
    const at = order.indexOf(s.stage);
    const L = AT.LENSES[s.lens] || AT.LENSES.balanced;
    return (
      '<ol class="stepper" aria-label="Progress">' +
      order.map((k, i) => {
        const can = i > 0 && i < at; // go back to earlier stages
        const cls = i < at ? "done" : i === at ? "now" : "";
        return '<li class="' + cls + '"' + (i === at ? ' aria-current="step"' : "") + ">" + (can ? '<button class="linkish" data-stage="' + k + '">' + names[k] + "</button>" : names[k]) + "</li>";
      }).join("") +
      "</ol>" +
      '<div class="sess-head"><div><h1 class="display sm">' + U.esc(s.title || (T.busy === s.id ? "Reading it…" : "Untitled thought")) + "</h1>" +
      '<div class="meta-row">' + ui.pill(s.status) + '<span class="tag">' + U.esc(L.name) + (/lens/i.test(L.name) ? "" : " lens") + "</span>" + (s.tags || []).map((t) => '<span class="tag">#' + U.esc(t) + "</span>").join("") + "</div></div>" +
      '<div class="row nowrap"><button class="icon-btn" data-md title="Download as Markdown" aria-label="Download as Markdown">' + ui.icon("dl") + '</button><button class="icon-btn" data-del title="Delete" aria-label="Delete this afterthought">' + ui.icon("trash") + "</button></div></div>"
    );
  }

  function sideHTML(s) {
    const d = AT.insights.depth(s);
    s.scores = s.scores || {};
    if (d.score !== s.scores.depth) {
      s.scores.depth = d.score;
      AT.store.upsert(s, false);
    }
    const answered = new Set(d.rungs || []);
    const rel = AT.insights.related(s, AT.store.data.sessions);
    return (
      '<div class="card side-card"><div class="card-head"><h2>What you read</h2></div>' +
      (s.gist ? '<p class="gist">' + U.esc(s.gist) + "</p>" : "") +
      (s.source.from ? '<p class="hint">From ' + U.esc(s.source.from) + "</p>" : "") +
      (U.safeUrl(s.source.url) ? '<p class="small"><a href="' + U.esc(U.safeUrl(s.source.url)) + '" target="_blank" rel="noopener noreferrer">Open the link</a></p>' : "") +
      (s.source.text ? '<details><summary>Show the full text</summary><div class="src">' + U.esc(s.source.text) + "</div></details>" : "") +
      "</div>" +
      '<div class="card side-card"><div class="card-head"><h2>Depth</h2><span class="hint">live</span></div><div class="depth-row">' + C.ring(d.score, "Depth") +
      '<div class="ladder">' + AT.RUNGS.map((r) => '<div class="rung-row' + (answered.has(r) ? " on" : "") + '"><span class="dot"></span><b>' + r + "</b><small>" + U.esc(AT.RUNG_HELP[r]) + "</small></div>").join("") + "</div></div>" +
      '<p class="hint">' + (d.score >= 75 ? "Deep thinking. This take will hold up." : d.score >= 45 ? "Solid. A personal example or a challenge would deepen it." : "Just getting started. Answer a few more, in your own words.") + "</p></div>" +
      (rel.length ? '<div class="card side-card"><div class="card-head"><h2>Connects to</h2></div>' + rel.map((r) => '<a class="mini" href="#/s/' + encodeURIComponent(r.s.id) + '"><span>' + U.esc(r.s.take && r.s.take.stance ? U.clip(r.s.take.stance, 90) : r.s.title) + "</span></a>").join("") + "</div>" : "")
    );
  }

  function bindCommon(root, s) {
    const r = U.$("[data-retry]", root);
    if (r) r.addEventListener("click", () => { const fn = T.retry; T.err = null; T.errFor = null; if (fn) fn(); });
    const stop = U.$("[data-stop]", root);
    if (stop) stop.addEventListener("click", () => T.ctl && T.ctl.abort());
    U.$$("[data-stage]", root).forEach((b) => b.addEventListener("click", () => { s.stage = b.dataset.stage; T.err = null; AT.store.upsert(s); AT.app.render(); window.scrollTo(0, 0); }));
    U.$("[data-md]", root).addEventListener("click", () => U.download(U.slug(s.title) + ".md", ui.markdown(s), "text/markdown"));
    U.$("[data-del]", root).addEventListener("click", async () => {
      if (await ui.confirm("Delete this afterthought?", "It will be removed from this device. This can't be undone.", "Delete", true)) {
        AT.store.remove(s.id);
        U.toast("Deleted.");
        location.hash = "#/library";
      }
    });
  }

  /* ---------- Unpack ---------- */
  function unpackHTML(s) {
    const answers = s.messages.filter((m) => m.role === "me" && m.kind !== "reaction").length;
    const last = s.messages[s.messages.length - 1];
    const awaiting = last && last.role === "ai" && last.kind !== "persp";
    const busy = T.busy === s.id;
    const lastAiIdx = s.messages.map((m) => m.role === "ai" && m.kind !== "persp").lastIndexOf(true);
    let thread = s.messages.map((m, i) => {
      if (m.role === "me") return '<div class="msg me' + (m.kind === "reaction" ? " reaction" : "") + '">' + (m.kind === "reaction" ? "<small>First reaction</small>" : "") + U.esc(m.text) + "</div>";
      if (m.kind === "persp")
        return '<div class="persp"><div class="persp-head">' + ui.icon("eye") + "Through other eyes</div><div class=\"persp-grid\">" +
          m.items.map((p, k) => '<div class="persp-card"><b>' + U.esc(p.who) + "</b><p>" + U.esc(p.question) + '</p><button class="btn small" data-persp="' + i + ":" + k + '">Answer this</button></div>').join("") + "</div></div>";
      return '<div class="msg ai' + (m.kind === "push" ? " push" : "") + '"><span class="rung">' + U.esc(m.from ? m.from + " asks" : m.kind === "push" ? "Push back · " + (m.rung || "") : m.rung || "") + '</span><div class="qtext">' + U.esc(m.text) + "</div>" +
        (i === lastAiIdx && m.options && m.options.length ? '<div class="opts">' + m.options.map((o) => '<button type="button" data-opt="' + U.esc(o) + '">' + U.esc(o) + "</button>").join("") + "</div>" : "") + "</div>";
    }).join("");
    if (busy) thread += '<div class="msg ai thinking"><span class="typing"><i></i><i></i><i></i></span>' + U.esc(T.busyLabel) + "</div>";
    const canTake = answers >= 2;
    const target = (AT.DEPTHS[s.depth] || AT.DEPTHS.standard).answers;
    return (
      '<div class="thread" aria-live="polite">' + thread + '<div id="thread-end"></div></div>' +
      (errOf(s) && !busy ? ui.errorBox(errOf(s), !!T.retry) : "") +
      (busy ? '<div class="row"><button class="btn small" data-stop>Stop</button></div>' : "") +
      (!busy && (awaiting || (last && last.kind === "persp"))
        ? '<form class="composer card" id="reply">' +
          '<div class="progress-line"><span style="width:' + Math.min(100, Math.round((answers / target) * 100)) + '%"></span></div>' +
          '<label for="answer" class="hint">Answer ' + (answers + 1) + " of about " + target + ". Rough is fine, this is for you.</label>" +
          '<div class="answer-wrap"><textarea id="answer" placeholder="Type what you actually think…">' + U.esc(T.compose[s.id] || "") + '</textarea><button type="button" class="icon-btn mic" id="mic" aria-label="Speak your answer" aria-pressed="false" title="Speak your answer">' + ui.icon("mic") + "</button></div>" +
          '<div class="row"><button type="submit" class="btn primary">Send</button>' +
          '<div class="tools">' +
          '<button type="button" class="chipbtn" data-mode="push"' + (answers ? "" : " disabled") + ' title="Argue the other side">' + ui.icon("bolt") + "Push back</button>" +
          '<button type="button" class="chipbtn" data-mode="deeper"' + (answers ? "" : " disabled") + ">Go deeper</button>" +
          '<button type="button" class="chipbtn" data-mode="unsure">I\'m not sure</button>' +
          '<button type="button" class="chipbtn" data-persp-btn>' + ui.icon("eye") + "Other eyes</button></div>" +
          '<span class="spacer"></span><button type="button" class="btn' + (s.ready || answers >= target ? " primary" : "") + '" id="to-take"' + (canTake ? "" : " disabled") + ">Form my take " + ui.icon("arrow") + "</button></div>" +
          (!canTake ? '<p class="hint">Answer at least 2 questions to form your take. Ctrl/⌘ + Enter sends.</p>' : "") +
          "</form>"
        : !busy && s.messages.some((m) => m.role === "ai") && !errOf(s)
        ? '<div class="row"><button class="btn primary" data-continue>Continue</button>' + (canTake ? '<button class="btn" id="to-take">Form my take</button>' : "") + "</div>"
        : "")
    );
  }

  function bindUnpack(root, s) {
    const f = U.$("#reply", root);
    const box = U.$("#answer", root);
    if (box) {
      box.addEventListener("input", () => (T.compose[s.id] = box.value));
      box.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          f.requestSubmit();
        }
      });
      ui.attachMic(U.$("#mic", root), box);
      if (!("ontouchstart" in window)) setTimeout(() => box.focus({ preventScroll: true }), 50);
    }
    if (f)
      f.addEventListener("submit", (e) => {
        e.preventDefault();
        const v = (box.value || "").trim();
        if (!v) return box.focus();
        s.messages.push({ role: "me", text: v, at: Date.now() });
        T.compose[s.id] = "";
        track(s);
        AT.store.upsert(s);
        ask(s, "next");
      });
    U.$$("[data-opt]", root).forEach((b) => b.addEventListener("click", () => {
      box.value = b.dataset.opt + ", because ";
      T.compose[s.id] = box.value;
      box.focus();
      box.setSelectionRange(box.value.length, box.value.length);
    }));
    U.$$("[data-mode]", root).forEach((b) => b.addEventListener("click", () => ask(s, b.dataset.mode)));
    const pb = U.$("[data-persp-btn]", root);
    if (pb)
      pb.addEventListener("click", () =>
        run(s, "Finding other perspectives", async (signal) => {
          const items = await AT.engine.perspectives(s, signal);
          s.messages.push({ role: "ai", kind: "persp", text: items.map((p) => p.who + ": " + p.question).join(" | "), items, at: Date.now() });
          AT.store.upsert(s);
        })
      );
    U.$$("[data-persp]", root).forEach((b) => b.addEventListener("click", () => {
      const [i, k] = b.dataset.persp.split(":").map(Number);
      const p = s.messages[i].items[k];
      s.messages.push({ role: "ai", kind: "q", text: p.question, rung: "Evaluate", from: p.who, at: Date.now() });
      AT.store.upsert(s);
      AT.app.render();
      const end = U.$("#thread-end");
      if (end) end.scrollIntoView({ block: "end" });
    }));
    const c = U.$("[data-continue]", root);
    if (c) c.addEventListener("click", () => ask(s, "next"));
    const tt = U.$("#to-take", root);
    if (tt)
      tt.addEventListener("click", async () => {
        if (s.take && s.take.stance && !(await ui.confirm("Replace your current take?", "You already have a take: \u201c" + U.clip(s.take.stance, 120) + "\u201d. Forming it again from your answers will replace it. Your current version is kept in history.", "Replace it"))) {
          s.stage = "take";
          AT.store.upsert(s);
          return AT.app.render();
        }
        run(s, "Forming your take from your answers", async (signal) => {
          const pending = (T.compose[s.id] || "").trim();
          if (pending) {
            s.messages.push({ role: "me", text: pending, at: Date.now() });
            T.compose[s.id] = "";
          }
          const t = await AT.engine.take(s, signal);
          if (!t.stance) throw new Error("Couldn't find a clear view in your answers yet. Answer one more question.");
          if (s.take && s.take.stance) s.takeHistory = [{ at: Date.now(), stance: s.take.stance, points: s.take.points || [] }].concat(s.takeHistory || []).slice(0, 5);
          s.take = Object.assign({ confidence: (s.take && s.take.confidence) || 3 }, t);
          s.stage = "take";
          s.status = "take";
          delete T.clarity[s.id];
          track(s);
          AT.store.upsert(s);
          setTimeout(() => window.scrollTo(0, 0), 0);
        });
      });
  }

  /* ---------- Take ---------- */
  const CONF = ["Just a hunch", "Leaning this way", "Fairly sure", "Confident", "Would bet on it"];
  function takeHTML(s) {
    const t = s.take;
    const cl = T.clarity[s.id] || (s.clarity && s.clarity.stance === s.take.stance ? s.clarity.result : null);
    const busy = T.busy === s.id;
    return (
      '<div class="card take-card stack">' +
      '<div class="eyebrow accent">My take</div>' +
      '<label for="stance" class="hint">Built only from your answers. Edit until it says exactly what you believe.</label>' +
      '<textarea id="stance" class="stance" rows="3">' + U.esc(t.stance) + "</textarea>" +
      '<div><div class="label">Why I think this</div><div class="points" id="points">' +
      (t.points || []).map((p, i) => '<div class="point-row"><span class="pnum">' + (i + 1) + '</span><textarea data-pt="' + i + '" rows="2" aria-label="Reason ' + (i + 1) + '">' + U.esc(p) + '</textarea><button class="icon-btn" type="button" data-rmpt="' + i + '" aria-label="Remove reason ' + (i + 1) + '">' + ui.icon("x") + "</button></div>").join("") +
      '</div><button class="btn ghost small" type="button" id="addpt">+ Add a reason</button></div>' +
      '<div class="conf"><label for="conf">How sure are you? <b id="conf-lab">' + CONF[(t.confidence || 3) - 1] + '</b></label><input type="range" id="conf" min="1" max="5" step="1" value="' + (t.confidence || 3) + '"></div>' +
      '<div><label for="tags">Tags <span class="muted">(comma separated)</span></label><input type="text" id="tags" value="' + U.esc((s.tags || []).join(", ")) + '"></div>' +
      "</div>" +
      '<div class="card stack clarity"><div class="card-head"><h2>Clarity check</h2><span class="hint">Is it specific? Arguable? Any blind spots?</span></div>' +
      (busy && T.busyLabel.startsWith("Checking") ? '<p class="hint shimmer">Checking your take…</p>' : cl ? clarityHTML(cl) : '<p class="hint">A take nobody could disagree with says nothing. Run a check before you post.</p>') +
      '<div class="row"><button class="btn" id="check"' + (busy ? " disabled" : "") + ">" + ui.icon("spark") + (cl ? "Check again" : "Check my take") + "</button></div></div>" +
      (errOf(s) && !busy ? ui.errorBox(errOf(s), !!T.retry) : "") +
      '<div class="row sticky-actions"><button class="btn primary lg" id="confirm-take"' + (busy ? " disabled" : "") + ">This is my take " + ui.icon("arrow") + "</button>" +
      '<button class="btn" id="park">Park it for later</button><button class="btn ghost" id="share-img">' + ui.icon("img") + "Share as image</button>" +
      '<span class="spacer"></span><button class="btn ghost" id="back-unpack">' + ui.icon("back") + "Back to questions</button></div>"
    );
  }
  function clarityHTML(cl) {
    return (
      '<div class="clarity-top">' + C.ring(cl.score * 10, "Clarity") + '<div><b class="big-num">' + cl.score + '<small>/10</small></b><p>' + U.esc(cl.verdict) + "</p></div></div>" +
      (cl.flags.length ? '<ul class="flags">' + cl.flags.map((f) => "<li><b>" + U.esc(f.type) + "</b> " + U.esc(f.note) + "</li>").join("") + "</ul>" : "") +
      (cl.sharpen && cl.sharpen.length ? '<div class="label">Questions that would sharpen it</div><div class="sharpen">' + cl.sharpen.map((q, i) => '<button class="sharp" data-sharp="' + i + '">' + U.esc(q) + " <span>Answer →</span></button>").join("") + "</div>" : "")
    );
  }
  function bindTake(root, s) {
    const save = U.debounce(() => AT.store.upsert(s), 400);
    U.$("#stance", root).addEventListener("input", (e) => { s.take.stance = e.target.value; save(); });
    U.$$("[data-pt]", root).forEach((el) => el.addEventListener("input", () => { s.take.points[+el.dataset.pt] = el.value; save(); }));
    U.$$("[data-rmpt]", root).forEach((b) => b.addEventListener("click", () => { s.take.points.splice(+b.dataset.rmpt, 1); AT.store.upsert(s); AT.app.render(); }));
    U.$("#addpt", root).addEventListener("click", () => { s.take.points.push(""); AT.store.upsert(s); AT.app.render(); const all = U.$$("[data-pt]"); all[all.length - 1].focus(); });
    U.$("#conf", root).addEventListener("input", (e) => { s.take.confidence = +e.target.value; U.$("#conf-lab").textContent = CONF[s.take.confidence - 1]; save(); });
    U.$("#tags", root).addEventListener("input", (e) => { s.tags = e.target.value.split(",").map((x) => x.trim().toLowerCase().replace(/^#/, "")).filter(Boolean).slice(0, 6); save(); });
    U.$("#check", root).addEventListener("click", () =>
      run(s, "Checking your take", async (signal) => {
        s.take.stance = U.$("#stance").value.trim();
        T.clarity[s.id] = await AT.engine.clarity(s, signal);
        s.clarity = { stance: s.take.stance, result: T.clarity[s.id] };
        AT.store.upsert(s);
      })
    );
    U.$$("[data-sharp]", root).forEach((b) => b.addEventListener("click", () => {
      const q = (T.clarity[s.id] || (s.clarity && s.clarity.result) || { sharpen: [] }).sharpen[+b.dataset.sharp];
      s.messages.push({ role: "ai", kind: "q", text: q, rung: "Evaluate", from: "Clarity check", at: Date.now() });
      s.stage = "unpack";
      AT.store.upsert(s);
      AT.app.render();
    }));
    U.$("#confirm-take", root).addEventListener("click", () => {
      s.take.stance = U.$("#stance").value.trim();
      s.take.points = (s.take.points || []).map((p) => String(p).trim()).filter(Boolean);
      if (!s.take.stance) {
        U.toast("Write your take in one sentence first.");
        return U.$("#stance").focus();
      }
      s.stage = "express";
      if (s.status === "thinking" || s.status === "parked") s.status = "take";
      track(s);
      AT.store.upsert(s);
      AT.app.render();
      window.scrollTo(0, 0);
    });
    U.$("#park", root).addEventListener("click", () => { s.status = "parked"; AT.store.upsert(s); U.toast("Parked. It'll wait on your dashboard."); location.hash = "#/"; });
    U.$("#share-img", root).addEventListener("click", () => { s.take.stance = U.$("#stance").value.trim(); ui.showQuoteCard(s); });
    U.$("#back-unpack", root).addEventListener("click", () => { s.stage = "unpack"; AT.store.upsert(s); AT.app.render(); });
  }

  /* ---------- Express ---------- */
  function opts(s) {
    if (!T.opt[s.id]) {
      const d = s.drafts && s.drafts[0];
      T.opt[s.id] = { format: d ? d.format : "linkedin", length: d ? d.length : "short", tone: d ? d.tone || "voice" : "voice", hook: "", version: 0, preview: "auto" };
    }
    return T.opt[s.id];
  }

  function previewHTML(s, o, body) {
    const p = AT.store.data.profile || {};
    const mode = o.preview === "auto" ? (o.format === "linkedin" ? "linkedin" : o.format === "thread" ? "thread" : o.format === "carousel" ? "carousel" : "marks") : o.preview;
    const tabs = '<div class="seg small" role="tablist">' + [["marks", "My words"], ["linkedin", "LinkedIn"], ["thread", "Thread"], ["carousel", "Slides"]].map(([k, n]) => '<button type="button" data-prev="' + k + '" aria-selected="' + (mode === k) + '">' + n + "</button>").join("") + "</div>";
    let inner = "";
    if (mode === "linkedin") {
      const cut = body.length > 210 ? body.slice(0, 210).replace(/\s+\S*$/, "") : body;
      inner = '<div class="li-card"><div class="li-head"><span class="li-av">' + U.esc((p.name || "You").trim()[0] || "Y") + "</span><div><b>" + U.esc(p.name || "You") + "</b><small>" + U.esc(p.headline || "Add your headline in My voice") + " · now</small></div></div>" +
        '<div class="li-body" id="li-body">' + U.esc(cut) + (body.length > 210 ? '<button class="linkish" id="li-more">…see more</button>' : "") + "</div>" +
        '<div class="li-foot"><span>Like</span><span>Comment</span><span>Repost</span><span>Send</span></div></div><p class="hint">LinkedIn shows about the first 210 characters before “see more”. Make them count.</p>';
    } else if (mode === "thread") {
      const posts = body.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean);
      inner = '<div class="thread-prev">' + posts.map((t) => '<div class="tp' + (t.length > 280 ? " over" : "") + '"><p>' + U.esc(t) + "</p><small>" + t.length + "/280</small></div>").join("") + "</div>";
    } else if (mode === "carousel") {
      const slides = body.split(/\n\s*(?=Slide\s*\d+\s*:)/i).map((x) => x.replace(/^Slide\s*\d+\s*:\s*/i, "").trim()).filter(Boolean);
      inner = '<div class="slides">' + slides.map((t, i) => { const [h, ...rest] = t.split("\n"); return '<div class="slide"><span class="sn">' + (i + 1) + "/" + slides.length + "</span><b>" + U.esc(h) + "</b><p>" + U.esc(rest.join(" ")) + "</p></div>"; }).join("") + "</div>";
    } else {
      inner = '<div class="preview" id="preview"></div><p class="hint"><mark>Highlighted</mark> words came from your own answers. <span class="ph">[Brackets]</span> are gaps only you can fill.</p>';
    }
    return tabs + '<div class="prev-wrap">' + inner + "</div>";
  }

  function expressHTML(s) {
    const o = opts(s);
    const busy = T.busy === s.id;
    const d = s.drafts && s.drafts[o.version];
    const body = d ? d.body : "";
    const hooks = T.hooks[s.id];
    const fmt = (k) => '<button type="button" data-fmt="' + k + '" aria-pressed="' + (o.format === k) + '">' + AT.FORMATS[k].name + "</button>";
    return (
      '<div class="card take-mini-card"><div class="eyebrow accent">My take</div><p class="take-mini">' + U.esc(s.take.stance) + '</p><button class="linkish small" data-stage="take">Edit take</button></div>' +
      '<div class="card stack">' +
      '<div><div class="label">Format</div><div class="seg wrap">' + Object.keys(AT.FORMATS).map(fmt).join("") + "</div></div>" +
      '<div class="row gap-lg"><div><div class="label">Length</div><div class="seg"><button type="button" data-len="short" aria-pressed="' + (o.length === "short") + '">Short <small>' + AT.FORMATS[o.format].short + '</small></button><button type="button" data-len="long" aria-pressed="' + (o.length === "long") + '">Longer <small>' + AT.FORMATS[o.format].long + "</small></button></div></div>" +
      '<div><div class="label">Tone</div><div class="seg">' + Object.entries(AT.TONES).map(([k, n]) => '<button type="button" data-tone="' + k + '" aria-pressed="' + (o.tone === k) + '">' + n + "</button>").join("") + "</div></div></div>" +
      '<details class="hooklab"' + (hooks ? " open" : "") + "><summary>" + ui.icon("bolt") + "Hook lab <span class=\"hint\">try 5 opening lines</span></summary>" +
      (hooks ? '<div class="hooks">' + hooks.map((h, i) => '<label class="hook"><input type="radio" name="hook" value="' + i + '"' + (o.hook === h.line ? " checked" : "") + "><span><small>" + U.esc(h.style) + "</small>" + U.esc(h.line) + "</span></label>").join("") + '<label class="hook"><input type="radio" name="hook" value="-1"' + (!o.hook ? " checked" : "") + "><span><small>Let it choose</small>No fixed opening</span></label></div>" : "") +
      '<button class="btn small" id="get-hooks"' + (busy ? " disabled" : "") + ">" + (hooks ? "New hooks" : "Find hooks") + "</button></details>" +
      '<div class="row"><button class="btn primary lg" id="draft-btn"' + (busy ? " disabled" : "") + ">" + ui.icon("spark") + (body ? "Redraft" : "Draft it in my voice") + "</button>" +
      (busy ? '<button class="btn small" data-stop>Stop</button><span class="hint shimmer">' + U.esc(T.busyLabel) + "…</span>" : '<span class="hint">' + (AT.store.data.voice ? "Using your voice profile." : 'No voice profile yet. <a href="#/voice">Set one up</a> so drafts sound like you.') + "</span>") +
      "</div>" + (errOf(s) && !busy ? ui.errorBox(errOf(s), !!T.retry) : "") +
      (s.drafts && s.drafts.length > 1 ? '<div class="row"><label for="ver" class="label" style="margin:0">Version</label><select id="ver">' + s.drafts.map((x, i) => '<option value="' + i + '"' + (i === o.version ? " selected" : "") + ">" + (i === 0 ? "Latest · " : "") + (AT.FORMATS[x.format] || {}).name + " · " + U.relTime(x.at) + "</option>").join("") + "</select></div>" : "") +
      '<div><label for="draft" class="label">Draft <span class="muted">(edit freely, it saves as you type)</span></label><textarea id="draft" class="draft" placeholder="Your draft appears here.">' + U.esc(body) + "</textarea></div>" +
      (body
        ? '<div class="analysis" id="analysis"></div>' +
          '<div class="preview-block">' + previewHTML(s, o, body) + "</div>" +
          '<div class="row actions"><button class="btn primary" id="copy">' + ui.icon("copy") + "Copy</button>" +
          '<button class="btn" id="share-img">' + ui.icon("img") + "Quote image</button>" +
          '<button class="btn" id="dl-md">' + ui.icon("dl") + "Markdown</button>" +
          '<a class="btn ghost" href="https://www.linkedin.com/feed/" target="_blank" rel="noopener">Open LinkedIn</a>' +
          (o.format === "note" ? '<a class="btn ghost" target="_blank" rel="noopener" href="https://x.com/intent/post?text=' + encodeURIComponent(body.slice(0, 280)) + '">Post on X</a>' : "") +
          '<span class="spacer"></span>' + (s.status === "posted" ? '<span class="pill good">Posted ' + U.esc(s.posted && s.posted.at ? U.relTime(s.posted.at) : "") + "</span>" : '<button class="btn" id="posted">I posted it</button>') + "</div>"
        : "") +
      "</div>"
    );
  }

  function analysisHTML(s, body) {
    const a = AT.insights.originality(body, AT.userWords(s));
    const rd = AT.insights.readability(body);
    s.scores = s.scores || {};
    if (s.scores.originality !== a.pct) {
      s.scores.originality = a.pct;
    }
    const verdict = a.pct >= 35 ? "Strongly yours" : a.pct >= 15 ? "A mix" : "Mostly new phrasing";
    const flags = [];
    if (a.placeholders.length) flags.push("Fill " + a.placeholders.length + " gap" + (a.placeholders.length > 1 ? "s" : "") + ": " + a.placeholders.slice(0, 3).join(", "));
    if (a.cliches.length) flags.push("Sounds generic: " + a.cliches.map((c) => "“" + c + "”").join(", "));
    if (a.emDashes > 1) flags.push(a.emDashes + " em dashes. Readers now read them as AI writing.");
    return (
      '<div class="an-tile">' + C.ring(a.pct, "Originality") + '<div><b>Originality</b><small>' + verdict + "</small></div></div>" +
      '<div class="an-tile"><b class="big-num">' + (rd ? rd.score : "–") + "</b><div><b>Readability</b><small>" + (rd ? rd.label + " · " + rd.avgSentence + " words/sentence" : "Too short to score") + "</small></div></div>" +
      '<div class="an-tile"><b class="big-num">' + a.words + "</b><div><b>Words</b><small>" + a.chars + " characters</small></div></div>" +
      (flags.length ? '<ul class="flags wide">' + flags.map((f) => "<li>" + U.esc(f) + "</li>").join("") + "</ul>" : '<p class="ok-line">No stock phrases or gaps found.</p>')
    );
  }

  function bindExpress(root, s) {
    const o = opts(s);
    const box = U.$("#draft", root);
    const refreshAnalysis = () => {
      const an = U.$("#analysis", root);
      if (an) an.innerHTML = analysisHTML(s, box.value);
      const pv = U.$("#preview", root);
      if (pv) pv.innerHTML = AT.insights.originality(box.value, AT.userWords(s)).html;
    };
    refreshAnalysis();
    const save = U.debounce(() => AT.store.upsert(s), 500);
    box.addEventListener("input", () => {
      if (!s.drafts.length) s.drafts.unshift({ id: U.uid("d"), format: o.format, length: o.length, tone: o.tone, body: "", at: Date.now() });
      s.drafts[o.version].body = box.value;
      refreshAnalysis();
      save();
    });
    const rerender = () => {
      const keep = box.value;
      AT.app.render();
      const nb = U.$("#draft");
      if (nb && nb.value !== keep) nb.value = keep;
    };
    U.$$("[data-fmt]", root).forEach((b) => b.addEventListener("click", () => { o.format = b.dataset.fmt; o.preview = "auto"; T.hooks[s.id] = null; o.hook = ""; rerender(); }));
    U.$$("[data-len]", root).forEach((b) => b.addEventListener("click", () => { o.length = b.dataset.len; rerender(); }));
    U.$$("[data-tone]", root).forEach((b) => b.addEventListener("click", () => { o.tone = b.dataset.tone; rerender(); }));
    U.$$("[data-prev]", root).forEach((b) => b.addEventListener("click", () => { o.preview = b.dataset.prev; rerender(); }));
    U.$$('input[name="hook"]', root).forEach((r) => r.addEventListener("change", () => { o.hook = r.value === "-1" ? "" : T.hooks[s.id][+r.value].line; }));
    const ver = U.$("#ver", root);
    if (ver) ver.addEventListener("change", () => { o.version = +ver.value; AT.app.render(); });
    U.$("#get-hooks", root).addEventListener("click", () =>
      run(s, "Writing hooks", async (signal) => {
        T.hooks[s.id] = await AT.engine.hooks(s, o, signal);
      })
    );
    U.$("#draft-btn", root).addEventListener("click", () =>
      run(s, "Writing from your answers", async (signal) => {
        const text = await AT.engine.draft(s, o, signal);
        s.drafts = [{ id: U.uid("d"), format: o.format, length: o.length, tone: o.tone, hook: o.hook, body: text, at: Date.now() }].concat(s.drafts || []).slice(0, 8);
        o.version = 0;
        if (s.status !== "posted") s.status = "drafted";
        s.scores = s.scores || {};
        s.scores.originality = AT.insights.originality(text, AT.userWords(s)).pct;
        track(s);
        AT.store.upsert(s);
      })
    );
    const more = U.$("#li-more", root);
    if (more) more.addEventListener("click", () => { U.$("#li-body").textContent = box.value; });
    const cp = U.$("#copy", root);
    if (cp) cp.addEventListener("click", async () => { (await U.copy(box.value)) ? U.toast("Copied. Paste it wherever you post.") : U.toast("Couldn't copy. Select the text and copy it manually."); AT.store.upsert(s); });
    const si = U.$("#share-img", root);
    if (si) si.addEventListener("click", () => ui.showQuoteCard(s));
    const md = U.$("#dl-md", root);
    if (md) md.addEventListener("click", () => U.download(U.slug(s.title) + ".md", ui.markdown(s), "text/markdown"));
    const po = U.$("#posted", root);
    if (po)
      po.addEventListener("click", () =>
        ui.modal({
          title: "Nice. Where did you post it?",
          body: '<label for="post-url">Link to the post <span class="muted">(optional)</span></label><input type="url" id="post-url" placeholder="https://www.linkedin.com/posts/…"><p class="hint">Saved on your dashboard so you can see what you\'ve put out into the world.</p>',
          actions: [
            { label: "Cancel", kind: "ghost" },
            {
              label: "Mark as posted",
              kind: "primary",
              onClick: (w) => {
                s.status = "posted";
                s.posted = { at: Date.now(), url: (U.$("#post-url", w).value || "").trim() };
                track(s);
                AT.store.upsert(s);
                U.toast("Posted. That's one more idea out in the world.", "good");
                AT.app.render();
              },
            },
          ],
        })
      );
  }
})(window.AT);
