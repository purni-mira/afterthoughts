/* Afterthoughts — Thought Library */
(function (AT) {
  "use strict";
  const U = AT.u, ui = AT.ui;
  AT.views = AT.views || {};
  const L = { q: "", status: "all", sort: "recent", tag: "" };

  function filtered() {
    const q = L.q.trim().toLowerCase();
    let list = AT.store.data.sessions.filter((s) => {
      if (L.status !== "all" && s.status !== L.status) return false;
      if (L.tag && !(s.tags || []).includes(L.tag)) return false;
      if (!q) return true;
      const hay = [s.title, s.gist, s.take && s.take.stance, (s.take && s.take.points || []).join(" "), (s.tags || []).join(" "), AT.userWords(s)].join(" ").toLowerCase();
      return q.split(/\s+/).every((w) => hay.includes(w));
    });
    if (L.sort === "depth") list = list.slice().sort((a, b) => ((b.scores || {}).depth || 0) - ((a.scores || {}).depth || 0));
    if (L.sort === "orig") list = list.slice().sort((a, b) => ((b.scores || {}).originality || -1) - ((a.scores || {}).originality || -1));
    if (L.sort === "oldest") list = list.slice().sort((a, b) => a.createdAt - b.createdAt);
    return list;
  }

  AT.views.library = {
    title: "Library",
    render(root, params) {
      if (params && params.q != null) L.q = params.q;
      const all = AT.store.data.sessions;
      const counts = { all: all.length };
      Object.keys(AT.STATUS).forEach((k) => (counts[k] = all.filter((s) => s.status === k).length));
      const tags = {};
      all.forEach((s) => (s.tags || []).forEach((t) => (tags[t] = (tags[t] || 0) + 1)));
      const topTags = Object.entries(tags).sort((a, b) => b[1] - a[1]).slice(0, 10).map((e) => e[0]);
      const chip = (k, n) => '<button type="button" data-status="' + k + '" aria-pressed="' + (L.status === k) + '">' + n + " <small>" + (counts[k] || 0) + "</small></button>";
      root.innerHTML =
        '<header class="page-head"><div><div class="eyebrow">Thought Library</div><h1 class="display">Everything you\'ve thought through.</h1></div>' +
        '<div class="row nowrap"><button class="btn" id="export-md"' + (all.length ? "" : " disabled") + ">" + ui.icon("dl") + "Export all</button>" + '<a class="btn primary" href="#/new">' + ui.icon("plus") + "New</a></div></header>" +
        (all.some((s) => s.sample) ? '<div class="note">Includes sample data. <button class="linkish" id="clear-samples">Clear samples</button></div>' : "") +
        '<div class="card stack lib-tools">' +
        '<div class="row nowrap"><input type="search" id="lib-q" placeholder="Search takes, answers, topics…" value="' + U.esc(L.q) + '" aria-label="Search your library">' +
        '<select id="lib-sort" aria-label="Sort"><option value="recent">Recent</option><option value="oldest">Oldest</option><option value="depth">Deepest</option><option value="orig">Most original</option></select></div>' +
        '<div class="seg wrap">' + chip("all", "All") + Object.entries(AT.STATUS).map(([k, v]) => chip(k, v.label)).join("") + "</div>" +
        (topTags.length ? '<div class="chips">' + topTags.map((t) => '<button class="chip' + (L.tag === t ? " on" : "") + '" data-tag="' + U.esc(t) + '">#' + U.esc(t) + "</button>").join("") + "</div>" : "") +
        "</div>" +
        '<div id="lib-list" class="lib-grid"></div>';
      U.$("#lib-sort", root).value = L.sort;
      const draw = () => {
        const list = filtered();
        U.$("#lib-list", root).innerHTML = list.length
          ? list.map((s) => ui.sessionCard(s)).join("")
          : '<div class="empty card">' + (all.length ? "Nothing matches. Try another word or filter." : 'Your library is empty. <a href="#/new">Start your first afterthought</a> or load sample data from the dashboard.') + "</div>";
      };
      draw();
      U.$("#lib-q", root).addEventListener("input", U.debounce((e) => { L.q = e.target.value; draw(); }, 120));
      U.$("#lib-sort", root).addEventListener("change", (e) => { L.sort = e.target.value; draw(); });
      U.$$("[data-status]", root).forEach((b) => b.addEventListener("click", () => { L.status = b.dataset.status; AT.views.library.render(root); }));
      U.$$("[data-tag]", root).forEach((b) => b.addEventListener("click", () => { L.tag = L.tag === b.dataset.tag ? "" : b.dataset.tag; AT.views.library.render(root); }));
      const cs = U.$("#clear-samples", root);
      if (cs) cs.addEventListener("click", () => { AT.store.clearSamples(); U.toast("Samples cleared."); AT.views.library.render(root); });
      U.$("#export-md", root).addEventListener("click", () => {
        const md = filtered().map((s) => ui.markdown(s)).join("\n\n---\n\n");
        U.download("afterthoughts-" + U.dayKey(Date.now()) + ".md", md, "text/markdown");
      });
    },
  };
})(window.AT);
