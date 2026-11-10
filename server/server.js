"use strict";
// Serveur local : sert l'application ET l'API /api/generate (même origine, pas de CORS).
// Lancer : node server/server.js  puis ouvrir http://localhost:3000
// Sans GEMINI_API_KEY, le backend fonctionne en mode simulation (gabarits).

const http = require("http");
const fs = require("fs");
const path = require("path");

try { if (process.loadEnvFile) process.loadEnvFile(path.join(__dirname, "..", ".env")); } catch (e) { /* pas de .env */ }

const llm = require("./llm");
const agents = require("./agents");
const mock = require("./mock");
const orgs = require("./orgs");

// Local uniquement par défaut. L'option --lan (npm run lan) ouvre l'accès aux appareils du même Wi-Fi (test sur téléphone).
const LAN = process.argv.includes("--lan");
const HOST = process.env.HOST || (LAN ? "0.0.0.0" : "127.0.0.1");
const PORT = Number(process.env.PORT) || 3000;
const ROOT = path.resolve(__dirname, "..");
const LIVE = llm.available() && process.env.FORCE_MOCK !== "1";
const backend = LIVE ? agents.llmBackend : mock.backend;

// Liste blanche stricte : aucun autre fichier n'est servi (pas de traversée de chemin possible).
const HTML = "text/html; charset=utf-8", JS = "text/javascript; charset=utf-8", CSS = "text/css; charset=utf-8";
const FILES = {
  "/": ["index.html", HTML], "/index.html": ["index.html", HTML], "/style.css": ["style.css", CSS],
  "/app.js": ["app.js", JS], "/engine.js": ["engine.js", JS], "/ai.js": ["ai.js", JS], "/scenarios.js": ["scenarios.js", JS], "/org.js": ["org.js", JS], "/mascot.js": ["mascot.js", JS]
};

const MAX_BODY = 20 * 1024;
const RATE = { max: 10, windowMs: 60000 };
const MAX_CONCURRENT = 2;
const hits = new Map();
let busy = 0;

setInterval(() => { const now = Date.now(); hits.forEach((v, k) => { if (!v.some((t) => now - t < RATE.windowMs)) hits.delete(k); }); }, 60000).unref();

function limited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < RATE.windowMs);
  if (arr.length >= RATE.max) { hits.set(ip, arr); return true; }
  arr.push(now);
  hits.set(ip, arr);
  return false;
}

function baseHeaders() {
  return {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Cache-Control": "no-store",
    "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
  };
}

function send(res, status, body, type) {
  res.writeHead(status, Object.assign(baseHeaders(), { "Content-Type": type }));
  res.end(body);
}
function json(res, status, obj) { send(res, status, JSON.stringify(obj), "application/json; charset=utf-8"); }

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0, tooBig = false;
    const chunks = [];
    req.on("data", (c) => { size += c.length; if (size > MAX_BODY) { tooBig = true; return; } chunks.push(c); });
    req.on("end", () => (tooBig ? reject(Object.assign(new Error("too_large"), { status: 413 })) : resolve(Buffer.concat(chunks).toString("utf8"))));
    req.on("error", reject);
  });
}

async function handleGenerate(req, res) {
  if (!String(req.headers["content-type"] || "").includes("application/json")) return json(res, 415, { error: "unsupported_media_type" });
  if (limited(req.socket.remoteAddress || "?")) return json(res, 429, { error: "rate_limited" });
  if (busy >= MAX_CONCURRENT) return json(res, 429, { error: "busy" });
  let body;
  try { body = JSON.parse(await readBody(req)); }
  catch (e) { return json(res, e.status || 400, { error: e.status === 413 ? "payload_too_large" : "bad_json" }); }
  busy++;
  try {
    const out = await agents.generateScenario(body, backend);
    if (!out.ok) return json(res, 502, { ok: false, error: "generation_failed", trace: out.trace });
    // Origine du scénario : "llm" (vrai modèle) ou "simulation" (gabarits, sans IA). Sert à l'étiquette honnête de l'interface.
    out.scenario.source = LIVE ? "llm" : "simulation";
    json(res, 200, { ok: true, scenario: out.scenario, trace: out.trace });
  } finally {
    busy--;
  }
}

const server = http.createServer(async (req, res) => {
  const url = (req.url || "/").split("?")[0];
  try {
    if (req.method === "GET" && url === "/api/health") return json(res, 200, { ok: true, mode: LIVE ? "live" : "mock" });
    if (req.method === "POST" && url === "/api/generate") return await handleGenerate(req, res);
    if (await orgs.handle(req, res, req.url || "/", { json, readBody })) return;
    if ((req.method === "GET" || req.method === "HEAD") && Object.prototype.hasOwnProperty.call(FILES, url)) {
      const [file, type] = FILES[url];
      const data = await fs.promises.readFile(path.join(ROOT, file));
      return send(res, 200, req.method === "HEAD" ? "" : data, type);
    }
    json(res, 404, { error: "not_found" });
  } catch (e) {
    json(res, 500, { error: "server_error" });
  }
});

if (require.main === module) {
  server.listen(PORT, HOST, () => {
    console.log(`CyberAware : http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}  (IA : ${LIVE ? "modèle " + llm.MODEL : "simulation, aucune clé API"})`);
    if (HOST === "0.0.0.0") {
      const urls = Object.values(require("os").networkInterfaces()).reduce((a, b) => a.concat(b || []), [])
        .filter((i) => i.family === "IPv4" && !i.internal).map((i) => `http://${i.address}:${PORT}`);
      console.log("Sur votre téléphone (même Wi-Fi) : " + (urls.join("  ou  ") || "adresse introuvable, voir ipconfig"));
      console.log("Attention : l'application est visible par les appareils de ce réseau. Arrêtez le serveur (Ctrl+C) après le test.");
    }
  });
}

module.exports = server;
