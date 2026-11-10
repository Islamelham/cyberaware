// Banque de scénarios (MODÈLES personnalisables). Contexte par défaut : UTBM (exercice FICTIF).
// Tous les domaines pièges utilisent l'extension réservée .example : aucun vrai site n'est jamais imité.
// Plusieurs scénarios s'appuient sur le « Kit de sensibilisation » de Cybermalveillance.gouv.fr
// (Licence Ouverte / Etalab 2.0) : voir le champ `kit` de chaque scénario.
// Chaque "concept" (type d'attaque) a au moins 2 variantes : si l'utilisateur
// rate un concept, il est rejoué avec une variante DIFFÉRENTE.

// L'organisation (window.ORG) et la banque finale (window.SCENARIOS) sont produites par org.js
// à partir de ces modèles : les jetons {{domain}}, {{brand}}, {{director}}... sont remplacés.

window.CONCEPTS = {
  phishing: { label: "Hameçonnage par email", icon: "✉️" },
  ceo: { label: "Fraude au président", icon: "👔" },
  smishing: { label: "SMS frauduleux", icon: "💬" },
  vishing: { label: "Faux support technique", icon: "📞" },
  usb: { label: "Support amovible inconnu", icon: "🔌" },
  password: { label: "Mots de passe et MFA", icon: "🔑" },
  physical: { label: "Intrusion physique", icon: "🚪" },
  dns: { label: "Noms de domaine trompeurs", icon: "🌐" },
  ransom: { label: "Rançongiciels et sauvegardes", icon: "🔒" },
  mobile: { label: "Appareils mobiles et Wi-Fi", icon: "📱" },
  social: { label: "Réseaux sociaux", icon: "👥" },
  properso: { label: "Usages pro et perso", icon: "🏠" }
};

window.SCENARIO_TEMPLATES = [
  // ---------- PHISHING ----------
  {
    id: "phish-1", concept: "phishing", kind: "email",
    title: "Votre compte va expirer",
    setup: "Lundi matin, vous recevez ce message sur votre boîte pro.",
    message: {
      from: "support@{{brand}}-securite.example",
      subject: "URGENT : votre compte expire dans 24h",
      body: "Bonjour,\n\nVotre mot de passe expire aujourd'hui. Pour conserver l'accès à votre messagerie, confirmez votre identité immédiatement.",
      link: "http://{{brand}}-verif-compte.example/login"
    },
    options: [
      { t: "Cliquer sur le lien et saisir mon mot de passe", ok: false, fb: "C'est exactement ce que veut l'attaquant : récupérer vos identifiants sur une fausse page." },
      { t: "Répondre pour demander si c'est légitime", ok: false, fb: "Répondre confirme que votre adresse est active et peut ouvrir un échange avec l'attaquant." },
      { t: "Ne pas cliquer et signaler le message", ok: true, fb: "Bonne réponse. Vous protégez aussi vos collègues qui ont reçu le même mail." },
      { t: "Transférer le message à mes collègues pour les prévenir", ok: false, fb: "Transférer fait circuler le message piégé. Il faut le signaler avec le bouton prévu, pas le faire circuler." }
    ],
    clues: ["Domaine qui n'est pas celui de {{the_org}} ({{brand}}-securite.example au lieu de {{domain}})", "Urgence artificielle (24h)", "Lien en http, sans chiffrement, vers un autre domaine", "Message impersonnel, sans votre nom"],
    why: "Le phishing joue sur l'urgence et la peur de perdre un accès. Un service informatique ne demande jamais de confirmer un mot de passe via un lien.",
    charte: { ref: "Art. 4.2", text: "Les identifiants sont personnels et ne doivent jamais être saisis à la suite d'un message non sollicité." },
    report: "Utiliser le bouton « Signaler » du client mail."
  },
  {
    id: "phish-2", concept: "phishing", kind: "email",
    title: "Facture en pièce jointe",
    setup: "Vous travaillez au service achats. Un mail arrive d'un fournisseur que vous ne connaissez pas.",
    message: {
      from: "compta@fournisseur-dupont.biz",
      subject: "Facture impayée n°48213 - dernier rappel",
      body: "Bonjour,\n\nVeuillez trouver ci-joint la facture impayée. Ouvrez le document et activez les macros pour l'afficher correctement.",
      link: "Facture_48213.docm"
    },
    options: [
      { t: "Vérifier auprès du service achats par un canal connu, sans ouvrir le fichier", ok: true, fb: "Exact. Vérifier par un canal indépendant est le bon réflexe, puis signaler si c'est suspect." },
      { t: "Ouvrir la pièce jointe pour vérifier la facture", ok: false, fb: "Un document qui demande d'activer les macros est un classique pour installer un logiciel malveillant." },
      { t: "Transférer à un collègue pour avis", ok: false, fb: "Vous risquez de propager l'attaque. Il faut signaler, pas faire circuler." },
      { t: "L'ouvrir en aperçu, sans activer les macros", ok: false, fb: "Moins risqué, mais le fournisseur est inconnu et la demande est suspecte : on n'ouvre pas, on vérifie par un canal connu." }
    ],
    clues: ["Fournisseur inconnu", "Extension .docm (macros)", "Demande d'activer les macros", "Ton de rappel pour créer la pression"],
    why: "Les pièces jointes Office avec macros sont un vecteur classique de malwares. Aucune facture légitime n'exige d'activer des macros.",
    charte: { ref: "Art. 5.1", text: "L'ouverture de pièces jointes de provenance inconnue est interdite ; elles doivent être signalées." },
    report: "Signaler le message sans ouvrir la pièce jointe."
  },

  // ---------- CEO FRAUD ----------
  {
    id: "ceo-1", concept: "ceo", kind: "email",
    title: "Message de la direction",
    setup: "Vous venez d'arriver dans l'équipe finance. Vous recevez ce mail de la direction.",
    message: {
      from: "{{director}} ({{directortitle}}) <{{directorgmail}}>",
      subject: "Virement confidentiel",
      body: "Bonjour,\n\nJe suis en réunion et ne peux pas téléphoner. J'ai besoin d'un virement de 18 400 € à effectuer aujourd'hui pour une acquisition confidentielle. N'en parlez à personne. Je vous envoie le RIB.",
      link: ""
    },
    options: [
      { t: "Effectuer le virement : c'est le dirigeant", ok: false, fb: "Le prénom est exact mais l'adresse est une adresse Gmail personnelle. C'est de l'usurpation." },
      { t: "Demander un second mail de confirmation à la même adresse", ok: false, fb: "L'attaquant confirmera lui-même. Il faut changer de canal." },
      { t: "Faire le virement en deux fois pour limiter le risque", ok: false, fb: "Fractionner ne change rien : l'argent part chez l'escroc. C'est la demande elle-même qu'il faut vérifier." },
      { t: "Vérifier par téléphone via le numéro officiel, et prévenir la sécurité", ok: true, fb: "Exact. Une demande inhabituelle d'argent se vérifie toujours par un autre canal." }
    ],
    clues: ["Adresse Gmail personnelle pour un dirigeant", "Demande de confidentialité", "Impossibilité de téléphoner", "Urgence sur un virement"],
    why: "La fraude au président exploite l'autorité et le secret. Les nouveaux collaborateurs sont des cibles privilégiées car ils connaissent mal les circuits habituels.",
    charte: { ref: "Art. 6.3", text: "Tout ordre de paiement inhabituel doit être confirmé par un second canal et validé par la hiérarchie." },
    report: "Prévenir immédiatement le responsable sécurité et la hiérarchie directe."
  },
  {
    id: "ceo-2", concept: "ceo", kind: "sms",
    title: "Le manager vous écrit",
    setup: "Vous recevez un message WhatsApp d'un numéro inconnu avec la photo de votre responsable.",
    message: {
      from: "+33 7 55 12 98 04 (photo de votre manager)",
      subject: "",
      body: "Salut, c'est Sophie, j'ai changé de numéro. Tu peux m'acheter 3 cartes cadeaux de 100 € pour un client ? Je te rembourse demain, c'est urgent et discret."
    },
    options: [
      { t: "Acheter les cartes pour rendre service", ok: false, fb: "La photo se copie facilement. Une demande de cartes cadeaux est un grand classique d'arnaque." },
      { t: "Appeler Sophie sur son numéro habituel puis signaler", ok: true, fb: "Exact. On vérifie sur le numéro connu, jamais sur le nouveau." },
      { t: "Répondre au numéro pour demander plus de détails", ok: false, fb: "Vous restez dans le canal de l'attaquant, qui saura vous répondre de façon crédible." }
    ],
    clues: ["Numéro inconnu", "Demande de cartes cadeaux", "Urgence et discrétion", "Ton familier mais inhabituel"],
    why: "L'attaquant imite une personne de confiance. Un changement de numéro annoncé par message ne doit jamais être cru sans vérification.",
    charte: { ref: "Art. 6.3", text: "Tout achat ou paiement demandé par message doit être confirmé par un canal connu." },
    report: "Signaler au responsable sécurité, avec capture d'écran."
  },

  // ---------- SMISHING ----------
  {
    id: "smish-1", concept: "smishing", kind: "sms",
    title: "Colis en attente",
    setup: "Vous êtes sur votre téléphone pro pendant votre pause.",
    message: {
      from: "+33 6 12 45 87 90",
      subject: "",
      body: "Votre colis est en attente. Des frais de 1,99 € sont nécessaires pour la livraison : https://colis-livraison-fr.top/pay"
    },
    options: [
      { t: "Payer les 1,99 €, c'est peu", ok: false, fb: "Le but est de voler les données de votre carte, pas d'encaisser 1,99 €." },
      { t: "Cliquer pour voir de quel colis il s'agit", ok: false, fb: "Le simple clic peut ouvrir une page piégée ou confirmer que votre numéro est actif." },
      { t: "Ignorer, supprimer et signaler", ok: true, fb: "Bonne réponse. En cas de doute sur un colis, on passe par le site officiel du transporteur." },
      { t: "Appeler le numéro qui m'a envoyé le SMS", ok: false, fb: "Vous seriez en relation avec l'attaquant, parfois via un numéro surtaxé. Passez par le site officiel du transporteur." }
    ],
    clues: ["Expéditeur sans nom", "Domaine en .top", "Petit montant pour baisser la garde", "Pas de numéro de suivi"],
    why: "Le smishing utilise de petits montants et l'impatience. Les SMS sont lus plus vite que les mails, ce qui les rend efficaces.",
    charte: { ref: "Art. 4.4", text: "Les terminaux professionnels ne doivent pas servir à répondre à des sollicitations externes non vérifiées." },
    report: "Transférer le SMS au 33700 (Spam SMS) puis informer l'équipe sécurité."
  },
  {
    id: "smish-2", concept: "smishing", kind: "sms",
    title: "Code de sécurité",
    setup: "Vous recevez un SMS alors que vous ne faisiez aucune connexion.",
    message: {
      from: "Secu{{BRAND}}",
      subject: "",
      body: "Une connexion inhabituelle a été détectée sur votre compte. Si ce n'est pas vous, répondez STOP et communiquez le code reçu par SMS pour bloquer l'accès."
    },
    options: [
      { t: "Ne rien communiquer et changer mon mot de passe via le site officiel", ok: true, fb: "Exact. Passer par le site officiel, jamais par un lien reçu, et prévenir la sécurité." },
      { t: "Communiquer le code reçu pour bloquer l'accès", ok: false, fb: "Ce code est la clé d'accès à votre compte. Il ne se communique à personne." },
      { t: "Répondre STOP pour en finir", ok: false, fb: "Répondre confirme que votre numéro est actif et déclenche parfois la suite de l'arnaque." }
    ],
    clues: ["Demande de communiquer un code", "Alerte vague et alarmante", "Expéditeur générique", "Réponse demandée par SMS"],
    why: "Un code à usage unique ne doit jamais être partagé. L'attaquant déclenche une vraie connexion et vous demande le code pour la valider.",
    charte: { ref: "Art. 4.3", text: "Les codes de double authentification sont strictement personnels." },
    report: "Prévenir l'équipe sécurité de la tentative de connexion."
  },

  // ---------- VISHING ----------
  {
    id: "vish-1", concept: "vishing", kind: "call",
    title: "Un technicien vous appelle",
    setup: "Votre téléphone sonne, numéro masqué.",
    message: {
      from: "Appel entrant (numéro masqué)",
      subject: "",
      body: "« Bonjour, support informatique. Nous avons détecté un virus sur votre poste. Je dois prendre le contrôle à distance. Installez cet outil et donnez-moi le code qui s'affiche. »"
    },
    options: [
      { t: "Raccrocher, rappeler le support par le numéro officiel et signaler", ok: true, fb: "Exact. Le vrai support ne vous appellera jamais sans ticket préalable." },
      { t: "Installer l'outil, le support sait ce qu'il fait", ok: false, fb: "Un outil de prise de contrôle donne un accès total à votre poste à l'attaquant." },
      { t: "Demander son nom et continuer l'échange", ok: false, fb: "Un nom se fabrique facilement. Le canal d'origine est compromis." },
      { t: "Éteindre mon ordinateur et ne rien dire à personne", ok: false, fb: "L'attaquant peut rappeler quelqu'un d'autre. Il faut signaler la tentative pour protéger vos collègues." }
    ],
    clues: ["Appel non sollicité", "Numéro masqué", "Peur d'un virus", "Demande d'installer un outil d'accès distant"],
    why: "L'ingénierie sociale par téléphone exploite la peur et le désir de bien faire. Un technicien légitime travaille sur ticket.",
    charte: { ref: "Art. 7.1", text: "Aucun outil de prise de contrôle ne doit être installé sans demande formelle du support." },
    report: "Appeler le support au poste {{itphone}} et signaler la tentative."
  },
  {
    id: "vish-2", concept: "vishing", kind: "call",
    title: "Enquête de la banque",
    setup: "Un correspondant se présente comme un conseiller de la banque de {{the_org}}.",
    message: {
      from: "Appel entrant (+33 1 ...)",
      subject: "",
      body: "« Nous avons un souci sur le compte de la société. Pour sécuriser, confirmez-moi les identifiants de la plateforme bancaire et le code que vous venez de recevoir. »"
    },
    options: [
      { t: "Donner les identifiants pour résoudre le souci", ok: false, fb: "Une banque ne demande jamais des identifiants ou des codes par téléphone." },
      { t: "Refuser, raccrocher et prévenir ma hiérarchie et la sécurité", ok: true, fb: "Exact. On rappelle la banque par un contact connu, après avoir prévenu la hiérarchie." },
      { t: "Donner seulement le code, pas le mot de passe", ok: false, fb: "Le code seul suffit à valider une opération frauduleuse." }
    ],
    clues: ["Demande d'identifiants par téléphone", "Demande d'un code reçu", "Urgence sur un prétendu souci", "Appel non sollicité"],
    why: "Les attaquants préparent leur appel avec des infos publiques. L'aisance de l'interlocuteur n'est pas une preuve de légitimité.",
    charte: { ref: "Art. 6.3", text: "Aucun identifiant bancaire ne se communique par téléphone." },
    report: "Prévenir la hiérarchie et la sécurité, puis la banque par un contact connu."
  },

  // ---------- USB ----------
  {
    id: "usb-1", concept: "usb", kind: "situation",
    title: "Clé USB sur le parking",
    setup: "En arrivant au travail, vous trouvez une clé USB devant l'entrée.",
    message: {
      from: "Situation",
      subject: "",
      body: "Une clé USB siglée « Salaires 2026 » traîne par terre. Vous êtes curieux et vous avez votre ordinateur sous la main."
    },
    options: [
      { t: "La brancher pour retrouver son propriétaire", ok: false, fb: "C'est la technique du « USB drop » : un malware peut s'exécuter dès le branchement." },
      { t: "La brancher sur un ordinateur personnel plutôt que pro", ok: false, fb: "Le danger est le même, et vous exposez en plus vos données personnelles." },
      { t: "La poser sur le bureau d'un collègue pour qu'il s'en occupe", ok: false, fb: "Vous déplacez le risque sur quelqu'un d'autre. Seule la sécurité doit la récupérer." },
      { t: "Ne pas la brancher et la remettre à la sécurité", ok: true, fb: "Exact. L'étiquette alléchante est faite pour attiser la curiosité." }
    ],
    clues: ["Clé trouvée dans un lieu passant", "Étiquette attractive", "Propriétaire inconnu", "Aucune provenance vérifiable"],
    why: "Un périphérique USB piégé peut se faire passer pour un clavier et exécuter des commandes en quelques secondes.",
    charte: { ref: "Art. 5.4", text: "Tout support amovible inconnu doit être remis à la sécurité sans être branché." },
    report: "Remettre la clé à l'équipe sécurité, en indiquant où et quand elle a été trouvée."
  },
  {
    id: "usb-2", concept: "usb", kind: "situation",
    title: "Cadeau d'un prestataire",
    setup: "Lors d'un salon, un commercial vous offre une clé USB « avec la brochure ».",
    message: {
      from: "Situation",
      subject: "",
      body: "De retour au bureau, vous avez envie de consulter la brochure sur la clé, qui n'a pas été remise dans son emballage d'origine."
    },
    options: [
      { t: "La brancher, c'est un cadeau pro", ok: false, fb: "Un cadeau n'est pas une garantie : le support peut avoir été modifié." },
      { t: "La brancher sur le poste de test d'un collègue", ok: false, fb: "Vous déplacez le risque sur quelqu'un d'autre sans le supprimer." },
      { t: "Demander la brochure en ligne, et remettre la clé à la sécurité", ok: true, fb: "Exact. Le contenu s'obtient par un canal fiable, sans risque pour le poste." }
    ],
    clues: ["Support non scellé", "Cadeau d'un tiers peu connu", "Contenu accessible autrement", "Aucune vérification possible"],
    why: "Les objets promotionnels peuvent servir de vecteurs d'attaque. Mieux vaut obtenir le contenu par un site officiel.",
    charte: { ref: "Art. 5.4", text: "Les supports amovibles reçus de tiers doivent être contrôlés avant tout usage." },
    report: "Remettre la clé à la sécurité pour analyse."
  },

  // ---------- PASSWORD ----------
  {
    id: "pwd-1", concept: "password", kind: "situation",
    title: "Le même mot de passe partout",
    setup: "Vous créez votre compte pro et vous hésitez sur le mot de passe.",
    message: {
      from: "Situation",
      subject: "",
      body: "Vous utilisez déjà « Sophie1990! » pour vos réseaux sociaux et votre messagerie perso. Ce mot de passe est facile à retenir."
    },
    options: [
      { t: "Créer une phrase de passe unique et l'enregistrer dans le gestionnaire autorisé", ok: true, fb: "Exact. Un mot de passe unique par service limite les dégâts d'une fuite." },
      { t: "Réutiliser ce mot de passe pour mon compte pro", ok: false, fb: "Si un site grand public est piraté, votre accès pro est compromis en quelques minutes." },
      { t: "Ajouter simplement un chiffre à la fin", ok: false, fb: "Les attaquants testent justement ces variantes automatiquement." },
      { t: "Le noter sur un post-it collé à l'écran pour ne pas l'oublier", ok: false, fb: "Un post-it est lisible par tout visiteur. Un gestionnaire de mots de passe sert justement à cela." }
    ],
    clues: ["Mot de passe réutilisé", "Prénom et année de naissance", "Variante simple", "Mélange perso et pro"],
    why: "Le « credential stuffing » consiste à tester sur d'autres sites les mots de passe fuités. L'unicité est la défense principale.",
    charte: { ref: "Art. 4.1", text: "Chaque compte professionnel dispose d'un mot de passe unique, jamais réutilisé ailleurs." },
    report: "Si vous avez réutilisé un mot de passe, le changer et prévenir la sécurité."
  },
  {
    id: "pwd-2", concept: "password", kind: "situation",
    title: "Notifications de connexion en rafale",
    setup: "Vous recevez des demandes d'approbation de connexion sur votre application d'authentification.",
    message: {
      from: "Application d'authentification",
      subject: "",
      body: "En quelques minutes, 6 notifications « Approuver la connexion ? » arrivent sur votre téléphone, alors que vous ne vous connectez à rien."
    },
    options: [
      { t: "Approuver une fois pour que les notifications s'arrêtent", ok: false, fb: "C'est l'attaque par « fatigue MFA » : l'attaquant espère que vous finirez par céder." },
      { t: "Refuser toutes les demandes, changer mon mot de passe et prévenir la sécurité", ok: true, fb: "Exact. Ces demandes signalent que votre mot de passe est déjà connu de l'attaquant." },
      { t: "Ignorer en attendant qu'elles cessent", ok: false, fb: "Ignorer ne règle rien : votre mot de passe est probablement compromis." }
    ],
    clues: ["Demandes non sollicitées", "Répétition en rafale", "Aucune connexion de votre part", "Pression pour approuver"],
    why: "L'authentification multifacteur protège, mais l'attaquant peut harceler la victime pour obtenir une approbation.",
    charte: { ref: "Art. 4.3", text: "Toute demande d'authentification non initiée par l'utilisateur doit être refusée et signalée." },
    report: "Prévenir immédiatement la sécurité (poste {{itphone}})."
  },

  // ---------- PHYSICAL ----------
  {
    id: "phys-1", concept: "physical", kind: "situation",
    title: "Porte tenue ouverte",
    setup: "Vous entrez dans le bâtiment avec votre badge.",
    message: {
      from: "Situation",
      subject: "",
      body: "Quelqu'un en tenue correcte, un carton dans les bras, vous dit : « Désolé, j'ai les mains prises et j'ai oublié mon badge, vous pouvez me laisser entrer ? »"
    },
    options: [
      { t: "Lui tenir la porte, il a l'air normal", ok: false, fb: "C'est du « tailgating » : l'apparence rassurante est un outil d'attaque." },
      { t: "Vérifier qu'il a un badge visiteur d'un autre site", ok: false, fb: "N'importe quel badge peut se contrefaire. Seule l'accueil peut valider une entrée." },
      { t: "Lui proposer de passer par l'accueil et signaler si besoin", ok: true, fb: "Exact. Poliment, mais fermement. Chacun entre avec son propre badge." },
      { t: "L'ignorer et passer mon chemin sans rien dire", ok: false, fb: "Mieux que d'ouvrir la porte, mais la personne reste dans le hall : il faut prévenir l'accueil." }
    ],
    clues: ["Personne sans badge", "Prétexte des mains prises", "Ton amical et pressé", "Aucune annonce de visite"],
    why: "La politesse est exploitée. Un intrus dans les locaux peut brancher un appareil, photographier des écrans ou voler du matériel.",
    charte: { ref: "Art. 8.1", text: "Chaque personne entre avec son propre badge ; les visiteurs sont accueillis et accompagnés." },
    report: "Prévenir l'accueil ou la sécurité du site."
  },
  {
    id: "phys-2", concept: "physical", kind: "situation",
    title: "Un « technicien » dans les bureaux",
    setup: "Un homme en gilet orange se promène dans l'open space avec une tablette.",
    message: {
      from: "Situation",
      subject: "",
      body: "Il dit : « Je viens pour la maintenance de la clim, je dois juste vérifier la prise réseau de votre poste. » Il se baisse vers votre unité centrale."
    },
    options: [
      { t: "Lui demander de patienter, appeler l'accueil ou le support pour confirmer", ok: true, fb: "Exact. Toute intervention est annoncée et validée par un contact connu." },
      { t: "Le laisser faire, il a un gilet", ok: false, fb: "Un gilet n'est pas une autorisation. Il peut brancher un boîtier espion sur le réseau." },
      { t: "Lui demander son badge de société et le croire", ok: false, fb: "Un badge de société extérieure ne prouve rien sur place." }
    ],
    clues: ["Intervention non annoncée", "Accès direct à un poste", "Tenue destinée à rassurer", "Pas de ticket ni d'accompagnateur"],
    why: "Les attaquants utilisent des tenues et des prétextes d'intervention pour accéder aux équipements.",
    charte: { ref: "Art. 8.2", text: "Toute intervention sur le matériel passe par une demande validée par le support." },
    report: "Appeler l'accueil ou la sécurité, sans confronter la personne seul."
  },

  // ---------- NOMS DE DOMAINE (DNS) ----------
  {
    id: "dns-1", concept: "dns", kind: "email",
    title: "Le lien ressemble au nôtre",
    setup: "Vous recevez ce mail sur votre boîte pro. Le domaine officiel de {{the_org}} est {{domain}}.",
    message: {
      from: "Ressources humaines <rh@{{domain}}>",
      subject: "Votre attestation de télétravail est prête",
      body: "Bonjour,\n\nVotre attestation de télétravail 2026 est disponible. Connectez-vous au portail pour la télécharger avant vendredi.",
      link: "https://{{domain}}.portail-rh.example/connexion"
    },
    options: [
      { t: "Cliquer : le lien commence bien par {{domain}}", ok: false, fb: "Le début du lien ne prouve rien. Ici le vrai domaine est portail-rh.example, un site tiers, et « {{domain}} » n'est qu'un sous-domaine choisi par l'attaquant." },
      { t: "Lire le domaine réel du lien, ne pas cliquer, passer par l'intranet et signaler", ok: true, fb: "Exact. Un nom de domaine se lit de droite à gauche : ce qui compte est la partie juste avant le premier « / »." },
      { t: "Copier le lien dans un autre navigateur pour comparer", ok: false, fb: "Changer de navigateur ne change pas la destination : la page reste celle de l'attaquant." },
      { t: "Cliquer, puis vérifier le cadenas du navigateur", ok: false, fb: "Le cadenas prouve que la connexion est chiffrée, pas que le site est honnête : les sites frauduleux en ont aussi." }
    ],
    clues: ["Le vrai domaine du lien est portail-rh.example (juste avant le premier « / »), pas {{domain}}", "Le nom de {{the_org}} est placé au début pour tromper la lecture rapide", "Connexion demandée pour un simple document", "Échéance courte (avant vendredi)"],
    why: "Le DNS (système de noms de domaine) associe un nom à un serveur. N'importe qui peut créer un sous-domaine qui contient le nom de votre établissement : seule la fin du nom, avant le premier « / », indique à qui appartient le site. Une adresse d'expéditeur peut aussi être falsifiée.",
    charte: { ref: "Art. 4.5", text: "Avant de cliquer, l'utilisateur vérifie le nom de domaine du lien ; tout lien vers un domaine inconnu ou imitant celui de {{the_org}} est signalé." },
    report: "Utiliser le bouton « Signaler » du client mail, sans cliquer."
  },
  {
    id: "dns-2", concept: "dns", kind: "email",
    title: "Un nouveau RIB pour le fournisseur",
    setup: "Vous travaillez à la comptabilité. Un paiement fournisseur est prévu demain.",
    message: {
      from: "Direction financière <paiements@{{typohost}}>",
      subject: "Changement de coordonnées bancaires : Delta Pièces",
      body: "Bonjour,\n\nNotre fournisseur Delta Pièces a changé de banque. Merci de mettre à jour son RIB (ci-joint) avant le virement de demain.",
      link: ""
    },
    options: [
      { t: "Appeler le fournisseur et la direction financière sur leurs numéros connus, ne rien modifier, signaler", ok: true, fb: "Exact. Un changement de RIB se confirme toujours par un canal indépendant, avant tout virement." },
      { t: "Mettre à jour le RIB : le mail vient de la direction financière", ok: false, fb: "L'adresse n'est pas celle de {{the_org}} : {{typoexp}} ({{typobrand}} au lieu de {{brand}}). C'est une usurpation par nom de domaine presque identique." },
      { t: "Répondre au mail pour demander une confirmation", ok: false, fb: "Votre réponse partirait chez l'attaquant, qui confirmera lui-même. Il faut changer de canal." }
    ],
    clues: ["Domaine {{typohost}} : {{typoexp}} ({{typobrand}} au lieu de {{brand}})", "Changement de coordonnées bancaires juste avant un paiement", "Pièce jointe non attendue", "Demande hors du circuit habituel de validation"],
    why: "Le « typosquatting » consiste à enregistrer un nom presque identique au vrai (lettre changée, tiret ajouté) en comptant sur une lecture rapide. Le changement de RIB frauduleux est une fraude fréquente dans les organisations.",
    charte: { ref: "Art. 6.3", text: "Tout ordre de paiement inhabituel doit être confirmé par un second canal et validé par la hiérarchie." },
    report: "Prévenir la hiérarchie et le responsable sécurité, sans modifier le RIB."
  },

  // ---------- RANÇONGICIELS ET SAUVEGARDES (kit p. 9-10 et 17-18) ----------
  {
    id: "ransom-1", concept: "ransom", kind: "situation",
    title: "« Vos fichiers sont chiffrés »",
    setup: "Vous êtes au secrétariat d'un département. Vous ouvrez une pièce jointe, puis votre écran change.",
    message: {
      from: "Fenêtre affichée sur votre écran",
      subject: "",
      body: "Vos fichiers ont été chiffrés. Pour les récupérer, envoyez 0,05 bitcoin avant 48 h. Passé ce délai, la clé de déchiffrement sera détruite et vos documents définitivement perdus."
    },
    options: [
      { t: "Payer la rançon : c'est le seul moyen de récupérer les fichiers", ok: false, fb: "Payer finance les criminels, ne garantit rien et vous désigne comme cible rentable. Les autorités le déconseillent." },
      { t: "Redémarrer l'ordinateur pour voir si le message disparaît", ok: false, fb: "Redémarrer peut effacer des traces utiles à l'analyse, et le chiffrement continue de se propager entre-temps." },
      { t: "Débrancher le câble réseau (ou couper le Wi-Fi), laisser le poste allumé, ne pas payer et appeler le support", ok: true, fb: "Exact. Isoler le poste empêche la propagation vers le réseau, et payer ne garantit pas de récupérer les fichiers." },
      { t: "Continuer à travailler sur les fichiers qui s'ouvrent encore", ok: false, fb: "Chaque minute connectée laisse le rançongiciel chiffrer d'autres fichiers, y compris sur les dossiers partagés." }
    ],
    clues: ["Demande de paiement en cryptomonnaie", "Compte à rebours de 48 h pour créer la panique", "Menace de destruction définitive des fichiers", "Message apparu juste après l'ouverture d'une pièce jointe"],
    why: "Un rançongiciel chiffre vos fichiers puis exige de l'argent. La panique pousse à payer ou à improviser. Le bon réflexe est d'isoler le poste du réseau et de prévenir le support.",
    charte: { ref: "Art. 9.1", text: "En cas de message de rançon ou de comportement anormal du poste, le débrancher du réseau sans l'éteindre, ne rien payer et prévenir immédiatement le support." },
    report: "Appeler le support au poste {{itphone}}, puis déposer plainte si {{the_org}} le décide."
  },
  {
    id: "ransom-2", concept: "ransom", kind: "situation",
    title: "La seule copie de votre rapport",
    setup: "Vous préparez un rapport important. Il n'existe que sur le disque de votre ordinateur portable.",
    message: {
      from: "Situation",
      subject: "",
      body: "Votre portable commence à ralentir et fait des bruits inhabituels. Votre rapport doit être rendu dans trois jours."
    },
    options: [
      { t: "Copier le rapport sur l'espace de stockage de {{the_org}} et garder une seconde copie hors ligne", ok: true, fb: "Exact. Deux copies sur deux supports, dont une non connectée en permanence, résistent aussi aux rançongiciels." },
      { t: "Faire une copie sur mon cloud personnel gratuit, c'est rapide", ok: false, fb: "Un cloud personnel n'est pas conçu pour des données professionnelles, et il n'est pas contrôlé par {{the_org}}." },
      { t: "Ne rien faire : il a toujours fonctionné jusqu'ici", ok: false, fb: "Une panne ou un rançongiciel arrive sans prévenir. Sans copie, la perte peut être définitive." },
      { t: "Prévoir une sauvegarde, mais à la fin du mois", ok: false, fb: "Le risque est présent maintenant. La sauvegarde doit être régulière et planifiée, pas reportée." }
    ],
    clues: ["Une seule copie du document", "Matériel qui montre des signes de faiblesse", "Échéance proche", "Aucune sauvegarde planifiée"],
    why: "Les sauvegardes sont la meilleure parade aux pannes, aux vols et aux rançongiciels : sans copie récente, la perte est irréversible, et la rançon devient tentante.",
    charte: { ref: "Art. 9.2", text: "Les données de travail sont sauvegardées régulièrement sur l'espace de stockage de {{the_org}} ; aucun service de stockage personnel n'est utilisé pour des données professionnelles." },
    report: "Prévenir le support si le matériel présente des signes de panne."
  },

  // ---------- APPAREILS MOBILES (kit p. 7-8) ----------
  {
    id: "mobile-1", concept: "mobile", kind: "situation",
    title: "Le Wi-Fi gratuit de la gare",
    setup: "En déplacement pour une conférence, vous attendez votre train. Vous devez consulter votre messagerie professionnelle.",
    message: {
      from: "Situation",
      subject: "",
      body: "Votre téléphone détecte un réseau ouvert « Gare_WiFi_Gratuit », sans mot de passe. Le signal est excellent."
    },
    options: [
      { t: "Me connecter : l'adresse du site de ma messagerie commence par https", ok: false, fb: "Le https chiffre la connexion, mais un réseau piégé peut rediriger vers de fausses pages et collecter des informations." },
      { t: "Me connecter, consulter vite mes messages puis me déconnecter", ok: false, fb: "Le risque ne tient pas à la durée : une seule connexion suffit pour qu'un réseau contrôlé par un attaquant intercepte des données." },
      { t: "Me connecter, mais seulement à mes réseaux sociaux", ok: false, fb: "Vos comptes personnels sont aussi précieux : un mot de passe volé peut servir ensuite sur vos comptes professionnels." },
      { t: "Utiliser le partage de connexion de mon téléphone et éviter ce réseau", ok: true, fb: "Exact. Un réseau public ou inconnu peut être contrôlé par un cybercriminel. Mieux vaut votre propre connexion." }
    ],
    clues: ["Réseau ouvert, sans authentification", "Nom attractif (« gratuit »)", "Contexte de déplacement pressé", "Besoin d'accéder à des données professionnelles"],
    why: "Un Wi-Fi public ou inconnu peut être contrôlé par un attaquant qui intercepte comptes, mots de passe et messages. En déplacement, on privilégie sa propre connexion mobile.",
    charte: { ref: "Art. 10.1", text: "En déplacement, aucun accès à des services professionnels n'est effectué depuis un réseau Wi-Fi public ou inconnu." },
    report: "Si vous vous êtes connecté, changer vos mots de passe et prévenir le support."
  },
  {
    id: "mobile-2", concept: "mobile", kind: "situation",
    title: "L'application qui demande tout",
    setup: "Vous cherchez un lecteur PDF gratuit pour votre téléphone.",
    message: {
      from: "Situation",
      subject: "",
      body: "Un site propose « LecteurPDF Pro Gratuit.apk » à télécharger. À l'installation, l'application demande l'accès à vos contacts, vos SMS, votre position et votre appareil photo."
    },
    options: [
      { t: "Accepter toutes les autorisations pour que l'application fonctionne", ok: false, fb: "Un lecteur PDF n'a besoin d'aucun de ces accès. Ces droits permettent de lire vos contacts et vos messages." },
      { t: "Refuser, ne pas installer, et choisir une autre application dans le magasin officiel", ok: true, fb: "Exact. Seuls les magasins officiels offrent un contrôle minimal, et une application qui demande trop de droits est suspecte." },
      { t: "Installer, puis désinstaller si elle semble étrange", ok: false, fb: "Le mal est fait dès l'installation : l'application peut avoir déjà copié vos informations." },
      { t: "Installer le fichier sans les autorisations de position et de photo, mais accepter les contacts", ok: false, fb: "Mieux vaut refuser l'installation : l'origine du fichier est déjà douteuse, et les contacts sont une cible de choix." }
    ],
    clues: ["Fichier .apk téléchargé hors d'un magasin officiel", "Application « Pro » offerte gratuitement", "Autorisations sans rapport avec la fonction", "Éditeur inconnu"],
    why: "Les applications piégées se glissent sur des sites parallèles et demandent plus de droits que nécessaire. Une application officielle et sobre en autorisations réduit le risque.",
    charte: { ref: "Art. 10.2", text: "Les applications sont installées uniquement depuis les magasins officiels, après contrôle des autorisations demandées." },
    report: "Si l'application est déjà installée, la désinstaller, changer vos mots de passe et prévenir le support."
  },

  // ---------- RÉSEAUX SOCIAUX (kit p. 5-6) ----------
  {
    id: "social-1", concept: "social", kind: "sms",
    title: "« C'est bien toi sur cette vidéo ? »",
    setup: "Un camarade de promotion vous écrit en message privé sur un réseau social.",
    message: {
      from: "Yanis (contact de votre promotion)",
      subject: "",
      body: "Oh, c'est bien toi sur cette vidéo ?! 😱 Regarde vite avant que ça soit supprimé : https://video-vue-vite.example/watch"
    },
    options: [
      { t: "Cliquer pour voir : c'est un ami", ok: false, fb: "Son compte a peut-être été piraté. Les cybercriminels utilisent les contacts de leurs victimes pour diffuser des liens piégés." },
      { t: "Répondre « c'est qui sur la vidéo ? » pour avoir plus de détails", ok: false, fb: "Vous restez dans l'échange avec le compte potentiellement piraté. Le but est de vous faire cliquer." },
      { t: "Ne pas cliquer, prévenir Yanis par un autre canal que son compte est peut-être piraté", ok: true, fb: "Exact. Vous protégez votre contact en le prévenant sans passer par la conversation douteuse." },
      { t: "Signaler le compte de Yanis comme malveillant sans le prévenir", ok: false, fb: "Prévenir la personne est plus utile : c'est probablement une victime qui peut reprendre la main sur son compte." }
    ],
    clues: ["Message alarmiste qui joue sur la curiosité", "Lien vers un site inconnu (video-vue-vite.example)", "Urgence (« avant que ça soit supprimé »)", "Style inhabituel pour ce contact"],
    why: "Un compte de réseau social piraté sert à tromper les amis de la victime, car la confiance accordée à un contact connu baisse la vigilance.",
    charte: { ref: "Art. 11.1", text: "Un lien reçu par messagerie privée, même d'un contact connu, n'est ouvert qu'après vérification auprès de l'expéditeur par un autre canal." },
    report: "Prévenir le contact par un autre canal et signaler le message à la plateforme."
  },
  {
    id: "social-2", concept: "social", kind: "situation",
    title: "Votre premier jour en photo",
    setup: "C'est votre premier jour. Vous voulez poster une photo de votre bureau sur votre réseau social.",
    message: {
      from: "Situation",
      subject: "",
      body: "Sur la photo, on voit votre badge, l'écran de l'ordinateur ouvert sur un tableau de bord interne et un post-it avec un mot de passe collé au moniteur."
    },
    options: [
      { t: "Ne pas publier cette photo, et enlever le post-it de mon écran", ok: true, fb: "Exact. Une publication peut dévoiler des informations sensibles, et un mot de passe affiché est lisible par tous." },
      { t: "Publier la photo, mon compte est privé", ok: false, fb: "Un compte « privé » n'empêche ni la capture d'écran ni la rediffusion. Vous ne maîtrisez pas le public final." },
      { t: "Publier en floutant mon visage", ok: false, fb: "Le badge, l'écran et le post-it restent lisibles. Ce sont eux qui renseignent un attaquant." },
      { t: "Publier la photo avec la mention « #nouvelleaventure » et supprimer le post-it après", ok: false, fb: "Une fois publiée, la photo peut être copiée. Supprimer le post-it ensuite ne retire pas le mot de passe de l'image." }
    ],
    clues: ["Badge visible", "Écran avec un tableau de bord interne", "Mot de passe sur un post-it", "Publication sur un réseau accessible au-delà du cercle d'amis"],
    why: "Les informations publiées sur les réseaux sociaux nourrissent les attaques ciblées : nom, fonction, outils internes, badge. Ce qui est publié vous échappe.",
    charte: { ref: "Art. 11.2", text: "Aucune information interne (badge, écran, document, mot de passe) n'est publiée sur un réseau social." },
    report: "Si une photo sensible a été publiée, la supprimer, changer le mot de passe exposé et prévenir la sécurité."
  },

  // ---------- USAGES PRO / PERSO (kit p. 13-14) ----------
  {
    id: "properso-1", concept: "properso", kind: "situation",
    title: "Travailler ce week-end",
    setup: "Vous avez un dossier à terminer. Vous êtes chez vous, et le VPN de {{the_org}} est lent.",
    message: {
      from: "Situation",
      subject: "",
      body: "Vous pourriez envoyer le fichier de travail (contenant des données de dossiers) sur votre messagerie personnelle pour le terminer sur votre ordinateur."
    },
    options: [
      { t: "L'envoyer sur ma messagerie personnelle : c'est temporaire", ok: false, fb: "Les données sortent du périmètre de {{the_org}} et se retrouvent dans une boîte aux lettres que personne ne contrôle." },
      { t: "Me connecter par l'accès distant fourni par {{the_org}}, ou reporter à lundi", ok: true, fb: "Exact. On reste sur les outils professionnels, même s'ils sont plus lents." },
      { t: "Utiliser mon service de stockage en ligne personnel", ok: false, fb: "Ces services gratuits ne sont pas conçus pour des informations professionnelles confidentielles." },
      { t: "Copier le fichier sur ma clé USB personnelle", ok: false, fb: "Une clé personnelle peut être perdue ou infectée, et le fichier quitte le cadre sécurisé de {{the_org}}." }
    ],
    clues: ["Données professionnelles", "Messagerie personnelle proposée", "Stockage personnel non autorisé", "Prétexte du gain de temps"],
    why: "Mélanger messagerie et stockage pro/perso expose les données de {{the_org}} à des services moins protégés et facilite les erreurs de destinataire.",
    charte: { ref: "Art. 12.1", text: "Les données professionnelles ne sont ni envoyées vers une messagerie personnelle ni stockées sur un service en ligne personnel." },
    report: "Si des données ont déjà été envoyées sur une messagerie personnelle, prévenir la sécurité."
  },
  {
    id: "properso-2", concept: "properso", kind: "situation",
    title: "Le portable pro à la maison",
    setup: "Vous travaillez parfois à domicile avec le portable fourni par {{the_org}}.",
    message: {
      from: "Situation",
      subject: "",
      body: "Votre petit frère voudrait l'emprunter « cinq minutes » pour télécharger un jeu gratuit et regarder des films en streaming."
    },
    options: [
      { t: "Accepter : il le fera sous mes yeux", ok: false, fb: "Même surveillé, un téléchargement ou un site douteux peut infecter un poste relié au réseau de {{the_org}}." },
      { t: "Le laisser utiliser une session invité", ok: false, fb: "Une session invité ne supprime pas tous les risques, et le portable reste un équipement professionnel." },
      { t: "Accepter seulement si le jeu vient d'un site officiel", ok: false, fb: "Même un site officiel n'est pas autorisé sur un poste professionnel. Les usages personnels restent sur du matériel personnel." },
      { t: "Refuser poliment : le portable pro reste à usage professionnel", ok: true, fb: "Exact. Le matériel et la connexion professionnels ne servent pas à des usages personnels ou à ceux de proches." }
    ],
    clues: ["Équipement professionnel prêté à un tiers", "Téléchargement d'un jeu", "Streaming de films", "Idée du « cinq minutes »"],
    why: "La frontière entre vie pro et perso est poreuse. Un équipement professionnel mal utilisé peut ouvrir un accès au réseau de {{the_org}}.",
    charte: { ref: "Art. 12.2", text: "Le matériel professionnel est réservé à un usage professionnel et n'est prêté à aucun tiers." },
    report: "Si un tiers a utilisé le poste, prévenir le support pour un contrôle."
  }

];

// Couplage « vecteur d'attaque » (par où l'attaque arrive, vocabulaire ANSSI / Cybermalveillance)
// et « levier humain » (ce que l'ingénierie sociale exploite chez la victime).
// `kit` : fiche du Kit de sensibilisation de Cybermalveillance.gouv.fr (Licence Ouverte Etalab 2.0).
window.SCENARIO_META = {
  "phish-1":   { vector: "Messagerie", lever: "Urgence et peur de perdre un accès", kit: "Fiche Hameçonnage, p. 15" },
  "phish-2":   { vector: "Messagerie (pièce jointe)", lever: "Pression et sentiment d'obligation", kit: "Fiche Hameçonnage, p. 15" },
  "ceo-1":     { vector: "Messagerie", lever: "Autorité et secret", kit: null },
  "ceo-2":     { vector: "Messagerie instantanée", lever: "Confiance envers un supérieur, envie de rendre service", kit: null },
  "smish-1":   { vector: "SMS", lever: "Impatience et petit montant", kit: "Fiche Hameçonnage, p. 15" },
  "smish-2":   { vector: "SMS", lever: "Peur d'un piratage", kit: "Fiche Mots de passe, p. 3" },
  "vish-1":    { vector: "Téléphone", lever: "Peur d'un virus et désir de bien faire", kit: "Fiche Faux support technique, p. 19" },
  "vish-2":    { vector: "Téléphone", lever: "Autorité d'une banque et urgence", kit: "Fiche Hameçonnage, p. 15" },
  "usb-1":     { vector: "Support amovible", lever: "Curiosité", kit: "Fiche Pro/Perso, p. 14" },
  "usb-2":     { vector: "Support amovible", lever: "Réciprocité (cadeau) et confiance", kit: "Fiche Pro/Perso, p. 14" },
  "pwd-1":     { vector: "Compte et mot de passe", lever: "Habitude et facilité", kit: "Fiche Mots de passe, p. 3" },
  "pwd-2":     { vector: "Authentification multifacteur", lever: "Lassitude (fatigue MFA)", kit: "Fiche Mots de passe, p. 3" },
  "phys-1":    { vector: "Accès physique", lever: "Politesse", kit: null },
  "phys-2":    { vector: "Accès physique", lever: "Respect de l'uniforme et du prétexte technique", kit: null },
  "dns-1":     { vector: "Web et DNS (sous-domaine piégé)", lever: "Lecture rapide et confiance dans un nom connu", kit: "Fiche Hameçonnage, p. 15" },
  "dns-2":     { vector: "Web et DNS (typosquatting)", lever: "Lecture rapide et routine de paiement", kit: "Fiche Hameçonnage, p. 15" },
  "ransom-1":  { vector: "Poste de travail (rançongiciel)", lever: "Panique et compte à rebours", kit: "Fiche Rançongiciels, p. 17" },
  "ransom-2":  { vector: "Données et sauvegardes", lever: "Procrastination et excès de confiance", kit: "Fiche Sauvegardes, p. 9" },
  "mobile-1":  { vector: "Réseau Wi-Fi public", lever: "Gratuité et besoin immédiat", kit: "Fiche Appareils mobiles, p. 8" },
  "mobile-2":  { vector: "Application mobile", lever: "Gratuité et habitude d'accepter", kit: "Fiche Appareils mobiles, p. 8" },
  "social-1":  { vector: "Réseaux sociaux (compte d'un contact piraté)", lever: "Curiosité et confiance envers un ami", kit: "Fiche Réseaux sociaux, p. 5" },
  "social-2":  { vector: "Réseaux sociaux (publication)", lever: "Fierté et envie de partager", kit: "Fiche Réseaux sociaux, p. 5" },
  "properso-1":{ vector: "Messagerie et stockage personnels", lever: "Commodité", kit: "Fiche Pro/Perso, p. 13" },
  "properso-2":{ vector: "Équipement professionnel", lever: "Serviabilité envers un proche", kit: "Fiche Pro/Perso, p. 13" }
};
window.SCENARIO_TEMPLATES.forEach((s) => Object.assign(s, window.SCENARIO_META[s.id] || {}));
