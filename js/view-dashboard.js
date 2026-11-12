/* Afterthoughts — Dashboard */
(function (AT) {
  "use strict";
  const U = AT.u, ui = AT.ui, C = AT.charts;
  AT.views = AT.views || {};

  function greeting() {
    const h = new Date().getHours();
    return h < 5 ? "Up late" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  }
  function provocationIndex() {
    const d = new Date();
    const n = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
    return n % AT.PROVOCATIONS.length;
  }

  function welcome() {
    const pi = provocationIndex();
    return (
      '<section class="welcome card">' +
      '<div class="welcome-copy"><h1 class="display">Turn what you read into what you think.</h1>' +
      "<p>Afterthoughts asks you sharp questions about anything you read, helps you land on your own take, then turns it into a post that sounds like you. Your dashboard fills up as you think.</p>" +
      '<div class="row"><a class="btn primary lg" href="#/new">' + ui.icon("plus") + "Start my first afterthought</a>" +
      '<button class="btn lg" data-samples>' + ui.icon("eye") + "Explore with sample data</button></div></div>" +
      '<ol class="how">' +
      "<li><b>Capture</b>Paste an article, a post, a screenshot, or a passing thought.</li>" +
      "<li><b>Unpack</b>Answer 3 to 7 questions. Push back, go deeper, see other eyes.</li>" +
      "<li><b>Take</b>Your stance in one line, checked for clarity and bias.</li>" +
      "<li><b>Express</b>Posts, threads and carousels in your voice, with an originality meter.</li></ol>" +
      "</section>" +
      provocationCard(pi)
    );
  }

  function provocationCard(pi) {
    return (
      '<section class="card provoke"><div class="eyebrow">' + ui.icon("spark") + "Today's provocation</div>" +
      '<p class="provoke-q">' + U.esc(AT.PROVOCATIONS[pi]) + "</p>" +
      '<div class="row"><a class="btn" href="#/new?p=' + pi + '">Think about this ' + ui.icon("arrow") + '</a><button class="btn ghost small" data-next-prov>Another one</button></div></section>'
    );
  }

  function kpi(label, value, sub, extra, tone) {
    return '<div class="kpi' + (tone ? " " + tone : "") + '"><div class="kpi-lab">' + label + '</div><div class="kpi-row"><div class="kpi-val">' + value + "</div>" + (extra || "") + '</div><div class="kpi-sub">' + sub + "</div></div>";
  }

  AT.views.dashboard = {
    title: "Dashboard",
    render(root) {
      const store = AT.store;
      const sessions = store.data.sessions;
      const name = (store.data.profile.name || "").split(" ")[0];
      const head =
        '<header class="page-head"><div><div class="eyebrow">' + U.esc(new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })) + "</div>" +
        '<h1 class="display">' + greeting() + (name ? ", " + U.esc(name) : "") + ".</h1></div>" +
        '<a class="btn primary" href="#/new">' + ui.icon("plus") + "New afterthought</a></header>";
      if (!sessions.length) {
        root.innerHTML = head + welcome();
        bind(root);
        return;
      }
      const st = AT.insights.stats(sessions);
      const hasSamples = sessions.some((s) => s.sample);
      const pi = (provocationIndex() + (AT.views.dashboard._shift || 0)) % AT.PROVOCATIONS.length;
      const radarVals = AT.RUNGS.map((r) => st.rungs[r]);
      const lensItems = Object.entries(st.lenses).map(([k, v]) => ({ label: (AT.LENSES[k] || { name: k }).name, value: v })).sort((a, b) => b.value - a.value).slice(0, 5);
      const recentTakes = sessions.filter((s) => s.take && s.take.stance).slice(0, 4);
      const digest = store.data.meta && store.data.meta.digest;

      root.innerHTML =
        head +
        (hasSamples ? '<div class="note">You\'re exploring sample data. <button class="linkish" data-clear-samples>Clear samples</button> when you\'re ready to start fresh.</div>' : "") +
        '<section class="kpis">' +
        kpi("Afterthoughts", st.total, st.thisWeek + " this week", C.spark(st.days)) +
        kpi("Takes formed", st.takes, st.total ? Math.round((st.takes / st.total) * 100) + "% of sessions" : "") +
        kpi("Posted", st.posted, st.drafted + " drafted", "", "good") +
        kpi("Thinking streak", st.streak + '<small> day' + (st.streak === 1 ? "" : "s") + "</small>", "Best: " + st.bestStreak + " days", '<span class="flame' + (st.streak ? " on" : "") + '">' + ui.icon("flame") + "</span>") +
        kpi("Avg depth", st.avgDepth === null ? "–" : st.avgDepth, st.avgOriginality === null ? "Originality: no drafts yet" : "Originality " + st.avgOriginality + "%", st.avgDepth === null ? "" : C.ring(st.avgDepth, "Average depth")) +
        "</section>" +
        '<section class="grid-2">' +
        '<div class="card"><div class="card-head"><h2>Thinking activity</h2><span class="hint">' + Object.values(st.days).reduce((a, b) => a + b, 0) + " moments in 18 weeks</span></div><div class=\"scroll-x\">" + C.heatmap(st.days) + '</div><div class="legend"><span>Less</span><i class="hm0"></i><i class="hm1"></i><i class="hm2"></i><i class="hm3"></i><i class="hm4"></i><span>More</span></div></div>' +
        '<div class="card"><div class="card-head"><h2>From reading to posting</h2></div>' +
        C.funnel([{ label: "Captured", value: st.total }, { label: "Take formed", value: st.takes }, { label: "Drafted", value: st.drafted }, { label: "Posted", value: st.posted }]) +
        '<p class="hint">' + (st.takes && !st.posted ? "Your takes are waiting. Posting one is the fastest way to build a voice." : st.posted ? "Every posted take is a public record of how you think." : "Form a take to move down the funnel.") + "</p></div>" +
        "</section>" +
        '<section class="grid-2">' +
        '<div class="card"><div class="card-head"><h2>Your thinking profile</h2><span class="hint">Questions answered, by rung</span></div>' + C.radar(radarVals, AT.RUNGS) + '<p class="insight">' + U.esc(AT.insights.profileInsight(st)) + "</p></div>" +
        '<div class="card stack"><div class="card-head"><h2>Ideas waiting for you</h2></div>' +
        (st.waiting.length ? '<div class="mini-list">' + st.waiting.map((s) => '<a class="mini" href="#/s/' + encodeURIComponent(s.id) + '"><span>' + U.esc(s.title || "Untitled") + "</span>" + ui.pill(s.status) + "</a>").join("") + "</div>" : '<p class="hint">Nothing parked. Clean slate.</p>') +
        '<div class="card-head" style="margin-top:6px"><h2>Lenses you use</h2></div>' + (lensItems.length ? C.bars(lensItems) : "") +
        (st.themes.length ? '<div class="card-head" style="margin-top:6px"><h2>Themes you return to</h2></div><div class="chips">' + st.themes.map((t) => '<a class="chip" href="#/library?q=' + encodeURIComponent(t) + '">' + U.esc(t) + "</a>").join("") + "</div>" : "") +
        "</div></section>" +
        provocationCard(pi) +
        '<section class="card"><div class="card-head"><h2>Recent takes</h2><a href="#/library" class="small">Library</a></div><div class="takes">' +
        recentTakes.map((s) => '<a class="take-tile" href="#/s/' + encodeURIComponent(s.id) + '"><q>' + U.esc(s.take.stance) + "</q><span>" + U.esc(s.title || "") + " · " + U.esc(U.relTime(s.updatedAt)) + "</span></a>").join("") +
        "</div></section>" +
        '<section class="card digest"><div class="card-head"><h2>Your thinking this week</h2><span class="hint">' + (digest ? "Written " + U.esc(U.relTime(digest.at)) : AT.ai.label()) + "</span></div>" +
        '<div id="digest-body">' + (digest ? '<p class="digest-text">' + U.esc(digest.text).replace(/\n\n/g, "</p><p class=\"digest-text\">") + "</p>" : '<p class="hint">A short reflection on the themes and tensions in your recent takes.</p>') + "</div>" +
        '<div class="row"><button class="btn" data-digest>' + ui.icon("spark") + (digest ? "Rewrite reflection" : "Write my reflection") + "</button></div></section>" +
        '<section class="stat-foot"><span>' + st.wordsThought.toLocaleString() + " words of your own thinking</span>" + (st.avgConfidence ? "<span>Average confidence " + st.avgConfidence + "/5</span>" : "") + "<span>" + st.parked + " parked</span></section>";
      bind(root);
    },
  };

  function bind(root) {
    const s = U.$("[data-samples]", root);
    if (s)
      s.addEventListener("click", () => {
        AT.store.data.sessions = AT.store.data.sessions.concat(AT.makeSamples());
        AT.store.sort();
        AT.store.saveNow();
        U.toast("Sample data loaded. Clear it any time.");
        AT.app.render();
      });
    const c = U.$("[data-clear-samples]", root);
    if (c) c.addEventListener("click", () => { AT.store.clearSamples(); U.toast("Samples cleared."); AT.app.render(); });
    U.$$("[data-next-prov]", root).forEach((b) => b.addEventListener("click", () => {
      AT.views.dashboard._shift = (AT.views.dashboard._shift || 0) + 1;
      const pi = (provocationIndex() + AT.views.dashboard._shift) % AT.PROVOCATIONS.length;
      const card = b.closest(".provoke");
      U.$(".provoke-q", card).textContent = AT.PROVOCATIONS[pi];
      U.$("a.btn", card).setAttribute("href", "#/new?p=" + pi);
    }));
    const d = U.$("[data-digest]", root);
    if (d)
      d.addEventListener("click", async () => {
        d.disabled = true;
        const body = U.$("#digest-body", root);
        body.innerHTML = '<p class="hint shimmer">Reading your recent takes…</p>';
        try {
          const weekAgo = Date.now() - 7 * 86400000;
          const week = AT.store.data.sessions.filter((x) => (x.updatedAt || x.createdAt) >= weekAgo);
          const text = await AT.engine.digest(week.length ? week : AT.store.data.sessions.slice(0, 5));
          AT.store.data.meta = AT.store.data.meta || {};
          AT.store.data.meta.digest = { at: Date.now(), text };
          AT.store.persist();
          body.innerHTML = text.split(/\n\n+/).map((p) => '<p class="digest-text">' + U.esc(p) + "</p>").join("");
        } catch (e) {
          body.innerHTML = ui.errorBox(e.message || "Couldn't write the reflection.", false);
        } finally {
          d.disabled = false;
        }
      });
  }
})(window.AT);
