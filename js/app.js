/* Afterthoughts — app shell, router, theme, PWA */
(function (AT) {
  "use strict";
  const U = AT.u, ui = AT.ui;
  AT.VERSION = "2.1.0";

  const ROUTES = [
    { re: /^\/?$/, name: "dashboard", view: "dashboard", nav: "home" },
    { re: /^\/new$/, name: "capture", view: "capture", nav: "new" },
    { re: /^\/s\/(.+)$/, name: "session", view: "session", nav: "library", key: "id" },
    { re: /^\/library$/, name: "library", view: "library", nav: "library" },
    { re: /^\/voice$/, name: "voice", view: "voice", nav: "voice" },
    { re: /^\/settings$/, name: "settings", view: "settings", nav: "settings" },
  ];

  const app = (AT.app = { route: { name: "dashboard" }, installPrompt: null });

  function parse() {
    let h = location.hash.replace(/^#/, "");
    let query = {};
    const qi = h.indexOf("?");
    if (qi >= 0) {
      new URLSearchParams(h.slice(qi + 1)).forEach((v, k) => (query[k] = v));
      h = h.slice(0, qi);
    }
    for (const r of ROUTES) {
      const m = h.match(r.re);
      if (m) {
        const route = Object.assign({ name: r.name, view: r.view, nav: r.nav }, query);
        if (r.key) route[r.key] = decodeURIComponent(m[1]);
        return route;
      }
    }
    return { name: "dashboard", view: "dashboard", nav: "home" };
  }

  app.render = function () {
    const root = U.$("#view");
    const v = AT.views[app.route.view];
    try {
      v.render(root, app.route);
    } catch (e) {
      console.error(e);
      root.innerHTML = '<div class="card errbox">Something broke on this screen: ' + U.esc(e.message) + '. <a href="#/">Go to the dashboard</a>.</div>';
    }
    document.title = (app.route.name === "dashboard" ? "" : (v.title || "") + " · ") + "Afterthoughts";
    app.renderChrome();
  };

  app.renderChrome = function () {
    U.$$("[data-nav]").forEach((a) => {
      if (a.dataset.nav === app.route.nav) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    const live = AT.ai.isLive();
    U.$$(".ai-chip").forEach((c) => {
      c.className = "ai-chip" + (live ? " live" : "");
      c.innerHTML = '<span class="dot"></span>' + U.esc(AT.ai.label());
    });
    const st = AT.insights.stats(AT.store.data.sessions);
    U.$$(".streak-chip").forEach((c) => {
      c.hidden = !st.streak;
      c.innerHTML = ui.icon("flame") + st.streak + " day streak";
    });
    const p = AT.store.data.profile || {};
    U.$$(".me-name").forEach((n) => (n.textContent = p.name || "Set your name"));
    const b = U.$("#banner");
    if (AT.store.memoryOnly) {
      b.hidden = false;
      b.textContent = "This browser is blocking storage, so nothing will be saved after you close the page. Use Export in Settings to keep your work.";
    } else if (!navigator.onLine && AT.ai.isLive()) {
      b.hidden = false;
      b.textContent = "You're offline. Your library works, but the AI needs a connection.";
    } else b.hidden = true;
  };

  app.applyTheme = function () {
    const t = AT.store.settings.theme;
    const el = document.documentElement;
    if (t === "light" || t === "dark") el.setAttribute("data-theme", t);
    else el.removeAttribute("data-theme");
    const dark = t === "dark" || (t !== "light" && window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches);
    el.classList.toggle("is-dark", !!dark);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", dark ? "#111316" : "#F1F2EE");
  };

  function onRoute() {
    app.route = parse();
    app.render();
    window.scrollTo(0, 0);
    const main = U.$("#view");
    if (main && document.activeElement && document.activeElement.closest && document.activeElement.closest(".side, .tabbar")) main.focus({ preventScroll: true });
  }

  function boot() {
    AT.store.load();
    app.applyTheme();
    if (window.matchMedia) matchMedia("(prefers-color-scheme: dark)").addEventListener("change", app.applyTheme);
    // embed mode: ?embed=1 hides the chrome so it sits cleanly inside an iframe on any site
    if (/[?&]embed=1\b/.test(location.search)) document.documentElement.classList.add("embed");
    window.addEventListener("hashchange", onRoute);
    window.addEventListener("online", app.renderChrome);
    window.addEventListener("offline", app.renderChrome);
    window.addEventListener("storage", (e) => {
      if (e.key && e.key.startsWith("afterthoughts:")) {
        AT.store.load();
        app.render();
      }
    });
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      app.installPrompt = e;
    });
    // keyboard: "n" new, "g d" dashboard, "/" search library
    let g = false;
    document.addEventListener("keydown", (e) => {
      if (e.target.closest && e.target.closest("input, textarea, select, [contenteditable]")) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "n") location.hash = "#/new";
      else if (e.key === "/") {
        e.preventDefault();
        location.hash = "#/library";
        setTimeout(() => { const q = U.$("#lib-q"); if (q) q.focus(); }, 30);
      } else if (e.key === "g") g = true;
      else if (g && e.key === "d") { location.hash = "#/"; g = false; }
      else g = false;
    });
    onRoute();
    showGift();
    // offline support when hosted (not for file:// or the single-file preview)
    if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol) && !window.AFTERTHOUGHTS_STANDALONE) {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    }
  }

  function showGift() {
    const g = (window.AFTERTHOUGHTS_CONFIG || {}).gift;
    const meta = (AT.store.data.meta = AT.store.data.meta || {});
    if (!g || !g.message || meta.giftSeen) return;
    const finish = () => {
      meta.giftSeen = Date.now();
      AT.store.saveNow();
    };
    ui.modal({
      title: "A gift for " + (g.to || "you"),
      body:
        '<div class="gift"><div class="gift-dots" aria-hidden="true"><i></i><i></i><i></i></div>' +
        '<p class="gift-to">For ' + U.esc(g.to || "you") + "</p>" +
        '<p class="gift-note">' + U.esc(g.message) + "</p>" +
        (g.from ? '<p class="gift-from">— ' + U.esc(g.from) + "</p>" : "") + "</div>",
      actions: [
        { label: "Look around", kind: "ghost", onClick: finish },
        { label: "Start my first afterthought", kind: "primary", onClick: () => { finish(); location.hash = "#/new"; } },
      ],
      onOpen: (wrap) => {
        // closing with X, Escape or the backdrop also counts as seen
        const obs = new MutationObserver(() => {
          if (!document.body.contains(wrap)) {
            obs.disconnect();
            if (!meta.giftSeen) finish();
          }
        });
        obs.observe(document.getElementById("modal-root"), { childList: true });
      },
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})(window.AT);
