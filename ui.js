/* Afterthoughts — shared UI pieces: modal, confirm, cards, pills, speech input, quote-card image. */
(function (AT) {
  "use strict";
  const U = AT.u;
  const ui = (AT.ui = {});

  ui.pill = (status) => {
    const st = AT.STATUS[status] || AT.STATUS.thinking;
    return '<span class="pill ' + st.tone + '">' + U.esc(st.label) + "</span>";
  };

  ui.icon = (name) => {
    const P = {
      home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
      plus: '<path d="M12 5v14M5 12h14"/>',
      lib: '<path d="M4 4h4v16H4zM10 4h4v16h-4zM16.5 4.5l3.8 1-3.9 15-3.8-1z"/>',
      voice: '<path d="M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM5 11a7 7 0 0 0 14 0M12 18v3"/>',
      gear: '<path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
      mic: '<path d="M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM5 11a7 7 0 0 0 14 0M12 18v3"/>',
      copy: '<path d="M9 9h10v12H9z"/><path d="M5 15H4V3h12v1"/>',
      dl: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
      img: '<path d="M3 5h18v14H3z"/><path d="m3 16 5-5 4 4 3-3 6 6"/><circle cx="16" cy="9" r="1.5"/>',
      trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
      bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
      arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
      back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
      spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
      eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
      flame: '<path d="M12 22c4 0 7-2.7 7-6.8 0-3.6-2.4-5.6-4-8.2-.6 2.2-1.7 3.4-3 4 .3-3.5-1.3-6.8-4-9 .3 3.6-3 6.4-3 11.2C5 19.3 8 22 12 22z"/>',
      x: '<path d="M6 6l12 12M18 6 6 18"/>',
    };
    return '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">' + (P[name] || "") + "</svg>";
  };

  /* Modal */
  ui.modal = function ({ title, body, actions = [], wide = false, onOpen }) {
    const root = document.getElementById("modal-root");
    const prevFocus = document.activeElement;
    const wrap = document.createElement("div");
    wrap.className = "modal-wrap";
    wrap.innerHTML =
      '<div class="modal' + (wide ? " wide" : "") + '" role="dialog" aria-modal="true" aria-labelledby="modal-title">' +
      '<div class="modal-head"><h2 id="modal-title">' + U.esc(title) + '</h2><button class="icon-btn" data-close aria-label="Close">' + ui.icon("x") + "</button></div>" +
      '<div class="modal-body">' + body + "</div>" +
      (actions.length ? '<div class="modal-foot">' + actions.map((a, i) => '<button class="btn ' + (a.kind || "") + '" data-act="' + i + '">' + U.esc(a.label) + "</button>").join("") + "</div>" : "") +
      "</div>";
    root.appendChild(wrap);
    const close = () => {
      wrap.remove();
      document.removeEventListener("keydown", onKey);
      if (prevFocus && prevFocus.focus) prevFocus.focus();
    };
    const onKey = (e) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    wrap.addEventListener("click", (e) => {
      if (e.target === wrap || e.target.closest("[data-close]")) close();
    });
    U.$$("[data-act]", wrap).forEach((b) =>
      b.addEventListener("click", () => {
        const a = actions[+b.dataset.act];
        const keep = a.onClick && a.onClick(wrap) === false;
        if (!keep) close();
      })
    );
    setTimeout(() => {
      const f = wrap.querySelector("input, textarea, [data-act]");
      if (f) f.focus();
    }, 30);
    if (onOpen) onOpen(wrap, close);
    return close;
  };
  ui.confirm = (title, text, okLabel = "Confirm", danger = false) =>
    new Promise((res) => {
      let done = false;
      ui.modal({
        title,
        body: "<p>" + U.esc(text) + "</p>",
        actions: [
          { label: "Cancel", kind: "ghost", onClick: () => { done = true; res(false); } },
          { label: okLabel, kind: danger ? "danger solid" : "primary", onClick: () => { done = true; res(true); } },
        ],
        onOpen: (wrap) => {
          const obs = new MutationObserver(() => {
            if (!document.body.contains(wrap)) {
              obs.disconnect();
              if (!done) res(false);
            }
          });
          obs.observe(document.getElementById("modal-root"), { childList: true });
        },
      });
    });

  ui.errorBox = (msg, hasRetry) =>
    '<div class="errbox" role="alert"><span>' + U.esc(msg) + "</span>" + (hasRetry ? '<button class="btn small" data-retry>Try again</button>' : "") +
    (AT.ai.provider() !== "demo" ? ' <a href="#/settings" class="small">AI settings</a>' : "") + "</div>";

  ui.sessionCard = (s, opts = {}) => {
    const q = s.take && s.take.stance ? s.take.stance : s.gist;
    const answers = (s.messages || []).filter((m) => m.role === "me").length;
    const lens = AT.LENSES[s.lens];
    return (
      '<a class="scard" href="#/s/' + encodeURIComponent(s.id) + '">' +
      '<div class="scard-top"><span class="scard-title">' + U.esc(s.title || "Untitled thought") + "</span>" + ui.pill(s.status) + "</div>" +
      (q ? '<div class="scard-q">' + U.esc(U.clip(q, opts.full ? 400 : 180)) + "</div>" : "") +
      '<div class="scard-meta"><span>' + U.esc(U.relTime(s.updatedAt || s.createdAt)) + "</span>" +
      (answers ? "<span>" + answers + " answer" + (answers > 1 ? "s" : "") + "</span>" : "") +
      (lens && s.lens !== "balanced" ? "<span>" + U.esc(lens.name) + "</span>" : "") +
      (s.scores && s.scores.depth ? "<span>Depth " + s.scores.depth + "</span>" : "") +
      (s.sample ? '<span class="tag">sample</span>' : "") +
      ((s.tags || []).slice(0, 2).map((t) => '<span class="tag">#' + U.esc(t) + "</span>").join("")) +
      "</div></a>"
    );
  };

  /* Speech to text for answers (Chrome, Edge, Safari) */
  ui.speechSupported = () => !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  ui.attachMic = function (btn, textarea) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR || !btn) {
      if (btn) btn.hidden = true;
      return;
    }
    let rec = null, base = "";
    btn.addEventListener("click", () => {
      if (rec) {
        rec.stop();
        return;
      }
      try {
        rec = new SR();
      } catch (e) {
        U.toast("Voice input isn't available in this browser.");
        return;
      }
      rec.lang = AT.store.settings.speechLang || "en-IN";
      rec.interimResults = true;
      rec.continuous = true;
      base = textarea.value ? textarea.value.replace(/\s*$/, " ") : "";
      rec.onresult = (e) => {
        let txt = "";
        for (let i = 0; i < e.results.length; i++) txt += e.results[i][0].transcript;
        textarea.value = base + txt;
        textarea.dispatchEvent(new Event("input"));
      };
      rec.onerror = (e) => {
        if (e.error === "not-allowed" || e.error === "service-not-allowed") U.toast("Microphone access was blocked. Allow it in your browser to speak answers.");
      };
      rec.onend = () => {
        rec = null;
        btn.classList.remove("live");
        btn.setAttribute("aria-pressed", "false");
      };
      try {
        rec.start();
        btn.classList.add("live");
        btn.setAttribute("aria-pressed", "true");
        U.toast("Listening… tap the mic again to stop.");
      } catch (e) {
        rec = null;
      }
    });
  };

  /* Quote card image of a take (1080x1350, LinkedIn/Instagram portrait) */
  ui.quoteCard = async function (s) {
    const W = 1080, H = 1350;
    const cv = document.createElement("canvas");
    cv.width = W;
    cv.height = H;
    const g = cv.getContext("2d");
    try {
      await document.fonts.ready;
    } catch (e) {}
    const dark = document.documentElement.classList.contains("is-dark");
    const bg = dark ? "#111316" : "#F1F2EE", ink = dark ? "#ECEDEA" : "#16191E", accent = dark ? "#8299FF" : "#2340C4", muted = dark ? "#A1A7AE" : "#5B6169";
    g.fillStyle = bg;
    g.fillRect(0, 0, W, H);
    g.fillStyle = accent;
    g.fillRect(90, 150, 12, 120);
    g.font = "italic 300px 'Instrument Serif', Georgia, serif";
    g.globalAlpha = 0.14;
    g.fillText("“", 80, 420);
    g.globalAlpha = 1;
    const text = s.take.stance;
    let size = 84;
    const wrap = (sz) => {
      g.font = sz + "px 'Instrument Serif', Georgia, serif";
      const words = text.split(/\s+/), lines = [];
      let line = "";
      words.forEach((w) => {
        const t = line ? line + " " + w : w;
        if (g.measureText(t).width > W - 200 && line) {
          lines.push(line);
          line = w;
        } else line = t;
      });
      if (line) lines.push(line);
      return lines;
    };
    let lines = wrap(size);
    while (lines.length * size * 1.15 > 760 && size > 44) {
      size -= 4;
      lines = wrap(size);
    }
    g.fillStyle = ink;
    g.font = size + "px 'Instrument Serif', Georgia, serif";
    const startY = 330 + Math.max(0, (760 - lines.length * size * 1.15) / 2);
    lines.forEach((l, i) => g.fillText(l, 100, startY + i * size * 1.15));
    const p = AT.store.data.profile || {};
    g.font = "600 34px Geist, 'Helvetica Neue', Arial, sans-serif";
    g.fillStyle = ink;
    g.fillText(p.name || "My take", 100, H - 190);
    g.font = "30px Geist, 'Helvetica Neue', Arial, sans-serif";
    g.fillStyle = muted;
    g.fillText(U.clip(p.headline || (s.title && s.title.length <= 40 ? s.title : ""), 48), 100, H - 140);
    // brand mark
    g.fillStyle = accent;
    [0, 1, 2].forEach((i) => {
      g.globalAlpha = i === 2 ? 0.45 : 1;
      g.beginPath();
      g.arc(W - 345 + i * 26, H - 151, 9, 0, Math.PI * 2);
      g.fill();
    });
    g.globalAlpha = 1;
    g.font = "italic 34px 'Instrument Serif', Georgia, serif";
    g.fillStyle = muted;
    g.fillText("afterthoughts", W - 268, H - 140);
    return new Promise((res) => cv.toBlob((b) => res({ blob: b, url: cv.toDataURL("image/png") }), "image/png"));
  };

  ui.showQuoteCard = async function (s) {
    if (!s.take || !s.take.stance) return U.toast("Form your take first.");
    const { blob, url } = await ui.quoteCard(s);
    ui.modal({
      title: "Your take as an image",
      body: '<img class="qc-img" src="' + url + '" alt="Quote card of your take"><p class="hint">1080 × 1350, sized for LinkedIn and Instagram. On a phone, press and hold the image to save it.</p>',
      actions: [{ label: "Download PNG", kind: "primary", onClick: () => { U.download(U.slug(s.title) + "-take.png", blob); return false; } }],
    });
  };

  ui.markdown = function (s) {
    const lines = ["# " + (s.title || "Afterthought"), "", "_" + new Date(s.createdAt).toDateString() + " · " + (AT.STATUS[s.status] || {}).label + "_", ""];
    if (s.gist) lines.push("**What I read:** " + s.gist, "");
    if (s.source && s.source.url) lines.push("Source: " + s.source.url, "");
    if (s.take && s.take.stance) {
      lines.push("## My take", "", "> " + s.take.stance, "");
      (s.take.points || []).forEach((p) => lines.push("- " + p));
      lines.push("");
    }
    const qa = s.messages.filter((m) => m.kind !== "persp");
    if (qa.length) {
      lines.push("## How I got there", "");
      qa.forEach((m) => lines.push(m.role === "ai" ? "**" + (m.rung ? m.rung + ": " : "") + m.text + "**" : m.text, ""));
    }
    if (s.drafts && s.drafts[0]) lines.push("## Draft (" + (AT.FORMATS[s.drafts[0].format] || {}).name + ")", "", s.drafts[0].body, "");
    return lines.join("\n");
  };
})(window.AT);
