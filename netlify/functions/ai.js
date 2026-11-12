/* Netlify adapter for api/ai.js. netlify.toml routes /api/ai here. */
const handler = require("../../api/ai.js");

exports.handler = (event) =>
  new Promise((resolve) => {
    const headers = {};
    let body = {};
    try {
      const raw = event.body ? (event.isBase64Encoded ? Buffer.from(event.body, "base64").toString() : event.body) : "";
      body = raw ? JSON.parse(raw) : {};
    } catch (e) {
      return resolve({ statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) });
    }
    const req = {
      method: event.httpMethod,
      headers: Object.fromEntries(Object.entries(event.headers || {}).map(([k, v]) => [k.toLowerCase(), v])),
      body,
      socket: {},
    };
    const res = {
      statusCode: 200,
      setHeader(k, v) { headers[k] = v; },
      status(c) { this.statusCode = c; return this; },
      json(o) { headers["Content-Type"] = "application/json"; resolve({ statusCode: this.statusCode, headers, body: JSON.stringify(o) }); },
      end() { resolve({ statusCode: this.statusCode, headers, body: "" }); },
    };
    handler(req, res);
  });
