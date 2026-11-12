/* Afterthoughts — Settings: AI provider, defaults, appearance, data */
(function (AT) {
  "use strict";
  const U = AT.u, ui = AT.ui;
  AT.views = AT.views || {};

  AT.views.settings = {
    title: "Settings",
    render(root) {
      const st = AT.store.settings;
      const P = AT.PROVIDERS;
      const keyField = (p) =>
        '<div class="prov-fields"' + (st.provider === p ? "" : " hidden") + ' data-fields="' + p + '">' +
        '<label for="key-' + p + '">API key</label><div class="row nowrap"><input type="password" id="key-' + p + '" value="' + U.esc(st.keys[p] || "") + '" autocomplete="off" spellcheck="false" placeholder="Paste your key"><button type="button" class="btn small" data-show="' + p + '">Show</button></div>' +
        '<label for="model-' + p + '">Model</label><input type="text" id="model-' + p + '" value="' + U.esc(st.models[p] || "") + '" spellcheck="false">' +
        (p === "anthropic" ? '<label for="dmodel-anthropic">Model for drafts and takes</label><input type="text" id="dmodel-anthropic" value="' + U.esc(st.draftModels.anthropic || "") + '" spellcheck="false">' : "") +
        '<p class="hint"><a href="' + P[p].keyUrl + '" target="_blank" rel="noopener">Get a ' + P[p].name + " key</a>. The key stays in this browser and is sent only to " + P[p].name + ". Anyone using this browser profile can see it, so don't use a shared computer.</p></div>";
      root.innerHTML =
        '<header class="page-head"><div><div class="eyebrow">Settings</div><h1 class="display">Make it yours.</h1></div></header>' +
        '<section class="card stack"><div class="card-head"><h2>Thinking partner (AI)</h2><span class="hint">Now: ' + U.esc(AT.ai.label()) + "</span></div>" +
        '<div class="prov-grid">' +
        Object.entries(P).map(([k, p]) => '<label class="prov"><input type="radio" name="prov" value="' + k + '"' + (st.provider === k ? " checked" : "") + "><span><b>" + U.esc(p.name) + "</b><small>" + U.esc(p.sub) + "</small></span></label>").join("") +
        "</div>" +
        keyField("gemini") + keyField("anthropic") + keyField("openai") +
        '<div class="prov-fields"' + (st.provider === "server" ? "" : " hidden") + ' data-fields="server"><label for="endpoint">Endpoint</label><input type="text" id="endpoint" value="' + U.esc(st.endpoint || "/api/ai") + '" spellcheck="false"><label for="access">Access code <span class="muted">(if the site owner set one)</span></label><input type="password" id="access" value="' + U.esc(st.accessCode || "") + '" autocomplete="off"><p class="hint">Deploy this repo to Vercel or Netlify with an API key in the environment, and every visitor gets the thinking partner with no setup. See docs/DEPLOY.md.</p></div>' +
        '<div class="row"><button class="btn primary" id="save-ai">Save</button><button class="btn" id="test-ai">Test connection</button><span class="hint" id="test-out"></span></div>' +
        "</section>" +
        '<section class="card stack"><div class="card-head"><h2>Defaults</h2></div>' +
        '<div class="grid-3"><div><label for="d-lens">Lens</label><select id="d-lens">' + Object.entries(AT.LENSES).map(([k, l]) => '<option value="' + k + '"' + (st.lens === k ? " selected" : "") + ">" + U.esc(l.name) + "</option>").join("") + "</select></div>" +
        '<div><label for="d-depth">Depth</label><select id="d-depth">' + Object.entries(AT.DEPTHS).map(([k, d]) => '<option value="' + k + '"' + (st.depth === k ? " selected" : "") + ">" + d.name + " (" + d.answers + " questions)</option>").join("") + "</select></div>" +
        '<div><label for="d-speech">Voice input language</label><select id="d-speech">' + [["en-IN", "English (India)"], ["en-US", "English (US)"], ["en-GB", "English (UK)"], ["hi-IN", "Hindi"]].map(([k, n]) => '<option value="' + k + '"' + (st.speechLang === k ? " selected" : "") + ">" + n + "</option>").join("") + "</select></div></div>" +
        '<div><div class="label">Theme</div><div class="seg">' + [["system", "Match device"], ["light", "Light"], ["dark", "Dark"]].map(([k, n]) => '<button type="button" data-theme-btn="' + k + '" aria-pressed="' + (st.theme === k) + '">' + n + "</button>").join("") + "</div></div>" +
        "</section>" +
        '<section class="card stack"><div class="card-head"><h2>Your data</h2><span class="hint">' + AT.store.data.sessions.length + " afterthoughts on this device</span></div>" +
        "<p class=\"hint\">Everything is stored in this browser only. Nothing is uploaded unless you use an AI provider, which receives the text of each request. Export a backup now and then.</p>" +
        '<div class="row"><button class="btn" id="exp">' + ui.icon("dl") + 'Export backup (.json)</button><label class="btn" for="imp">Import backup</label><input type="file" id="imp" accept="application/json,.json" hidden>' +
        '<button class="btn" id="samples">Load sample data</button>' + (AT.store.data.sessions.some((s) => s.sample) ? '<button class="btn" id="clear-samples">Clear samples</button>' : "") + "</div>" +
        '<div class="row"><button class="btn danger" id="wipe">' + ui.icon("trash") + "Delete everything</button></div>" +
        "</section>" +
        '<section class="card stack" id="install-card" hidden><div class="card-head"><h2>Install the app</h2></div><p class="hint">Add Afterthoughts to your home screen or dock. It opens like an app and works offline in Demo mode.</p><div class="row"><button class="btn primary" id="install">Install</button></div></section>' +
        '<section class="card about"><b>Afterthoughts</b> v' + AT.VERSION + ' · Think independently. Express confidently.<br><span class="hint">Local-first. No account. No tracking.</span></section>';
      bind(root);
    },
  };

  function bind(root) {
    const st = AT.store.settings;
    U.$$('input[name="prov"]', root).forEach((r) => r.addEventListener("change", () => {
      U.$$("[data-fields]", root).forEach((f) => (f.hidden = f.dataset.fields !== r.value));
    }));
    U.$$("[data-show]", root).forEach((b) => b.addEventListener("click", () => {
      const i = U.$("#key-" + b.dataset.show, root);
      i.type = i.type === "password" ? "text" : "password";
      b.textContent = i.type === "password" ? "Show" : "Hide";
    }));
    const collect = () => {
      st.provider = (U.$('input[name="prov"]:checked', root) || {}).value || "demo";
      ["gemini", "anthropic", "openai"].forEach((p) => {
        st.keys[p] = U.$("#key-" + p, root).value.trim();
        st.models[p] = U.$("#model-" + p, root).value.trim() || st.models[p];
      });
      st.draftModels.anthropic = U.$("#dmodel-anthropic", root).value.trim();
      st.endpoint = U.$("#endpoint", root).value.trim() || "/api/ai";
      st.accessCode = U.$("#access", root).value.trim();
      AT.store.saveSettings();
      AT.app.renderChrome();
    };
    U.$("#save-ai", root).addEventListener("click", () => {
      collect();
      if (st.provider !== "demo" && !AT.ai.isLive()) U.toast("Saved. Add a key to switch on the AI; until then Demo mode is used.");
      else U.toast("Saved. Thinking partner: " + AT.ai.label() + ".", "good");
      AT.views.settings.render(root);
    });
    U.$("#test-ai", root).addEventListener("click", async (e) => {
      const btn = e.currentTarget;
      collect();
      const out = U.$("#test-out", root);
      if (!AT.ai.isLive()) {
        out.textContent = st.provider === "demo" ? "Demo mode needs no connection." : "Add a key first.";
        return;
      }
      btn.disabled = true;
      out.textContent = "Testing…";
      try {
        const w = await AT.ai.test();
        out.innerHTML = '<span class="ok">Connected to ' + U.esc(AT.ai.label()) + ". It says: " + U.esc(w) + "</span>";
      } catch (err) {
        out.innerHTML = '<span class="err">' + U.esc(err.message) + "</span>";
      } finally {
        btn.disabled = false;
      }
    });
    const setSel = (id, key) => U.$(id, root).addEventListener("change", (e) => { st[key] = e.target.value; AT.store.saveSettings(); U.toast("Saved."); });
    setSel("#d-lens", "lens");
    setSel("#d-depth", "depth");
    setSel("#d-speech", "speechLang");
    U.$$("[data-theme-btn]", root).forEach((b) => b.addEventListener("click", () => {
      st.theme = b.dataset.themeBtn;
      AT.store.saveSettings();
      AT.app.applyTheme();
      U.$$("[data-theme-btn]", root).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    }));
    U.$("#exp", root).addEventListener("click", () => U.download("afterthoughts-backup-" + U.dayKey(Date.now()) + ".json", AT.store.exportJSON(), "application/json"));
    U.$("#imp", root).addEventListener("change", async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      try {
        const n = AT.store.importJSON(await f.text(), "merge");
        U.toast("Imported " + n + " afterthoughts.", "good");
        AT.views.settings.render(root);
      } catch (err) {
        U.toast(err.message || "Couldn't read that file.");
      }
    });
    U.$("#samples", root).addEventListener("click", () => {
      AT.store.clearSamples();
      AT.store.data.sessions = AT.store.data.sessions.concat(AT.makeSamples());
      AT.store.sort();
      AT.store.saveNow();
      U.toast("Sample data loaded.");
      location.hash = "#/";
    });
    const cs = U.$("#clear-samples", root);
    if (cs) cs.addEventListener("click", () => { AT.store.clearSamples(); U.toast("Samples cleared."); AT.views.settings.render(root); });
    U.$("#wipe", root).addEventListener("click", async () => {
      if (await ui.confirm("Delete everything?", "All afterthoughts, your voice profile and your profile will be erased from this browser. Export a backup first if you might want them.", "Delete everything", true)) {
        AT.store.resetAll();
        U.toast("Everything deleted.");
        location.hash = "#/";
      }
    });
    if (AT.app.installPrompt) {
      U.$("#install-card", root).hidden = false;
      U.$("#install", root).addEventListener("click", async () => {
        const p = AT.app.installPrompt;
        AT.app.installPrompt = null;
        p.prompt();
        try {
          await p.userChoice;
        } catch (e) {}
        U.$("#install-card", root).hidden = true;
      });
    }
  }
})(window.AT);
