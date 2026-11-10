(function () {
  "use strict";
  const app = document.getElementById("app");
  const progress = document.getElementById("progress");
  const aiBadge = document.getElementById("aibadge");
  const streakEl = document.getElementById("streak");
  const barFill = document.getElementById("barfill");
  const E = window.Engine;
  const AI = window.AI;
  const M = window.Mascot;
  const DAY = 86400000;

  const h = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const nConcepts = () => Object.keys(window.CONCEPTS).length;
  const coach = (mood, text) => M.html(mood, text);

  function setCoach(mood, text) {
    const el = document.getElementById("coach");
    if (el) el.innerHTML = coach(mood, text);
  }

  // ---------- Phrases de Gaspard ----------
  const INTRO = {
    email: "Un nouveau mail vient d'arriver. Regardez bien l'expéditeur et le lien avant de répondre.",
    sms: "Un message sur votre téléphone… Qui l'envoie, et que veut-il vraiment ?",
    call: "Ça sonne ! Écoutez bien ce qu'on vous demande.",
    situation: "Vous êtes sur place. Observez bien la scène."
  };
  const ROLE_INTRO = {
    pre: "Test de niveau : répondez comme vous le feriez au bureau. Je ne corrige pas tout de suite !",
    post: "Test final ! Montrez-moi ce que vous avez retenu.",
    retry: "On réessaie avec un autre cas. Prenez votre temps !",
    review: "Petit rappel ! Voyons si ça reste bien en tête."
  };
  const RIGHT = ["Bien vu !", "Exactement !", "Bon réflexe !", "Parfait, c'est ça !"];
  const WRONG = ["Pas grave, c'est comme ça qu'on apprend. Regardez les indices !", "Aïe ! Regardons ensemble ce qui aurait dû vous alerter.", "Presque ! Les indices vont vous aider."];
  const NOTED = ["Réponse notée !", "C'est enregistré.", "Noté ! On continue."];

  // ---------- Petits effets ----------
  function streak() {
    let n = 0;
    const hist = E.state.history;
    for (let i = hist.length - 1; i >= 0; i--) { if (hist[i].ok) n++; else break; }
    return n;
  }

  function confetti() {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const layer = document.createElement("div");
    layer.className = "confetti";
    layer.setAttribute("aria-hidden", "true");
    const glyphs = ["🎉", "✨", "🛡️", "⭐", "💙"];
    for (let i = 0; i < 24; i++) {
      const s = document.createElement("span");
      s.textContent = glyphs[i % glyphs.length];
      s.style.left = Math.round(Math.random() * 96) + "%"; // via CSSOM : autorisé par la CSP
      s.style.animationDelay = (Math.random() * 0.7).toFixed(2) + "s";
      s.style.fontSize = Math.round(16 + Math.random() * 16) + "px";
      layer.appendChild(s);
    }
    document.body.appendChild(layer);
    setTimeout(() => layer.remove(), 3500);
  }

  function delay(ms) {
    if (ms < 1000) return "quelques instants";
    if (ms < 60000) return Math.ceil(ms / 1000) + " s";
    if (ms < 3600000) return Math.ceil(ms / 60000) + " min";
    if (ms < 23 * 3600000) return Math.ceil(ms / 3600000) + " h"; // au-delà de 23 h on parle en jours
    const d = Math.ceil(ms / DAY);
    return d + " jour" + (d > 1 ? "s" : "");
  }

  function renderProgress() {
    const now = E.now();
    const entries = Object.entries(E.state.concepts);
    progress.innerHTML = entries.map(([id, c]) => {
      const due = c.box >= 1 && c.dueAt <= now;
      const cls = due ? "due" : c.box >= 1 ? "full" : c.attempts > 0 ? "half" : "";
      return `<span class="dot ${cls}" title="${h(window.CONCEPTS[id].label)}">${window.CONCEPTS[id].icon}</span>`;
    }).join("");
    if (barFill) barFill.style.width = Math.round(100 * entries.filter(([, c]) => c.box >= 1).length / entries.length) + "%";
    if (streakEl) {
      const st = streak();
      streakEl.hidden = st < 2;
      streakEl.textContent = "🔥 " + st;
    }
  }

  // ---------- Aiguillage ----------
  function route() {
    if (!E.user()) return profileScreen();
    report();
    renderProgress();
    const n = E.next();
    switch (n.type) {
      case "intro": return home();
      case "scenario":
        // Hors tests, c'est le parcours qui lance les leçons : on affiche la carte.
        if (!lesson && n.role !== "pre" && n.role !== "post") return home();
        return showScenario(n);
      case "pre-done": return preDone(n.result);
      case "learn-done": return learnDone();
      case "post-done": return postDone(n.result);
      case "idle": return home();
    }
  }

  // ---------- Écrans ----------
  // ---------- Profils ----------
  function profileScreen() {
    lesson = null;
    renderProgress();
    const list = E.users();
    app.innerHTML = `
      <div class="card">
        ${coach("happy", list.length ? "Re-bonjour ! Qui joue maintenant ? Choisissez votre profil ou créez-en un." : `Salut, je suis ${M.name} ! Comment vous appelez-vous ? Je garderai votre progression.`)}
        <h1>Qui êtes-vous ?</h1>
        ${list.length ? `<div class="plist">${list.map((n) => `<div class="prow"><button class="btn secondary pbtn" data-n="${h(n)}">👤 ${h(n)}</button><button class="pdel" data-d="${h(n)}" aria-label="Supprimer le profil ${h(n)}">✕</button></div>`).join("")}</div><p class="muted mt">Ou nouveau profil :</p>` : ""}
        <input id="pname" class="field" maxlength="24" placeholder="Prénom ou pseudo" autocomplete="off" aria-label="Votre prénom ou pseudo">
        <button class="btn" id="pgo">${list.length ? "Créer ce profil" : "Commencer"}</button>
        <p class="muted small">Pas de mot de passe : choisissez un prénom ou un pseudo. La progression reste sur cet appareil, dans ce navigateur.${getOrg() ? " Vos résultats (scores, niveaux) sont partagés avec votre entreprise." : ""}</p>
      </div>
      <div class="card">
        <p class="muted small">${orgLine()}${getOrg() ? ' · <button class="linkbtn" id="leave">Quitter cet espace</button>' : ""}</p>
        <button class="btn secondary" id="join">🏢 Rejoindre mon entreprise (code)</button>
        <button class="btn secondary" id="admin">🛠 Espace administrateur</button>
      </div>`;
    document.getElementById("join").onclick = () => joinScreen("");
    document.getElementById("admin").onclick = () => (getAdmin() ? adminHome() : adminScreen("", "login"));
    const lv = document.getElementById("leave"); if (lv) lv.onclick = leaveOrg;
    const enter = (name) => { if (E.setProfile(name)) { renderProgress(); route(); } };
    const input = document.getElementById("pname");
    document.getElementById("pgo").onclick = () => { if (input.value.trim()) enter(input.value); else input.focus(); };
    input.onkeydown = (ev) => { if (ev.key === "Enter") document.getElementById("pgo").click(); };
    app.querySelectorAll(".pbtn").forEach((b) => (b.onclick = () => enter(b.dataset.n)));
    app.querySelectorAll(".pdel").forEach((b) => (b.onclick = () => {
      if (window.confirm(`Supprimer le profil « ${b.dataset.d} » et toute sa progression ?`)) { E.removeProfile(b.dataset.d); profileScreen(); }
    }));
  }

  // ---------- Parcours (écran d'accueil façon « carte de leçons ») ----------
  // Chaque thème est une étape. Les modules ne sont qu'un regroupement visuel.
  const MODULES = [
    { title: "Module 1 · Messages piégés", sub: "Ce qui arrive dans votre boîte et sur votre téléphone", ids: ["phishing", "smishing", "dns", "vishing"] },
    { title: "Module 2 · Sur le terrain", sub: "Quand l'attaque passe par une personne ou un objet", ids: ["ceo", "usb", "physical"] },
    { title: "Module 3 · Mon quotidien numérique", sub: "Les bons réflexes de tous les jours", ids: ["password", "mobile", "social", "properso", "ransom"] }
  ];
  let lesson = null; // { cid, n, ok } pendant une leçon

  const xp = () => E.state.history.filter((x) => x.ok).length * 10;

  function home() {
    lesson = null;
    renderProgress();
    const now = E.now(), C = E.state.concepts, mode = E.state.mode;
    const learning = mode === "intro" || mode === "learn";
    const playable = (id) => (learning ? C[id].box === 0 : C[id].box >= 1 && C[id].dueAt <= now);
    const rec = E.nextConcept();
    const ids = Object.keys(window.CONCEPTS);
    const listed = MODULES.reduce((a, m) => a.concat(m.ids), []);
    const mods = MODULES.map((m) => ({ ...m, ids: m.ids.filter((i) => ids.includes(i)) }));
    mods[mods.length - 1].ids = mods[mods.length - 1].ids.concat(ids.filter((i) => !listed.includes(i)));
    const mastered = ids.filter((i) => C[i].box >= 1).length;
    const pending = E.pending().length;

    const inTest = mode === "pre" || mode === "post";
    let say;
    if (mode === "intro") say = `Salut, je suis ${M.name} ! Voici votre parcours : ${ids.length} leçons pour repérer les arnaques. Faites d'abord le test de niveau, ou choisissez directement une leçon.`;
    else if (learning) say = pending ? `Il reste ${pending} leçon(s). Je vous conseille celle qui brille !` : "Tout est maîtrisé !";
    else if (mode === "pre" || mode === "post") say = "Votre test est en pause. Vos réponses sont gardées : reprenez quand vous voulez.";
    else say = pending ? `${pending} rappel(s) vous attendent : touchez les leçons qui clignotent.` : `Tout est à jour ! Prochain rappel dans ${delay(Math.max(0, (E.nextDueAt() || 0) - now))}.`;

    const node = (id, i) => {
      const c = C[id], due = c.box >= 1 && c.dueAt <= now, done = c.box >= 1 && !due;
      const can = playable(id);
      const cls = ["node", done ? "done" : "", due ? "due" : "", id === rec && can ? "current" : "", can ? "" : "locked"].join(" ");
      const stars = "★".repeat(c.box) + "☆".repeat(3 - c.box);
      return `
        <div class="step pos${i % 4}">
          ${id === rec && can ? '<span class="go-tag">COMMENCER</span>' : ""}
          <button class="${cls}" data-c="${id}" aria-label="${h(window.CONCEPTS[id].label)}${done ? ", maîtrisé" : ""}${due ? ", rappel à faire" : ""}">${done ? "✓" : window.CONCEPTS[id].icon}</button>
          <span class="step-name">${h(window.CONCEPTS[id].label)}</span>
          <span class="stars" aria-hidden="true">${stars}</span>
        </div>`;
    };

    app.innerHTML = `
      <div class="home">
        <div class="card">
          <p class="muted small who-line">${orgLine()}<br>👤 <b>${h(E.user())}</b> · <button class="linkbtn" id="switch">Changer de profil</button></p>
          <div id="coach">${coach(mode === "intro" ? "happy" : "neutral", say)}</div>
          <div class="stats">
            <div class="stat"><b>🔥 ${streak()}</b>série</div>
            <div class="stat"><b>⭐ ${xp()}</b>points</div>
            <div class="stat"><b>${mastered}/${ids.length}</b>maîtrisés</div>
          </div>
          ${mode === "intro" ? `
            <button class="btn" id="pre">🎯 Test de niveau (${ids.length} questions)</button>
            <p class="muted small">Pour mesurer d'où vous partez. Facultatif : vous pouvez aussi toucher une leçon ci-dessous.</p>` : ""}
          ${inTest ? `<button class="btn" id="resume">▶ Reprendre le ${mode === "pre" ? "test de niveau" : "test final"}</button>` : ""}
          ${E.demo ? '<p class="muted small">Mode démo actif : les rappels reviennent en quelques secondes.</p>' : ""}
        </div>
        ${mods.map((m, k) => {
          const n0 = mods.slice(0, k).reduce((a, x) => a + x.ids.length, 0);
          return `<section class="module">
            <div class="mod-head m${k % 3}"><b>${h(m.title)}</b><span>${h(m.sub)}</span></div>
            <div class="path">${m.ids.map((id, i) => node(id, n0 + i)).join("")}</div>
          </section>`;
        }).join("")}
        <div class="card">
          <button class="btn secondary" id="stats">📊 Mes statistiques</button>
          <button class="btn secondary" id="reset">Recommencer à zéro</button>
        </div>
      </div>`;

    const resumeBtn = document.getElementById("resume");
    if (resumeBtn) resumeBtn.onclick = route;
    const pre = document.getElementById("pre");
    if (pre) pre.onclick = () => { E.start(false); route(); };
    app.querySelectorAll(".node").forEach((b) => (b.onclick = () => {
      const id = b.dataset.c;
      if (!playable(id)) {
        setCoach("neutral", C[id].box >= 1 ? "Cette leçon est maîtrisée. Elle reviendra en rappel au bon moment." : "Cette leçon n'est pas disponible.");
        return;
      }
      startLesson(id);
    }));
    document.getElementById("stats").onclick = statsScreen;
    document.getElementById("reset").onclick = confirmReset;
    document.getElementById("switch").onclick = () => { E.logout(); profileScreen(); };
  }

  function startLesson(cid) {
    if (E.state.mode === "intro") E.start(true);
    lesson = { cid, n: 0, ok: 0 };
    lessonStep();
  }

  // Une leçon = 2 scénarios du thème (plus de nouvelles chances après une erreur, 4 au maximum).
  function lessonStep() {
    const c = E.state.concepts[lesson.cid];
    if ((lesson.n >= 2 && !c.lastWrong) || lesson.n >= 4) return lessonDone();
    const n = E.serve(lesson.cid);
    lesson.n++;
    showScenario(n);
  }

  function lessonDone() {
    renderProgress();
    const L = lesson, c = E.state.concepts[L.cid], info = window.CONCEPTS[L.cid];
    const perfect = L.ok === L.n;
    app.innerHTML = `
      <div class="card">
        ${coach(perfect ? "happy" : "neutral", perfect ? "Sans faute, bravo !" : "Bien joué ! Cette notion reviendra en rappel pour qu'elle s'ancre.")}
        <h1>${info.icon} Leçon terminée</h1>
        <p class="muted">${h(info.label)}</p>
        <div class="stats">
          <div class="stat"><b>${L.ok}/${L.n}</b>bonnes réponses</div>
          <div class="stat"><b>+${L.ok * 10}</b>points</div>
          <div class="stat"><b>${"★".repeat(c.box)}${"☆".repeat(3 - c.box)}</b>niveau</div>
        </div>
        <button class="btn" id="back">Retour au parcours</button>
      </div>`;
    document.getElementById("back").onclick = () => { lesson = null; route(); };
    if (perfect) confetti();
  }

  function confirmReset() {
    if (window.confirm("Effacer toute la progression et les statistiques ?")) { E.reset(); renderProgress(); home(); }
  }

  function messageHTML(sc) {
    const m = sc.message;
    const label = { email: "Email", sms: "Message", call: "Appel", situation: "Situation" }[sc.kind] || "";
    return `
      <div class="msg">
        <div class="from">${h(label)} · ${h(m.from || "")}</div>
        ${m.subject ? `<div class="subj">${h(m.subject)}</div>` : ""}
        <div>${h(m.body)}</div>
        ${m.link ? `<span class="link">${h(m.link)}</span>` : ""}
      </div>`;
  }

  function showScenario(n) {
    renderProgress();
    const sc = n.scenario, role = n.role;
    const assess = role === "pre" || role === "post";
    const roleLabel = lesson && !assess ? `📖 Leçon · ${lesson.n}${role === "retry" ? " · nouvelle chance" : ""}` : { pre: "📝 Test de niveau", post: "🏁 Test final", retry: "🔁 Nouvelle chance", review: "⏰ Rappel" }[role];
    const prog = n.progress ? ` · ${n.progress[0]}/${n.progress[1]}` : "";
    const intro = ROLE_INTRO[role] || INTRO[sc.kind] || "Observez bien, puis choisissez.";
    // Ordre d'affichage aléatoire : la bonne réponse change de place à chaque affichage.
    const order = sc.options.map((_, i) => i);
    for (let k = order.length - 1; k > 0; k--) { const r = Math.floor(Math.random() * (k + 1)); [order[k], order[r]] = [order[r], order[k]]; }
    app.innerHTML = `
      <div class="card">
        <button class="backlink" id="quit">← Parcours</button>
        <div id="coach">${coach("neutral", intro)}</div>
        <span class="tag">${window.CONCEPTS[sc.concept].icon} ${h(window.CONCEPTS[sc.concept].label)}</span>
        ${roleLabel ? `<span class="tag">${roleLabel}${prog}</span>` : ""}
        ${sc.generated ? `<span class="tag ai">${sc.source === "llm" ? "✨ généré par IA" : "✨ généré (simulation)"}</span>` : ""}
        <h2>${h(sc.title)}</h2>
        <p class="muted">${h(sc.setup)}</p>
        ${messageHTML(sc)}
        <p><b>Que faites-vous ?</b></p>
        <div id="opts">
          ${order.map((i) => `<button class="opt" data-i="${i}">${h(sc.options[i].t)}</button>`).join("")}
        </div>
        <div id="conf"></div>
        <div id="fb"></div>
      </div>`;

    document.getElementById("quit").onclick = () => home(); // quitter sans perdre ce qui est déjà enregistré
    const t0 = Date.now();
    let chosen = null;
    app.querySelectorAll("#opts .opt").forEach((b) => (b.onclick = () => choose(+b.dataset.i)));

    function choose(i) {
      if (chosen !== null) return;
      chosen = i;
      const ms = Date.now() - t0;
      app.querySelectorAll("#opts .opt").forEach((b, j) => { b.disabled = true; if (+b.dataset.i === i) b.classList.add("sel"); });
      setCoach("thinking", "Hmm… et vous êtes sûr de votre choix ? Dites-moi à quel point.");
      const conf = document.getElementById("conf");
      conf.innerHTML = `
        <p class="mt"><b>Quel est votre niveau de confiance ?</b></p>
        <div class="confrow">
          <button class="chip" data-c="1">🤔 Pas sûr</button>
          <button class="chip" data-c="2">🙂 Plutôt sûr</button>
          <button class="chip" data-c="3">😎 Certain</button>
        </div>`;
      conf.querySelectorAll("button").forEach((b) => (b.onclick = () => finalize(i, ms, +b.dataset.c)));
      if (conf.scrollIntoView) conf.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    function finalize(i, ms, confidence) {
      const opt = sc.options[i];
      const ok = E.answer(sc, opt, { conf: confidence, ms });
      if (lesson && ok) lesson.ok++;
      report();
      renderProgress();
      document.getElementById("conf").innerHTML = "";
      if (AI && AI.enabled && !assess) AI.prefetch(sc.concept);
      const fb = document.getElementById("fb");

      if (assess) {
        setCoach("neutral", M.pick(NOTED));
        fb.innerHTML = `
          <div class="feedback neutral">
            <b>Réponse enregistrée</b>
            <p class="muted">Les corrections viennent après le test.</p>
            <button class="btn" id="next">Continuer</button>
          </div>`;
      } else {
        const st = streak();
        if (ok) setCoach("happy", (confidence === 3 ? "Et vous étiez sûr de vous, bravo ! " : "") + M.pick(RIGHT) + (st >= 3 ? ` 🔥 Série de ${st} !` : ""));
        else if (confidence === 3) setCoach("alert", "Aïe, vous étiez certain… c'est justement le piège de ces attaques ! Regardez bien les indices.");
        else setCoach("worried", M.pick(WRONG));

        app.querySelectorAll("#opts .opt").forEach((b, j) => {
          if (sc.options[+b.dataset.i].ok) b.classList.add("good");
          else if (+b.dataset.i === i) b.classList.add("bad");
        });
        const c = E.state.concepts[sc.concept];
        const note = ok
          ? (c.box >= 1 ? `<p class="muted">Prochain rappel sur ce thème dans ${h(delay(Math.max(0, c.dueAt - E.now())))}.</p>` : "")
          : '<p class="muted">Cette notion reviendra dans un scénario différent.</p>';
        fb.innerHTML = `
          <div class="feedback ${ok ? "" : "ko"}">
            <b>${ok ? "✅ Bonne réponse" : "❌ Pas tout à fait"}</b>
            <p>${h(opt.fb)}</p>
            <p><b>Indices à repérer :</b></p>
            <ul>${sc.clues.map((cl) => `<li>${h(cl)}</li>`).join("")}</ul>
            <p>${h(sc.why)}</p>
            ${sc.vector || sc.lever ? `<p class="muted">🎯 <b>Vecteur d'attaque :</b> ${h(sc.vector || "—")}<br>🧠 <b>Levier humain exploité :</b> ${h(sc.lever || "—")}</p>` : ""}
            <div class="box">📘 <b>${h(window.ORG.charteName)} — ${h(sc.charte.ref)}</b><br>${h(sc.charte.text)}</div>
            <div class="box">🚨 <b>Signalement :</b> ${h(sc.report)}<br><span class="muted">Canal : ${h(window.ORG.reportChannel)}</span></div>
            ${sc.kit ? `<p class="muted">📚 Source : Kit de sensibilisation Cybermalveillance.gouv.fr, ${h(sc.kit)} (Licence Ouverte Etalab 2.0)</p>` : ""}
            ${note}
            <button class="btn" id="next">Continuer</button>
          </div>`;
      }
      document.getElementById("next").onclick = lesson ? lessonStep : route;
      if (fb.scrollIntoView) fb.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  function preDone(r) {
    renderProgress();
    const missed = r.results.filter((x) => !x.ok).map((x) => window.CONCEPTS[x.concept].label);
    app.innerHTML = `
      <div class="card">
        ${coach(r.score >= 5 ? "happy" : "neutral", r.score >= 5 ? "Très bon départ ! Je vous aide à peaufiner les derniers points." : "Voilà d'où vous partez. Aucun souci : je vous accompagne pas à pas !")}
        <h1>Test de niveau terminé</h1>
        <div class="stats one"><div class="stat"><b>${r.score}/${r.total}</b>bonnes réponses</div></div>
        ${missed.length ? `<p class="mt">À travailler en priorité :</p><ul>${missed.map((m) => `<li>${h(m)}</li>`).join("")}</ul>` : "<p>Aucune erreur, bravo !</p>"}
        <p class="muted">L'apprentissage commence : chaque notion non maîtrisée reviendra dans un scénario différent.</p>
        <button class="btn" id="go">Commencer l'apprentissage</button>
      </div>`;
    document.getElementById("go").onclick = route;
  }

  function learnDone() {
    renderProgress();
    app.innerHTML = `
      <div class="card">
        ${coach("happy", "Bravo, les " + nConcepts() + " types d'attaques sont maîtrisés ! Dernière étape : le test final.")}
        <h1>🎉 Apprentissage terminé</h1>
        <p class="muted">Le test final comporte ${nConcepts()} questions, sans correction, pour mesurer votre progression.</p>
        <button class="btn" id="go">Lancer le test final</button>
      </div>`;
    document.getElementById("go").onclick = route;
    confetti();
  }

  function postDone(r) {
    renderProgress();
    const pre = E.state.pre;
    const compare = pre
      ? `<div class="stats"><div class="stat"><b>${pre.score}/${pre.total}</b>au départ</div><div class="stat"><b>${r.score}/${r.total}</b>test final</div><div class="stat"><b>${r.score - pre.score >= 0 ? "+" : ""}${r.score - pre.score}</b>progression</div></div>`
      : `<div class="stats one"><div class="stat"><b>${r.score}/${r.total}</b>test final</div></div>`;
    const great = pre ? r.score >= pre.score : r.score >= Math.ceil(r.total * 0.7);
    app.innerHTML = `
      <div class="card">
        ${coach(great ? "happy" : "worried", great ? "Quelle progression ! Vous voilà bien armé contre les arnaques." : "Il reste quelques points fragiles, mais les rappels vont les consolider.")}
        <h1>🏁 Test final terminé</h1>
        ${compare}
        <p class="muted mt">Vous recevrez des rappels espacés (1 jour, 7 jours, 30 jours) pour ancrer ces réflexes.</p>
        <button class="btn" id="stats">Voir mes statistiques</button>
        <button class="btn secondary" id="go">Terminer</button>
      </div>`;
    document.getElementById("stats").onclick = statsScreen;
    document.getElementById("go").onclick = route;
    if (great) confetti();
  }

  function downloadCSV() {
    const blob = new Blob([E.exportCSV()], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "cyberaware-resultats.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function statsScreen() {
    renderProgress();
    const s = E.stats();
    const now = E.now();
    const rows = s.byConcept.map((c) => {
      const due = c.box >= 1 ? (c.dueAt <= now ? "à réviser" : "dans " + delay(c.dueAt - now)) : "—";
      return `<tr><td>${c.icon} ${h(c.label)}</td><td>${c.attempts}</td><td>${c.errors}</td><td>${c.box}/3</td><td>${h(due)}</td></tr>`;
    }).join("");
    const level = s.pre && s.post
      ? `<div class="stat"><b>${s.pre.score} → ${s.post.score}</b>test de niveau → final</div>`
      : `<div class="stat"><b>${s.post ? s.post.score + "/" + s.post.total : s.pre ? s.pre.score + "/" + s.pre.total : "—"}</b>${s.post ? "test final" : "test de niveau"}</div>`;
    app.innerHTML = `
      <div class="card">
        ${coach("thinking", "Voilà vos chiffres. Les erreurs « certain » sont les plus utiles à corriger !")}
        <h1>Mes statistiques</h1>
        <div class="stats">
          ${level}
          <div class="stat"><b>${s.overconfident}</b>erreurs « certain »</div>
          <div class="stat"><b>${s.avgMs ? (s.avgMs / 1000).toFixed(1) + " s" : "—"}</b>temps moyen</div>
        </div>
        <p class="muted mt">Les erreurs « certain » sont les plus risquées : on agit sans douter. ${s.generatedServed ? `${s.generatedServed} scénario(s) généré(s) par IA joué(s).` : ""}</p>
        <table class="tbl">
          <thead><tr><th>Thème</th><th>Essais</th><th>Erreurs</th><th>Niveau</th><th>Rappel</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <button class="btn" id="csv">Exporter mes résultats (CSV)</button>
        <button class="btn secondary" id="back">Retour</button>
      </div>`;
    document.getElementById("csv").onclick = downloadCSV;
    document.getElementById("back").onclick = route;
  }

  // ---------- Mode entreprise ----------
  const OKEY = "cyberaware.org.v1", AKEY = "cyberaware.admin.v1";
  const CODE_RE = /^[A-Z2-9]{8}$/;
  const normCode = (v) => String(v || "").toUpperCase().replace(/[\s-]/g, "");
  const getOrg = () => { try { const o = JSON.parse(localStorage.getItem(OKEY)); return o && CODE_RE.test(o.code) && o.config ? o : null; } catch (e) { return null; } };
  const setOrg = (o) => { try { if (o) localStorage.setItem(OKEY, JSON.stringify(o)); else localStorage.removeItem(OKEY); } catch (e) {} };
  const getAdmin = () => { try { return JSON.parse(sessionStorage.getItem(AKEY)); } catch (e) { return null; } };
  const setAdmin = (a) => { try { if (a) sessionStorage.setItem(AKEY, JSON.stringify(a)); else sessionStorage.removeItem(AKEY); } catch (e) {} };

  // Active une organisation (ou la démo si null) : sauvegardes séparées + scénarios personnalisés.
  function activate(o) {
    setOrg(o);
    E.setScope(o ? o.code : "");
    window.Org.apply(o ? o.config : window.Org.DEFAULT);
  }

  async function api(method, path, body, token) {
    try {
      const r = await fetch(path, { method, headers: Object.assign({ "content-type": "application/json" }, token ? { authorization: "Bearer " + token } : {}), body: body ? JSON.stringify(body) : undefined });
      let j = null; try { j = await r.json(); } catch (e) {}
      return { status: r.status, data: j || {} };
    } catch (e) { return { status: 0, data: {} }; }
  }

  // Envoie à l'organisation un RÉSUMÉ (scores, niveaux par thème), jamais les réponses détaillées.
  // Envoi différé (800 ms) : plusieurs actions rapprochées ne produisent qu'un envoi, avec les derniers chiffres.
  let reportTimer = null;
  function report() {
    const o = getOrg();
    if (!o || !E.user()) return;
    clearTimeout(reportTimer);
    reportTimer = setTimeout(() => {
      reportTimer = null;
      const cur = getOrg();
      if (cur && cur.code === o.code && E.user()) api("POST", "/api/org/report", { code: cur.code, user: E.user(), summary: E.summary() });
    }, 800);
  }

  const orgLine = () => { const o = getOrg(); return o ? `🏢 <b>${h(o.config.name)}</b>` : "🎓 Version de démonstration"; };

  function joinScreen(prefill, msg) {
    app.innerHTML = `
      <div class="card">
        ${coach("happy", "Entrez le code que votre entreprise vous a donné : les mises en situation porteront son nom.")}
        <h1>🏢 Rejoindre mon entreprise</h1>
        <label class="lbl" for="jcode">Code de l'entreprise (8 caractères)</label>
        <input id="jcode" class="field code-in" maxlength="9" autocomplete="off" value="${h(prefill || "")}" aria-label="Code de l'entreprise">
        <p class="muted small" id="jmsg" role="status">${h(msg || "")}</p>
        <button class="btn" id="jgo">Continuer</button>
        <button class="btn secondary" id="jback">Retour</button>
      </div>`;
    const input = document.getElementById("jcode");
    const go = async () => {
      const code = normCode(input.value), m = document.getElementById("jmsg");
      if (!CODE_RE.test(code)) { m.textContent = "Ce code n'a pas le bon format (8 lettres ou chiffres)."; return; }
      m.textContent = "Vérification…";
      const r = await api("GET", "/api/org/public?code=" + code);
      if (r.status === 200 && r.data.config) return consentScreen(code, r.data.config);
      m.textContent = r.status === 404 ? "Code inconnu. Vérifiez-le auprès de votre entreprise." : r.status === 429 ? "Trop d'essais. Réessayez dans une minute." : "Serveur injoignable. Vérifiez votre connexion.";
    };
    document.getElementById("jgo").onclick = go;
    input.onkeydown = (ev) => { if (ev.key === "Enter") go(); };
    document.getElementById("jback").onclick = route;
    input.focus();
  }

  function consentScreen(code, config) {
    app.innerHTML = `
      <div class="card">
        <h1>🏢 ${h(config.name)}</h1>
        <p class="muted">Domaine : ${h(config.domain)}</p>
        <div class="box">Votre entreprise verra <b>votre prénom ou pseudo</b> et <b>vos résultats</b> : scores aux tests, niveau par thème, nombre d'erreurs. Elle ne voit <b>pas</b> vos réponses détaillées. Vous pourrez quitter l'espace à tout moment.</div>
        <label class="chk"><input type="checkbox" id="jok"> J'ai compris et j'accepte de partager mes résultats avec ${h(config.name)}.</label>
        <button class="btn" id="jyes" disabled>Rejoindre</button>
        <button class="btn secondary" id="jno">Annuler</button>
      </div>`;
    const ok = document.getElementById("jok"), yes = document.getElementById("jyes");
    ok.onchange = () => { yes.disabled = !ok.checked; };
    yes.onclick = () => { activate({ code, config }); route(); };
    document.getElementById("jno").onclick = route;
  }

  function leaveOrg() {
    if (window.confirm("Quitter cet espace ? Votre progression dans cet espace reste sur cet appareil, mais l'entreprise ne recevra plus vos résultats.")) { activate(null); route(); }
  }

  // ----- Espace administrateur -----
  function adminScreen(msg, mode) {
    mode = mode || "login";
    const f = (id, label, type, extra) => `<label class="lbl" for="${id}">${label}</label><input id="${id}" class="field" type="${type || "text"}" autocomplete="off" ${extra || ""}>`;
    app.innerHTML = `
      <div class="card">
        ${coach("neutral", "Espace réservé à la personne qui administre la sensibilisation dans l'entreprise.")}
        <h1>🛠 Espace administrateur</h1>
        <div class="tabs"><button class="tab ${mode === "login" ? "on" : ""}" id="tlogin">Se connecter</button><button class="tab ${mode === "create" ? "on" : ""}" id="tcreate">Créer un espace</button></div>
        ${mode === "login"
          ? f("acode", "Code de l'entreprise", "text", 'maxlength="9"') + f("apw", "Mot de passe administrateur", "password")
          : f("cname", "Nom de l'entreprise", "text", 'maxlength="60"') + f("cdomain", "Nom de domaine (ex. mon-entreprise.fr)", "text", 'maxlength="60"') + f("cpw", "Mot de passe administrateur (10 caractères minimum)", "password") + f("cpw2", "Confirmer le mot de passe", "password")}
        <p class="err" id="amsg" role="alert">${h(msg || "")}</p>
        <button class="btn" id="ago">${mode === "login" ? "Se connecter" : "Créer mon espace"}</button>
        <button class="btn secondary" id="aback">Retour</button>
        ${mode === "create" ? '<p class="muted small">Le mot de passe est haché sur le serveur et ne peut pas être récupéré : conservez-le. Les salariés n\'en ont pas besoin, ils utilisent seulement le code.</p>' : ""}
      </div>`;
    const $ = (id) => document.getElementById(id), say = (t) => { $("amsg").textContent = t; };
    $("tlogin").onclick = () => adminScreen("", "login");
    $("tcreate").onclick = () => adminScreen("", "create");
    $("aback").onclick = route;
    $("ago").onclick = async () => {
      if (mode === "login") {
        const r = await api("POST", "/api/org/login", { code: normCode($("acode").value), password: $("apw").value });
        if (r.status === 200) { setAdmin({ token: r.data.token, code: r.data.code }); return adminHome(); }
        return say(r.status === 429 ? "Trop de tentatives : réessayez dans quelques minutes." : r.status === 0 ? "Serveur injoignable." : "Code ou mot de passe incorrect.");
      }
      if ($("cpw").value !== $("cpw2").value) return say("Les deux mots de passe sont différents.");
      const r = await api("POST", "/api/org/create", { config: { name: $("cname").value, domain: $("cdomain").value, kind: "entreprise" }, password: $("cpw").value });
      if (r.status === 200) { setAdmin({ token: r.data.token, code: r.data.code }); return adminHome("Espace créé. Complétez les informations ci-dessous, puis donnez le code à vos salariés."); }
      say(r.status === 429 ? "Trop de créations récentes : réessayez plus tard." : r.status === 0 ? "Serveur injoignable." : (r.data.errors || ["Création impossible."]).join(" "));
    };
  }

  const pct = (x) => (x == null ? "—" : Math.round(x * 100) + " %");
  const ratio = (r) => (r ? `${r.score}/${r.total}` : "—");

  async function adminHome(notice) {
    const a = getAdmin();
    if (!a) return adminScreen("", "login");
    const r = await api("GET", "/api/org/dashboard", null, a.token);
    if (r.status === 401) { setAdmin(null); return adminScreen("Session expirée : reconnectez-vous.", "login"); }
    if (r.status !== 200) return adminScreen("Serveur injoignable.", "login");
    const { code, config, dashboard: d } = r.data;
    const O = window.Org;
    const link = location.origin + "/?org=" + code;
    const val = (id, v, ph) => `<input id="${id}" class="field" value="${h(v)}" placeholder="${h(ph || "")}" autocomplete="off">`;
    const kinds = Object.keys(O.KINDS).map((k) => `<option value="${h(k)}" ${config.kind === k ? "selected" : ""}>${h(k)}</option>`).join("");
    const themeRows = d.themes.slice().sort((x, y) => (y.errorRate || 0) - (x.errorRate || 0)).map((t) => `<tr><td>${h((window.CONCEPTS[t.concept] || { label: t.concept }).label)}</td><td>${pct(t.errorRate)}</td><td>${t.mastered}/${d.participants}</td></tr>`).join("");
    const userRows = d.users.map((u) => `<tr><td>${h(u.name)}</td><td>${ratio(u.pre)}</td><td>${ratio(u.post)}</td><td>${u.mastered}/${nConcepts()}</td><td>${u.overconfident}</td><td>${h(new Date(u.updatedAt).toLocaleDateString("fr-FR"))}</td><td><button class="pdel udel" data-n="${h(u.name)}" aria-label="Supprimer ${h(u.name)}">✕</button></td></tr>`).join("");

    app.innerHTML = `
      <div class="card">
        <h1>🛠 ${h(config.name)}</h1>
        ${notice ? `<p class="ok-note" role="status">${h(notice)}</p>` : ""}
        <p class="muted">Code à donner à vos salariés :</p>
        <div class="bigcode" id="bigcode">${h(code)}</div>
        <p class="muted small">Ou ce lien : <span class="mono">${h(link)}</span> (remplacez l'adresse par celle du serveur déployé).</p>
        <button class="btn secondary" id="copy">Copier le code</button>
      </div>

      <div class="card">
        <h2>Votre organisation</h2>
        <p class="muted small">Ces informations personnalisent les mails, SMS et situations vus par vos salariés, y compris ceux générés par l'IA.</p>
        <label class="lbl" for="f_name">Nom</label>${val("f_name", config.name)}
        <label class="lbl" for="f_kind">Type</label><select id="f_kind" class="field">${kinds}</select>
        <label class="lbl" for="f_domain">Nom de domaine officiel</label>${val("f_domain", config.domain, "mon-entreprise.fr")}
        <label class="lbl" for="f_sector">Secteur d'activité</label>${val("f_sector", config.sector, "ex. industrie, banque, santé")}
        <label class="lbl" for="f_director">Dirigeant(e)</label>${val("f_director", config.director)}
        <label class="lbl" for="f_title">Fonction</label>${val("f_title", config.directorTitle, "Direction générale")}
        <label class="lbl" for="f_phone">Numéro ou poste du support informatique</label>${val("f_phone", config.itPhone)}
        <label class="lbl" for="f_mail">Adresse de signalement</label>${val("f_mail", config.reportEmail, "securite@mon-entreprise.fr")}
        <label class="lbl" for="f_charte">Nom de votre charte informatique</label>${val("f_charte", config.charteName)}
        <label class="lbl" for="f_dep">Services (séparés par des virgules)</label>${val("f_dep", (config.departments || []).join(", "), "Compta, RH, Production")}
        <label class="lbl" for="f_tools">Outils (séparés par des virgules)</label>${val("f_tools", (config.tools || []).join(", "), "Teams, VPN, ERP")}
        <div class="box" id="preview"></div>
        <p class="err" id="fmsg" role="alert"></p>
        <button class="btn" id="save">Enregistrer</button>
      </div>

      <div class="card">
        <h2>Résultats</h2>
        <div class="stats">
          <div class="stat"><b>${d.participants}</b>participants</div>
          <div class="stat"><b>${d.finished}</b>ont fini</div>
          <div class="stat"><b>${pct(d.avgPre)} → ${pct(d.avgPost)}</b>niveau → final</div>
        </div>
        ${d.participants ? `
          <h2 class="mt">Thèmes les plus difficiles</h2>
          <table class="tbl"><thead><tr><th>Thème</th><th>Taux d'erreur</th><th>Maîtrisé par</th></tr></thead><tbody>${themeRows}</tbody></table>
          <h2 class="mt">Par personne</h2>
          <div class="scroll"><table class="tbl"><thead><tr><th>Pseudo</th><th>Niveau</th><th>Final</th><th>Maîtrisés</th><th>Err. « certain »</th><th>Dernière activité</th><th></th></tr></thead><tbody>${userRows}</tbody></table></div>
          <button class="btn secondary" id="dcsv">Exporter (CSV)</button>` : '<p class="muted">Aucun salarié n\'a encore commencé. Donnez-leur le code ci-dessus.</p>'}
      </div>

      <div class="card">
        <button class="btn secondary" id="refresh">Actualiser</button>
        <button class="btn secondary" id="alogout">Se déconnecter</button>
        <button class="btn secondary danger" id="adel">Supprimer cet espace et toutes ses données</button>
      </div>`;
    const $ = (id) => document.getElementById(id);
    const read = () => ({ name: $("f_name").value, kind: $("f_kind").value, domain: $("f_domain").value, sector: $("f_sector").value, director: $("f_director").value, directorTitle: $("f_title").value, itPhone: $("f_phone").value, reportEmail: $("f_mail").value, charteName: $("f_charte").value, departments: $("f_dep").value, tools: $("f_tools").value });
    const preview = () => {
      const v = O.validate(read());
      $("preview").innerHTML = v.ok
        ? `<b>Aperçu des pièges fabriqués pour ${h(v.cfg.domain)}</b> (toujours en .example, jamais de vrai site) :<br>${O.lookalikes(v.cfg).map((x) => `<span class="mono">${h(x)}</span>`).join("<br>")}<br><span class="muted small">Faux mail de « ${h(v.cfg.director)} » : <span class="mono">${h(O.tokens(v.cfg).directorgmail)}</span></span>`
        : `<span class="err">${h(v.errors.join(" "))}</span>`;
    };
    app.querySelectorAll(".field").forEach((el) => { el.oninput = preview; el.onchange = preview; });
    preview();
    $("copy").onclick = async () => { try { await navigator.clipboard.writeText(code); $("copy").textContent = "Code copié ✓"; } catch (e) { $("copy").textContent = "Copiez le code à la main"; } };
    $("save").onclick = async () => {
      const x = await api("POST", "/api/org/config", { config: read() }, a.token);
      if (x.status === 200) return adminHome("Enregistré. Vos salariés verront les changements à leur prochaine ouverture.");
      if (x.status === 401) return adminScreen("Session expirée : reconnectez-vous.", "login");
      $("fmsg").textContent = (x.data.errors || ["Enregistrement impossible."]).join(" ");
    };
    $("refresh").onclick = () => adminHome();
    $("alogout").onclick = async () => { await api("POST", "/api/org/logout", {}, a.token); setAdmin(null); route(); };
    $("adel").onclick = async () => {
      const pw = window.prompt("Pour supprimer définitivement cet espace et tous les résultats, tapez le mot de passe administrateur :");
      if (!pw) return;
      const x = await api("POST", "/api/org/delete", { password: pw }, a.token);
      if (x.status === 200) { setAdmin(null); return route(); }
      $("fmsg").textContent = "Mot de passe incorrect : rien n'a été supprimé.";
    };
    app.querySelectorAll(".udel").forEach((b) => (b.onclick = async () => {
      if (!window.confirm(`Supprimer les résultats de « ${b.dataset.n} » ?`)) return;
      await api("POST", "/api/org/user/delete", { name: b.dataset.n }, a.token);
      adminHome("Résultats supprimés.");
    }));
    const dcsv = $("dcsv");
    if (dcsv) dcsv.onclick = () => {
      const q = (v) => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
      const rows = [["pseudo", "niveau_score", "niveau_total", "final_score", "final_total", "themes_maitrises", "erreurs_certain", "reponses", "bonnes", "derniere_activite"]];
      d.users.forEach((u) => rows.push([u.name, u.pre ? u.pre.score : "", u.pre ? u.pre.total : "", u.post ? u.post.score : "", u.post ? u.post.total : "", u.mastered, u.overconfident, u.answered, u.correct, new Date(u.updatedAt).toISOString()]));
      const blob = new Blob([rows.map((x) => x.map(q).join(",")).join("\n")], { type: "text/csv" });
      const el = document.createElement("a"); el.href = URL.createObjectURL(blob); el.download = "cyberaware-organisation.csv";
      document.body.appendChild(el); el.click(); el.remove(); setTimeout(() => URL.revokeObjectURL(el.href), 1000);
    };
  }

  // ---------- Démarrage ----------
  // Organisation rejointe : sauvegardes et scénarios de son espace. Sinon : démonstration.
  {
    const joined = getOrg();
    if (joined && E.scope() !== joined.code) E.setScope(joined.code);
    if (!joined && E.scope()) E.setScope("");
    window.Org.apply(joined ? joined.config : window.Org.DEFAULT);
    if (joined) { // récupère en arrière-plan la dernière version de la configuration de l'entreprise
      api("GET", "/api/org/public?code=" + joined.code).then((r) => { if (r.status === 200 && r.data.config && JSON.stringify(r.data.config) !== JSON.stringify(joined.config)) { setOrg({ code: joined.code, config: r.data.config }); window.Org.apply(r.data.config); } });
    }
  }
  renderProgress();
  const linkCode = normCode((/[?&]org=([^&#]+)/.exec(location.search) || [])[1]);
  const already = getOrg();
  if (CODE_RE.test(linkCode) && !(already && already.code === linkCode)) joinScreen(linkCode); else route();

  if (AI && AI.init) {
    AI.init().then((on) => {
      if (on && aiBadge) { aiBadge.hidden = false; aiBadge.textContent = AI.mode === "live" ? "✨ IA" : "✨ IA (simulation)"; }
    });
  }
})();
