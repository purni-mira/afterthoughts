/* Afterthoughts service worker: caches the app shell so it opens offline.
 * AI calls and the /api proxy always go to the network. Bump VERSION on each release. */
const VERSION = "afterthoughts-v2.1.0";
const SHELL = [
  "./",
  "./index.html",
  "./config.js",
  "./css/app.css",
  "./js/core.js",
  "./js/ai.js",
  "./js/demo.js",
  "./js/insights.js",
  "./js/charts.js",
  "./js/samples.js",
  "./js/ui.js",
  "./js/view-dashboard.js",
  "./js/view-think.js",
  "./js/view-library.js",
  "./js/view-voice.js",
  "./js/view-settings.js",
  "./js/app.js",
  "./manifest.webmanifest",
  "./assets/icon.svg",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.pathname.startsWith("/api/")) return;
  // same-origin app files: network first (fresh after deploys), cache as fallback
  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          if (res.ok) caches.open(VERSION).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("./index.html")))
    );
    return;
  }
  // Google Fonts: cache first
  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(
      caches.match(req).then(
        (r) =>
          r ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(req, copy));
            return res;
          })
      )
    );
  }
});
