// Moteur v2 — apprentissage, mesure et répétition espacée.
//
// Parcours : intro -> pre (test de niveau, sans correction) -> learn (apprentissage
// avec correction) -> post (test final, sans correction) -> review (rappels espacés).
//
// Apprentissage : une erreur remet le concept à 0 et il est rejoué avec une variante
// DIFFÉRENTE jusqu'à la bonne réponse.
// Répétition espacée (boîtes de Leitner) : après une bonne réponse le concept passe en
// boîte 1 puis 2 puis 3 ; il revient après 1 jour, 7 jours, 30 jours. Une erreur le
// remet en boîte 0. Ajouter ?demo=1 à l'URL réduit les délais à quelques secondes.
//
// Mesure : pour chaque réponse on enregistre la confiance (1 à 3) et le temps de réponse.
// Les « erreurs certaines » (confiance 3 + faux) sont les plus dangereuses en pratique.

(function () {
  "use strict";

  const BASE0 = "cyberaware.state.v2";
  const PKEY0 = "cyberaware.profiles.v1";
  const SKEY = "cyberaware.scope.v1";
  // Périmètre : "" (démo) ou le code d'une organisation. Chaque organisation a ses propres profils et sauvegardes,
  // pour que deux entreprises utilisées sur le même appareil ne se mélangent pas.
  const validScope = (c) => (typeof c === "string" && /^[A-Z2-9]{8}$/.test(c) ? c : "");
  let SCOPE = "";
  try { SCOPE = validScope(localStorage.getItem(SKEY)); } catch (e) { SCOPE = ""; }
  let BASE = BASE0 + (SCOPE ? "." + SCOPE : "");
  let PKEY = PKEY0 + (SCOPE ? "." + SCOPE : "");
  let KEY = BASE; // devient « <base>.<profil> » quand un profil est choisi
  const DAY = 86400000;
  const MAX_BOX = 3;
  const loc = (typeof window !== "undefined" && window.location) ? window.location : {};
  const DEMO = /[?&]demo=1/.test(loc.search || "");
  // Délai avant le prochain rappel, selon la boîte atteinte.
  const INTERVALS = DEMO ? [0, 20000, 60000, 120000] : [0, DAY, 7 * DAY, 30 * DAY];

  const conceptIds = () => Object.keys(window.CONCEPTS);
  const ownGenerated = (s) => (s.orgDomain || "utbm.fr") === ((window.ORG && window.ORG.domain) || "utbm.fr");

  // ---------- Profils (sur cet appareil, sans mot de passe) ----------
  // Chaque profil a sa propre sauvegarde. Rien n'est envoyé au serveur.
  const cleanName = (n) => String(n == null ? "" : n).replace(/[^\p{L}\p{N} ._'-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 24);
  const keyFor = (name) => BASE + "." + encodeURIComponent(name.toLowerCase());
  function readProfiles() {
    try { const p = JSON.parse(localStorage.getItem(PKEY)); if (p && Array.isArray(p.list)) return { list: p.list.filter((x) => typeof x === "string"), current: typeof p.current === "string" ? p.current : null }; } catch (e) {}
    return { list: [], current: null };
  }
  function writeProfiles(p) { try { localStorage.setItem(PKEY, JSON.stringify(p)); } catch (e) {} }
  { const P0 = readProfiles(); if (P0.current) KEY = keyFor(P0.current); }

  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (!s || s.v !== 2) return null;
      // Sauvegarde d'une ancienne version de la banque (thèmes différents) : on repart de zéro
      // plutôt que de planter sur un thème inconnu.
      const ids = conceptIds();
      const saved = Object.keys(s.concepts || {});
      if (saved.length !== ids.length || !ids.every((c) => saved.includes(c))) return null;
      return s;
    } catch (e) { return null; }
  }
  function persist(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }

  function fresh() {
    const concepts = {};
    conceptIds().forEach((c) => {
      concepts[c] = { box: 0, attempts: 0, errors: 0, overconfident: 0, seen: [], lastWrong: false, dueAt: 0, missedClues: [] };
    });
    return { v: 2, mode: "intro", concepts, history: [], pre: null, post: null, preSkipped: false, assess: null, startedAt: Date.now() };
  }

  const Engine = {
    state: load() || fresh(),

    scope() { return SCOPE; },
    // Change de périmètre (démo ou organisation) et recharge le profil courant de ce périmètre.
    setScope(code) {
      SCOPE = validScope(code);
      try { localStorage.setItem(SKEY, SCOPE); } catch (e) {}
      BASE = BASE0 + (SCOPE ? "." + SCOPE : ""); PKEY = PKEY0 + (SCOPE ? "." + SCOPE : "");
      const P = readProfiles(); KEY = P.current ? keyFor(P.current) : BASE;
      this.state = load() || fresh();
    },
    // Résumé envoyé à l'organisation : scores et niveaux par thème, jamais les réponses détaillées.
    summary() {
      const s = this.state, h = s.history, C = s.concepts;
      const by = {}; Object.keys(C).forEach((id) => { by[id] = { box: C[id].box, errors: C[id].errors, attempts: C[id].attempts }; });
      const sc = (r) => (r ? { score: r.score, total: r.total } : null);
      return { mode: s.mode, pre: sc(s.pre), post: sc(s.post), answered: h.length, correct: h.filter((x) => x.ok).length,
        overconfident: Object.keys(C).reduce((a, id) => a + C[id].overconfident, 0), mastered: Object.keys(C).filter((id) => C[id].box >= 1).length, byConcept: by };
    },
    user() { return readProfiles().current; },
    users() { return readProfiles().list; },
    // Crée le profil s'il n'existe pas, puis le charge. Renvoie le nom retenu, ou null si le nom est vide.
    setProfile(name) {
      const n = cleanName(name);
      if (!n) return null;
      const P = readProfiles();
      const known = P.list.find((x) => x.toLowerCase() === n.toLowerCase());
      const use = known || n;
      if (!known) P.list.push(use);
      P.current = use;
      writeProfiles(P);
      KEY = keyFor(use);
      this.state = load() || fresh();
      this.save();
      return use;
    },
    logout() { const P = readProfiles(); P.current = null; writeProfiles(P); KEY = BASE; this.state = fresh(); },
    removeProfile(name) {
      const P = readProfiles();
      P.list = P.list.filter((x) => x !== name);
      try { localStorage.removeItem(keyFor(name)); } catch (e) {}
      if (P.current === name) { P.current = null; KEY = BASE; this.state = fresh(); }
      writeProfiles(P);
    },
    clock: () => Date.now(), // remplaçable dans les tests
    demo: DEMO,
    intervals: INTERVALS,

    now() { return this.clock(); },
    save() { persist(this.state); },
    reset() { this.state = fresh(); this.save(); },

    // Les scénarios générés par l'IA appartiennent à l'organisation pour laquelle ils ont été créés (domaine).
    allScenarios() { return window.SCENARIOS.concat((window.GENERATED_SCENARIOS || []).filter(ownGenerated)); },
    baseScenarios(cid) { return window.SCENARIOS.filter((s) => s.concept === cid); },
    byId(id) { return this.allScenarios().find((s) => s.id === id); },

    // ---------- Démarrage et tests ----------
    start(skipPre) {
      const s = this.state;
      if (skipPre) { s.mode = "learn"; s.preSkipped = true; }
      else { s.mode = "pre"; s.assess = this.buildAssess("pre"); }
      this.save();
    },

    // Test de niveau : 1re variante de chaque concept. Test final : dernière variante.
    // Limite connue : sans scénarios générés par l'IA, les variantes ont été vues pendant l'apprentissage.
    buildAssess(kind) {
      const ids = conceptIds().map((cid) => {
        const pool = this.baseScenarios(cid);
        return (kind === "pre" ? pool[0] : pool[pool.length - 1]).id;
      });
      return { kind, ids, idx: 0, results: [] };
    },

    finishAssess() {
      const s = this.state, a = s.assess;
      const result = { score: a.results.filter((r) => r.ok).length, total: a.results.length, at: this.now(), results: a.results };
      if (a.kind === "pre") { s.pre = result; s.mode = "learn"; }
      else { s.post = result; s.mode = "review"; }
      s.assess = null;
      this.save();
      return result;
    },

    // ---------- Sélection ----------
    // Concepts à servir : à apprendre (boîte 0) ou à réviser (échéance dépassée).
    pending() {
      const now = this.now();
      return conceptIds().filter((cid) => { const c = this.state.concepts[cid]; return c.box === 0 || c.dueAt <= now; });
    },

    nextConcept() {
      const p = this.pending();
      if (!p.length) return null;
      const C = this.state.concepts;
      p.sort((a, b) =>
        (C[b].lastWrong - C[a].lastWrong) ||
        ((C[a].box === 0 ? 0 : 1) - (C[b].box === 0 ? 0 : 1)) ||
        (C[a].dueAt - C[b].dueAt) ||
        (C[a].attempts - C[b].attempts));
      return p[0];
    },

    // Priorité : scénario généré jamais vu, puis variante jamais vue, puis la moins vue
    // (jamais celle qui vient d'être jouée si une autre existe).
    pickScenario(cid) {
      const c = this.state.concepts[cid];
      const pool = this.allScenarios().filter((s) => s.concept === cid);
      const unseen = pool.filter((s) => !c.seen.includes(s.id));
      const gen = unseen.filter((s) => s.generated);
      if (gen.length) return gen[0];
      if (unseen.length) return unseen[0];
      const count = (id) => c.seen.filter((x) => x === id).length;
      const last = c.seen[c.seen.length - 1];
      const others = pool.filter((s) => s.id !== last);
      return (others.length ? others : pool).sort((a, b) => count(a.id) - count(b.id))[0];
    },

    serve(cid) {
      const c = this.state.concepts[cid];
      const sc = this.pickScenario(cid);
      const role = c.lastWrong ? "retry" : (c.box >= 1 ? "review" : "learn");
      return { type: "scenario", scenario: sc, role };
    },

    // Retourne { type: "scenario" | "intro" | "pre-done" | "learn-done" | "post-done" | "idle", ... }
    next() {
      const s = this.state;
      if (s.mode === "intro") return { type: "intro" };

      if (s.mode === "pre" || s.mode === "post") {
        const a = s.assess;
        if (a.idx < a.ids.length) {
          return { type: "scenario", scenario: this.byId(a.ids[a.idx]), role: s.mode, progress: [a.idx + 1, a.ids.length] };
        }
        const kind = a.kind;
        return { type: kind + "-done", result: this.finishAssess() };
      }

      const cid = this.nextConcept();
      if (s.mode === "learn") {
        if (!cid) {
          s.mode = "post";
          s.assess = this.buildAssess("post");
          this.save();
          return { type: "learn-done" };
        }
        return this.serve(cid);
      }
      // review
      if (!cid) return { type: "idle", nextDueAt: this.nextDueAt() };
      return this.serve(cid);
    },

    nextDueAt() {
      const due = conceptIds().map((id) => this.state.concepts[id]).filter((c) => c.box >= 1).map((c) => c.dueAt);
      return due.length ? Math.min.apply(null, due) : null;
    },

    // ---------- Réponses ----------
    answer(sc, opt, meta) {
      meta = meta || {};
      const s = this.state, ok = !!opt.ok, now = this.now();
      const c = s.concepts[sc.concept];
      const rec = { t: now, mode: s.mode, id: sc.id, concept: sc.concept, ok, conf: meta.conf || 0, ms: meta.ms || 0, generated: !!sc.generated };

      if (s.mode === "pre" || s.mode === "post") {
        s.assess.results.push({ id: sc.id, concept: sc.concept, ok, conf: rec.conf, ms: rec.ms });
        s.assess.idx += 1;
      } else {
        c.attempts += 1;
        c.seen.push(sc.id);
        if (ok) {
          c.box = c.box === 0 ? 1 : Math.min(c.box + 1, MAX_BOX);
          c.dueAt = now + INTERVALS[c.box];
          c.lastWrong = false;
        } else {
          c.errors += 1;
          c.box = 0;
          c.dueAt = 0;
          c.lastWrong = true;
          sc.clues.forEach((cl) => { if (!c.missedClues.includes(cl)) c.missedClues.push(cl); });
        }
        rec.box = c.box;
      }
      if (!ok && rec.conf === 3) c.overconfident += 1;
      s.history.push(rec);
      this.save();
      return ok;
    },

    // ---------- Données pour l'IA, les stats et l'export ----------
    profile() {
      const C = this.state.concepts;
      const concepts = conceptIds().map((id) => ({
        concept: id, label: window.CONCEPTS[id].label,
        errors: C[id].errors, attempts: C[id].attempts, box: C[id].box,
        overconfident: C[id].overconfident, missedClues: C[id].missedClues.slice(-4)
      }));
      return { concepts, weak: concepts.filter((c) => c.errors > 0) };
    },

    stats() {
      const s = this.state, h = s.history;
      const learn = h.filter((x) => x.mode !== "pre" && x.mode !== "post");
      const good = learn.filter((x) => x.ok).length;
      const timed = h.filter((x) => x.ms > 0);
      return {
        pre: s.pre, post: s.post, preSkipped: s.preSkipped,
        total: learn.length, good, bad: learn.length - good,
        overconfident: h.filter((x) => !x.ok && x.conf === 3).length,
        underconfident: h.filter((x) => x.ok && x.conf === 1).length,
        avgMs: timed.length ? Math.round(timed.reduce((a, x) => a + x.ms, 0) / timed.length) : 0,
        generatedServed: h.filter((x) => x.generated).length,
        byConcept: conceptIds().map((id) => {
          const c = s.concepts[id];
          return { concept: id, label: window.CONCEPTS[id].label, icon: window.CONCEPTS[id].icon, attempts: c.attempts, errors: c.errors, overconfident: c.overconfident, box: c.box, dueAt: c.dueAt };
        })
      };
    },

    exportCSV() {
      const who = this.user() || "";
      const rows = [["profil", "date", "phase", "scenario", "concept", "correct", "confiance", "temps_ms", "boite", "genere_ia"]];
      this.state.history.forEach((x) => rows.push([
        who, new Date(x.t).toISOString(), x.mode, x.id, x.concept, x.ok ? 1 : 0, x.conf, x.ms, x.box == null ? "" : x.box, x.generated ? 1 : 0
      ]));
      return rows.map((r) => r.join(",")).join("\n");
    }
  };

  window.Engine = Engine;
})();
