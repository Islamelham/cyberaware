"use strict";
// Espaces entreprise : création, configuration, rattachement des salariés, tableau de bord.
//
// Données stockées (fichier data/orgs.json, hors dépôt) :
//  - la configuration de l'organisation (nom, domaine, direction...), non secrète ;
//  - un mot de passe administrateur haché (scrypt + sel), jamais en clair ;
//  - pour chaque salarié : un pseudo et un RÉSUMÉ de résultats (scores, niveaux par thème).
//    Les réponses détaillées ne quittent jamais le navigateur du salarié.
// Jetons de session administrateur : en mémoire, 8 h, perdus au redémarrage.

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const Org = require("../org.js");

const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(__dirname, "..", "data");
const FILE = path.join(DATA_DIR, "orgs.json");
const MAX_ORGS = 200, MAX_USERS = 500, TOKEN_TTL = 8 * 3600 * 1000;
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // sans I, L, O, 0, 1 : pas de confusion à la saisie
const CODE_RE = /^[A-Z2-9]{8}$/;
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const own = (o) => Object.assign(Object.create(null), o); // objets sans prototype : un pseudo « constructor » reste inoffensif

let db = load();
function load() {
  try {
    const d = JSON.parse(fs.readFileSync(FILE, "utf8"));
    const orgs = Object.create(null);
    Object.keys(d.orgs || {}).forEach((c) => { if (CODE_RE.test(c)) { const o = d.orgs[c]; o.users = own(o.users); orgs[c] = o; } });
    return { orgs };
  } catch (e) { return { orgs: Object.create(null) }; }
}
function save() {
  fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
  const tmp = FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(db), { mode: 0o600 });
  fs.renameSync(tmp, FILE);
}

// ---------- Limites de débit ----------
function limiter(max, windowMs) {
  const hits = new Map();
  setInterval(() => { const n = Date.now(); hits.forEach((v, k) => { if (!v.some((t) => n - t < windowMs)) hits.delete(k); }); }, 60000).unref();
  return (key) => {
    const n = Date.now(), arr = (hits.get(key) || []).filter((t) => n - t < windowMs);
    if (arr.length >= max) { hits.set(key, arr); return true; }
    arr.push(n); hits.set(key, arr); return false;
  };
}
const limCreate = limiter(5, 3600 * 1000), limAuth = limiter(10, 60000), limPublic = limiter(30, 60000), limReport = limiter(120, 60000);
const fails = new Map(); // code -> { n, until }

// ---------- Mots de passe et sessions ----------
function hashPw(pw, saltHex) {
  const salt = saltHex ? Buffer.from(saltHex, "hex") : crypto.randomBytes(16);
  return { salt: salt.toString("hex"), hash: crypto.scryptSync(pw, salt, 64).toString("hex") };
}
function checkPw(pw, o) {
  const h = crypto.scryptSync(pw, Buffer.from(o.salt, "hex"), 64), want = Buffer.from(o.hash, "hex");
  return h.length === want.length && crypto.timingSafeEqual(h, want);
}
const sessions = new Map(); // jeton -> { code, exp }
function newSession(code) { const t = crypto.randomBytes(32).toString("hex"); sessions.set(t, { code, exp: Date.now() + TOKEN_TTL }); return t; }
function authOrg(req) {
  const m = /^Bearer ([0-9a-f]{64})$/.exec(String(req.headers.authorization || ""));
  const s = m && sessions.get(m[1]);
  if (!s || s.exp < Date.now()) { if (m) sessions.delete(m[1]); return null; }
  return has(db.orgs, s.code) ? { code: s.code, org: db.orgs[s.code], token: m[1] } : null;
}
function newCode() {
  for (let i = 0; i < 20; i++) {
    let c = ""; for (let k = 0; k < 8; k++) c += ALPHABET[crypto.randomInt(ALPHABET.length)];
    if (!has(db.orgs, c)) return c;
  }
  throw new Error("code_generation");
}

const cleanName = (n) => String(n == null ? "" : n).replace(/[^\p{L}\p{N} ._'-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 24);
const int = (v, max) => { const n = Math.floor(Number(v)); return Number.isFinite(n) ? Math.max(0, Math.min(max, n)) : 0; };

function cleanSummary(s) {
  s = s && typeof s === "object" ? s : {};
  const r = (x) => (x && typeof x === "object" ? { score: int(x.score, 100), total: int(x.total, 100) } : null);
  const by = Object.create(null);
  Object.keys(s.byConcept && typeof s.byConcept === "object" ? s.byConcept : {}).slice(0, 20).forEach((k) => {
    if (!/^[a-z]{2,12}$/.test(k)) return;
    const c = s.byConcept[k] || {};
    by[k] = { box: int(c.box, 3), errors: int(c.errors, 10000), attempts: int(c.attempts, 10000) };
  });
  return {
    mode: ["intro", "pre", "learn", "post", "review"].includes(s.mode) ? s.mode : "intro",
    pre: r(s.pre), post: r(s.post), answered: int(s.answered, 100000), correct: int(s.correct, 100000),
    overconfident: int(s.overconfident, 100000), mastered: int(s.mastered, 50), byConcept: by
  };
}

function dashboard(org) {
  const users = Object.keys(org.users).map((n) => Object.assign({ name: n }, org.users[n]));
  const pct = (r) => (r && r.total ? r.score / r.total : null);
  const avg = (a) => { const v = a.filter((x) => x != null); return v.length ? v.reduce((x, y) => x + y, 0) / v.length : null; };
  const themes = Object.create(null);
  users.forEach((u) => Object.keys(u.byConcept || {}).forEach((k) => {
    const c = u.byConcept[k]; themes[k] = themes[k] || { errors: 0, attempts: 0, mastered: 0 };
    themes[k].errors += c.errors; themes[k].attempts += c.attempts; if (c.box >= 1) themes[k].mastered++;
  }));
  return {
    participants: users.length,
    finished: users.filter((u) => u.post).length,
    avgPre: avg(users.map((u) => pct(u.pre))), avgPost: avg(users.map((u) => pct(u.post))),
    themes: Object.keys(themes).map((k) => Object.assign({ concept: k, errorRate: themes[k].attempts ? themes[k].errors / themes[k].attempts : null }, themes[k])),
    users
  };
}

// ---------- Routage ----------
// util : { json, readBody } fournis par server.js. Renvoie true si la requête est traitée ici.
async function handle(req, res, fullUrl, util) {
  const u = new URL(fullUrl, "http://x");
  const p = u.pathname, ip = req.socket.remoteAddress || "?";
  if (!p.startsWith("/api/org/")) return false;
  const { json, readBody } = util;
  const body = async () => {
    if (!String(req.headers["content-type"] || "").includes("application/json")) throw Object.assign(new Error("ct"), { status: 415 });
    try { const b = JSON.parse(await readBody(req)); return b && typeof b === "object" ? b : {}; }
    catch (e) { throw Object.assign(new Error("bad"), { status: e.status || 400 }); }
  };
  try {
    // Création d'un espace
    if (req.method === "POST" && p === "/api/org/create") {
      if (limCreate(ip)) return json(res, 429, { error: "rate_limited" }), true;
      const b = await body();
      const v = Org.validate(b.config);
      const pw = String(b.password || "");
      const errors = v.errors.slice();
      if (pw.length < 10 || pw.length > 100) errors.push("Le mot de passe doit faire au moins 10 caractères.");
      if (Object.keys(db.orgs).length >= MAX_ORGS) errors.push("Le nombre maximal d'espaces est atteint sur ce serveur.");
      if (errors.length) return json(res, 400, { ok: false, errors }), true;
      const code = newCode();
      const hp = hashPw(pw);
      db.orgs[code] = { code, createdAt: Date.now(), config: v.cfg, salt: hp.salt, hash: hp.hash, users: own({}) };
      save();
      return json(res, 200, { ok: true, code, token: newSession(code), config: v.cfg }), true;
    }
    // Connexion administrateur
    if (req.method === "POST" && p === "/api/org/login") {
      if (limAuth(ip)) return json(res, 429, { error: "rate_limited" }), true;
      const b = await body(), code = String(b.code || "").toUpperCase().replace(/[\s-]/g, "");
      const f = fails.get(code);
      if (f && f.until > Date.now()) return json(res, 429, { error: "locked" }), true;
      const org = CODE_RE.test(code) && has(db.orgs, code) ? db.orgs[code] : null;
      const good = org && checkPw(String(b.password || ""), org);
      if (!good) {
        if (CODE_RE.test(code)) { const n = (f ? f.n : 0) + 1; fails.set(code, { n, until: n >= 5 ? Date.now() + 5 * 60000 : 0 }); }
        return json(res, 401, { error: "bad_credentials" }), true;
      }
      fails.delete(code);
      return json(res, 200, { ok: true, code, token: newSession(code), config: org.config }), true;
    }
    if (req.method === "POST" && p === "/api/org/logout") {
      const a = authOrg(req); if (a) sessions.delete(a.token);
      return json(res, 200, { ok: true }), true;
    }
    // Configuration publique d'une organisation (pour les salariés qui rejoignent avec le code)
    if (req.method === "GET" && p === "/api/org/public") {
      if (limPublic(ip)) return json(res, 429, { error: "rate_limited" }), true;
      const code = String(u.searchParams.get("code") || "").toUpperCase().replace(/[\s-]/g, "");
      if (!CODE_RE.test(code) || !has(db.orgs, code)) return json(res, 404, { error: "unknown_code" }), true;
      return json(res, 200, { ok: true, code, config: db.orgs[code].config }), true;
    }
    // À partir d'ici : administrateur connecté
    if (req.method === "POST" && p === "/api/org/config") {
      const a = authOrg(req); if (!a) return json(res, 401, { error: "unauthorized" }), true;
      const v = Org.validate((await body()).config);
      if (!v.ok) return json(res, 400, { ok: false, errors: v.errors }), true;
      a.org.config = v.cfg; save();
      return json(res, 200, { ok: true, config: v.cfg }), true;
    }
    if (req.method === "GET" && p === "/api/org/dashboard") {
      const a = authOrg(req); if (!a) return json(res, 401, { error: "unauthorized" }), true;
      return json(res, 200, { ok: true, code: a.code, config: a.org.config, dashboard: dashboard(a.org) }), true;
    }
    if (req.method === "POST" && p === "/api/org/user/delete") {
      const a = authOrg(req); if (!a) return json(res, 401, { error: "unauthorized" }), true;
      const n = cleanName((await body()).name);
      if (n && has(a.org.users, n)) { delete a.org.users[n]; save(); }
      return json(res, 200, { ok: true }), true;
    }
    if (req.method === "POST" && p === "/api/org/delete") {
      const a = authOrg(req); if (!a) return json(res, 401, { error: "unauthorized" }), true;
      if (!checkPw(String((await body()).password || ""), a.org)) return json(res, 401, { error: "bad_credentials" }), true;
      delete db.orgs[a.code]; sessions.delete(a.token); save();
      return json(res, 200, { ok: true }), true;
    }
    // Résumé d'un salarié (pas de mot de passe : pseudonyme + résumé de scores)
    if (req.method === "POST" && p === "/api/org/report") {
      if (limReport(ip)) return json(res, 429, { error: "rate_limited" }), true;
      const b = await body(), code = String(b.code || "");
      if (!CODE_RE.test(code) || !has(db.orgs, code)) return json(res, 404, { error: "unknown_code" }), true;
      const name = cleanName(b.user);
      if (!name) return json(res, 400, { error: "bad_user" }), true;
      const org = db.orgs[code];
      if (!has(org.users, name) && Object.keys(org.users).length >= MAX_USERS) return json(res, 400, { error: "too_many_users" }), true;
      org.users[name] = Object.assign(cleanSummary(b.summary), { updatedAt: Date.now() });
      save();
      return json(res, 200, { ok: true }), true;
    }
    return json(res, 404, { error: "not_found" }), true;
  } catch (e) {
    json(res, e.status || 500, { error: e.status === 413 ? "payload_too_large" : e.status === 415 ? "unsupported_media_type" : e.status === 400 ? "bad_json" : "server_error" });
    return true;
  }
}

module.exports = { handle, _reset() { db = { orgs: Object.create(null) }; sessions.clear(); fails.clear(); } };
