/* Afterthoughts — optional server proxy (Vercel serverless function; Netlify wrapper in netlify/functions).
 *
 * Why: with this deployed, visitors get the real AI thinking partner without bringing their own key.
 * Your key lives in environment variables, never in the browser.
 *
 * Environment variables (set in Vercel → Project → Settings → Environment Variables):
 *   AI_PROVIDER        gemini | anthropic | openai           (default: gemini)
 *   GEMINI_API_KEY     if AI_PROVIDER=gemini
 *   ANTHROPIC_API_KEY  if AI_PROVIDER=anthropic
 *   OPENAI_API_KEY     if AI_PROVIDER=openai
 *   AI_MODEL           optional model override for quick calls
 *   AI_MODEL_BIG       optional model override for takes and drafts
 *   ALLOWED_ORIGINS    optional comma-separated list, e.g. https://afterthoughts.vercel.app,https://mysite.com
 *   RATE_LIMIT_PER_MIN optional, requests per minute per IP (default 30)
 *   DAILY_LIMIT        optional, requests per day per IP (default 300)
 *   ACCESS_CODE        optional but recommended: a password visitors enter once in Settings.
 *                      Without it, anyone who finds your site can spend your AI credit.
 *
 * Then set provider: "server" in config.js so new visitors use it by default.
 */

const DEFAULTS = {
  gemini: { quick: "gemini-3.6-flash", big: "gemini-3.6-flash" },
  anthropic: { quick: "claude-haiku-5-5", big: "claude-sonnet-5-5" },
  openai: { quick: "gpt-5.1", big: "gpt-5.1" },
};
const MAX_BODY = 6 * 1024 * 1024; // screenshots are sent as base64
const hits = new Map(); // best-effort per-instance rate limit

function cors(req, res) {
  const allowed = (process.env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
  const origin = req.headers.origin || "";
  if (!allowed.length || allowed.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", allowed.length ? origin : "*");
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-access-code");
  return !allowed.length || !origin || allowed.includes(origin);
}

function limited(req) {
  // best-effort: counts live per server instance; pair with ACCESS_CODE and a provider spending cap
  const max = parseInt(process.env.RATE_LIMIT_PER_MIN || "30", 10);
  const daily = parseInt(process.env.DAILY_LIMIT || "300", 10);
  const ip = String(req.headers["x-forwarded-for"] || (req.socket && req.socket.remoteAddress) || "anon").split(",")[0].trim();
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < 86400000);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  const lastMinute = list.filter((t) => now - t < 60000).length;
  return lastMinute > max || list.length > daily;
}

function timingSafeEqual(a, b) {
  a = String(a || "");
  b = String(b || "");
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > MAX_BODY) throw Object.assign(new Error("Request too large"), { status: 413 });
  }
  return raw ? JSON.parse(raw) : {};
}

async function callAI({ system, prompt, json, images = [], big }) {
  const provider = (process.env.AI_PROVIDER || "gemini").toLowerCase();
  const d = DEFAULTS[provider];
  if (!d) throw Object.assign(new Error("Unknown AI_PROVIDER " + provider), { status: 500 });
  const model = big ? process.env.AI_MODEL_BIG || process.env.AI_MODEL || d.big : process.env.AI_MODEL || d.quick;
  let r, j;
  if (provider === "gemini") {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw Object.assign(new Error("GEMINI_API_KEY is not set on the server"), { status: 500 });
    const parts = [{ text: prompt }].concat(images.map((im) => ({ inline_data: { mime_type: im.mime, data: im.data } })));
    const body = { systemInstruction: { parts: [{ text: system }] }, contents: [{ role: "user", parts }] };
    if (json) body.generationConfig = { responseMimeType: "application/json" };
    r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify(body),
    });
    j = await r.json();
    if (!r.ok) throw Object.assign(new Error((j.error && j.error.message) || "Gemini error"), { status: r.status });
    const c = j.candidates && j.candidates[0];
    return c && c.content && c.content.parts ? c.content.parts.map((p) => p.text || "").join("") : "";
  }
  if (provider === "anthropic") {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw Object.assign(new Error("ANTHROPIC_API_KEY is not set on the server"), { status: 500 });
    const content = images.map((im) => ({ type: "image", source: { type: "base64", media_type: im.mime, data: im.data } })).concat([{ type: "text", text: prompt }]);
    r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model, max_tokens: big ? 2000 : 900, system, messages: [{ role: "user", content }] }),
    });
    j = await r.json();
    if (!r.ok) throw Object.assign(new Error((j.error && j.error.message) || "Anthropic error"), { status: r.status });
    return (j.content || []).filter((c) => c.type === "text").map((c) => c.text).join("");
  }
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw Object.assign(new Error("OPENAI_API_KEY is not set on the server"), { status: 500 });
  const userContent = images.length
    ? [{ type: "text", text: prompt }].concat(images.map((im) => ({ type: "image_url", image_url: { url: "data:" + im.mime + ";base64," + im.data } })))
    : prompt;
  const body = { model, messages: [{ role: "system", content: system }, { role: "user", content: userContent }] };
  if (json) body.response_format = { type: "json_object" };
  r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
    body: JSON.stringify(body),
  });
  j = await r.json();
  if (!r.ok) throw Object.assign(new Error((j.error && j.error.message) || "OpenAI error"), { status: r.status });
  return (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || "";
}

/* Fetch an article and strip it to readable text (for the Link tab) */
async function fetchArticle(url) {
  if (!/^https?:\/\//i.test(url)) throw Object.assign(new Error("Only http(s) links can be fetched"), { status: 400 });
  const host = new URL(url).hostname;
  if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(host) || host.endsWith(".internal")) throw Object.assign(new Error("That address isn't allowed"), { status: 400 });
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 10000);
  try {
    const r = await fetch(url, { headers: { "User-Agent": "AfterthoughtsBot/2.0 (+reader)" }, signal: ctl.signal, redirect: "follow" });
    if (!r.ok) throw Object.assign(new Error("The page returned " + r.status), { status: 502 });
    const html = (await r.text()).slice(0, 2000000);
    const main = (html.match(/<article[\s\S]*?<\/article>/i) || html.match(/<main[\s\S]*?<\/main>/i) || [html])[0];
    const text = main
      .replace(/<(script|style|noscript|svg|nav|footer|header|aside|form)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<\/(p|div|h[1-6]|li|br|section)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&rsquo;|&lsquo;/g, "'").replace(/&ldquo;|&rdquo;/g, '"').replace(/&[a-z]+;/g, " ")
      .split("\n").map((l) => l.replace(/\s+/g, " ").trim()).filter((l) => l.length > 40).join("\n\n");
    if (text.length < 200) throw Object.assign(new Error("Couldn't find readable article text on that page"), { status: 422 });
    return text.slice(0, 20000);
  } finally {
    clearTimeout(t);
  }
}

async function handler(req, res) {
  const ok = cors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (!ok) return res.status(403).json({ error: "Origin not allowed" });
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  if (process.env.ACCESS_CODE && !timingSafeEqual(req.headers["x-access-code"], process.env.ACCESS_CODE))
    return res.status(401).json({ error: "Enter the access code in Settings to use the AI on this site." });
  if (limited(req)) return res.status(429).json({ error: "Too many requests from you today. Try again later." });
  try {
    const b = await readBody(req);
    if (b.action === "fetch") return res.status(200).json({ text: await fetchArticle(String(b.url || "")) });
    if (!b.prompt || typeof b.prompt !== "string") return res.status(400).json({ error: "Missing prompt" });
    if (b.prompt.length > 200000) return res.status(413).json({ error: "Prompt too long" });
    const images = Array.isArray(b.images) ? b.images.slice(0, 2).filter((im) => im && /^image\/(png|jpeg|webp|gif)$/.test(im.mime) && typeof im.data === "string") : [];
    const text = await callAI({ system: String(b.system || ""), prompt: b.prompt, json: !!b.json, images, big: !!b.big });
    if (!text) return res.status(502).json({ error: "The AI returned an empty answer" });
    return res.status(200).json({ text });
  } catch (e) {
    return res.status(e.status && e.status >= 400 && e.status < 600 ? e.status : 500).json({ error: e.message || "Server error" });
  }
}

module.exports = handler;
module.exports.callAI = callAI;
module.exports.fetchArticle = fetchArticle;
module.exports.handler = handler;
