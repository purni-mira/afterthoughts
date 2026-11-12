/* Afterthoughts — site configuration.
 *
 * provider: the AI new visitors start with. Visitors can still change it in Settings.
 *   "demo"   – works for everyone with no key (template questions)          [default]
 *   "server" – uses your own /api/ai endpoint, which holds YOUR API key.
 *              Deploy api/ai.js (see docs/DEPLOY.md) and set ACCESS_CODE before switching.
 * endpoint: where the server proxy lives (default "/api/ai").
 * owner:    the name the dashboard greets on first open (changeable in My voice).
 * gift:     a one-time welcome note shown the first time the app opens.
 *           Delete the gift block to turn it off.
 */
window.AFTERTHOUGHTS_CONFIG = {
  provider: "server",
  endpoint: "/api/ai",
  owner: { name: "Purnisha Tomar", headline: "" },
  gift: {
    to: "Purnisha",
    from: "",
    message:
      "I built this for you.\n\nIt's a quiet place to think about what you read, work out what you actually believe, and say it in your own voice. Nobody else sees what you write here; it stays on your device.\n\nStart with today's provocation, or paste the next thing that makes you stop and think. I can't wait to read what you post.",
  },
};
