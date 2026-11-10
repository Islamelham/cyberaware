"use strict";
const Org = require("../org.js");
// Backend de SIMULATION : utilisé quand aucune clé API n'est configurée.
// Il produit des variantes à partir de gabarits (sans IA) pour tester toute la chaîne :
// tuteur -> générateur -> critique -> client. Les vrais scénarios viennent du modèle.

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const eur = () => pick(["2 400", "6 800", "12 500", "18 400", "23 900"]);

const T = {
  phishing() {
    const dom = pick(["{{brand}}-compte-verif", "portail-{{brand}}-rh", "{{brand}}-messagerie-secure"]);
    const motif = pick(["Votre boîte mail est pleine", "Mise à jour obligatoire de votre profil", "Nouvelle politique de mot de passe à valider"]);
    return {
      kind: "email", title: motif, setup: "Vous consultez votre messagerie en début de matinée.",
      message: { from: `no-reply@${dom}.example`, subject: `ACTION REQUISE : ${motif.toLowerCase()}`, body: `Bonjour,\n\n${motif}. Connectez-vous sous 12 h via le lien ci-dessous, sinon votre accès sera suspendu.`, link: `https://${dom}.example/connexion` },
      options: [
        { t: "Cliquer sur le lien pour éviter la suspension", ok: false, fb: "L'urgence est fabriquée pour vous faire agir sans réfléchir ; le lien mène à une fausse page." },
        { t: "Ne pas cliquer et signaler le message", ok: true, fb: "Bon réflexe : vous protégez aussi les collègues qui ont reçu le même message." },
        { t: "Répondre à l'expéditeur pour demander confirmation", ok: false, fb: "Répondre ouvre un échange avec l'attaquant et confirme que votre adresse est active." }
      ],
      clues: ["Domaine qui n'est pas celui de {{the_org}}", "Délai très court pour agir", "Menace de suspension du compte", "Message impersonnel"],
      why: "Le phishing joue sur l'urgence et la peur de perdre un accès.", charte_ref: "Art. 4.2", report: "Utiliser le bouton « Signaler » du client mail."
    };
  },
  ceo() {
    const nom = pick(["Claire Fontaine", "Marc Delmas", "Éric Valtier"]);
    return {
      kind: "email", title: "Demande urgente de la direction", setup: "Vous êtes récemment arrivé dans l'équipe comptable.",
      message: { from: `${nom} (Direction) <direction.perso@mail-prive.example>`, subject: "Paiement confidentiel", body: `Bonjour,\n\nJe suis en déplacement sans accès téléphone. Effectuez aujourd'hui un virement de ${eur()} € pour un dossier confidentiel et ne prévenez personne.`, link: "" },
      options: [
        { t: "Effectuer le virement, la demande vient de la direction", ok: false, fb: "L'adresse est personnelle et la demande contourne les circuits habituels : c'est une usurpation." },
        { t: "Vérifier par un autre canal connu et prévenir la sécurité", ok: true, fb: "Une demande de paiement inhabituelle se confirme toujours par un second canal." },
        { t: "Demander une confirmation par retour de mail", ok: false, fb: "L'attaquant répondra lui-même : il faut changer de canal." }
      ],
      clues: ["Adresse personnelle pour un dirigeant", "Demande de confidentialité", "Impossibilité de téléphoner", "Urgence sur un virement"],
      why: "La fraude au président exploite l'autorité et le secret, surtout auprès des nouveaux arrivants.", charte_ref: "Art. 6.3", report: "Prévenir le responsable sécurité et la hiérarchie directe."
    };
  },
  smishing() {
    const objet = pick(["colis", "remboursement", "amende"]);
    const dom = `suivi-${objet}-fr`;
    return {
      kind: "sms", title: `Votre ${objet} vous attend`, setup: "Vous recevez un SMS pendant votre pause.",
      message: { from: "+33 6 00 00 00 00", subject: "", body: `Votre ${objet} est en attente. Régularisez 2,49 € avant ce soir : https://${dom}.example/paiement`, link: "" },
      options: [
        { t: "Payer le petit montant demandé", ok: false, fb: "Le but est de récupérer les données de votre carte, pas d'encaisser 2,49 €." },
        { t: "Ne pas cliquer, supprimer et signaler", ok: true, fb: "Exact : on passe par le site officiel en cas de doute." },
        { t: "Cliquer juste pour voir de quoi il s'agit", ok: false, fb: "Le simple clic peut ouvrir une page piégée ou confirmer que votre numéro est actif." }
      ],
      clues: ["Expéditeur inconnu", "Lien vers un domaine étrange", "Petit montant pour baisser la garde", "Délai très court"],
      why: "Le smishing profite de l'impatience et de petits montants.", charte_ref: "Art. 4.4", report: "Signaler le SMS à l'équipe sécurité."
    };
  },
  vishing() {
    const qui = pick(["support informatique", "service sécurité de votre banque", "assistance du fournisseur de messagerie"]);
    return {
      kind: "call", title: "Un appel du " + qui, setup: "Votre téléphone sonne, numéro masqué.",
      message: { from: "Appel entrant (numéro masqué)", subject: "", body: `« Bonjour, ici le ${qui}. Une anomalie grave a été détectée. Pour la corriger, communiquez-moi le code que vous venez de recevoir. »`, link: "" },
      options: [
        { t: "Donner le code pour régler le problème", ok: false, fb: "Ce code valide l'opération de l'attaquant : il ne se communique jamais." },
        { t: "Raccrocher, rappeler par le numéro officiel et signaler", ok: true, fb: "Exact : on reprend contact soi-même par un canal connu." },
        { t: "Demander son nom puis poursuivre la conversation", ok: false, fb: "Un nom se fabrique facilement ; le canal d'origine reste compromis." }
      ],
      clues: ["Appel non sollicité", "Numéro masqué", "Alerte grave et vague", "Demande d'un code reçu"],
      why: "L'ingénierie sociale par téléphone exploite la peur et le désir de bien faire.", charte_ref: "Art. 4.3", report: "Prévenir l'équipe sécurité de la tentative d'appel."
    };
  },
  usb() {
    const lieu = pick(["la salle de pause", "le parking", "l'ascenseur"]);
    return {
      kind: "situation", title: `Clé USB trouvée dans ${lieu}`, setup: "Vous arrivez au bureau le matin.",
      message: { from: "Situation", subject: "", body: `Une clé USB portant l'étiquette « Résultats trimestriels » traîne dans ${lieu}. Votre ordinateur est à portée de main.`, link: "" },
      options: [
        { t: "La brancher pour retrouver son propriétaire", ok: false, fb: "C'est la technique du « USB drop » : un malware peut s'exécuter dès le branchement." },
        { t: "Ne pas la brancher et la remettre à la sécurité", ok: true, fb: "Exact : l'étiquette attrayante vise votre curiosité." },
        { t: "La brancher sur un ordinateur personnel", ok: false, fb: "Le risque est le même, et vous exposez vos données personnelles." }
      ],
      clues: ["Clé trouvée dans un lieu passant", "Étiquette attrayante", "Propriétaire inconnu", "Aucune provenance vérifiable"],
      why: "Un périphérique USB piégé peut se faire passer pour un clavier et lancer des commandes en quelques secondes.", charte_ref: "Art. 5.4", report: "Remettre la clé à la sécurité en indiquant où elle a été trouvée."
    };
  },
  password() {
    return {
      kind: "situation", title: "Un collègue demande votre accès", setup: "Un collègue part en congés et doit rester joignable.",
      message: { from: "Situation", subject: "", body: "Il vous dit : « Donne-moi ton mot de passe de la messagerie, je veux juste consulter un dossier pendant mes congés. »", link: "" },
      options: [
        { t: "Lui communiquer le mot de passe, c'est un collègue", ok: false, fb: "Un mot de passe est strictement personnel ; en cas de problème, c'est votre responsabilité." },
        { t: "Refuser et proposer une délégation officielle via le support", ok: true, fb: "Exact : un accès partagé se demande par la voie prévue, tracée." },
        { t: "Lui envoyer le mot de passe par message privé", ok: false, fb: "Le partage reste interdit et le message peut être intercepté ou conservé." }
      ],
      clues: ["Demande de partager un mot de passe", "Justification banale", "Contournement des règles", "Aucune trace de la demande"],
      why: "Partager un mot de passe détruit la traçabilité et élargit les risques de compromission.", charte_ref: "Art. 4.1", report: "En cas de doute, en parler au support ou à la sécurité."
    };
  },
  dns() {
    const ruse = pick(["sous-domaine", "faute", "mot-ajoute"]);
    const autre = pick(["portail-rh", "espace-paie", "intranet-support"]);
    const R = {
      "sous-domaine": {
        from: "rh@{{domain}}", link: `https://{{domain}}.${autre}.example/connexion`,
        clue: `Le vrai domaine du lien est ${autre}.example (juste avant le premier « / »), pas {{domain}}`,
        why: "N'importe qui peut créer un sous-domaine qui contient le nom de votre établissement : seule la fin du nom indique à qui appartient le site."
      },
      faute: {
        from: "support@{{typohost}}", link: "https://{{typohost}}/connexion",
        clue: "{{typoexp}} ({{typobrand}} au lieu de {{brand}})",
        why: "Le typosquatting enregistre un nom presque identique au vrai en comptant sur une lecture rapide."
      },
      "mot-ajoute": {
        from: "assistance@{{brand}}-support.example", link: "https://{{brand}}-support.example/connexion",
        clue: "Un mot ajouté au nom de {{the_org}} (« -support ») : ce n'est pas son domaine officiel {{domain}}",
        why: "Ajouter un mot rassurant (support, secure, login) au nom de {{the_org}} donne un domaine qui paraît légitime mais ne l'est pas."
      }
    }[ruse];
    const motif = pick(["Votre accès au partage de documents expire", "Validation de votre note de frais", "Votre attestation est prête"]);
    return {
      kind: "email", title: "Le lien ressemble au nôtre", setup: "Vous recevez ce mail sur votre boîte pro. Le domaine officiel de {{the_org}} est {{domain}}.",
      message: { from: R.from, subject: motif, body: `Bonjour,\n\n${motif}. Connectez-vous pour continuer avant la fin de la journée.`, link: R.link },
      options: [
        { t: "Cliquer sur le lien, il semble officiel", ok: false, fb: "Le nom de domaine n'est pas celui de {{the_org}} : la page est celle d'un attaquant." },
        { t: "Lire le domaine réel, ne pas cliquer, passer par l'intranet et signaler", ok: true, fb: "Exact : on vérifie le domaine, puis on passe par un chemin connu." },
        { t: "Ouvrir le lien dans un autre navigateur pour comparer", ok: false, fb: "Changer de navigateur ne change pas la destination." }
      ],
      clues: [R.clue, "Connexion demandée pour poursuivre", "Échéance courte", "Message peu personnalisé"],
      why: R.why + " Le DNS associe un nom à un serveur, et ce nom se lit de droite à gauche.", charte_ref: "Art. 4.5", report: "Utiliser le bouton « Signaler » du client mail, sans cliquer."
    };
  },
  ransom() {
    const v = pick([
      { body: "Vos fichiers ont été chiffrés. Envoyez 0,05 bitcoin avant 48 h pour les récupérer.", t: "« Vos fichiers sont chiffrés »" },
      { body: "Tous vos documents sont verrouillés. Payez 300 € en cryptomonnaie sous 24 h, sinon ils seront détruits.", t: "Un message de rançon apparaît" }
    ]);
    return {
      kind: "situation", title: v.t, setup: "Vous venez d'ouvrir une pièce jointe sur votre poste de travail.",
      message: { from: "Fenêtre affichée sur votre écran", subject: "", body: v.body, link: "" },
      options: [
        { t: "Payer la rançon pour récupérer les fichiers", ok: false, fb: "Payer ne garantit rien et finance les criminels." },
        { t: "Débrancher le poste du réseau, ne pas payer et appeler le support", ok: true, fb: "Isoler le poste limite la propagation ; le support peut agir." },
        { t: "Redémarrer pour voir si le message disparaît", ok: false, fb: "Redémarrer peut effacer des traces utiles et laisse le chiffrement se propager." },
        { t: "Continuer à travailler sur les fichiers encore accessibles", ok: false, fb: "Chaque minute connectée expose d'autres fichiers." }
      ],
      clues: ["Demande de paiement en cryptomonnaie", "Délai court pour créer la panique", "Menace de destruction", "Message apparu après une pièce jointe"],
      why: "Un rançongiciel chiffre les fichiers puis exige de l'argent : on isole le poste et on prévient le support.", charte_ref: "Art. 9.1", report: "Appeler le support au poste {{itphone}}."
    };
  },
  mobile() {
    const lieu = pick(["la gare", "un café", "l'aéroport"]);
    return {
      kind: "situation", title: `Le Wi-Fi gratuit de ${lieu}`, setup: "En déplacement, vous devez consulter votre messagerie professionnelle.",
      message: { from: "Situation", subject: "", body: `Votre téléphone détecte un réseau ouvert « ${lieu.replace(/^(la |l')/, "")}_WiFi_Gratuit », sans mot de passe.`, link: "" },
      options: [
        { t: "Me connecter : le site de ma messagerie est en https", ok: false, fb: "Un réseau piégé peut quand même rediriger ou collecter des informations." },
        { t: "Utiliser le partage de connexion de mon téléphone", ok: true, fb: "Un réseau public peut être contrôlé par un attaquant ; votre connexion mobile est plus sûre." },
        { t: "Me connecter rapidement puis me déconnecter", ok: false, fb: "Une courte connexion suffit pour être intercepté." }
      ],
      clues: ["Réseau ouvert sans authentification", "Nom attractif", "Contexte pressé", "Accès à des données professionnelles"],
      why: "Un Wi-Fi public ou inconnu peut intercepter comptes et mots de passe.", charte_ref: "Art. 10.1", report: "Si vous vous êtes connecté, changer vos mots de passe et prévenir le support."
    };
  },
  social() {
    const nom = pick(["Yanis", "Lina", "Karim"]);
    const dom = pick(["video-vue-vite", "photo-privee-voir", "concours-gagnant"]);
    return {
      kind: "sms", title: "Un contact vous envoie un lien", setup: "Un contact de votre promotion vous écrit en message privé.",
      message: { from: `${nom} (contact de votre promotion)`, subject: "", body: `Regarde vite, c'est bien toi là-dessus ?! https://${dom}.example/voir`, link: "" },
      options: [
        { t: "Cliquer sur le lien : c'est un ami", ok: false, fb: "Son compte est peut-être piraté ; la confiance dans un contact est exploitée." },
        { t: "Ne pas cliquer et prévenir mon contact par un autre canal", ok: true, fb: "Vous protégez votre contact sans entrer dans l'échange douteux." },
        { t: "Répondre pour demander de quoi il s'agit", ok: false, fb: "Vous restez en relation avec un compte potentiellement piraté." }
      ],
      clues: ["Message alarmiste qui joue sur la curiosité", "Lien vers un site inconnu", "Urgence", "Style inhabituel pour ce contact"],
      why: "Un compte piraté sert à tromper les contacts de la victime.", charte_ref: "Art. 11.1", report: "Prévenir le contact et signaler le message à la plateforme."
    };
  },
  properso() {
    const canal = pick(["messagerie personnelle", "cloud personnel gratuit", "clé USB personnelle"]);
    return {
      kind: "situation", title: "Travailler depuis chez soi", setup: "Vous avez un dossier à terminer ce week-end.",
      message: { from: "Situation", subject: "", body: `Vous pourriez envoyer le fichier de travail vers votre ${canal} pour le terminer sur votre ordinateur.`, link: "" },
      options: [
        { t: `Utiliser mon ${canal} : c'est temporaire`, ok: false, fb: "Les données sortent du périmètre de {{the_org}}." },
        { t: "Utiliser l'accès distant fourni par {{the_org}}, ou reporter à lundi", ok: true, fb: "On reste sur les outils professionnels, même plus lents." },
        { t: "Envoyer le fichier à un collègue pour qu'il le termine chez lui", ok: false, fb: "Vous déplacez le problème sans le résoudre." }
      ],
      clues: ["Données professionnelles", "Canal personnel proposé", "Prétexte du gain de temps", "Hors du cadre autorisé"],
      why: "Mélanger les usages pro et perso expose les données à des services moins protégés.", charte_ref: "Art. 12.1", report: "Prévenir la sécurité si des données ont déjà été envoyées."
    };
  },
  physical() {
    const perso = pick(["un livreur chargé de cartons", "une personne au téléphone", "quelqu'un en tenue de ville avec un badge à la main"]);
    return {
      kind: "situation", title: "Quelqu'un attend derrière vous", setup: "Vous passez le tourniquet avec votre badge.",
      message: { from: "Situation", subject: "", body: `${perso[0].toUpperCase() + perso.slice(1)} vous dit : « Pouvez-vous me laisser passer, je n'ai pas pu badger ? »`, link: "" },
      options: [
        { t: "Le laisser passer derrière moi", ok: false, fb: "C'est du « tailgating » : une apparence rassurante n'est pas une autorisation." },
        { t: "L'inviter à passer par l'accueil et signaler si besoin", ok: true, fb: "Exact : chacun entre avec son propre badge, poliment mais fermement." },
        { t: "Lui demander son nom et le croire sur parole", ok: false, fb: "Un nom ne prouve rien ; seule l'accueil peut valider une entrée." }
      ],
      clues: ["Personne sans badge", "Prétexte plausible", "Ton pressé et aimable", "Aucune visite annoncée"],
      why: "L'attaquant exploite la politesse pour entrer sans être contrôlé.", charte_ref: "Art. 8.1", report: "Prévenir l'accueil ou la sécurité du site."
    };
  }
};

const backend = {
  async generate(plan) {
    const make = T[plan.concept];
    if (!make) throw new Error("concept inconnu");
    // Les gabarits contiennent des jetons {{...}} remplacés par les valeurs de l'organisation.
    return Org.render(make(), Org.tokens(plan.org));
  },
  async critique() {
    return { approved: true, issues: [] };
  }
};

module.exports = { backend, templates: T };
