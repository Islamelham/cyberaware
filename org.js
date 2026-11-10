// Personnalisation par organisation (nom, domaine, direction, canaux de signalement...).
// Module « universel » : utilisé par le navigateur (window.Org) ET par le serveur (require).
// Les scénarios de scenarios.js contiennent des jetons {{...}} remplacés par les valeurs de l'organisation.
// Tous les domaines PIÈGES sont fabriqués à partir du domaine réel de l'organisation, mais uniquement
// en extension réservée .example : aucun vrai domaine d'attaque n'est jamais créé ni cité.
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else { root.Org = api; if (root.SCENARIO_TEMPLATES) api.apply(api.DEFAULT); }
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const KINDS = { "entreprise": "l'entreprise", "établissement": "l'établissement", "organisation": "l'organisation", "association": "l'association", "collectivité": "la collectivité" };

  // Organisation de démonstration (exercice fictif). Seul vrai domaine : utbm.fr, côté légitime.
  const DEFAULT = {
    name: "UTBM (exercice fictif)", kind: "établissement", domain: "utbm.fr",
    director: "Marc Lefèvre", directorTitle: "Direction", itPhone: "4242",
    reportEmail: "cert@utbm.example", charteName: "Charte numérique (version fictive pour l'exercice)",
    sector: "enseignement supérieur", departments: ["Scolarité", "Ressources humaines", "Comptabilité", "Achats", "Informatique"], tools: ["Messagerie", "ENT", "VPN"]
  };

  const strip = (v, max) => String(v == null ? "" : v).replace(/[\u0000-\u001f\u007f<>`{}]/g, "").replace(/\s+/g, " ").trim().slice(0, max);
  const DOMAIN_RE = /^(?=.{4,60}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/;
  const RESERVED = /\.(example|test|invalid|local|localhost)$/;
  const MAIL_RE = /^[a-z0-9._%+-]{1,40}@([a-z0-9-]+\.)+[a-z]{2,24}$/i;

  // Valide et nettoie une configuration. Renvoie { ok, cfg, errors }.
  function validate(input, opts) {
    const o = input && typeof input === "object" ? input : {};
    const errors = [];
    const cfg = {};
    cfg.name = strip(o.name, 60);
    if (cfg.name.length < 2) errors.push("Le nom de l'organisation est obligatoire (2 caractères minimum).");
    cfg.kind = Object.prototype.hasOwnProperty.call(KINDS, o.kind) ? o.kind : "entreprise";
    cfg.domain = strip(o.domain, 60).toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
    if (!DOMAIN_RE.test(cfg.domain) || RESERVED.test(cfg.domain)) errors.push("Le nom de domaine n'est pas valide (exemple : mon-entreprise.fr).");
    cfg.director = strip(o.director, 40) || "Marc Lefèvre";
    cfg.directorTitle = strip(o.directorTitle, 30) || "Direction";
    cfg.itPhone = strip(o.itPhone, 20).replace(/[^0-9 +().-]/g, "") || "4242";
    const mail = strip(o.reportEmail, 60);
    cfg.reportEmail = mail && MAIL_RE.test(mail) ? mail : (DOMAIN_RE.test(cfg.domain) ? "securite@" + cfg.domain : "");
    if (mail && !MAIL_RE.test(mail)) errors.push("L'adresse de signalement n'est pas valide.");
    cfg.charteName = strip(o.charteName, 60) || "Charte informatique";
    cfg.sector = strip(o.sector, 40);
    const list = (v, n, m) => (Array.isArray(v) ? v : String(v || "").split(/[,;\n]/)).map((x) => strip(x, m)).filter(Boolean).slice(0, n);
    cfg.departments = list(o.departments, 10, 30);
    cfg.tools = list(o.tools, 8, 24);
    return { ok: errors.length === 0, cfg, errors };
  }

  function typo(brand) {
    if (brand.includes("m")) return { b: brand.replace("m", "rn"), exp: "les lettres « r » et « n » collées imitent le « m »" };
    if (brand.includes("w")) return { b: brand.replace("w", "vv"), exp: "les deux « v » collés imitent le « w »" };
    if (brand.includes("o")) return { b: brand.replace("o", "0"), exp: "le chiffre zéro imite la lettre « o »" };
    if (brand.includes("i")) return { b: brand.replace("i", "l"), exp: "le « l » minuscule imite le « i »" };
    const l = brand[brand.length - 1];
    return { b: brand + l, exp: "une lettre est doublée" };
  }

  // Jetons utilisés par les scénarios.
  function tokens(cfg) {
    const c = validate(Object.assign({}, DEFAULT, cfg || {})).cfg;
    const brand = c.domain.split(".")[0].replace(/[^a-z0-9-]/g, "") || "organisation";
    const t = typo(brand);
    const parts = c.director.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().split(/\s+/).filter(Boolean);
    const gmail = (parts.length > 1 ? parts[0][0] + "." + parts[parts.length - 1] : parts[0] || "direction").replace(/[^a-z0-9.]/g, "") + ".dg@gmail.com";
    return {
      org: c.name, the_org: KINDS[c.kind], domain: c.domain, brand, BRAND: brand.toUpperCase(),
      typohost: t.b + ".example", typobrand: t.b, typoexp: t.exp,
      director: c.director, directortitle: c.directorTitle, directorgmail: gmail,
      itphone: c.itPhone, reportmail: c.reportEmail, charte: c.charteName
    };
  }

  // Domaines pièges fabriqués pour cette organisation (tous en .example).
  function lookalikes(cfg) {
    const t = tokens(cfg);
    return [t.typohost, t.brand + "-support.example", t.domain + ".autre-site.example", t.brand + "-verif-compte.example"];
  }

  function render(v, tk) {
    if (typeof v === "string") return v.replace(/\{\{(\w+)\}\}/g, (m, k) => (Object.prototype.hasOwnProperty.call(tk, k) ? tk[k] : ""));
    if (Array.isArray(v)) return v.map((x) => render(x, tk));
    if (v && typeof v === "object") { const o = {}; Object.keys(v).forEach((k) => { o[k] = render(v[k], tk); }); return o; }
    return v;
  }

  function orgInfo(cfg) {
    const c = validate(Object.assign({}, DEFAULT, cfg || {})).cfg;
    return { name: c.name, domain: c.domain, charteName: c.charteName, reportChannel: "bouton « Signaler » du client mail, ou " + c.reportEmail + ", ou poste " + c.itPhone, config: c };
  }

  // Navigateur : régénère la banque de scénarios pour l'organisation donnée.
  function apply(cfg) {
    const w = typeof window !== "undefined" ? window : null;
    if (!w || !w.SCENARIO_TEMPLATES) return null;
    const tk = tokens(cfg);
    w.ORG = orgInfo(cfg);
    w.SCENARIOS = render(w.SCENARIO_TEMPLATES, tk);
    return w.ORG;
  }

  return { DEFAULT, KINDS, validate, tokens, lookalikes, render, orgInfo, apply };
});
