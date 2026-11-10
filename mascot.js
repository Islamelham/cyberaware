// Mascotte : personnage ORIGINAL dessiné en SVG (aucune image externe, aucune photo).
// Dessin stylisé inspiré d'une personne réelle : longs cheveux châtains, sourcils marqués,
// blazer sombre, et une casquette à écusson de bouclier (désactivable : Mascot.look.cap = false).
// Elle change d'humeur selon la situation et sa bouche bouge pendant qu'elle « parle ».
// Aucun style inline : les couleurs sont dans style.css (compatible CSP).

(function () {
  "use strict";

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const eye = (cx, cy, r) => `<circle class="m-eye" cx="${cx}" cy="${cy}" r="${r}"/>`;
  const brows = (l, r) => `<path class="m-brow" d="${l}"/><path class="m-brow" d="${r}"/>`;
  const spark = (x, y, s) => `<path class="m-spark" transform="translate(${x} ${y}) scale(${s})" d="M0 -8 L2 -2 L8 0 L2 2 L0 8 L-2 2 L-8 0 L-2 -2 Z"/>`;
  const still = (inner) => `<g class="m-still">${inner}</g>`;
  // Bouche « qui parle » : affichée à la place de la bouche normale pendant que la bulle s'exprime.
  const TALK = '<ellipse class="m-talk m-mouth" cx="60" cy="96" rx="7" ry="5"/>';

  const MOODS = {
    // Neutre : elle observe
    neutral: {
      eyes: brows("M39 74 q9 -5 18 -1", "M63 73 q9 -4 18 1") + `<g class="m-eyes">${eye(48, 81, 4.5)}${eye(72, 81, 4.5)}</g>`,
      mouth: still('<path class="m-line" d="M52 95 q8 5 16 0"/>') + TALK,
      extra: ""
    },
    // Contente : bonne réponse, félicitations
    happy: {
      eyes: brows("M40 72 q8 -6 16 -2", "M64 70 q8 -4 16 2") + '<path class="m-line" d="M42 83 q6 -8 12 0"/><path class="m-line" d="M66 83 q6 -8 12 0"/>',
      mouth: still('<path class="m-mouth" d="M49 92 q11 14 22 0 z"/>') + TALK,
      extra: spark(106, 46, 1) + spark(12, 54, 0.7)
    },
    // Inquiète : mauvaise réponse, mais on corrige ensemble
    worried: {
      eyes: brows("M39 76 l17 -5", "M81 76 l-17 -5") + `<g class="m-eyes">${eye(48, 82, 4.5)}${eye(72, 82, 4.5)}</g>`,
      mouth: still('<path class="m-line" d="M51 99 q4.5 -4 9 0 q4.5 4 9 0"/>') + TALK,
      extra: '<path class="m-drop" d="M106 64 q5 9 0 12 q-5 -3 0 -12 z"/>'
    },
    // Réfléchit : question de confiance, indices
    thinking: {
      eyes: brows("M39 71 q9 -6 18 -2", "M63 74 q9 -3 18 0") + `<g class="m-eyes">${eye(50, 79, 4.5)}${eye(74, 79, 4.5)}</g>`,
      mouth: still('<path class="m-line" d="M54 96 h12"/>') + TALK,
      extra: '<text class="m-extra" x="102" y="46" font-size="26">?</text>'
    },
    // Alerte : erreur commise avec une grande confiance
    alert: {
      eyes: brows("M39 68 q9 -6 18 -1", "M63 67 q9 -5 18 0") + `<g class="m-eyes">${eye(48, 81, 6)}${eye(72, 81, 6)}</g>`,
      mouth: still('<ellipse class="m-mouth" cx="60" cy="98" rx="4.5" ry="5.5"/>') + TALK,
      extra: '<text class="m-extra" x="102" y="46" font-size="26">!</text>'
    }
  };

  // Casquette avec écusson de bouclier (la visière dépasse vers l'avant).
  const CAP =
    '<path class="m-cap" d="M27 58 C27 12 93 12 93 58 Z"/>' +
    '<path class="m-cap" d="M24 62 q0 -5 6 -5 h76 q10 0 10 6 q0 5 -10 5 h-76 q-6 0 -6 -6 z"/>' +
    '<path class="m-badge" d="M60 28 l9 3 v8 q0 8 -9 11 q-9 -3 -9 -11 v-8 z"/>' +
    '<path class="m-check" d="M55 39 l4 4 l7 -8"/>';

  // Sans casquette : raie au milieu, les cheveux encadrent le visage.
  const HAIR_TOP = '<path class="m-hair" d="M27 70 C22 26 98 26 93 70 C90 58 82 50 68 49 C58 56 40 60 27 70 Z"/>';

  function svg(mood) {
    const m = MOODS[mood] || MOODS.neutral;
    const top = api.look.cap ? CAP : HAIR_TOP;
    return `<svg class="mascot-svg" viewBox="0 0 120 132" role="img" aria-label="${esc(api.name)}, la mascotte" xmlns="http://www.w3.org/2000/svg">
  <path class="m-hair" d="M24 74 C20 28 100 28 96 74 L100 112 L20 112 Z"/>
  <path class="m-blazer" d="M12 132 q0 -26 48 -26 q48 0 48 26 z"/>
  <path class="m-shirt" d="M47 107 L60 126 L73 107 Z"/>
  <rect class="m-skin" x="52" y="98" width="16" height="14" rx="6"/>
  <ellipse class="m-face" cx="60" cy="70" rx="33" ry="36"/>
  <circle class="m-blush" cx="43" cy="91" r="5"/><circle class="m-blush" cx="77" cy="91" r="5"/>
  <path class="m-nose" d="M59 84 q-2 5 2 6"/>
  ${m.eyes}${m.mouth}
  <path class="m-hair" d="M29 60 C20 82 20 106 28 124 C33 127 40 122 39 112 C38 98 35 80 33 64 Z"/>
  <path class="m-hair" d="M91 60 C100 82 100 106 92 124 C87 127 80 122 81 112 C82 98 85 80 87 64 Z"/>
  <path class="m-hl" d="M26 84 C24 96 25 108 29 117"/><path class="m-hl" d="M94 84 C96 96 95 108 91 117"/>
  ${top}${m.extra}
</svg>`;
  }

  let uid = 0;

  // Mascotte + bulle de dialogue. La bouche bouge pendant une durée proportionnelle au texte.
  function html(mood, text) {
    const k = MOODS[mood] ? mood : "neutral";
    const id = "t" + (++uid);
    const dur = Math.min(3500, Math.max(900, String(text).length * 45));
    if (typeof document !== "undefined") {
      setTimeout(() => {
        const el = document.querySelector('[data-talk="' + id + '"]');
        if (el) el.classList.remove("talking");
      }, dur);
    }
    return `<div class="coach"><div class="mascot mood-${k} talking" data-talk="${id}">${svg(k)}</div><div class="bubble" role="status"><b class="who">${esc(api.name)}</b>${esc(text)}</div></div>`;
  }

  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // name : prénom affiché dans les bulles. look.cap : true/false pour garder ou retirer la casquette.
  const api = { name: "Islam", look: { cap: true }, moods: Object.keys(MOODS), svg, html, pick };
  window.Mascot = api;
})();
