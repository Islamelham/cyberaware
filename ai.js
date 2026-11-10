// Couche IA côté navigateur.
//
// Le navigateur ne parle JAMAIS directement au modèle : il appelle /api/generate sur le
// serveur local (voir server/), qui détient la clé API et fait travailler les agents
// (tuteur, générateur, critique). Si le serveur est absent (ouverture de index.html en
// double-clic), l'application fonctionne simplement avec les scénarios écrits à la main.
//
// Les scénarios générés sont conservés dans le navigateur pour les rappels des jours suivants.

(function () {
  "use strict";

  const KEY = "cyberaware.gen.v1";
  const MAX_STORED = 30;
  const KINDS = ["email", "sms", "call", "situation"];

  function validate(sc) {
    if (!sc || typeof sc !== "object" || !window.CONCEPTS[sc.concept]) return false;
    if (typeof sc.id !== "string" || !KINDS.includes(sc.kind)) return false;
    if (!Array.isArray(sc.options) || sc.options.length < 2) return false;
    if (sc.options.filter((o) => o && o.ok === true).length !== 1) return false;
    if (sc.options.some((o) => !o || typeof o.t !== "string" || typeof o.fb !== "string")) return false;
    if (!Array.isArray(sc.clues) || !sc.clues.length) return false;
    if (!sc.message || typeof sc.message.body !== "string") return false;
    if (!sc.charte || !sc.charte.ref || !sc.charte.text) return false;
    return ["title", "setup", "why", "report"].every((k) => typeof sc[k] === "string" && sc[k]);
  }

  let stored = [];
  try { stored = JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { stored = []; }
  // Un scénario généré n'est servi que dans l'organisation (domaine) pour laquelle il a été créé.
  const own = (s) => (s.orgDomain || "utbm.fr") === ((window.ORG && window.ORG.domain) || "utbm.fr");
  window.GENERATED_SCENARIOS = stored.filter(validate).slice(-MAX_STORED);

  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(window.GENERATED_SCENARIOS.slice(-MAX_STORED))); } catch (e) {}
  }

  const pending = new Set();

  const AI = {
    enabled: false,
    mode: null, // "live" (modèle réel) ou "mock" (simulation)
    validate,

    // Détecte la présence du backend.
    async init() {
      try {
        const r = await fetch("/api/health", { cache: "no-store" });
        if (!r.ok) return false;
        const j = await r.json();
        AI.enabled = !!j.ok;
        AI.mode = j.mode;
        return AI.enabled;
      } catch (e) { return false; }
    },

    // Scénarios générés pas encore joués pour ce thème.
    unseen(concept) {
      const E = window.Engine;
      const seen = E && E.state.concepts[concept] ? E.state.concepts[concept].seen : [];
      return window.GENERATED_SCENARIOS.filter((s) => s.concept === concept && own(s) && !seen.includes(s.id));
    },

    // Prépare en arrière-plan le prochain scénario d'un thème (sans bloquer l'interface).
    async prefetch(concept) {
      if (!AI.enabled || pending.has(concept) || AI.unseen(concept).length) return null;
      pending.add(concept);
      try { return await AI.generateScenario(concept); }
      catch (e) { return null; }
      finally { pending.delete(concept); }
    },

    async generateScenario(concept) {
      const E = window.Engine;
      const body = {
        concept,
        profile: E ? E.profile() : {},
        org: window.ORG && window.ORG.config ? window.ORG.config : null,
        avoidTitles: window.GENERATED_SCENARIOS.filter((s) => s.concept === concept && own(s)).map((s) => s.title).slice(-5)
      };
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 90000);
      try {
        const r = await fetch("/api/generate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: ctl.signal });
        if (!r.ok) return null;
        const j = await r.json();
        if (!j.ok || !validate(j.scenario)) return null;
        j.scenario.orgDomain = (window.ORG && window.ORG.domain) || "utbm.fr";
        window.GENERATED_SCENARIOS.push(j.scenario);
        persist();
        return j.scenario;
      } finally {
        clearTimeout(timer);
      }
    }
  };

  window.AI = AI;
})();
